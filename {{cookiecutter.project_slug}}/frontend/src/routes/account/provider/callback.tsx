import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../../auth';
import {
  buildAccountPath,
  formatErrors,
  handleAuthenticationOutcome,
  hasPendingFlow,
  redirectToNext,
  sanitizeNext,
} from '../../../auth-routing';
import { AuthCard, ErrorPanel, Field, LoadingPanel, PageIntro, SubmitButton } from '../../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH, type HeadlessResponse, type SocialSignupData } from '../../../lib/auth';

export const Route = createFileRoute('/account/provider/callback')({
  validateSearch: (search: SearchSchemaInput & { error?: string; next?: string }) => ({
    next: sanitizeNext(search.next),
    error: search.error,
  }),
  component: ProviderCallbackPage,
});

function ProviderCallbackPage() {
  const auth = useAuth();
  const { error, next: nextValue } = Route.useSearch();
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
