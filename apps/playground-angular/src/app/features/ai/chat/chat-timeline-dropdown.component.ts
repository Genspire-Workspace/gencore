import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../../../icons/icon.component';
import { OverlayService } from '../../../shared/overlay';
import type { AppOverlayHandle } from '../../../shared/overlay';

export interface IChatTimelineDropdownOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-ai-chat-timeline-dropdown',
  imports: [CommonModule, IconComponent],
  template: `
    @if (options().length > 0) {
      <button
        class="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content transition hover:border-base-content/25 hover:bg-base-200"
        type="button"
        (click)="toggleDropdown(trigger)"
        #trigger
      >
        <span class="truncate">{{ selectedLabel() }}</span>
        <app-icon iconName="expand_more" size="sm" aria-hidden="true" />
      </button>
    }

    <ng-template #dropdown let-overlay>
      <div class="w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-xl">
        <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
          @for (option of options(); track option.id) {
            <button
              class="block w-full rounded-2xl border px-4 py-3 text-left transition"
              [class.border-primary]="option.id === selectedId()"
              [class.bg-base-200]="option.id === selectedId()"
              [class.border-base-300]="option.id !== selectedId()"
              [class.bg-base]="option.id !== selectedId()"
              type="button"
              (click)="selectTimeline(option.id, overlay)"
            >
              <div class="text-sm font-semibold text-base-content">{{ option.label }}</div>
            </button>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class ChatTimelineDropdownComponent {
  readonly options = input<IChatTimelineDropdownOption[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly select = output<string | null>();

  @ViewChild('dropdown', { static: true })
  private readonly dropdownTemplate!: TemplateRef<unknown>;

  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  private activeDropdownHandle: AppOverlayHandle | null = null;

  protected readonly selectedLabel = computed(() => {
    const selectedId = this.selectedId();
    return this.options().find((option) => option.id === selectedId)?.label ?? 'Select timeline';
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.activeDropdownHandle?.close());
  }

  protected toggleDropdown(origin: HTMLElement): void {
    if (this.activeDropdownHandle) {
      this.activeDropdownHandle.close();
      return;
    }

    const handle = this.overlayService.createDropdownTemplate(
      {
        templateRef: this.dropdownTemplate,
        viewContainerRef: this.viewContainerRef,
      },
      {
        origin,
        hasBackdrop: true,
        minWidth: '16rem',
        panelClass: 'app-chat-timeline-dropdown-overlay',
        offsetY: 8,
      },
    );

    this.activeDropdownHandle = handle;
    handle.afterClosed$.subscribe(() => {
      if (this.activeDropdownHandle?.id === handle.id) {
        this.activeDropdownHandle = null;
      }
    });
  }

  protected selectTimeline(timelineId: string, overlay: AppOverlayHandle): void {
    this.select.emit(timelineId);
    overlay.close();
  }
}
