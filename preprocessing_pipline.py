import xarray as xr
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import cartopy.crs as ccrs
import glob

FILE_PATTERN = 'data/*.nc4.nc4'
VARS_TO_CELSIUS = ['T2MMAX', 'T2MMEAN', 'T2MMIN']
VARS_TO_CHECK = ['T2MMAX', 'T2MMEAN', 'T2MMIN']
OUTPUT_CSV_PATH = 'climate_data_processed.csv'
list_of_vars_2_convert_2_Celsius = ['T2MMAX', 'T2MMEAN', 'T2MMIN']
variables_to_check = ['T2MMAX', 'T2MMEAN', 'T2MMIN']

def Data_Ingestion(file_pattern):
    print(f"Loading files from: {file_pattern}\n")
    file_paths = sorted(glob.glob(file_pattern))
    if not file_paths:
        raise ValueError("No files found matching the pattern.")
    
    ds = xr.open_mfdataset(file_paths, combine='by_coords')
    return ds

def Convert_Kelvin_2_Celsius(dataset, list_of_vars_2_convert_2_Celsius):
    for i in list_of_vars_2_convert_2_Celsius:
        dataset[i] = dataset[i] - 273.15
        dataset[i].attrs['units'] = 'C'

def Convert_Kelvin_2_Celsius(dataset, list_of_vars):
    for var in list_of_vars:
        dataset[var] = dataset[var] - 273.15
        dataset[var].attrs['units'] = 'C'

def DTR_feature_making(dataset):
    dataset['TEMP_RANGE'] = dataset['T2MMAX'] - dataset['T2MMIN']
    dataset['TEMP_RANGE'].attrs['long_name'] = 'Diurnal Temperature Range'
    dataset['TEMP_RANGE'].attrs['units'] = 'C'

def Feature_Engineering(dataset, list_of_vars):
    print("\nStarting feature engineering...")
    Convert_Kelvin_2_Celsius(dataset, list_of_vars)
    DTR_feature_making(dataset)
    print("Feature engineering complete.")

def clean_data(dataset, variables_to_check):
    """Checks for and fills missing values in specified variables."""
    print("\nStarting data cleaning...")
    for var in variables_to_check:
        missing_count = dataset[var].isnull().sum().compute().item()
        print(f"Checking '{var}': Found {missing_count} missing values.")

        if missing_count > 0:
            dataset[var] = dataset[var].interpolate_na(dim='lat', method='linear')
            print(f"--> Filled Null values in '{var}' using interpolation.")
    print("Data cleaning complete.")


def dataset_to_csv(ds, output_filepath):
    df = ds.to_dataframe().reset_index()
    df.to_csv(output_filepath, index=False)
    print(f"Successfully saved data to: {output_filepath}")


def preprocessing_pipeline(file_pattern, vars_to_convert, vars_to_check):

    # Step 1: load all the data
    ds = Data_Ingestion(file_pattern)
    
    # Step 2: Pass the data to spot any missing values and fix it
    clean_data(ds, vars_to_check)
    
    # Step 3: Pass cleaned data to faeture engineering
    Feature_Engineering(ds, vars_to_convert)
    
    # Step 4: Return the final result
    print("\nPreprocessing pipeline finished successfully!")
    return ds

if __name__ == '__main__':
    # This block runs only when you execute this script directly.
    
    # Run the entire pipeline with one function call
    final_dataset = preprocessing_pipeline(
        file_pattern=FILE_PATTERN, 
        vars_to_convert=VARS_TO_CELSIUS, 
        vars_to_check=VARS_TO_CHECK
    )
    
    # Use the final, clean dataset
    print("\n--- Final Processed Dataset ---")
    print(final_dataset)
    
    # Save the final result to a CSV
    dataset_to_csv(final_dataset, OUTPUT_CSV_PATH)