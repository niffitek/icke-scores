'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { createCup, deleteCup, getCups } from '@/services/cups'
import type { Cup } from '@/types/tournament'

const AdminPage = () => {
  const [loading, setLoading] = useState(true)
  const [cups, setCups] = useState<Cup[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newCup, setNewCup] = useState({ title: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useAdminAuth()

  useEffect(() => {
    // Only for SSR hydration flicker prevention
    setLoading(false)
    getCups().then(setCups)
  }, [])

  const handleCreateCup = async () => {
    setSaving(true)
    setError('')
    try {
      await createCup({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        ...newCup,
        state: 'Bevorstehend',
      })
      setShowCreate(false)
      setNewCup({ title: '', address: '' })
      getCups().then(setCups)
    } catch {
      setError('Fehler beim Anlegen des Cups')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCup = async (cupId: string) => {
    if (!window.confirm('Willst du diesen Cup wirklich löschen? Alle zugehörigen Daten werden entfernt!')) return
    setSaving(true)
    setError('')
    try {
      await deleteCup(cupId)
      getCups().then(setCups)
    } catch {
      setError('Fehler beim Löschen des Cups')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="flex flex-col items-center justify-center bg-white rounded-md p-4 gap-4">
      <div className="flex flex-row justify-between w-full items-center">
        <h1 className="text-xl font-bold">Alle Cups</h1>
        <Button className="self-end mb-2" onClick={() => setShowCreate(true)}>
          Neuen Cup anlegen
        </Button>
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Cup anlegen</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Titel"
              value={newCup.title}
              onChange={(e) => setNewCup({ ...newCup, title: e.target.value })}
            />
            <Input
              placeholder="Adresse"
              value={newCup.address}
              onChange={(e) => setNewCup({ ...newCup, address: e.target.value })}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleCreateCup} disabled={saving || !newCup.title || !newCup.address}>
              {saving ? 'Anlegen...' : 'Anlegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cups.map((cup) => (
            <TableRow key={cup.id}>
              <TableCell>{cup.title}</TableCell>
              <TableCell>{cup.address}</TableCell>
              <TableCell>{cup.state}</TableCell>
              <TableCell className="text-right">
                <Link href={`/admin/cup/${cup.id}`}>
                  <Button variant="outline" size="icon" className="p-2 mr-2">
                    <Pencil />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="icon"
                  className="p-2"
                  onClick={() => handleDeleteCup(cup.id)}
                  disabled={saving}
                  aria-label="Löschen"
                >
                  <Trash2 className="text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default AdminPage
