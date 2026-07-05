import { FINALRUNDE_GROUPS, VORRUNDE_GROUPS } from '@/configs/constants'

import { adminRoute, json, publicRoute, sql } from '../lib'

export const GET = publicRoute(async () => json(await sql()`SELECT * FROM group_teams`))

export const POST = adminRoute(async (req) => {
  const data = await req.json()
  if (!data.group_id || !data.team_id) return json({ error: 'Missing required fields' }, 400)
  const db = sql()
  const targets = await db`SELECT icke_cup_id, name FROM "groups" WHERE id = ${data.group_id}`
  if (targets.length === 0) return json({ error: 'Group not found' }, 404)
  const target = targets[0]
  // A team plays in exactly one group per phase (one of A-D, later one of E-H)
  const phase = VORRUNDE_GROUPS.includes(target.name) ? VORRUNDE_GROUPS : FINALRUNDE_GROUPS
  const existing = await db`
    SELECT 1 FROM group_teams gt JOIN "groups" g ON g.id = gt.group_id
    WHERE gt.team_id = ${data.team_id} AND g.icke_cup_id = ${target.icke_cup_id} AND g.name = ANY(${phase})`
  if (existing.length > 0) return json({ error: 'Team is already in a group of this phase' }, 409)
  await db`INSERT INTO group_teams (group_id, team_id) VALUES (${data.group_id}, ${data.team_id})`
  return json({ success: true }, 201)
})

// Join table keyed by team: delete one membership (group_id given) or all of them
export const DELETE = adminRoute(async (req) => {
  const teamId = req.nextUrl.searchParams.get('team_id')
  const groupId = req.nextUrl.searchParams.get('group_id')
  if (!teamId) return json({ error: 'Missing team_id' }, 400)
  const db = sql()
  if (groupId) {
    await db`DELETE FROM group_teams WHERE team_id = ${teamId} AND group_id = ${groupId}`
  } else {
    await db`DELETE FROM group_teams WHERE team_id = ${teamId}`
  }
  return json({ success: true })
})
