import { FINALRUNDE_GROUPS, VORRUNDE_GROUPS } from '@/configs/constants'
import { VORRUNDE_SCHEDULE } from '@/configs/schedules'
import {
  buildScheduleGames,
  computeFinalPlaces,
  groupTeamsByGroupName,
  hasDistinctPositions,
  seedFinalGroups,
} from '@/services/tournament'
import type { Game, Group, GroupTeam, RoundName, Team } from '@/types/tournament'

const CUP = 'cup-1'

// 16 teams "A1".."D4" in Vorrunde groups A-D (group id "gA" etc.)
const members = (letter: string): string[] => [1, 2, 3, 4].map((i) => `${letter}${i}`)
const teams: Team[] = VORRUNDE_GROUPS.flatMap(members).map((id) => ({ id, name: id, contact: '', icke_cup_id: CUP }))
const vGroups: Group[] = VORRUNDE_GROUPS.map((name) => ({ id: `g${name}`, name, icke_cup_id: CUP }))
const vMemberships: GroupTeam[] = VORRUNDE_GROUPS.flatMap((letter) =>
  members(letter).map((id) => ({ group_id: `g${letter}`, team_id: id }))
)

let gameSeq = 0
// One sitting + one standing game for a pair; both rounds end p1:p2
const pairGames = (round: RoundName, t1: string, t2: string, p1: number, p2: number): Game[] =>
  [1, 0].map((sitting) => ({
    id: `game-${gameSeq++}`,
    icke_cup_id: CUP,
    team_1_id: t1,
    team_2_id: t2,
    round,
    court: sitting ? 1 : 4,
    sitting: String(sitting),
    start_at: '2026-07-04T09:00:00',
    round1_points_team_1: p1,
    round1_points_team_2: p2,
    round2_points_team_1: p1,
    round2_points_team_2: p2,
    round1_winner: p1 > p2 ? t1 : p2 > p1 ? t2 : null,
    round2_winner: p1 > p2 ? t1 : p2 > p1 ? t2 : null,
  }))

const roundRobin = (round: RoundName, ids: string[], score: (a: string, b: string) => [number, number]): Game[] =>
  ids.flatMap((a, i) => ids.slice(i + 1).flatMap((b) => pairGames(round, a, b, ...score(a, b))))

describe('buildScheduleGames', () => {
  const games = buildScheduleGames(
    VORRUNDE_SCHEDULE,
    'Vorrunde',
    CUP,
    '2026-07-04',
    '09:00',
    (group, position) => `${group}${position}`
  )

  it('creates 48 games with unique ids on courts 1-6', () => {
    expect(games).toHaveLength(48)
    expect(new Set(games.map((g) => g.id)).size).toBe(48)
    games.forEach((g, index) => expect(g.court).toBe((index % 6) + 1))
  })

  it('marks courts 1-3 sitting and 4-6 standing', () => {
    games.forEach((g) => expect(g.sitting).toBe(Number(g.court) <= 3 ? 1 : 0))
  })

  it('uses the given date and spaces rounds 30 minutes apart from the start time', () => {
    expect(games[0].start_at).toBe('2026-07-04T09:00:00')
    expect(games[6].start_at).toBe('2026-07-04T09:30:00')
    expect(games[47].start_at).toBe('2026-07-04T12:30:00')
  })

  it('skips games whose teams cannot be resolved', () => {
    const partial = buildScheduleGames(VORRUNDE_SCHEDULE, 'Vorrunde', CUP, '2026-07-04', '09:00', (group, position) =>
      group === 'D' ? undefined : `${group}${position}`
    )
    expect(partial).toHaveLength(36) // group D plays 12 of the 48 games
  })
})

