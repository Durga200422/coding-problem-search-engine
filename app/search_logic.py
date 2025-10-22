import json
import os
import string
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# --- Constants and Utility ---
DATA_FILE = "data/problems_sample.json"  # Use problems.json for full data
MODEL_DIR = "app/model"
VEC_FILE = os.path.join(MODEL_DIR, "tfidf_vectorizer.joblib")
MAT_FILE = os.path.join(MODEL_DIR, "tfidf_matrix.joblib")

STOPWORDS = set([
    "the", "a", "an", "of", "for", "on", "in", "and", "to", "with", "by", "at", "from", "is", "this", "can",
    "or", "as", "that"
])

def load_problems(data_file=DATA_FILE):
    """Load problems from single file or all available sources"""
    
    # If specific file requested, load it
    if data_file and data_file != DATA_FILE:
        with open(data_file, "r", encoding="utf-8") as f:
            return json.load(f)
    
    # Otherwise, load all available platform data
    all_problems = []
    data_sources = [
        "data/problems.json",           # Codeforces
        "data/leetcode_problems.json",  # LeetCode
        "data/problems_sample.json"     # Sample (if needed)
    ]
    
    loaded_count = 0
    for source in data_sources:
        if os.path.exists(source):
            try:
                with open(source, "r", encoding="utf-8") as f:
                    problems = json.load(f)
                    # Avoid loading sample if full data exists
                    if "sample" in source and os.path.exists("data/problems.json"):
                        continue
                    all_problems.extend(problems)
                    loaded_count += 1
                    print(f"✅ Loaded {len(problems)} problems from {source}")
            except Exception as e:
                print(f"⚠️ Error loading {source}: {e}")
    
    if loaded_count == 0:
        # Fallback to sample
        with open("data/problems_sample.json", "r", encoding="utf-8") as f:
            all_problems = json.load(f)
    
    print(f"📊 Total problems loaded: {len(all_problems)}")
    return all_problems


def normalize(text):
    # Lowercase, remove punctuation, remove stopwords
    text = text.lower().translate(str.maketrans('', '', string.punctuation))
    return ' '.join([word for word in text.split() if word not in STOPWORDS])

def build_documents(problems):
    documents = []
    for prob in problems:
        doc = prob['title'] + " " + " ".join(prob.get("tags", []))
        documents.append(normalize(doc))
    return documents

def train_tfidf(documents):
    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform(documents)
    return vectorizer, matrix

def save_model(vectorizer, matrix):
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(vectorizer, VEC_FILE)
    joblib.dump(matrix, MAT_FILE)

def load_model():
    vectorizer = joblib.load(VEC_FILE)
    matrix = joblib.load(MAT_FILE)
    return vectorizer, matrix

# --- Main Search Function ---
def find_problems(query, problems,
                  platform=None,
                  difficulty=None,
                  tags=None,
                  top_k=20):
    vectorizer, matrix = train_tfidf(build_documents(problems))
    # Optionally: use load_model() after saving once for production
    
    query_doc = normalize(query)
    query_vec = vectorizer.transform([query_doc])
    
    sims = cosine_similarity(query_vec, matrix).flatten()

    # Pair index with similarity
    scored = [(i, sims[i]) for i in range(len(sims))]
    # Filter by platform/difficulty if needed
    filtered = []
    for i, score in scored:
        prob = problems[i]
        if platform and prob.get("platform", "").lower() != platform.lower():
            continue
        if difficulty and str(prob.get("difficulty", "")).lower() != difficulty.lower():
            continue
        if tags and not set(tags).intersection(set(prob.get("tags", []))):
            continue
        filtered.append((i, score))
    # If no filters, use all scored results
    if not (platform or difficulty or tags):
        filtered = scored
    # Keep only top_k by similarity
    top_indices = sorted(filtered, key=lambda x: x[1], reverse=True)[:top_k]
    # Return full problem dicts
    return [problems[i] for (i, _) in top_indices]

# --- Example usage for testing ---
if __name__ == "__main__":
    problems = load_problems()
    results = find_problems(
        query="binary search graph",
        problems=problems,
        platform="Codeforces",    # set to None for all platforms
        difficulty=None,          # e.g., "800", "Easy", or None
        tags=["binary search"],   # or None
        top_k=10
    )
    for prob in results:
        print(f"- {prob['title']} [{prob['platform']}] ({prob['difficulty']})\n  {prob['url']}")
