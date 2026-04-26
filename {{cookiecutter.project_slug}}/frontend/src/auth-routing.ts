import type { AuthFlow, HeadlessError, HeadlessResponse } from './lib/auth';

type AppNavigate = (options: { replace?: boolean; to: string }) => void | Promise<void>;

const DJANGO_OWNED_REDIRECT_PREFIXES = ['/admin/', '/accounts/', '/_allauth/'];

function getFlows(response: HeadlessResponse | null | undefined) {
  return ((response?.data as { flows?: AuthFlow[] } | undefined)?.flows ?? []) as AuthFlow[];
}

export function sanitizeNext(nextValue: string | null | undefined) {
  if (!nextValue || !nextValue.startsWith('/') || nextValue.startsWith('//')) {
    return '/';
  }

  return nextValue;
}

export function buildAccountPath(path: string, nextValue?: string | null) {
  const next = sanitizeNext(nextValue ?? null);
  if (next === '/') {
    return path;
  }

  return `${path}?${new URLSearchParams({ next }).toString()}`;
}

function isDjangoOwnedRedirect(nextValue: string) {
  return DJANGO_OWNED_REDIRECT_PREFIXES.some((prefix) => nextValue.startsWith(prefix));
}

export function redirectToNext(nextValue: string | null | undefined, navigate: AppNavigate) {
  const next = sanitizeNext(nextValue ?? null);

  if (isDjangoOwnedRedirect(next)) {
    window.location.assign(next);
    return;
  }

  void navigate({ replace: true, to: next });
}

export function navigateToAccountPath(path: string, nextValue: string | null | undefined, navigate: AppNavigate) {
  void navigate({ replace: true, to: buildAccountPath(path, nextValue) });
}

export function hasPendingFlow(response: HeadlessResponse | null | undefined, flowId: string) {
  return getFlows(response).some((flow) => flow.id === flowId && flow.is_pending);
}

export function hasFlow(response: HeadlessResponse | null | undefined, flowId: string) {
  return getFlows(response).some((flow) => flow.id === flowId);
}

export function collectFlowIds(flows: AuthFlow[]) {
  return flows.filter((flow) => flow.is_pending).map((flow) => flow.id);
}

export function formatErrors(errors: HeadlessError[] | undefined) {
  return (errors ?? []).map((error) => error.message);
}

export function handleAuthenticationOutcome(response: HeadlessResponse, nextValue: string | null | undefined, navigate: AppNavigate) {
  const meta = response.meta as { is_authenticated?: boolean } | undefined;

  if (meta?.is_authenticated) {
    redirectToNext(nextValue, navigate);
    return true;
  }

  if (hasPendingFlow(response, 'mfa_authenticate') || hasPendingFlow(response, 'mfa_trust')) {
    navigateToAccountPath('/account/2fa', nextValue, navigate);
    return true;
  }

  if (hasPendingFlow(response, 'verify_email')) {
    navigateToAccountPath('/account/verify-email', nextValue, navigate);
    return true;
  }

  return false;
}
