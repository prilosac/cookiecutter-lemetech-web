import { Link, createFileRoute, type SearchSchemaInput } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth';
import { formatErrors, handleAuthenticationOutcome, redirectToNext, sanitizeNext } from '../../auth-routing';
import { AuthCard, ErrorPanel, Field, LoadingPanel, PageIntro, ProviderButtons, SubmitButton } from '../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH } from '../../lib/auth';

export const Route = createFileRoute('/account/login')({
  validateSearch: (search: SearchSchemaInput & { next?: string }) => ({
    next: sanitizeNext(search.next),
  }),
  component: LoginPage,
});

function LoginPage() {
  const auth = useAuth();
  const { next: nextValue } = Route.useSearch();
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
