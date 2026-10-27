import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import AppButton from '../../../shared/components/AppButton';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {COLORS} from '../../../shared/constants/colors';
import {fs, hs, ms, rs} from '../../../shared/utils/scale';
import api from '../../../config/api';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {isSuperAdmin, resolveRoleIdFromUser} from '../../../shared/utils/permissions';
import {
  getRoleChangeRequest,
  RoleChangeRequestItem,
  RoleChangeRequestStatus,
  updateRoleChangeRequestStatus,
} from '../services/roleChangeRequest.service';

const STATUS_COLOR: Record<string, string> = {
  pending: '#d99400',
  approved: COLORS.successColor,
  rejected: COLORS.dangerColor,
};

function formatDatePretty(value?: string | null, language = 'en'): string {
  if (!value) {
    return '-';
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return String(value);
  }
  const day = String(d.getDate()).padStart(2, '0');
  let month: string;
  try {
    month = d.toLocaleString(language || 'en', {month: 'short'});
  } catch {
    month = d.toLocaleString('en-US', {month: 'short'});
  }
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
  return `${day} ${month} ${d.getFullYear()} · ${time}`;
}

export const RoleChangeRequestDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const requestId = Number(route.params?.id);
  const C = useThemedColors();
  const {t, selectedLanguage} = useTranslation();

  const [request, setRequest] = useState<RoleChangeRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<RoleChangeRequestStatus | null>(null);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  // Until users/me answers the role is unknown: a spinner, not "Access denied".
  const [roleLoaded, setRoleLoaded] = useState(false);

  // users/me failing must not read as "Access denied"; a failed detail load
  // must not read as "No data found". Both show a retryable error.
  const [roleError, setRoleError] = useState<unknown>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('users/me');
      if (!mountedRef.current) {
        return;
      }
      setCurrentUserRoleId(resolveRoleIdFromUser(res?.data?.data));
      setRoleError(null);
      setRoleLoaded(true);
    } catch (e) {
      if (!mountedRef.current) {
        return;
      }
      setCurrentUserRoleId(null);
      setRoleError(e);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const loadRequest = useCallback(async () => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getRoleChangeRequest(requestId);
      if (mountedRef.current) {
        setRequest(res?.data ?? null);
        setLoadError(null);
      }
    } catch (error) {
      if (mountedRef.current) {
        setRequest(null);
        setLoadError(error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [requestId]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const statusLabel = useMemo(() => {
    const status = String(request?.status ?? '').toLowerCase();
    if (status === 'approved') {
      return t('statusApproved');
    }
    if (status === 'rejected') {
      return t('statusRejected');
    }
    return t('statusPending');
  }, [request?.status, t]);

  const statusColor =
    STATUS_COLOR[String(request?.status ?? '').toLowerCase()] || C.textSecondary;

  const isAdmin = isSuperAdmin(currentUserRoleId);
  const isPending = String(request?.status ?? '').toLowerCase() === 'pending';

  const handleUpdateStatus = (status: RoleChangeRequestStatus) => {
    if (!request) {
      return;
    }
    Alert.alert(
      status === 'approved' ? t('approve') : t('reject'),
      status === 'approved' ? t('areYouSureApprove') : t('areYouSureReject'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: status === 'approved' ? t('approve') : t('reject'),
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setActioning(status);
              await updateRoleChangeRequestStatus(request.id, status);
              markDataChanged('roleChangeRequests');
              // No longer pending: hides Approve / Reject so a second tap
              // (while the alert is open or with no screen to go back to)
              // can't send the update again.
              setRequest(prev => (prev ? {...prev, status} : prev));
              Alert.alert(
                t('success'),
                status === 'approved'
                  ? t('roleChangeApproved')
                  : t('roleChangeRejected'),
                [
                  {
                    text: t('ok'),
                    onPress: () => {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      }
                    },
                  },
                ],
              );
            } catch (error: any) {
              Alert.alert(
                t('error'),
                error?.response?.data?.message ||
                  error?.message ||
                  t('apiErrorUnexpected'),
              );
            } finally {
              setActioning(null);
            }
          },
        },
      ],
    );
  };

  const renderRow = (label: string, value: string, isLast = false) => (
    <View
      style={[
        styles.infoRow,
        !isLast && {borderBottomWidth: 1, borderBottomColor: C.surfaceBorder},
      ]}>
      <Text style={[styles.infoLabel, {color: C.textSecondary}]}>{label}</Text>
      <Text style={[styles.infoValue, {color: C.textPrimary}]}>{value}</Text>
    </View>
  );

  const renderBody = () => {
    if (roleError && currentUserRoleId == null) {
      return <ApiErrorState error={roleError} onRetry={loadCurrentUser} />;
    }

    if (!roleLoaded) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={C.textPrimary} />
        </View>
      );
    }
    if (!isAdmin) {
      return (
        <View style={styles.centerWrap}>
          <Text style={[styles.centerText, {color: C.textSecondary}]}>
            {t('accessDenied')}
          </Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={C.textPrimary} />
          <Text style={[styles.centerText, {color: C.textSecondary}]}>
            {t('loading')}
          </Text>
        </View>
      );
    }

    if (!request && loadError) {
      return <ApiErrorState error={loadError} onRetry={loadRequest} />;
    }

    if (!request) {
      return (
        <View style={styles.centerWrap}>
          <Text style={[styles.centerText, {color: C.textSecondary}]}>
            {t('noDataFound')}
          </Text>
        </View>
      );
    }

    const decidedByName =
      String(request.status).toLowerCase() === 'approved'
        ? request.approved_by_name
        : request.rejected_by_name;
    const decidedAt =
      String(request.status).toLowerCase() === 'approved'
        ? request.approved_at
        : request.rejected_at;

    return (
      <>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.card,
              styles.cardShadow,
              {backgroundColor: C.surface, borderColor: C.surfaceBorder},
            ]}>
            <View style={styles.heroRow}>
              <View style={styles.heroTextWrap}>
                <Text style={[styles.heroName, {color: C.textPrimary}]}>
                  {request.user_name}
                </Text>
                <Text style={[styles.heroMeta, {color: C.textSecondary}]}>
                  {t('omrNumber')} #{request.user_id}
                </Text>
              </View>
              <View style={[styles.badge, {borderColor: statusColor}]}>
                <Text style={[styles.badgeText, {color: statusColor}]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              styles.cardShadow,
              {backgroundColor: C.surface, borderColor: C.surfaceBorder},
            ]}>
            <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
              {t('roleChange')}
            </Text>
            <View style={styles.roleRow}>
              <View style={styles.roleBlock}>
                <Text style={[styles.roleLabel, {color: C.textSecondary}]}>
                  {t('currentRole')}
                </Text>
                <Text style={[styles.roleValue, {color: C.textPrimary}]}>
                  {request.old_role_name || '-'}
                </Text>
              </View>
              <Text style={styles.roleArrow}>→</Text>
              <View style={styles.roleBlock}>
                <Text style={[styles.roleLabel, {color: C.textSecondary}]}>
                  {t('requestedRole')}
                </Text>
                <Text style={[styles.roleValue, {color: COLORS.mainColor}]}>
                  {request.new_role_name || '-'}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              styles.cardShadow,
              {backgroundColor: C.surface, borderColor: C.surfaceBorder},
            ]}>
            <Text style={[styles.cardTitle, {color: C.textPrimary}]}>
              {t('requestInformation')}
            </Text>
            {renderRow(t('requestedBy'), request.requested_by_name || '-')}
            {renderRow(
              t('requestedAt'),
              formatDatePretty(request.requested_at, selectedLanguage),
              isPending && !request.admin_comments,
            )}
            {!isPending
              ? renderRow(
                  String(request.status).toLowerCase() === 'approved'
                    ? t('approvedBy')
                    : t('rejectedBy'),
                  `${decidedByName || '-'}${
                    decidedAt ? `\n${formatDatePretty(decidedAt, selectedLanguage)}` : ''
                  }`,
                  !request.admin_comments,
                )
              : null}
            {request.admin_comments
              ? renderRow(t('adminComments'), request.admin_comments, true)
              : null}
          </View>
        </ScrollView>

        {isPending ? (
          <View
            style={[
              styles.footer,
              {backgroundColor: C.background, borderTopColor: C.surfaceBorder},
            ]}>
            <View style={styles.footerButtonWrapper}>
              <AppButton
                style={{
                  backgroundColor: COLORS.successColor,
                  borderColor: COLORS.successColor,
                }}
                onPress={() => handleUpdateStatus('approved')}
                loading={actioning === 'approved'}
                disabled={actioning !== null}>
                {t('approve')}
              </AppButton>
            </View>
            <View style={styles.footerButtonWrapper}>
              <AppButton
                style={{
                  backgroundColor: COLORS.dangerColor,
                  borderColor: COLORS.dangerColor,
                }}
                onPress={() => handleUpdateStatus('rejected')}
                loading={actioning === 'rejected'}
                disabled={actioning !== null}>
                {t('reject')}
              </AppButton>
            </View>
          </View>
        ) : null}
      </>
    );
  };

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.container, {backgroundColor: C.background}]}>
        <Header title={t('roleChangeRequestDetail')} showMenu={false} />
        {renderBody()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: ms(16),
  },
  scrollContent: {
    paddingTop: ms(16),
    paddingBottom: ms(24),
    gap: ms(16),
  },
  card: {
    padding: ms(16),
    borderRadius: rs(12),
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: rs(6),
    shadowOffset: {width: 0, height: hs(3)},
    elevation: 2,
  },
  cardTitle: {
    fontSize: fs(13),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: ms(12),
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
  },
  heroTextWrap: {
    flex: 1,
  },
  heroName: {
    fontSize: fs(17),
    fontWeight: '700',
  },
  heroMeta: {
    fontSize: fs(12),
    marginTop: ms(2),
  },
  badge: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: rs(20),
    borderWidth: 1,
  },
  badgeText: {
    fontSize: fs(11),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  roleBlock: {
    flex: 1,
  },
  roleLabel: {
    fontSize: fs(12),
    marginBottom: ms(4),
  },
  roleValue: {
    fontSize: fs(15),
    fontWeight: '600',
  },
  roleArrow: {
    fontSize: fs(18),
    color: COLORS.mainColor,
    paddingHorizontal: ms(4),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: ms(12),
    paddingVertical: ms(10),
  },
  infoLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: fs(14),
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    columnGap: ms(12),
    paddingVertical: ms(12),
    borderTopWidth: 1,
  },
  footerButtonWrapper: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(8),
    paddingHorizontal: ms(24),
  },
  centerText: {
    fontSize: fs(14),
    textAlign: 'center',
  },
});

export default RoleChangeRequestDetailScreen;
