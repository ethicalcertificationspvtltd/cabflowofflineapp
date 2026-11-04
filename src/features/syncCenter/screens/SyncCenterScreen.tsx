import React, {useCallback, useState} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {OutboxItem, ConflictRecord} from '../../../shared/types/sync';
import {getServices} from '../../../app/services';
import {
  pendingWorkCount,
  useSyncStatusStore,
} from '../../../sync/status/syncStatusStore';
import {OfflineBanner} from '../../../shared/ui/OfflineBanner';
import {colors, spacing, typography} from '../../../shared/ui/theme';

export function SyncCenterScreen(): React.JSX.Element {
  const syncState = useSyncStatusStore();
  const [failed, setFailed] = useState<OutboxItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const {outboxRepo, conflicts: conflictRepo, refreshCounts} = getServices();
    setFailed(await outboxRepo.listFailed());
    setConflicts(await conflictRepo.listUnresolved());
    await refreshCounts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const runSync = async () => {
    setBusy(true);
    try {
      const {syncEngine, refreshCounts} = getServices();
      await syncEngine.runFullSync();
      await refreshCounts();
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const retryItem = async (id: string) => {
    const {syncEngine, refreshCounts} = getServices();
    await syncEngine.getOutbox().requeue(id);
    await syncEngine.runFullSync();
    await refreshCounts();
    await reload();
  };

  const pending = pendingWorkCount(syncState);

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={styles.title}>Sync Center</Text>
        <Text style={styles.subtitle}>
          Outbox, media queue, and unresolved conflicts.
        </Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Pending" value={syncState.outbox.pending + syncState.media.pending} />
        <Stat label="Failed" value={syncState.outbox.failed + syncState.media.failed} />
        <Stat label="Conflicts" value={syncState.unresolvedConflicts} />
        <Stat label="Queued" value={pending} />
      </View>

      <Text style={styles.meta}>
        Last sync:{' '}
        {syncState.lastSyncAt
          ? new Date(syncState.lastSyncAt).toLocaleString()
          : 'never'}
      </Text>
      {syncState.lastError ? (
        <Text style={styles.error}>Last error: {syncState.lastError}</Text>
      ) : null}

      <Pressable
        style={[styles.cta, (!syncState.online || busy) && styles.ctaDisabled]}
        disabled={!syncState.online || busy}
        onPress={() => void runSync()}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>
            {syncState.online ? 'Sync now' : 'Offline — sync paused'}
          </Text>
        )}
      </Pressable>

      <Text style={styles.section}>Failed / conflict jobs</Text>
      <FlatList
        data={failed}
        keyExtractor={i => i.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No failed outbox jobs.</Text>
        }
        renderItem={({item}) => (
          <View style={styles.job}>
            <Text style={styles.jobTitle}>
              {item.entityType} · {item.operation} · {item.status}
            </Text>
            <Text style={styles.jobMeta}>
              attempts {item.attempts}
              {item.lastError ? ` · ${item.lastError}` : ''}
            </Text>
            <Pressable onPress={() => void retryItem(item.id)}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={{marginTop: spacing.md}}>
            <Text style={styles.section}>Unresolved conflicts</Text>
            {conflicts.length === 0 ? (
              <Text style={styles.empty}>None</Text>
            ) : (
              conflicts.map(c => (
                <View key={c.id} style={styles.job}>
                  <Text style={styles.jobTitle}>{c.strategy}</Text>
                  <Text style={styles.jobMeta}>{c.reason}</Text>
                </View>
              ))
            )}
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

function Stat({label, value}: {label: string; value: number}): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.paper},
  header: {paddingHorizontal: spacing.lg, paddingTop: spacing.md},
  title: {...typography.title, color: colors.ink},
  subtitle: {...typography.subtitle, marginTop: 4},
  stats: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.field,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: {fontSize: 18, fontWeight: '700', color: colors.ink},
  statLabel: {fontSize: 11, color: colors.inkMuted, marginTop: 2},
  meta: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    color: colors.inkMuted,
    fontSize: 12,
  },
  error: {
    paddingHorizontal: spacing.lg,
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  cta: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaDisabled: {opacity: 0.5},
  ctaText: {color: '#fff', fontWeight: '700'},
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    fontWeight: '700',
    color: colors.ink,
  },
  list: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xl},
  empty: {color: colors.inkMuted, marginTop: spacing.sm},
  job: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  jobTitle: {fontWeight: '600', color: colors.ink},
  jobMeta: {marginTop: 4, color: colors.inkMuted, fontSize: 12},
  retry: {marginTop: 8, color: colors.accent, fontWeight: '700'},
});
