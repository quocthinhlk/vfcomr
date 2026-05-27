import React from 'react';
import {View, ScrollView, StyleSheet, Platform} from 'react-native';
import {Text, Button, Layout, Spinner} from '@ui-kitten/components';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Header} from '../components/Header';
import {BackButton} from '../components/BackButton';
import {globalStyles} from '../styles/global';
import {useRuntimePermissions} from '../hooks/useRuntimePermissions';

/**
 * Example screen demonstrating runtime permission checks and requests.
 * Navigate here from Settings — not shown on app launch.
 */
export function PermissionExamplesScreen() {
  const {
    loading,
    error,
    lastCamera,
    lastPhoto,
    lastLocation,
    lastNotification,
    refreshChecks,
    requestCamera,
    requestPhoto,
    requestLocation,
    requestNotifications,
  } = useRuntimePermissions();

  React.useEffect(() => {
    refreshChecks().catch(() => {});
  }, [refreshChecks]);

  const fmt = (label: string, r: {status: string; granted: boolean; blocked: boolean} | null) =>
    r ? `${label}: ${r.status} (granted=${r.granted}, blocked=${r.blocked})` : `${label}: —`;

  return (
    <SafeAreaView style={globalStyles.safeAreaView} edges={['bottom', 'left', 'right']}>
      <Header />
      <Layout style={globalStyles.layout}>
        <BackButton title="Permission examples" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text category="s1" style={styles.intro}>
            Requests are triggered only by the buttons below (recommended UX). Add{' '}
            <Text style={styles.mono}>google-services.json</Text> /{' '}
            <Text style={styles.mono}>GoogleService-Info.plist</Text> for FCM tokens.
          </Text>
          <Text appearance="hint" style={styles.platform}>
            Platform: {Platform.OS} {Platform.OS === 'android' ? `(API ${Platform.Version})` : ''}
          </Text>

          {loading ? <Spinner /> : null}
          {error ? (
            <Text status="danger" style={styles.block}>
              {error}
            </Text>
          ) : null}

          <View style={styles.block}>
            <Text category="c1">{fmt('Camera', lastCamera)}</Text>
            <Button style={styles.btn} onPress={() => requestCamera().catch(() => {})}>
              Request camera
            </Button>
          </View>

          <View style={styles.block}>
            <Text category="c1">{fmt('Photo library', lastPhoto)}</Text>
            <Button style={styles.btn} onPress={() => requestPhoto().catch(() => {})}>
              Request photo library
            </Button>
          </View>

          <View style={styles.block}>
            <Text category="c1">{fmt('Location (when in use)', lastLocation)}</Text>
            <Button style={styles.btn} onPress={() => requestLocation().catch(() => {})}>
              Request location
            </Button>
          </View>

          <View style={styles.block}>
            <Text category="c1">
              {lastNotification
                ? `Notifications: ${lastNotification.status} (granted=${lastNotification.granted})`
                : 'Notifications: —'}
            </Text>
            {lastNotification?.fcmToken ? (
              <Text category="c2" numberOfLines={2} ellipsizeMode="middle" style={styles.token}>
                FCM token: {lastNotification.fcmToken}
              </Text>
            ) : null}
            <Button style={styles.btn} onPress={() => requestNotifications().catch(() => {})}>
              Request notifications + FCM token
            </Button>
          </View>

          <Button appearance="outline" onPress={() => refreshChecks().catch(() => {})}>
            Refresh status only
          </Button>
        </ScrollView>
      </Layout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {paddingBottom: 32, paddingHorizontal: 8},
  intro: {marginBottom: 12},
  mono: {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12},
  platform: {marginBottom: 16},
  block: {marginBottom: 20},
  btn: {marginTop: 8},
  token: {marginTop: 4},
});
