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
    "or", "as", "that", "are", "be", "has", "have", "it", "its", "will", "would"
])

def load_problems(data_file=None):
    """
    Load problems from specified file or all available platform sources.
    
    Args:
        data_file (str, optional): Specific file path to load. If None, loads all platforms.
    
    Returns:
        list: List of problem dictionaries
    """
    
    # If specific file requested, load it directly
    if data_file:
        if not os.path.exists(data_file):
            raise FileNotFoundError(f"Data file not found: {data_file}")
        with open(data_file, "r", encoding="utf-8") as f:
            problems = json.load(f)
        print(f"✅ Loaded {len(problems)} problems from {data_file}")
        return problems
    
    # Otherwise, load all available platform data
    all_problems = []
    data_sources = [
        "data/problems.json",           # Codeforces full
        "data/leetcode_problems.json",  # LeetCode (future)
    ]
    
    loaded_count = 0
    for source in data_sources:
        if os.path.exists(source):
            try:
                with open(source, "r", encoding="utf-8") as f:
                    problems = json.load(f)
                    all_problems.extend(problems)
                    loaded_count += 1
                    print(f"✅ Loaded {len(problems)} problems from {source}")
            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parsing error in {source}: {e}")
            except Exception as e:
                print(f"⚠️ Error loading {source}: {e}")
    
    # Fallback to sample data if no platform files found
    if loaded_count == 0:
        fallback = "data/problems_sample.json"
        if os.path.exists(fallback):
            with open(fallback, "r", encoding="utf-8") as f:
                all_problems = json.load(f)
            print(f"⚠️ Using fallback: Loaded {len(all_problems)} problems from {fallback}")
        else:
            raise FileNotFoundError("No data files found. Please run scrapers first.")
    
    print(f"📊 Total problems loaded: {len(all_problems)}")
    return all_problems


def normalize(text):
    """
    Normalize text for TF-IDF processing.
    
    Args:
        text (str): Input text
    
    Returns:
        str: Normalized text (lowercase, no punctuation, no stopwords)
    """
    if not text:
        return ""
    
    # Lowercase and remove punctuation
    text = text.lower().translate(str.maketrans('', '', string.punctuation))
    
    # Remove stopwords
    words = [word for word in text.split() if word and word not in STOPWORDS]
    return ' '.join(words)


def build_documents(problems):
    """
    Build search documents from problems by combining title and tags.
    
    Args:
        problems (list): List of problem dictionaries
    
    Returns:
        list: List of normalized document strings
    """
    documents = []
    for prob in problems:
        title = prob.get('title', '')
        tags = prob.get('tags', [])
        
        # Combine title and tags for searchable document
        doc = title + " " + " ".join(tags)
        documents.append(normalize(doc))
    
    return documents


def train_tfidf(documents):
    """
    Train TF-IDF vectorizer on documents.
    
    Args:
        documents (list): List of document strings
    
    Returns:
        tuple: (vectorizer, matrix)
    """
    vectorizer = TfidfVectorizer(
        max_features=5000,        # Limit vocabulary size for efficiency
        ngram_range=(1, 2),       # Use unigrams and bigrams
        min_df=1,                 # Minimum document frequency
        strip_accents='unicode'   # Handle special characters
    )
    matrix = vectorizer.fit_transform(documents)
    return vectorizer, matrix


def save_model(vectorizer, matrix):
    """
    Save trained vectorizer and matrix to disk.
    
    Args:
        vectorizer: Trained TfidfVectorizer
        matrix: TF-IDF matrix
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(vectorizer, VEC_FILE)
    joblib.dump(matrix, MAT_FILE)
    print(f"✅ Model saved to {MODEL_DIR}")


def load_model():
    """
    Load saved vectorizer and matrix from disk.
    
    Returns:
        tuple: (vectorizer, matrix)
    """
    if not os.path.exists(VEC_FILE) or not os.path.exists(MAT_FILE):
        raise FileNotFoundError("Model files not found. Train model first.")
    
    vectorizer = joblib.load(VEC_FILE)
    matrix = joblib.load(MAT_FILE)
    print(f"✅ Model loaded from {MODEL_DIR}")
    return vectorizer, matrix


def find_problems(query, problems,
                  platform=None,
                  difficulty=None,
                  tags=None,
                  top_k=20):
    """
    Search for problems matching query and filters.
    
    Args:
        query (str): Search query
        problems (list): List of problem dictionaries
        platform (str, optional): Filter by platform (e.g., "Codeforces", "LeetCode")
        difficulty (str, optional): Filter by difficulty (e.g., "800", "Easy")
        tags (list, optional): Filter by tags (must match at least one)
        top_k (int): Number of results to return
    
    Returns:
        list: Top matching problems
    """
    if not query or not query.strip():
        return []
    
    if not problems:
        return []
    
    # Train TF-IDF model
    vectorizer, matrix = train_tfidf(build_documents(problems))
    # TODO: For production, use load_model() to avoid retraining on every search
    
    # Transform query to vector
    query_doc = normalize(query)
    if not query_doc:  # Empty after normalization
        return []
    
    query_vec = vectorizer.transform([query_doc])
    
    # Compute cosine similarity
    sims = cosine_similarity(query_vec, matrix).flatten()
    
    # Pair index with similarity score
    scored = [(i, sims[i]) for i in range(len(sims))]
    
    # Apply filters
    filtered = []
    for i, score in scored:
        prob = problems[i]
        
        # Platform filter
        if platform and prob.get("platform", "").lower() != platform.lower():
            continue
        
        # Difficulty filter (exact match)
        if difficulty:
            prob_difficulty = str(prob.get("difficulty", "")).lower()
            if prob_difficulty != difficulty.lower():
                continue
        
        # Tags filter (at least one tag must match)
        if tags:
            prob_tags = [t.lower() for t in prob.get("tags", [])]
            filter_tags = [t.lower() for t in tags]
            if not set(filter_tags).intersection(set(prob_tags)):
                continue
        
        filtered.append((i, score))
    
    # If no filters applied, use all scored results
    if not (platform or difficulty or tags):
        filtered = scored
    
    # Sort by similarity (descending) and take top_k
    top_indices = sorted(filtered, key=lambda x: x[1], reverse=True)[:top_k]
    
    # Return full problem dictionaries
    return [problems[i] for (i, _) in top_indices]


# --- Example usage for testing ---
if __name__ == "__main__":
    print("=" * 60)
    print("Testing Search Logic")
    print("=" * 60)
    
    # Load problems
    problems = load_problems(data_file="data/problems_sample.json")
    
    # Test search
    print("\n🔍 Search Query: 'binary search graph'")
    results = find_problems(
        query="binary search graph",
        problems=problems,
        platform="Codeforces",    # set to None for all platforms
        difficulty=None,          # e.g., "800", "Easy", or None
        tags=None,                # e.g., ["binary search"] or None
        top_k=10
    )
    
    print(f"\n📋 Found {len(results)} results:\n")
    for idx, prob in enumerate(results, 1):
        print(f"{idx}. {prob['title']} [{prob['platform']}] ({prob['difficulty']})")
        print(f"   Tags: {', '.join(prob.get('tags', [])[:5])}")
        print(f"   {prob['url']}\n")
