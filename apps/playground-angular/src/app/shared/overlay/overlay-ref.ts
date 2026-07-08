import { Subject } from 'rxjs';
import type { OverlayRef } from '@angular/cdk/overlay';
import type { IOverlayHandleInit, OverlayKind } from './overlay.types';

export class AppOverlayHandle {
  readonly id: string;
  readonly kind: OverlayKind;
  readonly overlayRef: OverlayRef;
  readonly parentId: string | null;
  readonly afterClosed$ = new Subject<void>();

  private readonly closeBranchFn: (id: string) => void;
  private readonly childIds = new Set<string>();
  private closed = false;

  constructor(
    init: IOverlayHandleInit,
    closeBranchFn: (id: string) => void,
  ) {
    this.id = init.id;
    this.kind = init.kind;
    this.overlayRef = init.overlayRef;
    this.parentId = init.parentId;
    this.closeBranchFn = closeBranchFn;
  }

  hasParent(): boolean {
    return this.parentId !== null;
  }

  hasChildren(): boolean {
    return this.childIds.size > 0;
  }

  getChildIds(): string[] {
    return [...this.childIds];
  }

  attachChild(childId: string): void {
    this.childIds.add(childId);
  }

  detachChild(childId: string): void {
    this.childIds.delete(childId);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closeBranchFn(this.id);
  }

  markClosed(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.afterClosed$.next();
    this.afterClosed$.complete();
  }
}
