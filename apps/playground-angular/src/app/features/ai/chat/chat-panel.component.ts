// file: apps\playground-angular\src\app\features\ai\chat\chat-panel.component.ts

import { Component, computed, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHistoryComponent } from './chat-history.component';
import { ChatComposerComponent } from './chat-composer.component';
import { ChatTimelineDropdownComponent } from './chat-timeline-dropdown.component';
import type {
  IChatComposerAttachment,
  IChatComposerReference,
  IUiChatMessageActionEvent,
  IUiChatMessageFeedbackEvent,
} from './chat-message.types';
import type { IAiSessionClientState } from '../sessions/ai-session-types';

@Component({
  selector: 'app-ai-chat-panel',
  host: {
    class:
      'flex h-full min-h-0 flex-col gap-4 overflow-hidden rounded-3xl border border-base-300 bg-base-100 p-4',
  },
  imports: [CommonModule, ChatHistoryComponent, ChatComposerComponent, ChatTimelineDropdownComponent],
  template: `
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <h2 class="truncate text-lg font-semibold text-base-content">
          {{ title() || 'Untitled session' }}
        </h2>

        @if (timelineOptions().length > 0) {
          <app-ai-chat-timeline-dropdown
            [options]="timelineOptions()"
            [selectedId]="activeTimelineId()"
            (select)="timelineChange.emit($event)"
          />
        }
      </div>

      <span class="rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content/70">
        {{ messageCount() }} message{{ messageCount() === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <app-ai-chat-history
        [sessionId]="sessionState()?.sessionId ?? null"
        [messages]="messages()"
        [editingMessageId]="editingMessageId()"
        [loading]="loading()"
        [sending]="sending()"
        [(prompt)]="prompt"
        [(attachments)]="attachments"
        [(editingPrompt)]="editingPrompt"
        [(editingAttachments)]="editingAttachments"
        [(editingReferences)]="editingReferences"
        (edit)="edit.emit($event)"
        (submit)="send.emit()"
        (cancel)="cancel.emit()"
        (cancelEdit)="cancelEdit.emit()"
        (feedback)="feedback.emit($event)"
        (regenerate)="regenerate.emit($event)"
        (branch)="branch.emit($event)"
      />

      <app-ai-chat-composer
        [(prompt)]="prompt"
        [(attachments)]="attachments"
        [(references)]="references"
        [sending]="sending()"
        [submitLocked]="isEditing()"
        [state]="composerState()"
        (submit)="send.emit()"
        (cancel)="cancel.emit()"
      />
    </div>
  `,
})
export class ChatPanelComponent {
  readonly sessionState = input<IAiSessionClientState | null>(null);
  readonly loading = input(false);
  readonly sending = input(false);

  readonly prompt = model('');
  readonly attachments = model<IChatComposerAttachment[]>([]);
  readonly references = model<IChatComposerReference[]>([]);
  readonly editingPrompt = model('');
  readonly editingAttachments = model<IChatComposerAttachment[]>([]);
  readonly editingReferences = model<IChatComposerReference[]>([]);

  readonly send = output<void>();
  readonly cancel = output<void>();
  readonly edit = output<IUiChatMessageActionEvent>();
  readonly feedback = output<IUiChatMessageFeedbackEvent>();
  readonly regenerate = output<IUiChatMessageActionEvent>();
  readonly branch = output<IUiChatMessageActionEvent>();
  readonly timelineChange = output<string | null>();
  readonly cancelEdit = output<void>();

  protected readonly title = computed(
    () => this.sessionState()?.graph?.session?.title ?? '',
  );
  protected readonly messages = computed(
    () => this.sessionState()?.messages ?? [],
  );
  protected readonly activeTimelineId = computed(
    () => this.sessionState()?.activeTimelineId ?? null,
  );
  protected readonly editingDraft = computed(
    () => this.sessionState()?.editingDraft ?? null,
  );
  protected readonly editingMessageId = computed(
    () => this.editingDraft()?.messageId ?? null,
  );
  protected readonly isEditing = computed(() => this.editingMessageId() !== null);
  protected readonly messageCount = computed(() => this.messages().length);
  protected readonly composerState = computed(() => {
    if (this.sending()) {
      return 'generating' as const;
    }

    if (this.isEditing()) {
      return 'editing' as const;
    }

    if (this.attachments().length > 0) {
      return 'uploading' as const;
    }

    if (this.prompt().trim().length > 0 || this.references().length > 0) {
      return 'writing' as const;
    }

    return 'idle' as const;
  });
  protected readonly timelineOptions = computed(() => {
    const state = this.sessionState();
    const graph = state?.graph;
    if (!graph) {
      return [];
    }

    const turnCountsByTimelineId = new Map<string, number>();
    for (const timelineTurn of graph.timelineTurns) {
      turnCountsByTimelineId.set(
        timelineTurn.timelineId,
        (turnCountsByTimelineId.get(timelineTurn.timelineId) ?? 0) + 1,
      );
    }

    return [...graph.timelines]
      .sort((left, right) => {
        if (left.id === graph.session.defaultTimelineId) return -1;
        if (right.id === graph.session.defaultTimelineId) return 1;
        return (left.createdAt || '').localeCompare(right.createdAt || '');
      })
      .map((timeline, index) => {
        const turnCount = turnCountsByTimelineId.get(timeline.id) ?? 0;
        const baseLabel = timeline.name?.trim() || `Timeline ${index + 1}`;
        const suffix = turnCount === 1 ? '1 turn' : `${turnCount} turns`;
        return {
          id: timeline.id,
          label: timeline.isDefault ? `${baseLabel} | ${suffix} | default` : `${baseLabel} | ${suffix}`,
        };
      });
  });
}
