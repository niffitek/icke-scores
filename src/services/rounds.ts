import api from '@/lib/api'
import type { GameRound, Score } from '@/types/tournament'

export const getRoundsByGameId = async (gameId: string): Promise<GameRound[]> => {
  const response = await api.get<GameRound[]>(`?path=rounds&game_id=${gameId}`)
  return response.data
}

export const updateRound = async (round: { id: string; points_team_1: Score; points_team_2: Score }): Promise<void> => {
  await api.put('?path=rounds', round)
}
