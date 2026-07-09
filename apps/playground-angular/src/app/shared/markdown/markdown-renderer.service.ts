// file: apps/playground-angular/src/app/shared/markdown/markdown-renderer.service.ts

import { Injectable, signal } from '@angular/core';
import MarkdownIt from 'markdown-it';
import { createHighlighter, type Highlighter } from 'shiki';
import {
  formatLanguageLabel,
  MARKDOWN_CODE_LANGUAGE_ALIASES,
  MARKDOWN_CODE_LANGUAGES,
  MARKDOWN_CODE_THEMES,
  type MarkdownCodeThemeMode,
} from './markdown-code-languages';

@Injectable({
  providedIn: 'root',
})
export class MarkdownRendererService {
  private highlighter: Highlighter | null = null;
  private initPromise: Promise<void> | null = null;
  private activeCodeTheme: MarkdownCodeThemeMode = 'dark';

  readonly isReady = signal(false);

  private readonly renderer = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: false,
    highlight: (code, language) => this.highlightCode(code, language),
  });

  constructor() {
    this.renderer.validateLink = (url) => this.isSafeLink(url);
    this.configureTables();
  }

  init(): Promise<void> {
    if (this.highlighter) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.createHighlighter();

    return this.initPromise;
  }

  render(content: string, codeTheme: MarkdownCodeThemeMode = 'dark'): string {
    if (!content) {
      return '';
    }

    this.activeCodeTheme = codeTheme;

    return this.renderer.render(content);
  }

  private async createHighlighter(): Promise<void> {
    this.highlighter = await createHighlighter({
      themes: Object.values(MARKDOWN_CODE_THEMES),
      langs: [...MARKDOWN_CODE_LANGUAGES],
    });

    this.isReady.set(true);
  }

  private configureTables(): void {
    this.renderer.renderer.rules['table_open'] = () =>
      '<div class="app-markdown-table-wrapper"><table class="app-markdown-table">';

    this.renderer.renderer.rules['table_close'] = () => '</table></div>';
  }

  private highlightCode(code: string, language: string): string {
    const normalizedLanguage = this.normalizeLanguage(language);
    const languageLabel = formatLanguageLabel(normalizedLanguage);

    if (!this.highlighter) {
      return this.renderPlainCodeBlock(code, normalizedLanguage, languageLabel);
    }

    try {
      const highlightedHtml = this.highlighter.codeToHtml(code, {
        lang: normalizedLanguage,
        theme: MARKDOWN_CODE_THEMES[this.activeCodeTheme],
      });

      return this.wrapCodeBlock(highlightedHtml, normalizedLanguage, languageLabel);
    } catch {
      return this.renderPlainCodeBlock(code, normalizedLanguage, languageLabel);
    }
  }

  private wrapCodeBlock(codeBlockHtml: string, language: string, languageLabel: string): string {
    const escapedLanguage = this.escapeHtml(language);
    const escapedLanguageLabel = this.escapeHtml(languageLabel);

    return [
      `<div class="app-code-shell" data-language="${escapedLanguage}">`,
      `<div class="app-code-header">`,
      `<span class="app-code-language">${escapedLanguageLabel}</span>`,
      [
        `<button type="button" class="app-code-copy-button" data-copy-code aria-label="Copy code" title="Copy code">`,
        `<span class="app-code-copy-icon material-symbols-rounded" aria-hidden="true">content_copy</span>`,
        `</button>`,
      ].join(''),
      `</div>`,
      codeBlockHtml,
      `</div>`,
    ].join('');
  }

  private renderPlainCodeBlock(code: string, language: string, languageLabel: string): string {
    const escapedCode = this.escapeHtml(code);
    const escapedLanguage = this.escapeHtml(language);
    const escapedLanguageLabel = this.escapeHtml(languageLabel);
    const escapedTheme = this.escapeHtml(this.activeCodeTheme);

    return [
      `<div class="app-code-shell app-code-shell-plain app-code-shell-${escapedTheme}" data-language="${escapedLanguage}">`,
      `<div class="app-code-header">`,
      `<span class="app-code-language">${escapedLanguageLabel}</span>`,
      [
        `<button type="button" class="app-code-copy-button" data-copy-code aria-label="Copy code" title="Copy code">`,
        `<span class="app-code-copy-icon material-symbols-rounded" aria-hidden="true">content_copy</span>`,
        `</button>`,
      ].join(''),
      `</div>`,
      `<pre class="app-code-block app-code-block-plain"><code>${escapedCode}</code></pre>`,
      `</div>`,
    ].join('');
  }

  private normalizeLanguage(language: string): string {
    const value = language.trim().toLowerCase();

    if (!value) {
      return 'text';
    }

    return MARKDOWN_CODE_LANGUAGE_ALIASES[value] ?? value;
  }

  private isSafeLink(url: string): boolean {
    const normalizedUrl = url.trim().toLowerCase();

    if (!normalizedUrl) {
      return false;
    }

    return (
      normalizedUrl.startsWith('http://') ||
      normalizedUrl.startsWith('https://') ||
      normalizedUrl.startsWith('mailto:') ||
      normalizedUrl.startsWith('/') ||
      normalizedUrl.startsWith('#')
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
