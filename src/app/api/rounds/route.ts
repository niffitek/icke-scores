import { json, publicRoute, sql } from '../lib'

export const GET = publicRoute(async (req) => {
  const gameId = req.nextUrl.searchParams.get('game_id')
  const db = sql()
  const rows = gameId
    ? await db`SELECT * FROM rounds WHERE game_id = ${gameId} ORDER BY round_number`
    : await db`SELECT * FROM rounds ORDER BY game_id, round_number`
  return json(rows)
})
