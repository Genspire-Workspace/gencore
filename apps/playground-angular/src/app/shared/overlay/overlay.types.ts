import type {
  ConnectedPosition,
  FlexibleConnectedPositionStrategy,
  GlobalPositionStrategy,
  OverlayConfig,
  OverlayRef,
} from '@angular/cdk/overlay';
import type { ElementRef, TemplateRef, ViewContainerRef } from '@angular/core';
import type { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import type { AppOverlayHandle } from './overlay-ref';

export type OverlayOrigin = ElementRef<HTMLElement> | HTMLElement;
export type OverlayPortal<T = unknown> = ComponentPortal<T> | TemplatePortal<unknown>;
export type OverlayTreeParent = AppOverlayHandle | string | null | undefined;
export type OverlayKind = 'modal' | 'dropdown';

export interface IOverlayTreeOptions {
  parent?: OverlayTreeParent;
}

export interface IOverlayBaseOptions {
  panelClass?: string | string[];
  backdropClass?: string | string[];
  hasBackdrop?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnDetach?: boolean;
  disposeOnNavigation?: boolean;
  tree?: IOverlayTreeOptions;
}

export interface IModalOverlayOptions extends IOverlayBaseOptions {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
}

export interface IDropdownOverlayOptions extends IOverlayBaseOptions {
  origin: OverlayOrigin;
  offsetX?: number;
  offsetY?: number;
  positions?: ConnectedPosition[];
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  matchOriginWidth?: boolean;
  flexibleDimensions?: boolean;
  push?: boolean;
  viewportMargin?: number;
  lockedPosition?: boolean;
}

export interface ITemplateOverlayContext<TData = unknown> {
  $implicit: AppOverlayHandle;
  overlay: AppOverlayHandle;
  data?: TData;
}

export interface ITemplateOverlayPortalOptions<TData = unknown> {
  templateRef: TemplateRef<unknown>;
  viewContainerRef: ViewContainerRef;
  data?: TData;
}

export interface IOverlayHandleInit {
  id: string;
  kind: OverlayKind;
  overlayRef: OverlayRef;
  config: OverlayConfig;
  parentId: string | null;
}

export type OverlayPositionStrategy =
  | FlexibleConnectedPositionStrategy
  | GlobalPositionStrategy;
