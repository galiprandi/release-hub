import { createFileRoute } from '@tanstack/react-router'
import { GitCommit } from 'lucide-react'
import { PageLayout } from '@/layouts/PageLayout'
import { PipelineCard, type MetaPart } from '@/pipeline-core/components/PipelineCard'
import { SimpleTimeline } from '@/pipeline-core/components/SimpleTimeline'
import type { PipelineData, PipelineEvent } from '@/pipeline-core/types'
import DayJS from '@/lib/dayjs'

export const Route = createFileRoute('/ui/seki-monitor')({
  component: SekiMonitorTestPage,
})

const mockPipelineData: PipelineData = {
  id: 'seki-c044671f25f0f02a98c93a35d9b298ca61d35000',
  provider: 'seki',
  ref: 'c044671',
  refType: 'COMMIT',
  state: 'STARTED',
  startedAt: '2026-05-29T15:12:12.803Z',
  updatedAt: '2026-05-29T15:12:58.023Z',
  commit: {
    message: 'Merge pull request #1750 from Cencosud-xlabs/fix/ARARG-8167',
    author: 'Aliprandi, German Antonio (Externos - RH-T)',
  },
  events: [
    // VA - Validación
    {
      id: 'VA',
      name: 'Validación',
      state: 'COMPLETED',
      startedAt: '2026-05-29T15:12:12.803Z',
      completedAt: '2026-05-29T15:12:18.622Z',
      subevents: [
        { id: 'CONFIG_validation_config', name: 'validation: config', state: 'COMPLETED', startedAt: '2026-05-29T15:12:14.949Z', completedAt: '2026-05-29T15:12:18.566Z' },
        { id: 'JIRA_validation_jira', name: 'validation: jira', state: 'IDLE', startedAt: '2026-05-29T15:12:14.951Z', completedAt: '2026-05-29T15:12:15.055Z' },
        { id: 'NAMESPACE_validation_kubernets', name: 'validation: kubernets', state: 'COMPLETED', startedAt: '2026-05-29T15:12:14.948Z', completedAt: '2026-05-29T15:12:18.587Z' },
        { id: 'SECRETS_validation_secrets', name: 'validation: secrets', state: 'COMPLETED', startedAt: '2026-05-29T15:12:14.947Z', completedAt: '2026-05-29T15:12:18.622Z' },
        { id: 'WORKSPACE_workspace_info', name: 'workspace: info', state: 'COMPLETED', startedAt: '2026-05-29T15:12:12.803Z', completedAt: '2026-05-29T15:12:12.803Z' },
      ],
    },

    // BS - Imagen de dependencias
    {
      id: 'BS',
      name: 'Imagen de dependencias',
      state: 'COMPLETED',
      startedAt: '2026-05-29T15:12:22.091Z',
      completedAt: '2026-05-29T15:12:28.086Z',
      subevents: [
        { id: 'GOLDEN_DEPENDENCIES_golden_dockerize', name: 'golden: dockerize', state: 'COMPLETED', startedAt: '2026-05-29T15:12:22.091Z', completedAt: '2026-05-29T15:12:28.086Z' },
      ],
    },

    // GD - Imagen de proyectos
    {
      id: 'GD',
      name: 'Imagen de proyectos',
      state: 'STARTED',
      startedAt: '2026-05-29T15:12:33.391Z',
      completedAt: '2026-05-29T15:12:28.086Z',
      subevents: [
        { id: 'BUILD_api_mobile-bff', name: 'api: mobile-bff', state: 'STARTED', startedAt: '2026-05-29T15:12:33.391Z', completedAt: '2026-05-29T15:12:28.086Z' },
      ],
    },

    // CI - Infraestructura
    {
      id: 'CI',
      name: 'Infraestructura',
      state: 'COMPLETED',
      startedAt: '2026-05-29T15:12:22.090Z',
      completedAt: '2026-05-29T15:12:45.989Z',
      subevents: [
        { id: 'CREATE_google_bucket_default', name: 'google_bucket: default', state: 'COMPLETED', startedAt: '2026-05-29T15:12:22.093Z', completedAt: '2026-05-29T15:12:31.073Z' },
        { id: 'CREATE_kafka_default', name: 'kafka: default', state: 'COMPLETED', startedAt: '2026-05-29T15:12:22.094Z', completedAt: '2026-05-29T15:12:41.377Z' },
        { id: 'CREATE_mongodb_default', name: 'mongodb: default', state: 'COMPLETED', startedAt: '2026-05-29T15:12:22.095Z', completedAt: '2026-05-29T15:12:43.077Z' },
        { id: 'CREATE_redis_default', name: 'redis: default', state: 'COMPLETED', startedAt: '2026-05-29T15:12:22.096Z', completedAt: '2026-05-29T15:12:32.655Z' },
        { id: 'CREATE_redis_schedule', name: 'redis: schedule', state: 'COMPLETED', startedAt: '2026-05-29T15:12:22.096Z', completedAt: '2026-05-29T15:12:33.305Z' },
        { id: 'CREATE_redis_stock-control', name: 'redis: stock-control', state: 'COMPLETED', startedAt: '2026-05-29T15:12:22.097Z', completedAt: '2026-05-29T15:12:31.120Z' },
        { id: 'CREATE_redis_users', name: 'redis: users', state: 'COMPLETED', startedAt: '2026-05-29T15:12:22.090Z', completedAt: '2026-05-29T15:12:45.989Z' },
      ],
    },

    // TS - Pruebas
    {
      id: 'TS',
      name: 'Pruebas',
      state: 'STARTED',
      startedAt: '2026-05-29T15:12:12.803Z',
      completedAt: '2026-05-29T15:12:58.023Z',
      subevents: [
        { id: 'TEST_api_mobile-bff', name: 'api: mobile-bff', state: 'IDLE', startedAt: '2026-05-29T15:12:12.803Z', completedAt: '2026-05-29T15:12:12.803Z' },
        { id: 'TEST_google_bucket_default', name: 'google_bucket: default', state: 'COMPLETED', startedAt: '2026-05-29T15:12:50.102Z', completedAt: '2026-05-29T15:12:54.905Z' },
        { id: 'TEST_kafka_default', name: 'kafka: default', state: 'COMPLETED', startedAt: '2026-05-29T15:12:50.103Z', completedAt: '2026-05-29T15:12:58.023Z' },
        { id: 'TEST_mongodb_default', name: 'mongodb: default', state: 'COMPLETED', startedAt: '2026-05-29T15:12:50.106Z', completedAt: '2026-05-29T15:12:55.591Z' },
        { id: 'TEST_redis_default', name: 'redis: default', state: 'COMPLETED', startedAt: '2026-05-29T15:12:50.107Z', completedAt: '2026-05-29T15:12:55.349Z' },
        { id: 'TEST_redis_schedule', name: 'redis: schedule', state: 'COMPLETED', startedAt: '2026-05-29T15:12:50.107Z', completedAt: '2026-05-29T15:12:53.535Z' },
        { id: 'TEST_redis_stock-control', name: 'redis: stock-control', state: 'COMPLETED', startedAt: '2026-05-29T15:12:50.108Z', completedAt: '2026-05-29T15:12:56.778Z' },
        { id: 'TEST_redis_users', name: 'redis: users', state: 'COMPLETED', startedAt: '2026-05-29T15:12:50.108Z', completedAt: '2026-05-29T15:12:54.328Z' },
      ],
    },

    // CD - Despliegue
    {
      id: 'CD',
      name: 'Despliegue',
      state: 'IDLE',
      startedAt: '2026-05-29T15:12:12.803Z',
      completedAt: '2026-05-29T15:12:12.803Z',
      subevents: [
        { id: 'DEPLOY_api_mobile-bff', name: 'api: mobile-bff', state: 'IDLE', startedAt: '2026-05-29T15:12:12.803Z', completedAt: '2026-05-29T15:12:12.803Z' },
      ],
    },
  ] as PipelineEvent[],
}

