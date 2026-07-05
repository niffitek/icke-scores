import { hasScores, isSittingGame, scoreOf } from '@/lib/game-helpers'
import type { Game, Group, GroupTeam, Team, TeamStats, TeamStatsMap } from '@/types/tournament'

// Placement points per group rank (1st..4th), awarded separately per discipline
const SITTING_PLACEMENT_SCORES = [11, 9, 7, 5]
const STANDING_PLACEMENT_SCORES = [10, 8, 6, 4]

export const buildTeamStats = (teams: Team[], groupTeams: GroupTeam[]): TeamStatsMap =>
  Object.fromEntries(
    teams.map((team) => [
      team.id,
      {
        id: team.id,
        name: team.name,
        group: groupTeams.find((gt) => gt.team_id === team.id)?.group_id,
        gamePointsSitting: 0,
        gamePointsStanding: 0,
        totalPointsSitting: 0,
        totalPointsStanding: 0,
        totalPointsAgainstSitting: 0,
        totalPointsAgainstStanding: 0,
        finalScore: 0,
      },
    ])
  )

// "Los": the pre-drawn lot is the random uuid a team got at registration.
// Deterministic across recomputes (a live ranking must not flip between page
// loads) and independent of the team name.
const byLot = (a: TeamStats, b: TeamStats): number => a.id.localeCompare(b.id)

// Win 2 / draw 1 / loss 0, decided by the game total (sum of both Sätze)
const gamePointsFor = (points: number, opponentPoints: number): number =>
  points > opponentPoints ? 2 : points === opponentPoints ? 1 : 0

const teamStatsForGroup = (teamStats: TeamStatsMap, groupTeams: GroupTeam[], groupId?: string): TeamStats[] =>
  groupTeams
    .filter((gt) => gt.group_id === groupId)
    .flatMap((gt) => {
      const stats = teamStats[gt.team_id]
      return stats ? [stats] : []
    })

// Rank by one discipline only: game points, then point diff, then lot
export const sortTeamStatsByDiscipline = (stats: TeamStats[], discipline: 'Sitting' | 'Standing'): TeamStats[] =>
  [...stats].sort((a, b) => {
    if (a[`gamePoints${discipline}`] !== b[`gamePoints${discipline}`]) {
      return b[`gamePoints${discipline}`] - a[`gamePoints${discipline}`]
    }
    const pointDiffA = a[`totalPoints${discipline}`] - a[`totalPointsAgainst${discipline}`]
    const pointDiffB = b[`totalPoints${discipline}`] - b[`totalPointsAgainst${discipline}`]
    return pointDiffB - pointDiffA || byLot(a, b)
  })

const awardPlacementScores = (
  teamStats: TeamStatsMap,
  groups: Group[],
  groupTeams: GroupTeam[],
  discipline: 'Sitting' | 'Standing',
  placementScores: number[]
): void => {
  groups.forEach((group) => {
    const ranked = sortTeamStatsByDiscipline(teamStatsForGroup(teamStats, groupTeams, group.id), discipline)
    ranked.forEach((stats, index) => {
      stats.finalScore += placementScores[index] ?? 0
    })
  })
}

export const fillAllTeamStats = (
  teamStats: TeamStatsMap,
  games: Game[],
  groups: Group[],
  groupTeams: GroupTeam[]
): TeamStatsMap => {
  games.filter(hasScores).forEach((game) => {
    const team1 = teamStats[game.team_1_id]
    const team2 = teamStats[game.team_2_id]
    if (!team1 || !team2) return

    const points1 = scoreOf(game.round1_points_team_1) + scoreOf(game.round2_points_team_1)
    const points2 = scoreOf(game.round1_points_team_2) + scoreOf(game.round2_points_team_2)

    if (isSittingGame(game)) {
      team1.gamePointsSitting += gamePointsFor(points1, points2)
      team2.gamePointsSitting += gamePointsFor(points2, points1)
      team1.totalPointsSitting += points1
      team2.totalPointsSitting += points2
      team1.totalPointsAgainstSitting += points2
      team2.totalPointsAgainstSitting += points1
    } else {
      team1.gamePointsStanding += gamePointsFor(points1, points2)
      team2.gamePointsStanding += gamePointsFor(points2, points1)
      team1.totalPointsStanding += points1
      team2.totalPointsStanding += points2
      team1.totalPointsAgainstStanding += points2
      team2.totalPointsAgainstStanding += points1
    }
  })

  awardPlacementScores(teamStats, groups, groupTeams, 'Sitting', SITTING_PLACEMENT_SCORES)
  awardPlacementScores(teamStats, groups, groupTeams, 'Standing', STANDING_PLACEMENT_SCORES)

  return teamStats
}

// Winner of the sitting game between the two teams, if there is a clear one
const headToHeadWinner = (a: TeamStats, b: TeamStats, games: Game[]): string | undefined => {
  const game = games.find(
    (g) =>
      isSittingGame(g) &&
      ((g.team_1_id === a.id && g.team_2_id === b.id) || (g.team_1_id === b.id && g.team_2_id === a.id))
  )
  if (!game) return undefined

  const points1 = scoreOf(game.round1_points_team_1) + scoreOf(game.round2_points_team_1)
  const points2 = scoreOf(game.round1_points_team_2) + scoreOf(game.round2_points_team_2)
  if (points1 === points2) return undefined
  return points1 > points2 ? game.team_1_id : game.team_2_id
}

export const sortTeamStatsByGroup = (
  teamStats: TeamStatsMap,
  groupTeams: GroupTeam[],
  groupId?: string,
  games?: Game[]
): TeamStats[] =>
  teamStatsForGroup(teamStats, groupTeams, groupId).sort((a, b) => {
    if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore

    const gamePointsA = a.gamePointsSitting + a.gamePointsStanding
    const gamePointsB = b.gamePointsSitting + b.gamePointsStanding
    if (gamePointsA !== gamePointsB) return gamePointsB - gamePointsA

    const pointDiffA =
      a.totalPointsSitting + a.totalPointsStanding - (a.totalPointsAgainstSitting + a.totalPointsAgainstStanding)
    const pointDiffB =
      b.totalPointsSitting + b.totalPointsStanding - (b.totalPointsAgainstSitting + b.totalPointsAgainstStanding)
    if (pointDiffA !== pointDiffB) return pointDiffB - pointDiffA

    const winner = games ? headToHeadWinner(a, b, games) : undefined
    if (winner === a.id) return -1
    if (winner === b.id) return 1
    return byLot(a, b)
  })
