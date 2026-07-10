import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../icons/icon.component';
import { ScrollService } from '../../../shared/scroll';

@Component({
  selector: 'app-chat-history-scroll-bottom',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <button
      #trigger
      class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-base-300 bg-base-100 text-base-content/70 shadow-lg transition hover:bg-base-200 hover:text-base-content"
      [class.opacity-0]="!visible()"
      [class.pointer-events-none]="!visible()"
      [class.translate-y-2]="!visible()"
      [class.opacity-100]="visible()"
      [class.translate-y-0]="visible()"
      type="button"
      (click)="scrollToBottom()"
      aria-label="Scroll to bottom"
    >
      <app-icon iconName="arrow_downward" size="sm" aria-hidden="true" />
    </button>
  `,
  styles: [
    `
      :host {
        display: block;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
    `,
  ],
})
export class ChatHistoryScrollBottomComponent {
  readonly scrollContainer = input.required<HTMLElement | null>();
  readonly threshold = input(150);

  readonly scrolled = output<void>();

  private readonly scrollService = inject(ScrollService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly distanceFromBottom = signal(0);

  readonly visible = computed(() => {
    this.scrollContainer();
    return this.distanceFromBottom() > this.threshold();
  });

  constructor() {
    effect((onCleanup) => {
      const container = this.scrollContainer();
      if (!container) {
        this.distanceFromBottom.set(0);
        return;
      }

      const syncDistance = () => {
        this.distanceFromBottom.set(
          container.scrollHeight - container.scrollTop - container.clientHeight,
        );
      };

      syncDistance();
      container.addEventListener('scroll', syncDistance, { passive: true });
      const resizeObserver = new ResizeObserver(() => syncDistance());
      resizeObserver.observe(container);

      onCleanup(() => {
        container.removeEventListener('scroll', syncDistance);
        resizeObserver.disconnect();
      });
    });

    this.destroyRef.onDestroy(() => {
      this.distanceFromBottom.set(0);
    });
  }

  scrollToBottom(): void {
    const container = this.scrollContainer();
    if (!container) {
      return;
    }

    this.scrollService.scrollDown({
      container,
      behavior: 'smooth',
    });
    this.scrolled.emit();
  }
}
