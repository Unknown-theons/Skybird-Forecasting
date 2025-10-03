import xarray as xr
import numpy as np

# --- Configuration ---
# Input files
file_climate = '/content/drive/MyDrive/NasaDataSetsff2/climate_data_processed.nc4' # Global climate data
file_wind = '/content/drive/MyDrive/NasaDataSetsff4/wind_data_processed.nc4'      # Regional wind data

# Output files
FEATURES_OUT_FILE = '/content/drive/MyDrive/NasaDataSetsff2/features_temp.nc4'
CLIMATOLOGY_OUT_FILE = '/content/drive/MyDrive/NasaDataSetsff2/climatology_lookup_table.nc4'

# --- Stage 1: Data Loading (Helper Function) ---

def load_and_merge_data(climate_file, wind_file):
    """
    Loads global and regional data, subsets the global to match regional,
    aligns time, and merges into a single dataset.
    
    OPTIMIZATION: Remove .item() and rely on Dask/Xarray for lazy boundaries.
    """
    print("--- Running: Load and Merge (Lazy) ---")
    
    # Keep loading lazy by default. Dask chunks are maintained if files were chunked.
    ds_climate = xr.open_dataset(climate_file)
    ds_wind = xr.open_dataset(wind_file)
    
    # 💡 Optimization: Get boundaries without forcing computation with .compute()
    # This allows the selection to be added to the Dask graph.
    lat_min, lat_max = ds_wind['lat'].min(), ds_wind['lat'].max()
    lon_min, lon_max = ds_wind['lon'].min(), ds_wind['lon'].max()
    
    # Crop the global data to the regional boundaries
    ds_climate_regional = ds_climate.sel(
        lat=slice(lat_min, lat_max), 
        lon=slice(lon_min, lon_max)
    )
    
    # Align time and merge. This is the first major computation bottleneck.
    # Interpolation remains necessary but is now within the Dask graph.
    ds_climate_aligned = ds_climate_regional.interp(time=ds_wind.time, method="linear")
    
    # Xarray's merge remains lazy
    merged_ds = xr.merge([ds_climate_aligned, ds_wind])
    
    print("Merge step built into Dask graph.")
    return merged_ds

# --- Stage 2: Feature Engineering (Helper Functions) ---

def add_cyclical_longitude(ds):
    """Creates cyclical longitude features (fully lazy)."""
    lon_rad = np.deg2rad(ds['lon'])
    # These operations are lazy because 'lon' is a coordinate, not a large DataArray
    ds['lon_sin'] = np.sin(lon_rad)
    ds['lon_cos'] = np.cos(lon_rad)
    return ds

def add_cyclical_time_features(ds):
    """
    Creates cyclical time features for hour and day of year.
    
    OPTIMIZATION: Remove .data and use Dask-aware operations.
    """
    print("  - Engineering: Cyclical Time (Fully Lazy)")
    time_coord = ds['time']
    
    # 💡 Optimization: Use the .dt accessor directly with Xarray/Dask functions
    # This avoids forcing the time coordinate data into a NumPy array with .data
    hour_angle = (time_coord.dt.hour / 24.0) * 2 * np.pi
    # Use 366.0 for normalization, as it's the safe maximum
    day_angle = (time_coord.dt.dayofyear / 366.0) * 2 * np.pi 
    
    # Create new DataArrays using the lazy Dask-backed angle arrays
    ds['hour_sin'] = hour_angle.pipe(np.sin)
    ds['hour_cos'] = hour_angle.pipe(np.cos)
    ds['dayofyear_sin'] = day_angle.pipe(np.sin)
    ds['dayofyear_cos'] = day_angle.pipe(np.cos)

    # Ensure coordinates are preserved if needed, though they usually are.
    ds['hour_sin'].attrs = {'units': 'sin of hour', 'long_name': 'Sine of Hour'}
    
    return ds

def run_feature_engineering(ds):
    """Master function to run all feature engineering steps."""
    print(" Running: Feature Engineering")
    ds = add_cyclical_longitude(ds)
    ds = add_cyclical_time_features(ds)
    return ds

# --- Main Pipeline and Output Functions ---

# 💡 Optimization: Consolidated saving function to apply compression
def save_dataset_as_netcdf(ds, output_path):
    """
    Utility function to save any xarray Dataset to a NetCDF4 file,
    applying zlib compression for faster I/O.
    """
    print(f"   -> Saving dataset to: {output_path}")
    
    # 💡 OPTIMIZATION 3: Add Zlib compression and float32 dtype for efficiency.
    encoding = {}
    for var in ds.data_vars:
        encoding[var] = {
            'zlib': True, 
            'complevel': 4, 
            'dtype': 'float32' # Halves file size/I/O time
        }
    
    # The to_netcdf call triggers the full, parallel Dask computation.
    ds.to_netcdf(
        output_path, 
        mode='w', 
        format='NETCDF4', 
        engine='netcdf4',
        encoding=encoding # Apply compression
    )
    print(f"   -> Successfully saved.")


def features_pipeline(climate_file, wind_file):
    """
    Primary pipeline to generate the full, hourly, engineered dataset.
    """
    print("--- STARTING FEATURES PIPELINE ---")
    # Step 1: Load and merge the raw data (Lazy)
    merged_ds = load_and_merge_data(climate_file, wind_file)
    # Step 2: Apply all feature engineering (Lazy)
    engineered_ds = run_feature_engineering(merged_ds)
    print("--- FEATURES PIPELINE COMPLETE ---")
    return engineered_ds

def build_climatology_lookup(ds, output_path):
    """
    Creates the final climatology lookup table by averaging data for each 
    day of the year. The .mean() operation triggers a major Dask computation.
    """
    print("\n--- STARTING CLIMATOLOGY BUILD ---")
    vars_to_average = list(ds.data_vars)
    
    # Grouping is lazy, but the .mean() operation forces computation
    daily_groups = ds.groupby('time.dayofyear')
    climatology = daily_groups.mean(dim='time') # The time-consuming step
    
    rename_dict = {var: f"{var}_avg" for var in vars_to_average}
    climatology = climatology.rename(rename_dict)
    
    # This function saves its own output, using the optimized save function.
    save_dataset_as_netcdf(climatology, output_path)
    print("--- CLIMATOLOGY BUILD COMPLETE ---")
    return climatology

# --- Main Execution Block ---

if __name__ == '__main__':
    # 1. Run the primary pipeline to get the fully engineered hourly data
    final_features_dataset = features_pipeline(file_climate, file_wind)
    
    # 2. Save this primary result as the first requested file
    print(f"\n--- Generating Output 1: Features Dataset ---")
    save_dataset_as_netcdf(final_features_dataset, FEATURES_OUT_FILE)
    
    # 3. Use the engineered data to build and save the climatology table
    print(f"\n--- Generating Output 2: Climatology Lookup Table ---")
    climatology_lookup = build_climatology_lookup(final_features_dataset, CLIMATOLOGY_OUT_FILE)
    
    print("\n\n--- ALL TASKS FINISHED ---")
    print(f"Output 1: {FEATURES_OUT_FILE}")
    print(f"Output 2: {CLIMATOLOGY_OUT_FILE}")