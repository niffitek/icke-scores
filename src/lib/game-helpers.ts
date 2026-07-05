import type { Game, GameStatus, Score, Team } from '@/types/tournament'

const LIVE_WINDOW_MS = 3 * 60 * 1000

// Coerce a possibly-string/null score from the API into a number
export const scoreOf = (value: Score | undefined): number => Number(value ?? 0) || 0

export const isSittingGame = (game: Game): boolean => String(game.sitting) === '1'

// A game counts as played once any points were scored — an untouched game must
// not rank as a 0:0 draw. A null check cannot work: games are created with two
// 0:0 rounds, so the API reports 0 (not null) for untouched games.
// ponytail: a genuine both-Sätze-0:0 game counts as unplayed; make the rounds
// points columns nullable if that ever matters.
export const hasScores = (game: Game): boolean =>
  scoreOf(game.round1_points_team_1) > 0 ||
  scoreOf(game.round1_points_team_2) > 0 ||
  scoreOf(game.round2_points_team_1) > 0 ||
  scoreOf(game.round2_points_team_2) > 0

export const getGameStatus = (game: Game, now: Date = new Date()): GameStatus => {
  const start = new Date(game.start_at).getTime()
  if (now.getTime() < start) return 'upcoming'
  if (now.getTime() <= start + LIVE_WINDOW_MS) return 'live'
  return 'finished'
}

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  upcoming: 'Anstehend',
  live: 'Live',
  finished: 'Beendet',
}

export const GAME_STATUS_COLORS: Record<GameStatus, string> = {
  upcoming: 'text-blue-600',
  live: 'text-green-600',
  finished: 'text-gray-600',
}

export type EnrichedGame = Game & {
  team1Name: string
  team2Name: string
  status: GameStatus
}

export const enrichGames = (games: Game[], teams: Team[]): EnrichedGame[] => {
  const teamNames = new Map(teams.map((team) => [team.id, team.name]))
  return games.map((game) => ({
    ...game,
    team1Name: teamNames.get(game.team_1_id) ?? `Team ${game.team_1_id}`,
    team2Name: teamNames.get(game.team_2_id) ?? `Team ${game.team_2_id}`,
    status: getGameStatus(game),
  }))
}

export const compareByStartTimeAndCourt = (a: Game, b: Game): number => {
  const timeDiff = new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  return timeDiff !== 0 ? timeDiff : Number(a.court) - Number(b.court)
}

// "2025-06-14T09:30:00" in local time (the API stores local wall-clock times)
export const toLocalDateTimeString = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}