function SekiMonitorTestPage() {
  const data = mockPipelineData
  const isRunning = data.state === 'STARTED' || data.state === 'RUNNING'

  const metaParts: MetaPart[] = []

  if (data.commit?.author) {
    metaParts.push({
      id: 'author',
      node: <span className="font-medium text-foreground">{data.commit.author}</span>,
    })
  }

  const lastUpdated = DayJS(data.updatedAt).fromNow()
  if (lastUpdated) {
    metaParts.push({
      id: 'time',
      node: <span>{lastUpdated}</span>,
    })
  }

  if (data.commit?.message) {
    metaParts.push({
      id: 'commit',
      node: (
        <span className="inline-flex items-center gap-1 text-foreground">
          <GitCommit className="w-3.5 h-3.5" />
          {data.commit.message}
        </span>
      ),
    })
  }

  return (
    <PageLayout
      header={{ title: 'Seki Monitor (Mock)' }}
    >
      <div className="space-y-4">
        <PipelineCard
          viewMode="commits"
          displayRef={data.ref}
          refType={data.refType}
          isRunning={isRunning}
          metaParts={metaParts}
        >
          <div className="flex items-center gap-2">
            {data.events.length > 0 && (
              <SimpleTimeline events={data.events} />
            )}
          </div>
        </PipelineCard>
      </div>
    </PageLayout>
  )
}
