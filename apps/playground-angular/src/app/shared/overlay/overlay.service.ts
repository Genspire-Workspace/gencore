import {
  FlexibleConnectedPositionStrategy,
  GlobalPositionStrategy,
  Overlay,
  type ConnectedPosition,
  type OverlayConfig,
  type OverlayRef,
} from '@angular/cdk/overlay';
import {
  ComponentPortal,
  TemplatePortal,
} from '@angular/cdk/portal';
import { ElementRef, inject, Injectable } from '@angular/core';
import {
  AppOverlayHandle,
} from './overlay-ref';
import type {
  IDropdownOverlayOptions,
  IModalOverlayOptions,
  IOverlayBaseOptions,
  ITemplateOverlayPortalOptions,
  OverlayOrigin,
  OverlayPortal,
  OverlayPositionStrategy,
} from './overlay.types';

const DEFAULT_DROPDOWN_POSITIONS: ConnectedPosition[] = [
  {
    originX: 'start',
    originY: 'bottom',
    overlayX: 'start',
    overlayY: 'top',
    offsetY: 8,
  },
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'bottom',
    offsetY: -8,
  },
];

@Injectable({
  providedIn: 'root',
})
export class OverlayService {
  private readonly overlay = inject(Overlay);
  private readonly handles = new Map<string, AppOverlayHandle>();

