from flask import Flask, request, jsonify, render_template
from app.search_logic import load_problems, find_problems
import os
import logging
import random
from functools import lru_cache


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


app = Flask(__name__)


# Motivational Quotes
MOTIVATIONAL_QUOTES = [
    {"text": "The expert in anything was once a beginner.", "author": "Helen Hayes"},
    {"text": "Code is like humor. When you have to explain it, it's bad.", "author": "Cory House"},
    {"text": "First, solve the problem. Then, write the code.", "author": "John Johnson"},
    {"text": "Learning to code is learning to create and innovate.", "author": "Codecademy"},
    {"text": "Every expert was once a beginner. Never give up!", "author": "Anonymous"},
    {"text": "The only way to learn a new programming language is by writing programs in it.", "author": "Dennis Ritchie"},
    {"text": "Success is not final, failure is not fatal: it is the courage to continue that counts.", "author": "Winston Churchill"},
    {"text": "Believe you can and you're halfway there.", "author": "Theodore Roosevelt"},
    {"text": "Practice makes progress, not perfection.", "author": "Anonymous"},
    {"text": "Debug your code, debug your life.", "author": "Anonymous"},
    {"text": "The best way to predict the future is to implement it.", "author": "David Heinemeier Hansson"},
    {"text": "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", "author": "Martin Fowler"},
    {"text": "Programming isn't about what you know; it's about what you can figure out.", "author": "Chris Pine"},
    {"text": "The only limit to our realization of tomorrow is our doubts of today.", "author": "Franklin D. Roosevelt"},
    {"text": "Don't watch the clock; do what it does. Keep going.", "author": "Sam Levenson"}
]


# Security headers
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response


# --- Load problems from all sources ---
def load_all_problems():
    """Load problems from all available JSON files."""
    all_problems = []
    
    data_files = {
        "Codeforces": "data/codeforces_problems.json",
        "LeetCode": "data/leetcode_problems.json",
        "CodeChef": "data/codechef_problems.json"
    }
    
    for platform, filepath in data_files.items():
        if os.path.exists(filepath):
            try:
                platform_problems = load_problems(filepath)
                all_problems.extend(platform_problems)
                logger.info(f"✅ Loaded {len(platform_problems)} problems from {platform}")
            except Exception as e:
                logger.error(f"❌ Failed to load {platform} data: {e}")
        else:
            logger.warning(f"⚠️  {platform} data file not found: {filepath}")
    
    if not all_problems:
        logger.error("❌ No problem data loaded! Check your data files.")
    else:
        logger.info(f"✅ Total problems loaded: {len(all_problems)}")
    
    return all_problems


# Load problems at startup
logger.info("🔄 Loading problem data from all platforms...")
problems = load_all_problems()


if not problems:
    logger.warning("⚠️  Running with empty dataset. Add data files to /data directory.")


# --- Home Route ---
@app.route("/")
def home():
    """Serve the main HTML page with a motivational quote."""
    daily_quote = random.choice(MOTIVATIONAL_QUOTES)
    return render_template("index.html", quote=daily_quote)


# --- API: Get Tags ---
@app.route("/api/tags", methods=["GET"])
def api_tags():
    """Get all unique tags with their counts."""
    try:
        tag_counts = {}
        
        for prob in problems:
            for tag in prob.get("tags", []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        # Sort by frequency (descending)
        sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Return top 50 tags
        tag_list = [{"name": tag, "count": count} for tag, count in sorted_tags[:50]]
        
        return jsonify({"tags": tag_list})
    
    except Exception as e:
        logger.error(f"Error in /api/tags: {e}")
        return jsonify({"error": "Failed to fetch tags", "tags": []}), 500


# --- API: Search Problems ---
@app.route("/api/search", methods=["GET"])
def api_search():
    """Search problems with filters."""
    try:
        # Get query parameters
        query = request.args.get("q", "").strip()
        platform = request.args.get("platform", None)
        difficulty = request.args.get("difficulty", None)
        tags = request.args.getlist("tags")
        
        # Input validation
        if not query:
            return jsonify({
                "error": "Query string is required.", 
                "results": []
            }), 400
        
        # Validate query length
        if len(query) > 200:
            return jsonify({
                "error": "Query too long. Maximum 200 characters.", 
                "results": []
            }), 400
        
        # Check if problems are loaded
        if not problems:
            return jsonify({
                "error": "No problem data available. Please contact administrator.",
                "results": []
            }), 503
        
        # Run search
        results = find_problems(
            query=query,
            problems=problems,
            platform=platform if platform else None,
            difficulty=difficulty if difficulty else None,
            tags=tags if tags else None,
            top_k=50,  # Return more results for better pagination
        )
        
        # Format results for frontend
        formatted = [
            {
                "title": prob["title"],
                "platform": prob["platform"],
                "url": prob["url"],
                "difficulty": prob.get("difficulty", "N/A"),
                "tags": prob.get("tags", [])
            }
            for prob in results
        ]
        
        logger.info(f"Search: '{query}' | Platform: {platform} | Difficulty: {difficulty} | Results: {len(formatted)}")
        
        return jsonify({
            "query": query,
            "results": formatted,
            "count": len(formatted)
        })
    
    except ValueError as e:
        logger.error(f"Validation error in /api/search: {e}")
        return jsonify({"error": str(e), "results": []}), 400
    
    except Exception as e:
        logger.error(f"Error in /api/search: {e}")
        return jsonify({
            "error": "An error occurred while searching. Please try again.",
            "results": []
        }), 500


# --- API: Get Random Quote ---
@app.route("/api/quote", methods=["GET"])
def api_quote():
    """Get a random motivational quote."""
    try:
        quote = random.choice(MOTIVATIONAL_QUOTES)
        return jsonify(quote)
    except Exception as e:
        logger.error(f"Error in /api/quote: {e}")
        return jsonify({
            "text": "Keep coding, keep learning!",
            "author": "Anonymous"
        }), 500


# --- API: Health Check ---
@app.route("/api/health", methods=["GET"])
def api_health():
    """Health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "problems_loaded": len(problems),
        "version": "1.0.0"
    })


# --- Error Handlers ---
@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    if request.path.startswith('/api/'):
        return jsonify({"error": "Endpoint not found"}), 404
    return render_template("index.html")  # Serve SPA for all non-API routes


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors."""
    logger.error(f"Internal server error: {e}")
    return jsonify({"error": "Internal server error"}), 500


# --- Start the Flask App ---
if __name__ == "__main__":
    # Check if running in production
    is_production = os.environ.get('FLASK_ENV') == 'production'
    
    if is_production:
        logger.info("🚀 Starting Flask app in PRODUCTION mode")
        app.run(host='0.0.0.0', port=5000, debug=False)
    else:
        logger.info("🔧 Starting Flask app in DEVELOPMENT mode")
        app.run(debug=True)
