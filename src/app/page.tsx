'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  compareByStartTimeAndCourt,
  type EnrichedGame,
  enrichGames,
  GAME_STATUS_COLORS,
  GAME_STATUS_LABELS,
  isSittingGame,
} from '@/lib/game-helpers'
import { getActiveCup } from '@/services/cups'
import { getGamesByCupId } from '@/services/games'
import { getTeamsByCupId } from '@/services/teams'
import type { Game, RoundName } from '@/types/tournament'

// Games stay listed until 3 minutes after their start time
const LIVE_GRACE_MS = 3 * 60 * 1000
const MAX_UPCOMING_GAMES = 6
const REFRESH_INTERVAL_MS = 60_000

const upcomingOf = (games: Game[], round: RoundName, now: Date): Game[] =>
  games.filter((game) => game.round === round && new Date(game.start_at).getTime() - now.getTime() > -LIVE_GRACE_MS)

const Home = () => {
  const [games, setGames] = useState<EnrichedGame[]>([])
  const [loading, setLoading] = useState(true)
  const [currentRound, setCurrentRound] = useState<RoundName>()

  const fetchGames = useCallback(async () => {
    try {
      const activeCup = await getActiveCup()
      if (!activeCup) {
        setGames([])
        return
      }

      const [teams, allGames] = await Promise.all([getTeamsByCupId(activeCup.id), getGamesByCupId(activeCup.id)])

      const now = new Date()
      const upcomingVorrunde = upcomingOf(allGames, 'Vorrunde', now)
      const round: RoundName = upcomingVorrunde.length > 0 ? 'Vorrunde' : 'Finalrunde'
      const upcoming = round === 'Vorrunde' ? upcomingVorrunde : upcomingOf(allGames, 'Finalrunde', now)

      setCurrentRound(round)
      setGames(enrichGames(upcoming.sort(compareByStartTimeAndCourt).slice(0, MAX_UPCOMING_GAMES), teams))
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

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-xl font-semibold">
          {currentRound ? `Nächste Runde - ${currentRound}` : "Bald geht's los!"}
        </h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {games.length === 0 && !loading ? (
          <p>Rutscht euch schon mal warm!</p>
        ) : (
          games.map((game) => (
            <div key={game.id} className="bg-white rounded-lg shadow p-4 relative">
              {/* Top row: Time/Round on left, Status/Court on right */}
              <div className="flex justify-between items-start mb-3">
                <div className="text-left">
                  <p className="text-sm text-gray-600">
                    {new Date(game.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm">{game.round}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${GAME_STATUS_COLORS[game.status]}`}>
                    {GAME_STATUS_LABELS[game.status]}
                  </p>
                  <p className="text-sm">
                    Feld {game.court} ({isSittingGame(game) ? 'Sitzen' : 'Stehen'})
                  </p>
                </div>
              </div>

              {/* Center: Team names */}
              <div className="text-center mb-3">
                <p className="font-medium text-2xl">
                  {game.team1Name} vs {game.team2Name}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default Home
