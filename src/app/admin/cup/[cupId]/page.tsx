'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FINALRUNDE_GROUPS, STATE_OPTIONS, TEAMS_PER_CUP, VORRUNDE_GROUPS } from '@/configs/constants'
import { FINALRUNDE_SCHEDULE, VORRUNDE_SCHEDULE } from '@/configs/schedules'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { toLocalDateTimeString } from '@/lib/game-helpers'
import { getCup, updateCup } from '@/services/cups'
import { createGames, getGamesByCupId } from '@/services/games'
import { createGroup, getGroupsByCupId } from '@/services/groups'
import { createGroupTeam, getGroupTeams } from '@/services/groupTeams'
import { getTeamsByCupId, updateTeam } from '@/services/teams'
import {
  buildScheduleGames,
  computeFinalPlaces,
  groupTeamsByGroupName,
  hasDistinctPositions,
  seedFinalGroups,
} from '@/services/tournament'
import type { Cup, GroupTeam, Team } from '@/types/tournament'

import AuswertungTabContent from './AuswertungTabContent'
import RoundGamesTab from './RoundGamesTab'
import TeamsTabContent from './TeamsTabContent'

const CupDetails = () => {
  useAdminAuth()
  const { cupId } = useParams<{ cupId: string }>()
  const router = useRouter()
  const [cup, setCup] = useState<Cup | null>(null)
  const [editing, setEditing] = useState(false)
  const [editCup, setEditCup] = useState<Cup | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState('teams')
  const [teams, setTeams] = useState<Team[]>([])
  const [showStartTimeDialog, setShowStartTimeDialog] = useState(false)
  const [startDate, setStartDate] = useState(() => toLocalDateTimeString(new Date()).slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [savingGames, setSavingGames] = useState(false)
  const [gameError, setGameError] = useState('')
  const [gameSuccess, setGameSuccess] = useState('')
  const [showFinalrundeDialog, setShowFinalrundeDialog] = useState(false)
  const [finalrundeStartDate, setFinalrundeStartDate] = useState('')
  const [finalrundeStartTime, setFinalrundeStartTime] = useState('13:30')
  const [showCloseTournamentDialog, setShowCloseTournamentDialog] = useState(false)
  // Earliest Vorrunde game date: locks team positions and defaults the Finalrunde date
  const [vorrundeDate, setVorrundeDate] = useState('')

  useEffect(() => {
    getGamesByCupId(cupId).then((games) => {
      const dates = games.filter((game) => game.round === 'Vorrunde').map((game) => game.start_at.slice(0, 10))
      setVorrundeDate(dates.sort()[0] ?? '')
    })
  }, [cupId, cup?.state])

  const refreshTeams = useCallback(async () => {
    try {
      setTeams(await getTeamsByCupId(cupId))
    } catch (err) {
      console.error('Error refreshing teams:', err)
    }
  }, [cupId])

  const refreshCup = useCallback(async () => {
    setCup((await getCup(cupId)) ?? null)
  }, [cupId])

  useEffect(() => {
    refreshCup()
    refreshTeams()
  }, [refreshCup, refreshTeams])

  useEffect(() => {
    if (cup) setEditCup({ ...cup })
  }, [cup])

  const handleEdit = () => {
    setEditing(true)
    setError('')
    setSuccess('')
  }

  const handleCancel = () => {
    setEditCup(cup ? { ...cup } : null)
    setEditing(false)
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!editCup) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateCup(editCup.id, {
        title: editCup.title,
        address: editCup.address,
        state: editCup.state,
      })
      setSuccess('Erfolgreich gespeichert!')
      setEditing(false)
      refreshCup()
    } catch {
      setError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateGames = async () => {
    if (!cup) return
    setSavingGames(true)
    setGameError('')
    setGameSuccess('')
    try {
      // Validate against fresh data — group assignments may have changed since mount
      const [freshTeams, freshGroups, freshGroupTeams, existingGames] = await Promise.all([
        getTeamsByCupId(cupId),
        getGroupsByCupId(cupId),
        getGroupTeams(),
        getGamesByCupId(cupId),
      ])
      setTeams(freshTeams)
      if (existingGames.some((game) => game.round === 'Vorrunde')) {
        setGameError('Vorrunden-Spiele existieren bereits.')
        return
      }
      const grouped = groupTeamsByGroupName(freshTeams, freshGroups, freshGroupTeams, VORRUNDE_GROUPS)
      if (VORRUNDE_GROUPS.some((name) => grouped[name]?.length !== 4)) {
        setGameError('Jede Gruppe braucht genau 4 Teams, bevor der Spielplan erstellt werden kann.')
        return
      }
      if (VORRUNDE_GROUPS.some((name) => !hasDistinctPositions(grouped[name] ?? []))) {
        setGameError('Jedes Team braucht eine eindeutige Position 1-4 innerhalb seiner Gruppe.')
        return
      }
      const games = buildScheduleGames(
        VORRUNDE_SCHEDULE,
        'Vorrunde',
        cupId,
        startDate,
        startTime,
        (group, position) => grouped[group]?.at(position - 1)?.id
      )
      await createGames(games)
      await updateCup(cup.id, { ...cup, state: 'Vorrunde' })
      setGameSuccess('Spiele erfolgreich erstellt und Status aktualisiert!')
      setShowStartTimeDialog(false)
      refreshCup()
    } catch {
      setGameError('Fehler beim Erstellen der Spiele oder Aktualisieren des Status.')
    } finally {
      setSavingGames(false)
    }
  }

  const handleCreateFinalrunde = async () => {
    if (!cup) return
    setSavingGames(true)
    setGameError('')
    setGameSuccess('')
    try {
      const [allGames, allTeams, cupGroups, allGroupTeams] = await Promise.all([
        getGamesByCupId(cupId),
        getTeamsByCupId(cupId),
        getGroupsByCupId(cupId),
        getGroupTeams(),
      ])
      if (
        allGames.some((game) => game.round === 'Finalrunde') ||
        cupGroups.some((g) => FINALRUNDE_GROUPS.includes(g.name))
      ) {
        setGameError('Die Finalrunde existiert bereits.')
        return
      }
      const vorrundeGames = allGames.filter((game) => game.round === 'Vorrunde')

      const { newGroups, assignments } = seedFinalGroups(cupId, allTeams, vorrundeGames, cupGroups, allGroupTeams)
      await Promise.all(newGroups.map((group) => createGroup(group)))
      await Promise.all(assignments.map((assignment) => createGroupTeam(assignment)))

      const assignmentsByGroupName: Partial<Record<string, GroupTeam[]>> = Object.fromEntries(
        newGroups.map((group) => [group.name, assignments.filter((gt) => gt.group_id === group.id)])
      )
      const finalGames = buildScheduleGames(
        FINALRUNDE_SCHEDULE,
        'Finalrunde',
        cupId,
        finalrundeStartDate || vorrundeDate || toLocalDateTimeString(new Date()).slice(0, 10),
        finalrundeStartTime,
        (group, position) => assignmentsByGroupName[group]?.at(position - 1)?.team_id
      )
      await createGames(finalGames)

      await updateCup(cup.id, { ...cup, state: 'Finalrunde' })
      setGameSuccess('Finalrunde erfolgreich erstellt!')
      setShowFinalrundeDialog(false)
      refreshCup()
    } catch (err) {
      setGameError('Fehler beim Erstellen der Finalrunde.')
      console.error(err)
    } finally {
      setSavingGames(false)
    }
  }

  const handleEvaluateFinalrunde = async () => {
    if (!cup) return
    setSavingGames(true)
    setGameError('')
    setGameSuccess('')
    try {
      const [allGames, allTeams, cupGroups, allGroupTeams] = await Promise.all([
        getGamesByCupId(cupId),
        getTeamsByCupId(cupId),
        getGroupsByCupId(cupId),
        getGroupTeams(),
      ])
      const finalrundeGames = allGames.filter((game) => game.round === 'Finalrunde')

      const finalPlaces = computeFinalPlaces(allTeams, finalrundeGames, cupGroups, allGroupTeams)
      await Promise.all(
        finalPlaces.map(({ id, final_place }) => {
          const dbTeam = allTeams.find((team) => team.id === id)
          return updateTeam({ id, name: dbTeam?.name ?? '', contact: dbTeam?.contact ?? '', final_place })
        })
      )
      await updateCup(cup.id, { ...cup, state: 'Abgeschlossen' })
      setGameSuccess('Turnier abgeschlossen und Platzierungen gespeichert!')
      refreshCup()
      refreshTeams() // Auswertung tab needs the freshly written final_place values
      setShowCloseTournamentDialog(false)
    } catch (err) {
      setGameError('Fehler bei der Auswertung der Finalrunde.')
      console.error(err)
    } finally {
      setSavingGames(false)
    }
  }

  if (!cup || !editCup) return <div>Lade Cup...</div>

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-md p-4 mt-4">
      <div className="flex flex-row justify-between items-center mb-4">
        <div className="flex flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="p-2"
            onClick={() => router.push('/admin')}
            aria-label="Zurück zur Übersicht"
          >
            <ArrowLeft />
          </Button>
          <h1 className="text-xl font-bold">Cup Details</h1>
        </div>
        <div className="flex flex-row items-center gap-2">
          {cup.state === 'Bevorstehend' && (
            <Dialog open={showStartTimeDialog} onOpenChange={setShowStartTimeDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={teams.length !== TEAMS_PER_CUP}
                  title={teams.length !== TEAMS_PER_CUP ? `Es müssen genau ${TEAMS_PER_CUP} Teams angelegt sein.` : ''}
                  onClick={() => setShowStartTimeDialog(true)}
                >
                  Zur Vorrunde fortfahren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Startzeit der Vorrunde festlegen</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-2">
                  <label className="font-medium">
                    Datum
                    <input
                      type="date"
                      className="border rounded px-2 py-1 mt-1"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>
                  <label className="font-medium">
                    Startzeit
                    <input
                      type="time"
                      className="border rounded px-2 py-1 mt-1"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowStartTimeDialog(false)} disabled={savingGames}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreateGames} disabled={savingGames}>
                    {savingGames ? 'Speichern...' : 'Bestätigen'}
                  </Button>
                </DialogFooter>
                {gameError && <p className="text-red-500 text-sm mt-2">{gameError}</p>}
                {gameSuccess && <p className="text-green-600 text-sm mt-2">{gameSuccess}</p>}
              </DialogContent>
            </Dialog>
          )}
          {cup.state === 'Vorrunde' && (
            <Dialog open={showFinalrundeDialog} onOpenChange={setShowFinalrundeDialog}>
              <DialogTrigger asChild>
                <Button variant="default" onClick={() => setShowFinalrundeDialog(true)}>
                  Zur Finalrunde fortfahren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Finalrunde starten</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-2">
                  <p>Bitte bestätigen Sie, dass alle Vorrundenspiele korrekt ausgefüllt sind.</p>
                  <label className="font-medium">
                    Datum der Finalrunde
                    <input
                      type="date"
                      className="border rounded px-2 py-1 mt-1"
                      value={finalrundeStartDate || vorrundeDate}
                      onChange={(e) => setFinalrundeStartDate(e.target.value)}
                    />
                  </label>
                  <label className="font-medium">
                    Startzeit der Finalrunde
                    <input
                      type="time"
                      className="border rounded px-2 py-1 mt-1"
                      value={finalrundeStartTime}
                      onChange={(e) => setFinalrundeStartTime(e.target.value)}
                    />
                  </label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowFinalrundeDialog(false)} disabled={savingGames}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreateFinalrunde} disabled={savingGames}>
                    {savingGames ? 'Erstellen...' : 'Bestätigen'}
                  </Button>
                </DialogFooter>
                {gameError && <p className="text-red-500 text-sm mt-2">{gameError}</p>}
                {gameSuccess && <p className="text-green-600 text-sm mt-2">{gameSuccess}</p>}
              </DialogContent>
            </Dialog>
          )}
          {cup.state === 'Finalrunde' && (
            <Dialog open={showCloseTournamentDialog} onOpenChange={setShowCloseTournamentDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" onClick={() => setShowCloseTournamentDialog(true)}>
                  Turnier abschließen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Turnier abschließen</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  Sind Sie sicher, dass Sie zur Auswertung fortfahren möchten? Diese Aktion kann nicht rückgängig
                  gemacht werden.
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCloseTournamentDialog(false)}>
                    Abbrechen
                  </Button>
                  <Button variant="destructive" onClick={handleEvaluateFinalrunde}>
                    Zur Auswertung
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {!editing && <Button onClick={handleEdit}>Bearbeiten</Button>}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 mb-4">
          <label className="font-medium">
            Titel
            <Input value={editCup.title} onChange={(e) => setEditCup({ ...editCup, title: e.target.value })} />
          </label>
          <label className="font-medium">
            Adresse
            <Input value={editCup.address} onChange={(e) => setEditCup({ ...editCup, address: e.target.value })} />
          </label>
          <label className="font-medium">
            Status
            <Select
              value={editCup.state}
              onValueChange={(value) =>
                setEditCup({ ...editCup, state: STATE_OPTIONS.find((s) => s === value) ?? editCup.state })
              }
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Status wählen..." />
              </SelectTrigger>
              <SelectContent>
                {STATE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex gap-2 mt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Abbrechen
            </Button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
        </div>
      ) : (
        <div className="mb-4">
          <p>
            <span className="font-medium">Titel:</span> {cup.title}
          </p>
          <p>
            <span className="font-medium">Adresse:</span> {cup.address}
          </p>
          <p>
            <span className="font-medium">Status:</span> {cup.state}
          </p>
        </div>
      )}
      <Tabs value={tab} className="mb-6" onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="vorrunde">Vorrunde</TabsTrigger>
          <TabsTrigger value="finalrunde">Finalrunde</TabsTrigger>
          <TabsTrigger value="auswertung">Auswertung</TabsTrigger>
        </TabsList>
        <TabsContent value="teams">
          <TeamsTabContent cupId={cupId} cup={cup} locked={vorrundeDate !== ''} onTeamsChange={refreshTeams} />
        </TabsContent>
        <TabsContent value="vorrunde">
          <RoundGamesTab cupId={cupId} round="Vorrunde" cupState={cup.state} />
        </TabsContent>
        <TabsContent value="finalrunde">
          <RoundGamesTab cupId={cupId} round="Finalrunde" cupState={cup.state} />
        </TabsContent>
        <TabsContent value="auswertung">
          <AuswertungTabContent cupId={cupId} teams={teams} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CupDetails
