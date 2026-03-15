import os
import glob

def find_dead_zones():
    agency_agents_dir = '/home/mdhaarith/Desktop/nexus-prime_v5.0.0/agency-agents'
    agents_dir = '/home/mdhaarith/Desktop/nexus-prime_v5.0.0/agents/specialists'
    
    agency_files = glob.glob(f'{agency_agents_dir}/**/*.md', recursive=True)
    
    missing_in_specialists = []
    
    for filepath in agency_files:
        if 'README' in filepath or 'CONTRIBUTING' in filepath or 'PULL_REQUEST' in filepath or 'QUICKSTART' in filepath or 'EXECUTIVE-BRIEF' in filepath or 'runbooks' in filepath or 'playbooks' in filepath or 'coordination' in filepath or 'examples' in filepath or 'integrations' in filepath:
            continue
            
        basename = os.path.basename(filepath)
        expected_specialist_name = f"nexus-{basename}"
        expected_specialist_path = os.path.join(agents_dir, expected_specialist_name)
        
        if not os.path.exists(expected_specialist_path):
            missing_in_specialists.append(filepath)
            
    print("=== Routing Dead Zones (In agency-agents but not in agents/specialists) ===")
    for p in missing_in_specialists:
        print(p)

if __name__ == '__main__':
    find_dead_zones()
