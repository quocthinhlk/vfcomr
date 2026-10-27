import React, {useCallback, useEffect, useRef, useState} from 'react';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {View, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {getChurchDetail, enableChurch} from '../services/church.service';
import {
  CancelButton,
  DeleteButton,
} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, ms} from '../../../shared/utils/scale';
import {returnToList} from '../../../shared/utils/returnToList';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {fillTemplate} from '../utils/churchForm';

const EnableChurchScreen: React.FC = () => {
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
      setName(d?.name || t('thisChurch'));
      setLoadError(null);
    } catch (e) {
      // Don't ask to confirm an action on a church we couldn't load.
      if (mountedRef.current) {
        setLoadError(e);
      }
    }
  }, [churchId, t]);

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

  const onEnable = async () => {
    if (!churchId) return;
    try {
      setSubmitting(true);
      await enableChurch(churchId);
      markDataChanged('churches');
      Alert.alert(t('success'), t('churchEnabledSuccess'));
      returnToList(navigation);
    } catch (e: any) {
      Alert.alert(t('error'), e?.response?.data?.message || e?.message || t('failedToEnableChurch'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('enableChurch')} />
        {loadError ? (
          <ApiErrorState error={loadError} onRetry={loadDetail} />
        ) : (
        <>
        <Text style={[styles.desc, {color: C.textSecondary}]}>
          {fillTemplate(t('enableChurchConfirm'), {name})}
        </Text>
        <View style={styles.row}>
          <CancelButton label={t('cancel')} onPress={onCancel} disabled={submitting} />
          <DeleteButton
            label={t('enableChurch')}
            onPress={onEnable}
            disabled={submitting}
          />
        </View>
        </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: ms(16)},
  title: {marginTop: ms(16), marginBottom: ms(8)},
  desc: {fontSize: fs(14)},
  row: {flexDirection: 'row', gap: ms(12), marginTop: ms(24)},
});

export default EnableChurchScreen;