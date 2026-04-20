import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../../auth';
import { formatErrors, handleAuthenticationOutcome, sanitizeNext } from '../../../auth-routing';
import { AuthCard, ErrorPanel, PageIntro, SubmitButton } from '../../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH } from '../../../lib/auth';

export const Route = createFileRoute('/account/verify-email/$key')({
  validateSearch: (search: SearchSchemaInput & { next?: string }) => ({
    next: sanitizeNext(search.next),
  }),
  component: VerifyEmailKeyPage,
});

function VerifyEmailKeyPage() {
  const auth = useAuth();
  const { key } = Route.useParams();
  const { next: nextValue } = Route.useSearch();
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
