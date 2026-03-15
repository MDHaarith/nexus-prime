import os
import glob
import yaml
import re
from collections import defaultdict

def parse_frontmatter(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
    if match:
        try:
            metadata = yaml.safe_load(match.group(1))
            body = match.group(2)
            return metadata, body
        except yaml.YAMLError as e:
            return {"error": str(e)}, content
    return None, content

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
            
        metadata, body = parse_frontmatter(filepath)
        if metadata:
            metadata['filepath'] = filepath
            metadata_records.append(metadata)
        else:
            # print(f"No frontmatter found in {filepath}")
            pass

    # 1. Check for duplicates/overlaps
    names = defaultdict(list)
    for record in metadata_records:
        if 'name' in record:
            names[record['name']].append(record['filepath'])
            
    print("=== Duplicates / Overlaps ===")
    for name, paths in names.items():
        if len(paths) > 1:
            print(f"Name: {name}")
            for p in paths:
                print(f"  - {p}")
                
    # 2. Check for metadata inconsistencies
    print("\n=== Metadata Inconsistencies ===")
    required_fields = ['name', 'description', 'color', 'emoji', 'vibe']
    for record in metadata_records:
        missing = [f for f in required_fields if f not in record]
        if missing:
            print(f"File: {record['filepath']} is missing fields: {missing}")
            
    # 3. Check for routing dead zones (e.g., missing from a central registry if one exists)
    # Let's check if there's an index or registry file
    
if __name__ == '__main__':
    analyze_agents()
