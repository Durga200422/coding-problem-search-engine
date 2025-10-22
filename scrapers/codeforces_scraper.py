import requests
import json
import os

# --- Constants ---
DATA_DIR = "data"
OUTPUT_FILE = os.path.join(DATA_DIR, "problems.json")
API_URL = "https://codeforces.com/api/problemset.problems"

def fetch_codeforces_problems():
    print("Fetching problems from Codeforces API...")
    response = requests.get(API_URL)
    data = response.json()

    if data["status"] != "OK":
        print("Error: API response status is not OK")
        return

    problems = data["result"]["problems"]

    extracted = []
    for prob in problems:
        problem_data = {
            "platform": "Codeforces",
            "title": f"{prob.get('contestId', '')}{prob.get('index', '')}. {prob['name']}",
            "url": f"https://codeforces.com/problemset/problem/{prob.get('contestId', '')}/{prob.get('index', '')}",
            "difficulty": prob.get("rating", "N/A"),
            "tags": prob.get("tags", [])
        }
        extracted.append(problem_data)

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(extracted, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(extracted)} problems to {OUTPUT_FILE}")

if __name__ == "__main__":
    fetch_codeforces_problems()
