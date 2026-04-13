import { Link, Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from './auth';
import {
  HEADLESS_BROWSER_BASE_PATH,
  type AuthFlow,
  type HeadlessError,
  type HeadlessResponse,
  type PasswordResetData,
  type SocialProvider,
  type SocialSignupData,
  requestAuth
} from './lib/auth';

function sanitizeNext(nextValue: string | null | undefined) {
  if (!nextValue || !nextValue.startsWith('/') || nextValue.startsWith('//')) {
    return '/';
  }

  return nextValue;
}

function readNextParam() {
  const search = new URLSearchParams(window.location.search);
  return sanitizeNext(search.get('next'));
}

function buildAccountPath(path: string, nextValue?: string | null) {
  const next = sanitizeNext(nextValue ?? null);
  if (next === '/') {
    return path;
  }

  return `${path}?${new URLSearchParams({ next }).toString()}`;
}

function redirectToNext(nextValue?: string | null) {
  window.location.assign(sanitizeNext(nextValue ?? null));
}

function hasPendingFlow(response: HeadlessResponse | null | undefined, flowId: string) {
  const flows = (response?.data as { flows?: AuthFlow[] } | undefined)?.flows ?? [];
  return flows.some((flow) => flow.id === flowId && flow.is_pending);
}

function collectFlowIds(flows: AuthFlow[]) {
  return flows.filter((flow) => flow.is_pending).map((flow) => flow.id);
}

function formatErrors(errors: HeadlessError[] | undefined) {
  return (errors ?? []).map((error) => error.message);
}

function handleAuthenticationOutcome(response: HeadlessResponse, nextValue?: string | null) {
  const meta = response.meta as { is_authenticated?: boolean } | undefined;

  if (meta?.is_authenticated) {
    redirectToNext(nextValue);
    return true;
  }

  if (hasPendingFlow(response, 'mfa_authenticate') || hasPendingFlow(response, 'mfa_trust')) {
    window.location.assign(buildAccountPath('/account/2fa', nextValue));
    return true;
  }

  if (hasPendingFlow(response, 'verify_email')) {
    window.location.assign(buildAccountPath('/account/verify-email', nextValue));
    return true;
  }

  return false;
}

function PageIntro({ eyebrow, title, description }: { description: string; eyebrow: string; title: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300/80">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="max-w-2xl text-base leading-7 text-slate-300">{description}</p>
    </div>
  );
}

function AuthCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-950/20 ${className}`}>
      {children}
    </section>
  );
}

function ErrorPanel({ errors }: { errors: string[] }) {
  if (!errors.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
      <ul className="space-y-2">
        {errors.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  autoComplete,
  label,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-200">
      <span className="block font-medium">{label}</span>
      <input
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
  );
}

function ProviderButtons({ nextValue }: { nextValue: string }) {
  const auth = useAuth();

  const providers = auth.providers.filter((provider) => provider.flows.includes('provider_redirect'));
  if (!providers.length || !auth.csrfToken) {
    return null;
  }

  const callbackUrl = buildAccountPath('/account/provider/callback', nextValue);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Social login</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((provider) => (
          <form action={`${HEADLESS_BROWSER_BASE_PATH}/auth/provider/redirect`} key={provider.id} method="post">
            <input name="csrfmiddlewaretoken" type="hidden" value={auth.csrfToken} />
            <input name="provider" type="hidden" value={provider.id} />
            <input name="process" type="hidden" value="login" />
            <input name="callback_url" type="hidden" value={callbackUrl} />
            <button
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-300 hover:bg-cyan-400/10"
              type="submit"
            >
              Continue with {provider.name}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <AuthCard>
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Loading</p>
      <p className="mt-4 text-base text-slate-300">{message}</p>
    </AuthCard>
  );
}

function AppShell() {
  const auth = useAuth();
  const pendingFlowIds = collectFlowIds(auth.flows);
  const authSummary = auth.isLoading
    ? 'Bootstrapping session state...'
    : auth.isAuthenticated
      ? pendingFlowIds.length
        ? `Pending: ${pendingFlowIds.join(', ')}`
        : auth.user?.email ?? 'Authenticated through allauth.headless.'
      : pendingFlowIds.length
        ? `Pending: ${pendingFlowIds.join(', ')}`
        : 'No authenticated session yet.';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="space-y-8 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Vite SPA Auth</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{{ cookiecutter.project_name }}</h1>
              <p className="text-base leading-7 text-slate-300">
                The SPA owns <code className="rounded bg-white/10 px-2 py-1 text-sm">/account/...</code>. Django keeps
                <code className="ml-1 rounded bg-white/10 px-2 py-1 text-sm">/accounts/...</code>,
                <code className="ml-1 rounded bg-white/10 px-2 py-1 text-sm">/_allauth/...</code>,
                <code className="ml-1 rounded bg-white/10 px-2 py-1 text-sm">/api/...</code>, and
                <code className="ml-1 rounded bg-white/10 px-2 py-1 text-sm">/admin/</code>.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm text-cyan-50">
              <p className="font-semibold">{auth.isAuthenticated ? auth.user?.display ?? 'Signed in' : 'Signed out'}</p>
              <p className="mt-1 text-cyan-50/80">{authSummary}</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3 text-sm font-medium text-slate-300">
            <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/">
              Home
            </Link>
            <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/about">
              About
            </Link>
            {auth.isAuthenticated ? null : (
              <>
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/login">
                  Login
                </Link>
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/signup">
                  Signup
                </Link>
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/password/reset">
                  Reset password
                </Link>
              </>
            )}
            {auth.isAuthenticated ? (
              <>
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/logout">
                  Logout
                </Link>
              </>
            ) : null}
            <a className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" href="/admin/">
              Admin
            </a>
          </nav>
        </header>

        <main className="flex-1 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function HomePage() {
  const auth = useAuth();
  const pendingFlowIds = collectFlowIds(auth.flows);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <AuthCard className="bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_45%),rgba(15,23,42,0.92)]">
        <PageIntro
          description="Use the Vite dev server for local UI work, but keep auth on same-origin browser sessions through Django. The SPA now owns the login, signup, reset, verification, MFA, and social callback surface."
          eyebrow="Session Contract"
          title="A real auth surface for the generated Vite app"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current user</p>
            <p className="mt-3 text-lg font-semibold text-white">{auth.user?.display ?? 'Anonymous visitor'}</p>
            <p className="mt-2 text-sm text-slate-400">{auth.user?.email ?? 'No authenticated session yet.'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pending flows</p>
            <p className="mt-3 text-lg font-semibold text-white">{pendingFlowIds.length ? pendingFlowIds.join(', ') : 'None'}</p>
            <p className="mt-2 text-sm text-slate-400">Auth flow state comes from <code>/_allauth/browser/v1/auth/session</code>.</p>
          </div>
        </div>
      </AuthCard>

      <AuthCard className="border-cyan-400/20 bg-cyan-400/10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100/80">Ownership split</p>
        <ul className="mt-5 space-y-3 text-sm leading-6 text-cyan-50/90">
          <li>SPA routes live under <code>/account/...</code>.</li>
          <li>Django auth entrypoints stay under <code>/accounts/...</code>.</li>
          <li>Headless browser endpoints stay under <code>/_allauth/browser/v1/...</code>.</li>
          <li>Admin still uses Django and can redirect through the SPA login bridge.</li>
        </ul>
      </AuthCard>
    </div>
  );
}

function AboutPage() {
  return (
    <AuthCard className="max-w-4xl">
      <PageIntro
        description="This starter keeps the React route tree explicit, proxies auth through Vite during local development, and leaves the backend in charge of sessions, provider callbacks, and admin access control."
        eyebrow="About"
        title="Headless allauth without a split browser contract"
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Local development</p>
          <p className="mt-2">Vite serves the document on port 5173 and proxies <code>/accounts</code>, <code>/_allauth</code>, <code>/api</code>, and <code>/admin</code> back to Django.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Production</p>
          <p className="mt-2">Django serves the SPA shell and the built assets, so the same session-backed auth flow works without changing endpoints.</p>
        </div>
      </div>
    </AuthCard>
  );
}

function LoginPage() {
  const auth = useAuth();
  const nextValue = readNextParam();
  const loginMethod = auth.accountConfig?.login_methods?.includes('email') ? 'email' : 'username';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      redirectToNext(nextValue);
    }
  }, [auth.isAuthenticated, auth.isLoading, nextValue]);

  if (auth.isLoading) {
    return <LoadingPanel message="Loading the current session before login." />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    const body = loginMethod === 'email' ? { email: identifier, password } : { password, username: identifier };

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/login`, {
        body,
        method: 'POST',
      });

      if (handleAuthenticationOutcome(response, nextValue)) {
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <AuthCard>
        <PageIntro
          description="This form posts to the browser-session headless endpoint, then the SPA handles the next hop for pending verification, MFA, or admin redirects."
          eyebrow="Login"
          title="Sign in through the session-backed SPA flow"
        />
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <Field autoComplete={loginMethod} label={loginMethod === 'email' ? 'Email address' : 'Username'} onChange={setIdentifier} value={identifier} />
          <Field autoComplete="current-password" label="Password" onChange={setPassword} type="password" value={password} />
          <ErrorPanel errors={errors} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</SubmitButton>
            <Link className="text-sm text-cyan-300 hover:text-cyan-200" to="/account/password/reset">
              Forgot your password?
            </Link>
          </div>
        </form>
      </AuthCard>

      <AuthCard className="space-y-8 border-cyan-400/20 bg-cyan-400/10">
        <ProviderButtons nextValue={nextValue} />
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Admin redirect support</p>
          <p className="mt-2">If you arrived here from <code>/admin/</code>, the original <code>next</code> target is preserved so the SPA can send you back after auth and MFA finish.</p>
        </div>
      </AuthCard>
    </div>
  );
}

