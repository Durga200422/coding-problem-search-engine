import json

def merge_all_problems():
    """
    Merges Codeforces, LeetCode, and CodeChef problems into one unified dataset.
    """
    print("Merging all problem datasets...")
    
    all_problems = []
    
    # Load Codeforces (from separate file)
    try:
        with open('data/codeforces_problems.json', 'r', encoding='utf-8') as f:
            cf = json.load(f)
        print(f"✅ Loaded {len(cf)} Codeforces problems")
        all_problems.extend(cf)
    except FileNotFoundError:
        print("⚠️ Codeforces problems not found, skipping...")
        cf = []
    
    # Load LeetCode
    try:
        with open('data/leetcode_problems.json', 'r', encoding='utf-8') as f:
            lc = json.load(f)
        print(f"✅ Loaded {len(lc)} LeetCode problems")
        all_problems.extend(lc)
    except FileNotFoundError:
        print("⚠️ LeetCode problems not found, skipping...")
        lc = []
    
    # Load CodeChef
    try:
        with open('data/codechef_problems.json', 'r', encoding='utf-8') as f:
            cc = json.load(f)
        print(f"✅ Loaded {len(cc)} CodeChef problems")
        all_problems.extend(cc)
    except FileNotFoundError:
        print("⚠️ CodeChef problems not found, skipping...")
        cc = []
    
    # Save unified dataset to problems.json
    with open('data/problems.json', 'w', encoding='utf-8') as f:
        json.dump(all_problems, f, indent=2, ensure_ascii=False)
    
    print(f"\n🎉 Total problems merged: {len(all_problems)}")
    print(f"   - Codeforces: {len(cf)}")
    print(f"   - LeetCode: {len(lc)}")
    print(f"   - CodeChef: {len(cc)}")
    print(f"\n✅ Saved to data/problems.json")

if __name__ == "__main__":
    merge_all_problems()
