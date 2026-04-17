import { createFileRoute } from '@tanstack/react-router';

import { useAuth } from '../auth';
import { collectFlowIds } from '../auth-routing';
import { AuthCard, PageIntro } from '../auth-ui';

export const Route = createFileRoute('/')({ component: HomePage });

function HomePage() {
  const auth = useAuth();
  const pendingFlowIds = collectFlowIds(auth.flows);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <AuthCard className="bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_45%),rgba(15,23,42,0.92)]">
        <PageIntro
          description="Use the Vite dev server for local UI work, but keep auth on same-origin browser sessions through Django. The SPA now owns the login, signup, reset, verification, MFA, and social callback surface."
          eyebrow="Session Contract"
          title="A real auth surface for the generated Vite app"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current user</p>
            <p className="mt-3 text-lg font-semibold text-white">{auth.user?.display ?? 'Anonymous visitor'}</p>
            <p className="mt-2 text-sm text-slate-400">{auth.user?.email ?? 'No authenticated session yet.'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pending flows</p>
            <p className="mt-3 text-lg font-semibold text-white">{pendingFlowIds.length ? pendingFlowIds.join(', ') : 'None'}</p>
            <p className="mt-2 text-sm text-slate-400">Auth flow state comes from <code>/_allauth/browser/v1/auth/session</code>.</p>
          </div>
        </div>
      </AuthCard>

      <AuthCard className="border-cyan-400/20 bg-cyan-400/10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100/80">Ownership split</p>
        <ul className="mt-5 space-y-3 text-sm leading-6 text-cyan-50/90">
          <li>SPA routes live under <code>/account/...</code>.</li>
          <li>Django auth entrypoints stay under <code>/accounts/...</code>.</li>
          <li>Headless browser endpoints stay under <code>/_allauth/browser/v1/...</code>.</li>
          <li>Admin still uses Django and can redirect through the SPA login bridge.</li>
        </ul>
      </AuthCard>
    </div>
  );
}
