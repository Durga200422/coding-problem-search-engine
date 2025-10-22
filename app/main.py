from flask import Flask, request, jsonify, render_template
from search_logic import load_problems, find_problems
import os
import json

app = Flask(__name__)

# --- Load problems from all sources ---
def load_all_problems():
    all_problems = []
    
    # Load Codeforces
    if os.path.exists("data/problems.json"):
        all_problems.extend(load_problems("data/problems.json"))
    
    # Load LeetCode (if exists)
    if os.path.exists("data/leetcode_problems.json"):
        all_problems.extend(load_problems("data/leetcode_problems.json"))
    
    # Load CodeChef (if exists)
    if os.path.exists("data/codechef_problems.json"):
        all_problems.extend(load_problems("data/codechef_problems.json"))
    
    print(f"Loaded {len(all_problems)} problems from all platforms")
    return all_problems

problems = load_all_problems()

# Rest of your Flask code remains the same...


print("🔄 Loading problem data from all platforms...")
problems = load_problems()
print(f"✅ Ready to search {len(problems)} problems!")

# --- Home Route (Serves your HTML page later) ---
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/tags", methods=["GET"])
def api_tags():
    """Get all unique tags with counts"""
    tag_counts = {}
    for prob in problems:
        for tag in prob.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    # Sort by frequency
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    return jsonify({"tags": [{"name": tag, "count": count} for tag, count in sorted_tags[:50]]})

# --- API: Search Problem Endpoint ---
@app.route("/api/search", methods=["GET"])
def api_search():
    # Get query parameters
    query = request.args.get("q", "").strip()
    platform = request.args.get("platform", None)
    difficulty = request.args.get("difficulty", None)
    tags = request.args.getlist("tags")  # expects: tags[]=tag1&tags[]=tag2

    # Input validation
    if not query:
        return jsonify({"error": "Query string is required.", "results": []}), 400

    # Run search
    results = find_problems(
        query=query,
        problems=problems,
        platform=platform,
        difficulty=difficulty,
        tags=tags if tags else None,
        top_k=20,
    )

    # Format results for frontend
    formatted = [
        {
            "title": prob["title"],
            "platform": prob["platform"],
            "url": prob["url"],
            "difficulty": prob["difficulty"],
            "tags": prob.get("tags", [])
        }
        for prob in results
    ]
    return jsonify({"query": query, "results": formatted})

# --- Start the Flask App ---
if __name__ == "__main__":
    app.run(debug=True)
