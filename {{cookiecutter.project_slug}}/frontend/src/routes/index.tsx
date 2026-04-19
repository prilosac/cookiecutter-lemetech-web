import { createFileRoute } from '@tanstack/react-router';

import { useAuth } from '../auth';
import { collectFlowIds } from '../auth-routing';
import { AuthCard, PageIntro } from '../auth-ui';

export const Route = createFileRoute('/')({ component: HomePage });

function HomePage() {
  const auth = useAuth();
  const pendingFlowIds = collectFlowIds(auth.flows);

  return (
    <div className="grid gap-6 lg:grid-cols-1">
      <AuthCard className="bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.2),_transparent_45%),rgba(15,23,42,0.92)]">
        <PageIntro
          description="Powered by Vite and TanStack Router"
          eyebrow="A New Beginning"
          title="Welcome to your new React app!"
        />
      </AuthCard>
    </div>
  );
}
