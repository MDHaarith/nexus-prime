import os
import glob
import yaml
import re
import hashlib
from collections import defaultdict

def parse_frontmatter(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
    if match:
        try:
            metadata = yaml.safe_load(match.group(1))
            body = match.group(2)
            return metadata, body, content
        except yaml.YAMLError as e:
            return {"error": str(e)}, content, content
    return None, content, content

def get_hash(content):
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def analyze_agents():
    agency_agents_dir = '/home/mdhaarith/Desktop/nexus-prime_v5.0.0/agency-agents'
    agents_dir = '/home/mdhaarith/Desktop/nexus-prime_v5.0.0/agents'
    
    agency_files = glob.glob(f'{agency_agents_dir}/**/*.md', recursive=True)
    agent_files = glob.glob(f'{agents_dir}/**/*.md', recursive=True)
    
    all_files = agency_files + agent_files
    
    metadata_records = []
    
    for filepath in all_files:
        if 'README' in filepath or 'CONTRIBUTING' in filepath or 'PULL_REQUEST' in filepath or 'QUICKSTART' in filepath or 'EXECUTIVE-BRIEF' in filepath or 'runbooks' in filepath or 'playbooks' in filepath or 'coordination' in filepath or 'examples' in filepath or 'integrations' in filepath:
            continue
            
        metadata, body, content = parse_frontmatter(filepath)
        if metadata:
            metadata['filepath'] = filepath
            metadata['content_hash'] = get_hash(content)
            metadata['body_hash'] = get_hash(body)
            metadata_records.append(metadata)

    names = defaultdict(list)
    for record in metadata_records:
        if 'name' in record:
            names[record['name']].append(record)
            
    print("=== Duplicates Analysis ===")
    exact_duplicates = 0
    body_duplicates = 0
    different = 0
    
    for name, records in names.items():
        if len(records) > 1:
            hashes = set(r['content_hash'] for r in records)
            body_hashes = set(r['body_hash'] for r in records)
            if len(hashes) == 1:
                exact_duplicates += 1
            elif len(body_hashes) == 1:
                body_duplicates += 1
            else:
                different += 1
                print(f"Different content for {name}:")
                for r in records:
                    print(f"  - {r['filepath']}")
                    
    print(f"Exact duplicates: {exact_duplicates}")
    print(f"Body duplicates (different metadata): {body_duplicates}")
    print(f"Different content: {different}")

if __name__ == '__main__':
    analyze_agents()
