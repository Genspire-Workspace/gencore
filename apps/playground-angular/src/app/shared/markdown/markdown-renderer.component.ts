// file: apps/playground-angular/src/app/shared/markdown/markdown-renderer.component.ts

import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ThemeService } from '../theme';
import { MarkdownRendererService } from './markdown-renderer.service';

@Component({
  selector: 'app-markdown-renderer',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="app-markdown-renderer" [innerHTML]="html()" (click)="onRendererClick($event)"></div>
  `,
  styles: `
    .app-markdown-renderer {
      word-break: break-word;
    }

    .app-markdown-renderer > :first-child {
      margin-top: 0;
    }

    .app-markdown-renderer > :last-child {
      margin-bottom: 0;
    }

    .app-markdown-renderer p,
    .app-markdown-renderer ul,
    .app-markdown-renderer ol,
    .app-markdown-renderer pre,
    .app-markdown-renderer blockquote,
    .app-markdown-renderer .app-code-shell,
    .app-markdown-renderer .app-markdown-table-wrapper {
      margin: 0 0 0.75rem;
    }

    .app-markdown-renderer ul,
    .app-markdown-renderer ol {
      padding-left: 1.5rem;
    }

    .app-markdown-renderer a {
      text-decoration: underline;
      text-underline-offset: 0.18em;
    }

    .app-markdown-renderer code {
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
        monospace;
      font-size: 0.95em;
    }

    .app-markdown-renderer :not(pre) > code {
      border-radius: 0.5rem;
      background: var(--color-base-200, rgba(15, 23, 42, 0.08));
      padding: 0.125rem 0.375rem;
    }

    .app-markdown-renderer .app-code-shell {
      position: relative;
      overflow: visible;
      isolation: isolate;
      border: 1px solid var(--color-base-300, rgba(148, 163, 184, 0.24));
      border-radius: 1rem;
      background: var(--color-base-100, rgba(15, 23, 42, 0.04));
      clip-path: inset(0 round 1rem);
    }

    .app-markdown-renderer .app-code-header {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      border-radius: 0;
      background: color-mix(in srgb, var(--color-base-100, #ffffff) 92%, transparent);
      padding: 0.5rem 0.75rem;
      backdrop-filter: blur(10px);
    }

    :root[data-theme='dark'] .app-markdown-renderer .app-code-header {
      background: color-mix(in srgb, var(--color-base-100, #111827) 92%, transparent);
    }

    .app-markdown-renderer .app-code-language {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-base-content, currentColor);
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
        monospace;
      font-size: 0.75rem;
      font-weight: 600;
      opacity: 0.72;
    }

    .app-markdown-renderer .app-code-copy-button {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: 0;
      border-radius: 0.375rem;
      background: transparent;
      color: var(--color-neutral, currentColor);
      padding: 0.25rem;
      opacity: 0.8;
      transition:
        opacity 150ms ease,
        background 150ms ease,
        transform 150ms ease;
    }

    .app-markdown-renderer .app-code-copy-button:hover {
      opacity: 1;
      background: var(--color-base-300, rgba(15, 23, 42, 0.12));
    }

    .app-markdown-renderer .app-code-copy-button:active {
      transform: scale(0.96);
    }

    .app-markdown-renderer .app-code-copy-button:disabled {
      cursor: default;
      opacity: 0.72;
    }

    .app-markdown-renderer .app-code-copy-icon {
      font-size: 1.25rem;
      line-height: 1;
      color: inherit;
      font-variation-settings:
        'FILL' 0,
        'wght' 400,
        'GRAD' 0,
        'opsz' 20;
    }

    .app-markdown-renderer .app-code-shell pre,
    .app-markdown-renderer .app-code-shell .shiki,
    .app-markdown-renderer .app-code-shell .app-code-block {
      overflow-x: auto;
      overflow-y: hidden;
      border: 0;
      border-radius: 0;
      margin: 0;
      max-width: 100%;
      padding: 0.875rem 1rem;
    }

    .app-markdown-renderer .app-code-shell .shiki {
      background: transparent !important;
    }

    .app-markdown-renderer pre code,
    .app-markdown-renderer .shiki code,
    .app-markdown-renderer .app-code-block code {
      display: block;
      min-width: max-content;
      background: transparent;
      padding: 0;
      color: inherit;
    }

    .app-markdown-renderer .app-code-block-plain {
      background: var(--color-base-200, rgba(15, 23, 42, 0.08));
    }

    .app-markdown-renderer .app-code-block-plain code {
      color: var(--color-base-content, currentColor);
    }

    .app-markdown-renderer blockquote {
      border-left: 3px solid var(--color-base-300, rgba(15, 23, 42, 0.16));
      margin-left: 0;
      padding-left: 0.875rem;
      opacity: 0.9;
    }

    .app-markdown-renderer .app-markdown-table-wrapper {
      overflow: hidden;
      overflow-x: auto;
      border: 1px solid var(--color-base-300, rgba(148, 163, 184, 0.24));
      border-radius: 1rem;
      background: var(--color-base-100, transparent);
    }

    .app-markdown-renderer .app-markdown-table {
      width: 100%;
      min-width: max-content;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 0.925rem;
    }

    .app-markdown-renderer .app-markdown-table thead {
      background: var(--color-base-200, rgba(15, 23, 42, 0.06));
    }

    .app-markdown-renderer .app-markdown-table th,
    .app-markdown-renderer .app-markdown-table td {
      border-bottom: 1px solid var(--color-base-300, rgba(148, 163, 184, 0.24));
      padding: 0.625rem 0.75rem;
      text-align: left;
      vertical-align: top;
    }

    .app-markdown-renderer .app-markdown-table th {
      color: var(--color-base-content, currentColor);
      font-weight: 700;
      white-space: nowrap;
    }

    .app-markdown-renderer .app-markdown-table td {
      color: var(--color-base-content, currentColor);
      opacity: 0.9;
    }

    .app-markdown-renderer .app-markdown-table tbody tr:last-child td {
      border-bottom: 0;
    }

    .app-markdown-renderer .app-markdown-table tbody tr:hover {
      background: var(--color-base-200, rgba(15, 23, 42, 0.04));
    }

    .app-markdown-renderer .app-markdown-table th:not(:last-child),
    .app-markdown-renderer .app-markdown-table td:not(:last-child) {
      border-right: 1px solid var(--color-base-300, rgba(148, 163, 184, 0.16));
    }
  `,
})
export class MarkdownRendererComponent {
  private readonly markdownRenderer = inject(MarkdownRendererService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly themeService = inject(ThemeService);

  readonly content = input('');

  constructor() {
    void this.markdownRenderer.init();
  }

  protected readonly html = computed<SafeHtml>(() => {
    this.markdownRenderer.isReady();

    const theme = this.themeService.theme();
    const renderedHtml = this.markdownRenderer.render(this.content(), theme);

    return this.sanitizer.bypassSecurityTrustHtml(renderedHtml);
  });

  protected async onRendererClick(event: MouseEvent): Promise<void> {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const copyButton = target.closest<HTMLButtonElement>('[data-copy-code]');

    if (!copyButton) {
      return;
    }

    const codeShell = copyButton.closest<HTMLElement>('.app-code-shell');
    const codeElement = codeShell?.querySelector<HTMLElement>('pre code');

    if (!codeElement) {
      return;
    }

    const code = codeElement.textContent ?? '';

    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.setCopyButtonState(copyButton, 'copied');
    } catch {
      this.setCopyButtonState(copyButton, 'failed');
    }
  }

  private setCopyButtonState(button: HTMLButtonElement, state: 'copied' | 'failed'): void {
    const icon = button.querySelector<HTMLElement>('.app-code-copy-icon');

    const originalIcon = icon?.textContent?.trim() || 'content_copy';
    const originalAriaLabel = button.getAttribute('aria-label') || 'Copy code';
    const originalTitle = button.getAttribute('title') || 'Copy code';

    if (icon) {
      icon.textContent = state === 'copied' ? 'check' : 'error';
    }

    button.dataset['copyState'] = state;
    button.setAttribute('aria-label', state === 'copied' ? 'Copied' : 'Copy failed');
    button.setAttribute('title', state === 'copied' ? 'Copied' : 'Copy failed');
    button.disabled = true;

    window.setTimeout(() => {
      if (icon) {
        icon.textContent = originalIcon;
      }

      delete button.dataset['copyState'];
      button.setAttribute('aria-label', originalAriaLabel);
      button.setAttribute('title', originalTitle);
      button.disabled = false;
    }, 1200);
  }
}
