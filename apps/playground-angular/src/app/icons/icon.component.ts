// file: apps/playground-angular/src/app/icons/icon.component.ts

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { findIcon, type IconEntry } from './icon-list';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<IconSize, string> = {
  sm: 'text-[18px]',
  md: 'text-[24px]',
  lg: 'text-[32px]',
  xl: 'text-[40px]',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="material-symbols-rounded inline-flex select-none leading-none align-middle"
      [class]="sizeClass()"
      [attr.aria-label]="icon()?.label"
      [attr.aria-hidden]="icon()?.label ? null : 'true'"
      [attr.role]="icon()?.label ? 'img' : 'presentation'"
      >{{ iconName() }}</span
    >
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        line-height: 0;
      }
    `,
  ],
})
export class IconComponent {
  readonly iconName = input.required<string>();

  readonly size = input<IconSize>('md');

  protected readonly sizeClass = () => SIZE_CLASSES[this.size()];

  protected readonly icon = (): IconEntry | undefined =>
    findIcon(this.iconName());
}