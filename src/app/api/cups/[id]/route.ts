import { adminRoute, json, sql } from '../../lib'

const STATES = ['Bevorstehend', 'Vorrunde', 'Finalrunde', 'Abgeschlossen']
const ACTIVE_STATES = ['Vorrunde', 'Finalrunde']

export const PUT = adminRoute(async (req, { id }) => {
  const data = await req.json()
  if (!data.title || data.address == null || !STATES.includes(data.state)) {
    return json({ error: 'Missing required fields' }, 400)
  }
  const db = sql()
  // Only one cup may run at a time; getActiveCup relies on it
  if (ACTIVE_STATES.includes(data.state)) {
    const active = await db`SELECT id FROM icke_cups WHERE state = ANY(${ACTIVE_STATES}) AND id <> ${id}`
    if (active.length > 0) return json({ error: 'Another cup is already active' }, 409)
  }
  const rows = await db`UPDATE icke_cups SET title = ${data.title}, address = ${data.address}, state = ${data.state}
                        WHERE id = ${id} RETURNING id`
  if (rows.length === 0) return json({ error: 'Cup not found' }, 404)
  return json({ success: true })
})

export const DELETE = adminRoute(async (_req, { id }) => {
  // FK ON DELETE CASCADE removes groups, teams, group_teams, games, rounds
  await sql()`DELETE FROM icke_cups WHERE id = ${id}`
  return json({ success: true })
})
