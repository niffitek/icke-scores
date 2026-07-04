import { adminRoute, json, sql } from '../../lib'

export const PUT = adminRoute(async (req, { id }) => {
  const data = await req.json()
  if (!data.title || data.address == null || !data.state) {
    return json({ error: 'Missing required fields' }, 400)
  }
  await sql()`UPDATE icke_cups SET title = ${data.title}, address = ${data.address}, state = ${data.state}
              WHERE id = ${id}`
  return json({ success: true })
})

export const DELETE = adminRoute(async (_req, { id }) => {
  // FK ON DELETE CASCADE removes groups, teams, group_teams, games, rounds
  await sql()`DELETE FROM icke_cups WHERE id = ${id}`
  return json({ success: true })
})