function SignupPage() {
  const auth = useAuth();
  const nextValue = readNextParam();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  {%- if cookiecutter.username_type == 'username' %}
  const [username, setUsername] = useState('');
  {%- endif %}

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      redirectToNext(nextValue);
    }
  }, [auth.isAuthenticated, auth.isLoading, nextValue]);

  if (auth.isLoading) {
    return <LoadingPanel message="Loading the current session before signup." />;
  }

  if (!auth.accountConfig?.is_open_for_signup) {
    return (
      <AuthCard>
        <PageIntro
          description="Signup is currently closed by the backend account adapter."
          eyebrow="Signup"
          title="Registration is not open right now"
        />
      </AuthCard>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/signup`, {
        body: {
          email,
          password,
          {%- if cookiecutter.username_type == 'username' %}
          username,
          {%- endif %}
        },
        method: 'POST',
      });

      if (handleAuthenticationOutcome(response, nextValue)) {
        return;
      }

      if (!response.errors) {
        window.location.assign(buildAccountPath('/account/verify-email', nextValue));
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <AuthCard>
        <PageIntro
          description="Signup stays in the allauth ecosystem, but the browser never leaves the SPA shell unless a provider handshake needs it."
          eyebrow="Signup"
          title="Create an account from the SPA"
        />
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <Field autoComplete="email" label="Email address" onChange={setEmail} type="email" value={email} />
          {%- if cookiecutter.username_type == 'username' %}
          <Field autoComplete="username" label="Username" onChange={setUsername} value={username} />
          {%- endif %}
          <Field autoComplete="new-password" label="Password" onChange={setPassword} type="password" value={password} />
          <ErrorPanel errors={errors} />
          <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create account'}</SubmitButton>
        </form>
      </AuthCard>

      <AuthCard className="space-y-8 border-cyan-400/20 bg-cyan-400/10">
        <ProviderButtons nextValue={nextValue} />
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Verification flow</p>
          <p className="mt-2">Email confirmation links now land on SPA routes so the browser can finish verification without falling back to removed headed account pages.</p>
        </div>
      </AuthCard>
    </div>
  );
}

function LogoutPage() {
  const auth = useAuth();
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (auth.isLoading) {
    return <LoadingPanel message="Checking whether there is an active session to log out." />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/session`, {
        method: 'DELETE',
      });

      if (!response.errors) {
        window.location.assign('/');
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard className="max-w-2xl">
      <PageIntro
        description="Logout uses the browser-session endpoint, clears the Django session, and lets the SPA render the anonymous state again."
        eyebrow="Logout"
        title={auth.isAuthenticated ? 'Sign out of the current session' : 'There is no active session to close'}
      />
      {auth.isAuthenticated ? (
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <ErrorPanel errors={errors} />
          <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Signing out...' : 'Sign out'}</SubmitButton>
        </form>
      ) : null}
    </AuthCard>
  );
}

