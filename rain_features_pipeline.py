import xarray as xr
import numpy as np
from typing import List, Dict, Tuple

# --- Configuration ---
# Input files (Placeholder names, assuming they are in the same folder)
FILE_SLV = '/content/drive/MyDrive/NasaDataSetsff4/wind_data_processed.nc4' # Source of most meteorological variables
FILE_RAD = '/content/drive/MyDrive/NasaDataSetsff3/rain_data_processed.nc4' # Source of cloud/aerosol variables
FILE_FLX = '/content/drive/MyDrive/NasaDataSetsff3/rain2_data_processed.nc3' # Source of precipitation (PRECTOT) and flux variables

# Output files
FEATURES_OUT_FILE = 'rain_predictors_hourly_aligned.nc4'
CLIMATOLOGY_OUT_FILE = 'rain_climatology_lookup.nc4'

# Mapping of variables to their source file
VARIABLE_MAP: Dict[str, List[str]] = {
    # Core Predictors (SLV file)
    FILE_SLV: ['TQV', 'QV2M', 'T2M', 'T2MDEW', 'OMEGA500', 'SLP', 'U10M', 'V10M'],
    # Cloud/Radiation Predictors (RAD file)
    FILE_RAD: ['CLDTOT', 'TAUTOT'],
    # Target and Flux Variables (FLX file) - Defines the target grid
    FILE_FLX: ['PRECTOT', 'EVAP', 'HFLUX', 'PBLH', 'SPEED']
}

# Rain detection threshold (PRECTOT is typically kg/m^2/s)
RAIN_THRESHOLD = 1e-8 # A non-zero value

# --- Stage 1: Data Loading, Selection, and Spatial Alignment ---

def load_select_and_align_data(var_map: Dict[str, List[str]], target_file: str) -> xr.Dataset:
    """
    Loads variables from multiple files, aligns them spatially to the target_file grid, 
    and merges them lazily. 
    """
    print("--- Running: Load, Select, Crop, Align, and Merge (Lazy) ---")
    datasets = {}
    
    # 1. Load the TARGET DATASET (FLX) and define the regional grid
    try:
        ds_target = xr.open_dataset(target_file)[var_map[target_file]]
        datasets[target_file] = ds_target
        
        # Define the target grid (coordinates and boundaries)
        lat_min, lat_max = ds_target['lat'].min(), ds_target['lat'].max()
        lon_min, lon_max = ds_target['lon'].min(), ds_target['lon'].max()
        target_lat = ds_target['lat']
        target_lon = ds_target['lon']
        
        print(f"  - Target Grid ({target_file}) defined: {target_lat.size}x{target_lon.size}")

    except Exception as e:
        print(f"FATAL ERROR: Could not load the base target file ({target_file}): {e}")
        raise

    # 2. Process all OTHER DATASETS (SLV and RAD)
    for file_path, vars_to_select in var_map.items():
        if file_path == target_file:
            continue
            
        print(f"  - Processing and aligning {file_path}...")
        ds_source = xr.open_dataset(file_path)[vars_to_select]
        
        # Crop the global/larger data to the regional boundaries
        ds_cropped = ds_source.sel(
            lat=slice(lat_max, lat_min),  # Note: Use slice(max, min) if lat is descending
            lon=slice(lon_min, lon_max)
        )
        
        # Regrid the cropped data to match the target coordinates (MAJOR DASK STEP)
        ds_aligned = ds_cropped.interp(
            lat=target_lat, 
            lon=target_lon, 
            method="linear" # Linear interpolation is standard for this task
        )
        
        # Ensure time coordinates are exactly aligned if necessary (e.g. if time points slightly differ)
        ds_aligned = ds_aligned.interp(time=ds_target.time, method="linear")

        datasets[file_path] = ds_aligned

    # 3. Merge all datasets. Since all spatial/time coords are now identical, this is lazy.
    merged_ds = xr.merge(list(datasets.values()))
    
    print("All crop/align/merge steps built into Dask graph (still lazy).")
    return merged_ds

# -------------------------------------------------------------------
# --- Stage 2: Feature Engineering (New and Modified Functions) ---

def add_rain_target_and_met_features(ds: xr.Dataset, threshold: float) -> xr.Dataset:
    """
    Creates the target variable (it_rained) and new meteorological features (RH2M, WindDirection).
    All calculations are lazy.
    """
    print("  - Engineering: Target and Meteorological Features (Lazy)")
    
    # 1. Target Variable: it_rained (Binary Classification Target)
    ds['it_rained'] = (ds['PRECTOT'] > threshold).astype(np.int8)
    ds['it_rained'].attrs = {'long_name': 'Rainfall detected (PRECTOT > 1e-8)', 'units': 'binary (0/1)'}

    # 2. Derived Feature: Relative Humidity (RH2M) - Requires T2M and T2MDEW
    T2M_C = ds['T2M'] - 273.15      
    T2MDEW_C = ds['T2MDEW'] - 273.15
    
    # Magnus-Tetens approximation for RH: RH = (es(TDEW) / es(T)) * 100
    numerator = np.exp((17.67 * T2MDEW_C) / (T2MDEW_C + 243.5))
    denominator = np.exp((17.67 * T2M_C) / (T2M_C + 243.5))
    
    ds['RH2M'] = (numerator / denominator) * 100
    ds['RH2M'] = ds['RH2M'].clip(0, 100)
    ds['RH2M'].attrs = {'long_name': 'Approximate Relative Humidity at 2m', 'units': '%'}

    # 3. Derived Feature: Wind Direction (WindDirection) - Requires U10M and V10M
    # Wind Direction (degrees from North, clockwise)
    ds['WindDirection'] = np.arctan2(ds['U10M'], ds['V10M']) * (180 / np.pi) + 180
    ds['WindDirection'].attrs = {'long_name': 'Wind Direction at 10m', 'units': 'degrees from North'}
    
    return ds

