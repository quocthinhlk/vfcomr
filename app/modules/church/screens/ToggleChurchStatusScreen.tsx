import React, {useEffect, useState} from 'react';
import {SafeAreaView, View, Alert} from 'react-native';
import {Layout, Text} from '@ui-kitten/components';
import {globalStyles} from '../../../shared/styles/global';
import {Header} from '../../../shared/components/Header';
import {BackButton} from '../../../shared/components/BackButton';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
  disableChurch,
  enableChurch,
  getChurchDetail,
} from '../services/church.service';
import {useThemedColors} from '../../../shared/styles/theme';
import AppButton from '../../../shared/components/AppButton';
import {fs, ms} from '../../../shared/utils/scale';

export default function ToggleChurchStatusScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useThemedColors();
  const churchId: number | null = route?.params?.id ?? null;
  const [disabled, setDisabled] = useState<boolean | null>(null);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!churchId) return;
      try {
        const d = await getChurchDetail(churchId);
        setDisabled(!!d?.disabled);
        setName(d?.name || '');
      } catch {}
    })();
  }, [churchId]);

  const toggle = async () => {
    if (!churchId || disabled === null) return;
    try {
      setLoading(true);
      if (!disabled) {
        await disableChurch(churchId);
        Alert.alert('Success', 'Church disabled successfully');
      } else {
        await enableChurch(churchId);
        Alert.alert('Success', 'Church enabled successfully');
      }
      navigation.navigate('Churches');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to toggle status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}>
      <Header />
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <BackButton title="Church status" />
        <View style={{paddingHorizontal: ms(16), paddingTop: ms(8)}}>
          <Text
            category="label"
            style={{
              marginBottom: ms(12),
              color: C.textPrimary,
              fontSize: fs(14),
            }}>
            {name ? `Church: ${name}` : 'Church'}
          </Text>
          <Text
            style={{
              marginBottom: ms(20),
              color: C.textSecondary,
              fontSize: fs(12),
            }}>
            {disabled
              ? 'This church is currently disabled.'
              : 'This church is currently enabled.'}
          </Text>
          <AppButton
            disabled={loading || disabled === null}
            onPress={toggle}>
            {disabled ? 'Enable' : 'Disable'}
          </AppButton>
        </View>
      </Layout>
    </SafeAreaView>
  );
}


