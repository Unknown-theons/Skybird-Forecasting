import xarray as xr
import numpy as np
import metpy.calc as mpcalc
import glob

# --- Configuration ---
FILE_PATTERN = 'data_wind/*.nc4.nc4'
OUTPUT_CSV_PATH = 'wind_data_processed.csv'
OUTPUT_NETCDF_PATH = 'wind_data_processed.nc4'

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
    'T2MDEW'
]

# --- Data Loading and Cleaning ---

def data_ingestion(file_pattern, features_to_keep):
    """Loads files and immediately selects a subset of variables."""
    print(f"Loading files from: {file_pattern}")
    file_paths = sorted(glob.glob(file_pattern))
    if not file_paths:
        raise ValueError("No files found matching the pattern. Check your FILE_PATTERN.")
    
    ds = xr.open_mfdataset(file_paths, combine='by_coords')
    
    # Select only the necessary variables to save memory
    ds_selected = ds[features_to_keep]
    print("Data ingestion and feature selection complete.")
    return ds_selected

def clean_data(ds, vars_to_check):
    """Checks for and fills missing values in the specified variables."""
    print("Starting data cleaning...")
    for var in vars_to_check:
        missing_count = ds[var].isnull().sum().compute().item()
        print(f"   - Checking '{var}': Found {missing_count} missing values.")
        if missing_count > 0:
            # Fill nulls using linear interpolation along the latitude dimension
            ds[var] = ds[var].interpolate_na(dim='lat', method='linear') 
            print(f"   - Filled Null values in '{var}'.")
    print("Data cleaning complete.")
    return ds

# --- Feature Engineering Functions ---

def calculate_air_density(ds):
    """Calculates air density and adds it to the dataset."""
    print("   - Engineering: Air Density...")
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
    print("   - Engineering: Pressure Gradient...")
    slp_dx, slp_dy = mpcalc.gradient(ds['SLP'])
    pressure_gradient = np.sqrt(slp_dx**2 + slp_dy**2)
    ds['PRESSURE_GRADIENT'] = pressure_gradient
    ds['PRESSURE_GRADIENT'].attrs = {
        'long_name': 'Magnitude of Sea Level Pressure Gradient', 'units': 'Pa/m'
    }
    return ds

def calculate_temp_gradient(ds):
    """Calculates the magnitude of the 2-meter air temperature gradient."""
    print("   - Engineering: Temperature Gradient...")
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

# --- Data Saving Functions ---

def dataset_to_csv(ds, output_filepath):
    """Saves the final dataset to a CSV file."""
    print(f"Saving dataset to CSV: {output_filepath}")
    df = ds.to_dataframe().reset_index()
    df.to_csv(output_filepath, index=False)
    print("   - Successfully saved.")

def dataset_to_netcdf(ds, output_filepath):
    """Saves the final dataset to a NetCDF4 file, supporting large files."""
    print(f"Saving dataset to NetCDF4: {output_filepath}")
    ds.to_netcdf(output_filepath, mode='w', format='NETCDF4', engine='netcdf4')
    print("   - Successfully saved.")
    
# --- Main Pipeline ---

def preprocessing_pipeline(file_pattern, features_to_process):

    # Step 1: Load data and select variables
    ds = data_ingestion(file_pattern, features_to_process)
    
    # Step 2: Clean any missing values
    ds = clean_data(ds, features_to_process)
    
    # Step 3: Run all feature engineering tasks
    ds = run_feature_engineering(ds)
    
    print("\n Preprocessing pipeline finished successfully!")
    return ds

# --- Execution Block ---

if __name__ == '__main__':
    # --- FIXED THIS BLOCK ---
    # The function call now correctly matches the pipeline's definition.
    # It passes the `features_to_keep` list to the pipeline.
    
    final_dataset = preprocessing_pipeline(
        file_pattern=FILE_PATTERN, 
        features_to_process=features_to_keep
    )
    
    # Print the final result to the console
    print("\n Final Processed Dataset")
    print(final_dataset)
    
    # Save the final dataset to both formats
    print("\n Saving Final Data")
    dataset_to_csv(final_dataset, OUTPUT_CSV_PATH)
    dataset_to_netcdf(final_dataset, OUTPUT_NETCDF_PATH)