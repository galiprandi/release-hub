import { createFileRoute } from '@tanstack/react-router';
import { PageLayout } from '@/layouts/PageLayout';
import { DiffViewer } from '@/diff/components/DiffViewer';
import { DiffControls } from '@/diff/components/DiffControls';
import type { DiffMode } from '@/utils/diffEngine';
import { GitCompare } from 'lucide-react';

export const Route = createFileRoute('/diff')({
  component: DiffPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      mode: (['json', 'jwt', 'curl', 'text', 'javascript', 'typescript', 'html', 'css', 'python'].includes(search.mode as string)
        ? search.mode
        : 'json') as DiffMode,
    };
  },
});

function DiffPage() {
  const { mode } = Route.useSearch();
  const navigate = Route.useNavigate();

  const setMode = (newMode: DiffMode) => {
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, mode: newMode }),
    });
  };

  return (
    <PageLayout
      header={{
        title: (
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            <span>Comparador Universal</span>
          </div>
        ),
        searchComponent: <DiffControls mode={mode} onModeChange={setMode} />
      }}
    >
      <div className="flex flex-col gap-6">
        <DiffViewer mode={mode} onModeChange={setMode} />
      </div>
    </PageLayout>
  );
}
