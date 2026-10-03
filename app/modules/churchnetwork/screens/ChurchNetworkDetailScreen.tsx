import React, {useCallback, useState} from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {COLORS} from '../../../shared/constants/colors';
import {
  getChurchNetworkById,
  ChurchNetworkItem,
} from '../services/churchnetwork.service';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {FORM_INPUT_HEIGHT} from '../../../shared/styles/form';
import {fs, ms, rs, ws} from '../../../shared/utils/scale';
import {
  CenteredLoader,
  CredentialBadge,
  PencilIcon,
  TrashIcon,
  getNetworkTokens,
  networkStyles,
} from '../components/ChurchNetworkUI';

export const ChurchNetworkDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchNetworkId: number | undefined = route.params?.churchNetworkId;
  const [network, setNetwork] = useState<ChurchNetworkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();
  const T = getNetworkTokens(theme);

  // Refetch whenever the screen regains focus (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      if (!churchNetworkId) {
        setLoading(false);
        return;
      }
      getChurchNetworkById(churchNetworkId)
        .then(res => {
          if (mounted) {
            setNetwork(res?.data || null);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
      return () => {
        mounted = false;
      };
    }, [churchNetworkId]),
  );

  const cardStyle = [
    styles.card,
    {
      backgroundColor: C.surface,
      borderColor: C.surfaceBorder,
      shadowOpacity: T.shadowOpacity,
    },
  ];

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[networkStyles.screen, {backgroundColor: C.background}]}>
        <Header title={t('churchNetworkDetail')} showMenu={false} />

        {loading && !network ? (
          <CenteredLoader />
        ) : !network ? (
          <Text style={[styles.emptyText, {color: C.textSecondary}]}>
            {t('noDataFound')}
          </Text>
        ) : (
          <ScrollView contentContainerStyle={networkStyles.scrollContent}>
            <View style={cardStyle}>
              <Text
                style={[styles.title, {color: C.textPrimary}]}
                accessibilityRole="header">
                {network.name}
              </Text>
              <View style={[styles.divider, {backgroundColor: C.surfaceBorder}]} />
              <View style={styles.row}>
                <Text style={[styles.rowLabel, {color: C.textSecondary}]}>
                  {t('pastorCredentialLocked')}
                </Text>
                <CredentialBadge locked={!!network.pastor_credential_locked} />
              </View>
            </View>

            {/* Edit (left) and Delete (right); Delete opens a confirmation screen. */}
            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBtn, {backgroundColor: COLORS.mainColor}]}
                onPress={() =>
                  navigation.navigate('EditChurchNetwork', {churchNetworkId})
                }
                accessibilityRole="button">
                <PencilIcon color={COLORS.white} size={ws(16)} />
                <Text style={styles.actionBtnText}>{t('edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBtn, {backgroundColor: COLORS.dangerColor}]}
                onPress={() =>
                  navigation.navigate('DeleteChurchNetwork', {churchNetworkId})
                }
                accessibilityRole="button"
                accessibilityLabel={`${t('delete')} ${network.name}`}>
                <TrashIcon color={COLORS.white} size={ws(16)} />
                <Text style={styles.actionBtnText}>{t('delete')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  title: {
    fontSize: fs(17),
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
    minHeight: ws(28),
  },
  rowLabel: {
    fontSize: fs(13),
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: ms(12),
  },
  actions: {
    flexDirection: 'row',
    gap: ms(12),
    marginTop: ms(20),
  },
  actionBtn: {
    flex: 1,
    height: Math.max(FORM_INPUT_HEIGHT, 44),
    borderRadius: rs(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: fs(14),
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: ms(40),
    fontSize: fs(14),
  },
});

export default ChurchNetworkDetailScreen;
