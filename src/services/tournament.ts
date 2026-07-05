import { COURT_IS_SITTING, FINALRUNDE_GROUPS, MINUTES_PER_ROUND, VORRUNDE_GROUPS } from '@/configs/constants'
import { toLocalDateTimeString } from '@/lib/game-helpers'
import { buildTeamStats, fillAllTeamStats, sortTeamStatsByGroup } from '@/services/ranking'
import type { Game, Group, GroupTeam, RoundName, Team, TeamStats } from '@/types/tournament'

// Group teams by group name (only the given groups), each group sorted by its
// explicit position (Team.place, "A1" = place 1), name as legacy fallback.
// Callers must pass freshly fetched data — the 4-per-group guard ran on stale UI state once.
export const groupTeamsByGroupName = (
  teams: Team[],
  groups: Group[],
  groupTeams: GroupTeam[],
  groupNames: readonly string[]
): Partial<Record<string, Team[]>> => {
  const grouped: Partial<Record<string, Team[]>> = Object.fromEntries(groupNames.map((name) => [name, []]))
  teams.forEach((team) => {
    const group = groupTeams
      .filter((gt) => gt.team_id === team.id)
      .map((gt) => groups.find((g) => g.id === gt.group_id))
      .find((g) => g && groupNames.includes(g.name))
    if (group) grouped[group.name]?.push(team)
  })
  Object.values(grouped).forEach((groupedTeams) =>
    groupedTeams?.sort((a, b) => (Number(a.place) || 0) - (Number(b.place) || 0) || a.name.localeCompare(b.name))
  )
  return grouped
}

// True iff the teams' positions are exactly 1-4, each used once
export const hasDistinctPositions = (teams: Team[]): boolean => {
  const places = teams.map((team) => Number(team.place))
  return places.every((place) => place >= 1 && place <= 4) && new Set(places).size === teams.length
}

// Build the games of one round from a schedule ("A1-A4" = group A team 1 vs team 4)
export const buildScheduleGames = (
  schedule: string[][],
  round: RoundName,
  cupId: string,
  startDate: string, // "YYYY-MM-DD"
  startTime: string, // "HH:MM"
  getTeamId: (group: string, position: number) => string | undefined
): Game[] => {
  const start = new Date(`${startDate}T${startTime}:00`)

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

// After the Finalrunde starts every team belongs to two groups (A-D and E-H).
// Rankings must only ever see the groups of one phase, otherwise
// awardPlacementScores hands out placement points twice per team.
const rankPhaseGroups = (
  teams: Team[],
  games: Game[],
  groups: Group[],
  groupTeams: GroupTeam[],
  phase: string[]
): TeamStats[][] => {
  const phaseGroups = groups.filter((group) => phase.includes(group.name))
  const memberships = groupTeams.filter((gt) => phaseGroups.some((group) => group.id === gt.group_id))
  const stats = fillAllTeamStats(buildTeamStats(teams, memberships), games, phaseGroups, memberships)
  return phase.map((name) => {
    const group = phaseGroups.find((g) => g.name === name)
    return sortTeamStatsByGroup(stats, memberships, group?.id, games)
  })
}

// Group E gets the four group winners, F the runners-up, G the thirds, H the fourths
export const seedFinalGroups = (
  cupId: string,
  teams: Team[],
  vorrundeGames: Game[],
  groups: Group[],
  groupTeams: GroupTeam[]
): { newGroups: Group[]; assignments: GroupTeam[] } => {
  const rankings = rankPhaseGroups(teams, vorrundeGames, groups, groupTeams, VORRUNDE_GROUPS)
  const newGroups: Group[] = FINALRUNDE_GROUPS.map((name) => ({
    id: crypto.randomUUID(),
    icke_cup_id: cupId,
    name,
  }))
  const assignments = newGroups.flatMap((group, position) =>
    rankings.flatMap((ranking) => {
      const stats = ranking.at(position)
      return stats ? [{ group_id: group.id, team_id: stats.id }] : []
    })
  )
  return { newGroups, assignments }
}

// Places 1-4 come from group E, 5-8 from F, 9-12 from G, 13-16 from H
export const computeFinalPlaces = (
  teams: Team[],
  finalrundeGames: Game[],
  groups: Group[],
  groupTeams: GroupTeam[]
): { id: string; final_place: number }[] => {
  const rankings = rankPhaseGroups(teams, finalrundeGames, groups, groupTeams, FINALRUNDE_GROUPS)
  return rankings.flatMap((ranking, groupIndex) =>
    ranking.map((stats, index) => ({ id: stats.id, final_place: groupIndex * 4 + index + 1 }))
  )
}
