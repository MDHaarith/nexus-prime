import path from 'path';

export interface FrontmatterDocument {
  attributes: Record<string, string>;
  body: string;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseFrontmatter(content: string): FrontmatterDocument {
  if (!content.startsWith('---\n')) {
    return {
      attributes: {},
      body: content
    };
  }

  const closing = content.indexOf('\n---\n', 4);
  if (closing === -1) {
    return {
      attributes: {},
      body: content
    };
  }

  const raw = content.slice(4, closing);
  const body = content.slice(closing + 5).trim();
  const attributes: Record<string, string> = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!match) {
      continue;
    }

    attributes[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }

  return { attributes, body };
}

export function parseSimpleToml(content: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
    if (!match) {
      continue;
    }

    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }

  return values;
}

export function relativeCommandId(root: string, filePath: string): { id: string; namespace: 'core' } {
  const relative = path.relative(root, filePath).replace(/\\/g, '/');
  const id = relative.replace(/\.toml$/, '').replace(/\//g, '.');

  return {
    id,
    namespace: 'core'
  };
}
