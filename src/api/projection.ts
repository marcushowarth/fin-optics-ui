import axios from 'axios'
import type { ProjectionRequest, ProjectionResponse } from '../types'

const client = axios.create({ baseURL: '/api' })

export function fetchProjection(request: ProjectionRequest): Promise<ProjectionResponse> {
  return client.post<ProjectionResponse>('/projection', request).then(r => r.data)
}
