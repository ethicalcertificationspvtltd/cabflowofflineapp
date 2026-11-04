import React, {useState} from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import {useAuthStore} from '../../auth/hooks/authStore';
import {useSyncStatusStore} from '../../../sync/status/syncStatusStore';
import {getAppConfig} from '../../../shared/config/env';
import {
  PrefKeys,
  getPrefBool,
  setPrefBool,
  setPrefString,
  getPrefString,
} from '../../../shared/storage/mmkv';
import {colors, spacing, typography} from '../../../shared/ui/theme';
import {getServices} from '../../../app/services';

export function ProfileScreen(): React.JSX.Element {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const setOnline = useSyncStatusStore(s => s.setOnline);
  const online = useSyncStatusStore(s => s.online);
  const config = getAppConfig();
  const [retention, setRetention] = useState(
    Number(getPrefString(PrefKeys.retentionDays, String(config.auditRetentionDays))),
  );

  return (
    <View style={styles.root}>
      <Text style={styles.brand}>Cab Flo</Text>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>{user?.displayName}</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>Env: {config.env}</Text>
      <Text style={styles.meta}>
        API: {config.useMockApi ? 'Mock (offline-capable demo)' : config.apiBaseUrl}
      </Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Simulate online</Text>
        <Switch
          value={online}
          onValueChange={async value => {
            setOnline(value);
            if (value) {
              const {syncEngine, refreshCounts} = getServices();
              await syncEngine.runFullSync();
              await refreshCounts();
            }
          }}
        />
      </View>
      <Text style={styles.hint}>
        Toggle off to demo airplane-mode edits, then back on to flush outbox.
      </Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>
          Retention days: {retention}
        </Text>
        <Pressable
          onPress={() => {
            const next = retention >= 90 ? 14 : retention + 14;
            setRetention(next);
            setPrefString(PrefKeys.retentionDays, String(next));
          }}>
          <Text style={styles.link}>Cycle</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.logout}
        onPress={() => {
          setPrefBool(PrefKeys.onboardingDone, getPrefBool(PrefKeys.onboardingDone));
          void logout();
        }}>
        <Text style={styles.logoutText}>Log out (wipe local sensitive data)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.paper, padding: spacing.lg},
  brand: {color: colors.accent, fontWeight: '700'},
  title: {...typography.title, color: colors.ink, marginTop: 4},
  subtitle: {...typography.subtitle, marginTop: 4},
  meta: {marginTop: 6, color: colors.inkMuted, fontSize: 13},
  row: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {color: colors.ink, fontWeight: '600'},
  hint: {marginTop: spacing.sm, color: colors.inkMuted, fontSize: 12},
  link: {color: colors.accent, fontWeight: '700'},
  logout: {
    marginTop: spacing.xl,
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {color: colors.danger, fontWeight: '700'},
});
