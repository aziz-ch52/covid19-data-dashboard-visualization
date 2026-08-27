import pandas as pd
import json
import logging
import argparse
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def generate_metrics(input_file, output_dir):
    """
    Reads the cleaned dataset and pre-computes heavy aggregate metrics,
    exporting them as a static JSON file for fast frontend loading.
    """
    logging.info(f"Loading cleaned dataset from {input_file}...")
    try:
        if input_file.endswith('.xlsx'):
            df = pd.read_excel(input_file)
        else:
            df = pd.read_csv(input_file)
    except Exception as e:
        logging.error(f"Failed to load file: {e}")
        return

    logging.info("Calculating national aggregates and YoY trends...")
    
    # 1. National Yearly Aggregates
    yearly_totals = df.groupby('Year')[['Cases', 'Deaths', 'Recovered', 'Vaccinated']].sum().reset_index()
    
    # Prevent division by zero and calculate rates
    yearly_totals['CFR_Percentage'] = (yearly_totals['Deaths'] / yearly_totals['Cases'].replace(0, 1) * 100).round(2)
    yearly_totals['Recovery_Rate'] = (yearly_totals['Recovered'] / yearly_totals['Cases'].replace(0, 1) * 100).round(2)

    # 2. State Rankings (Worst Hit All-Time)
    state_totals = df.groupby('State')[['Cases', 'Deaths']].sum().reset_index()
    top_5_states = state_totals.sort_values(by='Cases', ascending=False).head(5)

    # 3. Build the final payload
    report = {
        "metadata": {
            "description": "Pre-computed metrics for dashboard fast-loading",
            "total_records": int(len(df))
        },
        "national_trends": yearly_totals.to_dict(orient='records'),
        "top_5_critical_states": top_5_states.to_dict(orient='records')
    }

    # 4. Export to JSON
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    out_file = output_path / 'summary_metrics.json'
    
    with open(out_file, 'w') as f:
        json.dump(report, f, indent=4)
        
    logging.info(f"Metrics successfully generated at {out_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate static JSON metrics from cleaned data.")
    parser.add_argument("--input", required=True, help="Path to the cleaned dataset (CSV/XLSX)")
    parser.add_argument("--outdir", required=True, help="Directory to save the output summary_metrics.json")
    
    args = parser.parse_args()
    generate_metrics(args.input, args.outdir)