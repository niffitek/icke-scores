'use client'

import { useCallback, useEffect, useState } from 'react'

import { FINALRUNDE_GROUPS, VORRUNDE_GROUPS } from '@/configs/constants'
import { getActiveCup } from '@/services/cups'
import { getGamesByCupId } from '@/services/games'
import { getGroupsByCupId } from '@/services/groups'
import { getGroupTeams } from '@/services/groupTeams'
import { buildTeamStats, fillAllTeamStats, sortTeamStatsByGroup } from '@/services/ranking'
import { getTeamsByCupId } from '@/services/teams'
import type { CupState, TeamStats } from '@/types/tournament'

const REFRESH_INTERVAL_MS = 30_000

type GroupStats = {
  name: string
  teams: TeamStats[]
}

const ScoresPage = () => {
  const [groupStats, setGroupStats] = useState<GroupStats[]>([])
  const [loading, setLoading] = useState(true)
  const [cupState, setCupState] = useState<CupState | ''>('')

  const fetchScores = useCallback(async () => {
    try {
      const activeCup = await getActiveCup()
      if (!activeCup) {
        setGroupStats([])
        setCupState('')
        return
      }
      setCupState(activeCup.state)

      const relevantGroups = activeCup.state === 'Finalrunde' ? FINALRUNDE_GROUPS : VORRUNDE_GROUPS
      const relevantRound = activeCup.state === 'Finalrunde' ? 'Finalrunde' : 'Vorrunde'

      const [groups, teams, groupTeams, games] = await Promise.all([
        getGroupsByCupId(activeCup.id),
        getTeamsByCupId(activeCup.id),
        getGroupTeams(),
        getGamesByCupId(activeCup.id),
      ])

      const filteredGroups = groups.filter((group) => relevantGroups.includes(group.name))
      const finishedGames = games.filter(
        (game) =>
          game.round === relevantRound &&
          (game.round1_points_team_1 != null ||
            game.round1_points_team_2 != null ||
            game.round2_points_team_1 != null ||
            game.round2_points_team_2 != null)
      )

      const teamStats = fillAllTeamStats(buildTeamStats(teams, groupTeams), finishedGames, filteredGroups, groupTeams)

      const sortedGroupStats = relevantGroups
        .map((groupName) => {
          const group = filteredGroups.find((g) => g.name === groupName)
          return {
            name: groupName,
            teams: group ? sortTeamStatsByGroup(teamStats, groupTeams, group.id, finishedGames) : [],
          }
        })
        .filter((group) => group.teams.length > 0)

      setGroupStats(sortedGroupStats)
    } catch (error) {
      console.error('Error fetching scores:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScores()
    const interval = setInterval(fetchScores, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchScores])

  return (
    <section className="h-full flex flex-col">
      <div className="flex items-center justify-center gap-2 mb-2 flex-shrink-0">
        <h1 className="text-xl font-semibold text-center">Team Ranglisten {cupState && `- ${cupState}`}</h1>
      </div>

      {groupStats.length === 0 && !loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p>Keine Teams oder Spiele gefunden.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full max-w-7xl mx-auto">
            {groupStats.map((group) => (
              <div key={group.name} className="bg-gray-50 rounded-lg p-3 flex flex-col min-h-0">
                <h2 className="text-lg font-bold mb-1 text-gray-800 text-center flex-shrink-0">Gruppe {group.name}</h2>
                <div className="flex-1 overflow-auto space-y-1 min-h-0">
                  {group.teams.map((team, index) => {
                    const sittingPointDiff = team.totalPointsSitting - team.totalPointsAgainstSitting
                    const standingPointDiff = team.totalPointsStanding - team.totalPointsAgainstStanding

                    return (
                      <div key={team.id} className="bg-white rounded-lg shadow px-3 py-2 flex-shrink-0">
                        {/* Mobile Layout - Stack vertically on small screens */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          {/* Top row: Place and Team Name */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="text-xl sm:text-2xl font-bold text-gray-500 w-6 sm:w-8 text-center flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-base sm:text-lg truncate">{team.name}</h3>
                            </div>
                          </div>

                          {/* Stats row - horizontal on mobile, stays in line on desktop */}
                          <div className="flex justify-between sm:justify-end gap-2 sm:gap-4">
                            {/* Sitting Stats */}
                            <div className="text-center min-w-0 flex-1 sm:flex-initial sm:min-w-20">
                              <div className="text-xs sm:text-sm font-semibold text-gray-700">Sitzen</div>
                              <div className="text-sm sm:text-lg font-bold">{team.roundsWonSitting} Siege</div>
                              <div className="text-xs sm:text-sm font-medium text-gray-600">
                                {sittingPointDiff > 0 ? '+' : ''}
                                {sittingPointDiff}
                              </div>
                            </div>

                            {/* Standing Stats */}
                            <div className="text-center min-w-0 flex-1 sm:flex-initial sm:min-w-20">
                              <div className="text-xs sm:text-sm font-semibold text-gray-700">Stehen</div>
                              <div className="text-sm sm:text-lg font-bold">{team.roundsWonStanding} Siege</div>
                              <div className="text-xs sm:text-sm font-medium text-gray-600">
                                {standingPointDiff > 0 ? '+' : ''}
                                {standingPointDiff}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default ScoresPage
