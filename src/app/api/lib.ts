import { type NextRequest, NextResponse } from 'next/server'

import { neon, neonConfig } from '@neondatabase/serverless'
import { timingSafeEqual } from 'node:crypto'

// Lazy so importing a route module never needs DATABASE_URL (e.g. during `next build`)
export const sql = () => {
  // Tests run against a local Postgres behind a Neon HTTP proxy (docker-compose.test.yml)
  if (process.env.NEON_LOCAL_PROXY) neonConfig.fetchEndpoint = process.env.NEON_LOCAL_PROXY
  return neon(String(process.env.DATABASE_URL))
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status })

// Constant-time compare that fails closed when the secret is not configured
// (otherwise "Bearer undefined" would be a valid admin token)
export const secretEquals = (given: string | null | undefined, secret: string | undefined): boolean => {
  if (!given || !secret) return false
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const isAdmin = (req: NextRequest): boolean =>
  !!process.env.ADMIN_TOKEN && secretEquals(req.headers.get('authorization'), `Bearer ${process.env.ADMIN_TOKEN}`)

type Params = Record<string, string>
type Handler = (req: NextRequest, params: Params) => Promise<NextResponse>

const wrap =
  (handler: Handler, requireAuth: boolean) =>
  async (req: NextRequest, ctx: { params: Promise<Params | undefined> }): Promise<NextResponse> => {
    if (requireAuth && !isAdmin(req)) {
      return json({ error: 'Unauthorized' }, 401)
    }
    try {
      return await handler(req, (await ctx.params) ?? {})
    } catch (e) {
      // Log the cause server-side only; DB errors would otherwise expose schema details
      console.error(e)
      return json({ error: 'Internal error' }, 500)
    }
  }

// Reads are public (score pages), mutations need the admin token
export const publicRoute = (handler: Handler) => wrap(handler, false)
export const adminRoute = (handler: Handler) => wrap(handler, true)
