import api from '@/lib/api'
import type { Team } from '@/types/tournament'

export const getTeams = async (): Promise<Team[]> => {
  const response = await api.get<Team[]>('?path=teams')
  return response.data
}

export const getTeamsByCupId = async (cupId: string): Promise<Team[]> => {
  const teams = await getTeams()
  return teams.filter((team) => team.icke_cup_id === cupId)
}

export const createTeam = async (team: Team): Promise<void> => {
  await api.post('?path=teams', team)
}

export const updateTeam = async (team: Partial<Team> & { id: string }): Promise<void> => {
  await api.put('?path=teams', team)
}

export const deleteTeam = async (id: string): Promise<void> => {
  await api.delete(`?path=teams&id=${id}`)
}
