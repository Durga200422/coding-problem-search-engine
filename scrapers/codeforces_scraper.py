import requests
from bs4 import BeautifulSoup
import json
import time
import os

# --- Constants ---
BASE_URL = "https://codeforces.com/problemset"
DATA_DIR = "data"
OUTPUT_FILE = os.path.join(DATA_DIR, "problems.json")
MAX_PAGES = 5
# Using the same robust headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://codeforces.com/'
}

def scrape_codeforces():
    """
    Scrapes problem data from the Codeforces problemset.
    
    --- UPDATE ---
    We are now using a `requests.Session` object. This object will
    persist cookies across requests, which makes our scraper look
    even more like a real human browser.
    """
    print(f"Starting scraper for Codeforces... Will scrape {MAX_PAGES} pages.")
    
    # --- Create a Session object ---
    # This session will manage our headers and cookies for all requests.
    session = requests.Session()
    session.headers.update(HEADERS)
    
    all_problems = []
    
    # --- First, make a "warmup" request to the main problemset page ---
    # This allows the session to receive any initial cookies.
    try:
        print("Warming up session by visiting the main problemset page...")
        # Use a timeout to prevent it from hanging indefinitely
        session.get(BASE_URL, timeout=10) 
        print("Session is warm.")
    except requests.exceptions.RequestException as e:
        print(f"Error during warmup: {e}. Trying to continue anyway...")
        
    # Give it a second
    time.sleep(1) 

    for page_num in range(1, MAX_PAGES + 1):
        page_url = f"{BASE_URL}/page/{page_num}"
        print(f"Scraping page {page_num}: {page_url}")
        
        try:
            # --- Make the HTTP Request using the session ---
            response = session.get(page_url, timeout=10) # 10-second timeout
            
            # This will raise an error if we get a 403, 404, 500, etc.
            response.raise_for_status()
            
            # --- Parse the HTML ---
            soup = BeautifulSoup(response.content, 'html.parser')
            
            problem_table = soup.find('table', class_='datatable')
            
            if not problem_table:
                print(f"Could not find problem table on page {page_num}. Skipping.")
                continue
                
            problem_rows = problem_table.find_all('tr')[1:] 
            
            if not problem_rows:
                print(f"No problems found on page {page_num}.")
                continue

            # --- Extract Data from Each Row ---
            for row in problem_rows:
                cells = row.find_all('td')
                
                if len(cells) < 4:
                    continue
                
                try:
                    # Cell 1: Problem Title and URL
                    title_cell = cells[1]
                    title_link = title_cell.find('a')
                    title = title_link.text.strip()
                    url = "https://codeforces.com" + title_link['href']
                    
                    # Cell 1: Problem Tags
                    tags_div = title_cell.find('div', style="margin-top:0.5em;")
                    tags = [a.text.strip() for a in tags_div.find_all('a')] if tags_div else []
                    
                    # Cell 3: Problem Difficulty
                    difficulty_cell = cells[3]
                    difficulty_span = difficulty_cell.find('span')
                    difficulty = int(difficulty_span.text.strip()) if difficulty_span else None
                    
                    # --- Structure the Data ---
                    problem_data = {
                        "platform": "Codeforces",
                        "title": title,
                        "url": url,
                        "difficulty": difficulty,
                        "tags": tags
                    }
                    
                    all_problems.append(problem_data)
                    
                except Exception as e:
                    print(f"Error parsing a row: {e}")
            
            # --- Be a Good Web Citizen ---
            print(f"Finished page {page_num}. Waiting 2 seconds...")
            # Increased wait time slightly, just in case
            time.sleep(2) 
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching page {page_url}: {e}")
            # If one page fails, stop trying and report the error.
            print("Stopping scraper due to request error.")
            break
            
    # --- Save the Data ---
    print(f"\nScraping complete. Total problems found: {len(all_problems)}")
    
    os.makedirs(DATA_DIR, exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_problems, f, indent=2, ensure_ascii=False)
        
    print(f"Data successfully saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    scrape_codeforces()