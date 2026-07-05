import { buildTeamStats, fillAllTeamStats, sortTeamStatsByDiscipline, sortTeamStatsByGroup } from '@/services/ranking'
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
      gamePointsSitting: 0,
      gamePointsStanding: 0,
      finalScore: 0,
    })
  })
})

describe('fillAllTeamStats', () => {
  it('awards 2 game points to the winner of the game total, independent of Satz winners', () => {
    const stats = buildTeamStats(teams, groupTeams)
    // t1 loses Satz 2 but wins the game total 39:36
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
      gamePointsSitting: 2,
      totalPointsSitting: 39,
      totalPointsAgainstSitting: 36,
      gamePointsStanding: 0,
    })
    expect(stats.t2).toMatchObject({
      gamePointsSitting: 0,
      totalPointsSitting: 36,
      totalPointsAgainstSitting: 39,
    })
  })

  it('awards 1 game point each for a drawn game total', () => {
    const stats = buildTeamStats(teams, groupTeams)
    const games = [
      game({
        sitting: '1',
        round1_points_team_1: '21',
        round1_points_team_2: '15',
        round2_points_team_1: '15',
        round2_points_team_2: '21',
      }),
    ]

    fillAllTeamStats(stats, games, groups, groupTeams)

    expect(stats.t1!.gamePointsSitting).toBe(1)
    expect(stats.t2!.gamePointsSitting).toBe(1)
  })

  it('ignores games without any scored point (no phantom 0:0 draws)', () => {
    const stats = buildTeamStats(teams, groupTeams)
    // Untouched games arrive from the API with 0:0 rounds, not nulls
    const games = [
      game({ round1_points_team_1: 0, round1_points_team_2: 0, round2_points_team_1: 0, round2_points_team_2: 0 }),
      game({ id: 'game-2', sitting: 0 }),
    ]

    fillAllTeamStats(stats, games, groups, groupTeams)

    expect(stats.t1!.gamePointsSitting).toBe(0)
    expect(stats.t1!.gamePointsStanding).toBe(0)
    expect(stats.t2!.gamePointsSitting).toBe(0)
  })

  it('still counts a real 0-point Satz once any score is entered', () => {
    const stats = buildTeamStats(teams, groupTeams)
    const games = [game({ round1_points_team_1: 0, round1_points_team_2: 21 })]

    fillAllTeamStats(stats, games, groups, groupTeams)

    expect(stats.t2!.gamePointsSitting).toBe(2)
    expect(stats.t1!.gamePointsSitting).toBe(0)
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
      }),
    ]

    fillAllTeamStats(stats, games, groups, groupTeams)

    expect(stats.t1).toMatchObject({
      gamePointsStanding: 2,
      totalPointsStanding: 42,
      gamePointsSitting: 0,
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
      }),
      game({
        id: 'stand',
        sitting: '0',
        team_1_id: 't3',
        team_2_id: 't4',
        round1_points_team_1: '21',
        round1_points_team_2: '10',
      }),
    ]

    fillAllTeamStats(stats, games, groups, groupTeams)

    // Sitting ranking: t1 (2 game points) first → 11; standing: t3 first → 10
    expect(stats.t1!.finalScore).toBe(11 + 8) // 1st sitting, 2nd standing (point diff 0 beats t4's -11)
    expect(stats.t3!.finalScore).toBe(10 + 9) // 1st standing, 2nd sitting
  })

  it('ignores games whose teams are not in the stats map', () => {
    const stats = buildTeamStats(teams, groupTeams)
    const games = [game({ team_1_id: 'unknown-1', team_2_id: 'unknown-2', round1_points_team_1: 21 })]

    expect(() => fillAllTeamStats(stats, games, groups, groupTeams)).not.toThrow()
    expect(stats.t1!.finalScore).toBe(11 + 10) // everyone ties, lot (id) decides
  })
})

describe('sortTeamStatsByDiscipline', () => {
  it('sorts by the given discipline only: game points, then point diff, then lot', () => {
    const stats = buildTeamStats(teams, groupTeams)
    stats.t2!.gamePointsSitting = 4
    stats.t3!.gamePointsSitting = 4
    stats.t3!.totalPointsSitting = 10
    stats.t4!.gamePointsStanding = 99 // must not matter for sitting

    const sorted = sortTeamStatsByDiscipline(
      Object.values(stats).flatMap((s) => (s ? [s] : [])),
      'Sitting'
    )

    expect(sorted.map((s) => s.id)).toEqual(['t3', 't2', 't1', 't4'])
  })
})

describe('sortTeamStatsByGroup', () => {
  it('sorts by final score, then total game points, then point difference', () => {
    const stats = buildTeamStats(teams, groupTeams)
    stats.t1!.finalScore = 10
    stats.t2!.finalScore = 21
    stats.t3!.finalScore = 21
    stats.t3!.gamePointsSitting = 3
    stats.t4!.finalScore = 21
    stats.t4!.gamePointsSitting = 3
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

describe('Los (lot) tiebreak', () => {
  // The lot is the random uuid drawn at team creation: name-independent and
  // stable across recomputes, unlike a coin flip at render time.
  const lotGroupTeams: GroupTeam[] = [
    { group_id: 'g-a', team_id: 't-b' },
    { group_id: 'g-a', team_id: 't-a' },
  ]
  const lotTeams: Team[] = [team('t-b', 'Aaa'), team('t-a', 'Zzz')]

  it('orders a full tie by team id, not by name or insertion order', () => {
    const stats = buildTeamStats(lotTeams, lotGroupTeams)

    const sorted = sortTeamStatsByGroup(stats, lotGroupTeams, 'g-a')

    expect(sorted.map((s) => s.id)).toEqual(['t-a', 't-b'])
  })

  it('awards placement points of a fully drawn group by lot', () => {
    const stats = buildTeamStats(lotTeams, lotGroupTeams)

    fillAllTeamStats(stats, [], groups, lotGroupTeams)

    expect(stats['t-a']!.finalScore).toBe(21) // 11 sitting + 10 standing
    expect(stats['t-b']!.finalScore).toBe(17) // 9 sitting + 8 standing
  })
})
