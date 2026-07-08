import { booleanAttribute, ComponentRef, Directive, ElementRef, inject, input, OnDestroy } from '@angular/core';
import {
  ConnectedPosition,
  FlexibleConnectedPositionStrategy,
  Overlay,
  OverlayRef,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { TooltipComponent } from './tooltip.component';

type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
    '(click)': 'hide()',
  },
})
export class TooltipDirective implements OnDestroy {
  readonly appTooltip = input('', { alias: 'appTooltip' });
  readonly tooltipPosition = input<TooltipPosition>('top');
  readonly tooltipOffset = input(10);
  readonly tooltipDisabled = input(false, { transform: booleanAttribute });

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly overlay = inject(Overlay);

  private overlayRef?: OverlayRef;
  private tooltipRef?: ComponentRef<TooltipComponent>;
  private positionStrategy?: FlexibleConnectedPositionStrategy;
  private readonly tooltipId = `app-tooltip-${crypto.randomUUID()}`;

  show(): void {
    if (this.tooltipDisabled()) {
      return;
    }

    const message = this.appTooltip().trim();
    if (!message) {
      this.hide();
      return;
    }

    const overlayRef = this.getOverlayRef();

    if (!overlayRef.hasAttached()) {
      this.tooltipRef = overlayRef.attach(new ComponentPortal(TooltipComponent));
    }

    this.tooltipRef?.setInput('message', message);
    this.tooltipRef?.setInput('tooltipId', this.tooltipId);
    this.hostRef.nativeElement.setAttribute('aria-describedby', this.tooltipId);
    overlayRef.updatePosition();
  }

  hide(): void {
    this.hostRef.nativeElement.removeAttribute('aria-describedby');
    this.overlayRef?.detach();
    this.tooltipRef = undefined;
  }

  ngOnDestroy(): void {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.tooltipRef = undefined;
  }

  private getOverlayRef(): OverlayRef {
    if (this.overlayRef) {
      this.updatePositionStrategy(this.positionStrategy);
      return this.overlayRef;
    }

    this.positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.hostRef)
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(8);

    this.updatePositionStrategy(this.positionStrategy);

    this.overlayRef = this.overlay.create({
      positionStrategy: this.positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      disposeOnNavigation: true,
      panelClass: 'app-tooltip-panel',
    });

    return this.overlayRef;
  }

  private updatePositionStrategy(positionStrategy: FlexibleConnectedPositionStrategy | null | undefined): void {
    if (!positionStrategy) {
      return;
    }

    positionStrategy.withPositions(this.getPositions());
  }

  private getPositions(): ConnectedPosition[] {
    const offset = this.tooltipOffset();

    switch (this.tooltipPosition()) {
      case 'right':
        return [
          {
            originX: 'end',
            originY: 'center',
            overlayX: 'start',
            overlayY: 'center',
            offsetX: offset,
          },
          {
            originX: 'start',
            originY: 'center',
            overlayX: 'end',
            overlayY: 'center',
            offsetX: -offset,
          },
        ];
      case 'bottom':
        return [
          {
            originX: 'center',
            originY: 'bottom',
            overlayX: 'center',
            overlayY: 'top',
            offsetY: offset,
          },
          {
            originX: 'center',
            originY: 'top',
            overlayX: 'center',
            overlayY: 'bottom',
            offsetY: -offset,
          },
        ];
      case 'left':
        return [
          {
            originX: 'start',
            originY: 'center',
            overlayX: 'end',
            overlayY: 'center',
            offsetX: -offset,
          },
          {
            originX: 'end',
            originY: 'center',
            overlayX: 'start',
            overlayY: 'center',
            offsetX: offset,
          },
        ];
      case 'top':
      default:
        return [
          {
            originX: 'center',
            originY: 'top',
            overlayX: 'center',
            overlayY: 'bottom',
            offsetY: -offset,
          },
          {
            originX: 'center',
            originY: 'bottom',
            overlayX: 'center',
            overlayY: 'top',
            offsetY: offset,
          },
        ];
    }
  }
}
