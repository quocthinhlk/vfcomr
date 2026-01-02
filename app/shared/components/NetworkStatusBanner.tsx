import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from '../hooks/useTranslation';
import { useThemedColors } from '../styles/theme';
import { fs, hs, ms, rs } from '../utils/scale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { networkEventEmitter } from '../utils/networkEvents';

// Import NetInfo - package is installed, just need to ensure it's linked
let NetInfo: any = null;
let NetInfoAvailable = false;

try {
  // For NetInfo v11+, use default export
  const netinfoModule = require('@react-native-community/netinfo');
  NetInfo = netinfoModule.default || netinfoModule;
  
  // Verify NetInfo is available and has required methods
  if (NetInfo && typeof NetInfo.fetch === 'function' && typeof NetInfo.addEventListener === 'function') {
    NetInfoAvailable = true;
  } else {
    console.warn('NetInfo module found but methods are not available. Make sure to run pod install (iOS) and rebuild the app.');
  }
} catch (e: any) {
  console.warn('Failed to load @react-native-community/netinfo:', e?.message || e);
  console.warn('Please ensure:');
  console.warn('1. Run: cd ios && pod install && cd ..');
  console.warn('2. Rebuild the app (not just reload)');
}

type BannerType = 'error' | 'success' | null;

export const NetworkStatusBanner: React.FC = () => {
  const { t } = useTranslation();
  const C = useThemedColors();
  const insets = useSafeAreaInsets();
  const [isConnected, setIsConnected] = useState<boolean | null>(null); // null = unknown, true = connected, false = disconnected
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);
  const [bannerType, setBannerType] = useState<BannerType>(null); // 'error' for no internet, 'success' for reconnected
  const [slideAnim] = useState(new Animated.Value(0));
  const previousConnectedRef = useRef<boolean | null>(null);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    // If NetInfo is available, use it
    if (NetInfoAvailable && NetInfo) {
      try {
        // Subscribe to network state updates
        unsubscribe = NetInfo.addEventListener((state: any) => {
          if (!mounted) return;
          
          const connected = state.isConnected;
          const internetReachable = state.isInternetReachable;

          console.log('[NetworkStatusBanner] Network state changed:', { connected, internetReachable });

          const previousConnected = previousConnectedRef.current;
          const isNowConnected = connected === true && internetReachable === true;
          const isNowDisconnected = connected === false || internetReachable === false;

          // Check if just reconnected (was disconnected, now connected)
          const justReconnected = previousConnected === false && isNowConnected;

          // Update previous state before setting new state
          const newPreviousState = isNowConnected ? true : (isNowDisconnected ? false : previousConnected);
          
          setIsConnected(connected);
          setIsInternetReachable(internetReachable);
          previousConnectedRef.current = newPreviousState;

          // Clear any existing auto-hide timer
          if (autoHideTimerRef.current) {
            clearTimeout(autoHideTimerRef.current);
            autoHideTimerRef.current = null;
          }

          if (justReconnected) {
            // Show success banner (green) when reconnected
            setBannerType('success');
            Animated.timing(slideAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();

            // Auto hide after 2 seconds and notify to reload
            autoHideTimerRef.current = setTimeout(() => {
              if (mounted) {
                Animated.timing(slideAnim, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  if (mounted) {
                    setBannerType(null);
                  }
                });

                // Notify all listeners to reload (screens will listen to this event)
                networkEventEmitter.notify();
              }
            }, 2000);
          } else if (isNowDisconnected) {
            // Show error banner (red) when disconnected
            setBannerType('error');
            Animated.timing(slideAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          } else if (isNowConnected && !justReconnected && bannerType === 'error') {
            // If connected and not just reconnected, hide error banner
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              if (mounted) {
                setBannerType(null);
              }
            });
          }
        });

        // Check initial network state with timeout
        const fetchPromise = NetInfo.fetch();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        Promise.race([fetchPromise, timeoutPromise])
          .then((state: any) => {
            if (!mounted) return;
            
            const connected = state.isConnected;
            const internetReachable = state.isInternetReachable;
            
            console.log('[NetworkStatusBanner] Initial network state:', { connected, internetReachable });
            
            const isInitialConnected = connected === true && internetReachable === true;
            const isInitialDisconnected = connected === false || internetReachable === false;
            
            setIsConnected(connected);
            setIsInternetReachable(internetReachable);
            previousConnectedRef.current = isInitialConnected ? true : (isInitialDisconnected ? false : null);

            const shouldShow = isInitialDisconnected;
            console.log('[NetworkStatusBanner] Initial should show banner:', shouldShow);
            
            if (shouldShow) {
              setBannerType('error');
            }
            
            Animated.timing(slideAnim, {
              toValue: shouldShow ? 1 : 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          })
          .catch((err: any) => {
            // If NetInfo fails or times out, show banner to be safe
            if (mounted) {
              console.warn('Error fetching network state:', err);
              // Show banner when we can't determine network status
              setIsConnected(false);
              setIsInternetReachable(false);
              Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
          });
      } catch (err) {
        // If NetInfo throws error, show banner
        if (mounted) {
          console.warn('NetInfo error:', err);
          setIsConnected(false);
          setIsInternetReachable(false);
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }
    } else {
      // NetInfo not available - this means package is not installed or not linked
      // Show warning and don't show banner (to avoid false positives)
      if (mounted) {
        console.warn('NetInfo not available. Please install and link @react-native-community/netinfo for network status detection.');
        // Don't set state, banner won't show
      }
    }

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-hs(50), 0],
  });

  // Don't show if banner type is null
  if (!bannerType) {
    return null;
  }

  const isSuccess = bannerType === 'success';
  const backgroundColor = isSuccess ? '#4CAF50' : ((C as any).error || '#ff4444');
  const message = isSuccess ? t('internetConnected') : t('noInternetConnection');

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: Math.max(insets.top, ms(8)),
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    elevation: 10000,
    paddingVertical: ms(12),
    paddingHorizontal: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: fs(14),
    fontWeight: '500',
    textAlign: 'center',
  },
});

