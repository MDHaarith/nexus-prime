import * as fs from 'fs';
import * as path from 'path';

export class SkillFactory {
  private skillsDir: string;

  constructor(workspaceRoot: string = '/home/mdhaarith/nexus-enterprise') {
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

    const content = `# ${name} Skill

## Overview
This skill was automatically generated to address the following requirements:
${requirements}

## Core Capabilities
- **Custom Capability**: Generated based on requirements.
- **Integration**: Seamlessly integrates with existing workflows.

## Tools & Frameworks
- **Tooling**: To be determined based on specific needs.
- **Frameworks**: Utilizes standard project frameworks.

## Best Practices
- **Standardization**: Follow project conventions.
- **Documentation**: Keep this skill document updated as the skill evolves.

## Troubleshooting
- **General**: Check logs and error messages.
`;

    fs.writeFileSync(skillFilePath, content, 'utf-8');
    return skillFilePath;
  }
}
