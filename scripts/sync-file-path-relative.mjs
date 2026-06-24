// file: scripts\sync-file-path-relative.mjs

import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();

const ignoredDirs = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.angular',
  '.vite',
  'coverage'
]);

const ignoredExtensions = new Set([
  '.json',
  '.lock',
  '.log',
  '.map',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot'
]);

const commentStyles = new Map([
  ['.ts', { start: '//', end: '' }],
  ['.tsx', { start: '//', end: '' }],
  ['.js', { start: '//', end: '' }],
  ['.jsx', { start: '//', end: '' }],
  ['.mjs', { start: '//', end: '' }],
  ['.cjs', { start: '//', end: '' }],
  ['.css', { start: '/*', end: ' */' }],
  ['.scss', { start: '/*', end: ' */' }],
  ['.html', { start: '<!--', end: ' -->' }],
  ['.md', { start: '<!--', end: ' -->' }],
  ['.yml', { start: '#', end: '' }],
  ['.yaml', { start: '#', end: '' }],
  ['.env', { start: '#', end: '' }]
]);

function toRepoRelativePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll('/', '\\');
}

function getExtension(filePath) {
  const base = path.basename(filePath);

  if (base.startsWith('.env')) {
    return '.env';
  }

  return path.extname(filePath).toLowerCase();
}

function createHeader(relativePath, style) {
  const suffix = style.end ? style.end : '';
  return `${style.start} file: ${relativePath}${suffix}`;
}

function isFileHeader(line) {
  return /^(\/\/|#|<!--|\/\*)\s*file:\s*.+?(-->| \*\/)?\s*$/.test(line.trim());
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        await walk(fullPath);
      }

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    await syncFileHeader(fullPath);
  }
}

async function syncFileHeader(filePath) {
  const extension = getExtension(filePath);

  if (ignoredExtensions.has(extension)) {
    return;
  }

  const style = commentStyles.get(extension);

  if (!style) {
    return;
  }

  const content = await fs.readFile(filePath, 'utf8');
  const relativePath = toRepoRelativePath(filePath);
  const header = createHeader(relativePath, style);

  const hasBom = content.charCodeAt(0) === 0xfeff;
  const cleanContent = hasBom ? content.slice(1) : content;

  const newline = cleanContent.includes('\r\n') ? '\r\n' : '\n';
  const lines = cleanContent.split(/\r?\n/);

  if (lines.length > 0 && isFileHeader(lines[0])) {
    if (lines[0] === header) {
      return;
    }

    lines[0] = header;
  } else {
    lines.unshift(header, '');
  }

  const updatedContent = `${hasBom ? '\uFEFF' : ''}${lines.join(newline)}`;
  await fs.writeFile(filePath, updatedContent, 'utf8');

  console.log(`Synced: ${relativePath}`);
}

await walk(rootDir);