import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@ui-kitten/components';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '../../../shared/components/Header';
import { deleteUser, getUserById } from '../services/user.service';
import { globalStyles } from '../../../shared/styles/global';
import { CancelButton, DeleteButton } from '../../../shared/components/ActionButtons';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { useThemedColors } from '../../../shared/styles/theme';

export const DeleteUserScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: number | undefined = route.params?.userId;
  const { t } = useTranslation();
  const C = useThemedColors();
  const [userName, setUserName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (userId) {
      getUserById(userId).then(res => {
        if (!mounted) return;
        setUserName(res?.data?.name || 'this user');
      }).catch(() => {});
    }
    return () => { mounted = false; };
  }, [userId]);

  const onConfirm = async () => {
    if (!userId) return;
    try {
      setSubmitting(true);
      await deleteUser(userId);
      Alert.alert(t('success'), t('userHasBeenDeleted'));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('error'), t('failedToDeleteUser'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeAreaView, { backgroundColor: C.background }]} edges={['top','bottom','left','right']}> 
      <View style={[styles.container, { backgroundColor: C.background }]}>
      <Header title={t('deleteUser')} />
        <Text style={[styles.desc, { color: C.textSecondary }]}>{t('confirmDeleteUser').replace('{userName}', userName)}</Text>
        <View style={styles.row}>
          <CancelButton label={t('cancel')} onPress={() => navigation.goBack()} disabled={submitting} style={styles.btn} />
          <DeleteButton label={t('delete')} onPress={onConfirm} disabled={submitting} style={styles.btn} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  btn: {
    flex: 1,
  },
});

export default DeleteUserScreen; 