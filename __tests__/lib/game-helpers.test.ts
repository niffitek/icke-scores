import {
  compareByStartTimeAndCourt,
  enrichGames,
  getGameStatus,
  hasScores,
  isSittingGame,
  scoreOf,
  toLocalDateTimeString,
} from '@/lib/game-helpers'
import type { Game, Team } from '@/types/tournament'

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

describe('scoreOf', () => {
  it.each([
    ['21', 21],
    [21, 21],
    [null, 0],
    [undefined, 0],
    ['', 0],
    ['abc', 0],
  ])('coerces %p to %p', (input, expected) => {
    expect(scoreOf(input)).toBe(expected)
  })
})

describe('isSittingGame', () => {
  it('accepts both string and numeric API values', () => {
    expect(isSittingGame(game({ sitting: '1' }))).toBe(true)
    expect(isSittingGame(game({ sitting: 1 }))).toBe(true)
    expect(isSittingGame(game({ sitting: '0' }))).toBe(false)
    expect(isSittingGame(game({ sitting: 0 }))).toBe(false)
  })
})

describe('hasScores', () => {
  it('is false for untouched games — the API reports their default rounds as 0, not null', () => {
    expect(hasScores(game({}))).toBe(false)
    expect(hasScores(game({ round1_points_team_1: null, round2_points_team_2: null }))).toBe(false)
    expect(
      hasScores(
        game({ round1_points_team_1: 0, round1_points_team_2: 0, round2_points_team_1: 0, round2_points_team_2: 0 })
      )
    ).toBe(false)
  })

  it('is true once any Satz has points, in either API value shape', () => {
    expect(hasScores(game({ round1_points_team_1: 21 }))).toBe(true)
    expect(hasScores(game({ round2_points_team_2: '21' }))).toBe(true)
  })
})

describe('getGameStatus', () => {
  const start = new Date('2025-06-14T09:00:00')

  it('is upcoming before start, live within 3 minutes after, finished afterwards', () => {
    const g = game({ start_at: '2025-06-14T09:00:00' })
    expect(getGameStatus(g, new Date(start.getTime() - 1000))).toBe('upcoming')
    expect(getGameStatus(g, start)).toBe('live')
    expect(getGameStatus(g, new Date(start.getTime() + 3 * 60 * 1000))).toBe('live')
    expect(getGameStatus(g, new Date(start.getTime() + 3 * 60 * 1000 + 1))).toBe('finished')
  })
})

describe('compareByStartTimeAndCourt', () => {
  it('orders by start time, then by court', () => {
    const early = game({ id: 'a', start_at: '2025-06-14T09:00:00', court: 5 })
    const late = game({ id: 'b', start_at: '2025-06-14T09:30:00', court: 1 })
    const earlyLowCourt = game({ id: 'c', start_at: '2025-06-14T09:00:00', court: '2' })

    const sorted = [late, early, earlyLowCourt].sort(compareByStartTimeAndCourt)

    expect(sorted.map((g) => g.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('enrichGames', () => {
  it('resolves team names and falls back to the id', () => {
    const teams: Team[] = [{ id: 't1', name: 'Alpha', contact: '', icke_cup_id: 'cup-1' }]

    const [enriched] = enrichGames([game({ team_2_id: 'missing' })], teams)

    expect(enriched.team1Name).toBe('Alpha')
    expect(enriched.team2Name).toBe('Team missing')
    expect(['upcoming', 'live', 'finished']).toContain(enriched.status)
  })
})

describe('toLocalDateTimeString', () => {
  it('formats local wall-clock time with zero padding', () => {
    expect(toLocalDateTimeString(new Date(2025, 5, 14, 9, 5, 42))).toBe('2025-06-14T09:05:00')
  })
})
