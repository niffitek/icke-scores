import api from '@/lib/api'
import type { Group } from '@/types/tournament'

export const getGroups = async (): Promise<Group[]> => {
  const response = await api.get<Group[]>('?path=groups')
  return response.data
}

export const getGroupsByCupId = async (cupId: string): Promise<Group[]> => {
  const response = await api.get<Group[]>(`?path=groups&icke_cup_id=${cupId}`)
  return response.data
}

export const createGroup = async (group: Group): Promise<void> => {
  await api.post('?path=groups', group)
}
