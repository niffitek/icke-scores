import { adminRoute, json, publicRoute, sql } from '../lib'

export const GET = publicRoute(async (req) => {
  const cupId = req.nextUrl.searchParams.get('icke_cup_id')
  const db = sql()
  const rows = cupId ? await db`SELECT * FROM "groups" WHERE icke_cup_id = ${cupId}` : await db`SELECT * FROM "groups"`
  return json(rows)
})

export const POST = adminRoute(async (req) => {
  const data = await req.json()
  if (!data.id || !data.icke_cup_id || !data.name) return json({ error: 'Missing required fields' }, 400)
  await sql()`INSERT INTO "groups" (id, icke_cup_id, name)
              VALUES (${data.id}, ${data.icke_cup_id}, ${data.name})`
  return json({ success: true }, 201)
})