def add_cyclical_longitude(ds: xr.Dataset) -> xr.Dataset:
    """Creates cyclical longitude features (fully lazy)."""
    print("  - Engineering: Cyclical Longitude (Lazy)")
    lon_rad = np.deg2rad(ds['lon'])
    ds['lon_sin'] = np.sin(lon_rad)
    ds['lon_cos'] = np.cos(lon_rad)
    return ds

def add_cyclical_time_features(ds: xr.Dataset) -> xr.Dataset:
    """Creates cyclical time features for hour and day of year (fully lazy)."""
    print("  - Engineering: Cyclical Time (Lazy)")
    time_coord = ds['time']
    
    hour_angle = (time_coord.dt.hour / 24.0) * 2 * np.pi
    day_angle = (time_coord.dt.dayofyear / 366.0) * 2 * np.pi 
    
    ds['hour_sin'] = hour_angle.pipe(np.sin)
    ds['hour_cos'] = hour_angle.pipe(np.cos)
    ds['dayofyear_sin'] = day_angle.pipe(np.sin)
    ds['dayofyear_cos'] = day_angle.pipe(np.cos)

    return ds

def run_feature_engineering(ds: xr.Dataset) -> xr.Dataset:
    """Master function to run all feature engineering steps."""
    print(" Running: Feature Engineering")
    ds = add_rain_target_and_met_features(ds, RAIN_THRESHOLD)
    ds = add_cyclical_longitude(ds)
    ds = add_cyclical_time_features(ds)
    return ds

# -------------------------------------------------------------------
# --- Main Pipeline and Output Functions ---

def save_dataset_as_netcdf(ds: xr.Dataset, output_path: str):
    """Utility function to save with zlib compression and float32/int8 dtype."""
    print(f"   -> Saving dataset to: {output_path}")
    
    encoding = {}
    for var in ds.data_vars:
        # Save 'it_rained' as compressed integer, others as compressed float32
        dtype = 'int8' if var == 'it_rained' else 'float32'
        encoding[var] = {
            'zlib': True, 
            'complevel': 4, 
            'dtype': dtype
        }
    
    # This call triggers the full, parallel Dask computation, including all regridding.
    ds.to_netcdf(output_path, mode='w', format='NETCDF4', engine='netcdf4', encoding=encoding)
    print(f"   -> Successfully saved.")


def features_pipeline(var_map: Dict[str, List[str]], target_file: str) -> xr.Dataset:
    """Primary pipeline to generate the full, hourly, engineered dataset."""
    print("--- STARTING RAIN PREDICTION FEATURES PIPELINE ---")
    # Step 1: Load, align, and merge the raw data (Lazy, includes regridding)
    merged_ds = load_select_and_align_data(var_map, target_file)
    # Step 2: Apply all feature engineering (Lazy)
    engineered_ds = run_feature_engineering(merged_ds)
    print("--- FEATURES PIPELINE COMPLETE ---")
    return engineered_ds

def build_climatology_lookup(ds: xr.Dataset, output_path: str) -> xr.Dataset:
    """Creates the final climatology lookup table by averaging data for each day of the year."""
    print("\n--- STARTING CLIMATOLOGY BUILD ---")
    
    # Exclude the binary target variable from the mean
    vars_to_average = [var for var in ds.data_vars if var != 'it_rained']
    
    daily_groups = ds[vars_to_average].groupby('time.dayofyear')
    climatology = daily_groups.mean(dim='time') # The major Dask computation step
    
    rename_dict = {var: f"{var}_avg" for var in vars_to_average}
    climatology = climatology.rename(rename_dict)
    
    save_dataset_as_netcdf(climatology, output_path)
    print("--- CLIMATOLOGY BUILD COMPLETE ---")
    return climatology

# --- Main Execution Block ---

if __name__ == '__main__':
    # 1. Run the primary pipeline to get the fully engineered hourly data
    final_features_dataset = features_pipeline(VARIABLE_MAP, FILE_FLX)
    
    # 2. Save this primary result (triggers the first massive Dask computation)
    print(f"\n--- Generating Output 1: Hourly Features Dataset (First Computation) ---")
    save_dataset_as_netcdf(final_features_dataset, FEATURES_OUT_FILE)
    
    # 3. Use the engineered data to build and save the climatology table
    print(f"\n--- Generating Output 2: Climatology Lookup Table (Second Computation) ---")
    climatology_lookup = build_climatology_lookup(final_features_dataset, CLIMATOLOGY_OUT_FILE)
    
    print("\n\n--- ALL TASKS FINISHED ---")
    print(f"Output 1 (Hourly Features): {FEATURES_OUT_FILE}")
    print(f"Output 2 (Daily Climatology): {CLIMATOLOGY_OUT_FILE}")