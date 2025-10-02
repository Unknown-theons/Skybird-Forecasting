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
    """Loads files and immediately selects a subset of variables."""
    print(f"Loading files from: {file_pattern}")
    file_paths = sorted(glob.glob(file_pattern))
    if not file_paths:
        raise ValueError(f"No files found matching the pattern: {file_pattern}")
    
    with xr.open_mfdataset(file_paths, combine='by_coords') as ds:
        ds_selected = ds[features_to_keep]
        print("Data ingestion and feature selection complete.")
        return ds_selected.load()

def clean_data(ds, vars_to_check):
    """Checks for and fills missing values in the specified variables."""
    print("Starting data cleaning...")
    for var in vars_to_check:
        missing_count = ds[var].isnull().sum().item()
        print(f"  - Checking '{var}': Found {missing_count} missing values.")
        if missing_count > 0:
            ds[var] = ds[var].interpolate_na(dim='lat', method='linear') 
            print(f"  - Filled Null values in '{var}'.")
    print("Data cleaning complete.")
    return ds

def dataset_to_netcdf(ds, output_filepath):
    """Saves the final dataset to a NetCDF4 file."""
    print(f"Saving dataset to NetCDF: {output_filepath}")
    output_dir = os.path.dirname(output_filepath)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    ds.to_netcdf(output_filepath, mode='w', format='NETCDF4')
    print(f"  - Successfully saved to {output_filepath}")

# --- Feature Engineering for FLX data ---

def create_rain_target(ds, threshold):
    """Creates the binary 'it_rained' target variable from PRECTOT."""
    print(f"  - Engineering: Creating binary 'it_rained' target with threshold > {threshold}...")
    
    # Use xr.where for an efficient, vectorized operation
    ds['it_rained'] = xr.where(ds['PRECTOT'] > threshold, 1, 0)
    
    # It's good practice to add attributes to your new variable for clarity
    ds['it_rained'].attrs = {
        'long_name': 'Binary Rain Flag',
        'description': f'1 if PRECTOT > {threshold} kg m-2 s-1, else 0',
        'units': 'unitless'
    }
    print("  - 'it_rained' feature created.")
    return ds

def run_feature_engineering_flx(ds):
    print("Starting feature engineering for flx data...")
    ds = create_rain_target(ds, RAIN_THRESHOLD_KGM2S)
    print("Feature engineering complete.")
    return ds
    
# --- Main Pipeline ---

def preprocessing_pipeline_flx(file_pattern, features_to_process):

    
    # Step 1: Load data and select variables
    ds = data_ingestion(file_pattern, features_to_process)
    
    # Step 2: Clean any missing values
    ds = clean_data(ds, features_to_process)
    
    # Step 3: Run flx-specific feature engineering
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
    
    # Note the new 'it_rained' variable in the output
    
    # Save the final dataset
    print("\n--- Saving Final Data ---")
    dataset_to_netcdf(final_dataset, OUTPUT_NETCDF_PATH)