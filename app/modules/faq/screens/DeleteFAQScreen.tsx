import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {
  deleteFAQ,
  getFAQById,
} from '../services/faq.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {returnToList} from '../../../shared/utils/returnToList';
import api from '../../../config/api';

export const DeleteFAQScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const faqId: number | undefined = route.params?.faqId;
  const [questionHeader, setQuestionHeader] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {t} = useTranslation();
  const C = useThemedColors();
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  // Check user role on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const roleId = res?.data?.data?.role?.id;
        if (typeof roleId === 'number') {
          setUserRoleId(roleId);
          if (!isSuperAdmin(roleId)) {
            // Redirect non-admin users
            Alert.alert(t('error') || 'Error', t('accessDenied') || 'Access denied. Only administrators can delete FAQs.');
            navigation.goBack();
            return;
          }
        }
      } catch (e) {
        console.error('Error fetching user role:', e);
        Alert.alert(t('error') || 'Error', t('failedToVerifyPermissions') || 'Failed to verify permissions.');
        navigation.goBack();
      } finally {
        setCheckingRole(false);
      }
    })();
  }, [navigation, t]);

  useEffect(() => {
    let mounted = true;
    if (faqId && isSuperAdmin(userRoleId)) {
      getFAQById(faqId)
        .then(res => {
          if (!mounted) {
            return;
          }
          setQuestionHeader(res?.data?.question_header || 'this FAQ');
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [faqId, userRoleId]);

  const onConfirm = async () => {
    if (!faqId) return;
    try {
      setSubmitting(true);
      await deleteFAQ(faqId);
      Alert.alert(t('success') || 'Success', `${t('delete') || 'Delete'} ${t('faq') || 'FAQ'} ${t('success') || 'success'}`);
      returnToList(navigation);
    } catch (e) {
      Alert.alert(t('error') || 'Error', 'Failed to delete FAQ');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingRole) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{color: C.textPrimary}}>{t('loading') || 'Loading'}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSuperAdmin(userRoleId)) {
    return null; // Will redirect in useEffect
  }

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={{flex: 1, backgroundColor: C.background}}>
        <View style={styles.container}>
          <Header title={`${t('delete') || 'Delete'} ${t('faq') || 'FAQ'}`} />
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {`${t('delete') || 'Delete'} ${t('faq') || 'FAQ'} "${questionHeader}"?`}
          </Text>
          <View style={styles.row}>
            <CancelButton
              label={t('cancel') || 'Cancel'}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            />
            <DeleteButton
              label={t('delete') || 'Delete'}
              onPress={onConfirm}
              disabled={submitting}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: ms(16),
    paddingRight: ms(16),
  },
  desc: {
    color: '#555',
    fontSize: fs(14),
    marginTop: ms(16),
  },
  row: {
    flexDirection: 'row',
    marginTop: ms(24),
    gap: ms(12),
  },
});

export default DeleteFAQScreen;

