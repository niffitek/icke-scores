import { adminRoute, json, publicRoute, sql } from '../lib'

export const GET = publicRoute(async () => json(await sql()`SELECT * FROM teams`))

export const POST = adminRoute(async (req) => {
  const data = await req.json()
  await sql()`INSERT INTO teams (id, name, contact, final_place, icke_cup_id)
              VALUES (${data.id}, ${data.name}, ${data.contact}, ${data.final_place ?? null},
                      ${data.icke_cup_id})`
  return json({ success: true }, 201)
})
