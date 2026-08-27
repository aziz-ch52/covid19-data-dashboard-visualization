import pandas as pd
import numpy as np
import logging
import argparse
from pathlib import Path

# Configure logging to output directly to the terminal
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def clean_covid_data(input_file, output_file):
    """
    Reads raw daily COVID-19 data, cleans it, aggregates it by year,
    and outputs a schema-compliant dataset for the dashboard.
    """
    logging.info(f"Loading raw data from {input_file}...")
    try:
        if input_file.endswith('.csv'):
            df = pd.read_csv(input_file)
        elif input_file.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(input_file)
        else:
            logging.error("Unsupported file format. Use .csv or .xlsx")
            return
    except Exception as e:
        logging.error(f"Failed to load file: {e}")
        return

    # 1. Standardize Columns
    # Real-world datasets have varying names; map them to our strict schema
    column_mapping = {
        'State/UnionTerritory': 'State',
        'State/UT': 'State',
        'Date': 'Date',
        'Confirmed': 'Cases',
        'Total Cases': 'Cases',
        'Cured': 'Recovered',
        'Discharged': 'Recovered',
        'Deaths': 'Deaths',
        'Total Doses Administered': 'Vaccinated'
    }
    df.rename(columns=column_mapping, inplace=True)

    required_cols = ['State', 'Date', 'Cases', 'Deaths', 'Recovered']
    for col in required_cols:
        if col not in df.columns:
            logging.error(f"Fatal: Missing critical column in raw data: '{col}'")
            return

    # Inject vaccination column if the raw dataset predates the vaccine rollout
    if 'Vaccinated' not in df.columns:
        logging.warning("Vaccinated column missing from raw data. Defaulting all to 0.")
        df['Vaccinated'] = 0

    # 2. Clean Data Types and Handle Missing Values
    logging.info("Cleaning datatypes and dropping invalid rows...")
    df['Date'] = pd.to_datetime(df['Date'], format='mixed', errors='coerce')
    
    # Drop rows where we don't know the state or date
    df.dropna(subset=['Date', 'State'], inplace=True)
    
    # Extract Year for aggregation
    df['Year'] = df['Date'].dt.year

    # Fill NaNs in numeric columns with 0 and force integer types
    numeric_cols = ['Cases', 'Deaths', 'Recovered', 'Vaccinated']
    df[numeric_cols] = df[numeric_cols].fillna(0).astype(int)

    # Clean state strings (strip trailing spaces, fix capitalization)
    df['State'] = df['State'].str.strip().str.title()
    
    # 3. Aggregate Data
    # Assuming raw data is daily cumulative, the highest value in a year is that year's total.
    logging.info("Aggregating daily metrics into yearly summaries...")
    yearly_df = df.groupby(['State', 'Year'])[numeric_cols].max().reset_index()

    # 4. Enforce Frontend Schema Rules (Validation Check)
    logging.info("Validating against strict frontend mathematical rules...")
    
    # Rule: Deaths + Recovered cannot exceed Cases
    invalid_math_mask = (yearly_df['Deaths'] + yearly_df['Recovered']) > yearly_df['Cases']
    invalid_count = invalid_math_mask.sum()
    
    if invalid_count > 0:
        logging.warning(f"Found {invalid_count} rows where Deaths + Recovered > Cases. Capping 'Recovered' to fix data integrity.")
        # Fix: Cap recovered so the equation balances out
        yearly_df.loc[invalid_math_mask, 'Recovered'] = yearly_df['Cases'] - yearly_df['Deaths']
        
        # Prevent impossible negative recovery counts if raw data had deaths > cases
        yearly_df['Recovered'] = yearly_df['Recovered'].clip(lower=0)

    # 5. Export Cleaned Data
    try:
        output_path = Path(output_file)
        # Create output directory if it doesn't exist
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        if output_file.endswith('.csv'):
            yearly_df.to_csv(output_file, index=False)
        else:
            yearly_df.to_excel(output_file, index=False)
            
        logging.info(f"Success! Cleaned dataset saved to {output_file} with {len(yearly_df)} records.")
    except Exception as e:
        logging.error(f"Failed to save file: {e}")

if __name__ == "__main__":
    # Command-line interface setup
    parser = argparse.ArgumentParser(description="ETL Pipeline: Clean and aggregate raw COVID-19 datasets.")
    parser.add_argument("--input", required=True, help="Path to the raw messy dataset (CSV/XLSX)")
    parser.add_argument("--output", required=True, help="Path to save the cleaned dashboard-ready dataset (CSV/XLSX)")
    
    args = parser.parse_args()
    clean_covid_data(args.input, args.output)