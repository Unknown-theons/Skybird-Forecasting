import xarray as xr
import numpy as np
import metpy.calc as mpcalc
import glob

# --- Configuration ---

RAD_FILE_PATTERN = '/content/drive/MyDrive/NasaDataSetsff4/*.nc4'
OUTPUT_NETCDF_PATH = '/content/drive/MyDrive/NasaDataSetsff4/wind_data_processed.nc4'

features_to_keep = [
    # Surface Variables
    'PS', 'SLP', 'T2M', 'TS', 'T10M', 'QV2M', 'QV10M', 'DISPH', 'PBLTOP',
    
    # Near-Surface Winds
    'U50M', 'V50M',
    
    # Multi-Level Atmospheric State
    'H850', 'U850', 'V850',
    'H700', 'U700', 'V700',
    'H500', 'U500', 'V500',
    'OMEGA500',
    
    # Target Variables
    'U10M', 'V10M',

    # need it for rain
    'T2MDEW', 'TQV'
]

# --- Data Loading and Cleaning ---

def data_ingestion(file_pattern, features_to_keep):
    """
    Loads files and immediately selects a subset of variables, 
    using explicit Dask chunking for parallel processing.
    """
    print(f"Loading files from: {file_pattern}")
    file_paths = sorted(glob.glob(file_pattern))
    if not file_paths:
        raise ValueError("No files found matching the pattern. Check your FILE_PATTERN.")
    
    # 💡 OPTIMIZATION 1: Specify chunks to control Dask parallelism.
    # Chunking by 'time' (e.g., 30 steps) is generally efficient for time-series.
    chunks = {'time': 30, 'lat': 'auto', 'lon': 'auto'}
    
    ds = xr.open_mfdataset(
        file_paths, 
        combine='by_coords',
        chunks=chunks # Apply chunking
    )
    
    # Select only the necessary variables to save memory
    ds_selected = ds[features_to_keep]
    print("Data ingestion and feature selection complete.")
    return ds_selected

def clean_data(ds, vars_to_check):
    """Checks for and fills missing values in the specified variables."""
    print("Starting data cleaning...")
    for var in vars_to_check:
        # compute() is necessary here to get the actual count
        missing_count = ds[var].isnull().sum().compute().item()
        print(f"   - Checking '{var}': Found {missing_count} missing values.")
        if missing_count > 0:
            # Interpolation is added to the Dask graph, but not executed yet
            ds[var] = ds[var].interpolate_na(dim='lat', method='linear') 
            print(f"   - Filled Null values in '{var}'.")
    print("Data cleaning complete.")
    return ds

# --- Feature Engineering Functions ---

def calculate_air_density(ds):
    """Calculates air density and adds it to the dataset."""
    print("   - Engineering: Air Density...")
    R_d = 287.058  # Specific gas constant for dry air in J/(kg·K)
    virtual_temp = ds['T2M'] * (1 + 0.61 * ds['QV2M'])
    air_density = ds['PS'] / (R_d * virtual_temp)
    ds['AIR_DENSITY'] = air_density
    ds['AIR_DENSITY'].attrs = {
        'long_name': 'Air Density', 'units': 'kg/m^3'
    }
    return ds

def calculate_pressure_gradient(ds):
    """Calculates the magnitude of the sea level pressure gradient."""
    print("   - Engineering: Pressure Gradient...")
    # NOTE: mpcalc operations are Dask-aware and remain lazy
    slp_dx, slp_dy = mpcalc.gradient(ds['SLP'])
    pressure_gradient = np.sqrt(slp_dx**2 + slp_dy**2)
    ds['PRESSURE_GRADIENT'] = pressure_gradient
    ds['PRESSURE_GRADIENT'].attrs = {
        'long_name': 'Magnitude of Sea Level Pressure Gradient', 'units': 'Pa/m'
    }
    return ds

def calculate_temp_gradient(ds):
    """Calculates the magnitude of the 2-meter air temperature gradient."""
    print("   - Engineering: Temperature Gradient...")
    # NOTE: mpcalc operations are Dask-aware and remain lazy
    t2m_dx, t2m_dy = mpcalc.gradient(ds['T2M'])
    temp_gradient = np.sqrt(t2m_dx**2 + t2m_dy**2)
    ds['TEMP_GRADIENT'] = temp_gradient
    ds['TEMP_GRADIENT'].attrs = {
        'long_name': 'Magnitude of 2m Temperature Gradient', 'units': 'K/m'
    }
    return ds

def run_feature_engineering(ds):
    """Master function to run all feature engineering steps."""
    print("Starting feature engineering...")
    ds = calculate_air_density(ds)
    ds = calculate_pressure_gradient(ds)
    ds = calculate_temp_gradient(ds)
    print("Feature engineering complete.")
    return ds

# --- Data Saving Function (NetCDF Only) ---

def dataset_to_netcdf(ds, output_filepath):
    """
    Saves the final dataset to a NetCDF4 file, applying compression (zlib) 
    for faster I/O and smaller files.
    """
    print(f"Saving dataset to NetCDF4: {output_filepath}")
    
    # 💡 OPTIMIZATION 2: Add Zlib compression and use float32 for efficiency.
    encoding = {}
    for var in ds.data_vars:
        encoding[var] = {
            'zlib': True, 
            'complevel': 4, # Compression level (1-9)
            'dtype': 'float32' # Reduces file size by 50%
        }
    
    # The to_netcdf call triggers the full, parallel Dask computation.
    ds.to_netcdf(
        output_filepath, 
        mode='w', 
        format='NETCDF4', 
        engine='netcdf4',
        encoding=encoding # Apply compression
    )
    print("   - Successfully saved.")
    
# --- Main Pipeline ---

def preprocessing_pipeline(file_pattern, features_to_process):

    # Step 1: Load data and select variables (Lazy, Dask-chunked)
    ds = data_ingestion(file_pattern, features_to_process)
    
    # Step 2: Clean any missing values (Partial compute for null check)
    ds = clean_data(ds, features_to_process)
    
    # Step 3: Run all feature engineering tasks (Lazy operations)
    ds = run_feature_engineering(ds)
    
    print("\nPreprocessing pipeline finished successfully!")
    return ds

# --- Execution Block ---

if __name__ == '__main__':
    # Run the entire pipeline
    final_dataset = preprocessing_pipeline(
        file_pattern=FILE_PATTERN, 
        features_to_process=features_to_keep
    )
    
    # Print the final result to the console
    print("\n--- Final Processed Dataset ---")
    print(final_dataset)
    
    # Save the final dataset (Triggers computation)
    print("\n--- Saving Final Data ---")
    dataset_to_netcdf(final_dataset, OUTPUT_NETCDF_PATH)