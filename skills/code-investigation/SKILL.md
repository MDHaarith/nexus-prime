# Code Investigation Skill

## Overview
Agents often waste significant token context reading full files (`cat`, `read_file`) or running loose `grep` searches to understand the structure of a codebase before deciding how to modify it. This skill provides a highly token-efficient method for "thinking" about and investigating code structure.

## The Tool: `ast_mapper.py`
A dedicated Python script is provided to extract a "skeleton" of any given file. 
Location: `/home/mdhaarith/nexus-enterprise/skills/code-investigation/tools/ast_mapper.py`

### What it does:
- **For Python files (`.py`)**: It uses the built-in `ast` module to parse the file and print only class definitions, method signatures (including type hints and arguments), and docstrings. All internal implementation logic is stripped away.
- **For other files**: It falls back to printing the first 50 lines to give you a quick preview without blowing up your context window.

## Instructions for Agents

When you are instructed to modify a file or need to understand its layout **DO NOT read the whole file first.** 

Instead, perform your investigation in this order:

1. **Map the File**:
   Use the `run_shell_command` tool to execute the mapper:
   ```bash
   python3 /home/mdhaarith/nexus-enterprise/skills/code-investigation/tools/ast_mapper.py <path_to_target_file>
   ```

2. **Analyze the Skeleton**:
   Review the output. This compressed view gives you all the structural context you need:
   - What classes exist?
   - What methods exist?
   - What arguments do they take?
   - What do their docstrings say?

3. **Targeted Deep Dive**:
   Once you've identified the exact method or class you need to modify based on the skeleton, use `grep_search` or `read_file` with precise `start_line` and `end_line` parameters to read **only** the relevant implementation details.

By using this skill, you save massive amounts of context tokens, keeping your memory clear and your reasoning sharp for the actual coding tasks.