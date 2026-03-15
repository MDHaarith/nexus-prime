import os
import glob
import yaml
import re
from collections import defaultdict
from difflib import SequenceMatcher

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def parse_frontmatter(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
    if match:
        try:
            metadata = yaml.safe_load(match.group(1))
            return metadata
        except yaml.YAMLError as e:
            # Try to fix the unquoted colon issue for zk-steward
            fixed_yaml = match.group(1).replace("description: Knowledge-base steward in the spirit of Niklas Luhmann's Zettelkasten. Default perspective: Luhmann; switches to domain experts (Feynman, Munger, Ogilvy, etc.) by task. Enforces atomic notes, connectivity, and validation loops. Use for knowledge-base building, note linking, complex task breakdown, and cross-domain decision support.",
                                                "description: \"Knowledge-base steward in the spirit of Niklas Luhmann's Zettelkasten. Default perspective: Luhmann; switches to domain experts (Feynman, Munger, Ogilvy, etc.) by task. Enforces atomic notes, connectivity, and validation loops. Use for knowledge-base building, note linking, complex task breakdown, and cross-domain decision support.\"")
            try:
                return yaml.safe_load(fixed_yaml)
            except:
                return None
    return None

def analyze_overlaps():
    agents_dir = '/home/mdhaarith/Desktop/nexus-prime_v5.0.0/agents/specialists'
    agent_files = glob.glob(f'{agents_dir}/**/*.md', recursive=True)
    
    records = []
    for filepath in agent_files:
        if 'README' in filepath: continue
        meta = parse_frontmatter(filepath)
        if meta and 'name' in meta and 'description' in meta:
            meta['filepath'] = filepath
            records.append(meta)
            
    print("=== Capability Overlaps (Similarity > 0.8) ===")
    for i in range(len(records)):
        for j in range(i+1, len(records)):
            name_sim = similar(records[i]['name'].lower(), records[j]['name'].lower())
            desc_sim = similar(records[i]['description'].lower(), records[j]['description'].lower())
            
            if name_sim > 0.8 or desc_sim > 0.8:
                print(f"\nOverlap detected between:")
                print(f"1. {records[i]['name']} ({records[i]['filepath']})")
                print(f"2. {records[j]['name']} ({records[j]['filepath']})")
                print(f"Name similarity: {name_sim:.2f}, Desc similarity: {desc_sim:.2f}")

if __name__ == '__main__':
    analyze_overlaps()
