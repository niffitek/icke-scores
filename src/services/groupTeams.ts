import api from '@/lib/api'
import type { GroupTeam } from '@/types/tournament'

export const getGroupTeams = async (): Promise<GroupTeam[]> => {
  const response = await api.get<GroupTeam[]>('?path=group_teams')
  return response.data
}

export const createGroupTeam = async (groupTeam: GroupTeam): Promise<void> => {
  await api.post('?path=group_teams', groupTeam)
}

export const deleteGroupTeamsByTeamId = async (teamId: string): Promise<void> => {
  await api.delete(`?path=group_teams&team_id=${teamId}`)
}
