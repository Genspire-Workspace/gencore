import type { ConnectedPosition } from '@angular/cdk/overlay';
import {
  DestroyRef,
  Directive,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { IAiPromptResponseDto } from '@genspire/sdk-ai';
import type {
  IChatComposerAttachment,
  IChatComposerPromptReference,
  IChatComposerReference,
  IChatComposerReferenceKind,
} from './chat-message.types';
import { OverlayService } from '../../../shared/overlay';
import type { AppOverlayHandle } from '../../../shared/overlay';
import { AiPromptClient } from '../prompts/ai-prompt.client';

const CHAT_COMPOSER_ACCEPT =
  'image/*,.txt,.md,.markdown,.json,.jsonc,.csv,.ts,.tsx,.js,.jsx,.mjs,.cjs,.html,.css,.scss,.less,.py,.java,.cs,.go,.rs,.sh,.bash,.zsh,.ps1,.sql,.yml,.yaml,.xml,.svg';

const CHAT_COMPOSER_TOKEN_TRIGGERS = ['/', '@', '$'] as const;
const CHAT_COMPOSER_TOKEN_DROPDOWN_POSITIONS: ConnectedPosition[] = [
  {
    originX: 'start',
    originY: 'bottom',
    overlayX: 'start',
    overlayY: 'top',
    offsetY: 10,
  },
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'bottom',
    offsetY: -10,
  },
];

const CHAT_COMPOSER_REFERENCE_METADATA: Record<
  IChatComposerReferenceKind,
  { label: string; iconName: string }
> = {
  prompt: {
    label: 'Prompts',
    iconName: 'prompt_suggestion',
  },
  skill: {
    label: 'Skills',
    iconName: 'psychology',
  },
  tool: {
    label: 'Tools',
    iconName: 'build',
  },
};

export type ChatComposerState = 'idle' | 'writing' | 'uploading' | 'editing' | 'generating';
export type ChatComposerTokenKind = 'slash' | 'mention' | 'skill';

interface IChatComposerTokenSession {
  kind: ChatComposerTokenKind;
  trigger: '/' | '@' | '$';
  query: string;
  start: number;
  end: number;
}

export interface IChatComposerTokenSuggestion {
  id: string;
  kind: IChatComposerReferenceKind;
  iconName: string;
  label: string;
  description: string;
  insertText: string;
  prompt?: IAiPromptResponseDto;
}

export interface IChatComposerTokenSuggestionSection {
  kind: IChatComposerReferenceKind;
  label: string;
  iconName: string;
  options: IChatComposerTokenSuggestion[];
}

@Directive()
export abstract class ChatComposerBaseDirective {
  readonly prompt = model('');
  readonly attachments = model<IChatComposerAttachment[]>([]);
  readonly references = model<IChatComposerReference[]>([]);
  readonly minRows = input(1);
  readonly maxRows = input(4);
  readonly sending = input(false);
  readonly submitLocked = input(false);
  readonly state = input<ChatComposerState>('idle');
  readonly submit = output<void>();
  readonly cancel = output<void>();

