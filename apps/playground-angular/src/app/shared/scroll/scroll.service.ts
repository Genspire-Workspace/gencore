import { DOCUMENT } from '@angular/common';
import { ElementRef, inject, Injectable } from '@angular/core';

export type ScrollTarget = string | HTMLElement | ElementRef<HTMLElement>;
export type ScrollContainer = Window | HTMLElement | ElementRef<HTMLElement> | null | undefined;

export interface IScrollOptions {
  behavior?: ScrollBehavior;
  container?: ScrollContainer;
  offset?: number;
}

export interface IScrollToTargetOptions extends IScrollOptions {
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private readonly document = inject(DOCUMENT);

  scrollUp(options: IScrollOptions = {}): void {
    this.scrollToPosition(0, options);
  }

  scrollDown(options: IScrollOptions = {}): void {
    const container = this.resolveContainer(options.container);

    if (this.isWindow(container)) {
      const root = this.document.scrollingElement ?? this.document.documentElement;
      this.scrollToPosition(root.scrollHeight, options);
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: options.behavior ?? 'auto',
    });
  }

  scrollToTarget(target: ScrollTarget, options: IScrollToTargetOptions = {}): void {
    const element = this.resolveTarget(target);
    if (!element) {
      return;
    }

    const container = this.resolveContainer(options.container);
    const offset = options.offset ?? 0;
    const behavior = options.behavior ?? 'auto';

    if (this.isWindow(container)) {
      const top = window.scrollY + element.getBoundingClientRect().top - offset;
      window.scrollTo({ top, behavior });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const top = container.scrollTop + elementRect.top - containerRect.top - offset;

    container.scrollTo({
      top,
      behavior,
    });
  }

  private scrollToPosition(top: number, options: IScrollOptions): void {
    const container = this.resolveContainer(options.container);
    const behavior = options.behavior ?? 'auto';
    const offset = options.offset ?? 0;
    const nextTop = Math.max(0, top - offset);

    if (this.isWindow(container)) {
      window.scrollTo({ top: nextTop, behavior });
      return;
    }

    container.scrollTo({
      top: nextTop,
      behavior,
    });
  }

  private resolveTarget(target: ScrollTarget): HTMLElement | null {
    if (typeof target === 'string') {
      return this.document.querySelector<HTMLElement>(target);
    }

    if (target instanceof ElementRef) {
      return target.nativeElement;
    }

    return target;
  }

  private resolveContainer(container: ScrollContainer): Window | HTMLElement {
    if (!container) {
      return window;
    }

    if (container instanceof ElementRef) {
      return container.nativeElement;
    }

    return container;
  }

  private isWindow(container: Window | HTMLElement): container is Window {
    return 'scrollTo' in container && !('scrollHeight' in container);
  }
}
