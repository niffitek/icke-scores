import { buildCupSheets } from '@/services/export'
import type { Game, Group, GroupTeam, Team } from '@/types/tournament'

const CUP = 'cup-1'
const teams: Team[] = [
  { id: 'A1', name: 'Alpha', contact: 'a@x', icke_cup_id: CUP, final_place: 2 },
  { id: 'A2', name: 'Beta', contact: '', icke_cup_id: CUP, final_place: '1' },
]
const groups: Group[] = [
  { id: 'gA', name: 'A', icke_cup_id: CUP },
  { id: 'gE', name: 'E', icke_cup_id: CUP },
]
const groupTeams: GroupTeam[] = ['gA', 'gE'].flatMap((g) => teams.map((t) => ({ group_id: g, team_id: t.id })))
const game = (round: Game['round'], p1: number, p2: number, p1b = p1, p2b = p2): Game => ({
  id: `${round}-game-${p1}-${p2}-${p1b}-${p2b}`,
  icke_cup_id: CUP,
  team_1_id: 'A1',
  team_2_id: 'A2',
  round,
  court: 1,
  sitting: 1,
  start_at: '2026-07-04T09:00:00',
  round1_points_team_1: p1,
  round1_points_team_2: p2,
  round2_points_team_1: p1b,
  round2_points_team_2: p2b,
  round1_winner: p1 > p2 ? 'A1' : 'A2',
  round2_winner: p1b > p2b ? 'A1' : 'A2',
})

describe('buildCupSheets', () => {
  const sheets = buildCupSheets(teams, [game('Vorrunde', 21, 15), game('Finalrunde', 10, 21)], groups, groupTeams)

  it('lists final places in order with contact', () => {
    expect(sheets.Endplatzierungen).toEqual([
      { Platz: 1, Team: 'Beta', Kontakt: '' },
      { Platz: 2, Team: 'Alpha', Kontakt: 'a@x' },
    ])
  })

  it('ranks each phase only from its own games', () => {
    expect(sheets.Vorrunde.map((row) => [row.Gruppe, row.Platz, row.Team])).toEqual([
      ['A', 1, 'Alpha'],
      ['A', 2, 'Beta'],
    ])
    expect(sheets.Finalrunde.map((row) => [row.Gruppe, row.Platz, row.Team])).toEqual([
      ['E', 1, 'Beta'],
      ['E', 2, 'Alpha'],
    ])
  })

  it('exports every game with team names, set scores and winner', () => {
    expect(sheets.Spiele).toHaveLength(2)
    expect(sheets.Spiele[0]).toMatchObject({
      Runde: 'Vorrunde',
      Disziplin: 'Sitzen',
      'Team 1': 'Alpha',
      'Team 2': 'Beta',
      'Satz 1 Team 1': 21,
      'Satz 2 Team 2': 15,
      Sieger: 'Alpha',
    })
  })

  it('decides a set split by total points, equal totals are a draw', () => {
    const split = buildCupSheets(
      teams,
      [game('Vorrunde', 12, 8, 8, 14), game('Vorrunde', 10, 8, 8, 10)],
      groups,
      groupTeams
    )
    expect(split.Spiele.map((row) => row.Sieger)).toEqual(['Beta', ''])
  })

  it('has no ranking for a phase without any played game', () => {
    const unplayed = buildCupSheets(teams, [game('Vorrunde', 21, 15), game('Finalrunde', 0, 0)], groups, groupTeams)
    expect(unplayed.Finalrunde).toEqual([])
  })
})
