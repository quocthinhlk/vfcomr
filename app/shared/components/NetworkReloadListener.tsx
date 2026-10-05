import { useEffect } from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { networkEventEmitter } from '../utils/networkEvents';

/**
 * Component to listen for network reconnection events and reload the current screen
 * Should be used inside NavigationContainer
 */
export const NetworkReloadListener: React.FC = () => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const unsubscribe = networkEventEmitter.subscribe(() => {
      // Reload current screen by navigating with reload flag
      try {
        const state = navigation.getState();
        if (state) {
          // Get the current route from navigation state
          const getCurrentRoute = (navState: any): any => {
            if (!navState || !navState.routes) return null;
            const route = navState.routes[navState.index];
            if (route.state) {
              return getCurrentRoute(route.state);
            }
            return route;
          };
          
          const currentRoute = getCurrentRoute(state);
          if (currentRoute?.key) {
            // Merge reload flags into the current route's params (keeps ids etc.).
            // Screens react to `reload`/`refresh` (lists) or `refetchKey` (details).
            navigation.dispatch({
              ...CommonActions.setParams({
                reload: true,
                refresh: true,
                refetchKey: Date.now(),
              }),
              source: currentRoute.key,
            });
          }
        }
      } catch (err) {
        console.warn('Failed to reload screen:', err);
      }
    });

    return unsubscribe;
  }, [navigation]);

  return null; // This component doesn't render anything
};

