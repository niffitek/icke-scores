import { buildTeamStats, fillAllTeamStats, sortTeamStatsByGroup } from '@/services/ranking'
import type { Game, Group, GroupTeam, Team } from '@/types/tournament'

const team = (id: string, name: string): Team => ({ id, name, contact: '', icke_cup_id: 'cup-1' })

const game = (overrides: Partial<Game>): Game => ({
  id: 'game-1',
  icke_cup_id: 'cup-1',
  team_1_id: 't1',
  team_2_id: 't2',
  round: 'Vorrunde',
  court: 1,
  sitting: '1',
  start_at: '2025-06-14T09:00:00',
  ...overrides,
})

const teams: Team[] = [team('t1', 'Alpha'), team('t2', 'Beta'), team('t3', 'Gamma'), team('t4', 'Delta')]
const groups: Group[] = [{ id: 'g-a', name: 'A', icke_cup_id: 'cup-1' }]
const groupTeams: GroupTeam[] = teams.map((t) => ({ group_id: 'g-a', team_id: t.id }))

describe('buildTeamStats', () => {
  it('initializes zeroed stats with group assignment for every team', () => {
    const stats = buildTeamStats(teams, groupTeams)

    expect(Object.keys(stats)).toHaveLength(4)
    expect(stats.t1).toMatchObject({
      id: 't1',
      name: 'Alpha',
      group: 'g-a',
      roundsWonSitting: 0,
      roundsWonStanding: 0,
      finalScore: 0,
    })
  })
})

describe('fillAllTeamStats', () => {
  it('accumulates sitting round wins and points for/against', () => {
    const stats = buildTeamStats(teams, groupTeams)
    const games = [
      game({
        sitting: '1',
        round1_points_team_1: '21',
        round1_points_team_2: '15',
        round2_points_team_1: '18',
        round2_points_team_2: '21',
        round1_winner: 't1',
        round2_winner: 't2',
      }),
    ]

    fillAllTeamStats(stats, games, groups, groupTeams)

    expect(stats.t1).toMatchObject({
      roundsWonSitting: 1,
      totalPointsSitting: 39,
      totalPointsAgainstSitting: 36,
      roundsWonStanding: 0,
    })
    expect(stats.t2).toMatchObject({
      roundsWonSitting: 1,
      totalPointsSitting: 36,
      totalPointsAgainstSitting: 39,
    })
  })

  it('accumulates standing games separately (sitting=0) and handles numeric sitting values', () => {
    const stats = buildTeamStats(teams, groupTeams)
    const games = [
      game({
        sitting: 0,
        round1_points_team_1: 21,
        round1_points_team_2: 10,
        round2_points_team_1: 21,
        round2_points_team_2: 12,
        round1_winner: 't1',
        round2_winner: 't1',
      }),
    ]

    fillAllTeamStats(stats, games, groups, groupTeams)

    expect(stats.t1).toMatchObject({
      roundsWonStanding: 2,
      totalPointsStanding: 42,
      roundsWonSitting: 0,
      totalPointsSitting: 0,
    })
  })

  it('awards placement scores per discipline: sitting 11/9/7/5 plus standing 10/8/6/4', () => {
    const stats = buildTeamStats(teams, groupTeams)
    // t1 wins its sitting game, t3 wins its standing game; the rest lose or don't play
    const games = [
      game({
        id: 'sit',
        sitting: '1',
        round1_points_team_1: '21',
        round1_points_team_2: '10',
        round1_winner: 't1',
      }),
      game({
        id: 'stand',
        sitting: '0',
        team_1_id: 't3',
        team_2_id: 't4',
        round1_points_team_1: '21',
        round1_points_team_2: '10',
        round1_winner: 't3',
      }),
    ]

    fillAllTeamStats(stats, games, groups, groupTeams)

    // Sitting ranking: t1 (1 win) first → 11; standing ranking: t3 (1 win) first → 10
    expect(stats.t1!.finalScore).toBe(11 + 8) // 1st sitting, 2nd standing (point diff 0 beats t4's -11)
    expect(stats.t3!.finalScore).toBe(10 + 9) // 1st standing, 2nd sitting
  })

  it('ignores games whose teams are not in the stats map', () => {
    const stats = buildTeamStats(teams, groupTeams)
    const games = [game({ team_1_id: 'unknown-1', team_2_id: 'unknown-2', round1_winner: 'unknown-1' })]

    expect(() => fillAllTeamStats(stats, games, groups, groupTeams)).not.toThrow()
    expect(stats.t1!.finalScore).toBe(11 + 10) // everyone ties, order of insertion decides
  })
})

describe('sortTeamStatsByGroup', () => {
  it('sorts by final score, then total rounds won, then point difference', () => {
    const stats = buildTeamStats(teams, groupTeams)
    stats.t1!.finalScore = 10
    stats.t2!.finalScore = 21
    stats.t3!.finalScore = 21
    stats.t3!.roundsWonSitting = 3
    stats.t4!.finalScore = 21
    stats.t4!.roundsWonSitting = 3
    stats.t4!.totalPointsSitting = 5

    const sorted = sortTeamStatsByGroup(stats, groupTeams, 'g-a')

    expect(sorted.map((s) => s.id)).toEqual(['t4', 't3', 't2', 't1'])
  })

  it('breaks full ties with the head-to-head sitting game', () => {
    const stats = buildTeamStats(teams, groupTeams)
    const headToHead = game({
      sitting: '1',
      team_1_id: 't2',
      team_2_id: 't1',
      round1_points_team_1: '21',
      round1_points_team_2: '19',
      round2_points_team_1: '15',
      round2_points_team_2: '15',
    })

    const sorted = sortTeamStatsByGroup(
      stats,
      groupTeams.filter((gt) => gt.team_id === 't1' || gt.team_id === 't2'),
      'g-a',
      [headToHead]
    )

    expect(sorted.map((s) => s.id)).toEqual(['t2', 't1'])
  })

  it('returns an empty list for an unknown group', () => {
    const stats = buildTeamStats(teams, groupTeams)

    expect(sortTeamStatsByGroup(stats, groupTeams, 'nope')).toEqual([])
    expect(sortTeamStatsByGroup(stats, groupTeams, undefined)).toEqual([])
  })
})
