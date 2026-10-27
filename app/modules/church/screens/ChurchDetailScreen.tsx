import React, {useEffect, useState} from 'react';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import api from '../../../config/api';
import {COLORS} from '../../../shared/constants/colors';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {isSuperAdmin, resolveRoleIdFromUser} from '../../../shared/utils/permissions';
import AppButton from '../../../shared/components/AppButton';
import {DeleteButton} from '../../../shared/components/ActionButtons';
import {fs, ws, ms, rs} from '../../../shared/utils/scale';
import ZoomableImageModal from '../../../shared/components/ZoomableImageModal';
import ApiErrorState from '../../../shared/components/ApiErrorState';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {getChurchDetail, removeChurchLocation} from '../services/church.service';
import {fillTemplate, parseYmd} from '../utils/churchForm';

const blankChurch = require('../../../assets/images/church.png');
const zoomOutIcon = require('../../../assets/icons/zoom-out.png');
const editIcon = require('../../../assets/icons/edit.png');

export default function ChurchDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchId: number | null = route?.params?.id ?? null;
  const refetchKey: number | undefined = route?.params?.refetchKey;
  // Opened from the Clone Church list: the bottom action clones instead of disabling.
  const fromClone: boolean = route?.params?.fromClone === true;
  const {t, selectedLanguage} = useTranslation();
  const C = useThemedColors();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [removingLocation, setRemovingLocation] = useState(false);

  const mountedRef = React.useRef(true);
  const fetchSeqRef = React.useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Loaded on every focus (that includes the first one). Only the first load
  // shows the spinner: refreshing after Back used to blank the page and jump to
  // the top, and the mount + focus effects fetched it twice.
  const fetchChurch = React.useCallback(async () => {
    if (!churchId) {
      setLoading(false);
      return;
    }
    const seq = ++fetchSeqRef.current;
    try {
      const next = await getChurchDetail(churchId);
      if (!mountedRef.current || seq !== fetchSeqRef.current) {
        return;
      }
      setData(next || null);
      setLoadError(null);
    } catch (e) {
      if (!mountedRef.current || seq !== fetchSeqRef.current) {
        return;
      }
      // Shown only when nothing is on screen yet; a failed focus-refresh keeps the details.
      setLoadError(e);
    } finally {
      if (mountedRef.current && seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [churchId]);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh details whenever screen gains focus (after enable/disable flow)
      fetchChurch();
      return () => {};
    }, [fetchChurch]),
  );

  useEffect(() => {
    if (!refetchKey) {
      return;
    }
    // One-time refetch signal (e.g. after edit).
    fetchChurch();
    navigation.setParams({refetchKey: undefined});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchKey]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api.get('users/me');
        if (!mounted) {
          return;
        }
        // Same rule as the lists: some accounts only expose role_id.
        const rid = resolveRoleIdFromUser(me?.data?.data);
        if (rid != null) {
          setCurrentUserRoleId(rid);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // A new photo after a failed load (e.g. offline) must be tried again.
  useEffect(() => {
    setImageError(false);
  }, [data?.photo_url]);

  const isSuperAdminUser = isSuperAdmin(currentUserRoleId || undefined);
  const imageUri = data?.photo_url && !imageError ? String(data.photo_url) : null;
  const canOpenFullImage = Boolean(imageUri);
  const omrMapUrl =
    data?.omr_map_location ||
    data?.omr_map_url ||
    data?.map_location ||
    data?.map_url ||
    data?.google_map ||
    '';
  const websiteUrl = normalizeUrl(data?.website);
  const emailAddress = String(data?.email_address || '').trim();
  const serviceAddressLine = [data?.service_address_street, data?.service_address_postal_code]
    .filter(Boolean)
    .join('\n');
  const mailingAddressLine = [data?.mailing_address_street, data?.mailing_address_postal_code]
    .filter(Boolean)
    .join('\n');
  const serviceTimeDay = [data?.service_time, data?.service_day]
    .filter(Boolean)
    .join(', ');
  const churchBirthday = formatDateWithAge(data?.date_of_birth, selectedLanguage, age =>
    fillTemplate(t('yearsOld'), {age: String(age)}),
  );
  const attributeItems = [
    data?.is_mother_church ? {key: 'mother', label: t('mother')} : null,
    data?.is_msc ? {key: 'msc', label: t('msc')} : null,
    // Pinned through Edit Location = coordinates, which count as "on map" too.
    omrMapUrl || (data?.latitude != null && data?.longitude != null)
      ? {key: 'map', label: t('onMap')}
      : null,
  ].filter(Boolean) as Array<{key: 'mother' | 'msc' | 'map'; label: string}>;
  const socialItems = [
    {label: 'f', url: normalizeUrl(data?.facebook)},
    {label: 'ig', url: normalizeUrl(data?.instagram)},
    {label: 'x', url: normalizeUrl(data?.twitter)},
    {label: 'yt', url: normalizeUrl(data?.youtube)},
    {label: 'tt', url: normalizeUrl(data?.tiktok)},
  ].filter(item => !!item.url);

  const hasCoordinates =
    data?.latitude != null && data?.longitude != null;
  const hasLocation = hasCoordinates || !!omrMapUrl;
  const locationLabel = hasCoordinates
    ? `${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}`
    : omrMapUrl || '-';
  const mapsLink = hasCoordinates
    ? `https://maps.google.com/?q=${data.latitude},${data.longitude}`
    : omrMapUrl || '';

  const confirmRemoveLocation = () => {
    if (!churchId || removingLocation) {
      return;
    }
    Alert.alert(t('removeLocation'), t('removeLocationConfirm'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            setRemovingLocation(true);
            await removeChurchLocation(churchId);
            markDataChanged('churches');
            Alert.alert(t('success'), t('locationRemoved'));
            await fetchChurch();
          } catch (e) {
            Alert.alert(t('removeLocationFailed'), getApiErrorMessage(e, t));
          } finally {
            setRemovingLocation(false);
          }
        },
      },
    ]);
  };

  // A link that can't be opened (no mail app, bad URL) used to do nothing at all.
  const openLink = (url?: string) => {
    if (!url) {
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), `${t('cannotOpenLink')}\n${url.replace(/^(mailto|tel):/, '')}`);
    });
  };

  const renderRow = (
    label: string,
    value: string,
    opts?: {
      link?: string;
      valueStyle?: any;
      noDivider?: boolean;
      press?: () => void;
    },
  ) => (
    <View style={[styles.row, {borderBottomColor: C.border}, opts?.noDivider && styles.noDivider]}>
      <Text style={[styles.rowLabel, {color: C.textPrimary}]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          {color: C.textPrimary},
          opts?.link ? [styles.rowLink, {color: COLORS.mainColor}] : null,
          opts?.valueStyle,
        ]}
        onPress={opts?.press || (opts?.link ? () => openLink(opts.link) : undefined)}>
        {value || '-'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('churchDetail')} />
        {!loading && !data && loadError ? (
          <ApiErrorState error={loadError} onRetry={fetchChurch} />
        ) : (
        <ScrollView

          contentContainerStyle={{paddingBottom: ms(24)}}>
          {!loading && data && !hasLocation && !data.disabled && (
            <View style={styles.locationCard}>
              <View style={styles.locationContent}>
                <Text style={styles.locationTitle}>
                  {t('omrMapLocationMissing') ||
                    'This church does not have a map location yet.'}
                </Text>
              </View>
              {isSuperAdminUser ? (
                <TouchableOpacity
                  style={styles.locationAction}
                  onPress={() =>
                    navigation.navigate('EditChurchLocation' as any, {
                      id: churchId,
                      latitude: data?.latitude,
                      longitude: data?.longitude,
                    })
                  }>
                  <Text style={styles.locationActionText}>
                    {t('addLocation') || 'Add'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.mainColor} />
            </View>
          ) : !data ? (
            <Text style={[styles.loading, {color: C.textPrimary}]}>
              {t('noDataFound')}
            </Text>
          ) : (
            <>
              <View style={[styles.sectionHeader, {borderColor: C.border}]}>
                <Text style={[styles.sectionHeaderText, {color: C.textPrimary}]}>
                  {t('overview')}
                </Text>
              </View>

              <View style={[styles.summaryRow, {borderColor: C.border}]}>
                <View style={styles.summaryPhotoWrap}>
                  <Image
                    source={imageUri ? {uri: imageUri} : blankChurch}
                    style={[styles.summaryPhoto, {borderColor: C.border}]}
                    resizeMode="cover"
                    onError={() => setImageError(true)}
                  />
                  {canOpenFullImage ? (
                    <TouchableOpacity
                      style={[
                        styles.iconBtn,
                        styles.zoomBtn,
                        {backgroundColor: C.surface},
                      ]}
                      onPress={() => setImageModalVisible(true)}>
                      <Image source={zoomOutIcon} style={styles.zoomIcon} resizeMode="contain" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.summaryText}>
                  <Text style={[styles.summaryName, {color: COLORS.mainColor}]}>
                    {data.name || '-'}
                  </Text>
                  {/* <Text style={[styles.summarySub, {color: C.textPrimary}]}>
                    {data.short_name || '-'}
                  </Text> */}
                </View>
                <TouchableOpacity
                  style={[styles.iconBtn, styles.editBtn]}
                  onPress={() => navigation.navigate('EditChurch', {id: churchId})}>
                  <Image source={editIcon} style={styles.iconImg} resizeMode="contain" />
                </TouchableOpacity>
              </View>

              <View style={[styles.table, {borderColor: C.border}]}>
                {renderRow(t('churchCityTown'), data.city_name || '-', {valueStyle: styles.boldValue})}
                {renderRow(t('nation'), data.country_name || '-', {
                  valueStyle: styles.boldValue,
                })}
                {renderRow(
                  t('churchServiceAddressPostal'),
                  serviceAddressLine || '-',
                )}
                {renderRow(t('churchServiceTimeDay'), serviceTimeDay || '-', {valueStyle: styles.normalValue})}
                {renderRow(t('language'), data.language_name || '-', {valueStyle: styles.normalValue})}
                {renderRow(t('churchWeAreMeeting'), prettyMeetingVenue(data.service_venue))}
                {renderRow(t('churchBirthdayLabel'), churchBirthday || '-', {valueStyle: styles.normalValue})}
                {renderRow(t('churchMotherChurchLabel'), data.parent_name || '-', {
                  valueStyle: styles.normalValue,
                  link: data.parent_id ? `church:${data.parent_id}` : '',
                  // push: navigate() to the same screen name only swapped this
                  // church out (Back then skipped it).
                  press: data.parent_id
                    ? () =>
                        navigation.push('ChurchDetail' as any, {
                          id: data.parent_id,
                        })
                    : undefined,
                })}
              </View>

              <View style={[styles.sectionHeader, {borderColor: C.border}]}>
                <Text style={[styles.sectionHeaderText, {color: C.textPrimary}]}>
                  {t('churchContactDetails')}
                </Text>
              </View>

              <View style={[styles.table, {borderColor: C.border}]}>
                {renderRow(t('pastor'), data.pastor_name || '-', {
                  press: data.pastor_id
                    ? () =>
                        navigation.navigate('User' as any, {
                          userId: data.pastor_id,
                        })
                    : undefined,
                  valueStyle: {color: COLORS.mainColor, fontWeight: '700'},
                })}
                {renderRow(t('churchEmailLabel'), emailAddress || '-', {
                  link: emailAddress ? `mailto:${emailAddress}` : '',
                  valueStyle: styles.normalValue,
                })}
                {renderRow(t('churchPhoneLabel'), data.office_phone || '-', {
                  valueStyle: styles.normalValue,
                  link: data.office_phone
                    ? `tel:${String(data.office_phone).replace(/[^\d+]/g, '')}`
                    : '',
                })}
                {renderRow(t('website'), websiteUrl || '-', {link: websiteUrl || '', valueStyle: styles.normalValue})}
                <View style={[styles.row, {borderBottomColor: C.border}]}>
                  <Text style={[styles.rowLabel, {color: C.textPrimary}]}>{t('socialMedia')}</Text>
                  <View style={styles.socialWrap}>
                    {socialItems.length ? (
                      socialItems.map(item => (
                        <TouchableOpacity
                          key={item.label}
                          onPress={() => openLink(item.url)}
                          style={[styles.socialChip, {borderColor: C.border}]}>
                          <Text style={[styles.socialLabel, {color: C.textPrimary}]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={[styles.rowValue, {color: C.textPrimary}]}>-</Text>
                    )}
                  </View>
                </View>
                {renderRow(t('churchMailingAddressPostal'), mailingAddressLine || '-', {
                  noDivider: true,
                })}
              </View>

              <View style={[styles.sectionHeader, {borderColor: C.border}]}>
                <Text style={[styles.sectionHeaderText, {color: C.textPrimary}]}>
                  {t('omrDetails')}
                </Text>
              </View>

              <View style={[styles.table, {borderColor: C.border}]}>
                {renderRow(t('omrNumber'), data.omr_number ? `#${data.omr_number}` : '-', {
                  valueStyle: styles.normalValue,
                })}
                {renderRow(t('churchGeographicRegionLabel'), data.geographical_region_name || '-', {
                  valueStyle: styles.normalValue,
                })}
                {renderRow(t('churchNetwork'), data.church_network_name || '-', {
                  valueStyle: styles.normalValue,
                })}
                {renderRow(t('apostolicRegion'), data.church_region_name || '-', {
                  valueStyle: styles.normalValue,
                })}
                {renderRow(t('languageRegion'), data.language_region_name || '-', {
                  valueStyle: styles.normalValue,
                })}
                <View style={[styles.row, {borderBottomColor: C.border}]}>
                  <Text style={[styles.rowLabel, {color: C.textPrimary}]}>{t('attributes')}</Text>
                  <View style={styles.attributeWrap}>
                    {attributeItems.length ? (
                      attributeItems.map(item => (
                        <Text
                          key={item.key}
                          style={[
                            styles.attributeToken,
                            item.key === 'mother' && styles.attributeTokenMother,
                            item.key === 'msc' && styles.attributeTokenMsc,
                            item.key === 'map' && styles.attributeTokenMap,
                          ]}>
                          {item.label}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.rowValue, styles.normalValue, {color: C.textPrimary}]}>-</Text>
                    )}
                  </View>
                </View>
                {renderRow(t('churchType'), data.church_type_name || '-', {
                  valueStyle: styles.normalValue,
                })}
                {renderRow(t('sensitiveNation'), data.sensitive_nation ? t('yes') : t('no'), {
                  valueStyle: styles.normalValue,
                })}
                {renderRow(t('currency'), data.currency_name || '-', {
                  valueStyle: styles.normalValue,
                })}
                <View style={[styles.row, styles.noDivider, {borderBottomColor: C.border}]}>
                  <Text style={[styles.rowLabel, {color: C.textPrimary}]}>
                    {t('omrMapLocationLabel')}
                  </Text>
                  <View style={styles.locationRowRight}>
                    <Text
                      style={[
                        styles.rowValue,
                        styles.normalValue,
                        mapsLink ? [styles.rowLink, {color: COLORS.mainColor}] : null,
                      ]}
                      onPress={mapsLink ? () => openLink(mapsLink) : undefined}>
                      {locationLabel}
                    </Text>
                    {isSuperAdminUser && hasLocation ? (
                      <TouchableOpacity
                        style={styles.locationEditChip}
                        onPress={() =>
                          navigation.navigate('EditChurchLocation' as any, {
                            id: churchId,
                            latitude: data?.latitude,
                            longitude: data?.longitude,
                          })
                        }>
                        <Text style={styles.locationEditChipText}>
                          {t('edit') || 'Edit'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {isSuperAdminUser && hasLocation ? (
                      <TouchableOpacity
                        style={styles.locationEditChip}
                        disabled={removingLocation}
                        accessibilityRole="button"
                        accessibilityLabel={t('removeLocation')}
                        accessibilityState={{busy: removingLocation, disabled: removingLocation}}
                        onPress={confirmRemoveLocation}>
                        {removingLocation ? (
                          <ActivityIndicator size="small" color={COLORS.dangerColor} />
                        ) : (
                          <Text style={[styles.locationEditChipText, styles.locationRemoveChipText]}>
                            {t('remove')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              {fromClone ? (
                <View style={styles.fullWidthActionWrap}>
                  <AppButton
                    variant="primary"
                    onPress={() =>
                      navigation.navigate('AddCloneChurch' as any, {
                        id: churchId,
                      })
                    }>
                    {t('cloneThisChurch')}
                  </AppButton>
                </View>
              ) : isSuperAdminUser ? (
                <View style={styles.fullWidthActionWrap}>
                  {data.disabled ? (
                    <AppButton
                      style={styles.enableChurchButton}
                      onPress={() =>
                        navigation.navigate('EnableChurch' as any, {
                          id: churchId,
                        })
                      }>
                      {t('enableChurch')}
                    </AppButton>
                  ) : (
                    <DeleteButton
                      label={t('disableThisChurch')}
                      onPress={() =>
                        navigation.navigate('DisableChurch' as any, {
                          id: churchId,
                        })
                      }
                      fullWidth
                    />
                  )}
                </View>
              ) : null}

              <ZoomableImageModal
                visible={imageModalVisible}
                uri={imageUri}
                onClose={() => setImageModalVisible(false)}
              />
            </>
          )}
        </ScrollView>
        )}
      </Layout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(24),
  },
  loading: {
    padding: ms(16),
    fontSize: fs(14),
  },
  sectionHeader: {
    borderTopWidth: 0,
    borderBottomWidth: 1,
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    marginTop: ms(8),
  },
  sectionHeaderText: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  summaryRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: 1,
    borderWidth: 0,
  },
  summaryPhoto: {
    width: ws(54),
    height: ws(54),
    borderRadius: rs(4),
    borderWidth: 1,
  },
  summaryPhotoWrap: {
    width: ws(54),
    height: ws(54),
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    flex: 1,
    marginLeft: ms(12),
    paddingRight: ws(44),
  },
  summaryName: {
    fontSize: fs(18),
    fontWeight: '700',
  },
  summarySub: {
    fontSize: fs(16),
    marginTop: ms(2),
  },
  iconBtn: {
    position: 'absolute',
    bottom: ms(8),
    width: ws(20),
    height: ws(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtn: {
    right: ms(-25),
    bottom: ms(-10),
    borderRadius: rs(3),
  },
  editBtn: {
    right: ms(10),
  },
  zoomIcon: {
    width: ws(16),
    height: ws(16),
  },
  iconImg: {
    width: ws(20),
    height: ws(20),
  },
  disabledBtn: {
    opacity: 0.45,
  },
  table: {
    borderWidth: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: ms(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: ms(6),
    paddingHorizontal: ms(10),
    borderBottomWidth: 1,
  },
  noDivider: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    width: ws(92),
    fontSize: fs(14),
    fontWeight: '400',
    lineHeight: fs(20),
  },
  rowValue: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '600',
    marginLeft: ms(8),
    lineHeight: fs(20),
  },
  boldValue: {
    fontWeight: '700',
  },
  normalValue: {
    fontWeight: '400',
  },
  rowLink: {
    textDecorationLine: 'none',
  },
  socialWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: ms(8),
    gap: ms(6),
  },
  socialChip: {
    minWidth: ws(18),
    height: ws(18),
    borderWidth: 1,
    borderRadius: rs(9),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(4),
  },
  socialLabel: {
    fontSize: fs(12),
    fontWeight: '700',
  },
  fullWidthActionWrap: {
    paddingTop: ms(12),
    paddingBottom: ms(4),
  },
  enableChurchButton: {
    width: '100%',
    backgroundColor: COLORS.successColor,
    borderColor: COLORS.successColor,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: ms(12),
    marginTop: ms(8),
    marginBottom: ms(8),
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: rs(10),
    backgroundColor: '#FFF4CC',
  },
  locationContent: {
    flex: 1,
    marginRight: ms(8),
  },
  locationTitle: {
    fontSize: fs(13),
    fontWeight: '600',
    lineHeight: fs(16),
    color: '#8A4B16',
  },
  locationDescription: {
    fontSize: fs(12),
    lineHeight: fs(14),
    marginTop: ms(1),
  },
  locationAction: {
    paddingHorizontal: ms(4),
    paddingVertical: ms(4),
  },
  locationActionText: {
    color: COLORS.mainColor,
    fontSize: fs(12),
    fontWeight: '700',
  },
  locationRowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: ms(8),
  },
  locationEditChip: {
    paddingHorizontal: ms(4),
    paddingVertical: ms(2),
    borderRadius: rs(8),
  },
  locationEditChipText: {
    fontSize: fs(11),
    fontWeight: '600',
    color: COLORS.mainColor,
  },
  locationRemoveChipText: {
    color: COLORS.dangerColor,
  },
  attributeWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: ms(8),
    gap: ms(6),
  },
  attributeToken: {
    fontSize: fs(14),
    fontWeight: '400',
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderWidth: 1,
    borderRadius: rs(6),
  },
  attributeTokenMother: {
    color: '#6EA43D',
    backgroundColor: '#DEEAD4',
    borderColor: '#BCD4A7',
  },
  attributeTokenMsc: {
    color: '#B65C16',
    backgroundColor: '#F1E0D1',
    borderColor: '#E3BE9D',
  },
  attributeTokenMap: {
    color: '#3E68B5',
    backgroundColor: '#DDE5F4',
    borderColor: '#B8C9E8',
  },
  fullImageBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  fullImageHeader: {
    alignSelf: 'flex-end',
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    marginTop: ms(28),
  },
  fullImageCloseText: {
    color: '#fff',
    fontSize: fs(24),
    fontWeight: '600',
  },
  fullImageContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(12),
    paddingBottom: ms(20),
  },
  fullImage: {
    width: '100%',
    height: '85%',
  },
});

/**
 * "01 January 2018\n[8 years old]" in the app language. The API date is a
 * calendar day: parsed as local (new Date('2018-01-01') is UTC midnight, the
 * previous day west of UTC).
 */
function formatDateWithAge(
  value: unknown,
  language: string,
  yearsOld: (age: number) => string,
): string {
  const d = parseYmd(value);
  if (!d) {
    return '';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  let month: string;
  try {
    month = d.toLocaleString(language || 'en', {month: 'long'});
  } catch {
    month = d.toLocaleString('en-US', {month: 'long'});
  }
  const yyyy = String(d.getFullYear());
  const age = getAge(d);
  return `${dd} ${month} ${yyyy}${age ? `\n[${yearsOld(age)}]` : ''}`;
}

function getAge(date: Date): number {
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) {
    age--;
  }
  return age > 0 ? age : 0;
}

function normalizeUrl(value?: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function prettyMeetingVenue(value?: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  return raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
