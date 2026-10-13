import React, {useEffect, useRef, useState} from 'react';
import {markDataChanged} from '../../../shared/hooks/useReloadOnReturn';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@ui-kitten/components';
import {useNavigation, useRoute} from '@react-navigation/native';
import MapView, {
  LatLng,
  MapPressEvent,
  Marker,
  Region,
  UserLocationChangeEvent,
} from 'react-native-maps';
import {Header} from '../../../shared/components/Header';
import {globalStyles} from '../../../shared/styles/global';
import {formStyles} from '../../../shared/styles/form';
import {SaveButton, CancelButton} from '../../../shared/components/ActionButtons';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {useThemedColors} from '../../../shared/styles/theme';
import {useThemeMode} from '../../../shared/context/ThemeContext';
import {fs, ms} from '../../../shared/utils/scale';
import {returnAfterEdit} from '../../../shared/utils/returnToList';
import {removeChurchLocation, updateChurchLocation} from '../services/church.service';
import {getApiErrorMessage} from '../../../shared/utils/apiErrorHandler';
import {COLORS} from '../../../shared/constants/colors';
import {requestLocationPermission} from '../../../shared/services/permissions.service';

const DEFAULT_REGION: Region = {
  latitude: 1.3521,
  longitude: 103.8198,
  latitudeDelta: 45,
  longitudeDelta: 45,
};

