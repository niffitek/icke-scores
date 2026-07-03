import { useCallback, useEffect, useState } from 'react'

import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FINALRUNDE_GROUPS, TEAMS_PER_CUP, VORRUNDE_GROUPS } from '@/configs/constants'
import { getGroupsByCupId } from '@/services/groups'
import { createGroupTeam, deleteGroupTeamsByTeamId, getGroupTeams } from '@/services/groupTeams'
import { createTeam, deleteTeam, getTeams, updateTeam } from '@/services/teams'
import type { Cup, Group, GroupTeam, Team } from '@/types/tournament'

type TeamsTabContentProps = {
  cupId: string
  cup: Cup
  onTeamsChange?: () => void
}

const TeamsTabContent = ({ cupId, cup, onTeamsChange }: TeamsTabContentProps) => {
  const relevantGroups = cup.state === 'Finalrunde' ? FINALRUNDE_GROUPS : VORRUNDE_GROUPS

  const [teams, setTeams] = useState<Team[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', contact: '' })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [teamEditLoading, setTeamEditLoading] = useState(false)
  const [teamEditError, setTeamEditError] = useState('')
  const [teamDeleteLoading, setTeamDeleteLoading] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState(relevantGroups[0])
  const [editSelectedGroup, setEditSelectedGroup] = useState(relevantGroups[0])
  const [groupTeams, setGroupTeams] = useState<GroupTeam[]>([])

  const refreshTeams = useCallback(async () => {
    setTeams(await getTeams())
    setGroupTeams(await getGroupTeams())
    onTeamsChange?.()
  }, [onTeamsChange])

  useEffect(() => {
    getGroupsByCupId(cupId).then(setGroups)
    getTeams().then(setTeams)
    getGroupTeams().then(setGroupTeams)
  }, [cupId])

  const getTeamGroupName = (teamId: string): string => {
    const assignments = groupTeams.filter((gt) => gt.team_id === teamId)
    const match = assignments
      .map((gt) => groups.find((group) => group.id === gt.group_id))
      .find((group) => group && relevantGroups.includes(group.name))
    return match?.name ?? '-'
  }

  const assignTeamToGroup = async (teamId: string, groupName: string) => {
    const group = groups.find((g) => g.name === groupName)
    if (group) {
      await createGroupTeam({ group_id: group.id, team_id: teamId })
    }
  }

  const handleSaveTeam = async () => {
    if (!editTeam) return
    setTeamEditLoading(true)
    setTeamEditError('')
    try {
      await updateTeam({ id: editTeam.id, name: editTeam.name, contact: editTeam.contact })
      await deleteGroupTeamsByTeamId(editTeam.id)
      await assignTeamToGroup(editTeam.id, editSelectedGroup)
      setShowEditDialog(false)
      setEditTeam(null)
      refreshTeams()
    } catch {
      setTeamEditError('Fehler beim Speichern des Teams')
    } finally {
      setTeamEditLoading(false)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Willst du dieses Team wirklich löschen?')) return
    setTeamDeleteLoading(teamId)
    try {
      await deleteTeam(teamId)
      refreshTeams()
    } catch {
      alert('Fehler beim Löschen des Teams')
    } finally {
      setTeamDeleteLoading('')
    }
  }

  const handleCreateTeam = async () => {
    setCreateLoading(true)
    setCreateError('')
    const newId = crypto.randomUUID()
    try {
      await createTeam({
        id: newId,
        name: newTeam.name,
        contact: newTeam.contact,
        place: teams.length + 1,
        icke_cup_id: cup.id,
      })
      await assignTeamToGroup(newId, selectedGroup)
      setShowCreateDialog(false)
      setNewTeam({ name: '', contact: '' })
      refreshTeams()
    } catch {
      setCreateError('Fehler beim Anlegen des Teams')
    } finally {
      setCreateLoading(false)
    }
  }

  const cupTeams = teams
    .filter((team) => team.icke_cup_id === cup.id)
    .filter((team) => {
      const assignments = groupTeams.filter((gt) => gt.team_id === team.id)
      if (assignments.length === 0) return true // Show unassigned teams
      return assignments.some((gt) => {
        const group = groups.find((g) => g.id === gt.group_id)
        return group != null && relevantGroups.includes(group.name)
      })
    })
    .sort((a, b) => {
      const orderOf = (teamId: string) => {
        const index = relevantGroups.indexOf(getTeamGroupName(teamId))
        return index === -1 ? relevantGroups.length : index
      }
      const orderDiff = orderOf(a.id) - orderOf(b.id)
      return orderDiff !== 0 ? orderDiff : a.name.localeCompare(b.name)
    })

  return (
    <>
      <div className="flex flex-row justify-between items-center mb-2">
        <h2 className="text-lg font-semibold mb-2">Teams</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)} disabled={cupTeams.length >= TEAMS_PER_CUP}>
              Team anlegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Team anlegen</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Name"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              />
              <Input
                placeholder="Kontakt"
                value={newTeam.contact}
                onChange={(e) => setNewTeam({ ...newTeam, contact: e.target.value })}
              />
              <label className="font-medium">
                Gruppe
                <select
                  className="border rounded px-2 py-1 mt-1"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  {relevantGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              {createError && <p className="text-red-500 text-sm">{createError}</p>}
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTeam} disabled={createLoading || !newTeam.name}>
                {createLoading ? 'Anlegen...' : 'Anlegen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Kontakt</TableHead>
            <TableHead>Gruppe</TableHead>
            <TableHead className="w-24 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cupTeams.map((team) => (
            <TableRow key={team.id}>
              <TableCell>{team.name}</TableCell>
              <TableCell>{team.contact}</TableCell>
              <TableCell>{getTeamGroupName(team.id)}</TableCell>
              <TableCell className="text-right">
                <Dialog
                  open={showEditDialog && editTeam?.id === team.id}
                  onOpenChange={(open) => {
                    if (!open) setShowEditDialog(false)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="p-2 mr-2"
                      onClick={() => {
                        setEditTeam({ ...team })
                        const groupName = getTeamGroupName(team.id)
                        setEditSelectedGroup(groupName === '-' ? relevantGroups[0] : groupName)
                        setShowEditDialog(true)
                        setTeamEditError('')
                      }}
                    >
                      <Pencil />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Team bearbeiten</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="Name"
                        value={editTeam?.name ?? ''}
                        onChange={(e) => editTeam && setEditTeam({ ...editTeam, name: e.target.value })}
                      />
                      <Input
                        placeholder="Kontakt"
                        value={editTeam?.contact ?? ''}
                        onChange={(e) => editTeam && setEditTeam({ ...editTeam, contact: e.target.value })}
                      />
                      <label className="font-medium">
                        Gruppe
                        <select
                          className="border rounded px-2 py-1 mt-1"
                          value={editSelectedGroup}
                          onChange={(e) => setEditSelectedGroup(e.target.value)}
                        >
                          {relevantGroups.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </label>
                      {teamEditError && <p className="text-red-500 text-sm">{teamEditError}</p>}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveTeam} disabled={teamEditLoading}>
                        {teamEditLoading ? 'Speichern...' : 'Speichern'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="icon"
                  className="p-2"
                  onClick={() => handleDeleteTeam(team.id)}
                  disabled={teamDeleteLoading === team.id}
                  aria-label="Löschen"
                >
                  <Trash2 className="text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

export default TeamsTabContent
