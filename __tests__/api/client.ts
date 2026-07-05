import { NextRequest } from 'next/server'

// Calls a route handler exactly as Next would, auth included by default
type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string> | undefined> }) => Promise<Response>

type CallOptions = {
  method?: string
  search?: string
  body?: unknown
  params?: Record<string, string>
  auth?: boolean
}

export type ApiResponse = { status: number; body: any }

export const call = async (handler: Handler, options: CallOptions = {}): Promise<ApiResponse> => {
  const { method = 'GET', search = '', body, params = {}, auth = true } = options
  const req = new NextRequest(`http://test/api${search}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: auth ? { authorization: `Bearer ${process.env.ADMIN_TOKEN}` } : {},
  })
  const res = await handler(req, { params: Promise.resolve(params) })
  return { status: res.status, body: await res.json() }
}

export const expectOk = async (promise: Promise<ApiResponse>): Promise<any> => {
  const res = await promise
  if (res.status >= 400) throw new Error(`Expected success, got ${res.status}: ${JSON.stringify(res.body)}`)
  return res.body
}
