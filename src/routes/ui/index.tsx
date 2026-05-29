import { createFileRoute, Link } from '@tanstack/react-router'
import { PageLayout } from '@/layouts/PageLayout'
import { ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/ui/')({
  component: UIIndex,
})

const uiComponents = [
  {
    name: 'Seki Monitor',
    description: 'Monitor de pipeline Seki con timeline jerárquico y subestados',
    path: '/ui/seki-monitor',
    category: 'Pipeline',
  },
]

function UIIndex() {
  return (
    <PageLayout header={{ title: 'UI Gallery (Mock Data)' }}>
      <div className="space-y-6">
        <div className="text-muted-foreground">
          Galería para testear componentes con datos mock.
        </div>

        <div className="grid gap-4">
          {uiComponents.map((component) => (
            <Link
              key={component.path}
              to={component.path}
              className="group block p-4 rounded-xl border border-border/50 hover:border-border hover:bg-muted/50 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{component.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {component.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{component.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {uiComponents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay componentes de UI disponibles aún.
          </div>
        )}
      </div>
    </PageLayout>
  )
}
