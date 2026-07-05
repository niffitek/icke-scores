import { adminRoute, json, sql } from '../../lib'

export const PUT = adminRoute(async (req, { id }) => {
  const data = await req.json()
  const points1 = Number(data.points_team_1)
  const points2 = Number(data.points_team_2)
  if (!Number.isFinite(points1) || !Number.isFinite(points2) || points1 < 0 || points2 < 0) {
    return json({ error: 'Points must be non-negative numbers' }, 400)
  }
  const rows = await sql()`UPDATE rounds SET points_team_1 = ${points1}, points_team_2 = ${points2}
                           WHERE id = ${id} RETURNING id`
  // A typo'd id must not silently swallow a score
  if (rows.length === 0) return json({ error: 'Round not found' }, 404)
  return json({ success: true })
})
