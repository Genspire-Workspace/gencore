import { CommonModule } from '@angular/common';
import {
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  inject,
  input,
  output,
} from '@angular/core';
import type { AppOverlayHandle } from '../../../../shared/overlay';
import { OverlayService } from '../../../../shared/overlay';
import { IconComponent } from '../../../../icons/icon.component';
import { PromptManagerComponent } from './prompt-manager.component';

@Component({
  selector: 'app-ai-prompt-manager-trigger',
  standalone: true,
  imports: [CommonModule, IconComponent, PromptManagerComponent],
  template: `
    <button
      class="flex w-full items-center justify-center gap-2 rounded-2xl border border-base-300 px-4 py-3 text-sm font-medium text-base-content transition hover:border-base-content/30 hover:bg-base-200"
      type="button"
      (click)="open()"
      [disabled]="disabled()"
    >
      <app-icon iconName="description" size="sm" aria-hidden="true" />
      {{ label() }}
    </button>

    <ng-template #manager let-overlay>
      <app-ai-prompt-manager [overlayHandle]="overlay" />
    </ng-template>
  `,
})
export class PromptManagerTriggerComponent {
  readonly label = input('Manage Prompts');
  readonly disabled = input(false);

  readonly opened = output<void>();
  readonly closed = output<void>();

  @ViewChild('manager', { static: true })
  private readonly managerTemplate!: TemplateRef<unknown>;

  private readonly overlayService = inject(OverlayService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  private handle: AppOverlayHandle | null = null;

  open(): void {
    if (this.handle) {
      return;
    }

    const handle = this.overlayService.createModalTemplate(
      {
        templateRef: this.managerTemplate,
        viewContainerRef: this.viewContainerRef,
      },
      {
        width: 'auto',
        panelClass: 'app-prompt-manager-overlay',
      },
    );

    this.handle = handle;
    this.opened.emit();

    handle.afterClosed$.subscribe(() => {
      if (this.handle?.id === handle.id) {
        this.handle = null;
        this.closed.emit();
      }
    });
  }
}
