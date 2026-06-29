export interface Label {
  es: string
  en: string
  br: string
}

export interface SubEvent {
  id: string
  label: string
  state: string
  created_at: string
  updated_at: string
  markdown: string
}

export interface Event {
  id: string
  label: Label
  state: string
  created_at: string
  updated_at: string
  markdown: string
  subevents: SubEvent[]
}

export interface GitInfo {
  organization: string
  product: string
  commit: string
  commit_message: string
  commit_author: string
  stage: string
  event: string
  ref: string
}

export interface PipelineStatusResponse {
  state: string
  created_at: string
  updated_at: string
  events: Event[]
  git: GitInfo
}

/**
 * Response from /products/:org/:repo/pipelines/latest-by-environment
 * Contains the latest pipeline for staging and production environments.
 */
export interface PipelinesByEnvResponse {
  staging: PipelineStatusResponse | null
  production: PipelineStatusResponse | null
}
