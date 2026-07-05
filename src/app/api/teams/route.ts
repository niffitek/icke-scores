import { TEAMS_PER_CUP } from '@/configs/constants'

import { adminRoute, json, publicRoute, sql } from '../lib'

export const GET = publicRoute(async () => json(await sql()`SELECT * FROM teams`))

export const POST = adminRoute(async (req) => {
  const data = await req.json()
  if (!data.id || !data.name || !data.icke_cup_id) return json({ error: 'Missing required fields' }, 400)
  const db = sql()
  // ponytail: count check races with concurrent inserts; fine for a single admin
  const [{ count }] = await db`SELECT COUNT(*)::int AS count FROM teams WHERE icke_cup_id = ${data.icke_cup_id}`
  if (Number(count) >= TEAMS_PER_CUP) return json({ error: `Cup already has ${TEAMS_PER_CUP} teams` }, 409)
  await db`INSERT INTO teams (id, name, contact, place, final_place, icke_cup_id)
           VALUES (${data.id}, ${data.name}, ${data.contact}, ${data.place ?? null},
                   ${data.final_place ?? null}, ${data.icke_cup_id})`
  return json({ success: true }, 201)
})
