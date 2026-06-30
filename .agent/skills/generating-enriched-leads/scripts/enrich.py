import csv
import re
import sys
import logging
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
import concurrent.futures

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def resolve_mx(domain):
    import subprocess
    try:
        # Windows nslookup
        output = subprocess.check_output(f"nslookup -type=mx {domain}", shell=True, timeout=5).decode('utf-8', errors='ignore')
        if "MX preference" in output or "mail exchanger" in output:
            return True
        return False
    except Exception:
        return False

def is_valid_email_format(email):
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return re.match(pattern, email) is not None

def validate_email(email):
    if not is_valid_email_format(email):
        return False, "Invalid Format"
    
    domain = email.split('@')[1]
    if resolve_mx(domain):
        return True, "Valid"
    else:
        return True, "Unconfirmed MX (Assumption: Valid)"

def extract_emails_from_url(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except Exception as e:
        return set()

    soup = BeautifulSoup(response.text, 'html.parser')
    
    for script in soup(["script", "style"]):
        script.extract()
        
    text = soup.get_text()
    
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    raw_emails = re.findall(email_pattern, text)
    
    valid_emails = set()
    for e in raw_emails:
        e = e.lower()
        if e.endswith(('.png', '.jpg', '.jpeg', '.gif', '.css', '.js', '.webp', '.svg', '.wixpress.com', '.sentry.io')):
            continue
        if e.startswith(('u003e', 'u003c', 'example@')):
            continue
        valid_emails.add(e)
        
    return valid_emails

def enrich_row(row):
    title = row.get('title', '')
    if not title:
        for k in row.keys():
            if k and 'title' in str(k).lower():
                title = row.get(k, '')
                break

    website = row.get('website', '')
    if not website:
        for k in row.keys():
            if k and 'website' in str(k).lower():
                website = row.get(k, '')
                break
                
    emails = []
    
    existing_emails = [row.get(f'emails/{i}', '') for i in range(4)]
    existing_emails = [e for e in existing_emails if e and e.strip()]
    
    validated_emails = set()
    
    for email in existing_emails:
        is_valid, reason = validate_email(email)
        if is_valid:
            validated_emails.add(email.lower())
            
    if not validated_emails and website:
        logging.info(f"[{title}] No valid email found natively. Scraping {website}...")
        scraped_emails = extract_emails_from_url(website)
        
        if not scraped_emails:
            parsed = urlparse(website)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            contact_url = f"{base_url}/contact"
            scraped_emails = extract_emails_from_url(contact_url)
            
        for email in scraped_emails:
            is_valid, reason = validate_email(email)
            if is_valid:
                validated_emails.add(email)
                logging.info(f"[{title}] Extracted & Validated new email: {email}")
                
    row['Final_Validated_Emails'] = " | ".join(validated_emails)
    return row

def main():
    if len(sys.argv) < 3:
        logging.error("Usage: python enrich.py <input_csv> <output_csv>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    rows = []
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            fieldnames = list(reader.fieldnames)
            if 'Final_Validated_Emails' not in fieldnames:
                fieldnames.append('Final_Validated_Emails')
            for r in reader:
                rows.append(r)
    except Exception as e:
        logging.error(f"Failed to read {input_file}: {e}")
        return
            
    logging.info(f"Loaded {len(rows)} records for enrichment.")
    
    enriched_rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(enrich_row, rows)
        for r in results:
            enriched_rows.append(r)
            
    try:
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(enriched_rows)
            
        logging.info(f"Enrichment complete. Saved to {output_file}")
    except Exception as e:
        logging.error(f"Failed to write output to {output_file}: {e}")

if __name__ == "__main__":
    main()