function VerifyEmailPage() {
  const auth = useAuth();
  const nextValue = readNextParam();

  if (auth.isLoading) {
    return <LoadingPanel message="Loading verification state." />;
  }

  return (
    <AuthCard className="max-w-3xl">
      <PageIntro
        description="Check your inbox and open the verification link. The SPA route will validate the key and complete the flow here."
        eyebrow="Email verification"
        title="Finish verifying your email address"
      />
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
        <p>If you were sent here from signup or admin login, the original target will still be waiting at <code>{nextValue}</code>.</p>
      </div>
    </AuthCard>
  );
}

function VerifyEmailKeyPage() {
  const auth = useAuth();
  const { key } = verifyEmailKeyRoute.useParams();
  const nextValue = readNextParam();
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadKey() {
      try {
        const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/email/verify`, {
          headers: {
            'x-email-verification-key': key,
          },
        });

        if (!isMounted) {
          return;
        }

        if (response.errors) {
          setErrors(formatErrors(response.errors));
        } else {
          const data = response.data as { email?: string } | undefined;
          setEmail(data?.email ?? null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadKey();

    return () => {
      isMounted = false;
    };
  }, [auth, key]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/email/verify`, {
        body: { key },
        method: 'POST',
      });

      if (handleAuthenticationOutcome(response, nextValue)) {
        return;
      }

      if (!response.errors) {
        window.location.assign('/');
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingPanel message="Checking that the email verification link is still valid." />;
  }

  return (
    <AuthCard className="max-w-3xl">
      <PageIntro
        description="The backend validates the key first, then this form confirms it through the headless endpoint so the SPA can continue any pending login flow."
        eyebrow="Email verification"
        title="Confirm this email address"
      />
      <div className="mt-8 space-y-5">
        {email ? <p className="text-sm text-slate-300">Verifying <span className="font-semibold text-white">{email}</span>.</p> : null}
        <ErrorPanel errors={errors} />
        {!errors.length ? (
          <form onSubmit={handleSubmit}>
            <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Confirming...' : 'Confirm email'}</SubmitButton>
          </form>
        ) : null}
      </div>
    </AuthCard>
  );
}

function RequestPasswordResetPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/password/request`, {
        body: { email },
        method: 'POST',
      });

      if (!response.errors) {
        setIsComplete(true);
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard className="max-w-3xl">
      <PageIntro
        description="Password reset requests stay server-driven, but the reset link now returns to a SPA route instead of a removed headed account page."
        eyebrow="Password reset"
        title="Send yourself a reset link"
      />
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <Field autoComplete="email" label="Email address" onChange={setEmail} type="email" value={email} />
        <ErrorPanel errors={errors} />
        {isComplete ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            If the address exists, a reset link is on its way.
          </div>
        ) : null}
        <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send reset link'}</SubmitButton>
      </form>
    </AuthCard>
  );
}

function ResetPasswordKeyPage() {
  const auth = useAuth();
  const { key } = resetPasswordKeyRoute.useParams();
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [password, setPassword] = useState('');
  const [userLabel, setUserLabel] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadKey() {
      try {
        const response = await requestAuth<HeadlessResponse<PasswordResetData>>(`${HEADLESS_BROWSER_BASE_PATH}/auth/password/reset`, {
          headers: {
            'X-Password-Reset-Key': key,
          },
        });

        if (!isMounted) {
          return;
        }

        if (response.errors) {
          setErrors(formatErrors(response.errors));
        } else {
          setUserLabel(response.data?.user?.email ?? response.data?.user?.display ?? null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadKey();

    return () => {
      isMounted = false;
    };
  }, [key]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/password/reset`, {
        body: { key, password },
        method: 'POST',
      });

      if (!response.errors) {
        setIsComplete(true);
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingPanel message="Validating the password reset key." />;
  }

  return (
    <AuthCard className="max-w-3xl">
      <PageIntro
        description="Once the key is validated, the new password posts through the same headless browser endpoint the backend generated for the email link."
        eyebrow="Password reset"
        title="Choose a new password"
      />
      <div className="mt-8 space-y-5">
        {userLabel ? <p className="text-sm text-slate-300">Resetting the password for <span className="font-semibold text-white">{userLabel}</span>.</p> : null}
        <ErrorPanel errors={errors} />
        {isComplete ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Your password has been updated. You can sign in again from the login screen.
          </div>
        ) : !errors.length ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Field autoComplete="new-password" label="New password" onChange={setPassword} type="password" value={password} />
            <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Set new password'}</SubmitButton>
          </form>
        ) : null}
      </div>
    </AuthCard>
  );
}

