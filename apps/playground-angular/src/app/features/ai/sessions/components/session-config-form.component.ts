// file: apps\playground-angular\src\app\features\ai\sessions\components\session-config-form.component.ts

import { CommonModule } from '@angular/common';
import { Component, effect, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  IAiSessionConfigDraft,
  IAiSessionResponse,
  IAiSessionSettings,
} from '../ai-session-types';

@Component({
  selector: 'app-ai-session-config-form',
  host: {
    class: 'block',
  },
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">
      <div>
        <h3 class="text-lg font-semibold text-base-content">Session Settings</h3>
        <p class="mt-1 text-sm text-base-content/60">
          Edit session metadata and generation defaults.
        </p>
      </div>

      <div class="space-y-4">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content/80">Title</span>
          <input
            class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
            type="text"
            [ngModel]="title()"
            (ngModelChange)="title.set($event)"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content/80">Provider</span>
          <input
            class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
            type="text"
            [ngModel]="provider()"
            (ngModelChange)="provider.set($event)"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content/80">Model</span>
          <input
            class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
            type="text"
            [ngModel]="model()"
            (ngModelChange)="model.set($event)"
          />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content/80">System Prompt</span>
          <textarea
            class="min-h-28 w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
            [ngModel]="systemPrompt()"
            (ngModelChange)="systemPrompt.set($event)"
          ></textarea>
        </label>

        <div class="grid gap-4 sm:grid-cols-3">
          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">Temperature</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="number"
              step="0.1"
              min="0"
              max="2"
              [ngModel]="temperature()"
              (ngModelChange)="temperature.set($event)"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">Top P</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="number"
              step="0.1"
              min="0"
              max="1"
              [ngModel]="topP()"
              (ngModelChange)="topP.set($event)"
            />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-medium text-base-content/80">Max Tokens</span>
            <input
              class="w-full rounded-2xl border border-base-300 bg-base px-4 py-3 text-base-content outline-none transition focus:border-primary"
              type="number"
              min="1"
              step="1"
              [ngModel]="maxTokens()"
              (ngModelChange)="maxTokens.set($event)"
            />
          </label>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3">
        <button
          class="rounded-2xl border border-base-300 px-4 py-2.5 text-sm font-medium text-base-content transition hover:bg-base-200"
          type="button"
          (click)="cancel.emit()"
        >
          Close
        </button>

        <button
          class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-content transition hover:bg-accent/80"
          type="button"
          (click)="save.emit(readDraft())"
        >
          Save
        </button>
      </div>
    </div>
  `,
})
export class SessionConfigFormComponent {
  readonly session = input.required<IAiSessionResponse>();

  readonly save = output<IAiSessionConfigDraft>();
  readonly cancel = output<void>();

  readonly title = model('');
  readonly provider = model('');
  readonly model = model('');
  readonly systemPrompt = model('');
  readonly temperature = model('');
  readonly topP = model('');
  readonly maxTokens = model('');

  constructor() {
    effect(() => {
      const session = this.session();
      const settings = this.readSettings(session);

      this.title.set(session.title || '');
      this.provider.set(settings.provider || '');
      this.model.set(settings.model || '');
      this.systemPrompt.set(settings.systemPrompt || '');
      this.temperature.set(settings.temperature?.toString() || '');
      this.topP.set(settings.topP?.toString() || '');
      this.maxTokens.set(settings.maxTokens?.toString() || '');
    });
  }

  protected readDraft(): IAiSessionConfigDraft {
    return {
      title: this.title(),
      provider: this.provider(),
      model: this.model(),
      systemPrompt: this.systemPrompt(),
      temperature: this.temperature(),
      topP: this.topP(),
      maxTokens: this.maxTokens(),
    };
  }

  private readSettings(session: IAiSessionResponse): IAiSessionSettings {
    const settings = session.settings;
    if (!settings || typeof settings !== 'object') {
      return {};
    }

    return {
      provider: typeof settings['provider'] === 'string' ? settings['provider'] : undefined,
      model: typeof settings['model'] === 'string' ? settings['model'] : undefined,
      systemPrompt: typeof settings['systemPrompt'] === 'string' ? settings['systemPrompt'] : undefined,
      temperature: typeof settings['temperature'] === 'number' ? settings['temperature'] : undefined,
      topP: typeof settings['topP'] === 'number' ? settings['topP'] : undefined,
      maxTokens: typeof settings['maxTokens'] === 'number' ? settings['maxTokens'] : undefined,
    };
  }
}
