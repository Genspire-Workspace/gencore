import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-tooltip-surface',
  standalone: true,
  template: `
    <div
      class="max-w-64 rounded-xl bg-neutral px-3 py-2 text-xs font-medium leading-tight text-neutral-content shadow-2xl"
      [attr.id]="tooltipId()"
      role="tooltip"
    >
      {{ message() }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent {
  readonly message = input.required<string>();
  readonly tooltipId = input.required<string>();
}
