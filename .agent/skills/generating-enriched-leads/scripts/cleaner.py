import csv
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')

def main():
    if len(sys.argv) < 3:
        logging.error("Usage: python cleaner.py <input_csv> <output_csv> [target_niche]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    # Generic bad categories to strip out
    bad_categories = {
        "rest stop", "glazier", "pressure washing service", 
        "asbestos testing service", "landscaper", "architect", "manufacturer", 
        "restaurant", "fast food", "hotel", "supermarket", "grocery store",
        "car wash", "gas station", "parking", "pet store"
    }
    
    # Generic bad keywords
    bad_keywords = ["cleaning", "plumbing", "electrical", "pest control"]

    cleaned_rows = []
    dropped_count = 0
    
    try:
        with open(input_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            
            # Ensure Category column exists
            has_cat_col = False
            for col in fieldnames:
                if "category" in col.lower():
                    has_cat_col = col
                    break
                    
            if not has_cat_col:
                fieldnames.append("Category")
                has_cat_col = "Category"

            for row in reader:
                title = row.get("title", "")
                if not title:
                    # Fallback title extraction
                    for k in row.keys():
                        if k and "title" in str(k).lower():
                            title = row.get(k, "")
                            break

                title = str(title).strip().lower()
                cat = str(row.get(has_cat_col, "Unknown")).strip().lower()
                
                # Check for bad categories
                if any(bad in cat for bad in bad_categories):
                    dropped_count += 1
                    continue
                    
                # Check for bad keywords in the title
                if any(bad_kw in title for bad_kw in bad_keywords):
                    dropped_count += 1
                    continue
                    
                cleaned_rows.append(row)
                
    except Exception as e:
        logging.error(f"Failed to process CSV: {e}")
        return

    try:
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            if not cleaned_rows:
                logging.warning("No rows survived cleaning!")
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                return

            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(cleaned_rows)
            
        logging.info(f"Successfully cleaned the list! Dropped {dropped_count} irrelevant businesses.")
        logging.info(f"Retained {len(cleaned_rows)} highly-relevant target companies.")
        
    except Exception as e:
        logging.error(f"Failed to write CSV: {e}")

if __name__ == "__main__":
    main()
