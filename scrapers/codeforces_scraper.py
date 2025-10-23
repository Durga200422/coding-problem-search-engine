import requests
import json
import time

def fetch_codeforces_problems(max_retries=3):
    """
    Fetches all problems from Codeforces API with retry logic.
    Returns a list of problem dictionaries.
    """
    url = "https://codeforces.com/api/problemset.problems"
    
    print("Fetching problems from Codeforces API...")
    
    for attempt in range(max_retries):
        try:
            print(f"Attempt {attempt + 1}/{max_retries}...")
            response = requests.get(url, timeout=30)  # Increased timeout to 30 seconds
            response.raise_for_status()
            data = response.json()
            
            if data['status'] != 'OK':
                print(f"Error: {data.get('comment', 'Unknown error')}")
                return []
            
            problems = []
            for problem in data['result']['problems']:
                problem_data = {
                    'title': problem.get('name', 'Untitled'),
                    'platform': 'Codeforces',
                    'url': f"https://codeforces.com/problemset/problem/{problem['contestId']}/{problem['index']}",
                    'difficulty': problem.get('rating', 'N/A'),
                    'tags': problem.get('tags', [])
                }
                problems.append(problem_data)
            
            print(f"✅ Successfully fetched {len(problems)} problems.")
            return problems
            
        except requests.exceptions.Timeout:
            print(f"⏱️ Request timed out. Retrying in 5 seconds...")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                print("❌ Max retries reached. Failed to fetch data.")
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching data: {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                return []

def save_to_json(problems, filename="data/codeforces_problems.json"):
    """Save problems to JSON file."""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(problems, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved {len(problems)} problems to {filename}")

if __name__ == "__main__":
    problems = fetch_codeforces_problems()
    if problems:
        save_to_json(problems)
    else:
        print("\n⚠️ No problems were scraped.")
        print("💡 Alternative: Use existing Codeforces data if available.")
