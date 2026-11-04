import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSyncStatusStore, pendingWorkCount} from '../../sync/status/syncStatusStore';
import {colors, spacing} from './theme';

export function OfflineBanner(): React.JSX.Element | null {
  const online = useSyncStatusStore(s => s.online);
  const phase = useSyncStatusStore(s => s.phase);
  const state = useSyncStatusStore();
  const pending = pendingWorkCount(state);

  if (online && phase === 'idle' && pending === 0) {
    return null;
  }

  let background = colors.syncSoft;
  let color = colors.sync;
  let label = 'Syncing…';

  if (!online) {
    background = colors.warningSoft;
    color = colors.offline;
    label =
      pending > 0
        ? `Offline · ${pending} change${pending === 1 ? '' : 's'} queued`
        : 'Offline · audits available locally';
  } else if (phase === 'error') {
    background = colors.dangerSoft;
    color = colors.danger;
    label = state.lastError ? `Sync error · ${state.lastError}` : 'Sync error';
  } else if (phase === 'pulling') {
    label = 'Pulling assignments…';
  } else if (phase === 'pushing') {
    label = 'Pushing outbox…';
  } else if (phase === 'uploading_media') {
    label = 'Uploading photos…';
  } else if (pending > 0) {
    label = `${pending} pending to sync`;
  }

  return (
    <View style={[styles.banner, {backgroundColor: background}]} accessibilityRole="text">
      <Text style={[styles.text, {color}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
