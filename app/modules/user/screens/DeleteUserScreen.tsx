import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {deleteUser, getUserById} from '../services/user.service';
import {globalStyles} from '../../../shared/styles/global';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';
import {returnToList} from '../../../shared/utils/returnToList';

export const DeleteUserScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: number | undefined = route.params?.userId;
  const initialUserName: string = route.params?.userName ?? '';
  const {t} = useTranslation();
  const C = useThemedColors();
  const [userName, setUserName] = useState<string>(initialUserName);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (userId && !initialUserName) {
      getUserById(userId)
        .then((res: any) => {
          if (!mounted) {
            return;
          }
          const user = res?.data?.data ?? res?.data ?? res;
          setUserName(user?.name || user?.username || '');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [userId, initialUserName]);

  const onConfirm = async () => {
    if (!userId) return;
    try {
      setSubmitting(true);
      await deleteUser(userId);
      Alert.alert(t('success'), t('userHasBeenDeleted'));
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error'), t('failedToDeleteUser'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('deleteUser')} />
        <Text style={[styles.desc, {color: C.textSecondary}]}>
          {t('confirmDeleteUser').replace('{userName}', userName)}
        </Text>
        <View style={styles.row}>
          <CancelButton
            label={t('cancel')}
            onPress={() => navigation.goBack()}
            disabled={submitting}
            style={styles.btn}
          />
          <DeleteButton
            label={t('delete')}
            onPress={onConfirm}
            disabled={submitting}
            style={styles.btn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: ms(16),
  },
  title: {
    marginTop: ms(16),
    marginBottom: ms(8),
  },
  desc: {
    color: '#555',
    fontSize: fs(12),
  },
  row: {
    flexDirection: 'row',
    marginTop: ms(24),
    gap: ms(12),
  },
  btn: {
    flex: 1,
  },
});

export default DeleteUserScreen; 