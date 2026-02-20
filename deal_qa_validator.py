import pandas as pd
import requests
import argparse
import sys
from datetime import datetime

# Configuration
API_BASE_URL = "https://api.pubmatic.com"
API_ENDPOINT = "/v3/pmp/deals/{dealid}"

def normalize_date(date_obj):
    """
    Normalize date to YYYY-MM-DD format for comparison.
    Handles pandas Timestamp, string, or datetime objects.
    """
    if pd.isna(date_obj):
        return None
    try:
        if isinstance(date_obj, str):
            # API returns ISO format: "2019-03-22T09:31:18Z"
            # Excel might have "2026-02-01 00:00:00"
            if "T" in date_obj:
                return date_obj.split("T")[0]
            if " " in date_obj:
                return date_obj.split(" ")[0]
            return datetime.fromisoformat(date_obj).strftime('%Y-%m-%d')
        return date_obj.strftime('%Y-%m-%d')
    except Exception as e:
        return str(date_obj)

def get_deal_details(deal_id, auth_token):
    """
    Fetch deal details from PubMatic API.
    """
    url = f"{API_BASE_URL}{API_ENDPOINT.format(dealid=deal_id)}"
    headers = {
        "Authorization": auth_token, # User said token is full string or we prepend Bearer? 
                                     # Usually user gives token, we prepend Bearer. 
                                     # User said "bearer token is enough", often implying the header value.
                                     # Let's ensure it has 'Bearer ' prefix if missing.
        "Content-Type": "application/json"
    }
    
    # Ensure "Bearer " prefix
    if not headers["Authorization"].lower().startswith("bearer "):
        headers["Authorization"] = f"Bearer {headers['Authorization']}"

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching deal {deal_id}: {e}")
        return None

def validate_deal(row, api_data):
    """
    Compare Excel row data with API response data.
    Returns a list of discrepancies.
    """
    discrepancies = []
    
    # Mapping Excel columns to expected API fields based on Screenshot
    checks = [
        {"excel_col": "Deal Name", "api_field": "name", "label": "Deal Name"},
        # "id" in API seems to be the numeric ID. "dealId" in API seems to be string identifier?
        # Excel "Deal ID" is likely the numeric one used in URL?
        # Screenshot shows URL .../138752 and body "id": 138752.
        # But Excel row 3 has "TRESemme_F18_NESA_Ind1_010226_618864" under Deal ID?
        # Wait, looking at tool output step 33: 
        # Excel "Deal ID" column has "TRESemme_...". 
        # But the PDF filename was "Get the details of a specific deal.pdf", which implies fetching by ID.
        # IF the Excel "Deal ID" is actually the name/string ID, and not the numeric ID needed for the endpoint,
        # we might have a problem if the API strictly requires the integer ID.
        # However, many APIs accept either. 
        # Screenshot shows numeric ID in URL.
        # Let's assume Excel "Deal ID" is valid for lookup or we might need to search.
        
        {"excel_col": "CPM (INR)", "api_field": "cpm", "label": "CPM"}, # Field 'cpm' not in screenshot, but likely exists
        {"excel_col": "Start Date (MM-DD-YY)", "api_field": "startDate", "label": "Start Date", "is_date": True},
        {"excel_col": "End date (MM-DD-YY)", "api_field": "endDate", "label": "End Date", "is_date": True},
        {"excel_col": "Budget (INR)", "api_field": "budget", "label": "Budget"},
    ]

    for check in checks:
        excel_val = row.get(check["excel_col"])
        api_val = api_data.get(check["api_field"])

        if check.get("is_date"):
            excel_val = normalize_date(excel_val)
            api_val = normalize_date(api_val)

        # Basic comparison
        # Treat None/NaN as empty string for comparison to avoid mismatch on acceptable missing data
        str_excel = str(excel_val) if pd.notnull(excel_val) else ""
        str_api = str(api_val) if api_val is not None else ""
        
        if str_excel != str_api:
             discrepancies.append(f"{check['label']}: Expected '{str_excel}', Found '{str_api}'")

    return discrepancies

def main():
    parser = argparse.ArgumentParser(description="Validate Deals against PubMatic API")
    parser.add_argument("excel_file", help="Path to the Excel file containing deal details")
    parser.add_argument("--auth-token", required=True, help="PubMatic OAuth Token (Bearer Token)")
    parser.add_argument("--output", default="deal_qa_report.xlsx", help="Output report file")
    
    args = parser.parse_args()

    print(f"Reading {args.excel_file}...")
    try:
        # First read without header to find the correct row
        df_raw = pd.read_excel(args.excel_file, header=None)
        
        header_row_idx = None
        for i, row in df_raw.iterrows():
            # Check if 'Deal ID' is in any of the cell values in this row
            # Convert to string and case-insensitive check might be safer, but exact match first
            if row.astype(str).str.contains("Deal ID", case=False).any():
                header_row_idx = i
                break
        
        if header_row_idx is not None:
            print(f"Found headers at row {header_row_idx}")
            df = pd.read_excel(args.excel_file, header=header_row_idx)
        else:
            print("Could not find 'Deal ID' header row. Using default.")
            df = pd.read_excel(args.excel_file)

    except Exception as e:
        print(f"Failed to read Excel file: {e}")
        sys.exit(1)

    results = []

    # Clean header names (strip spaces and newlines)
    df.columns = df.columns.map(lambda x: str(x).strip() if pd.notnull(x) else x)

    # Filter out empty rows or rows where Deal ID is header repetition
    # (though read_excel header=idx should handle the header row itself)
    
    if 'Deal ID' not in df.columns:
        print(f"Error: 'Deal ID' column not found. Available columns: {df.columns.tolist()}")
        sys.exit(1)

    for index, row in df.iterrows():
        deal_id = row.get("Deal ID")
        if pd.isna(deal_id) or str(deal_id).strip() == "":
            continue

        print(f"Validating Deal ID: {deal_id}")
        
        api_data = get_deal_details(deal_id, args.auth_token)
        
        status = "SKIPPED"
        comments = ""
        
        if api_data:
            issues = validate_deal(row, api_data)
            if not issues:
                status = "PASS"
            else:
                status = "FAIL"
                comments = "; ".join(issues)
        else:
            status = "ERROR"
            comments = "API Request Failed"

        results.append({
            "Deal ID": deal_id,
            "Status": status,
            "Comments": comments
        })

    # Create report
    report_df = pd.DataFrame(results)
    report_df.to_excel(args.output, index=False)
    print(f"Validation complete. Report saved to {args.output}")

if __name__ == "__main__":
    main()
