import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { useAuth } from '../../auth';
import { formatErrors } from '../../auth-routing';
import { AuthCard, ErrorPanel, LoadingPanel, PageIntro, SubmitButton } from '../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH } from '../../lib/auth';

export const Route = createFileRoute('/account/logout')({ component: LogoutPage });

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
