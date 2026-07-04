import { adminRoute, json, publicRoute, sql } from '../lib'

export const GET = publicRoute(async () =>
  // Round winners are derived from points here instead of being stored
  json(
    await sql()`
    SELECT g.*,
           r1.points_team_1 AS round1_points_team_1, r1.points_team_2 AS round1_points_team_2,
           CASE WHEN r1.points_team_1 > r1.points_team_2 THEN g.team_1_id
                WHEN r1.points_team_2 > r1.points_team_1 THEN g.team_2_id END AS round1_winner,
           r2.points_team_1 AS round2_points_team_1, r2.points_team_2 AS round2_points_team_2,
           CASE WHEN r2.points_team_1 > r2.points_team_2 THEN g.team_1_id
                WHEN r2.points_team_2 > r2.points_team_1 THEN g.team_2_id END AS round2_winner
    FROM games g
    LEFT JOIN rounds r1 ON g.id = r1.game_id AND r1.round_number = 1
    LEFT JOIN rounds r2 ON g.id = r2.game_id AND r2.round_number = 2
    ORDER BY g.start_at`
  )
)

export const POST = adminRoute(async (req) => {
  const data = await req.json()
  const id = data.id || crypto.randomUUID()
  const db = sql()
  // Game plus its two empty rounds, atomically
  await db.transaction([
    db`INSERT INTO games (id, icke_cup_id, team_1_id, team_2_id, start_at, round, sitting, court)
       VALUES (${id}, ${data.icke_cup_id}, ${data.team_1_id}, ${data.team_2_id},
               ${data.start_at}, ${data.round}, ${data.sitting}, ${data.court})`,
    db`INSERT INTO rounds (id, game_id, round_number)
       VALUES (${crypto.randomUUID()}, ${id}, 1)`,
    db`INSERT INTO rounds (id, game_id, round_number)
       VALUES (${crypto.randomUUID()}, ${id}, 2)`,
  ])
  return json({ success: true }, 201)
})
