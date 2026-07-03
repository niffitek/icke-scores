'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  compareByStartTimeAndCourt,
  type EnrichedGame,
  enrichGames,
  GAME_STATUS_COLORS,
  GAME_STATUS_LABELS,
} from '@/lib/game-helpers'
import { getActiveCup } from '@/services/cups'
import { getGamesByCupId } from '@/services/games'
import { getTeamsByCupId } from '@/services/teams'

const REFRESH_INTERVAL_MS = 30_000

type GameFilter = 'all' | 'upcoming' | 'finished'

const FILTER_OPTIONS: { value: GameFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'upcoming', label: 'Anstehend' },
  { value: 'finished', label: 'Beendet' },
]

const hasScores = (game: EnrichedGame): boolean =>
  game.round1_points_team_1 != null ||
  game.round1_points_team_2 != null ||
  game.round2_points_team_1 != null ||
  game.round2_points_team_2 != null

const GamesPage = () => {
  const [games, setGames] = useState<EnrichedGame[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<GameFilter>('all')

  const fetchGames = useCallback(async () => {
    try {
      const activeCup = await getActiveCup()
      if (!activeCup) {
        setGames([])
        return
      }

      const [teams, allGames] = await Promise.all([getTeamsByCupId(activeCup.id), getGamesByCupId(activeCup.id)])
      setGames(enrichGames(allGames.sort(compareByStartTimeAndCourt), teams))
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchGames])

  const filteredGames = games.filter((game) => filter === 'all' || game.status === filter)

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Alle Spiele</h1>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1 rounded text-sm ${
                filter === option.value ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredGames.length === 0 && !loading ? (
          <p>Keine Spiele gefunden.</p>
        ) : (
          filteredGames.map((game) => (
            <div key={game.id} className="bg-white rounded-lg shadow p-4 relative">
              {/* Top row: Time/Round on left, Status/Court on right */}
              <div className="flex justify-between items-start">
                <div className="text-left">
                  <p className="text-sm text-gray-600" suppressHydrationWarning>
                    {new Date(game.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">{game.round}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${GAME_STATUS_COLORS[game.status]}`}>
                    {GAME_STATUS_LABELS[game.status]}
                  </p>
                  <p className="text-xs text-gray-500">Feld {game.court}</p>
                </div>
              </div>

              {/* Center: Team names */}
              <div className="text-center mb-3">
                <p className="font-medium text-lg">
                  {game.team1Name} vs {game.team2Name}
                </p>
              </div>

              {/* Center: Scores below team names */}
              {hasScores(game) && (
                <div className="text-center space-y-1">
                  {game.round1_points_team_1 != null && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Satz 1:</span> {game.round1_points_team_1} -{' '}
                      {game.round1_points_team_2}
                    </div>
                  )}
                  {game.round2_points_team_1 != null && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Satz 2:</span> {game.round2_points_team_1} -{' '}
                      {game.round2_points_team_2}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default GamesPage
