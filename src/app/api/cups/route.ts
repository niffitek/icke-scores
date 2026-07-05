import { adminRoute, json, publicRoute, sql } from '../lib'

export const GET = publicRoute(async () => json(await sql()`SELECT * FROM icke_cups`))

export const POST = adminRoute(async (req) => {
  const data = await req.json()
  if (!data.id || !data.title) return json({ error: 'Missing required fields' }, 400)
  const db = sql()
  // Cup + its Vorrunde groups A-D, atomically (Finalrunde groups E-H come from the frontend later)
  await db.transaction([
    db`INSERT INTO icke_cups (id, created_at, title, address, state)
       VALUES (${data.id}, ${data.created_at}, ${data.title}, ${data.address}, 'Bevorstehend')`,
    ...['A', 'B', 'C', 'D'].map(
      (name) =>
        db`INSERT INTO "groups" (id, icke_cup_id, name)
           VALUES (${crypto.randomUUID()}, ${data.id}, ${name})`
    ),
  ])
  return json({ success: true }, 201)
})
