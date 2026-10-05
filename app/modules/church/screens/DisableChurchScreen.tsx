import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {getChurchDetail, disableChurch} from '../services/church.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';
import {returnToList} from '../../../shared/utils/returnToList';
import ApiErrorState from '../../../shared/components/ApiErrorState';

const DisableChurchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchId: number | undefined = route.params?.id;
  const {t} = useTranslation();
  const C = useThemedColors();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const loadDetail = useCallback(async () => {
    if (!churchId) {
      return;
    }
    try {
      const d = await getChurchDetail(churchId);
      if (!mountedRef.current) {
        return;
      }
      setName(d?.name || 'this church');
      setLoadError(null);
    } catch (e) {
      // Don't ask to confirm an action on a church we couldn't load.
      if (mountedRef.current) {
        setLoadError(e);
      }
    }
  }, [churchId]);

  useEffect(() => {
    mountedRef.current = true;
    loadDetail();
    return () => {
      mountedRef.current = false;
    };
  }, [loadDetail]);

  const onCancel = () => {
    navigation.goBack();
  };

  const onDisable = async () => {
    if (!churchId) return;
    try {
      setSubmitting(true);
      await disableChurch(churchId);
      Alert.alert(t('success'), t('churchDisabledSuccess'));
      returnToList(navigation);
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message || e?.message || t('failedToDisableChurch'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('disableChurch')} />
        {loadError ? (
          <ApiErrorState error={loadError} onRetry={loadDetail} />
        ) : (
        <View style={[styles.container, {backgroundColor: C.background}]}>
          <Text style={[styles.desc, {color: C.textSecondary}]}>
            {t('confirmDisableChurch').replace('{name}', name)}
          </Text>
          <View style={styles.row}>
            <CancelButton
              label={t('cancel')}
              onPress={onCancel}
              disabled={submitting}
            />
            <DeleteButton
              label={t('disableChurch')}
              onPress={onDisable}
              disabled={submitting}
            />
          </View>
        </View>
        )}
      </Layout>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 0},
  title: {marginTop: ms(16), marginBottom: ms(8)},
  desc: {color: '#555', fontSize: fs(14)},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: ms(24),
    marginHorizontal: 0,
    gap: ms(12),
  },
});

export default DisableChurchScreen;