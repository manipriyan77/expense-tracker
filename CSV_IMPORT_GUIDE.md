# CSV Import Guide

This guide explains how to import your mutual funds and stocks from CSV files exported from investment platforms like Tickertape, Groww, Zerodha Console, etc.

## Mutual Funds Import

### Supported CSV Format

The mutual funds import feature supports CSV files with the following columns:

- **Fund Name** (Required) - Name of the mutual fund
- **Category** - Equity, Debt, Hybrid, etc.
- **Sub-Category** - ELSS, Flexi Cap, Small Cap, etc.
- **NAV ₹** - Current Net Asset Value
- **Units** - Number of units held
- **Invested Amt ₹** - Total amount invested
- **Current Value ₹** - Current market value
- **Invested Since** - Purchase date (YYYY-MM-DD)

### Example CSV Structure (Tickertape Format)

```csv
"Fund Name","AMC Name","Category","Sub-Category","Plan Type","Option Type","NAV ₹","Units","Invested Amt ₹","Current Value ₹","Weight %","P&L ₹","P&L %","XIRR %","Invested Since"
"HDFC ELSS Tax saver","HDFC Asset Management Company Limited","Equity","Equity Linked Savings Scheme (ELSS)","Direct","Growth","1543.16","1.26","1998.85","1952.10","0.59","-46.75","-2.34","-8.09","2025-09-17"
```

### Category Mapping

The import automatically maps categories to the application's schema:

- Equity → equity
- Debt → debt
- Hybrid → hybrid
- Index → index
- Others → other

### Sub-Category Mapping

The import intelligently maps sub-categories based on keywords:

- "ELSS" → elss
- "Flexi Cap" → flexi_cap
- "Focused" → focused_fund
- "Contra" → contra_fund
- "Small Cap" → small_cap
- "Mid Cap" → mid_cap
- "Multi Cap" → multi_cap
- "Large & Mid Cap" → large_mid_cap
- "Thematic" → thematic_fund
- "Pharma" → sectoral_pharma
- "Consumption" → sectoral_consumption
- "Bank" → sectoral_banks
- "Conservative Hybrid" → conservative_hybrid

### How to Import

1. Go to the **Mutual Funds** page
2. Click the **Import CSV** button in the header
3. Select your CSV file
4. Wait for the import to complete
5. Review the imported funds

## Stocks Import

### Supported CSV Format

The stocks import feature supports CSV files with these columns:

- **Symbol** (Required) - Stock ticker symbol
- **Name/Company** - Company name
- **Shares/Qty** - Number of shares held
- **Avg Price/Purchase Price** - Average purchase price per share
- **LTP/Current Price** - Current market price
- **Invested/Invest Value** - Total invested amount
- **Current/Cur. val** - Current market value
- **Date** (Optional) - Purchase date

### Example CSV Structure

```csv
"Symbol","Name","Shares","Avg Price","LTP","Invested","Current Value","Date"
"RELIANCE","Reliance Industries","10","2500","2650","25000","26500","2025-01-15"
```

### Default Values

When importing stocks, the following defaults are applied:

- **Stock Type**: large_cap (can be edited later)
- **Sector**: consumer_discretionary (can be edited later)
- **Sub-Sector**: other (can be edited later)

### How to Import

1. Go to the **Stocks** page
2. Click the **Import CSV** button in the header
3. Select your CSV file
4. Wait for the import to complete
5. Review and edit the imported stocks to update sectors/types as needed

## Tips

1. **Backup First**: Before importing, ensure you have a backup of your existing data
2. **Check Format**: Make sure your CSV has the required columns
3. **Clean Data**: Remove any summary rows (like "Total") from your CSV
4. **Edit After Import**: You can always edit individual entries after importing
5. **Multiple Imports**: You can import multiple CSV files - new entries will be added

## Troubleshooting

### Import Failed

- Check that your CSV has the correct header row
- Ensure the CSV is properly formatted with quoted values
- Remove any empty rows or summary rows

### Missing Data

- If some fields are missing after import, you can manually edit each entry
- The import uses intelligent defaults for missing values

### Duplicate Entries

- The import doesn't check for duplicates
- You can manually delete duplicate entries after importing

## Supported Platforms

The CSV import has been tested with exports from:

- **Tickertape** (Mutual Funds & Stocks)
- **Groww** (with minor adjustments)
- **Zerodha Console** (with column mapping)
- **Generic CSV** (with standard columns)

If your platform's CSV format is different, you may need to adjust the column headers to match the expected format.
