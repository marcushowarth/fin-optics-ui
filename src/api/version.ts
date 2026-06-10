import axios from 'axios'

export interface VersionInfo {
  version: string
  gitSha: string
  builtAt: string
}

const client = axios.create({ baseURL: '/api' })

export function fetchVersion(): Promise<VersionInfo> {
  return client.get<VersionInfo>('/version').then(r => r.data)
}
