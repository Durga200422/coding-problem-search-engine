import requests
import json
import os

DATA_DIR = "data"
OUTPUT_FILE = os.path.join(DATA_DIR, "leetcode_problems.json")

def fetch_leetcode_problems():
    """
    Fetch LeetCode problems using their GraphQL API
    """
    print("Fetching problems from LeetCode API...")
    
    url = "https://leetcode.com/graphql"
    
    query = """
    query problemsetQuestionList {
        problemsetQuestionList: questionList(
            categorySlug: ""
            limit: -1
            skip: 0
            filters: {}
        ) {
            questions: data {
                questionId
                title
                titleSlug
                difficulty
                topicTags {
                    name
                }
            }
        }
    }
    """
    
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    }
    
    try:
        response = requests.post(url, json={"query": query}, headers=headers)
        data = response.json()
        
        questions = data["data"]["problemsetQuestionList"]["questions"]
        
        extracted = []
        for q in questions:
            problem_data = {
                "platform": "LeetCode",
                "title": f"{q['questionId']}. {q['title']}",
                "url": f"https://leetcode.com/problems/{q['titleSlug']}/",
                "difficulty": q['difficulty'],
                "tags": [tag['name'] for tag in q.get('topicTags', [])]
            }
            extracted.append(problem_data)
        
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(extracted, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Successfully saved {len(extracted)} LeetCode problems to {OUTPUT_FILE}")
        return True
        
    except Exception as e:
        print(f"❌ Error fetching LeetCode data: {e}")
        return False

if __name__ == "__main__":
    fetch_leetcode_problems()
