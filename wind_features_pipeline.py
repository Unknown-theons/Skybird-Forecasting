import xarray as xr
import numpy as np
from typing import List, Tuple

# --- Configuration ---
FILE_INPUT_DATA = '/content/drive/MyDrive/NasaDataSetsff4/wind_data_processed.nc4'



# Output files
FEATURES_OUT_FILE = '/content/drive/MyDrive/NasaDataSetsff4/selected_features_hourly.nc4'
CLIMATOLOGY_OUT_FILE = '/content/drive/MyDrive/NasaDataSetsff4/climatology_lookup_table.nc4'

# List of required variables from your request (H700/U700/V700 are excluded as they were not in the source list)
REQUIRED_VARS = [
    'PS', 'SLP', 'T2M', 'TS', 'T10M',
    'H850', 'U850', 'V850',
    # 'H700', 'U700', 'V700', # Skipping these as they are not in the variable list provided
    'H500', 'U500', 'V500',
    'U50M', 'V50M', 'QV2M', 'QV10M',
    'DISPH', 'PBLTOP', 'OMEGA500',
    'U10M', 'V10M'
]

# --- Stage 1: Data Loading and Variable Selection (Helper Function) ---

def load_and_select_data(input_file: str, variables: List[str]) -> xr.Dataset:
    """
    Loads the full dataset lazily and selects only the required variables.
    The merging/sub-setting step is removed as the input is assumed monolithic.
    """
    print("--- Running: Load and Select Variables (Lazy) ---")
    
    # 1. Load the dataset lazily
    ds_full = xr.open_dataset(input_file)
    
    # 2. Check if all required variables exist
    missing_vars = [v for v in variables if v not in ds_full.data_vars]
    if missing_vars:
        raise ValueError(
            f"The following required variables are missing from the input file: {missing_vars}. "
            f"Please check {input_file} or update REQUIRED_VARS."
        )

    # 3. Select only the features needed
    # This remains lazy as it's an Xarray operation on Dask-backed arrays
    ds_selected = ds_full[variables]

    print(f"Dataset loaded with {len(variables)} variables selected.")
    return ds_selected

# -------------------------------------------------------------------
# --- Stage 2: Feature Engineering

def add_cyclical_longitude(ds: xr.Dataset) -> xr.Dataset:
    """Creates cyclical longitude features (fully lazy)."""
    lon_rad = np.deg2rad(ds['lon'])
    ds['lon_sin'] = np.sin(lon_rad)
    ds['lon_cos'] = np.cos(lon_rad)
    return ds

def add_cyclical_time_features(ds: xr.Dataset) -> xr.Dataset:
    """
    Creates cyclical time features for hour and day of year, Dask-aware.
    """
    print("  - Engineering: Cyclical Time (Fully Lazy)")
    time_coord = ds['time']
    
    # Use the .dt accessor directly for lazy datetime component extraction
    hour_angle = (time_coord.dt.hour / 24.0) * 2 * np.pi
    day_angle = (time_coord.dt.dayofyear / 366.0) * 2 * np.pi 
    
    # Create new DataArrays using the lazy Dask-backed angle arrays
    ds['hour_sin'] = hour_angle.pipe(np.sin)
    ds['hour_cos'] = hour_angle.pipe(np.cos)
    ds['dayofyear_sin'] = day_angle.pipe(np.sin)
    ds['dayofyear_cos'] = day_angle.pipe(np.cos)

    return ds

def run_feature_engineering(ds: xr.Dataset) -> xr.Dataset:
    """Master function to run all feature engineering steps."""
    print(" Running: Feature Engineering")
    ds = add_cyclical_longitude(ds)
    ds = add_cyclical_time_features(ds)
    return ds

# -------------------------------------------------------------------
# --- Main Pipeline

def save_dataset_as_netcdf(ds: xr.Dataset, output_path: str):
    """
    Utility function to save any xarray Dataset to a NetCDF4 file,
    applying zlib compression and float32 dtype for efficiency.
    """
    print(f"   -> Saving dataset to: {output_path}")
    
    # Apply Zlib compression and float32 dtype for all data variables
    encoding = {}
    for var in ds.data_vars:
        encoding[var] = {
            'zlib': True, 
            'complevel': 4, 
            'dtype': 'float32'
        }
    
    # This to_netcdf call triggers the full, parallel Dask computation.
    ds.to_netcdf(
        output_path, 
        mode='w', 
        format='NETCDF4', 
        engine='netcdf4',
        encoding=encoding
    )
    print(f"   -> Successfully saved.")


def features_pipeline(input_file: str, variables: List[str]) -> xr.Dataset:
    """
    Primary pipeline to generate the full, hourly, engineered dataset.
    """
    print("STARTING FEATURES PIPELINE")
    # Step 1: Load and select the raw data (Lazy)
    ds_selected = load_and_select_data(input_file, variables)
    # Step 2: Apply all feature engineering (Lazy)
    engineered_ds = run_feature_engineering(ds_selected)
    print("FEATURES PIPELINE COMPLETE")
    return engineered_ds

def build_climatology_lookup(ds: xr.Dataset, output_path: str) -> xr.Dataset:
    """
    Creates the final climatology lookup table by averaging data for each 
    day of the year. The .mean() operation triggers a major Dask computation.
    """
    print("\n STARTING CLIMATOLOGY BUILD")
    vars_to_average = list(ds.data_vars)
    
    # Grouping is lazy, but the .mean() operation forces computation
    daily_groups = ds.groupby('time.dayofyear')
    climatology = daily_groups.mean(dim='time') # The time-consuming step
    
    rename_dict = {var: f"{var}_avg" for var in vars_to_average}
    climatology = climatology.rename(rename_dict)
    
    # This function saves its own output, using the optimized save function.
    save_dataset_as_netcdf(climatology, output_path)
    print(" CLIMATOLOGY BUILD COMPLETE ")
    return climatology

# --- Main Execution Block ---

if __name__ == '__main__':
    # 1. Run the primary pipeline to get the fully engineered hourly data
    final_features_dataset = features_pipeline(FILE_INPUT_DATA, REQUIRED_VARS)
    
    # 2. Save this primary result (triggers the first Dask computation)
    print(f"\n--- Generating Output 1: Features Dataset ---")
    save_dataset_as_netcdf(final_features_dataset, FEATURES_OUT_FILE)
    
    # 3. Use the engineered data to build and save the climatology table
    print(f"\n--- Generating Output 2: Climatology Lookup Table ---")
    climatology_lookup = build_climatology_lookup(final_features_dataset, CLIMATOLOGY_OUT_FILE)
    
    print("\n\n ALL TASKS FINISHED ")
    print(f"Output 1 (Hourly Features): {FEATURES_OUT_FILE}")
    print(f"Output 2 (Daily Climatology): {CLIMATOLOGY_OUT_FILE}")