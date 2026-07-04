import { adminRoute, json, sql } from '../../lib'

export const PUT = adminRoute(async (req, { id }) => {
  const data = await req.json()
  const points1 = Number(data.points_team_1)
  const points2 = Number(data.points_team_2)
  if (!Number.isFinite(points1) || !Number.isFinite(points2)) {
    return json({ error: 'Missing required fields' }, 400)
  }
  await sql()`UPDATE rounds SET points_team_1 = ${points1}, points_team_2 = ${points2}
              WHERE id = ${id}`
  return json({ success: true })
})
