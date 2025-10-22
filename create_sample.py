import json

# Load the full file
with open('data/problems.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Take the first 50 problems for your sample
sample = data[:50]

# Write out the sample file
with open('data/problems_sample.json', 'w', encoding='utf-8') as f:
    json.dump(sample, f, indent=2, ensure_ascii=False)

print('Sample data written to data/problems_sample.json')