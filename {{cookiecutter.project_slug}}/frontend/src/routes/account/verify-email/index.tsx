import { createFileRoute, type SearchSchemaInput } from '@tanstack/react-router';

import { useAuth } from '../../../auth';
import { sanitizeNext } from '../../../auth-routing';
import { AuthCard, LoadingPanel, PageIntro } from '../../../auth-ui';

export const Route = createFileRoute('/account/verify-email/')({
  validateSearch: (search: SearchSchemaInput & { next?: string }) => ({
    next: sanitizeNext(search.next),
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const auth = useAuth();
  const { next: nextValue } = Route.useSearch();

  if (auth.isLoading) {
    return <LoadingPanel message="Loading verification state." />;
  }

  return (
    <AuthCard className="max-w-3xl">
      <PageIntro
        description="Check your inbox and open the verification link. The SPA route will validate the key and complete the flow here."
        eyebrow="Email verification"
        title="Finish verifying your email address"
      />
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
        <p>If you were sent here from signup or admin login, the original target will still be waiting at <code>{nextValue}</code>.</p>
      </div>
    </AuthCard>
  );
}
