import React, {useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {useAuthStore} from '../hooks/authStore';
import {DEMO_CREDENTIALS} from '../../../data/api/mockApi';
import {colors, spacing, typography} from '../../../shared/ui/theme';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export function LoginScreen(): React.JSX.Element {
  const login = useAuthStore(s => s.login);
  const bootstrapping = useAuthStore(s => s.bootstrapping);
  const storeError = useAuthStore(s => s.error);
  const [localError, setLocalError] = useState<string | null>(null);

  const {control, handleSubmit, setValue, formState} = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {email: '', password: ''},
  });

  const onSubmit = handleSubmit(async values => {
    setLocalError(null);
    try {
      await login(values.email.trim(), values.password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    }
  });

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Cab Flo</Text>
        <Text style={styles.tagline}>Field auditor workspace</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({field: {onChange, onBlur, value}}) => (
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="auditor@cabflo.demo"
              placeholderTextColor={colors.inkMuted}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {formState.errors.email ? (
          <Text style={styles.error}>{formState.errors.email.message}</Text>
        ) : null}

        <Text style={styles.label}>Password</Text>
        <Controller
          control={control}
          name="password"
          render={({field: {onChange, onBlur, value}}) => (
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.inkMuted}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {formState.errors.password ? (
          <Text style={styles.error}>{formState.errors.password.message}</Text>
        ) : null}

        {(localError || storeError) && (
          <Text style={styles.error}>{localError || storeError}</Text>
        )}

        <Pressable
          style={[styles.cta, bootstrapping && styles.ctaDisabled]}
          onPress={onSubmit}
          disabled={bootstrapping}>
          {bootstrapping ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Sign in</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setValue('email', DEMO_CREDENTIALS.email);
            setValue('password', DEMO_CREDENTIALS.password);
          }}>
          <Text style={styles.demoHint}>
            Demo: {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  brand: {
    ...typography.brand,
    color: colors.accent,
  },
  tagline: {
    ...typography.subtitle,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.paperElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: {opacity: 0.7},
  ctaText: {color: '#fff', fontWeight: '700', fontSize: 16},
  error: {color: colors.danger, fontSize: 13},
  demoHint: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.inkMuted,
    fontSize: 12,
  },
});