  createModal<T>(
    portal: OverlayPortal<T>,
    options: IModalOverlayOptions = {},
  ): AppOverlayHandle {
    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    const overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      hasBackdrop: options.hasBackdrop ?? true,
      backdropClass: options.backdropClass ?? 'cdk-overlay-dark-backdrop',
      panelClass: options.panelClass,
      disposeOnNavigation: options.disposeOnNavigation ?? true,
      width: options.width,
      minWidth: options.minWidth,
      maxWidth: options.maxWidth,
      height: options.height,
      minHeight: options.minHeight,
      maxHeight: options.maxHeight,
    });

    return this.registerOverlay('modal', overlayRef, positionStrategy, portal, options);
  }

  createDropdown<T>(
    portal: OverlayPortal<T>,
    options: IDropdownOverlayOptions,
  ): AppOverlayHandle {
    const origin = this.resolveOrigin(options.origin);
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions(options.positions ?? DEFAULT_DROPDOWN_POSITIONS)
      .withFlexibleDimensions(options.flexibleDimensions ?? false)
      .withPush(options.push ?? true)
      .withViewportMargin(options.viewportMargin ?? 8)
      .withLockedPosition(options.lockedPosition ?? false);

    const overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: options.hasBackdrop ?? true,
      backdropClass: options.backdropClass ?? 'cdk-overlay-transparent-backdrop',
      panelClass: options.panelClass,
      disposeOnNavigation: options.disposeOnNavigation ?? true,
      width: options.width,
      minWidth: options.minWidth,
      maxWidth: options.maxWidth,
    });

    if (options.matchOriginWidth) {
      overlayRef.updateSize({
        width: `${origin.nativeElement.getBoundingClientRect().width}px`,
      });
    }

    if (options.offsetX || options.offsetY) {
      this.applyDropdownOffsets(positionStrategy, options.offsetX ?? 0, options.offsetY ?? 0);
    }

    return this.registerOverlay('dropdown', overlayRef, positionStrategy, portal, options);
  }

  createTemplatePortal<TData = unknown>(
    options: ITemplateOverlayPortalOptions<TData>,
    handle: AppOverlayHandle,
  ): TemplatePortal {
    return new TemplatePortal(
      options.templateRef,
      options.viewContainerRef,
      {
        $implicit: handle,
        overlay: handle,
        data: options.data,
      },
    );
  }

  createModalTemplate<TData = unknown>(
    portalOptions: ITemplateOverlayPortalOptions<TData>,
    options: IModalOverlayOptions = {},
  ): AppOverlayHandle {
    const positionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    const overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      hasBackdrop: options.hasBackdrop ?? true,
      backdropClass: options.backdropClass ?? 'cdk-overlay-dark-backdrop',
      panelClass: options.panelClass,
      disposeOnNavigation: options.disposeOnNavigation ?? true,
      width: options.width,
      minWidth: options.minWidth,
      maxWidth: options.maxWidth,
      height: options.height,
      minHeight: options.minHeight,
      maxHeight: options.maxHeight,
    });

    const handle = this.createHandle('modal', overlayRef, options);
    const portal = this.createTemplatePortal(portalOptions, handle);
    this.attachHandle(handle, portal, options);
    return handle;
  }

  createDropdownTemplate<TData = unknown>(
    portalOptions: ITemplateOverlayPortalOptions<TData>,
    options: IDropdownOverlayOptions,
  ): AppOverlayHandle {
    const origin = this.resolveOrigin(options.origin);
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(origin)
      .withPositions(options.positions ?? DEFAULT_DROPDOWN_POSITIONS)
      .withFlexibleDimensions(options.flexibleDimensions ?? false)
      .withPush(options.push ?? true)
      .withViewportMargin(options.viewportMargin ?? 8)
      .withLockedPosition(options.lockedPosition ?? false);

    const overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: options.hasBackdrop ?? true,
      backdropClass: options.backdropClass ?? 'cdk-overlay-transparent-backdrop',
      panelClass: options.panelClass,
      disposeOnNavigation: options.disposeOnNavigation ?? true,
      width: options.width,
      minWidth: options.minWidth,
      maxWidth: options.maxWidth,
    });

    if (options.matchOriginWidth) {
      overlayRef.updateSize({
        width: `${origin.nativeElement.getBoundingClientRect().width}px`,
      });
    }

    if (options.offsetX || options.offsetY) {
      this.applyDropdownOffsets(positionStrategy, options.offsetX ?? 0, options.offsetY ?? 0);
    }

    const handle = this.createHandle('dropdown', overlayRef, options);
    const portal = this.createTemplatePortal(portalOptions, handle);
    this.attachHandle(handle, portal, options);
    return handle;
  }

  getHandle(id: string): AppOverlayHandle | null {
    return this.handles.get(id) ?? null;
  }

  close(id: string): void {
    if (!this.handles.has(id)) {
      return;
    }

    this.closeBranch(id);
  }

  closeAll(): void {
    for (const id of [...this.handles.keys()]) {
      this.closeBranch(id);
    }
  }

  private registerOverlay(
    kind: 'modal' | 'dropdown',
    overlayRef: OverlayRef,
    positionStrategy: OverlayPositionStrategy,
    portal: OverlayPortal,
    options: IOverlayBaseOptions,
  ): AppOverlayHandle {
    const handle = this.createHandle(kind, overlayRef, options);
    this.attachHandle(handle, portal, options);
    void positionStrategy;
    return handle;
  }

  private createHandle(
    kind: 'modal' | 'dropdown',
    overlayRef: OverlayRef,
    options: IOverlayBaseOptions,
  ): AppOverlayHandle {
    const id = crypto.randomUUID();
    const parentId = this.resolveParentId(options.tree?.parent);
    const config = overlayRef.getConfig() as OverlayConfig;
    const handle = new AppOverlayHandle(
      {
        id,
        kind,
        overlayRef,
        config,
        parentId,
      },
      (targetId) => this.closeBranch(targetId),
    );

    this.handles.set(id, handle);

    if (parentId) {
      this.handles.get(parentId)?.attachChild(id);
    }

    return handle;
  }

  private attachHandle(
    handle: AppOverlayHandle,
    portal: OverlayPortal,
    options: IOverlayBaseOptions,
  ): void {
    handle.overlayRef.attach(portal);
    handle.overlayRef.updatePosition();

    if (options.closeOnBackdropClick ?? true) {
      handle.overlayRef.backdropClick().subscribe(() => handle.close());
    }

    if (options.closeOnDetach ?? true) {
      handle.overlayRef.detachments().subscribe(() => this.disposeHandle(handle.id));
    }
  }

  private closeBranch(id: string): void {
    const handle = this.handles.get(id);
    if (!handle) {
      return;
    }

    for (const childId of handle.getChildIds()) {
      this.closeBranch(childId);
    }

    handle.overlayRef.dispose();
    this.disposeHandle(id);
  }

  private disposeHandle(id: string): void {
    const handle = this.handles.get(id);
    if (!handle) {
      return;
    }

    if (handle.parentId) {
      this.handles.get(handle.parentId)?.detachChild(handle.id);
    }

    this.handles.delete(id);
    handle.markClosed();
  }

  private resolveParentId(parent: AppOverlayHandle | string | null | undefined): string | null {
    if (!parent) {
      return null;
    }

    return typeof parent === 'string' ? parent : parent.id;
  }

  private resolveOrigin(origin: OverlayOrigin): ElementRef<HTMLElement> {
    return origin instanceof ElementRef ? origin : new ElementRef(origin);
  }

  private applyDropdownOffsets(
    positionStrategy: FlexibleConnectedPositionStrategy,
    offsetX: number,
    offsetY: number,
  ): void {
    const positions = positionStrategy.positions.map((position) => ({
      ...position,
      offsetX: (position.offsetX ?? 0) + offsetX,
      offsetY: (position.offsetY ?? 0) + offsetY,
    }));

    positionStrategy.withPositions(positions);
  }
}