function MFAChallengePage() {
  const auth = useAuth();
  const nextValue = readNextParam();
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trust, setTrust] = useState(false);
  const pendingMFA = auth.flows.find((flow) => flow.id === 'mfa_authenticate' && flow.is_pending);
  const pendingTrust = auth.flows.find((flow) => flow.id === 'mfa_trust' && flow.is_pending);

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !pendingMFA && !pendingTrust) {
      redirectToNext(nextValue);
    }
  }, [auth.isAuthenticated, auth.isLoading, nextValue, pendingMFA, pendingTrust]);

  if (auth.isLoading) {
    return <LoadingPanel message="Loading any pending MFA stage." />;
  }

  async function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/2fa/authenticate`, {
        body: { code },
        method: 'POST',
      });

      if (handleAuthenticationOutcome(response, nextValue)) {
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTrustSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/2fa/trust`, {
        body: { trust },
        method: 'POST',
      });

      if (handleAuthenticationOutcome(response, nextValue)) {
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!pendingMFA && !pendingTrust) {
    return (
      <AuthCard className="max-w-3xl">
        <PageIntro
          description="There is no MFA challenge waiting in the current session."
          eyebrow="MFA"
          title="No pending verification step"
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard className="max-w-3xl">
      <PageIntro
        description="This route handles MFA before the admin login guard or any other protected backend path can be completed."
        eyebrow="MFA"
        title={pendingTrust ? 'Trust this browser before continuing' : 'Finish the second factor challenge'}
      />
      <div className="mt-8 space-y-5">
        {pendingMFA ? (
          <form className="space-y-5" onSubmit={handleCodeSubmit}>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-white">Accepted authenticators</p>
              <p className="mt-2">{pendingMFA.types?.join(', ') ?? auth.mfaConfig?.supported_types?.join(', ') ?? 'TOTP or recovery codes'}</p>
            </div>
            <Field autoComplete="one-time-code" label="Verification code" onChange={setCode} value={code} />
            <ErrorPanel errors={errors} />
            <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Verifying...' : 'Verify code'}</SubmitButton>
          </form>
        ) : null}

        {pendingTrust ? (
          <form className="space-y-5" onSubmit={handleTrustSubmit}>
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-200">
              <input checked={trust} className="mt-1" onChange={(event) => setTrust(event.target.checked)} type="checkbox" />
              <span>Remember this browser if the backend asks allauth to trust it for future MFA prompts.</span>
            </label>
            <ErrorPanel errors={errors} />
            <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Continuing...' : 'Continue'}</SubmitButton>
          </form>
        ) : null}
      </div>
    </AuthCard>
  );
}

