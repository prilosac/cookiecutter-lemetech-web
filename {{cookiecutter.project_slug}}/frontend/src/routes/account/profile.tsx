import { createFileRoute, Link } from '@tanstack/react-router';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth';
import { buildAccountPath, formatErrors, hasFlow } from '../../auth-routing';
import { AuthCard, ErrorPanel, Field, PageIntro, SubmitButton } from '../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH, type AuthFlow, type HeadlessResponse } from '../../lib/auth';

export const Route = createFileRoute('/account/profile')({ component: ProfilePage });

interface BaseAuthenticator {
  created_at: number;
  last_used_at: number | null;
  type: string;
}

interface TOTPAuthenticator extends BaseAuthenticator {
  type: 'totp';
}

interface RecoveryCodesAuthenticator extends BaseAuthenticator {
  total_code_count: number;
  type: 'recovery_codes';
  unused_code_count: number;
  unused_codes?: string[];
}

type Authenticator = RecoveryCodesAuthenticator | TOTPAuthenticator;

interface TOTPSetupMeta {
  secret: string;
  totp_url: string;
}

interface ReauthenticationData {
  flows?: AuthFlow[];
}

function responseErrors(response: HeadlessResponse, fallback: string) {
  const messages = formatErrors(response.errors);
  return messages.length ? messages : [fallback];
}

function formatTimestamp(value: number | null | undefined) {
  if (!value) {
    return 'Never';
  }

  return new Date(value * 1000).toLocaleString();
}

