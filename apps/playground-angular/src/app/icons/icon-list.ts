// file: apps/playground-angular/src/app/icons/icon-list.ts

export interface IconEntry {
  readonly name: string;
  readonly label: string;
  readonly keywords?: readonly string[];
}

export const icons_ui: readonly IconEntry[] = [
  { name: 'home', label: 'Home' },
  { name: 'search', label: 'Search' },
  { name: 'settings', label: 'Settings' },
  { name: 'menu', label: 'Menu' },
  { name: 'close', label: 'Close' },
  { name: 'check', label: 'Check' },
  { name: 'arrow_back', label: 'Back' },
  { name: 'arrow_forward', label: 'Forward' },
];

export const icons_theme: readonly IconEntry[] = [
  { name: 'light_mode', label: 'Light mode' },
  { name: 'dark_mode', label: 'Dark mode' },
];

export const icons_files: readonly IconEntry[] = [
  { name: 'folder', label: 'Folder' },
  { name: 'description', label: 'File' },
  { name: 'upload', label: 'Upload' },
  { name: 'download', label: 'Download' },
  { name: 'delete', label: 'Delete' },
];

export const icons_chat: readonly IconEntry[] = [
  { name: 'content_copy', label: 'Copy' },
  { name: 'edit', label: 'Edit' },
  { name: 'thumb_up', label: 'Like' },
  { name: 'thumb_down', label: 'Dislike' },
  { name: 'refresh', label: 'Regenerate' },
  { name: 'account_tree', label: 'Branch' },
  { name: 'attach_file', label: 'Attach files' },
  { name: 'send', label: 'Send' },
  { name: 'stop', label: 'Stop' },
];

export const icons: readonly IconEntry[] = [
  ...icons_ui,
  ...icons_theme,
  ...icons_files,
  ...icons_chat,
];

export function findIcon(name: string): IconEntry | undefined {
  return icons.find((icon) => icon.name === name);
}