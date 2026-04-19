export const AUTH_BOOTSTRAP_PATH = '/accounts/bootstrap/';
export const HEADLESS_BROWSER_BASE_PATH = '/_allauth/browser/v1';

export interface HeadlessError {
  code?: string;
  message: string;
  param?: string;
}

export interface SocialProvider {
  client_id?: string;
  flows: string[];
  id: string;
  name: string;
  openid_configuration_url?: string;
}

export interface AuthUser {
  display?: string;
  email?: string;
  has_usable_password?: boolean;
  id?: number | string | null;
  username?: string;
}

export interface AuthFlow {
  id: string;
  is_pending?: boolean;
  provider?: SocialProvider;
  providers?: string[];
  types?: string[];
}

export interface SessionData {
  flows?: AuthFlow[];
  methods?: unknown[];
  user?: AuthUser;
}

export interface SessionMeta {
  is_authenticated?: boolean;
}

export interface AccountConfig {
  email_verification_by_code_enabled?: boolean;
  is_open_for_signup?: boolean;
  login_by_code_enabled?: boolean;
  login_methods?: string[];
  password_reset_by_code_enabled?: boolean;
}

export interface MFAConfig {
  passkey_login_enabled?: boolean;
  supported_types?: string[];
}

export interface SocialConfig {
  providers?: SocialProvider[];
}

export interface ConfigData {
  account?: AccountConfig;
  mfa?: MFAConfig;
  socialaccount?: SocialConfig;
}

export interface EmailAddressData {
  email: string;
  primary: boolean;
  verified: boolean;
}

export interface SocialAccountData {
  display?: string;
  provider?: SocialProvider;
  uid?: string;
}

export interface SocialSignupData {
  account?: SocialAccountData;
  email?: EmailAddressData[];
  user?: AuthUser;
}

export interface PasswordResetData {
  user?: AuthUser;
}

export interface HeadlessResponse<TData = unknown, TMeta = unknown> {
  data?: TData;
  errors?: HeadlessError[];
  meta?: TMeta;
  status: number;
}

export interface AuthBootstrap {
  config: HeadlessResponse<ConfigData>;
  csrf_token: string;
  session: HeadlessResponse<SessionData, SessionMeta>;
}

export interface AuthRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: Record<string, unknown>;
  csrfToken?: string | null;
  headers?: Record<string, string>;
}

export async function fetchAuthBootstrap(): Promise<AuthBootstrap> {
  const response = await fetch(AUTH_BOOTSTRAP_PATH, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load the authentication bootstrap.');
  }

  return (await response.json()) as AuthBootstrap;
}

export async function requestAuth<TResponse extends HeadlessResponse = HeadlessResponse>(
  path: string,
  options: AuthRequestOptions = {},
): Promise<TResponse> {
  const method = options.method?.toUpperCase() ?? (options.body ? 'POST' : 'GET');
  const headers = new Headers(options.headers);

  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (method !== 'GET' && options.csrfToken) {
    headers.set('X-CSRFToken', options.csrfToken);
  }

  const response = await fetch(path, {
    ...options,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include',
    headers,
    method,
  });

  const text = await response.text();
  if (!text) {
    return { status: response.status } as TResponse;
  }

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    return {
      errors: [{ message: 'Unexpected response from the server.' }],
      status: response.status,
    } as TResponse;
  }
}

export function getRequestMethod(options: AuthRequestOptions = {}): string {
  return options.method?.toUpperCase() ?? (options.body ? 'POST' : 'GET');
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected authentication error.';
}
