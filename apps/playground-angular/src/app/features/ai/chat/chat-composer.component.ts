// file: apps\playground-angular\src\app\features\ai\chat\chat-composer.component.ts

import { Component, effect, ElementRef, input, model, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { IChatComposerAttachment } from './chat-message.types';

const CHAT_COMPOSER_ACCEPT =
  'image/*,.txt,.md,.markdown,.json,.jsonc,.csv,.ts,.tsx,.js,.jsx,.mjs,.cjs,.html,.css,.scss,.less,.py,.java,.cs,.go,.rs,.sh,.bash,.zsh,.ps1,.sql,.yml,.yaml,.xml,.svg';

@Component({
  selector: 'app-ai-chat-composer',
  host: {
    class: 'block',
  },
  imports: [CommonModule, FormsModule],
  template: `
    <form class="flex flex-col gap-3 rounded-3xl border border-base-300 bg-base-100 p-3" (ngSubmit)="onSubmit()">
      <textarea
        #promptTextarea
        class="w-full resize-none overflow-y-hidden border-0 bg-transparent px-2 py-2 text-base-content outline-none transition placeholder:text-base-content/40"
        [ngModel]="prompt()"
        (ngModelChange)="onPromptChange($event, promptTextarea)"
        (keydown)="onPromptKeydown($event)"
        name="prompt"
        placeholder="Ask something like: What is the capital of Spain?"
        [rows]="minRows()"
        [disabled]="sending()"
      ></textarea>

      @if (attachments().length > 0) {
        <div class="flex flex-wrap gap-2 px-2">
          @for (attachment of attachments(); track attachment.id) {
            <div class="flex items-center gap-2 rounded-2xl bg-base-200 px-3 py-2 text-xs text-base-content">
              <span class="truncate font-medium">{{ attachment.name }}</span>
              <span class="text-base-content/50">{{ formatFileSize(attachment.size) }}</span>
              <button
                class="rounded-full p-1 text-base-content/60 transition hover:bg-base-300 hover:text-base-content disabled:cursor-not-allowed"
                type="button"
                [disabled]="sending()"
                (click)="removeAttachment(attachment.id)"
                aria-label="Remove attachment"
              >
                x
              </button>
            </div>
          }
        </div>
      }

      <input
        #fileInput
        class="hidden"
        type="file"
        [accept]="accept"
        [disabled]="sending()"
        multiple
        (change)="onFilesSelected($event)"
      />

      <div class="flex items-center justify-between gap-3 border-t border-base-200 px-2 pt-3">
        <button
          class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-base-300 bg-base-100 text-xl leading-none text-base-content transition hover:border-base-content/30 hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          [disabled]="sending()"
          (click)="fileInput.click()"
          aria-label="Attach files"
        >
          +
        </button>

        <button
          [class]="
            sending()
              ? 'inline-flex min-w-28 items-center justify-center rounded-2xl bg-error px-5 py-3 text-sm font-semibold text-error-content transition hover:bg-error/80 disabled:cursor-not-allowed'
              : 'inline-flex min-w-28 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-content transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-base-300'
          "
          type="submit"
          [disabled]="!sending() && !canSubmit()"
        >
          {{ sending() ? 'Stop' : 'Send' }}
        </button>
      </div>
    </form>
  `,
})
export class ChatComposerComponent {
  readonly prompt = model('');
  readonly attachments = model<IChatComposerAttachment[]>([]);
  readonly minRows = input(1);
  readonly maxRows = input(4);
  readonly sending = input(false);
  readonly submit = output<void>();
  readonly cancel = output<void>();

  protected readonly accept = CHAT_COMPOSER_ACCEPT;
  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('promptTextarea');

  constructor() {
    effect(() => {
      const textarea = this.textareaRef()?.nativeElement;
      this.prompt();
      this.minRows();
      this.maxRows();

      if (!textarea) {
        return;
      }

      queueMicrotask(() => this.resizeTextareaElement(textarea));
    });
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || files.length === 0) {
      return;
    }

    const nextAttachments = await Promise.all(
      Array.from(files).map((file) => this.toAttachment(file)),
    );

    this.attachments.update((current) => [...current, ...nextAttachments]);

    if (input) {
      input.value = '';
    }
  }

  removeAttachment(attachmentId: string): void {
    this.attachments.update((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
  }

  canSubmit(): boolean {
    return this.prompt().trim().length > 0 || this.attachments().length > 0;
  }

  onPromptChange(value: string, textarea: HTMLTextAreaElement): void {
    this.prompt.set(value);
    this.resizeTextareaElement(textarea);
  }

  onPromptKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.onSubmit();
  }

  onSubmit(): void {
    if (this.sending()) {
      this.cancel.emit();
      return;
    }

    if (!this.canSubmit()) {
      return;
    }

    this.submit.emit();
  }

  formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${Math.round(size / 102.4) / 10} KB`;
    }

    return `${Math.round(size / 104857.6) / 10} MB`;
  }

  private async toAttachment(file: File): Promise<IChatComposerAttachment> {
    const data = await this.readFileAsDataUrl(file);
    const mediaType = file.type || this.inferMediaType(file.name);
    const isImage = mediaType.startsWith('image/');

    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      mediaType,
      size: file.size,
      part: isImage
        ? { type: 'image', data, mediaType }
        : { type: 'file', data, mediaType, filename: file.name },
    };
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error ?? new Error(`Failed to read ${file.name}.`));

      reader.readAsDataURL(file);
    });
  }

  private inferMediaType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    switch (extension) {
      case 'txt':
        return 'text/plain';
      case 'md':
      case 'markdown':
        return 'text/markdown';
      case 'json':
      case 'jsonc':
        return 'application/json';
      case 'csv':
        return 'text/csv';
      case 'html':
        return 'text/html';
      case 'css':
        return 'text/css';
      case 'scss':
        return 'text/x-scss';
      case 'less':
        return 'text/less';
      case 'ts':
        return 'text/typescript';
      case 'tsx':
        return 'text/tsx';
      case 'js':
      case 'mjs':
      case 'cjs':
        return 'text/javascript';
      case 'jsx':
        return 'text/jsx';
      case 'py':
        return 'text/x-python';
      case 'java':
        return 'text/x-java-source';
      case 'cs':
        return 'text/x-csharp';
      case 'go':
        return 'text/x-go';
      case 'rs':
        return 'text/rust';
      case 'sh':
      case 'bash':
      case 'zsh':
        return 'application/x-sh';
      case 'ps1':
        return 'text/plain';
      case 'sql':
        return 'application/sql';
      case 'yml':
      case 'yaml':
        return 'application/yaml';
      case 'xml':
        return 'application/xml';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }

  private resizeTextareaElement(textarea: HTMLTextAreaElement): void {
    const styles = globalThis.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight);
    const paddingTop = Number.parseFloat(styles.paddingTop);
    const paddingBottom = Number.parseFloat(styles.paddingBottom);
    const borderTop = Number.parseFloat(styles.borderTopWidth);
    const borderBottom = Number.parseFloat(styles.borderBottomWidth);
    const safeLineHeight = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 24;
    const chromeHeight = paddingTop + paddingBottom + borderTop + borderBottom;
    const minHeight = safeLineHeight * this.minRows() + chromeHeight;
    const maxHeight = safeLineHeight * Math.max(this.minRows(), this.maxRows()) + chromeHeight;

    textarea.style.height = 'auto';

    const nextHeight = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }
}
