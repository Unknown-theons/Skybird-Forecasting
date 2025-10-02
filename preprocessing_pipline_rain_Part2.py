import xarray as xr
import numpy as np
import glob
import os

# --- Configuration ---
FLX_FILE_PATTERN = 'data_flx/*.nc4.nc4'
OUTPUT_NETCDF_PATH = 'flx_data_processed.nc'


features_to_keep = [
    'PRECTOT', # The source for our target variable
    'EVAP',    # Evaporation rate (predictor)
    'HFLUX',   # Sensible heat flux (predictor)
    'PBLH',    # Planetary Boundary Layer Height (predictor)
    'SPEED'    # 10-meter wind speed (predictor)
]

# Define the threshold for what constitutes a "rain event"
# 0.01 kg m-2 s-1 is a common value, equivalent to 0.036 mm/hr
RAIN_THRESHOLD_KGM2S = 0.01


def data_ingestion(file_pattern, features_to_keep):
    """
    Loads files, selects variables, and applies Dask chunking for
    efficient, parallel processing.
    """
    print(f"Loading files from: {file_pattern}")
    file_paths = sorted(glob.glob(file_pattern))
    if not file_paths:
        raise ValueError(f"No files found matching the pattern: {file_pattern}")
    
    # 💡 Optimization 1: Specify chunks to enable Dask parallelism
    # 'time': 30 is a good starting chunk size for time-series climate data
    # 'lat' and 'lon' can be 'auto' or explicitly defined (e.g., 50)
    chunks = {'time': 30, 'lat': 'auto', 'lon': 'auto'}
    
    # Remove .load() to keep the computation lazy until the final .to_netcdf call
    ds = xr.open_mfdataset(
        file_paths, 
        combine='by_coords',
        chunks=chunks # Apply chunking here
    )
    
    ds_selected = ds[features_to_keep]
    print("Data ingestion, chunking, and feature selection complete.")
    return ds_selected

def clean_data(ds, vars_to_check):
    """Checks for and fills missing values in the specified variables."""
    print("Starting data cleaning...")
    # NOTE: Dask will compute the sum for the missing count check
    for var in vars_to_check:
        # We must call compute() here to get the actual count
        missing_count = ds[var].isnull().sum().compute().item()
        print(f"  - Checking '{var}': Found {missing_count} missing values.")
        if missing_count > 0:
            # Interpolation is added to the Dask graph, but not executed yet
            ds[var] = ds[var].interpolate_na(dim='lat', method='linear') 
            print(f"  - Filled Null values in '{var}'.")
    print("Data cleaning complete.")
    return ds

def dataset_to_netcdf(ds, output_filepath):
    """
    Saves the final dataset to a NetCDF4 file, applying compression
    (zlib) for smaller output and faster I/O.
    """
    print(f"Saving dataset to NetCDF: {output_filepath}")
    output_dir = os.path.dirname(output_filepath)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        
    # 💡 Optimization 2: Add Zlib compression (level 4 is a good default)
    # This reduces file size and speeds up I/O during the write.
    # Also, setting 'dtype': 'float32' will reduce file size by 50%
    encoding = {}
    for var in ds.data_vars:
        encoding[var] = {
            'zlib': True, 
            'complevel': 4,
            'dtype': 'float32' # Often saves 50% file size with minimal loss of precision
        }
    
    # All Dask operations are executed in parallel during this final write.
    ds.to_netcdf(
        output_filepath, 
        mode='w', 
        format='NETCDF4', 
        engine='netcdf4',
        encoding=encoding # Apply compression
    )
    print(f"  - Successfully saved to {output_filepath}")

# --- Feature Engineering for FLX data ---

def create_rain_target(ds, threshold):
    """Creates the binary 'it_rained' target variable from PRECTOT."""
    print(f"  - Engineering: Creating binary 'it_rained' target with threshold > {threshold}...")
    
    # This operation is efficient and vectorized (lazy with Dask)
    ds['it_rained'] = xr.where(ds['PRECTOT'] > threshold, 1, 0)
    
    ds['it_rained'].attrs = {
        'long_name': 'Binary Rain Flag',
        'description': f'1 if PRECTOT > {threshold} kg m-2 s-1, else 0',
        'units': 'unitless'
    }
    print("  - 'it_rained' feature created.")
    return ds

def run_feature_engineering_flx(ds):
    print("Starting feature engineering for flx data...")
    ds = create_rain_target(ds, RAIN_THRESHOLD_KGM2S)
    print("Feature engineering complete.")
    return ds
    
# --- Main Pipeline ---

def preprocessing_pipeline_flx(file_pattern, features_to_process):
    # Step 1: Load data with Dask chunking (Lazy loading)
    ds = data_ingestion(file_pattern, features_to_process)
    
    # Step 2: Clean any missing values (Partial Dask computation for null count)
    ds = clean_data(ds, features_to_process)
    
    # Step 3: Run flx-specific feature engineering (Lazy operations)
    ds = run_feature_engineering_flx(ds)
    
    print("\nFlux data preprocessing finished successfully!")
    return ds

# --- Execution Block ---

if __name__ == '__main__':
    final_dataset = preprocessing_pipeline_flx(
        file_pattern=FLX_FILE_PATTERN, 
        features_to_process=features_to_keep
    )
    
    # Print the final result to the console
    print("\n--- Final Processed Flux Dataset ---")
    print(final_dataset)
    
    # Save the final dataset (Triggers the full, parallel Dask computation and write)
    print("\n--- Saving Final Data ---")
    dataset_to_netcdf(final_dataset, OUTPUT_NETCDF_PATH)