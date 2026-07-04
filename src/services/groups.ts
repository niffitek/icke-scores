import api from '@/lib/api'
import type { Group } from '@/types/tournament'

export const getGroups = async (): Promise<Group[]> => {
  const response = await api.get<Group[]>('/groups')
  return response.data
}

export const getGroupsByCupId = async (cupId: string): Promise<Group[]> => {
  const response = await api.get<Group[]>(`/groups?icke_cup_id=${cupId}`)
  return response.data
}

export const createGroup = async (group: Group): Promise<void> => {
  await api.post('/groups', group)
}
