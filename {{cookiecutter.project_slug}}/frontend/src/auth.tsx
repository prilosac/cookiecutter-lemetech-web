import { createContext, startTransition, useContext, useEffect, useState } from 'react';

import {
  fetchAuthBootstrap,
  getErrorMessage,
  getRequestMethod,
  requestAuth,
  type AccountConfig,
  type AuthBootstrap,
  type AuthFlow,
  type AuthRequestOptions,
  type AuthUser,
  type HeadlessResponse,
  type MFAConfig,
  type SessionData,
  type SessionMeta,
  type SocialProvider,
} from './lib/auth';

interface AuthContextValue {
  accountConfig: AccountConfig | null;
  config: AuthBootstrap['config'] | null;
  csrfToken: string | null;
  error: string | null;
  flows: AuthFlow[];
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaConfig: MFAConfig | null;
  providers: SocialProvider[];
  refresh: () => Promise<AuthBootstrap>;
  request: <TResponse extends HeadlessResponse = HeadlessResponse>(
    path: string,
    options?: AuthRequestOptions,
  ) => Promise<TResponse>;
  session: HeadlessResponse<SessionData, SessionMeta> | null;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [bootstrap, setBootstrap] = useState<AuthBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    const nextBootstrap = await fetchAuthBootstrap();
    startTransition(() => {
      setBootstrap(nextBootstrap);
      setError(null);
      setIsLoading(false);
    });
    return nextBootstrap;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadBootstrap() {
      try {
        const nextBootstrap = await fetchAuthBootstrap();
        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setBootstrap(nextBootstrap);
          setError(null);
          setIsLoading(false);
        });
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setBootstrap(null);
          setError(getErrorMessage(loadError));
          setIsLoading(false);
        });
      }
    }

    void loadBootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  async function request<TResponse extends HeadlessResponse = HeadlessResponse>(
    path: string,
    options: AuthRequestOptions = {},
  ) {
    const response = await requestAuth<TResponse>(path, {
      ...options,
      csrfToken: bootstrap?.csrf_token ?? null,
    });

    if (getRequestMethod(options) !== 'GET' && response.status < 500 && !response.errors) {
      try {
        await refresh();
      } catch {
        // Keep the action response if the follow-up refresh fails.
      }
    }

    return response;
  }

  const session = bootstrap?.session ?? null;
  const config = bootstrap?.config ?? null;
  const user = (session?.data?.user ?? null) as AuthUser | null;
  const flows = (session?.data?.flows ?? []) as AuthFlow[];
  const providers = (config?.data?.socialaccount?.providers ?? []) as SocialProvider[];
  const accountConfig = config?.data?.account ?? null;
  const mfaConfig = config?.data?.mfa ?? null;
  const isAuthenticated = Boolean(session?.meta?.is_authenticated);
  const authContextValue = {
    accountConfig,
    config,
    csrfToken: bootstrap?.csrf_token ?? null,
    error,
    flows,
    isAuthenticated,
    isLoading,
    mfaConfig,
    providers,
    refresh,
    request,
    session,
    user,
  } satisfies AuthContextValue;

  return (
    <AuthContext value={authContextValue}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
