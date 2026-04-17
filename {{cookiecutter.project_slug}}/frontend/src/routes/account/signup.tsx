import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth';
import { buildAccountPath, formatErrors, handleAuthenticationOutcome, redirectToNext, sanitizeNext } from '../../auth-routing';
import { AuthCard, ErrorPanel, Field, LoadingPanel, PageIntro, ProviderButtons, SubmitButton } from '../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH } from '../../lib/auth';

export const Route = createFileRoute('/account/signup')({
  validateSearch: (search: SearchSchemaInput & { next?: string }) => ({
    next: sanitizeNext(search.next),
  }),
  component: SignupPage,
});

function SignupPage() {
  const auth = useAuth();
  const { next: nextValue } = Route.useSearch();
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
