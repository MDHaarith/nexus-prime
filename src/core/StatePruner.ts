import * as fs from 'fs';
import * as path from 'path';

export class StatePruner {
  private stateDir: string;
  private archiveDir: string;
  private maxSizeInBytes: number;

  constructor(
    workspaceRoot: string = process.cwd(),
    maxSizeInBytes: number = 1024 * 512 // 512KB default
  ) {
    this.stateDir = path.join(workspaceRoot, '.nexus', 'state');
    this.archiveDir = path.join(this.stateDir, 'archive');
    this.maxSizeInBytes = maxSizeInBytes;

    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }

  /**
   * Prunes files in the state directory that exceed the maximum size.
   * Archiving them to the archive directory.
   */
  public prune(): void {
    if (!fs.existsSync(this.stateDir)) return;

    const files = fs.readdirSync(this.stateDir);

    for (const file of files) {
      const filePath = path.join(this.stateDir, file);
      
      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;

      const stats = fs.statSync(filePath);
      if (stats.size > this.maxSizeInBytes) {
        this.archiveFile(filePath, file);
      }
    }
  }

  private archiveFile(filePath: string, fileName: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const archiveFileName = `${baseName}-${timestamp}${ext}`;
    const archiveFilePath = path.join(this.archiveDir, archiveFileName);

    // Move the file to archive
    fs.renameSync(filePath, archiveFilePath);
  }
}
