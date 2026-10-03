import React, {useEffect, useRef, useState} from 'react';
import {Alert, Platform, StyleSheet, View} from 'react-native';
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
import {updateChurchLocation} from '../services/church.service';
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
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    // Ask for location so we can show user's position on the map.
    requestLocationPermission({showAlertIfBlocked: true}).catch(() => {});
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
        <Header title={t('addLocation') || 'Add Location'} showMenu={false} />
        <View style={styles.container}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            onPress={onMapPress}
            userInterfaceStyle={theme}
            showsUserLocation
            onUserLocationChange={onUserLocationChange}
            showsMyLocationButton={Platform.OS === 'android'}
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
            <View style={formStyles.buttonRow}>
              <CancelButton
                label={t('cancel')}
                onPress={() => navigation.goBack()}
                disabled={saving}
              />
              <SaveButton
                label={saving ? t('saving') : t('save')}
                onPress={onSave}
                disabled={saving || !coordinate}
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
});

export default EditChurchLocationScreen;

