import axios, { type AxiosError, isAxiosError } from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api',
})

// The API answers failures with { error }; show that cause instead of a bare
// "Fehler beim …" so the admin can tell a duplicate from a broken database
export const errorMessage = (error: unknown, context: string): string => {
  // data is undefined for empty bodies, whatever axios' types claim
  const detail = isAxiosError<{ error?: string } | undefined>(error)
    ? (error.response?.data?.error ?? error.message)
    : error instanceof Error
      ? error.message
      : ''
  return detail ? `${context}: ${detail}` : context
}

// A 401 from the login attempt itself must not reload the page, or the
// "wrong password" error would be wiped before the user can read it
export const shouldRedirectToLogin = (error: AxiosError): boolean =>
  error.response?.status === 401 && !error.config?.url?.includes('/login')

// Interceptors only run in the browser: the admin token lives in localStorage
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      console.error(error)
      if (shouldRedirectToLogin(error)) {
        window.location.href = '/admin/login'
      }
      return Promise.reject(error)
    }
  )
}

export default api
