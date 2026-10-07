import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import api from '../../../config/api';
import {useTranslation} from '../../../shared/hooks/useTranslation';
import {isSuperAdmin} from '../../../shared/utils/permissions';

/**
 * FAQ add / edit / delete are super-admin only. Non-admins are sent back;
 * a failed check (offline / server) is returned as `roleError` so the screen
 * can show a retryable error instead of kicking the user out.
 */
export function useSuperAdminGuard(accessDeniedMessage: string) {
  const navigation = useNavigation<any>();
  const {t} = useTranslation();
  const [userRoleId, setUserRoleId] = useState<number | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [roleError, setRoleError] = useState<unknown>(null);
  const mountedRef = useRef(true);

  const checkRole = useCallback(async () => {
    setCheckingRole(true);
    setRoleError(null);
    try {
      const res = await api.get('users/me');
      if (!mountedRef.current) {
        return;
      }
      const roleId = res?.data?.data?.role?.id;
      if (typeof roleId === 'number') {
        setUserRoleId(roleId);
        if (!isSuperAdmin(roleId)) {
          Alert.alert(t('error') || 'Error', accessDeniedMessage);
          navigation.goBack();
        }
      }
    } catch (e) {
      if (mountedRef.current) {
        setRoleError(e);
      }
    } finally {
      if (mountedRef.current) {
        setCheckingRole(false);
      }
    }
  }, [navigation, t, accessDeniedMessage]);

  useEffect(() => {
    mountedRef.current = true;
    checkRole();
    return () => {
      mountedRef.current = false;
    };
  }, [checkRole]);

  return {
    isAdmin: isSuperAdmin(userRoleId),
    checkingRole,
    roleError,
    checkRole,
  };
}
