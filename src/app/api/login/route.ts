import { json, publicRoute, secretEquals } from '../lib'

export const POST = publicRoute(async (req) => {
  const { password } = await req.json()
  if (typeof password === 'string' && secretEquals(password, process.env.ADMIN_PASSWORD)) {
    return json({ token: process.env.ADMIN_TOKEN })
  }
  return json({ error: 'Invalid password' }, 401)
})
