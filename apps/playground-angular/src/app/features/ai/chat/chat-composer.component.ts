// file: apps\playground-angular\src\app\features\ai\chat\chat-composer.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../icons/icon.component';
import { TooltipDirective } from '../../../shared/tooltip';
import { ChatComposerBaseDirective } from './chat-composer.base';
import { ChatComposerTokenMenuComponent } from './chat-composer-token-menu.component';

@Component({
  selector: 'app-ai-chat-composer',
  host: {
    class: 'block',
  },
  imports: [CommonModule, FormsModule, IconComponent, TooltipDirective, ChatComposerTokenMenuComponent],
  template: `
    <form
      #composerRoot
      class="flex flex-col gap-3 rounded-3xl border border-base-300 bg-base p-2"
      (ngSubmit)="onSubmit()"
    >
      <div class="flex items-center justify-between px-2 pt-1">
        <div class="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/50">
          <span
            class="h-2 w-2 rounded-full"
            [class.bg-base-content/25]="state() === 'idle'"
            [class.bg-primary]="state() === 'writing' || state() === 'editing'"
            [class.bg-warning]="state() === 'uploading'"
            [class.bg-accent]="state() === 'generating'"
          ></span>
          {{ stateLabel() }}
        </div>
      </div>

      <textarea
        #promptTextarea
        class="w-full resize-none overflow-y-hidden border-0 bg-transparent p-2 text-base-content outline-none transition placeholder:text-base-content/40"
        [ngModel]="prompt()"
        (ngModelChange)="onPromptChange($event, promptTextarea)"
        (keydown)="onPromptKeydown($event)"
        (keyup)="onPromptSelectionChange(promptTextarea)"
        (click)="onPromptSelectionChange(promptTextarea)"
        (focus)="onPromptSelectionChange(promptTextarea)"
        name="prompt"
        placeholder="Ask something like: What is the capital of Spain?"
        [rows]="minRows()"
        [disabled]="sending()"
      ></textarea>

      <ng-template #tokenMenu let-overlay>
        <app-ai-chat-composer-token-menu
          [title]="tokenDropdownTitle()"
          [options]="filteredTokenSuggestions()"
          [highlightedIndex]="highlightedTokenOptionIndex()"
          (highlight)="setHighlightedTokenSuggestion($event)"
          (select)="selectTokenSuggestion($event, overlay)"
        />
      </ng-template>

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
                <app-icon iconName="close" size="sm" aria-hidden="true" />
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

      <div class="flex items-center justify-between gap-3 p-2">
        <button
          class="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-base-300 bg-base-100 leading-none text-base-content transition hover:border-base-content/30 hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          [disabled]="sending()"
          (click)="fileInput.click()"
          aria-label="Attach files"
          appTooltip="Attach files"
        >
          <app-icon iconName="attach_file" size="md" aria-hidden="true" />
        </button>

        <button
          [class]="
            sending()
              ? 'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-danger leading-none text-danger-content transition hover:bg-danger/80 disabled:cursor-not-allowed'
              : submitLocked()
                ? 'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-base-300 leading-none text-base-content/35 transition disabled:cursor-not-allowed'
                : 'inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary leading-none text-base-content transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-base-300'
          "
          type="submit"
          [disabled]="!canSend()"
          [appTooltip]="
            sending()
              ? 'Stop generation'
              : submitLocked()
                ? 'Finish or cancel the active edit first'
                : 'Send message'
          "
        >
          <app-icon
            [iconName]="sending() ? 'stop' : 'send'"
            size="md"
            aria-hidden="true"
          />
        </button>
      </div>
    </form>
  `,
})
export class ChatComposerComponent extends ChatComposerBaseDirective {}
