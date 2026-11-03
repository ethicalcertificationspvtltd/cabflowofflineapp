import React, {useCallback, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AuditListItem} from '../../../entities/audit/types';
import {getServices} from '../../../app/services';
import {useAuthStore} from '../../auth/hooks/authStore';
import {OfflineBanner} from '../../../shared/ui/OfflineBanner';
import {colors, spacing, typography} from '../../../shared/ui/theme';
import type {HomeStackParamList} from '../../../app/navigation/types';

export function OfflineDraftsScreen(): React.JSX.Element {
  const user = useAuthStore(s => s.user);
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [items, setItems] = useState<AuditListItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        return;
      }
      void getServices()
        .audits.listDrafts(user.id)
        .then(setItems);
    }, [user]),
  );

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <View style={styles.header}>
        <Text style={styles.title}>Offline drafts</Text>
        <Text style={styles.subtitle}>
          Pending local edits waiting for connectivity.
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.clientId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No offline drafts.</Text>
        }
        renderItem={({item}) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('AuditDetail', {clientId: item.clientId})
            }>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>
              {item.syncStatus} · updated {new Date(item.updatedAt).toLocaleString()}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.paper},
  header: {padding: spacing.lg, paddingBottom: spacing.sm},
  title: {...typography.title, color: colors.ink},
  subtitle: {...typography.subtitle, marginTop: 4},
  list: {paddingHorizontal: spacing.lg},
  empty: {color: colors.inkMuted, marginTop: spacing.md},
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: {fontWeight: '600', color: colors.ink, fontSize: 16},
  rowMeta: {marginTop: 4, color: colors.inkMuted, fontSize: 12},
});
