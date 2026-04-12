import { Link, Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Vite Frontend</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{{ cookiecutter.project_name }}</h1>
            <p className="text-base leading-7 text-slate-300">
              The React app lives in <code className="rounded bg-white/10 px-2 py-1 text-sm">frontend/</code>. Django
              continues to serve the API and admin.
            </p>
          </div>
          <nav className="flex gap-3 text-sm font-medium text-slate-300">
            <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/">
              Home
            </Link>
            <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/about">
              About
            </Link>
          </nav>
        </header>

        <main className="flex-1 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300/80">Starter App</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Separate frontend, same-origin production</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          Use the Vite dev server on port 5173 for local UI work. In production, Django renders the SPA shell and
          serves the built frontend assets through its staticfiles setup.
        </p>
      </section>

      <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-8">
        <h2 className="text-lg font-semibold text-white">Backend contract</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-cyan-50/90">
          <li>Django owns <code>/api/</code> and <code>/admin/</code>.</li>
          <li><code>django-allauth</code> remains installed as backend auth infrastructure.</li>
          <li>Client-side auth UI is intentionally left for a follow-up change.</li>
        </ul>
      </section>
    </div>
  );
}

function AboutPage() {
  return (
    <section className="max-w-3xl rounded-3xl border border-white/10 bg-slate-900/80 p-8">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300/80">About</p>
      <h2 className="mt-4 text-3xl font-semibold text-white">A minimal TanStack Router starter</h2>
      <p className="mt-4 text-base leading-7 text-slate-300">
        This starter keeps the route tree explicit in code, ships with Tailwind from day one, and avoids implying that
        authentication has already been solved on the frontend.
      </p>
    </section>
  );
}

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});

const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
