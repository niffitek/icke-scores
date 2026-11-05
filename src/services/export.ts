import * as XLSX from 'xlsx'

import { FINALRUNDE_GROUPS, VORRUNDE_GROUPS } from '@/configs/constants'
import { compareByStartTimeAndCourt, hasScores, isSittingGame, scoreOf } from '@/lib/game-helpers'
import { rankPhaseGroups } from '@/services/tournament'
import type { Cup, Game, Group, GroupTeam, RoundName, Team } from '@/types/tournament'

type Row = Record<string, string | number>
export type CupSheets = Record<string, Row[]>

const rankingRows = (
  round: RoundName,
  teams: Team[],
  games: Game[],
  groups: Group[],
  groupTeams: GroupTeam[]
): Row[] => {
  const phase = round === 'Vorrunde' ? VORRUNDE_GROUPS : FINALRUNDE_GROUPS
  const roundGames = games.filter((game) => game.round === round)
  // Placement points are handed out even without results; an unplayed phase has no ranking yet
  if (!roundGames.some(hasScores)) return []
  return rankPhaseGroups(teams, roundGames, groups, groupTeams, phase).flatMap((ranking, groupIndex) =>
    ranking.map((stats, index) => ({
      Gruppe: phase[groupIndex],
      Platz: index + 1,
      Team: stats.name,
      Wertung: stats.finalScore,
      'Sitzen Spielpunkte': stats.gamePointsSitting,
      'Sitzen Bälle': stats.totalPointsSitting,
      'Sitzen Gegenbälle': stats.totalPointsAgainstSitting,
      'Stehen Spielpunkte': stats.gamePointsStanding,
      'Stehen Bälle': stats.totalPointsStanding,
      'Stehen Gegenbälle': stats.totalPointsAgainstStanding,
    }))
  )
}

// Everything about a cup as rows per sheet: final places, both phase rankings, all games
export const buildCupSheets = (teams: Team[], games: Game[], groups: Group[], groupTeams: GroupTeam[]): CupSheets => {
  const nameOf = (id: string | null | undefined): string => teams.find((team) => team.id === id)?.name ?? ''
  // Same rule as the ranking: total points over both sets decide, equal = draw
  const winnerOf = (game: Game): string => {
    if (!hasScores(game)) return ''
    const points1 = scoreOf(game.round1_points_team_1) + scoreOf(game.round2_points_team_1)
    const points2 = scoreOf(game.round1_points_team_2) + scoreOf(game.round2_points_team_2)
    if (points1 === points2) return ''
    return nameOf(points1 > points2 ? game.team_1_id : game.team_2_id)
  }

  const placed = teams
    .filter((team) => team.final_place != null && team.final_place !== '')
    .sort((a, b) => Number(a.final_place) - Number(b.final_place))
    .map((team) => ({ Platz: Number(team.final_place), Team: team.name, Kontakt: team.contact ?? '' }))

  const gameRows = [...games].sort(compareByStartTimeAndCourt).map((game) => ({
    Runde: game.round,
    Start: game.start_at.replace('T', ' '),
    Feld: Number(game.court),
    Disziplin: isSittingGame(game) ? 'Sitzen' : 'Stehen',
    'Team 1': nameOf(game.team_1_id),
    'Team 2': nameOf(game.team_2_id),
    'Satz 1 Team 1': scoreOf(game.round1_points_team_1),
    'Satz 1 Team 2': scoreOf(game.round1_points_team_2),
    'Satz 2 Team 1': scoreOf(game.round2_points_team_1),
    'Satz 2 Team 2': scoreOf(game.round2_points_team_2),
    Sieger: winnerOf(game),
  }))

  return {
    Endplatzierungen: placed,
    Vorrunde: rankingRows('Vorrunde', teams, games, groups, groupTeams),
    Finalrunde: rankingRows('Finalrunde', teams, games, groups, groupTeams),
    Spiele: gameRows,
  }
}

// Browser only: builds the workbook and triggers the download
export const downloadCupXlsx = (cup: Cup, sheets: CupSheets): void => {
  const workbook = XLSX.utils.book_new()
  Object.entries(sheets).forEach(([name, rows]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name)
  })
  XLSX.writeFile(workbook, `${cup.title.replace(/[^\w\däöüß-]+/gi, '_')}.xlsx`)
}
