---
name: generating-enriched-leads
description: Automates the extraction, email enrichment, and category filtering of local business leads using Apify and custom Python validation scripts. Use when the user wants to scrape local businesses, find emails, or generate clean lead lists.
---

# Generating Enriched Leads

## When to use this skill
- The user asks to scrape or find a list of local businesses (e.g., roofers, plumbers).
- The user wants to find or validate email addresses for a list of companies.
- The user needs to filter out irrelevant businesses from a raw scraped dataset.

## Workflow

- [ ] **1. Scrape Initial Data:** Use the Apify MCP Server (`apify/actors-mcp-server`) with `compass/crawler-google-places` (or execute a direct API call if already configured) to scrape the targeted businesses based on the user's location and keyword.
- [ ] **2. Export to CSV:** Save the raw JSON/CSV data from Apify to the local workspace.
- [ ] **3. Filter Categories:** Run `scripts/cleaner.py <input.csv> <cleaned_output.csv>` to remove generic or irrelevant business categories (like "Rest stop" or "Glazier" when looking for Roofers). 
- [ ] **4. Deep-Crawl & Enrich Emails:** Run `scripts/enrich.py <cleaned_output.csv> <enriched_output.csv>` on the cleaned CSV to visit each business's website and `/contact` page, scrape hidden emails, and validate them via MX records.
- [ ] **5. Validate & Display:** Present the final cleaned and enriched CSV file to the user.
- [ ] **6. Push to Gravity Claw DB:** Iterate through the final entries and insert them into your Supabase `leads` table (`business_name`, `url`, `niche`, `email`, `status: 'scraped'`) using either the Supabase MCP or Node scripts.

## Instructions

- Ensure `requests` and `beautifulsoup4` are installed (`pip install requests beautifulsoup4`) before running the Python scripts.
- When calling the Apify API, ensure the required fields are selected (title, emails, phone, website, address, totalScore, facebooks, categoryName).
- For strict adherence to budgets, check with the user on the maximum number of results to pull or the maximum amount to spend.
- **Error Handling**: If a script fails due to a missing CSV column, verify the Apify output format. 

## Resources
- `scripts/enrich.py`: Extracts and validates emails from URLs.
- `scripts/cleaner.py`: Removes irrelevant businesses based on Apify `categoryName` and keywords.