function ProviderCallbackPage() {
  const auth = useAuth();
  const nextValue = readNextParam();
  const search = new URLSearchParams(window.location.search);
  const error = search.get('error');
  const [errors, setErrors] = useState<string[]>(error ? [error.replaceAll('_', ' ')] : []);
  const [isLoadingSignup, setIsLoadingSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<SocialSignupData | null>(null);
  const [email, setEmail] = useState('');
  {%- if cookiecutter.username_type == 'username' %}
  const [username, setUsername] = useState('');
  {%- endif %}

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      redirectToNext(nextValue);
    }
  }, [auth.isAuthenticated, auth.isLoading, nextValue]);

  useEffect(() => {
    let isMounted = true;

    async function loadPendingSignup() {
      if (error || auth.isLoading || auth.isAuthenticated || !hasPendingFlow(auth.session, 'provider_signup')) {
        return;
      }

      setIsLoadingSignup(true);
      try {
        const response = await auth.request<HeadlessResponse<SocialSignupData>>(`${HEADLESS_BROWSER_BASE_PATH}/auth/provider/signup`);
        if (!isMounted) {
          return;
        }

        if (response.errors) {
          setErrors(formatErrors(response.errors));
          return;
        }

        const data = response.data ?? null;
        setPendingSignup(data);
        setEmail(data?.user?.email ?? data?.email?.find((item) => item.primary)?.email ?? '');
        {%- if cookiecutter.username_type == 'username' %}
        setUsername(data?.user?.username ?? '');
        {%- endif %}
      } finally {
        if (isMounted) {
          setIsLoadingSignup(false);
        }
      }
    }

    void loadPendingSignup();

    return () => {
      isMounted = false;
    };
  }, [auth, error]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/provider/signup`, {
        body: {
          email,
          {%- if cookiecutter.username_type == 'username' %}
          username,
          {%- endif %}
        },
        method: 'POST',
      });

      if (handleAuthenticationOutcome(response, nextValue)) {
        return;
      }

      if (!response.errors) {
        window.location.assign(buildAccountPath('/account/verify-email', nextValue));
        return;
      }

      setErrors(formatErrors(response.errors));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (auth.isLoading || isLoadingSignup) {
    return <LoadingPanel message="Finishing the provider callback through the backend session." />;
  }

  return (
    <AuthCard className="max-w-3xl">
      <PageIntro
        description="Provider redirects land here after Django completes the callback. If extra signup fields are still required, the SPA keeps the user inside the same auth surface."
        eyebrow="Provider callback"
        title={pendingSignup ? 'Complete the provider signup' : error ? 'The provider login did not complete' : 'Waiting for provider state'}
      />
      <div className="mt-8 space-y-5">
        <ErrorPanel errors={errors} />
        {pendingSignup ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-white">Provider</p>
              <p className="mt-2">{pendingSignup.account?.provider?.name ?? 'Social account'}</p>
            </div>
            <Field autoComplete="email" label="Email address" onChange={setEmail} type="email" value={email} />
            {%- if cookiecutter.username_type == 'username' %}
            <Field autoComplete="username" label="Username" onChange={setUsername} value={username} />
            {%- endif %}
            <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Completing signup...' : 'Complete signup'}</SubmitButton>
          </form>
        ) : !errors.length ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
            Return to this route after the provider authorizes the session. If the callback has already succeeded, you will be redirected automatically.
          </div>
        ) : null}
      </div>
    </AuthCard>
  );
}

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  component: HomePage,
  getParentRoute: () => rootRoute,
  path: '/',
});

const aboutRoute = createRoute({
  component: AboutPage,
  getParentRoute: () => rootRoute,
  path: '/about',
});

const loginRoute = createRoute({
  component: LoginPage,
  getParentRoute: () => rootRoute,
  path: '/account/login',
});

const signupRoute = createRoute({
  component: SignupPage,
  getParentRoute: () => rootRoute,
  path: '/account/signup',
});

const logoutRoute = createRoute({
  component: LogoutPage,
  getParentRoute: () => rootRoute,
  path: '/account/logout',
});

const verifyEmailRoute = createRoute({
  component: VerifyEmailPage,
  getParentRoute: () => rootRoute,
  path: '/account/verify-email',
});

const verifyEmailKeyRoute = createRoute({
  component: VerifyEmailKeyPage,
  getParentRoute: () => rootRoute,
  path: '/account/verify-email/$key',
});

const requestPasswordResetRoute = createRoute({
  component: RequestPasswordResetPage,
  getParentRoute: () => rootRoute,
  path: '/account/password/reset',
});

const resetPasswordKeyRoute = createRoute({
  component: ResetPasswordKeyPage,
  getParentRoute: () => rootRoute,
  path: '/account/password/reset/key/$key',
});

const mfaRoute = createRoute({
  component: MFAChallengePage,
  getParentRoute: () => rootRoute,
  path: '/account/2fa',
});

const providerCallbackRoute = createRoute({
  component: ProviderCallbackPage,
  getParentRoute: () => rootRoute,
  path: '/account/provider/callback',
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  loginRoute,
  signupRoute,
  logoutRoute,
  verifyEmailRoute,
  verifyEmailKeyRoute,
  requestPasswordResetRoute,
  resetPasswordKeyRoute,
  mfaRoute,
  providerCallbackRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
