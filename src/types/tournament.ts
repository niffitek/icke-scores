export type CupState = 'Bevorstehend' | 'Vorrunde' | 'Finalrunde' | 'Abgeschlossen'

export type RoundName = 'Vorrunde' | 'Finalrunde'

export type Cup = {
  id: string
  title: string
  address: string
  state: CupState
  created_at?: string
}

export type Team = {
  id: string
  name: string
  contact: string
  icke_cup_id: string
  place?: number | string | null
  final_place?: number | string | null
}

export type Group = {
  id: string
  name: string
  icke_cup_id: string
}

export type GroupTeam = {
  group_id: string
  team_id: string
}

// Numeric fields may arrive as strings from the PHP API
export type Score = number | string | null

export type Game = {
  id: string
  icke_cup_id: string
  team_1_id: string
  team_2_id: string
  ref_team_id?: string | null
  round: RoundName
  court: number | string
  sitting: number | string
  start_at: string
  points_team_1?: Score
  points_team_2?: Score
  round1_points_team_1?: Score
  round1_points_team_2?: Score
  round2_points_team_1?: Score
  round2_points_team_2?: Score
  round1_winner?: string | null
  round2_winner?: string | null
}

export type GameRound = {
  id: string
  game_id: string
  points_team_1: Score
  points_team_2: Score
}

export type GameStatus = 'upcoming' | 'live' | 'finished'

export type TeamStats = {
  id: string
  name: string
  group?: string
  roundsWonSitting: number
  roundsWonStanding: number
  totalPointsSitting: number
  totalPointsStanding: number
  totalPointsAgainstSitting: number
  totalPointsAgainstStanding: number
  finalScore: number
}

export type TeamStatsMap = Record<string, TeamStats | undefined>
