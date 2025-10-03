import xarray as xr
import numpy as np
import glob

# --- Configuration ---
FILE_PATTERN = '/content/drive/MyDrive/NasaDataSetsff2/*.nc4'
VARS_TO_CELSIUS = ['T2MMAX', 'T2MMEAN', 'T2MMIN']
VARS_TO_CHECK_FOR_NULLS = ['T2MMAX', 'T2MMEAN', 'T2MMIN']
OUTPUT_NETCDF_PATH = '/content/drive/MyDrive/NasaDataSetsff2/climate_data_processed.nc4'


# --- Data Loading and Cleaning ---

def data_ingestion(file_pattern):
    """
    Loads and combines multiple NetCDF files, explicitly defining Dask chunks
    for efficient parallel processing.
    """
    print(f"Loading files from: {file_pattern}")
    file_paths = sorted(glob.glob(file_pattern))
    if not file_paths:
        raise ValueError("No files found matching the pattern. Check your FILE_PATTERN.")

    # 💡 Optimization 1: Specify chunks to control Dask parallelism.
    # Chunking by 'time' (e.g., 30 days/time steps) is generally efficient.
    # Adjust 30 based on your file structure and memory constraints.
    ds = xr.open_mfdataset(
        file_paths,
        combine='by_coords',
        chunks={'time': 30, 'lat': 'auto', 'lon': 'auto'}
    )
    print("Data ingestion complete.")
    return ds


def clean_data(ds, variables_to_check):
    """Checks for and fills missing values in the specified variables."""
    print("Starting data cleaning")
    for var in variables_to_check:
        # compute() is necessary here to trigger the Dask graph and count nulls
        missing_count = ds[var].isnull().sum().compute().item()
        print(f"   - Checking '{var}': Found {missing_count} missing values.")
        if missing_count > 0:
            # Fill nulls using linear interpolation along the latitude dimension
            # All these operations are performed lazily by Dask.
            ds[var] = ds[var].interpolate_na(dim='lat', method='linear')
            print(f"Filled Null values in '{var}'.")
    print("Data cleaning complete.")
    return ds


# --- Feature Engineering Functions ---

def convert_kelvin_to_celsius(ds, list_of_vars):
    print("Converting temperatures from Kelvin to Celsius...")
    for var in list_of_vars:
        ds[var] = ds[var] - 273.15
        ds[var].attrs['units'] = 'C'
    return ds


def add_dtr_feature(ds):
    """Adds the Diurnal Temperature Range (DTR) feature."""
    print("Engineering: Diurnal Temperature Range (TEMP_RANGE)")
    ds['TEMP_RANGE'] = ds['T2MMAX'] - ds['T2MMIN']
    ds['TEMP_RANGE'].attrs = {'long_name': 'Diurnal Temperature Range', 'units': 'C'}
    return ds


def add_temperature_persistence(ds):
    """Creates a lagged temperature feature (previous day's temperature)."""
    print("   - Engineering: Temperature Persistence (T2MMEAN_lag1)...")
    temp_lag1 = ds['T2MMEAN'].shift(time=1)
    # Back-fill the first NaN value with the next available day's data
    temp_lag1 = temp_lag1.bfill(dim='time')
    ds['T2MMEAN_lag1'] = temp_lag1
    ds['T2MMEAN_lag1'].attrs = {'long_name': 'Previous Day Mean 2m Temperature', 'units': 'C'}
    return ds


def add_cyclical_time_features(ds):
    """Encodes the 'time' coordinate cyclically."""
    print("Engineering: Cyclical Time (dayofyear_sin, dayofyear_cos)")
    day_of_year = ds.time.dt.dayofyear
    # Determine max days for normalization (using the largest value in the time series)
    days_in_year = ds.time.dt.is_leap_year.max().compute().item() * 366.0 + (
                1 - ds.time.dt.is_leap_year.max().compute().item()) * 365.0

    ds['dayofyear_sin'] = np.sin(2 * np.pi * day_of_year / days_in_year)
    ds['dayofyear_cos'] = np.cos(2 * np.pi * day_of_year / days_in_year)
    return ds


def run_feature_engineering(ds):
    print("Starting feature engineering")
    ds = add_dtr_feature(ds)
    ds = add_temperature_persistence(ds)
    ds = add_cyclical_time_features(ds)
    print("Feature engineering complete.")
    return ds


# --- Data Saving Function (NetCDF Only) ---

def dataset_to_netcdf(ds, output_filepath):
    """
    Saves the final dataset to a NetCDF4 file, supporting large files,
    with compression (zlib) for smaller output and faster I/O.
    """
    print(f"Saving dataset to NetCDF4: {output_filepath}")

    # 💡 Optimization 2: Add Zlib compression (level 4 is a good default).
    # This reduces file size and often speeds up saving due to reduced disk I/O.
    encoding = {var: {'zlib': True, 'complevel': 4} for var in ds.data_vars}

    # xarray efficiently handles the Dask graph computation during this write.
    ds.to_netcdf(
        output_filepath,
        mode='w',
        format='NETCDF4',
        engine='netcdf4',
        encoding=encoding
    )
    print("   - Successfully saved.")


# --- Main Pipeline ---

def preprocessing_pipeline(file_pattern, vars_to_celsius, vars_to_check):
    # Step 1: Load data (with optimized Dask chunking)
    ds = data_ingestion(file_pattern)

    # Step 2: Convert units FIRST
    ds = convert_kelvin_to_celsius(ds, vars_to_celsius)

    # Step 3: Clean any missing values (triggers a partial compute)
    ds = clean_data(ds, vars_to_check)

    # Step 4: Run all feature engineering tasks (all lazy/Dask operations)
    ds = run_feature_engineering(ds)

    print("\nPreprocessing pipeline finished successfully!")
    return ds


# --- Execution Block ---

if __name__ == '__main__':
    # Run the entire pipeline
    final_dataset = preprocessing_pipeline(
        file_pattern=FILE_PATTERN,
        vars_to_celsius=VARS_TO_CELSIUS,
        vars_to_check=VARS_TO_CHECK_FOR_NULLS
    )

    # Print the final result to the console
    print("\n--- Final Processed Dataset ---")
    print(final_dataset)

    # Save the final dataset (this is where the major Dask computation occurs)
    print("\n--- Saving Final Data ---")
    dataset_to_netcdf(final_dataset, OUTPUT_NETCDF_PATH)