describe('groupTeamsByGroupName', () => {
  it('groups teams by group name, sorted by team name when no positions are set', () => {
    const grouped = groupTeamsByGroupName(teams, vGroups, vMemberships, VORRUNDE_GROUPS)
    expect(Object.keys(grouped)).toEqual([...VORRUNDE_GROUPS])
    VORRUNDE_GROUPS.forEach((name) => expect(grouped[name]?.map((t) => t.id)).toEqual(members(name)))
  })

  it('sorts teams within a group by their position, not their name', () => {
    // Reverse positions: A1 gets place 4 ... A4 gets place 1 (API may deliver strings)
    const positioned = teams.map((t) => (t.id[0] === 'A' ? { ...t, place: String(5 - Number(t.id[1])) } : t))
    const grouped = groupTeamsByGroupName(positioned, vGroups, vMemberships, VORRUNDE_GROUPS)
    expect(grouped.A?.map((t) => t.id)).toEqual(['A4', 'A3', 'A2', 'A1'])
    expect(grouped.B?.map((t) => t.id)).toEqual(members('B'))
  })

  it('reflects an uneven assignment (the 4-per-group guard input)', () => {
    // Move A1 into group D -> A has 3 teams, D has 5
    const moved = vMemberships.map((gt) => (gt.team_id === 'A1' ? { ...gt, group_id: 'gD' } : gt))
    const grouped = groupTeamsByGroupName(teams, vGroups, moved, VORRUNDE_GROUPS)
    expect(VORRUNDE_GROUPS.map((name) => grouped[name]?.length)).toEqual([3, 4, 4, 5])
    expect(VORRUNDE_GROUPS.some((name) => grouped[name]?.length !== 4)).toBe(true)
  })

  it('only counts memberships of the requested groups (dual Vorrunde/Finalrunde membership)', () => {
    const eGroup: Group = { id: 'gE', name: 'E', icke_cup_id: CUP }
    // Every team also sits in a Finalrunde group; A-D grouping must be unaffected
    const dual = [...vMemberships.map((gt) => ({ group_id: 'gE', team_id: gt.team_id })), ...vMemberships]
    const grouped = groupTeamsByGroupName(teams, [eGroup, ...vGroups], dual, VORRUNDE_GROUPS)
    expect(VORRUNDE_GROUPS.map((name) => grouped[name]?.length)).toEqual([4, 4, 4, 4])
  })

  it('leaves unassigned teams out', () => {
    const grouped = groupTeamsByGroupName(teams, vGroups, vMemberships.slice(1), VORRUNDE_GROUPS)
    expect(grouped.A?.map((t) => t.id)).toEqual(['A2', 'A3', 'A4'])
  })
})

describe('hasDistinctPositions', () => {
  const positioned = (places: (number | string | null | undefined)[]): Team[] =>
    places.map((place, i) => ({ id: `t${i}`, name: `t${i}`, contact: '', icke_cup_id: CUP, place }))

  it('accepts exactly the positions 1-4 in any order', () => {
    expect(hasDistinctPositions(positioned([2, 4, 1, 3]))).toBe(true)
    expect(hasDistinctPositions(positioned(['1', '2', '3', '4']))).toBe(true)
  })

  it('rejects duplicates, out-of-range and missing positions', () => {
    expect(hasDistinctPositions(positioned([1, 2, 2, 4]))).toBe(false)
    expect(hasDistinctPositions(positioned([1, 2, 3, 5]))).toBe(false)
    expect(hasDistinctPositions(positioned([1, 2, 3, null]))).toBe(false)
    expect(hasDistinctPositions(positioned([1, 2, 3, undefined]))).toBe(false)
  })
})

