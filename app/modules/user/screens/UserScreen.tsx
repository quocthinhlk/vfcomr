import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Layout, Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Header} from '../../../shared/components/Header';
import AddNewHeaderButton from '../../../shared/components/AddNewHeaderButton';
import {getUserById, updateUser, UserDetailData} from '../services/user.service';
import {getChurchDetail} from '../../church/services/church.service';
import api from '../../../config/api';
import {COLORS} from '../../../shared/constants/colors';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {isSuperAdmin} from '../../../shared/utils/permissions';
import {globalStyles} from '../../../shared/styles/global';
import {useThemedColors} from '../../../shared/styles/theme';
import {fs, hs, ms, rs, ws} from '../../../shared/utils/scale';
import ZoomableImageModal from '../../../shared/components/ZoomableImageModal';
import {downloadImageToCameraRoll} from '../../../shared/utils/downloadImage';
import IosActionSheet from '../../../shared/components/IosActionSheet';
import ImagePicker from 'react-native-image-crop-picker';

const blankAvatar = require('../../../assets/images/blank-avatar.png');
const editIcon = require('../../../assets/icons/edit.png');
const zoomOutIcon = require('../../../assets/icons/zoom-out.png');
const USER_DETAIL_TIMEOUT_MS = 15000;
const REQUEST_TIMEOUT_ERROR = 'REQUEST_TIMEOUT';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(REQUEST_TIMEOUT_ERROR));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export const UserScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId: number | undefined = route?.params?.userId;
  const refetchKey: number | undefined = route?.params?.refetchKey;
  const {t} = useTranslation();
  const C = useThemedColors();

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(false);
  const [pastorChurches, setPastorChurches] = useState<any[]>([]);
  const [loadingChurches, setLoadingChurches] = useState<boolean>(false);
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [imageMenuVisible, setImageMenuVisible] = useState(false);
  const [localAvatarPath, setLocalAvatarPath] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState<string>('');
  const lastHandledRefetchKeyRef = useRef<number | null>(null);

  const closeImagePopup = useCallback(() => {
    // Important: if the sheet is visible (even behind the image modal),
    // it can still block touches after the image modal closes.
    setImageMenuVisible(false);
    setImageModalVisible(false);
  }, []);

  useEffect(() => {
    if (!imageModalVisible) {
      setImageMenuVisible(false);
    }
  }, [imageModalVisible]);

  const formatPhoneDisplay = (value?: string | null) => {
    if (!value) return '';
    const hasPlus = /^\+/.test(String(value));
    const digits = String(value).replace(/\D/g, '');
    const grouped = digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
    return hasPlus ? `+${grouped}` : grouped;
  };

  const loadPastorChurches = useCallback(async (ids: number[]) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      setPastorChurches([]);
      setLoadingChurches(false);
      return;
    }

    setLoadingChurches(true);
    try {
      const churches = await Promise.all(
        ids.map((churchId: number) =>
          getChurchDetail(churchId).catch(() => null),
        ),
      );
      const validChurches = churches.filter(ch => !!ch);
      setPastorChurches(validChurches);
    } catch {
      setPastorChurches([]);
    } finally {
      setLoadingChurches(false);
    }
  }, []);

  const fetchUserDetails = useCallback(
    async (opts?: {showLoading?: boolean}) => {
      const shouldShowLoading = opts?.showLoading !== false;
      if (shouldShowLoading) {
        setLoading(true);
      }
      setError(null);

      if (!userId) {
        setUser(null);
        setPastorChurches([]);
        setLoadingChurches(false);
        setError(tRef.current('userIDMissing'));
        if (shouldShowLoading) setLoading(false);
        return;
      }

      try {
        const res = await withTimeout(getUserById(Number(userId)), USER_DETAIL_TIMEOUT_MS);
        const userData = res?.data ?? null;
        setUser(userData);

        const pastorChurchIds = (userData as any)?.pastor_church_ids;
        if (Array.isArray(pastorChurchIds) && pastorChurchIds.length > 0) {
          void loadPastorChurches(pastorChurchIds);
        } else {
          setPastorChurches([]);
          setLoadingChurches(false);
        }
      } catch (e: any) {
        setUser(null);
        setPastorChurches([]);
        setLoadingChurches(false);
        if (e?.message === REQUEST_TIMEOUT_ERROR) {
          setError(tRef.current('requestTimedOut'));
        } else {
          setError(e?.message || tRef.current('failedToLoadUserData'));
        }
      } finally {
        if (shouldShowLoading) {
          setLoading(false);
        }
      }
    },
    [loadPastorChurches, userId],
  );

  useEffect(() => {
    void fetchUserDetails({showLoading: true});
  }, [fetchUserDetails, userId]);

  useEffect(() => {
    if (!refetchKey) return;
    if (lastHandledRefetchKeyRef.current === refetchKey) return;
    lastHandledRefetchKeyRef.current = refetchKey;
    void fetchUserDetails({showLoading: false});
    // Clear the flag so it only refetches once.
    navigation.setParams({refetchKey: undefined});
  }, [fetchUserDetails, navigation, refetchKey]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('users/me');
        const me = res?.data?.data;
        const r = me?.role?.id;
        const currentId = me?.id;

        if (typeof r === 'number') setRoleId(r);
        if (typeof currentId === 'number') {
          setIsOwnProfile(userId === currentId);
        }
      } catch {}
    })();
  }, [userId]);

  const churchName = (user as any)?.church_name || (user as any)?.church?.name || '-';
  const displayName = (() => {
    const fullName = user?.name?.trim();
    if (!fullName) return '-';
    const prefix = ((user as any)?.prefix || '').toString().trim();
    return prefix ? `${prefix} ${fullName}` : fullName;
  })();
  const pastorOfName = pastorChurches?.[0]?.name || churchName;
  const omrNumberRaw =
    (user as any)?.omr_number ||
    (user as any)?.omr_no ||
    (user as any)?.omr_id ||
    user?.id;
  const omrNumber = omrNumberRaw ? `#${omrNumberRaw}` : '-';
  const oversightAssignment =
    (user as any)?.oversight_assignment || user?.role?.remarks || '-';
  const credentialsForm =
    (user as any)?.credentials_form ||
    (user as any)?.credentials ||
    '';
  const hasMinisterialCredentials = Boolean(credentialsForm);
  const ministerialCredentials = (() => {
    if (!hasMinisterialCredentials) return '';
    const number = user?.credentials_number ? `# ${user.credentials_number}` : '';
    const expiry = formatDatePretty(user?.credentials_expiry_date);
    const lines = [credentialsForm, number, expiry ? `${t('expires')}: ${expiry}` : ''].filter(Boolean);
    return lines.join('\n');
  })();
  const normalizeFileUri = (p: string) => (p.startsWith('file://') ? p : `file://${p}`);
  const avatarUri = localAvatarPath
    ? normalizeFileUri(localAvatarPath)
    : user?.photo_url && !avatarError
      ? user.photo_url
      : null;
  const canOpenFullImage = Boolean(avatarUri);

  const refreshUser = useCallback(
    async (id: number) => {
      try {
        const res = await withTimeout(getUserById(Number(id)), USER_DETAIL_TIMEOUT_MS);
        const userData = res?.data ?? null;
        setUser(userData);
      } catch {
        // ignore refresh errors
      }
    },
    [],
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    toastOpacity.stopAnimation();
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setToastVisible(false));
    }, 3000);
  }, [toastOpacity]);

  const uploadAndApplyAvatar = useCallback(
    async (imagePath: string) => {
      const targetId = Number(userId || user?.id);
      if (!targetId) return;

      let uploadedUserPhotoPath: string | null = null;
      try {
        const form = new FormData();
        const fileName = imagePath.split('/').pop() || 'photo.jpg';
        form.append('file', {
          uri: imagePath,
          name: fileName,
          type: 'image/jpeg',
        } as any);
        form.append('entity_type', 'users');
        form.append('alt_text', String(displayName || '').trim());

        const uploadRes = await api.post('images/upload', form, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
        uploadedUserPhotoPath = uploadRes?.data?.data?.path || null;
      } catch {
        uploadedUserPhotoPath = null;
      }

      if (!uploadedUserPhotoPath) {
        Alert.alert(t('error'), t('imageDownloadError') || 'Could not upload image');
        return;
      }

      try {
        await updateUser(targetId, {user_photo: uploadedUserPhotoPath});
        setLocalAvatarPath(null);
        await refreshUser(targetId);
        closeImagePopup();
        showToast(t('profileUpdatedSuccess'));
      } catch (error: any) {
        Alert.alert(
          t('error'),
          error?.response?.data?.message || error?.message || t('couldNotUpdateUser'),
        );
      }
    },
    [api, closeImagePopup, displayName, refreshUser, showToast, t, user?.id, userId],
  );

  const openPhotoSourcePicker = useCallback(() => {
    const pickFromLibrary = async () => {
      try {
        const image: any = await ImagePicker.openPicker({
          width: 300,
          height: 300,
          cropping: true,
          cropperCircleOverlay: false,
          compressImageMaxWidth: 1024,
          compressImageMaxHeight: 1024,
          compressImageQuality: 0.8,
          includeBase64: false,
        });
        if (image?.size && image.size > 1572864) {
          Alert.alert('File too large', 'Please select an image under 1.5MB');
          return;
        }
        if (image?.path) {
          // Close the fullscreen preview immediately after cropping completes
          // to avoid flashing the old image while the new one loads.
          closeImagePopup();
          setLocalAvatarPath(image.path);
          void uploadAndApplyAvatar(image.path);
        }
      } catch {
        // user cancelled or picker error
      }
    };

    const takePhoto = async () => {
      try {
        const image: any = await ImagePicker.openCamera({
          width: 300,
          height: 300,
          cropping: true,
          cropperCircleOverlay: false,
          compressImageMaxWidth: 1024,
          compressImageMaxHeight: 1024,
          compressImageQuality: 0.8,
          includeBase64: false,
        });
        if (image?.size && image.size > 1572864) {
          Alert.alert('File too large', 'Please select an image under 1.5MB');
          return;
        }
        if (image?.path) {
          // Close the fullscreen preview immediately after cropping completes
          // to avoid flashing the old image while the new one loads.
          closeImagePopup();
          setLocalAvatarPath(image.path);
          void uploadAndApplyAvatar(image.path);
        }
      } catch {
        // user cancelled or camera error
      }
    };

    if (Platform.OS === 'ios') {
      const takeLabel = 'Take Photo';
      const chooseLabel = 'Choose Photo';
      const cancelLabel = t('cancel') || 'Cancel';
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [takeLabel, chooseLabel, cancelLabel],
          cancelButtonIndex: 2,
          userInterfaceStyle: 'light',
        },
        (idx: number) => {
          if (idx === 0) void takePhoto();
          if (idx === 1) void pickFromLibrary();
        },
      );
      return;
    }

    Alert.alert(t('changePhoto') || 'Change Photo', '', [
      {text: 'Take Photo', onPress: () => void takePhoto()},
      {text: 'Choose Photo', onPress: () => void pickFromLibrary()},
      {text: t('cancel') || 'Cancel', style: 'cancel'},
    ]);
  }, [t, uploadAndApplyAvatar]);

  const openEditScreen = () => {
    const targetId = Number(userId || user?.id);
    if (!targetId) return;
    navigation.navigate('EditProfile', {id: targetId});
  };

  const renderDetailRow = (
    label: string,
    value: string,
    valueStyle?: any,
    numberOfLines?: number,
  ) => (
    <View style={[styles.detailRow, {borderBottomColor: C.border}]}>
      <Text style={[styles.detailLabel, {color: C.textPrimary}]}>{label}</Text>
      <Text
        style={[styles.detailValue, {color: C.textPrimary}, valueStyle]}
        numberOfLines={numberOfLines}>
        {value || '-'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
          <Header title={t('pastorLeaderDetails')} />
          <View style={styles.fullScreenLoading}>
            <ActivityIndicator size="large" color={COLORS.mainColor} />
          </View>
        </Layout>
      </SafeAreaView>
    );
  }

  if (error && !user) {
    return (
      <SafeAreaView
        style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
        edges={['top', 'bottom', 'left', 'right']}>
        <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
          <Header title={t('pastorLeaderDetails')} />
          <View style={styles.fullScreenLoading}>
            <View style={[styles.errorBox, {backgroundColor: C.surface, borderWidth: 1, borderColor: C.error || '#ff4444'}]}>
              <Text style={[styles.errorText, {color: C.error || '#ff4444'}]}>{error}</Text>
            </View>
          </View>
        </Layout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <Layout style={[globalStyles.layout, {backgroundColor: C.background}]}>
        <Header title={t('pastorLeaderDetails')} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.profileCard, {backgroundColor: C.surface, borderColor: C.border}]}>
            <View style={[styles.summaryRow, {borderBottomColor: C.border}]}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!canOpenFullImage}
                onPress={() => setImageModalVisible(true)}
              >
                <Image
                  source={avatarUri ? {uri: avatarUri} : blankAvatar}
                  style={[
                    styles.detailsPhoto,
                    {borderColor: C.border},
                    !canOpenFullImage && styles.disabledAction,
                  ]}
                  resizeMode="cover"
                  onError={() => setAvatarError(true)}
                />
              </TouchableOpacity>
              <View style={styles.summaryText}>
                <Text style={[styles.nameText, {color: COLORS.mainColor}]}>
                  {displayName}
                </Text>
                <Text style={[styles.titleText, {color: C.textPrimary}]}>
                  {user?.title || '-'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.summaryActionBtn,
                  styles.fullscreenBtn,
                  {backgroundColor: C.surface},
                  !canOpenFullImage && styles.disabledAction,
                ]}
                onPress={() => setImageModalVisible(true)}
                disabled={!canOpenFullImage}>
                  <Image source={zoomOutIcon} style={styles.editIcon} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.summaryActionBtn, styles.editBtn, {backgroundColor: C.surface}]}
                onPress={openEditScreen}>
                <Image source={editIcon} style={styles.editIcon} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsTable}>
              <View style={[styles.detailRow, {borderBottomColor: C.border}]}>
                <Text style={[styles.detailLabel, {color: C.textPrimary}]}>
                  {t('pastorOf')}
                </Text>
                {loadingChurches ? (
                  <ActivityIndicator size="small" color={COLORS.mainColor} style={{flex: 1}} />
                ) : (
                  <Text
                    style={[
                      styles.detailValue,
                      styles.detailValueStrong,
                      {color: C.textPrimary},
                    ]}>
                    {pastorOfName}
                  </Text>
                )}
              </View>
              {renderDetailRow(t('from'), churchName)}
              {renderDetailRow(t('nation'), user?.country_name || '-', styles.detailValueStrong)}
              {renderDetailRow(t('role'), user?.title || '-')}
              {renderDetailRow(
                t('sensitiveNation'),
                user?.sensitive_nation ? t('yes') : t('no'),
                user?.sensitive_nation
                  ? [styles.redText, {color: C.error || '#c0392b'}]
                  : undefined,
              )}
              {renderDetailRow(
                t('email'),
                user?.email_address || '-',
                user?.email_address ? [styles.linkText, {color: COLORS.mainColor}] : undefined,
              )}
              {renderDetailRow(
                t('mobilePhone'),
                user?.mobile_phone ? formatPhoneDisplay(user.mobile_phone) : '-',
              )}
              {renderDetailRow(
                t('username'),
                (user as any)?.username || '-',
                [styles.greenText, {color: C.textSecondary}],
              )}
              {renderDetailRow(t('omrNumber'), omrNumber)}
              {renderDetailRow(t('omrStatus'), user?.role?.name || '-')}
              {renderDetailRow(t('oversightAssignment'), oversightAssignment)}
              {renderDetailRow(
                t('language'),
                (user as any)?.language_name || (user as any)?.language?.name || '-',
              )}
              {hasMinisterialCredentials ? (
                <View style={[styles.detailRow, {borderBottomColor: C.border}]}>
                  <Text style={[styles.detailLabel, {color: C.textPrimary}]}>
                    {t('ministerialCredentials')}
                  </Text>
                  <Text style={[styles.detailValue, {color: C.textPrimary}]}>
                    {ministerialCredentials}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {isSuperAdmin(roleId) && !isOwnProfile ? (
            <View style={{marginTop: ms(12)}}>
              <AddNewHeaderButton
                name="DeleteUser"
                params={{userId}}
                text={t('deleteUser')}
                prefix=""
                style={{
                  backgroundColor: COLORS.dangerColor,
                  marginTop: 0,
                }}
                textStyle={{fontSize: fs(12)}}
              />
            </View>
          ) : null}
        </ScrollView>
        <ZoomableImageModal
          visible={imageModalVisible}
          uri={avatarUri}
          onClose={closeImagePopup}
          headerRight={
            avatarUri ? (
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    const downloadLabel = t('download') || 'Download';
                    const changePhotoLabel = t('changePhoto') || 'Change Photo';
                    const cancelLabel = t('cancel') || 'Cancel';

                    ActionSheetIOS.showActionSheetWithOptions(
                      {
                        options: [downloadLabel, changePhotoLabel, cancelLabel],
                        cancelButtonIndex: 2,
                        userInterfaceStyle: 'light',
                      },
                      async (buttonIndex: number) => {
                        if (buttonIndex === 0) {
                          if (!avatarUri || downloadingImage) return;
                          try {
                            setDownloadingImage(true);
                            await downloadImageToCameraRoll(avatarUri, {filePrefix: 'user-avatar'});
                            Alert.alert(t('success'), t('imageDownloadSuccess'));
                          } catch {
                            Alert.alert(t('error'), t('imageDownloadError'));
                          } finally {
                            setDownloadingImage(false);
                          }
                          return;
                        }
                        if (buttonIndex === 1) {
                          if (!isOwnProfile) return;
                          requestAnimationFrame(() => openPhotoSourcePicker());
                        }
                      },
                    );
                    return;
                  }

                  setImageMenuVisible(true);
                }}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={{paddingHorizontal: ms(6), paddingVertical: ms(4)}}
              >
                <RNText style={{color: '#fff', fontSize: fs(22), fontWeight: '700', opacity: downloadingImage ? 0.6 : 1}}>
                  ⋯
                </RNText>
              </TouchableOpacity>
            ) : null
          }
        />

        {Platform.OS === 'android' ? (
          <IosActionSheet
            visible={imageMenuVisible}
            onClose={() => setImageMenuVisible(false)}
            cancelLabel={t('cancel') || 'Cancel'}
            items={[
              {
                label: t('download') || 'Download',
                disabled: !avatarUri || downloadingImage,
                onPress: async () => {
                  if (!avatarUri || downloadingImage) return;
                  try {
                    setDownloadingImage(true);
                    await downloadImageToCameraRoll(avatarUri, {filePrefix: 'user-avatar'});
                    Alert.alert(t('success'), t('imageDownloadSuccess'));
                  } catch {
                    Alert.alert(t('error'), t('imageDownloadError'));
                  } finally {
                    setDownloadingImage(false);
                  }
                },
              },
              {
                label: t('changePhoto') || 'Change Photo',
                disabled: !isOwnProfile,
                onPress: () => {
                  requestAnimationFrame(() => openPhotoSourcePicker());
                },
              },
            ]}
          />
        ) : null}

        <Modal
          transparent
          visible={toastVisible}
          animationType="none"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          hardwareAccelerated
        >
          <View pointerEvents="none" style={styles.toastModalRoot}>
            <Animated.View
              style={[
                styles.toast,
                {backgroundColor: C.surface, borderColor: C.border, opacity: toastOpacity},
              ]}
            >
              <Text style={{color: C.textPrimary, fontWeight: '700'}}>
                {toastMessage || t('profileUpdatedSuccess')}
              </Text>
            </Animated.View>
          </View>
        </Modal>
      </Layout>
    </SafeAreaView>
  );
};

