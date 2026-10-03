import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { neonAuth, shouldUseNeonAuth } from '@/api/neonAuthClient';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [backendAuthStatus, setBackendAuthStatus] = useState('unknown');
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // Vercel Preview is the proving ground for CREAPD-owned auth. Do not call
      // Base44 app/domain auth endpoints there; Base44 rejects arbitrary preview domains.
      if (shouldUseNeonAuth()) {
        setAppPublicSettings({ auth_provider: 'neon' });
        setIsLoadingPublicSettings(false);
        await checkUserAuth();
        return;
      }
      
      // Production remains on Base44 until Neon Auth is proven end-to-end.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token,
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
          setBackendAuthStatus('unknown');
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    if (shouldUseNeonAuth()) {
      try {
        setIsLoadingAuth(true);
        const sessionResult = await neonAuth.getSession();
        const session = sessionResult?.data?.session;
        const currentUser = sessionResult?.data?.user;

        if (!session || !currentUser) {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          setAuthChecked(true);
          setBackendAuthStatus('unknown');
          return;
        }

        setUser({ ...currentUser, auth_provider: 'neon' });
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        setAuthChecked(true);

        // Prove the Neon JWT independently at the Vercel API boundary and
        // bridge the verified identity into CREAPD's application user table.
        setBackendAuthStatus('checking');
        void creapdApi.get('/auth/me')
          .then(() => setBackendAuthStatus('ready'))
          .catch((backendError) => {
            console.warn('CREAPD Neon backend auth verification unavailable:', backendError);
            setBackendAuthStatus('unavailable');
          });
      } catch (error) {
        console.error('Neon user auth check failed:', error);
        setUser(null);
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setBackendAuthStatus('unavailable');
      }
      return;
    }

    try {
      // Base44 remains the temporary production identity provider while CREAPD backend/data move to Vercel + Neon.
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      // Non-blocking bridge: validate the same user token at our Vercel API boundary
      // and upsert the identity bridge in Neon. Failure does not break the current UI.
      setBackendAuthStatus('checking');
      void creapdApi.get('/auth/me')
        .then(() => setBackendAuthStatus('ready'))
        .catch((backendError) => {
          console.warn('CREAPD backend auth bridge unavailable:', backendError);
          setBackendAuthStatus('unavailable');
        });
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setBackendAuthStatus('unknown');
      
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setBackendAuthStatus('unknown');

    if (shouldUseNeonAuth()) {
      void neonAuth.signOut().finally(() => {
        if (shouldRedirect) {
          window.location.href = '/login';
        }
      });
      return;
    }
    
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (shouldUseNeonAuth()) {
      window.location.href = '/login';
      return;
    }

    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      backendAuthStatus,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
