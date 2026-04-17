import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../../../../auth';
import { formatErrors } from '../../../../../auth-routing';
import { AuthCard, ErrorPanel, Field, LoadingPanel, PageIntro, SubmitButton } from '../../../../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH, type HeadlessResponse, type PasswordResetData, requestAuth } from '../../../../../lib/auth';

export const Route = createFileRoute('/account/password/reset/key/$key')({ component: ResetPasswordKeyPage });

function ResetPasswordKeyPage() {
  const auth = useAuth();
  const { key } = Route.useParams();
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
