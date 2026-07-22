import React, {useCallback, useEffect, useState} from 'react';
import {Alert, View, ScrollView, Switch} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {useThemedColors} from '../../../shared/styles/theme';
import {ms, rs, fs} from '../../../shared/utils/scale';
import {COLORS} from '../../../shared/constants/colors';
import {
  BiometryKind,
  disableBiometricLogin,
  enableBiometricLoginForCurrentSession,
  getBiometricCapability,
  getBiometryDisplayName,
  isBiometricLoginEnabled,
} from '../../../shared/services/biometrics.service';

export default function GeneralScreen() {
  const {t} = useTranslation();
  const {theme, setTheme} = useThemeMode();
  const C = useThemedColors();
  const onToggleChange = useCallback(
    (checked: boolean) => {
      setTheme(checked ? 'dark' : 'light');
    },
    [setTheme],
  );

  const [biometryAvailable, setBiometryAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryKind | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const capability = await getBiometricCapability();
      const enabled = await isBiometricLoginEnabled();
      if (!mounted) return;
      setBiometryAvailable(capability.available);
      setBiometryType(capability.biometryType);
      setBiometricEnabled(capability.available && enabled);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const biometryName = getBiometryDisplayName(biometryType, t);

  const onToggleBiometricLogin = useCallback(
    async (checked: boolean) => {
      if (biometricBusy) return;
      // Keep the switch visually off until biometric auth succeeds.
      if (checked) {
        setBiometricEnabled(false);
      }
      setBiometricBusy(true);
      try {
        if (checked) {
          const outcome = await enableBiometricLoginForCurrentSession(
            t('biometricPromptTitle'),
          );
          if (outcome.success) {
            setBiometricEnabled(true);
          } else {
            setBiometricEnabled(false);
            if (outcome.reason !== 'cancelled') {
              Alert.alert(
                t('error'),
                t('biometricLoginEnableFailedMessage').replace(
                  /{biometryName}/g,
                  biometryName,
                ),
              );
            }
          }
        } else {
          await disableBiometricLogin();
          setBiometricEnabled(false);
        }
      } finally {
        setBiometricBusy(false);
      }
    },
    [biometricBusy, biometryName, t],
  );

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('general')} />
        <ScrollView

          contentContainerStyle={{padding: 0}}>
          <View
            style={{
              marginTop: ms(16),
              backgroundColor: C.surface,
              borderColor: C.border,
              borderWidth: 1,
              borderRadius: rs(12),
              padding: ms(16),
            }}>
            <Text
              category="label"
              style={{marginBottom: ms(8), fontSize: fs(12), color: C.textSecondary}}>
              {t('theme')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={{color: C.textPrimary, fontSize: fs(14)}}>
                {theme === 'dark' ? t('darkMode') : t('lightMode')}
              </Text>
              <Switch
                style={{transform: [{scaleX: 0.9}, {scaleY: 0.9}]}}
                value={theme === 'dark'}
                onValueChange={onToggleChange}
                thumbColor={COLORS.white}
                trackColor={{
                  false: theme === 'dark' ? C.border : C.border,
                  true: COLORS.mainColor,
                }}
              />
            </View>
            <Text style={{marginTop: ms(8), color: C.textSecondary, fontSize: fs(12)}}>
              {t('themeDescription')}
            </Text>
          </View>

          {biometryAvailable && (
            <View
              style={{
                marginTop: ms(16),
                backgroundColor: C.surface,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: rs(12),
                padding: ms(16),
              }}>
              <Text
                category="label"
                style={{marginBottom: ms(8), fontSize: fs(12), color: C.textSecondary}}>
                {biometryName}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text style={{color: C.textPrimary, fontSize: fs(14)}}>
                  {t('biometricLogin')}
                </Text>
                <Switch
                  style={{transform: [{scaleX: 0.9}, {scaleY: 0.9}]}}
                  value={biometricEnabled}
                  onValueChange={onToggleBiometricLogin}
                  disabled={biometricBusy}
                  thumbColor={COLORS.white}
                  trackColor={{
                    false: C.border,
                    true: COLORS.mainColor,
                  }}
                />
              </View>
              <Text style={{marginTop: ms(8), color: C.textSecondary, fontSize: fs(12)}}>
                {t('biometricLoginDescription').replace(/{biometryName}/g, biometryName)}
              </Text>
            </View>
          )}
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
}


