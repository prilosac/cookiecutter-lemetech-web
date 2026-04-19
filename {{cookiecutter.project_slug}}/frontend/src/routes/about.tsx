import { createFileRoute } from '@tanstack/react-router';

import { AuthCard, PageIntro } from '../auth-ui';

export const Route = createFileRoute('/about')({ component: AboutPage });

function AboutPage() {
  return (
    <AuthCard className="max-w-4xl">
      <PageIntro
        description="It truly will be magnificent. That's the plan, anyway."
        eyebrow="About"
        title="All about {{ cookiecutter.project_name }}."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">One Thing</p>
          <p className="mt-2">All about one thing that {{ cookiecutter.project_name }} does.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Another Thing</p>
          <p className="mt-2">You'll never believe it - all about <i>another</i> thing that we do.</p>
        </div>
      </div>
    </AuthCard>
  );
}
