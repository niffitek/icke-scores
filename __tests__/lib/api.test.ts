import { AxiosError, type AxiosResponse } from 'axios'

import { errorMessage, shouldRedirectToLogin } from '@/lib/api'

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

describe('errorMessage', () => {
  const apiError = (data: unknown, message = 'Request failed with status code 500'): AxiosError =>
    new AxiosError(message, 'ERR_BAD_RESPONSE', undefined, undefined, { status: 500, data } as AxiosResponse)

  it("shows the API's own error text", () => {
    expect(errorMessage(apiError({ error: 'column "place" does not exist' }), 'Fehler beim Anlegen des Teams')).toBe(
      'Fehler beim Anlegen des Teams: column "place" does not exist'
    )
  })

  it('falls back to the axios message when the body has no error (e.g. network error)', () => {
    expect(errorMessage(apiError(undefined, 'Network Error'), 'Fehler')).toBe('Fehler: Network Error')
  })

  it('handles plain errors and unknown values', () => {
    expect(errorMessage(new Error('boom'), 'Fehler')).toBe('Fehler: boom')
    expect(errorMessage('weird', 'Fehler')).toBe('Fehler')
  })
})