function formatDatePretty(value?: any): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', {month: 'short'});
  const yyyy = String(d.getFullYear());
  return `${dd} ${month} ${yyyy}`;
}

const styles = StyleSheet.create({
  profileCard: {
    marginHorizontal: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingVertical: ms(8),
    paddingHorizontal: ms(4),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: ms(12),
    paddingBottom: ms(18),
    borderBottomWidth: 1,
  },
  summaryText: {
    flex: 1,
    marginLeft: ms(14),
  },
  nameText: {
    fontSize: fs(18),
    fontWeight: '700',
  },
  titleText: {
    marginTop: ms(4),
    fontSize: fs(14),
    fontWeight: '500',
  },
  detailsPhoto: {
    width: ws(84),
    height: ws(84),
    borderRadius: ws(42),
    borderWidth: 1,
  },
  summaryActionBtn: {
    position: 'absolute',
    bottom: ms(6),
    width: ws(24),
    height: ws(24),
    borderRadius: rs(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenBtn: {
    left: ws(92),
  },
  editBtn: {
    right: 0,
  },
  toast: {
    maxWidth: ms(320),
    width: '90%',
    paddingVertical: ms(12),
    paddingHorizontal: ms(14),
    borderRadius: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastModalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    width: ws(20),
    height: ws(20),
  },
  disabledAction: {
    opacity: 0.45,
  },
  detailsTable: {
    borderTopWidth: 0,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: ms(8),
    paddingHorizontal: ms(12),
    borderBottomWidth: 1,
  },
  detailLabel: {
    width: ws(125),
    fontSize: fs(14),
    fontWeight: '500',
    flexShrink: 0,
  },
  detailValue: {
    flex: 1,
    fontSize: fs(14),
    fontWeight: '600',
    lineHeight: fs(20),
  },
  detailValueStrong: {
    fontWeight: '700',
  },
  redText: {
    color: '#c0392b',
    fontWeight: '700',
  },
  greenText: {fontWeight: '700'},
  linkText: {
    textDecorationLine: 'underline',
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  errorBox: {
    marginTop: ms(12),
    borderRadius: rs(8),
    padding: ms(10),
  },
  errorText: {},
});

export default UserScreen;