  protected readonly accept = CHAT_COMPOSER_ACCEPT;
  protected readonly composerRootRef = viewChild<ElementRef<HTMLElement>>('composerRoot');
  protected readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('promptTextarea');
  protected readonly tokenMenuTemplateRef = viewChild<TemplateRef<unknown>>('tokenMenu');
  protected readonly activeTokenSession = signal<IChatComposerTokenSession | null>(null);
  protected readonly highlightedTokenOptionIndex = signal(0);
  protected readonly promptSuggestions = signal<IChatComposerTokenSuggestion[]>([]);
  protected readonly skillSuggestions = signal<IChatComposerTokenSuggestion[]>([]);
  protected readonly toolSuggestions = signal<IChatComposerTokenSuggestion[]>([]);
  protected readonly promptSuggestionsLoading = signal(false);
  protected readonly expandedPromptReferenceId = signal<string | null>(null);
  protected readonly hasRequiredPromptVariablesFilled = computed(() => {
    const promptRefs = this.references().filter(
      (reference): reference is IChatComposerPromptReference => reference.kind === 'prompt',
    );
    if (promptRefs.length === 0) {
      return false;
    }
    return promptRefs.every((reference) =>
      reference.variables
        .filter((variable) => variable.required)
        .every((variable) => variable.value.trim().length > 0),
    );
  });
  protected readonly filteredTokenSuggestions = computed(() => {
    const session = this.activeTokenSession();
    if (!session) {
      return [];
    }

    const query = session.query.trim().toLowerCase();
    const suggestions = this.getSuggestionsForSession(session);

    if (!query) {
      return suggestions;
    }

    return suggestions.filter((option) =>
      [option.label, option.description, option.insertText].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  });
  protected readonly hasTokenSession = computed(() => this.activeTokenSession() !== null);
  protected readonly highlightedTokenSuggestionId = computed(
    () => this.filteredTokenSuggestions()[this.highlightedTokenOptionIndex()]?.id ?? null,
  );
  protected readonly tokenSuggestionSections = computed<IChatComposerTokenSuggestionSection[]>(() => {
    const suggestions = this.filteredTokenSuggestions();

    return (['prompt', 'skill', 'tool'] as const)
      .map((kind) => ({
        kind,
        label: CHAT_COMPOSER_REFERENCE_METADATA[kind].label,
        iconName: CHAT_COMPOSER_REFERENCE_METADATA[kind].iconName,
        options: suggestions.filter((option) => option.kind === kind),
      }))
      .filter((section) => section.options.length > 0);
  });

  private readonly promptClient = inject(AiPromptClient);
  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private activeTokenOverlayHandle: AppOverlayHandle | null = null;
  private hasAttemptedPromptSuggestionLoad = false;

  constructor() {
    effect(() => {
      const textarea = this.textareaRef()?.nativeElement;
      const prompt = this.prompt();
      this.minRows();
      this.maxRows();

      if (!textarea) {
        return;
      }

      queueMicrotask(() => {
        if (textarea.value !== prompt) {
          textarea.value = prompt;
        }

        this.resizeTextareaElement(textarea);
      });
    });

    effect(() => {
      const session = this.activeTokenSession();
      const composerRoot = this.composerRootRef()?.nativeElement;
      const templateRef = this.tokenMenuTemplateRef();

      if (
        (session?.trigger === '$' || session?.trigger === '/')
        && this.promptSuggestions().length === 0
        && !this.promptSuggestionsLoading()
      ) {
        void this.loadPromptSuggestions();
      }

      if (!session || !composerRoot || !templateRef) {
        this.closeTokenOverlay();
        return;
      }

      queueMicrotask(() => this.ensureTokenOverlay(composerRoot, templateRef));
    });

    effect(() => {
      const suggestions = this.filteredTokenSuggestions();
      const nextMaxIndex = Math.max(0, suggestions.length - 1);
      this.highlightedTokenOptionIndex.update((current) => Math.min(current, nextMaxIndex));
    });

    this.destroyRef.onDestroy(() => this.closeTokenOverlay());
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
    return (
      this.prompt().trim().length > 0
      || this.attachments().length > 0
      || this.hasRequiredPromptVariablesFilled()
    );
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
    this.syncActiveToken(textarea);
  }

  onPromptKeydown(event: KeyboardEvent): void {
    if (this.hasTokenSession()) {
      switch (event.key) {
        case 'ArrowDown':
          if (this.filteredTokenSuggestions().length > 0) {
            event.preventDefault();
            this.moveTokenSelection(1);
            return;
          }
          break;
        case 'ArrowUp':
          if (this.filteredTokenSuggestions().length > 0) {
            event.preventDefault();
            this.moveTokenSelection(-1);
            return;
          }
          break;
        case 'Escape':
          event.preventDefault();
          this.closeActiveTokenSession();
          return;
        case 'Tab':
          if (this.filteredTokenSuggestions().length > 0) {
            event.preventDefault();
            this.selectHighlightedTokenSuggestion();
            return;
          }
          break;
        case 'Enter':
          if (!event.shiftKey && this.filteredTokenSuggestions().length > 0) {
            event.preventDefault();
            this.selectHighlightedTokenSuggestion();
            return;
          }
          break;
      }
    }

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

    if (this.prompt().trim().length === 0 && this.hasRequiredPromptVariablesFilled()) {
      void this.buildPromptFromReferences().then(() => {
        queueMicrotask(() => this.submit.emit());
      });
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

  onPromptSelectionChange(textarea: HTMLTextAreaElement): void {
    this.syncActiveToken(textarea);
  }

  protected selectTokenSuggestion(
    option: IChatComposerTokenSuggestion,
    overlay?: AppOverlayHandle,
  ): void {
    const session = this.activeTokenSession();
    const textarea = this.textareaRef()?.nativeElement;
    if (!session || !textarea) {
      overlay?.close();
      this.closeActiveTokenSession();
      return;
    }

    const prefix = this.prompt().slice(0, session.start);
    const suffix = this.prompt().slice(session.end).replace(/^\s+/, '');
    const nextPrompt = `${prefix}${suffix}`;
    const nextCaret = prefix.length;

    if (option.kind === 'prompt' && option.prompt) {
      this.addPromptReference(option.prompt);
    }

    this.prompt.set(nextPrompt);
    this.closeActiveTokenSession(overlay);

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
      this.resizeTextareaElement(textarea);
    });
  }

  protected setHighlightedTokenSuggestionById(suggestionId: string): void {
    const nextIndex = this.filteredTokenSuggestions().findIndex((option) => option.id === suggestionId);
    if (nextIndex < 0) {
      return;
    }

    this.highlightedTokenOptionIndex.set(nextIndex);
  }

  protected removeReference(referenceId: string): void {
    this.references.update((current) => current.filter((reference) => reference.id !== referenceId));

    if (this.expandedPromptReferenceId() === referenceId) {
      this.expandedPromptReferenceId.set(null);
    }
  }

  protected togglePromptReference(referenceId: string): void {
    this.expandedPromptReferenceId.update((current) =>
      current === referenceId ? null : referenceId,
    );
  }

  clearComposer(): void {
    this.prompt.set('');
    this.attachments.set([]);
    this.references.set([]);
    this.expandedPromptReferenceId.set(null);
    this.closeActiveTokenSession();
  }

  private async buildPromptFromReferences(): Promise<void> {
    const promptRefs = this.references().filter(
      (reference): reference is IChatComposerPromptReference => reference.kind === 'prompt',
    );

    const renderedParts: string[] = [];

    for (const reference of promptRefs) {
      try {
        const prompt = await this.promptClient.getPrompt(reference.promptId);
        const template = typeof prompt.template === 'string' ? prompt.template : '';
        if (!template) {
          continue;
        }

        const rendered = template.replaceAll(
          /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
          (_match, variableName: string) => {
            const variable = reference.variables.find((v) => v.name === variableName);
            return variable?.value ?? '';
          },
        );
        renderedParts.push(rendered);
      } catch {
        // skip prompts that fail to load
      }
    }

    const nextPrompt = renderedParts.join('\n\n');
    this.prompt.set(nextPrompt);
  }

  protected updatePromptReferenceVariable(
    referenceId: string,
    variableName: string,
    value: string,
  ): void {
    this.references.update((current) =>
      current.map((reference) => {
        if (reference.kind !== 'prompt' || reference.id !== referenceId) {
          return reference;
        }

        return {
          ...reference,
          variables: reference.variables.map((variable) =>
            variable.name === variableName
              ? {
                  ...variable,
                  value,
                }
              : variable,
          ),
        };
      }),
    );
  }

  protected closeActiveTokenSession(overlay?: AppOverlayHandle): void {
    this.activeTokenSession.set(null);
    this.highlightedTokenOptionIndex.set(0);
    overlay?.close();
    this.closeTokenOverlay();
  }

  private ensureTokenOverlay(
    composerRoot: HTMLElement,
    templateRef: TemplateRef<unknown>,
  ): void {
    if (this.activeTokenOverlayHandle) {
      this.activeTokenOverlayHandle.overlayRef.updateSize({
        width: `${composerRoot.getBoundingClientRect().width}px`,
      });
      this.activeTokenOverlayHandle.overlayRef.updatePosition();
      return;
    }

    const handle = this.overlayService.createDropdownTemplate(
      {
        templateRef,
        viewContainerRef: this.viewContainerRef,
      },
      {
        origin: composerRoot,
        hasBackdrop: true,
        closeOnBackdropClick: true,
        positions: CHAT_COMPOSER_TOKEN_DROPDOWN_POSITIONS,
        matchOriginWidth: true,
        panelClass: 'app-chat-composer-token-overlay',
      },
    );

    this.activeTokenOverlayHandle = handle;
    handle.afterClosed$.subscribe(() => {
      if (this.activeTokenOverlayHandle?.id === handle.id) {
        this.activeTokenOverlayHandle = null;
      }
    });
  }

  private closeTokenOverlay(): void {
    this.activeTokenOverlayHandle?.close();
    this.activeTokenOverlayHandle = null;
  }

  private syncActiveToken(textarea: HTMLTextAreaElement): void {
    const selectionStart = textarea.selectionStart ?? this.prompt().length;
    const nextSession = this.detectTokenSession(this.prompt(), selectionStart);
    const currentSession = this.activeTokenSession();

    if (this.areTokenSessionsEqual(currentSession, nextSession)) {
      return;
    }

    this.activeTokenSession.set(nextSession);
    this.highlightedTokenOptionIndex.set(0);
  }

  private detectTokenSession(
    value: string,
    caretIndex: number,
  ): IChatComposerTokenSession | null {
    const beforeCaret = value.slice(0, caretIndex);
    const tokenMatch = /(^|\s)([\/@$])([^\s\/@$]*)$/.exec(beforeCaret);
    if (!tokenMatch) {
      return null;
    }

    const trigger = tokenMatch[2] as '/' | '@' | '$';
    if (!CHAT_COMPOSER_TOKEN_TRIGGERS.includes(trigger)) {
      return null;
    }

    const query = tokenMatch[3] ?? '';
    const start = caretIndex - (query.length + 1);
    const end = caretIndex;

    return {
      kind: this.mapTriggerToKind(trigger),
      trigger,
      query,
      start,
      end,
    };
  }

  private mapTriggerToKind(trigger: '/' | '@' | '$'): ChatComposerTokenKind {
    switch (trigger) {
      case '/':
        return 'slash';
      case '@':
        return 'mention';
      case '$':
        return 'skill';
    }
  }

  private moveTokenSelection(delta: number): void {
    const suggestions = this.filteredTokenSuggestions();
    if (suggestions.length === 0) {
      return;
    }

    const current = this.highlightedTokenOptionIndex();
    const next = (current + delta + suggestions.length) % suggestions.length;
    this.highlightedTokenOptionIndex.set(next);
  }

  private areTokenSessionsEqual(
    left: IChatComposerTokenSession | null,
    right: IChatComposerTokenSession | null,
  ): boolean {
    if (left === right) {
      return true;
    }

    if (!left || !right) {
      return false;
    }

    return (
      left.kind === right.kind
      && left.trigger === right.trigger
      && left.query === right.query
      && left.start === right.start
      && left.end === right.end
    );
  }

  private selectHighlightedTokenSuggestion(): void {
    const suggestion = this.filteredTokenSuggestions()[this.highlightedTokenOptionIndex()];
    if (!suggestion) {
      return;
    }

    this.selectTokenSuggestion(suggestion, this.activeTokenOverlayHandle ?? undefined);
  }

  private async loadPromptSuggestions(): Promise<void> {
    if (this.promptSuggestionsLoading()) {
      return;
    }

    if (this.hasAttemptedPromptSuggestionLoad && this.promptSuggestions().length > 0) {
      return;
    }

    this.hasAttemptedPromptSuggestionLoad = true;
    this.promptSuggestionsLoading.set(true);

    try {
      const prompts = await this.promptClient.listPrompts();
      this.promptSuggestions.set(
        prompts
          .filter((prompt) => prompt.type === 'user_prompt')
          .map((prompt) => this.toTokenSuggestion(prompt)),
      );
    } catch {
      this.promptSuggestions.set([]);
      this.hasAttemptedPromptSuggestionLoad = false;
    } finally {
      this.promptSuggestionsLoading.set(false);
    }
  }

  private toTokenSuggestion(prompt: IAiPromptResponseDto): IChatComposerTokenSuggestion {
    const label = prompt.name?.trim() || prompt.id;
    const description = prompt.description?.trim()
      || prompt.argumentHint?.trim()
      || prompt.type?.replaceAll('_', ' ')
      || prompt.visibility;

    return {
      id: prompt.id,
      kind: 'prompt',
      iconName: CHAT_COMPOSER_REFERENCE_METADATA['prompt'].iconName,
      label,
      description,
      insertText: prompt.id,
      prompt,
    };
  }

  private getSuggestionsForSession(session: IChatComposerTokenSession): IChatComposerTokenSuggestion[] {
    switch (session.trigger) {
      case '/':
        return [
          ...this.promptSuggestions(),
          ...this.skillSuggestions(),
          ...this.toolSuggestions(),
        ];
      case '$':
        return this.promptSuggestions();
      case '@':
        return [];
    }
  }

  private addPromptReference(prompt: IAiPromptResponseDto): void {
    const referenceId = `prompt-${prompt.id}`;

    this.references.update((current) => {
      if (current.some((reference) => reference.kind === 'prompt' && reference.promptId === prompt.id)) {
        return current;
      }

      const reference: IChatComposerPromptReference = {
        id: referenceId,
        kind: 'prompt',
        promptId: prompt.id,
        name: prompt.name?.trim() || prompt.id,
        iconName: CHAT_COMPOSER_REFERENCE_METADATA['prompt'].iconName,
        description: prompt.description?.trim() || undefined,
        argumentHint: prompt.argumentHint?.trim() || undefined,
        variables: (prompt.variables ?? []).map((variable) => ({
          name: variable.name,
          description: variable.description?.trim() || undefined,
          required: variable.required ?? false,
          value:
            typeof variable.defaultValue === 'string'
              ? variable.defaultValue
              : variable.defaultValue == null
                ? ''
                : String(variable.defaultValue),
        })),
      };

      return [...current, reference];
    });

    this.expandedPromptReferenceId.set(referenceId);
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
