# Icons

This folder contains the icon system used by the `playground-angular` app.

All icons here are **Google Icons** (Material Symbols). The variable font is loaded via `<link>` in `src/index.html`:

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
/>
```

The base `.material-symbols-rounded` font configuration lives in `src/styles.css`.

## How it works

Icons are plain arrays of entries. Each entry has a `name` (the Material Symbols ligature name) and a `label` (for `aria-label`).

```ts
export interface IconEntry {
  readonly name: string;
  readonly label: string;
  readonly keywords?: readonly string[];
}
```

Lists are grouped by area for organization, then merged into a single registry:

- `icons_ui` — generic UI actions
- `icons_theme` — theme toggling
- `icons_files` — file actions

```ts
export const icons: readonly IconEntry[] = [
  ...icons_ui,
  ...icons_theme,
  ...icons_files,
];
```

Add a new icon by appending to the relevant list, or add a new list and spread it into `icons`.

## Using the component

```html
<app-icon iconName="home" />
<app-icon iconName="dark_mode" size="sm" />
```

Sizes: `sm`, `md` (default), `lg`, `xl`.

Icon names must match Material Symbols ligature names from https://fonts.google.com/icons.