import { Directive, effect, ElementRef, input, model, output, viewChild } from '@angular/core';
import type { IChatComposerAttachment } from './chat-message.types';

const CHAT_COMPOSER_ACCEPT =
  'image/*,.txt,.md,.markdown,.json,.jsonc,.csv,.ts,.tsx,.js,.jsx,.mjs,.cjs,.html,.css,.scss,.less,.py,.java,.cs,.go,.rs,.sh,.bash,.zsh,.ps1,.sql,.yml,.yaml,.xml,.svg';

export type ChatComposerState = 'idle' | 'writing' | 'uploading' | 'editing' | 'generating';

@Directive()
export abstract class ChatComposerBaseDirective {
  readonly prompt = model('');
  readonly attachments = model<IChatComposerAttachment[]>([]);
  readonly minRows = input(1);
  readonly maxRows = input(4);
  readonly sending = input(false);
  readonly submitLocked = input(false);
  readonly state = input<ChatComposerState>('idle');
  readonly submit = output<void>();
  readonly cancel = output<void>();

  protected readonly accept = CHAT_COMPOSER_ACCEPT;
  protected readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('promptTextarea');

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

  canSend(): boolean {
    if (this.sending()) {
      return true;
    }

    return !this.submitLocked() && this.canSubmit();
  }

  stateLabel(): string {
    switch (this.state()) {
      case 'writing':
        return 'Writing';
      case 'uploading':
        return 'Uploading';
      case 'editing':
        return 'Editing';
      case 'generating':
        return 'Generating';
      default:
        return 'Idle';
    }
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

    if (!this.canSend()) {
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
