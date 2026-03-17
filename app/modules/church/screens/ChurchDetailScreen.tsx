import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text as RNText,
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
import {isSuperAdmin} from '../../../shared/utils/permissions';
import AppButton from '../../../shared/components/AppButton';
import {fs, ws, hs, ms, rs} from '../../../shared/utils/scale';

const blankChurch = require('../../../assets/images/church.png');
const zoomOutIcon = require('../../../assets/icons/zoom-out.png');
const editIcon = require('../../../assets/icons/edit.png');

export default function ChurchDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchId: number | null = route?.params?.id ?? null;
  const {t} = useTranslation();
  const C = useThemedColors();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const fetchChurch = async () => {
    if (!churchId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`churches/${churchId}`);
      setData(res?.data?.data || null);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) {
        return;
      }
      await fetchChurch();
    })();
    return () => {
      mounted = false;
    };
  }, [churchId]);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh details whenever screen gains focus (after enable/disable flow)
      fetchChurch();
      return () => {};
    }, [churchId]),
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api.get('users/me');
        if (!mounted) {
          return;
        }
        const rid = me?.data?.data?.role?.id;
        if (typeof rid === 'number') {
          setCurrentUserRoleId(rid);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
  const churchBirthday = formatDateWithAge(data?.date_of_birth);
  const attributeItems = [
    data?.is_mother_church ? {key: 'mother', label: t('mother')} : null,
    data?.is_msc ? {key: 'msc', label: t('msc')} : null,
    omrMapUrl ? {key: 'map', label: 'On Map'} : null,
  ].filter(Boolean) as Array<{key: 'mother' | 'msc' | 'map'; label: string}>;
  const socialItems = [
    {label: 'f', url: normalizeUrl(data?.facebook)},
    {label: 'ig', url: normalizeUrl(data?.instagram)},
    {label: 'x', url: normalizeUrl(data?.twitter)},
    {label: 'yt', url: normalizeUrl(data?.youtube)},
    {label: 'tt', url: normalizeUrl(data?.tiktok)},
  ].filter(item => !!item.url);

  const openLink = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: ms(24)}}>
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
                  <TouchableOpacity
                    style={[
                      styles.iconBtn,
                      styles.zoomBtn,
                      {backgroundColor: C.surface},
                      !canOpenFullImage && styles.disabledBtn,
                    ]}
                    onPress={() => setImageModalVisible(true)}
                    disabled={!canOpenFullImage}>
                    <Image source={zoomOutIcon} style={styles.iconImg} resizeMode="contain" />
                  </TouchableOpacity>
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
                {renderRow('City, Town', data.city_name || '-', {valueStyle: styles.boldValue})}
                {renderRow(t('nation'), data.country_name || '-', {
                  valueStyle: styles.boldValue,
                })}
                {renderRow(
                  'Service Address &\nPostal Code',
                  serviceAddressLine || '-',
                )}
                {renderRow('Service Time &\nDay', serviceTimeDay || '-', {valueStyle: styles.normalValue})}
                {renderRow(t('language'), data.language_name || '-', {valueStyle: styles.normalValue})}
                {renderRow('We are\nmeeting', prettyMeetingVenue(data.service_venue))}
                {renderRow('Church’s\nBirthday', churchBirthday || '-', {valueStyle: styles.normalValue})}
                {renderRow('Mother\nChurch', data.parent_name || '-', {
                  valueStyle: styles.normalValue,
                  link: data.parent_id ? `church:${data.parent_id}` : '',
                  press: data.parent_id
                    ? () =>
                        navigation.navigate('ChurchDetail' as any, {
                          id: data.parent_id,
                        })
                    : undefined,
                })}
              </View>

              <View style={[styles.sectionHeader, {borderColor: C.border}]}>
                <Text style={[styles.sectionHeaderText, {color: C.textPrimary}]}>
                  Contact Details
                </Text>
              </View>

              <View style={[styles.table, {borderColor: C.border}]}>
                {renderRow('Pastor', data.pastor_name || '-', {
                  press: data.pastor_id
                    ? () =>
                        navigation.navigate('User' as any, {
                          userId: data.pastor_id,
                        })
                    : undefined,
                  valueStyle: {color: COLORS.mainColor, fontWeight: '700'},
                })}
                {renderRow('Church e-mail', emailAddress || '-', {
                  link: emailAddress ? `mailto:${emailAddress}` : '',
                  valueStyle: styles.normalValue,
                })}
                {renderRow('Church Phone', data.office_phone || '-', {valueStyle: styles.normalValue})}
                {renderRow(t('website'), websiteUrl || '-', {link: websiteUrl || '', valueStyle: styles.normalValue})}
                <View style={[styles.row, {borderBottomColor: C.border}]}>
                  <Text style={[styles.rowLabel, {color: C.textPrimary}]}>Social Media</Text>
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
                {renderRow('Mailing\nAddress &\nPostal Code', mailingAddressLine || '-', {
                  noDivider: true,
                })}
              </View>

              <View style={[styles.sectionHeader, {borderColor: C.border}]}>
                <Text style={[styles.sectionHeaderText, {color: C.textPrimary}]}>
                  OMR Details
                </Text>
              </View>

              <View style={[styles.table, {borderColor: C.border}]}>
                {renderRow(t('omrNumber'), data.omr_number ? `#${data.omr_number}` : '-', {
                  valueStyle: styles.normalValue,
                })}
                {renderRow('Geographic\nRegion', data.geographical_region_name || '-', {
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
                  <Text style={[styles.rowLabel, {color: C.textPrimary}]}>Attributes</Text>
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
                {renderRow('OMR Map\nLocation', omrMapUrl || '-', {
                  noDivider: true,
                  link: omrMapUrl || '',
                  valueStyle: styles.normalValue,
                })}
              </View>

              {isSuperAdminUser ? (
                <View style={{paddingHorizontal: 0}}>
                  {data.disabled ? (
                    <AppButton
                      style={{
                        marginTop: ms(8),
                        backgroundColor: COLORS.successColor,
                        borderColor: COLORS.successColor,
                      }}
                      onPress={() =>
                        navigation.navigate('EnableChurch' as any, {
                          id: churchId,
                        })
                      }>
                      {t('enableChurch')}
                    </AppButton>
                  ) : (
                    <AppButton
                      style={{
                        marginTop: ms(8),
                        backgroundColor: COLORS.dangerColor,
                        borderColor: COLORS.dangerColor,
                      }}
                      onPress={() =>
                        navigation.navigate('DisableChurch' as any, {
                          id: churchId,
                        })
                      }>
                      {t('disableThisChurch')}
                    </AppButton>
                  )}
                </View>
              ) : null}

              <Modal
                visible={imageModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setImageModalVisible(false)}>
                <View style={styles.fullImageBackdrop}>
                  <TouchableOpacity
                    style={styles.fullImageHeader}
                    onPress={() => setImageModalVisible(false)}>
                    <RNText style={styles.fullImageCloseText}>✕</RNText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.fullImageContent}
                    activeOpacity={1}
                    onPress={() => setImageModalVisible(false)}>
                    {imageUri ? (
                      <Image source={{uri: imageUri}} style={styles.fullImage} resizeMode="contain" />
                    ) : null}
                  </TouchableOpacity>
                </View>
              </Modal>
            </>
          )}
        </ScrollView>
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
    fontSize: fs(16),
    fontWeight: '700',
  },
  summarySub: {
    fontSize: fs(12),
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
  iconImg: {
    width: ws(16),
    height: ws(16),
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
    fontSize: fs(11.5),
    fontWeight: '400',
    lineHeight: fs(16),
  },
  rowValue: {
    flex: 1,
    fontSize: fs(11.5),
    fontWeight: '600',
    marginLeft: ms(8),
    lineHeight: fs(16),
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
    fontSize: fs(10),
    fontWeight: '700',
  },
  attributeWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: ms(8),
    gap: ms(6),
  },
  attributeToken: {
    fontSize: fs(11.5),
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

function formatDateWithAge(value?: any): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', {month: 'long'});
  const yyyy = String(d.getFullYear());
  const age = getAge(d);
  return `${dd} ${month} ${yyyy}${age ? `\n[${age} years old]` : ''}`;
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
