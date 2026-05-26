import { createFileRoute } from '@tanstack/react-router';
import { PageLayout } from '@/layouts/PageLayout';
import { DiffViewer } from '@/components/diff/DiffViewer';
import { DiffControls } from '@/components/diff/DiffControls';
import { useState } from 'react';
import type { DiffMode } from '@/utils/diffEngine';
import { GitCompare } from 'lucide-react';

export const Route = createFileRoute('/diff')({
  component: DiffPage,
});

function DiffPage() {
  const [mode, setMode] = useState<DiffMode>('json');

  return (
    <PageLayout
      header={{
        title: (
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
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
