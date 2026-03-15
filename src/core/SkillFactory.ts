import * as fs from 'fs';
import * as path from 'path';

export class SkillFactory {
  private skillsDir: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.skillsDir = path.join(workspaceRoot, 'skills');
  }

  /**
   * Generates a new specialized skill based on requirements.
   * @param name The name of the skill (e.g., 'custom-deployment')
   * @param requirements The requirements or description of the skill
   */
  public async generateSkill(name: string, requirements: string): Promise<string> {
    const skillDirName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const skillDirPath = path.join(this.skillsDir, skillDirName);

    if (!fs.existsSync(skillDirPath)) {
      fs.mkdirSync(skillDirPath, { recursive: true });
    }

    const skillFilePath = path.join(skillDirPath, 'SKILL.md');

    const content = `---
name: ${skillDirName}
description: ${requirements.trim()}
---

# ${name}

## Intent
${requirements.trim()}

## Workflow
1. Explore existing patterns in the workspace before adding new abstractions.
2. Reuse established Nexus commands, agents, and memory records where possible.
3. Keep instructions concise and move detailed references into a dedicated \`reference/\` folder if this skill grows.

## Deliverables
- Concrete steps or heuristics for the target capability.
- Required tool and validation expectations.
- Integration points for downstream Nexus agents.
`;

    fs.writeFileSync(skillFilePath, content, 'utf-8');
    return skillFilePath;
  }
}
