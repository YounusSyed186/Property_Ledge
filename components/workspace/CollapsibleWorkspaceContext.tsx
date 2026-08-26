'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  createCollapsibleWorkspaceStore,
  type CollapsibleWorkspaceStore,
  type WorkspaceSnapshot,
} from './collapsibleWorkspaceStore';

const CollapsibleWorkspaceContext = createContext<CollapsibleWorkspaceStore | null>(null);

export function CollapsibleWorkspaceProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const storeRef = useRef<CollapsibleWorkspaceStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCollapsibleWorkspaceStore(enabled);
  }

  const store = storeRef.current;

  useEffect(() => {
    if (!enabled) store.reset();
  }, [enabled, store]);

  return (
    <CollapsibleWorkspaceContext.Provider value={store}>
      {children}
    </CollapsibleWorkspaceContext.Provider>
  );
}

export function useCollapsibleWorkspaceOptional(): CollapsibleWorkspaceStore | null {
  return useContext(CollapsibleWorkspaceContext);
}

export function useCollapsibleWorkspaceSnapshot(): WorkspaceSnapshot | null {
  const store = useCollapsibleWorkspaceOptional();
  const getSnapshot = useMemo(
    () => () => (store ? store.getSnapshot() : null),
    [store]
  );
  const subscribe = useMemo(
    () => (cb: () => void) => (store ? store.subscribe(cb) : () => {}),
    [store]
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function useCollapsibleWorkspaceScrollHandlers() {
  const store = useCollapsibleWorkspaceOptional();
  return useMemo(
    () => ({
      onViewportScroll: store
        ? (detail: { scrollTop: number; direction: 'horizontal' | 'vertical' }) => {
            if (detail.direction === 'vertical') {
              store.reportBodyScroll(detail.scrollTop);
            }
          }
        : undefined,
      onWheelDelta: store
        ? (deltaY: number) => {
            store.reportWheelDelta(deltaY);
          }
        : undefined,
      compactToolbar: store?.getSnapshot().isCompact ?? false,
    }),
    [store]
  );
}
