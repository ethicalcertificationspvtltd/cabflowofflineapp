import React, {useCallback, useState} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import type {AuditListItem} from '../../../entities/audit/types';
import {getServices} from '../../../app/services';
import {useAuthStore} from '../../auth/hooks/authStore';
import {OfflineBanner} from '../../../shared/ui/OfflineBanner';
import {colors, spacing, typography} from '../../../shared/ui/theme';
import type {HomeStackParamList} from '../../../app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props): React.JSX.Element {
  const user = useAuthStore(s => s.user);
  const [items, setItems] = useState<AuditListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }
    const {audits, refreshCounts} = getServices();
    const list = await audits.listAssigned(user.id);
    setItems(list);
    await refreshCounts();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const {syncEngine, refreshCounts} = getServices();
    await syncEngine.runFullSync();
    await refreshCounts();
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={styles.brand}>Cab Flo</Text>
        <Text style={styles.title}>Assigned audits</Text>
        <Text style={styles.subtitle}>
          Local source of truth after first sync — works offline.
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.clientId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No audits yet. Pull to sync when online.
          </Text>
        }
        renderItem={({item}) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('AuditDetail', {clientId: item.clientId})
            }>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <StatusChip
                syncStatus={item.syncStatus}
                localStatus={item.localStatus}
              />
            </View>
            <Text style={styles.rowMeta}>{item.siteName}</Text>
            <Text style={styles.rowMeta}>
              {item.assignmentStatus.replace('_', ' ')}
              {item.photoCount ? ` · ${item.photoCount} photo(s)` : ''}
              {item.isDraft ? ' · draft' : ''}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function StatusChip({
  syncStatus,
  localStatus,
}: {
  syncStatus: string;
  localStatus: string;
}): React.JSX.Element {
  const label =
    syncStatus === 'conflict'
      ? 'conflict'
      : syncStatus === 'pending' || syncStatus === 'failed'
        ? syncStatus
        : localStatus === 'draft'
          ? 'draft'
          : 'synced';
  const tone =
    label === 'conflict' || label === 'failed'
      ? styles.chipDanger
      : label === 'pending' || label === 'draft'
        ? styles.chipWarn
        : styles.chipOk;
  return (
    <View style={[styles.chip, tone]}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.paper},
  header: {paddingHorizontal: spacing.lg, paddingTop: spacing.md},
  brand: {color: colors.accent, fontWeight: '700', fontSize: 14},
  title: {...typography.title, color: colors.ink, marginTop: 4},
  subtitle: {...typography.subtitle, marginTop: 4, marginBottom: spacing.md},
  list: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xl},
  empty: {color: colors.inkMuted, marginTop: spacing.lg},
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {flex: 1, fontSize: 16, fontWeight: '600', color: colors.ink},
  rowMeta: {marginTop: 4, color: colors.inkMuted, fontSize: 13},
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipOk: {backgroundColor: colors.accentSoft},
  chipWarn: {backgroundColor: colors.warningSoft},
  chipDanger: {backgroundColor: colors.dangerSoft},
  chipText: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase'},
});
