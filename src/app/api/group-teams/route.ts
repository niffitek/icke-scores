import { adminRoute, json, publicRoute, sql } from '../lib'

export const GET = publicRoute(async () => json(await sql()`SELECT * FROM group_teams`))

export const POST = adminRoute(async (req) => {
  const data = await req.json()
  await sql()`INSERT INTO group_teams (group_id, team_id) VALUES (${data.group_id}, ${data.team_id})`
  return json({ success: true }, 201)
})

// Join table keyed by team: delete all memberships of one team
export const DELETE = adminRoute(async (req) => {
  const teamId = req.nextUrl.searchParams.get('team_id')
  if (!teamId) return json({ error: 'Missing team_id' }, 400)
  await sql()`DELETE FROM group_teams WHERE team_id = ${teamId}`
  return json({ success: true })
})
