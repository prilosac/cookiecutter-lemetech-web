import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useAuth } from '../../auth';
import { formatErrors } from '../../auth-routing';
import { AuthCard, ErrorPanel, PageIntro, SubmitButton } from '../../auth-ui';
import { HEADLESS_BROWSER_BASE_PATH } from '../../lib/auth';

export const Route = createFileRoute('/account/logout')({
  beforeLoad: async ({ context }) => {
    const auth = await context.auth.waitForReady();

    if (!auth.isAuthenticated) {
      throw redirect({ replace: true, to: '/' });
    }
  },
  component: LogoutPage,
});

function LogoutPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await auth.request(`${HEADLESS_BROWSER_BASE_PATH}/auth/session`, {
        method: 'DELETE',
      });

      if (!response.errors) {
        void navigate({ replace: true, to: '/' });
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
        description=""
        eyebrow="Logout"
        title="Sign out of the current session"
      />
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <ErrorPanel errors={errors} />
        <SubmitButton disabled={isSubmitting}>{isSubmitting ? 'Signing out...' : 'Sign out'}</SubmitButton>
      </form>
    </AuthCard>
  );
}
