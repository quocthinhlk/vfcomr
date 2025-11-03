import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text } from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { getChurchDetail, disableChurch } from '../services/church.service';
import { CancelButton, DeleteButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';

const DisableChurchScreen: React.FC = () => {
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

  const onDisable = async () => {
    if (!churchId) return;
    try {
      setSubmitting(true);
      await disableChurch(churchId);
      Alert.alert(t('success'), t('churchDisabledSuccess'));
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message || e?.message || t('failedToDisableChurch'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <Layout style={[globalStyles.layout, { backgroundColor: C.background }]}>
      <Header title={t('disableChurch')} />
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <Text style={[styles.desc, { color: C.textSecondary }]}>{t('confirmDisableChurch').replace('{name}', name)}</Text>
        <View style={styles.row}>
          <CancelButton label={t('cancel')} onPress={onCancel} disabled={submitting} />
          <DeleteButton label={t('disableChurch')} onPress={onDisable} disabled={submitting} />
        </View>
      </View>
      </Layout>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0 },
  title: { marginTop: 16, marginBottom: 8 },
  desc: { color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, marginHorizontal: 0, gap:12},
});

export default DisableChurchScreen;