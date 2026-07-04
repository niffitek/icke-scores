import { type NextRequest, NextResponse } from 'next/server'

import { neon } from '@neondatabase/serverless'

// Lazy so importing a route module never needs DATABASE_URL (e.g. during `next build`)
export const sql = () => neon(String(process.env.DATABASE_URL))

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status })

type Params = Record<string, string>
type Handler = (req: NextRequest, params: Params) => Promise<NextResponse>

const wrap =
  (handler: Handler, requireAuth: boolean) =>
  async (req: NextRequest, ctx: { params: Promise<Params | undefined> }): Promise<NextResponse> => {
    if (requireAuth && req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return json({ error: 'Unauthorized' }, 401)
    }
    try {
      return await handler(req, (await ctx.params) ?? {})
    } catch (e) {
      console.error(e)
      return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500)
    }
  }

// Reads are public (score pages), mutations need the admin token
export const publicRoute = (handler: Handler) => wrap(handler, false)
export const adminRoute = (handler: Handler) => wrap(handler, true)
