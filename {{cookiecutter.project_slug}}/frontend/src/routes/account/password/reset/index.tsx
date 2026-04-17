import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { useAuth } from '../../../../auth';
import { formatErrors } from '../../../../auth-routing';
import { AuthCard, ErrorPanel, Field, PageIntro, SubmitButton } from '../../../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH } from '../../../../lib/auth';

export const Route = createFileRoute('/account/password/reset/')({ component: RequestPasswordResetPage });

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
