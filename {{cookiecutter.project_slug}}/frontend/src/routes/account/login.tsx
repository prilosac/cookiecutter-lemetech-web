import { Link, createFileRoute, type SearchSchemaInput } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth';
import { formatErrors, handleAuthenticationOutcome, redirectToNext, sanitizeNext } from '../../auth-routing';
import { AuthCard, ErrorPanel, Field, PageIntro, ProviderButtons, SubmitButton } from '../../auth-ui';
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
    <div className="grid gap-6 lg:grid-cols-1">
      <AuthCard className="max-w-xl">
        <PageIntro
          eyebrow="Login"
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
    </div>
  );
}
