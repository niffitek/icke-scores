'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  COURT_IS_SITTING,
  FINALRUNDE_GROUPS,
  MINUTES_PER_ROUND,
  STATE_OPTIONS,
  TEAMS_PER_CUP,
  VORRUNDE_GROUPS,
} from '@/configs/constants'
import { FINALRUNDE_SCHEDULE, VORRUNDE_SCHEDULE } from '@/configs/schedules'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { toLocalDateTimeString } from '@/lib/game-helpers'
import { getCup, updateCup } from '@/services/cups'
import { createGames, getGamesByCupId } from '@/services/games'
import { createGroup, getGroups, getGroupsByCupId } from '@/services/groups'
import { createGroupTeam, getGroupTeams } from '@/services/groupTeams'
import { buildTeamStats, fillAllTeamStats, sortTeamStatsByGroup } from '@/services/ranking'
import { getTeamsByCupId, updateTeam } from '@/services/teams'
import type { Cup, Game, Group, GroupTeam, RoundName, Team } from '@/types/tournament'

import AuswertungTabContent from './AuswertungTabContent'
import RoundGamesTab from './RoundGamesTab'
import TeamsTabContent from './TeamsTabContent'

// Build the games of one round from a schedule ("A1-A4" = group A team 1 vs team 4)
const buildScheduleGames = (
  schedule: string[][],
  round: RoundName,
  cupId: string,
  startTime: string,
  getTeamId: (group: string, position: number) => string | undefined
): Game[] => {
  const start = new Date()
  const [hours, minutes] = startTime.split(':')
  start.setHours(Number(hours), Number(minutes), 0, 0)

  return schedule.flatMap((matches, roundIndex) => {
    const roundTime = new Date(start.getTime() + roundIndex * MINUTES_PER_ROUND * 60_000)
    return matches.flatMap((match, court) => {
      const [left, right] = match.split('-')
      const team1Id = getTeamId(left[0], Number(left[1]))
      const team2Id = getTeamId(right[0], Number(right[1]))
      if (!team1Id || !team2Id) return []
      return [
        {
          id: crypto.randomUUID(),
          team_1_id: team1Id,
          team_2_id: team2Id,
          ref_team_id: null,
          points_team_1: 0,
          points_team_2: 0,
          start_at: toLocalDateTimeString(roundTime),
          icke_cup_id: cupId,
          round,
          sitting: COURT_IS_SITTING[court] ? 1 : 0,
          court: court + 1,
        },
      ]
    })
  })
}

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
  const [startTime, setStartTime] = useState('09:00')
  const [savingGames, setSavingGames] = useState(false)
  const [gameError, setGameError] = useState('')
  const [gameSuccess, setGameSuccess] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [groupTeams, setGroupTeams] = useState<GroupTeam[]>([])

  const [showFinalrundeDialog, setShowFinalrundeDialog] = useState(false)
  const [finalrundeStartTime, setFinalrundeStartTime] = useState('13:30')
  const [showCloseTournamentDialog, setShowCloseTournamentDialog] = useState(false)

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
    getGroups().then(setGroups)
    getGroupTeams().then(setGroupTeams)
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

  // Group teams by Vorrunde group name, sorted by name for consistent numbering
  const getGroupedTeams = (): Partial<Record<string, Team[]>> => {
    const grouped: Partial<Record<string, Team[]>> = Object.fromEntries(VORRUNDE_GROUPS.map((name) => [name, []]))
    teams.forEach((team) => {
      const groupTeam = groupTeams.find((gt) => gt.team_id === team.id)
      const group = groupTeam && groups.find((g) => g.id === groupTeam.group_id)
      if (group) grouped[group.name]?.push(team)
    })
    Object.values(grouped).forEach((groupedTeams) => groupedTeams?.sort((a, b) => a.name.localeCompare(b.name)))
    return grouped
  }

  const handleCreateGames = async () => {
    if (!cup) return
    setSavingGames(true)
    setGameError('')
    setGameSuccess('')
    try {
      await refreshTeams()
      const grouped = getGroupedTeams()
      const games = buildScheduleGames(
        VORRUNDE_SCHEDULE,
        'Vorrunde',
        cupId,
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
      const [allGames, allTeams, cupGroups] = await Promise.all([
        getGamesByCupId(cupId),
        getTeamsByCupId(cupId),
        getGroupsByCupId(cupId),
      ])
      const vorrundeGames = allGames.filter((game) => game.round === 'Vorrunde')

      const teamStats = fillAllTeamStats(buildTeamStats(allTeams, groupTeams), vorrundeGames, cupGroups, groupTeams)

      const rankingsByGroup = VORRUNDE_GROUPS.map((name) => {
        const group = cupGroups.find((g) => g.name === name)
        return sortTeamStatsByGroup(teamStats, groupTeams, group?.id, vorrundeGames)
      })

      // Group E gets the group winners, F the runners-up, G the thirds, H the fourths
      const newGroups: Group[] = FINALRUNDE_GROUPS.map((name) => ({
        id: crypto.randomUUID(),
        icke_cup_id: cupId,
        name,
      }))
      await Promise.all(newGroups.map((group) => createGroup(group)))

      const groupAssignments = newGroups.flatMap((group, position) =>
        rankingsByGroup.flatMap((ranking) => {
          const stats = ranking.at(position)
          return stats ? [{ group_id: group.id, team_id: stats.id }] : []
        })
      )
      await Promise.all(groupAssignments.map((assignment) => createGroupTeam(assignment)))

      const assignmentsByGroupName: Partial<Record<string, GroupTeam[]>> = Object.fromEntries(
        newGroups.map((group) => [group.name, groupAssignments.filter((gt) => gt.group_id === group.id)])
      )
      const finalGames = buildScheduleGames(
        FINALRUNDE_SCHEDULE,
        'Finalrunde',
        cupId,
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
      const [allGames, allTeams, cupGroups] = await Promise.all([
        getGamesByCupId(cupId),
        getTeamsByCupId(cupId),
        getGroupsByCupId(cupId),
      ])
      const finalrundeGames = allGames.filter((game) => game.round === 'Finalrunde')

      const teamStats = fillAllTeamStats(buildTeamStats(allTeams, groupTeams), finalrundeGames, cupGroups, groupTeams)

      // Places 1-4 come from group E, 5-8 from F, 9-12 from G, 13-16 from H
      const finalPlaceUpdates = FINALRUNDE_GROUPS.flatMap((name, groupIndex) => {
        const group = cupGroups.find((g) => g.name === name)
        const ranking = sortTeamStatsByGroup(teamStats, groupTeams, group?.id, finalrundeGames)
        return ranking.map((stats, index) => {
          const dbTeam = allTeams.find((team) => team.id === stats.id)
          return {
            id: stats.id,
            name: dbTeam?.name ?? stats.name,
            contact: dbTeam?.contact ?? '',
            final_place: groupIndex * 4 + index + 1,
          }
        })
      })

      await Promise.all(finalPlaceUpdates.map((team) => updateTeam(team)))
      await updateCup(cup.id, { ...cup, state: 'Abgeschlossen' })
      setGameSuccess('Turnier abgeschlossen und Platzierungen gespeichert!')
      refreshCup()
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
          <TeamsTabContent cupId={cupId} cup={cup} onTeamsChange={refreshTeams} />
        </TabsContent>
        <TabsContent value="vorrunde">
          <RoundGamesTab cupId={cupId} round="Vorrunde" />
        </TabsContent>
        <TabsContent value="finalrunde">
          <RoundGamesTab cupId={cupId} round="Finalrunde" />
        </TabsContent>
        <TabsContent value="auswertung">
          <AuswertungTabContent cupId={cupId} teams={teams} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CupDetails
