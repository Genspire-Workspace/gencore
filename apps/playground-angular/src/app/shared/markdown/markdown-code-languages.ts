// file: apps/playground-angular/src/app/shared/markdown/markdown-code-languages.ts

export type MarkdownCodeThemeMode = 'light' | 'dark';

export const MARKDOWN_CODE_THEME_PAIRS = {
  github: {
    light: 'github-light',
    dark: 'github-dark',
  },
  vitesse: {
    light: 'vitesse-light',
    dark: 'vitesse-dark',
  },
  material: {
    light: 'material-theme-lighter',
    dark: 'material-theme-darker',
  },
} as const;

export type MarkdownCodeThemePairName = keyof typeof MARKDOWN_CODE_THEME_PAIRS;

export const MARKDOWN_ACTIVE_CODE_THEME_PAIR: MarkdownCodeThemePairName = 'github';

export const MARKDOWN_CODE_THEMES = MARKDOWN_CODE_THEME_PAIRS[MARKDOWN_ACTIVE_CODE_THEME_PAIR];

export const MARKDOWN_CODE_LANGUAGES = [
  'text',
  'markdown',
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'json',
  'jsonc',
  'html',
  'css',
  'scss',
  'less',
  'bash',
  'shellscript',
  'powershell',
  'batch',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'dart',
  'sql',
  'graphql',
  'yaml',
  'toml',
  'xml',
  'dockerfile',
  'nginx',
  'diff',
  'ini',
  'dotenv',
] as const;

export const MARKDOWN_CODE_LANGUAGE_ALIASES: Record<string, string> = {
  plain: 'text',
  plaintext: 'text',
  txt: 'text',
  text: 'text',

  md: 'markdown',
  markdown: 'markdown',

  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  javascript: 'javascript',

  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  typescript: 'typescript',

  jsx: 'jsx',
  tsx: 'tsx',

  json: 'json',
  jsonc: 'jsonc',

  html: 'html',
  htm: 'html',

  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',

  sh: 'shellscript',
  shell: 'shellscript',
  shellscript: 'shellscript',
  zsh: 'shellscript',
  bash: 'bash',

  ps: 'powershell',
  ps1: 'powershell',
  powershell: 'powershell',

  bat: 'batch',
  cmd: 'batch',
  batch: 'batch',

  py: 'python',
  python: 'python',

  csharp: 'csharp',
  cs: 'csharp',

  cplusplus: 'cpp',
  'c++': 'cpp',
  cpp: 'cpp',

  golang: 'go',
  go: 'go',

  rs: 'rust',
  rust: 'rust',

  yml: 'yaml',
  yaml: 'yaml',

  docker: 'dockerfile',
  dockerfile: 'dockerfile',

  env: 'dotenv',
  dotenv: 'dotenv',

  gql: 'graphql',
  graphql: 'graphql',

  diff: 'diff',
  patch: 'diff',

  xml: 'xml',
  toml: 'toml',
  ini: 'ini',
  sql: 'sql',
  nginx: 'nginx',
  php: 'php',
  rb: 'ruby',
  ruby: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  kotlin: 'kotlin',
  dart: 'dart',
  java: 'java',
  c: 'c',
};

export function formatLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    text: 'Text',
    markdown: 'Markdown',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    tsx: 'TSX',
    jsx: 'JSX',
    json: 'JSON',
    jsonc: 'JSONC',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    less: 'Less',
    bash: 'Bash',
    shellscript: 'Shell',
    powershell: 'PowerShell',
    batch: 'Batch',
    python: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    kotlin: 'Kotlin',
    dart: 'Dart',
    sql: 'SQL',
    graphql: 'GraphQL',
    yaml: 'YAML',
    toml: 'TOML',
    xml: 'XML',
    dockerfile: 'Dockerfile',
    nginx: 'Nginx',
    diff: 'Diff',
    ini: 'INI',
    dotenv: 'dotenv',
  };

  return labels[language] ?? language;
}