describe('seedFinalGroups', () => {
  // Lower index always wins 21:10 -> every Vorrunde group ranks 1,2,3,4
  const vorrundeGames = VORRUNDE_GROUPS.flatMap((letter) =>
    roundRobin('Vorrunde', members(letter), (a, b) => (a < b ? [21, 10] : [10, 21]))
  )

  it('puts the group winners in E, runners-up in F, thirds in G, fourths in H', () => {
    const { newGroups, assignments } = seedFinalGroups(CUP, teams, vorrundeGames, vGroups, vMemberships)

    expect(newGroups.map((g) => g.name)).toEqual(FINALRUNDE_GROUPS)
    newGroups.forEach((g) => expect(g.icke_cup_id).toBe(CUP))
    expect(assignments).toHaveLength(16)

    const membersOf = (name: string) => {
      const group = newGroups.find((g) => g.name === name)
      return assignments.filter((a) => a.group_id === group?.id).map((a) => a.team_id)
    }
    expect(membersOf('E').sort()).toEqual(['A1', 'B1', 'C1', 'D1'])
    expect(membersOf('F').sort()).toEqual(['A2', 'B2', 'C2', 'D2'])
    expect(membersOf('G').sort()).toEqual(['A3', 'B3', 'C3', 'D3'])
    expect(membersOf('H').sort()).toEqual(['A4', 'B4', 'C4', 'D4'])
  })

  it('is not fooled by unplayed games (a 0:0 "draw" would push A2 past A1)', () => {
    // Three extra scheduled-but-unscored games for A2 (the API reports 0:0, not
    // null): as phantom draws they would lift A2 to 7 game points vs A1's 6 and
    // flip the group winner.
    const unscored: Game[] = [1, 2, 3].map((n) => ({
      id: `unscored-${n}`,
      icke_cup_id: CUP,
      team_1_id: 'A2',
      team_2_id: 'A4',
      round: 'Vorrunde',
      court: 1,
      sitting: '1',
      start_at: '2026-07-04T13:00:00',
      round1_points_team_1: 0,
      round1_points_team_2: 0,
      round2_points_team_1: 0,
      round2_points_team_2: 0,
    }))

    const { newGroups, assignments } = seedFinalGroups(
      CUP,
      teams,
      [...vorrundeGames, ...unscored],
      vGroups,
      vMemberships
    )

    const groupE = newGroups.find((g) => g.name === 'E')
    const winners = assignments.filter((a) => a.group_id === groupE?.id).map((a) => a.team_id)
    expect(winners.sort()).toEqual(['A1', 'B1', 'C1', 'D1'])
  })
})

describe('computeFinalPlaces', () => {
  const fGroups: Group[] = FINALRUNDE_GROUPS.map((name) => ({ id: `g${name}`, name, icke_cup_id: CUP }))
  // E holds the 1s, F the 2s, G the 3s, H the 4s (one team per old group)
  const fMemberships: GroupTeam[] = FINALRUNDE_GROUPS.flatMap((name, index) =>
    VORRUNDE_GROUPS.map((letter) => ({ group_id: `g${name}`, team_id: `${letter}${index + 1}` }))
  )

  // Group E finishes A1 > B1 > C1 > D1 (21:10 wins). In F/G/H the order is
  // A > C > D > B, where the A-team wins 21:0 and everyone else 21:10. That makes
  // A1 rank LAST among the A-teams (old group A, worse point diff) while B1 ranks
  // FIRST among the B-teams (old group B). If the old Vorrunde groups leaked into
  // the evaluation (the double-award bug), B1's old-group bonus (11+10) would beat
  // A1's (5+4) and flip places 1 and 2.
  const finalOrder = (letter: string) => (letter === 'E' ? ['A', 'B', 'C', 'D'] : ['A', 'C', 'D', 'B'])
  const finalrundeGames = FINALRUNDE_GROUPS.flatMap((name, index) =>
    roundRobin(
      'Finalrunde',
      finalOrder(name).map((letter) => `${letter}${index + 1}`),
      (a, b) => {
        const order = finalOrder(name)
        const aWins = order.indexOf(a[0]) < order.indexOf(b[0])
        const winnerIsA = (aWins ? a : b)[0] === 'A' && name !== 'E'
        const [win, lose]: [number, number] = winnerIsA ? [21, 0] : [21, 10]
        return aWins ? [win, lose] : [lose, win]
      }
    )
  )
  const allGroups = [...vGroups, ...fGroups]
  const allMemberships = [...vMemberships, ...fMemberships]

  it('assigns places 1-16 from groups E-H, ignoring the old Vorrunde memberships', () => {
    const places = computeFinalPlaces(teams, finalrundeGames, allGroups, allMemberships)

    const byTeam = Object.fromEntries(places.map((p) => [p.id, p.final_place]))
    expect(byTeam.A1).toBe(1) // would be 2 with the double-award bug
    expect(byTeam.B1).toBe(2)
    expect(byTeam.C1).toBe(3)
    expect(byTeam.D1).toBe(4)
    expect(byTeam.A2).toBe(5)
    expect(byTeam.C2).toBe(6)
    expect(byTeam.D2).toBe(7)
    expect(byTeam.B2).toBe(8)
    expect(byTeam.A4).toBe(13)
    expect(byTeam.B4).toBe(16)

    expect(places.map((p) => p.final_place).sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1))
  })
})
