import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { getChurchDetail, enableChurch } from '../services/church.service';
import { CancelButton, DeleteButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';

const EnableChurchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchId: number | undefined = route.params?.id;
  const { t } = useTranslation();
  const C = useThemedColors();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (churchId) {
      getChurchDetail(churchId).then(d => {
        if (!mounted) return;
        setName(d?.name || 'this church');
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, [churchId]);

  const onCancel = () => {
    navigation.goBack();
  };

  const onEnable = async () => {
    if (!churchId) return;
    try {
      setSubmitting(true);
      await enableChurch(churchId);
      Alert.alert(t('success'), t('churchEnabledSuccess'));
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message || e?.message || t('failedToEnableChurch'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <View style={[styles.container, { backgroundColor: C.background }]}>
      <Header title={t('enableChurch')} />
        <Text style={[styles.desc, { color: C.textSecondary }]}>Are you sure you want to enable "{name}"?</Text>
        <View style={styles.row}>
          <CancelButton onPress={onCancel} disabled={submitting} />
          <DeleteButton label={t('enableChurch')} onPress={onEnable} disabled={submitting} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginTop: 16, marginBottom: 8 },
  desc: {},
  row: { flexDirection: 'row', gap: 12, marginTop: 24 },
});

export default EnableChurchScreen;