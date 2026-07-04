import { adminRoute, json, sql } from '../../lib'

export const PUT = adminRoute(async (req, { id }) => {
  const data = await req.json()
  if (!data.name || data.contact == null) {
    return json({ error: 'Missing required fields' }, 400)
  }
  const db = sql()
  if (data.final_place != null) {
    await db`UPDATE teams SET name = ${data.name}, contact = ${data.contact},
             final_place = ${data.final_place} WHERE id = ${id}`
  } else {
    await db`UPDATE teams SET name = ${data.name}, contact = ${data.contact} WHERE id = ${id}`
  }
  return json({ success: true })
})

export const DELETE = adminRoute(async (_req, { id }) => {
  await sql()`DELETE FROM teams WHERE id = ${id}`
  return json({ success: true })
})
