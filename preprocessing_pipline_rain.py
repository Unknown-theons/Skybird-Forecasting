import xarray as xr
import glob
import os # Good practice to use os.path.join

# --- Configuration ---

RAD_FILE_PATTERN = 'data_rad/*.nc4.nc4'
OUTPUT_NETCDF_PATH = 'rad_data_processed.nc4' 

# These are the variables we need from the radiation dataset
features_to_keep = [
    'CLDTOT', 
    'TAUTOT'
]

# --- Data Loading and Cleaning ---

def data_ingestion(file_pattern, features_to_keep):
    """Loads files and immediately selects a subset of variables."""
    print(f"Loading files from: {file_pattern}")
    file_paths = sorted(glob.glob(file_pattern))
    if not file_paths:
        raise ValueError(f"No files found matching the pattern: {file_pattern}")
    
    # Using a context manager for opening datasets is good practice
    with xr.open_mfdataset(file_paths, combine='by_coords') as ds:
        # Select only the necessary variables to save memory
        ds_selected = ds[features_to_keep]
        print("Data ingestion and feature selection complete.")
        # Load into memory before closing the files
        return ds_selected.load()

def clean_data(ds, vars_to_check):

    print("Starting data cleaning...")
    for var in vars_to_check:
        missing_count = ds[var].isnull().sum().item() 
        print(f"  - Checking '{var}': Found {missing_count} missing values.")
        if missing_count > 0:
            # Interpolation is a good strategy for spatial data
            ds[var] = ds[var].interpolate_na(dim='lat', method='linear') 
            print(f"  - Filled Null values in '{var}'.")
    print("Data cleaning complete.")
    return ds

# --- Data Saving Function ---

def dataset_to_netcdf(ds, output_filepath):
    """Saves the final dataset to a NetCDF4 file."""
    print(f"Saving dataset to NetCDF: {output_filepath}")
    # Create directory if it doesn't exist
    output_dir = os.path.dirname(output_filepath)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    ds.to_netcdf(output_filepath, mode='w', format='NETCDF4')
    print(f"  - Successfully saved to {output_filepath}")
    
# --- Main Pipeline ---

def preprocessing_pipeline_rad(file_pattern, features_to_process):

    # Step 1: Load data and select variables
    ds = data_ingestion(file_pattern, features_to_process)
    
    # Step 2: Clean any missing values
    ds = clean_data(ds, features_to_process)
    
    # STEP 3 REMOVED - Feature engineering is not applicable to this data
    
    print("\nRadiation data preprocessing finished successfully!")
    return ds

# --- Execution Block ---

if __name__ == '__main__':
    final_dataset = preprocessing_pipeline_rad(
        file_pattern=RAD_FILE_PATTERN, 
        features_to_process=features_to_keep
    )
    
    # Print the final result to the console
    print("\n--- Final Processed Radiation Dataset ---")
    print(final_dataset)
    
    # Save the final dataset
    # Saving to CSV is not ideal for multi-dimensional grid data, NetCDF is preferred
    print("\n--- Saving Final Data ---")
    dataset_to_netcdf(final_dataset, OUTPUT_NETCDF_PATH)