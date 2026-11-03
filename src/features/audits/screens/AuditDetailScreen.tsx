import React, {useCallback, useState} from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import type {Audit, ChecklistItem} from '../../../entities/audit/types';
import {getServices} from '../../../app/services';
import {OfflineBanner} from '../../../shared/ui/OfflineBanner';
import {colors, spacing, typography} from '../../../shared/ui/theme';
import type {HomeStackParamList} from '../../../app/navigation/types';
import {createClientId} from '../../../shared/lib/uuid';

type Props = NativeStackScreenProps<HomeStackParamList, 'AuditDetail'>;

export function AuditDetailScreen({route}: Props): React.JSX.Element {
  const {clientId} = route.params;
  const [audit, setAudit] = useState<Audit | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const {audits} = getServices();
    setAudit(await audits.getByClientId(clientId));
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const persist = async (next: Audit) => {
    setSaving(true);
    try {
      const {audits, syncEngine, refreshCounts} = getServices();
      const saved = await audits.saveDraft(clientId, {
        notes: next.notes,
        checklist: next.checklist,
        photos: next.photos,
        assignmentStatus: next.assignmentStatus,
        isDraft: true,
        localStatus: 'draft',
      });
      await syncEngine.enqueueAuditUpdate(saved);
      setAudit(saved);
      await refreshCounts();
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = async (item: ChecklistItem, value: boolean) => {
    if (!audit) {
      return;
    }
    if (audit.adminLocked) {
      Alert.alert('Locked', 'This assignment is admin-locked.');
      return;
    }
    const checklist = audit.checklist.map(c =>
      c.id === item.id ? {...c, value} : c,
    );
    await persist({...audit, checklist});
  };

  const onNotesBlur = async () => {
    if (!audit) {
      return;
    }
    await persist(audit);
  };

  const addPhoto = async () => {
    if (!audit) {
      return;
    }
    if (audit.adminLocked) {
      Alert.alert('Locked', 'Cannot add photos to a locked assignment.');
      return;
    }

    // Prefer image-picker when native module exists; otherwise queue a local stub URI.
    let localUri = `file://offline-photos/${createClientId()}.jpg`;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {launchCamera} = require('react-native-image-picker') as {
        launchCamera: (
          options: Record<string, unknown>,
          cb: (res: {
            didCancel?: boolean;
            assets?: {uri?: string; fileSize?: number; type?: string; width?: number; height?: number}[];
          }) => void,
        ) => void;
      };
      await new Promise<void>(resolve => {
        launchCamera(
          {mediaType: 'photo', quality: 0.7, saveToPhotos: false},
          res => {
            if (!res.didCancel && res.assets?.[0]?.uri) {
              localUri = res.assets[0].uri;
            }
            resolve();
          },
        );
      });
    } catch {
      // Jest / no native module — keep stub path
    }

    const {media, audits, syncEngine, refreshCounts} = getServices();
    const asset = await media.createLocal({
      auditClientId: clientId,
      localPath: localUri,
      mimeType: 'image/jpeg',
      byteSize: 180_000,
    });

    const photos = [
      ...audit.photos,
      {
        id: asset.id,
        clientId: asset.clientId,
        localUri: asset.localPath,
        remoteUrl: null,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        uploadStatus: asset.uploadStatus,
        createdAt: asset.createdAt,
      },
    ];

    const saved = await audits.saveDraft(clientId, {
      photos,
      notes: audit.notes,
      checklist: audit.checklist,
      isDraft: true,
      localStatus: 'draft',
    });
    await syncEngine.enqueueAuditUpdate(saved);
    setAudit(saved);
    await refreshCounts();
  };

  if (!audit) {
    return (
      <View style={styles.root}>
        <Text style={styles.missing}>Audit not found locally.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>Cab Flo</Text>
        <Text style={styles.title}>{audit.title}</Text>
        <Text style={styles.subtitle}>{audit.siteName}</Text>
        <Text style={styles.meta}>
          Status: {audit.assignmentStatus}
          {audit.adminLocked ? ' · ADMIN LOCKED' : ''}
          {' · '}
          sync: {audit.syncStatus}
        </Text>
        {audit.conflictReason ? (
          <View style={styles.conflictBox}>
            <Text style={styles.conflictTitle}>Conflict</Text>
            <Text style={styles.conflictBody}>{audit.conflictReason}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>Checklist</Text>
        {audit.checklist.map(item => (
          <View key={item.id} style={styles.checkRow}>
            <Text style={styles.checkLabel}>
              {item.label}
              {item.required ? ' *' : ''}
            </Text>
            <Switch
              value={Boolean(item.value)}
              onValueChange={v => void toggleCheck(item, v)}
              disabled={audit.adminLocked}
            />
          </View>
        ))}

        <Text style={styles.section}>Notes</Text>
        <TextInput
          style={styles.notes}
          multiline
          editable={!audit.adminLocked}
          value={audit.notes}
          onChangeText={text => setAudit({...audit, notes: text})}
          onEndEditing={() => void onNotesBlur()}
          placeholder="Field notes (saved offline)"
          placeholderTextColor={colors.inkMuted}
        />

        <Text style={styles.section}>Photos</Text>
        <View style={styles.photos}>
          {audit.photos.map(photo => (
            <View key={photo.clientId} style={styles.photoCard}>
              {photo.localUri || photo.remoteUrl ? (
                <Image
                  source={{uri: photo.localUri || photo.remoteUrl || undefined}}
                  style={styles.photo}
                />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]} />
              )}
              <Text style={styles.photoMeta}>
                {photo.remoteUrl ? 'synced' : photo.uploadStatus}
              </Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.secondaryBtn} onPress={() => void addPhoto()}>
          <Text style={styles.secondaryBtnText}>Add photo (local-first)</Text>
        </Pressable>

        <Text style={styles.saveHint}>
          {saving ? 'Saving…' : 'Edits queue to outbox automatically'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.paper},
  content: {padding: spacing.lg, paddingBottom: spacing.xl * 2},
  missing: {padding: spacing.lg, color: colors.inkMuted},
  brand: {color: colors.accent, fontWeight: '700', fontSize: 13},
  title: {...typography.title, color: colors.ink, marginTop: 4},
  subtitle: {...typography.subtitle, marginTop: 4},
  meta: {marginTop: spacing.sm, color: colors.inkMuted, fontSize: 12},
  conflictBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: 8,
  },
  conflictTitle: {fontWeight: '700', color: colors.danger},
  conflictBody: {marginTop: 4, color: colors.ink},
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  checkLabel: {flex: 1, paddingRight: spacing.md, color: colors.ink},
  notes: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.paperElevated,
    textAlignVertical: 'top',
    color: colors.ink,
  },
  photos: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  photoCard: {width: 96},
  photo: {width: 96, height: 96, borderRadius: 8, backgroundColor: colors.field},
  photoPlaceholder: {opacity: 0.5},
  photoMeta: {fontSize: 11, color: colors.inkMuted, marginTop: 4},
  secondaryBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {color: colors.accent, fontWeight: '700'},
  saveHint: {marginTop: spacing.md, color: colors.inkMuted, fontSize: 12},
});
