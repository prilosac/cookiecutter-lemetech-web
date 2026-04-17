import type { AuthFlow, HeadlessError, HeadlessResponse } from './lib/auth';

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

export function redirectToNext(nextValue?: string | null) {
  window.location.assign(sanitizeNext(nextValue ?? null));
}

export function hasPendingFlow(response: HeadlessResponse | null | undefined, flowId: string) {
  const flows = (response?.data as { flows?: AuthFlow[] } | undefined)?.flows ?? [];
  return flows.some((flow) => flow.id === flowId && flow.is_pending);
}

export function collectFlowIds(flows: AuthFlow[]) {
  return flows.filter((flow) => flow.is_pending).map((flow) => flow.id);
}

export function formatErrors(errors: HeadlessError[] | undefined) {
  return (errors ?? []).map((error) => error.message);
}

export function handleAuthenticationOutcome(response: HeadlessResponse, nextValue?: string | null) {
  const meta = response.meta as { is_authenticated?: boolean } | undefined;

  if (meta?.is_authenticated) {
    redirectToNext(nextValue);
    return true;
  }

  if (hasPendingFlow(response, 'mfa_authenticate') || hasPendingFlow(response, 'mfa_trust')) {
    window.location.assign(buildAccountPath('/account/2fa', nextValue));
    return true;
  }

  if (hasPendingFlow(response, 'verify_email')) {
    window.location.assign(buildAccountPath('/account/verify-email', nextValue));
    return true;
  }

  return false;
}
