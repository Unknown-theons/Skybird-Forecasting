import xarray as xr
import glob
import os

# --- Configuration ---

RAD_FILE_PATTERN = '/content/drive/MyDrive/NasaDataSetsff3/*.nc4'
OUTPUT_NETCDF_PATH = '/content/drive/MyDrive/NasaDataSetsff3/rain_data_processed.nc4'

# These are the variables we need from the radiation dataset
features_to_keep = [
    'CLDTOT', 
    'TAUTOT'
]

# --- Data Loading and Cleaning ---

def data_ingestion(file_pattern, features_to_keep):
    """
    Loads files, selects variables, and applies Dask chunking for
    efficient, parallel processing.
    """
    print(f"Loading files from: {file_pattern}")
    file_paths = sorted(glob.glob(file_pattern))
    if not file_paths:
        raise ValueError(f"No files found matching the pattern: {file_pattern}")
    
    # 💡 OPTIMIZATION 1: Specify chunks to control Dask parallelism.
    # Chunking by 'time' (e.g., 30 steps) is generally efficient.
    # We remove the context manager (with xr.open_mfdataset) and the ds_selected.load()
    # to ensure the data remains lazy until the final .to_netcdf call.
    chunks = {'time': 30, 'lat': 'auto', 'lon': 'auto'}
    
    ds = xr.open_mfdataset(
        file_paths, 
        combine='by_coords',
        chunks=chunks # Apply chunking
    )
    
    # Select only the necessary variables to save memory
    ds_selected = ds[features_to_keep]
    print("Data ingestion, chunking, and feature selection complete.")
    return ds_selected

def clean_data(ds, vars_to_check):
    """Checks for and fills missing values in the specified variables."""
    print("Starting data cleaning...")
    for var in vars_to_check:
        # compute() is necessary here to trigger the Dask graph and count nulls
        missing_count = ds[var].isnull().sum().compute().item() 
        print(f"  - Checking '{var}': Found {missing_count} missing values.")
        if missing_count > 0:
            # Interpolation is added to the Dask graph, but not executed yet
            ds[var] = ds[var].interpolate_na(dim='lat', method='linear') 
            print(f"  - Filled Null values in '{var}'.")
    print("Data cleaning complete.")
    return ds

# --- Data Saving Function ---

def dataset_to_netcdf(ds, output_filepath):
    """
    Saves the final dataset to a NetCDF4 file, applying zlib compression
    for faster I/O and smaller files.
    """
    print(f"Saving dataset to NetCDF: {output_filepath}")
    
    # Create directory if it doesn't exist
    output_dir = os.path.dirname(output_filepath)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        
    # 💡 OPTIMIZATION 2: Add Zlib compression and float32 dtype for efficiency.
    encoding = {}
    for var in ds.data_vars:
        encoding[var] = {
            'zlib': True, 
            'complevel': 4, # Compression level 
            'dtype': 'float32' # Reduces file size by ~50%
        }
    
    # This call triggers the full, parallel Dask computation and write.
    ds.to_netcdf(
        output_filepath, 
        mode='w', 
        format='NETCDF4',
        encoding=encoding # Apply compression
    )
    print(f"  - Successfully saved to {output_filepath}")
    
# --- Main Pipeline ---

def preprocessing_pipeline_rad(file_pattern, features_to_process):

    # Step 1: Load data and select variables (Lazy, Dask-chunked)
    ds = data_ingestion(file_pattern, features_to_process)
    
    # Step 2: Clean any missing values (Partial compute for null check)
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
    
    # Save the final dataset (Triggers computation)
    print("\n--- Saving Final Data ---")
    dataset_to_netcdf(final_dataset, OUTPUT_NETCDF_PATH)