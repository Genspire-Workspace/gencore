import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../icons/icon.component';
import type {
  IChatComposerPromptReference,
  IChatComposerReference,
  IChatComposerReferenceKind,
} from './chat-message.types';

export interface IChatComposerPromptVariableChangeEvent {
  referenceId: string;
  variableName: string;
  value: string;
}

interface IChatComposerReferenceSection {
  kind: IChatComposerReferenceKind;
  label: string;
  references: IChatComposerReference[];
}

const REFERENCE_SECTION_LABELS: Record<IChatComposerReferenceKind, string> = {
  prompt: 'Prompts',
  skill: 'Skills',
  tool: 'Tools',
};

@Component({
  selector: 'app-ai-chat-composer-reference-panel',
  imports: [CommonModule, FormsModule, IconComponent],
  host: {
    class: 'block',
  },
  template: `
    @if (references().length > 0) {
      <div class="flex flex-col gap-4 px-2">
        <div class="flex flex-col gap-3">
          @for (section of referenceSections(); track section.kind) {
            @if (section.references.length > 0) {
              <div class="flex flex-col gap-2">
                <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
                  {{ section.label }}
                </div>

                <div class="flex flex-wrap gap-2">
                  @for (reference of section.references; track reference.id) {
                    <button
                      class="group inline-flex items-center gap-2 rounded-full border bg-base-100 px-3 py-2 text-xs text-base-content transition hover:border-base-content/25 hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-50"
                      [class.border-base-300]="!(reference.kind === 'prompt' && expandedPromptReferenceId() === reference.id)"
                      [class.border-primary]="reference.kind === 'prompt' && expandedPromptReferenceId() === reference.id"
                      type="button"
                      [disabled]="disabled()"
                      (click)="onReferenceClick(reference)"
                    >
                      <span class="relative inline-flex h-[18px] w-[18px] items-center justify-center">
                        <span class="transition group-hover:opacity-0">
                          <app-icon
                            [iconName]="reference.iconName"
                            size="sm"
                            aria-hidden="true"
                          />
                        </span>
                        <span
                          class="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
                          (click)="removeReference.emit(reference.id); $event.stopPropagation()"
                        >
                          <app-icon iconName="close" size="sm" aria-hidden="true" />
                        </span>
                      </span>

                      <span class="truncate font-medium">{{ reference.name }}</span>
                    </button>
                  }
                </div>
              </div>
            }
          }
        </div>

        @if (expandedPromptReference()) {
          <div class="flex flex-col gap-3">
            <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/45">
              Prompt Variables
            </div>

            <section class="rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
              <div class="flex items-start gap-3">
                <span class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-200 text-base-content/70">
                  <app-icon
                    [iconName]="expandedPromptReference()!.iconName"
                    size="sm"
                    aria-hidden="true"
                  />
                </span>

                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold text-base-content">{{ expandedPromptReference()!.name }}</div>
                  @if (expandedPromptReference()!.argumentHint || expandedPromptReference()!.description) {
                    <div class="mt-1 text-xs text-base-content/60">
                      {{ expandedPromptReference()!.argumentHint || expandedPromptReference()!.description }}
                    </div>
                  }
                </div>
              </div>

              @if (expandedPromptReference()!.variables.length > 0) {
                <div class="mt-4 flex flex-col gap-3">
                  @for (variable of expandedPromptReference()!.variables; track variable.name) {
                    <label class="flex flex-col gap-2">
                      <div class="flex items-center gap-2 text-xs font-medium text-base-content">
                        <span>{{ variable.name }}</span>
                        @if (variable.required) {
                          <span class="text-danger">*</span>
                        }
                      </div>

                      @if (variable.description) {
                        <div class="text-xs text-base-content/55">
                          {{ variable.description }}
                        </div>
                      }

                      <textarea
                        #promptVariableTextarea
                        class="w-full resize-none overflow-y-hidden rounded-2xl border border-base-300 bg-base px-3 py-2 text-sm text-base-content outline-none transition placeholder:text-base-content/35 focus:border-primary"
                        [ngModel]="variable.value"
                        (ngModelChange)="onPromptVariableChange(expandedPromptReference()!.id, variable.name, $event, promptVariableTextarea)"
                        [rows]="1"
                        [disabled]="disabled()"
                        [placeholder]="variable.name"
                        data-prompt-variable="true"
                      ></textarea>
                    </label>
                  }
                </div>
              } @else {
                <div class="mt-4 text-xs text-base-content/55">
                  This prompt has no variables.
                </div>
              }
            </section>
          </div>
        }
      </div>
    }
  `,
})
export class ChatComposerReferencePanelComponent {
  readonly references = input.required<IChatComposerReference[]>();
  readonly disabled = input(false);
  readonly expandedPromptReferenceId = input<string | null>(null);

  readonly removeReference = output<string>();
  readonly togglePromptReference = output<string>();
  readonly promptVariableChange = output<IChatComposerPromptVariableChangeEvent>();

  private readonly promptVariableTextareaRefs =
    viewChildren<ElementRef<HTMLTextAreaElement>>('promptVariableTextarea');

  protected readonly promptReferences = computed(
    () => this.references().filter((reference): reference is IChatComposerPromptReference => reference.kind === 'prompt'),
  );

  protected readonly expandedPromptReference = computed<IChatComposerPromptReference | null>(() => {
    const id = this.expandedPromptReferenceId();
    if (!id) {
      return null;
    }
    return this.promptReferences().find((reference) => reference.id === id) ?? null;
  });

  protected readonly referenceSections = computed<IChatComposerReferenceSection[]>(() => {
    const references = this.references();

    return [
      {
        kind: 'prompt',
        label: REFERENCE_SECTION_LABELS['prompt'],
        references: references.filter((reference) => reference.kind === 'prompt'),
      },
      {
        kind: 'skill',
        label: REFERENCE_SECTION_LABELS['skill'],
        references: references.filter((reference) => reference.kind === 'skill'),
      },
      {
        kind: 'tool',
        label: REFERENCE_SECTION_LABELS['tool'],
        references: references.filter((reference) => reference.kind === 'tool'),
      },
    ];
  });

  constructor() {
    effect(() => {
      this.references();
      this.expandedPromptReferenceId();
      this.promptVariableTextareaRefs();

      queueMicrotask(() => {
        for (const textareaRef of this.promptVariableTextareaRefs()) {
          this.resizeTextarea(textareaRef.nativeElement);
        }
      });
    });
  }

  protected onReferenceClick(reference: IChatComposerReference): void {
    if (reference.kind === 'prompt') {
      this.togglePromptReference.emit(reference.id);
    }
  }

  protected onPromptVariableChange(
    referenceId: string,
    variableName: string,
    value: string,
    textarea: HTMLTextAreaElement,
  ): void {
    this.promptVariableChange.emit({
      referenceId,
      variableName,
      value,
    });
    this.resizeTextarea(textarea);
  }

  private resizeTextarea(textarea: HTMLTextAreaElement): void {
    const styles = globalThis.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight);
    const paddingTop = Number.parseFloat(styles.paddingTop);
    const paddingBottom = Number.parseFloat(styles.paddingBottom);
    const borderTop = Number.parseFloat(styles.borderTopWidth);
    const borderBottom = Number.parseFloat(styles.borderBottomWidth);
    const safeLineHeight = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 20;
    const chromeHeight = paddingTop + paddingBottom + borderTop + borderBottom;
    const minHeight = safeLineHeight + chromeHeight;
    const maxHeight = safeLineHeight * 3 + chromeHeight;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }
}