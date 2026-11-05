'use client'

import { useCallback, useEffect, useState } from 'react'

import { FINALRUNDE_GROUPS, VORRUNDE_GROUPS } from '@/configs/constants'
import { hasScores } from '@/lib/game-helpers'
import { getDisplayCup } from '@/services/cups'
import { getGamesByCupId } from '@/services/games'
import { getGroupsByCupId } from '@/services/groups'
import { getGroupTeams } from '@/services/groupTeams'
import { buildTeamStats, fillAllTeamStats, sortTeamStatsByDiscipline, sortTeamStatsByGroup } from '@/services/ranking'
import { getTeamsByCupId } from '@/services/teams'
import type { CupState, RoundName, Team, TeamStats } from '@/types/tournament'

const REFRESH_INTERVAL_MS = 30_000

const DISCIPLINE_TABS = ['Gesamt', 'Sitzen', 'Stehen'] as const
type DisciplineTab = (typeof DISCIPLINE_TABS)[number]

type GroupStats = {
  name: string
  teams: TeamStats[]
}

type FinalStandings = {
  title: string
  teams: Team[]
}

const pointsLabel = (points: number): string => `${points} ${points === 1 ? 'Punkt' : 'Punkte'}`

const ScoresPage = () => {
  const [groupStats, setGroupStats] = useState<GroupStats[]>([])
  const [loading, setLoading] = useState(true)
  const [cupState, setCupState] = useState<CupState | ''>('')
  // null = follow the cup's current phase; set once the user toggles
  const [phaseOverride, setPhaseOverride] = useState<RoundName | null>(null)
  const [disciplineTab, setDisciplineTab] = useState<DisciplineTab>('Gesamt')
  // Final places of a finished cup, shown above its group rankings
  const [finalStandings, setFinalStandings] = useState<FinalStandings | null>(null)

  const fetchScores = useCallback(async () => {
    try {
      const activeCup = await getDisplayCup()
      if (!activeCup) {
        setGroupStats([])
        setCupState('')
        setFinalStandings(null)
        return
      }
      setCupState(activeCup.state)

      const finished = activeCup.state === 'Abgeschlossen'
      const phase: RoundName = phaseOverride ?? (activeCup.state === 'Vorrunde' ? 'Vorrunde' : 'Finalrunde')
      const relevantGroups = phase === 'Finalrunde' ? FINALRUNDE_GROUPS : VORRUNDE_GROUPS

      const [groups, teams, groupTeams, games] = await Promise.all([
        getGroupsByCupId(activeCup.id),
        getTeamsByCupId(activeCup.id),
        getGroupTeams(),
        getGamesByCupId(activeCup.id),
      ])

      const placedTeams = finished
        ? teams
            .filter((team) => team.final_place != null && team.final_place !== '')
            .sort((a, b) => Number(a.final_place) - Number(b.final_place))
        : []
      setFinalStandings(placedTeams.length > 0 ? { title: activeCup.title, teams: placedTeams } : null)

      const filteredGroups = groups.filter((group) => relevantGroups.includes(group.name))
      const finishedGames = games.filter((game) => game.round === phase && hasScores(game))

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
  }, [phaseOverride])

  useEffect(() => {
    fetchScores()
    const interval = setInterval(fetchScores, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchScores])

  const currentPhase: RoundName = phaseOverride ?? (cupState === 'Vorrunde' ? 'Vorrunde' : 'Finalrunde')
  const hasFinalrunde = cupState === 'Finalrunde' || cupState === 'Abgeschlossen'

  const teamsForTab = (teams: TeamStats[]): TeamStats[] =>
    disciplineTab === 'Gesamt'
      ? teams
      : sortTeamStatsByDiscipline(teams, disciplineTab === 'Sitzen' ? 'Sitting' : 'Standing')

  return (
    <section className="h-full flex flex-col">
      <div className="flex items-center justify-center gap-2 mb-2 flex-shrink-0">
        <h1 className="text-xl font-semibold text-center">
          {finalStandings
            ? `Endplatzierungen - ${finalStandings.title}`
            : `Team Ranglisten ${cupState && `- ${currentPhase}`}`}
        </h1>
      </div>

      {finalStandings && (
        <ol className="max-w-xl w-full mx-auto space-y-1 mb-4 flex-shrink-0">
          {finalStandings.teams.map((team) => (
            <li key={team.id} className="bg-white rounded-lg shadow px-3 py-2 flex items-center gap-3">
              <span className="text-xl sm:text-2xl font-bold text-gray-500 w-8 text-center flex-shrink-0">
                {team.final_place}
              </span>
              <span className="font-semibold text-base sm:text-lg truncate">{team.name}</span>
            </li>
          ))}
        </ol>
      )}

      {finalStandings && (
        <h2 className="text-lg font-semibold text-center mb-2 flex-shrink-0">Gruppen - {currentPhase}</h2>
      )}

      <div className="flex items-center justify-center gap-4 mb-2 flex-shrink-0">
        {/* Phase toggle, only once the Finalrunde exists */}
        {hasFinalrunde && (
          <div className="flex gap-2">
            {(['Vorrunde', 'Finalrunde'] as const).map((phase) => (
              <button
                key={phase}
                onClick={() => setPhaseOverride(phase)}
                className={`px-3 py-1 rounded text-sm ${
                  currentPhase === phase ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        )}

        {/* Discipline tabs */}
        <div className="flex gap-2">
          {DISCIPLINE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setDisciplineTab(tab)}
              className={`px-3 py-1 rounded text-sm ${
                disciplineTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
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
                  {teamsForTab(group.teams).map((team, index) => {
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
                            {/* Placement score: what the Gesamt order is decided by */}
                            {disciplineTab === 'Gesamt' && (
                              <div className="text-center min-w-0 flex-1 sm:flex-initial sm:w-24">
                                <div className="text-xs sm:text-sm font-semibold text-gray-700">Wertung</div>
                                <div className="text-sm sm:text-lg font-bold">{team.finalScore}</div>
                              </div>
                            )}

                            {/* Sitting Stats */}
                            <div className="text-center min-w-0 flex-1 sm:flex-initial sm:w-24">
                              <div className="text-xs sm:text-sm font-semibold text-gray-700">Sitzen</div>
                              <div className="text-sm sm:text-lg font-bold">{pointsLabel(team.gamePointsSitting)}</div>
                              <div className="text-xs sm:text-sm font-medium text-gray-600">
                                {sittingPointDiff > 0 ? '+' : ''}
                                {sittingPointDiff}
                              </div>
                            </div>

                            {/* Standing Stats */}
                            <div className="text-center min-w-0 flex-1 sm:flex-initial sm:w-24">
                              <div className="text-xs sm:text-sm font-semibold text-gray-700">Stehen</div>
                              <div className="text-sm sm:text-lg font-bold">{pointsLabel(team.gamePointsStanding)}</div>
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
