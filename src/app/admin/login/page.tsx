'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/api'

const AdminLogin = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setError('')
    try {
      const res = await api.post<{ token?: string }>('/login', { password })
      if (res.data.token) {
        localStorage.setItem('adminToken', res.data.token)
        router.replace('/admin')
      } else {
        setError('Unbekannter Fehler beim Login.')
      }
    } catch {
      setError("Falsches Passwort! Probier's nochmal!")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-[50vh]">
      <div className="flex flex-col items-center justify-center w-1/3 bg-white rounded-md p-4 gap-4">
        <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
        <Input
          type="password"
          placeholder="Admin Passwort..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button onClick={handleLogin}>Login</Button>
        {error && <p>{error}</p>}
      </div>
    </div>
  )
}

export default AdminLogin
