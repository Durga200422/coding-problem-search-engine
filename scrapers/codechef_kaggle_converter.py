import pandas as pd
import json

def convert_kaggle_to_json():
    """
    Converts Kaggle CodeChef CSV to your project's JSON format.
    """
    print("Converting CodeChef Kaggle dataset to JSON...")
    
    # Read the CSV
    df = pd.read_csv('data/questions.csv')
    
    problems = []
    
    for _, row in df.iterrows():
        problem = {
            'title': row['Title'] if pd.notna(row['Title']) else 'Untitled',
            'platform': 'CodeChef',
            'url': f"https://www.codechef.com{row['link']}" if pd.notna(row['link']) else '',
            'difficulty': row['level'].capitalize() if pd.notna(row['level']) else 'N/A',
            'tags': []  # Tags not included in this dataset
        }
        problems.append(problem)
    
    # Save as JSON
    with open('data/codechef_problems.json', 'w', encoding='utf-8') as f:
        json.dump(problems, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Successfully converted {len(problems)} CodeChef problems to JSON!")

if __name__ == "__main__":
    convert_kaggle_to_json()
