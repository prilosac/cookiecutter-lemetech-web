import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth';
import { formatErrors, handleAuthenticationOutcome, redirectToNext, sanitizeNext } from '../../auth-routing';
import { AuthCard, ErrorPanel, Field, PageIntro, SubmitButton } from '../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH } from '../../lib/auth';

export const Route = createFileRoute('/account/2fa')({
  validateSearch: (search: SearchSchemaInput & { next?: string }) => ({
    next: sanitizeNext(search.next),
  }),
  component: MFAChallengePage,
});

function MFAChallengePage() {
  const auth = useAuth();
  const { next: nextValue } = Route.useSearch();
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
