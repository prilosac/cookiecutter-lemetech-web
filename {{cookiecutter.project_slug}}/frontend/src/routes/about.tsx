import { createFileRoute } from '@tanstack/react-router';

import { AuthCard, PageIntro } from '../auth-ui';

export const Route = createFileRoute('/about')({ component: AboutPage });

function AboutPage() {
  return (
    <AuthCard className="max-w-4xl">
      <PageIntro
        description="This starter keeps the React route tree file-based, proxies auth through Vite during local development, and leaves the backend in charge of sessions, provider callbacks, and admin access control."
        eyebrow="About"
        title="Headless allauth without a split browser contract"
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Local development</p>
          <p className="mt-2">Vite serves the document on port 5173 and proxies <code>/accounts</code>, <code>/_allauth</code>, <code>/api</code>, and <code>/admin</code> back to Django.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Production</p>
          <p className="mt-2">Django serves the SPA shell and the built assets, so the same session-backed auth flow works without changing endpoints.</p>
        </div>
      </div>
    </AuthCard>
  );
}
