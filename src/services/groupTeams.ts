import api from '@/lib/api'
import type { GroupTeam } from '@/types/tournament'

export const getGroupTeams = async (): Promise<GroupTeam[]> => {
  const response = await api.get<GroupTeam[]>('/group-teams')
  return response.data
}

export const createGroupTeam = async (groupTeam: GroupTeam): Promise<void> => {
  await api.post('/group-teams', groupTeam)
}

// Scoped to one group so reassigning during the Finalrunde keeps the Vorrunde membership
export const deleteGroupTeam = async (teamId: string, groupId: string): Promise<void> => {
  await api.delete(`/group-teams?team_id=${teamId}&group_id=${groupId}`)
}
