import { adminRoute, json, sql } from '../../lib'

export const PUT = adminRoute(async (req, { id }) => {
  const data = await req.json()
  if (!data.name || data.contact == null) {
    return json({ error: 'Missing required fields' }, 400)
  }
  const db = sql()
  // place/final_place only change when sent; they cannot be cleared via PUT
  const rows = await db`UPDATE teams SET name = ${data.name}, contact = ${data.contact},
                 place = COALESCE(${data.place ?? null}, place),
                 final_place = COALESCE(${data.final_place ?? null}, final_place)
                 WHERE id = ${id} RETURNING id`
  if (rows.length === 0) return json({ error: 'Team not found' }, 404)
  return json({ success: true })
})

export const DELETE = adminRoute(async (_req, { id }) => {
  const db = sql()
  // Deleting a team that already played would corrupt every ranking referencing it
  const games = await db`SELECT 1 FROM games WHERE team_1_id = ${id} OR team_2_id = ${id} LIMIT 1`
  if (games.length > 0) return json({ error: 'Team has games and cannot be deleted' }, 409)
  await db`DELETE FROM teams WHERE id = ${id}`
  return json({ success: true })
})
