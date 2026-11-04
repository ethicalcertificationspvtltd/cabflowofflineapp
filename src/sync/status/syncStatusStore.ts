import {create} from 'zustand';
import type {GlobalSyncPhase, SyncRecordStatus} from '../../shared/types/sync';

export interface SyncStatusState {
  online: boolean;
  phase: GlobalSyncPhase;
  lastSyncAt: string | null;
  lastError: string | null;
  outbox: Record<SyncRecordStatus, number>;
  media: Record<SyncRecordStatus, number>;
  unresolvedConflicts: number;
  setOnline: (online: boolean) => void;
  setPhase: (phase: GlobalSyncPhase) => void;
  setLastSync: (at: string | null, error?: string | null) => void;
  setCounts: ( partial: {
    outbox?: Record<SyncRecordStatus, number>;
    media?: Record<SyncRecordStatus, number>;
    unresolvedConflicts?: number;
  }) => void;
}

const emptyCounts = (): Record<SyncRecordStatus, number> => ({
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  conflict: 0,
});

export const useSyncStatusStore = create<SyncStatusState>(set => ({
  online: true,
  phase: 'idle',
  lastSyncAt: null,
  lastError: null,
  outbox: emptyCounts(),
  media: emptyCounts(),
  unresolvedConflicts: 0,
  setOnline: online => set({online}),
  setPhase: phase => set({phase}),
  setLastSync: (at, error = null) =>
    set({lastSyncAt: at, lastError: error}),
  setCounts: partial =>
    set(state => ({
      outbox: partial.outbox ?? state.outbox,
      media: partial.media ?? state.media,
      unresolvedConflicts:
        partial.unresolvedConflicts ?? state.unresolvedConflicts,
    })),
}));

export function pendingWorkCount(state: SyncStatusState): number {
  return (
    state.outbox.pending +
    state.outbox.failed +
    state.outbox.syncing +
    state.media.pending +
    state.media.failed +
    state.unresolvedConflicts
  );
}