export const EditChurchLocationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const churchId: number | undefined = route.params?.id;
  const {t} = useTranslation();
  const C = useThemedColors();
  const {theme} = useThemeMode();

  const initialCoordinate =
    route.params?.latitude != null && route.params?.longitude != null
      ? {
          latitude: Number(route.params.latitude),
          longitude: Number(route.params.longitude),
        }
      : null;
  const [coordinate, setCoordinate] = useState<LatLng | null>(initialCoordinate);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const busy = saving || removing;
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  // Android only turns on the "my location" layer if permission is already
  // granted when showsUserLocation becomes true, so wait for the grant.
  const [locationGranted, setLocationGranted] = useState(false);
  // Keeps Google's map controls (my-location button) below the helper card.
  const [helperHeight, setHelperHeight] = useState(0);

  useEffect(() => {
    let active = true;
    // Ask for location so we can show user's position on the map.
    requestLocationPermission({showAlertIfBlocked: true})
      .then(result => {
        if (active) {
          setLocationGranted(result.granted);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const onSave = async () => {
    if (!churchId || !coordinate) {
      Alert.alert(
        t('validation') || 'Validation',
        t('pleaseEnterValidCoordinates') ||
          'Please select a location on the map.',
      );
      return;
    }

    try {
      setSaving(true);
      await updateChurchLocation(
        churchId,
        coordinate.latitude,
        coordinate.longitude,
      );
      markDataChanged('churches');
      Alert.alert(t('success'), t('locationSaved') || 'Location saved.', [
        {
          text: t('ok'),
          onPress: () => returnAfterEdit(navigation),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        t('error'),
        error?.message || t('saveFailed') || 'Failed to save location.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Only offered when the church already has a saved location.
  const onRemove = () => {
    if (!churchId || busy) {
      return;
    }
    Alert.alert(t('removeLocation'), t('removeLocationConfirm'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            setRemoving(true);
            await removeChurchLocation(churchId);
            markDataChanged('churches');
            Alert.alert(t('success'), t('locationRemoved'), [
              {text: t('ok'), onPress: () => returnAfterEdit(navigation)},
            ]);
          } catch (error) {
            Alert.alert(t('removeLocationFailed'), getApiErrorMessage(error, t));
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);
  };

  const onMapPress = (event: MapPressEvent) => {
    setCoordinate(event.nativeEvent.coordinate);
  };

  const onUserLocationChange = (event: UserLocationChangeEvent) => {
    const userCoord = event.nativeEvent.coordinate;
    if (!userCoord || hasCenteredOnUser) {
      return;
    }

    const region: Region = {
      latitude: userCoord.latitude,
      longitude: userCoord.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    if (!initialCoordinate) {
      mapRef.current?.animateToRegion(region, 600);
      if (!coordinate) {
        setCoordinate(userCoord);
      }
    }
    setHasCenteredOnUser(true);
  };

  const initialRegion: Region = initialCoordinate
    ? {
        ...initialCoordinate,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : DEFAULT_REGION;

  return (
    <SafeAreaView
      style={[globalStyles.safeAreaView, {backgroundColor: C.background}]}
      edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.screen, {backgroundColor: C.background}]}>
        <View style={styles.header}>
          <Header title={t('addLocation') || 'Add Location'} showMenu={false} />
        </View>
        <View style={styles.container}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            onPress={onMapPress}
            userInterfaceStyle={theme}
            showsUserLocation={locationGranted}
            onUserLocationChange={onUserLocationChange}
            showsMyLocationButton={locationGranted && Platform.OS === 'android'}
            mapPadding={{top: helperHeight ? helperHeight + ms(12) : 0, right: 0, bottom: 0, left: 0}}
            showsCompass
            showsScale>
            {coordinate ? (
              <Marker
                coordinate={coordinate}
                draggable
                onDragEnd={event =>
                  setCoordinate(event.nativeEvent.coordinate)
                }
              />
            ) : null}
          </MapView>

          <View
            pointerEvents="none"
            onLayout={e => setHelperHeight(e.nativeEvent.layout.height)}
            style={[
              styles.helperCard,
              {backgroundColor: C.surface, borderColor: C.surfaceBorder},
            ]}>
            <Text style={[styles.helperTitle, {color: C.textPrimary}]}>
              {t('addLocation') || 'Add Location'}
            </Text>
            <Text style={[styles.helperText, {color: C.textSecondary}]}>
              {t('omrMapLocationHelper') ||
                'Tap the map to place the pin, then drag it for precise positioning.'}
            </Text>
          </View>

          <View
            style={[
              styles.bottomPanel,
              {backgroundColor: C.surface, borderColor: C.surfaceBorder},
            ]}>
            <Text style={[styles.coordinatesLabel, {color: C.textSecondary}]}>
              {coordinate
                ? `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`
                : t('omrMapLocationMissing') ||
                  'No location selected'}
            </Text>
            {initialCoordinate ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={onRemove}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{busy: removing, disabled: busy}}>
                {removing ? (
                  <ActivityIndicator size="small" color={COLORS.dangerColor} />
                ) : (
                  <Text style={styles.removeButtonText}>{t('removeLocation')}</Text>
                )}
              </TouchableOpacity>
            ) : null}
            <View style={formStyles.buttonRow}>
              <CancelButton
                label={t('cancel')}
                onPress={() => navigation.goBack()}
                disabled={busy}
              />
              <SaveButton
                label={saving ? t('saving') : t('save')}
                onPress={onSave}
                disabled={busy || !coordinate}
              />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: ms(15),
    paddingTop: ms(5),
  },
  container: {
    flex: 1,
  },
  helperCard: {
    position: 'absolute',
    top: ms(12),
    left: ms(12),
    right: ms(12),
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderWidth: 1,
    borderRadius: ms(10),
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  helperTitle: {
    fontSize: fs(14),
    fontWeight: '700',
    marginBottom: ms(2),
  },
  helperText: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: ms(16),
    paddingTop: ms(10),
    paddingBottom: ms(12),
    borderTopWidth: 1,
  },
  coordinatesLabel: {
    textAlign: 'center',
    fontSize: fs(12),
    marginBottom: ms(8),
  },
  removeButton: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: ms(12),
    marginBottom: ms(4),
  },
  removeButtonText: {
    color: COLORS.dangerColor,
    fontSize: fs(13),
    fontWeight: '600',
  },
});

export default EditChurchLocationScreen;

