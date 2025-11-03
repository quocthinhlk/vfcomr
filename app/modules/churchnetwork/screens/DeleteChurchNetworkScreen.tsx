import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { globalStyles } from '../../../shared/styles/global';
import { deleteChurchNetwork, getChurchNetworkById } from '../services/churchnetwork.service';
import { CancelButton, DeleteButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';
import { useThemeMode } from '../../../shared/context/ThemeContext';

export const DeleteChurchNetworkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId: number | undefined = route.params?.churchNetworkId;
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();
  const C = useThemedColors();
  const { theme } = useThemeMode();

  useEffect(() => {
    let mounted = true;
    if (churchNetworkId) {
      getChurchNetworkById(churchNetworkId).then(res => {
        if (!mounted) return;
        setName(res?.data?.name || 'this church network');
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, [churchNetworkId]);

  const onConfirm = async () => {
    if (!churchNetworkId) return;
    try {
      setSubmitting(true);
      await deleteChurchNetwork(churchNetworkId);
      Alert.alert(t('success') || 'Success', `${t('delete')} ${t('churchNetwork')} ${t('success')}`);
      navigation.navigate('ChurchNetworks', { reload: true });
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete church network');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}>
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <View style={styles.container}>
          <Header title={`${t('delete')} ${t('churchNetwork')}`} />
          <Text style={[styles.desc, { color: C.textSecondary }]}>{`${t('delete')} ${t('churchNetwork')} "${name}"?`}</Text>
          <View style={styles.row}>
            <CancelButton label={t('cancel')} onPress={() => navigation.goBack()} disabled={submitting} />
            <DeleteButton label={t('delete')} onPress={onConfirm} disabled={submitting} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 16,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  desc: {
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
});

export default DeleteChurchNetworkScreen; 