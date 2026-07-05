import type { AxiosError } from 'axios'

import { shouldRedirectToLogin } from '@/lib/api'

const error = (status: number | undefined, url: string): AxiosError =>
  ({ response: status ? { status } : undefined, config: { url } }) as AxiosError

describe('shouldRedirectToLogin', () => {
  it('redirects on 401 from a normal API call', () => {
    expect(shouldRedirectToLogin(error(401, '/teams'))).toBe(true)
  })

  it('does not redirect on a failed login attempt (wrong password must show its error)', () => {
    expect(shouldRedirectToLogin(error(401, '/login'))).toBe(false)
  })

  it('does not redirect on other errors', () => {
    expect(shouldRedirectToLogin(error(500, '/teams'))).toBe(false)
    expect(shouldRedirectToLogin(error(undefined, '/teams'))).toBe(false) // network error
  })
})
