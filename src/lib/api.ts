import axios, { type AxiosError } from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

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