function ProfilePage() {
  const auth = useAuth();
  const [activationCode, setActivationCode] = useState('');
  const [authenticators, setAuthenticators] = useState<Authenticator[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isLoadingAuthenticators, setIsLoadingAuthenticators] = useState(true);
  const [isPreparingSetup, setIsPreparingSetup] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [password, setPassword] = useState('');
  const [requiresMFAReauthentication, setRequiresMFAReauthentication] = useState(false);
  const [requiresPasswordReauthentication, setRequiresPasswordReauthentication] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [setupMeta, setSetupMeta] = useState<TOTPSetupMeta | null>(null);
  const pendingReauthentication =
    requiresPasswordReauthentication || auth.flows.some((flow) => flow.id === 'reauthenticate' && flow.is_pending);
  const pendingMFAReauthentication =
    requiresMFAReauthentication || auth.flows.some((flow) => flow.id === 'mfa_reauthenticate' && flow.is_pending);
  const isSuperuser = Boolean(auth.user?.is_superuser);

  async function loadAuthenticators() {
    setIsLoadingAuthenticators(true);

    try {
      const response = await auth.request<HeadlessResponse<Authenticator[]>>(`${HEADLESS_BROWSER_BASE_PATH}/account/authenticators`);

      if (response.status === 200 && response.data) {
        setAuthenticators(response.data);
        setErrors([]);
        return;
      }

      setAuthenticators([]);
      setErrors(responseErrors(response, 'Unable to load the current two-factor authentication status.'));
    } finally {
      setIsLoadingAuthenticators(false);
    }
  }

  async function loadRecoveryCodes() {
    const response = await auth.request<HeadlessResponse<RecoveryCodesAuthenticator>>(
      `${HEADLESS_BROWSER_BASE_PATH}/account/authenticators/recovery-codes`,
    );

    if (response.status === 200 && response.data?.unused_codes?.length) {
      setRecoveryCodes(response.data.unused_codes);
    }
  }

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (!auth.isAuthenticated) {
      setAuthenticators([]);
      setErrors([]);
      setInfoMessage(null);
      setIsLoadingAuthenticators(false);
      setRequiresMFAReauthentication(false);
      setRequiresPasswordReauthentication(false);
      setRecoveryCodes(null);
      setSetupMeta(null);
      return;
    }

    void loadAuthenticators();
  }, [auth.isAuthenticated, auth.isLoading]);

  if (!auth.isAuthenticated) {
    return (
      <AuthCard className="max-w-3xl">
        <PageIntro
          description="This placeholder profile route only renders for signed-in users. The login flow stays in the SPA and returns here afterward."
          eyebrow="Profile"
          title="Sign in to manage your account"
        />
        <div className="mt-8">
          <a
            className="inline-flex rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            href={buildAccountPath('/account/login', '/account/profile')}
          >
            Go to login
          </a>
        </div>
      </AuthCard>
    );
  }

  const totpAuthenticator = authenticators.find(
    (authenticator): authenticator is TOTPAuthenticator => authenticator.type === 'totp',
  );
  const recoveryAuthenticator = authenticators.find(
    (authenticator): authenticator is RecoveryCodesAuthenticator => authenticator.type === 'recovery_codes',
  );

  function syncReauthenticationRequirements(response: HeadlessResponse) {
    const requiresPassword = hasFlow(response, 'reauthenticate');
    const requiresMFA = hasFlow(response, 'mfa_reauthenticate');

    setRequiresPasswordReauthentication(requiresPassword);
    setRequiresMFAReauthentication(requiresMFA);

    return { requiresMFA, requiresPassword };
  }

  async function handleStartSetup() {
    setErrors([]);
    setInfoMessage(null);
    setIsPreparingSetup(true);
    setRequiresMFAReauthentication(false);
    setRequiresPasswordReauthentication(false);
    setRecoveryCodes(null);

    try {
      const response = await auth.request<HeadlessResponse<TOTPAuthenticator, TOTPSetupMeta>>(
        `${HEADLESS_BROWSER_BASE_PATH}/account/authenticators/totp`,
      );

      if (response.status === 404 && response.meta?.secret && response.meta?.totp_url) {
        setSetupMeta(response.meta);
        return;
      }

      if (response.status === 200 && response.data?.type === 'totp') {
        setSetupMeta(null);
        setInfoMessage('Two-factor authentication is already enabled for this account.');
        await loadAuthenticators();
        return;
      }

      setErrors(responseErrors(response, 'This account is not ready to enroll a new authenticator yet.'));
    } finally {
      setIsPreparingSetup(false);
    }
  }

  async function handleActivateTOTP(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setInfoMessage(null);
    setIsActivating(true);

    try {
      const response = await auth.request<HeadlessResponse<TOTPAuthenticator>>(
        `${HEADLESS_BROWSER_BASE_PATH}/account/authenticators/totp`,
        {
          body: { code: activationCode },
          method: 'POST',
        },
      );

      if (response.status === 200 && response.data?.type === 'totp') {
        setActivationCode('');
        setSetupMeta(null);
        setInfoMessage('Two-factor authentication is now enabled for this account.');
        setRequiresMFAReauthentication(false);
        setRequiresPasswordReauthentication(false);
        await loadAuthenticators();
        await loadRecoveryCodes();
        return;
      }

      if (response.status === 401) {
        const { requiresMFA, requiresPassword } = syncReauthenticationRequirements(response);

        if (requiresPassword) {
          setErrors(['Recent sign-in required before enabling two-factor authentication. Re-enter your password below.']);
          return;
        }

        if (requiresMFA) {
          setErrors(['Another MFA check is required before changing authenticators for this account.']);
          return;
        }

        setErrors(responseErrors(response, 'Recent sign-in required before enabling two-factor authentication. Please sign out and sign back in'));
        return;
      }

      setErrors(responseErrors(response, 'Unable to activate two-factor authentication.'));
    } finally {
      setIsActivating(false);
    }
  }

  async function handleDisableTOTP() {
    setErrors([]);
    setInfoMessage(null);
    setIsDisabling(true);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/account/authenticators/totp`, {
        method: 'DELETE',
      });

      if (response.status === 200 && !response.errors) {
        setActivationCode('');
        setAuthenticators((current) =>
          current.filter((authenticator) => authenticator.type !== 'recovery_codes' && authenticator.type !== 'totp'),
        );
        setRecoveryCodes(null);
        setSetupMeta(null);
        setRequiresMFAReauthentication(false);
        setRequiresPasswordReauthentication(false);
        setInfoMessage('Two-factor authentication has been disabled for this account.');
        await loadAuthenticators();
        return;
      }

      if (response.status === 401) {
        const { requiresMFA, requiresPassword } = syncReauthenticationRequirements(response);

        if (requiresPassword) {
          setErrors([
            'Recent sign-in required before disabling two-factor authentication. Re-enter your password below.',
          ]);
          return;
        }

        if (requiresMFA) {
          setErrors(['Another MFA check is required before changing authenticators for this account.']);
          return;
        }

        setErrors(
          responseErrors(
            response,
            'Recent sign-in required before disabling two-factor authentication. Please sign out and sign back in',
          ),
        );
        return;
      }

      setErrors(responseErrors(response, 'Unable to disable two-factor authentication.'));
    } finally {
      setIsDisabling(false);
    }
  }

  async function handleReauthentication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setInfoMessage(null);
    setIsReauthenticating(true);

    try {
      const response = await auth.request<HeadlessResponse<ReauthenticationData>>(`${HEADLESS_BROWSER_BASE_PATH}/auth/reauthenticate`, {
        body: { password },
        method: 'POST',
      });

      if (response.status === 200) {
        setPassword('');
        setRequiresMFAReauthentication(false);
        setRequiresPasswordReauthentication(false);
        setInfoMessage('Session refreshed. You can continue updating two-factor authentication now.');
        return;
      }

      if (response.status === 401) {
        syncReauthenticationRequirements(response);
      }

      setErrors(responseErrors(response, 'Unable to refresh the current session.'));
    } finally {
      setIsReauthenticating(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <AuthCard>
        <PageIntro
          eyebrow="Profile"
        />
        <div className="mt-8 grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed-in account</p>
            <p className="mt-3 text-lg font-semibold text-white">{auth.user?.display ?? 'Authenticated user'}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Manage</p>
            <Link className="mt-4 inline-flex rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-100" to="/account/password/reset">
              Reset password
            </Link>
          </div>
        </div>
        {isSuperuser ? (
          <div className="mt-2 grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Staff Tools</p>
              <a
                className="mt-4 inline-flex rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-100"
                href="/admin/"
              >
                Admin
              </a>
            </div>
          </div>
        ) : null}
      </AuthCard>

      <AuthCard className="space-y-6 border-cyan-400/20 bg-cyan-400/10">
        <PageIntro
          eyebrow="Security"
          title="Two-factor authentication"
        />
        <ErrorPanel errors={errors} />
        {infoMessage ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">
            {infoMessage}
          </div>
        ) : null}

        {pendingReauthentication ? (
          <form className="space-y-5 rounded-2xl border border-amber-300/20 bg-slate-950/70 p-5" onSubmit={handleReauthentication}>
            <div className="space-y-2 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-white">Recent sign-in required</p>
              <p>Please re-enter your password before changing MFA settings.</p>
            </div>
            <Field autoComplete="current-password" label="Current password" onChange={setPassword} type="password" value={password} />
            <SubmitButton disabled={isReauthenticating}>{isReauthenticating ? 'Refreshing session...' : 'Confirm password'}</SubmitButton>
          </form>
        ) : null}

        {pendingMFAReauthentication ? (
          <div className="rounded-2xl border border-amber-300/20 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
            <p className="font-semibold text-white">MFA reauthentication is pending</p>
            <p className="mt-2">This account already has a second factor on file, so allauth is asking for an extra verification step before changing authenticators.</p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">{totpAuthenticator ? '2FA is enabled' : '2FA is not enabled yet'}</p>
          {totpAuthenticator ? (
            <>
              <p className="mt-2">TOTP enrollment completed for this account. Future logins can challenge for an authenticator code through the existing <code>/account/2fa</code> route.</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-400">Added</dt>
                  <dd className="mt-1 text-white">{formatTimestamp(totpAuthenticator.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Last used</dt>
                  <dd className="mt-1 text-white">{formatTimestamp(totpAuthenticator.last_used_at)}</dd>
                </div>
              </dl>
              {recoveryAuthenticator ? (
                <p className="mt-4">Recovery codes available: <span className="font-semibold text-white">{recoveryAuthenticator.unused_code_count}</span> of {recoveryAuthenticator.total_code_count} unused.</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full border border-rose-300/30 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
                  disabled={isDisabling}
                  onClick={() => {
                    void handleDisableTOTP();
                  }}
                  type="button"
                >
                  {isDisabling ? 'Disabling 2FA...' : 'Disable 2FA'}
                </button>
                <p className="text-sm text-slate-400">This removes the current authenticator and its recovery codes.</p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2">Start the setup flow to generate a TOTP secret for an authenticator app such as 1Password, Google Authenticator, or Authy.</p>
              <button
                className="mt-4 rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                disabled={isPreparingSetup}
                onClick={() => {
                  void handleStartSetup();
                }}
                type="button"
              >
                {isPreparingSetup ? 'Preparing setup...' : 'Set up 2FA'}
              </button>
            </>
          )}
        </div>

        {setupMeta ? (
          <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <div className="space-y-2 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-white">Finish enrollment in your authenticator app</p>
              <p>Scan this QR code with your authenticator app (or use the manual secret if scanning is inconvenient). Then enter the generated code below to activate 2FA.</p>
            </div>
            <div className="grid gap-5 2xl:grid-cols-[auto_1fr] 2xl:items-start">
              <div className="mx-auto rounded-[1.75rem] bg-white p-4 shadow-lg shadow-cyan-950/20 2xl:mx-0">
                <QRCodeSVG
                  bgColor="#ffffff"
                  fgColor="#020617"
                  includeMargin
                  level="M"
                  size={192}
                  title="Authenticator setup QR code"
                  value={setupMeta.totp_url}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Manual entry secret</p>
                  <code className="mt-3 block break-all rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
                    {setupMeta.secret}
                  </code>
                </div>
                <a className="inline-flex text-sm font-medium text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href={setupMeta.totp_url}>
                  Open the authenticator link
                </a>
              </div>
            </div>
            <form className="space-y-5" onSubmit={handleActivateTOTP}>
              <Field autoComplete="one-time-code" label="Authenticator code" onChange={setActivationCode} value={activationCode} />
              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton disabled={isActivating}>{isActivating ? 'Activating...' : 'Activate 2FA'}</SubmitButton>
                <button
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-100"
                  onClick={() => {
                    setActivationCode('');
                    setSetupMeta(null);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {recoveryCodes?.length ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-sm leading-6 text-amber-50">
            <p className="font-semibold text-white">Recovery codes</p>
            <p className="mt-2">Store these codes somewhere safe now. They may not be shown again after this setup step.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {recoveryCodes.map((code) => (
                <code className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-center text-sm text-white" key={code}>
                  {code}
                </code>
              ))}
            </div>
          </div>
        ) : null}
      </AuthCard>
    </div>
  );
}
