import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStructuredHandoff } from '../src/runtime/handoff.js';
import type { Task } from '../src/types/index.js';

test('parseStructuredHandoff maps fenced json into Nexus handoff shape', () => {
  const task: Task = {
    id: 'task-1',
    name: 'Validate release',
    agent: 'validation_agent',
    description: 'Validate the release state.',
    status: 'running',
    dependencies: []
  };

  const response = `
Some narrative
\`\`\`json
{
  "status": "success",
  "objective_achieved": "Validated release",
  "files_created": [],
  "files_modified": ["/tmp/README.md"],
  "key_decisions": ["Kept the release gate strict"],
  "blockers": [],
  "downstream_context": {
    "integration_points": ["README.md"],
    "warnings": ["Residual docs drift risk"]
  }
}
\`\`\`
`;

  const handoff = parseStructuredHandoff(response, task);
  assert.ok(handoff);
  assert.equal(handoff?.task_id, 'task-1');
  assert.equal(handoff?.report.objective_achieved, 'Validated release');
  assert.deepEqual(handoff?.report.files_modified, ['/tmp/README.md']);
  assert.deepEqual(handoff?.downstream_context.integration_points, ['README.md']);
});
