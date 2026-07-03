import api from '@/lib/api'
import type { Game } from '@/types/tournament'

export const getGames = async (): Promise<Game[]> => {
  const response = await api.get<Game[]>('?path=games')
  return response.data
}

export const getGamesByCupId = async (cupId: string): Promise<Game[]> => {
  const games = await getGames()
  return games.filter((game) => game.icke_cup_id === cupId)
}

export const createGame = async (game: Game): Promise<void> => {
  await api.post('?path=games', game)
}

export const createGames = async (games: Game[]): Promise<void> => {
  await Promise.all(games.map((game) => createGame(game)))
}
