import { Link, Outlet, createRootRoute } from '@tanstack/react-router';

import { useAuth } from '../auth';
import { collectFlowIds } from '../auth-routing';

export const Route = createRootRoute({ component: AppShell });

function AppShell() {
  const auth = useAuth();
  const pendingFlowIds = collectFlowIds(auth.flows);
  const authSummary = auth.isLoading
    ? 'Bootstrapping session state...'
    : auth.isAuthenticated
      ? pendingFlowIds.length
        ? `Pending: ${pendingFlowIds.join(', ')}`
        : 'Have a great day'
      : pendingFlowIds.length
        ? `Pending: ${pendingFlowIds.join(', ')}`
        : 'No authenticated session yet.';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="space-y-8 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{{ cookiecutter.project_name }}</h1>
              <p className="text-base leading-7 text-slate-300">
                by <a href="mailto:{{ cookiecutter.email }}">{{ cookiecutter.author_name }}</a>
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-sm text-cyan-50 max-w-xs">
              <p className="font-semibold">{auth.isAuthenticated ?
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/profile">
                  {auth.user?.display}
                </Link>
                : <></>}</p>
              <p className="mt-1 text-cyan-50/80">{authSummary}</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3 text-sm font-medium text-slate-300">
            <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/">
              Home
            </Link>
            <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/about">
              About
            </Link>
            {auth.isAuthenticated ? null : (
              <>
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/login">
                  Login
                </Link>
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/signup">
                  Signup
                </Link>
              </>
            )}
            {auth.isAuthenticated ? (
              <>
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/logout">
                  Logout
                </Link>
                <Link className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" to="/account/password/reset">
                  Reset password
                </Link>
              </>
            ) : null}
            <a className="rounded-full border border-white/15 px-4 py-2 hover:border-cyan-300 hover:text-white" href="/admin/">
              Admin
            </a>
          </nav>
        </header>

        <main className="flex-1 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
