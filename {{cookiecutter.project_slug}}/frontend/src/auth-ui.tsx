import { useAuth } from './auth';
import { buildAccountPath } from './auth-routing';
import { HEADLESS_BROWSER_BASE_PATH } from './lib/auth';

export function PageIntro({ eyebrow, title, description }: { description?: string; eyebrow: string; title?: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300/80">{eyebrow}</p>
      {title ? <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2> : null}
      {description ? <p className="max-w-2xl text-base leading-7 text-slate-300">{description}</p> : null}
    </div>
  );
}

export function AuthCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-950/20 ${className}`}>
      {children}
    </section>
  );
}

export function ErrorPanel({ errors }: { errors: string[] }) {
  if (!errors.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
      <ul className="space-y-2">
        {errors.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function Field({
  autoComplete,
  label,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block space-y-2 text-sm text-slate-200">
      <span className="block font-medium">{label}</span>
      <input
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

export function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
  );
}

export function ProviderButtons({ nextValue }: { nextValue: string }) {
  const auth = useAuth();

  const providers = auth.providers.filter((provider) => provider.flows.includes('provider_redirect'));
  if (!providers.length || !auth.csrfToken) {
    return null;
  }

  const callbackUrl = buildAccountPath('/account/provider/callback', nextValue);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Social login</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((provider) => (
          <form action={`${HEADLESS_BROWSER_BASE_PATH}/auth/provider/redirect`} key={provider.id} method="post">
            <input name="csrfmiddlewaretoken" type="hidden" value={auth.csrfToken ?? ''} />
            <input name="provider" type="hidden" value={provider.id} />
            <input name="process" type="hidden" value="login" />
            <input name="callback_url" type="hidden" value={callbackUrl} />
            <button
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-300 hover:bg-cyan-400/10"
              type="submit"
            >
              Continue with {provider.name}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

export function LoadingPanel({ message }: { message: string }) {
  return (
    <AuthCard>
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Loading</p>
      <p className="mt-4 text-base text-slate-300">{message}</p>
    </AuthCard>
  );
}
