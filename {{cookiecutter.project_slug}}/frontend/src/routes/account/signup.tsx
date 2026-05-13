import { createFileRoute, useNavigate, type SearchSchemaInput } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth';
import { formatErrors, handleAuthenticationOutcome, navigateToAccountPath, redirectToNext, sanitizeNext } from '../../auth-routing';
import { AuthCard, ErrorPanel, Field, PageIntro, ProviderButtons, SubmitButton } from '../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH } from '../../lib/auth';

export const Route = createFileRoute('/account/signup')({
  validateSearch: (search: SearchSchemaInput & { next?: string }) => ({
    next: sanitizeNext(search.next),
  }),
  component: SignupPage,
});

function SignupPage() {
  const auth = useAuth();
  const navigate = useNavigate();
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
      redirectToNext(nextValue, navigate);
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate, nextValue]);

  if (!auth.isLoading && auth.accountConfig?.is_open_for_signup === false) {
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

      if (handleAuthenticationOutcome(response, nextValue, navigate)) {
        return;
      }

      if (!response.errors) {
        navigateToAccountPath('/account/verify-email', nextValue, navigate);
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
          eyebrow="Signup"
          title="Create an account"
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
    </div>
  );
}
