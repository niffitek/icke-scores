import { useCallback, useEffect, useState } from 'react'

import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { compareByStartTimeAndCourt, scoreOf } from '@/lib/game-helpers'
import { getGames } from '@/services/games'
import { getRoundsByGameId, updateRound } from '@/services/rounds'
import { getTeams } from '@/services/teams'
import type { CupState, Game, RoundName } from '@/types/tournament'

type DisplayGame = Game & {
  teamA: string
  teamB: string
  time: string
  round1Result: string
  round2Result: string
  totalResult: string
  gameWinner: string
}

// Points per round, editable in the dialog
type EditableGame = {
  id: string
  teamA: string
  teamB: string
  round1_points_team_1: number
  round1_points_team_2: number
  round2_points_team_1: number
  round2_points_team_2: number
}

const toDisplayGame = (game: Game, teamNames: Map<string, string>): DisplayGame => {
  const totalPoints1 = scoreOf(game.round1_points_team_1) + scoreOf(game.round2_points_team_1)
  const totalPoints2 = scoreOf(game.round1_points_team_2) + scoreOf(game.round2_points_team_2)
  const winnerId = totalPoints1 === totalPoints2 ? null : totalPoints1 > totalPoints2 ? game.team_1_id : game.team_2_id

  return {
    ...game,
    teamA: teamNames.get(game.team_1_id) ?? game.team_1_id,
    teamB: teamNames.get(game.team_2_id) ?? game.team_2_id,
    time: game.start_at ? new Date(game.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    round1Result: `${scoreOf(game.round1_points_team_1)} : ${scoreOf(game.round1_points_team_2)}`,
    round2Result: `${scoreOf(game.round2_points_team_1)} : ${scoreOf(game.round2_points_team_2)}`,
    totalResult: `${totalPoints1} : ${totalPoints2}`,
    gameWinner: winnerId ? (teamNames.get(winnerId) ?? winnerId) : 'Unentschieden',
  }
}

// cupState is only a reload trigger: creating games flips the cup state while
// this tab may already be mounted and would otherwise keep its stale empty list
const RoundGamesTab = ({ cupId, round, cupState }: { cupId: string; round: RoundName; cupState: CupState }) => {
  const [games, setGames] = useState<DisplayGame[]>([])
  const [loading, setLoading] = useState(true)
  const [editGame, setEditGame] = useState<EditableGame | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadGames = useCallback(async () => {
    const [allGames, allTeams] = await Promise.all([getGames(), getTeams()])
    const teamNames = new Map(allTeams.filter((team) => team.icke_cup_id === cupId).map((team) => [team.id, team.name]))
    const mapped = allGames
      .filter((game) => game.round === round && game.icke_cup_id === cupId)
      .map((game) => toDisplayGame(game, teamNames))
      .sort(compareByStartTimeAndCourt)
    setGames(mapped)
    // cupState is intentionally a reload trigger (see component comment)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cupId, round, cupState])

  useEffect(() => {
    setLoading(true)
    loadGames().finally(() => setLoading(false))
  }, [loadGames])

  const handleEditGame = (game: DisplayGame) => {
    setEditGame({
      id: game.id,
      teamA: game.teamA,
      teamB: game.teamB,
      round1_points_team_1: scoreOf(game.round1_points_team_1),
      round1_points_team_2: scoreOf(game.round1_points_team_2),
      round2_points_team_1: scoreOf(game.round2_points_team_1),
      round2_points_team_2: scoreOf(game.round2_points_team_2),
    })
    setShowEditDialog(true)
  }

  const handleSaveGame = async () => {
    if (!editGame) return
    setSaving(true)
    try {
      const rounds = await getRoundsByGameId(editGame.id)
      const round1 = rounds.at(0)
      const round2 = rounds.at(1)
      if (round1) {
        await updateRound({
          id: round1.id,
          points_team_1: editGame.round1_points_team_1,
          points_team_2: editGame.round1_points_team_2,
        })
      }
      if (round2) {
        await updateRound({
          id: round2.id,
          points_team_1: editGame.round2_points_team_1,
          points_team_2: editGame.round2_points_team_2,
        })
      }
      setShowEditDialog(false)
      setEditGame(null)
      await loadGames()
    } catch (error) {
      console.error('Error saving game:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Lade Spiele...</div>
  if (games.length === 0) return <div>Keine {round}nspiele gefunden.</div>

  return (
    <>
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{round}nspiele</h2>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Spiel auswerten</DialogTitle>
          </DialogHeader>
          {editGame && (
            <div className="flex flex-col gap-4">
              <div className="text-center font-medium mb-2">
                {editGame.teamA} vs {editGame.teamB}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Runde 1</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      value={editGame.round1_points_team_1}
                      onChange={(e) => setEditGame({ ...editGame, round1_points_team_1: Number(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <span className="text-sm">:</span>
                    <Input
                      type="number"
                      min="0"
                      value={editGame.round1_points_team_2}
                      onChange={(e) => setEditGame({ ...editGame, round1_points_team_2: Number(e.target.value) || 0 })}
                      className="w-20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Runde 2</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      value={editGame.round2_points_team_1}
                      onChange={(e) => setEditGame({ ...editGame, round2_points_team_1: Number(e.target.value) || 0 })}
                      className="w-20"
                    />
                    <span className="text-sm">:</span>
                    <Input
                      type="number"
                      min="0"
                      value={editGame.round2_points_team_2}
                      onChange={(e) => setEditGame({ ...editGame, round2_points_team_2: Number(e.target.value) || 0 })}
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="text-center text-sm text-gray-600">
                  Gesamt: {editGame.round1_points_team_1 + editGame.round2_points_team_1} :{' '}
                  {editGame.round1_points_team_2 + editGame.round2_points_team_2}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveGame} disabled={saving}>
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team A</TableHead>
            <TableHead>Team B</TableHead>
            <TableHead>Zeit</TableHead>
            <TableHead>Feld</TableHead>
            <TableHead>Satz 1</TableHead>
            <TableHead>Satz 2</TableHead>
            <TableHead>Gesamt</TableHead>
            <TableHead>Gewinner</TableHead>
            <TableHead className="w-12 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.map((game) => (
            <TableRow key={game.id}>
              <TableCell>{game.teamA}</TableCell>
              <TableCell>{game.teamB}</TableCell>
              <TableCell>{game.time}</TableCell>
              <TableCell>{game.court || '-'}</TableCell>
              <TableCell>{game.round1Result}</TableCell>
              <TableCell>{game.round2Result}</TableCell>
              <TableCell>{game.totalResult}</TableCell>
              <TableCell>{game.gameWinner}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="icon" className="p-2" onClick={() => handleEditGame(game)}>
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

export default RoundGamesTab
