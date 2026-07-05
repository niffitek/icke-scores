/**
 * Full Icke-Cup walkthrough over the real API, replaying exactly what the admin
 * UI does: cup -> teams -> Vorrunde -> scores -> Finalrunde seeding -> scores ->
 * final places -> teardown. Scores follow one deterministic rule (the team with
 * the lower group position wins 21:10) so every ranking is hand-checkable.
 */
import * as cupById from '@/app/api/cups/[id]/route'
import * as cups from '@/app/api/cups/route'
import * as games from '@/app/api/games/route'
import * as groupTeams from '@/app/api/group-teams/route'
import * as groups from '@/app/api/groups/route'
import * as roundById from '@/app/api/rounds/[id]/route'
import * as rounds from '@/app/api/rounds/route'
import * as teamById from '@/app/api/teams/[id]/route'
import * as teams from '@/app/api/teams/route'
import { FINALRUNDE_SCHEDULE, VORRUNDE_SCHEDULE } from '@/configs/schedules'
import { buildScheduleGames, computeFinalPlaces, seedFinalGroups } from '@/services/tournament'
import type { Game, Group, GroupTeam } from '@/types/tournament'

import { call, expectOk } from './client'

const CUP_ID = crypto.randomUUID()
const CUP2_ID = crypto.randomUUID()

// The real Icke-Cup line-up; position in the array = position in the group
const LINEUP: Record<string, string[]> = {
  A: ['Berlin Butterflies', 'Generation Mixed', 'Friesen', 'Vorspiel QSV'],
  B: ['All Nations', 'Lichtenberger Löwen', 'Pankow 96', 'Treptow Racoons'],
  C: ['Bodenwischer', 'Klf Sportsfreunde', 'SCC', 'JKO'],
  D: ['Generation Z', 'Lucky Volley', 'HIB Volleys', 'Woltersdorf'],
}

// teamIds['A'][0] = id of A1, etc.
const teamIds: Record<string, string[]> = Object.fromEntries(
  Object.keys(LINEUP).map((letter) => [letter, [1, 2, 3, 4].map(() => crypto.randomUUID())])
)
const teamName = (id: string): string => {
  const letter = Object.keys(teamIds).find((l) => teamIds[l].includes(id))!
  return LINEUP[letter][teamIds[letter].indexOf(id)]
}

const cupGames = async (cupId: string): Promise<Game[]> =>
  ((await expectOk(call(games.GET))) as Game[]).filter((g) => g.icke_cup_id === cupId)

const cupGroups = async (cupId: string): Promise<Group[]> =>
  await expectOk(call(groups.GET, { search: `?icke_cup_id=${cupId}` }))

const allMemberships = async (): Promise<GroupTeam[]> => await expectOk(call(groupTeams.GET))

// Enter scores for every game of one round: position(teamId) decides, lower wins 21:10
const enterScores = async (
  roundName: 'Vorrunde' | 'Finalrunde',
  position: (teamId: string) => number,
  drawRound1GameId?: string
) => {
  const gamesToScore = (await cupGames(CUP_ID)).filter((g) => g.round === roundName)
  const allRounds: { id: string; game_id: string; round_number: number }[] = await expectOk(call(rounds.GET))
  for (const game of gamesToScore) {
    const [p1, p2] = position(game.team_1_id) < position(game.team_2_id) ? [21, 10] : [10, 21]
    for (const round of allRounds.filter((r) => r.game_id === game.id)) {
      const isDraw = game.id === drawRound1GameId && round.round_number === 1
      await expectOk(
        call(roundById.PUT, {
          method: 'PUT',
          params: { id: round.id },
          body: isDraw ? { points_team_1: 15, points_team_2: 15 } : { points_team_1: p1, points_team_2: p2 },
        })
      )
    }
  }
  return gamesToScore.length
}

describe('tournament walkthrough', () => {
  // ---- Phase 1: cup setup --------------------------------------------------
  it('creates the cup with its Vorrunde groups A-D', async () => {
    const res = await call(cups.POST, {
      method: 'POST',
      body: { id: CUP_ID, title: 'Icke-Cup 2026', address: 'Berlin', created_at: '2026-07-04T08:00:00' },
    })
    expect(res.status).toBe(201)

    const created = await cupGroups(CUP_ID)
    expect(created.map((g) => g.name).sort()).toEqual(['A', 'B', 'C', 'D'])

    const cup = ((await expectOk(call(cups.GET))) as { id: string; state: string }[]).find((c) => c.id === CUP_ID)
    expect(cup?.state).toBe('Bevorstehend')
  })

  it('re-creating the same cup fails without leaving duplicate groups', async () => {
    const res = await call(cups.POST, { method: 'POST', body: { id: CUP_ID, title: 'Dupe', address: '' } })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(await cupGroups(CUP_ID)).toHaveLength(4)
  })

  // ---- Phase 2: teams ------------------------------------------------------
  it('registers 16 teams and assigns them 4 per group', async () => {
    const groupsByName = Object.fromEntries((await cupGroups(CUP_ID)).map((g) => [g.name, g.id]))
    for (const [letter, names] of Object.entries(LINEUP)) {
      for (const [index, name] of names.entries()) {
        await expectOk(
          call(teams.POST, {
            method: 'POST',
            body: { id: teamIds[letter][index], name, contact: `${name}@example.com`, icke_cup_id: CUP_ID },
          })
        )
        await expectOk(
          call(groupTeams.POST, {
            method: 'POST',
            body: { group_id: groupsByName[letter], team_id: teamIds[letter][index] },
          })
        )
      }
    }
    const stored = ((await expectOk(call(teams.GET))) as { icke_cup_id: string }[]).filter(
      (t) => t.icke_cup_id === CUP_ID
    )
    expect(stored).toHaveLength(16)
  })

  it('rejects a 17th team and a second group assignment in the same phase', async () => {
    const seventeenth = await call(teams.POST, {
      method: 'POST',
      body: { id: crypto.randomUUID(), name: 'Zu spät', icke_cup_id: CUP_ID },
    })
    expect(seventeenth.status).toBe(409)

    const groupB = (await cupGroups(CUP_ID)).find((g) => g.name === 'B')!
    const doubleAssign = await call(groupTeams.POST, {
      method: 'POST',
      body: { group_id: groupB.id, team_id: teamIds.A[0] },
    })
    expect(doubleAssign.status).toBe(409)
  })

  // ---- Phase 3: a second cup proves isolation ------------------------------
  it('sets up a second cup that must stay untouched', async () => {
    await expectOk(call(cups.POST, { method: 'POST', body: { id: CUP2_ID, title: 'Anderer Cup', address: '' } }))
    const otherTeams = [crypto.randomUUID(), crypto.randomUUID()]
    for (const [i, id] of otherTeams.entries()) {
      await expectOk(call(teams.POST, { method: 'POST', body: { id, name: `Other ${i}`, icke_cup_id: CUP2_ID } }))
    }
    await expectOk(
      call(games.POST, {
        method: 'POST',
        body: {
          icke_cup_id: CUP2_ID,
          team_1_id: otherTeams[0],
          team_2_id: otherTeams[1],
          start_at: '2026-07-05T09:00:00',
          round: 'Vorrunde',
          sitting: 1,
          court: 1,
        },
      })
    )
    expect(await cupGames(CUP2_ID)).toHaveLength(1)
  })

  // ---- Phase 4: Vorrunde ---------------------------------------------------
  it('starts the Vorrunde; a second active cup is rejected', async () => {
    await expectOk(
      call(cupById.PUT, {
        method: 'PUT',
        params: { id: CUP_ID },
        body: { title: 'Icke-Cup 2026', address: 'Berlin', state: 'Vorrunde' },
      })
    )
    const second = await call(cupById.PUT, {
      method: 'PUT',
      params: { id: CUP2_ID },
      body: { title: 'Anderer Cup', address: '', state: 'Vorrunde' },
    })
    expect(second.status).toBe(409)
  })

  it('creates the 48 Vorrunde games, each with two 0:0 rounds and no winner', async () => {
    const schedule = buildScheduleGames(
      VORRUNDE_SCHEDULE,
      'Vorrunde',
      CUP_ID,
      '2026-07-04',
      '09:00',
      (group, pos) => teamIds[group]?.[pos - 1]
    )
    expect(schedule).toHaveLength(48)
    await Promise.all(schedule.map((game) => expectOk(call(games.POST, { method: 'POST', body: game }))))

    const created = (await cupGames(CUP_ID)).filter((g) => g.round === 'Vorrunde')
    expect(created).toHaveLength(48)
    created.forEach((g) => {
      expect(Number(g.round1_points_team_1)).toBe(0)
      expect(g.round1_winner).toBeNull()
      expect(g.round2_winner).toBeNull()
    })
    const allRounds: { game_id: string }[] = await expectOk(call(rounds.GET))
    const gameIds = new Set(created.map((g) => g.id))
    expect(allRounds.filter((r) => gameIds.has(r.game_id))).toHaveLength(96)
  })

  it('re-posting an existing game fails atomically (no third round row)', async () => {
    const [existing] = await cupGames(CUP_ID)
    const res = await call(games.POST, {
      method: 'POST',
      body: {
        id: existing.id,
        icke_cup_id: CUP_ID,
        team_1_id: existing.team_1_id,
        team_2_id: existing.team_2_id,
        start_at: existing.start_at,
        round: 'Vorrunde',
        sitting: 1,
        court: 1,
      },
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    const allRounds: { game_id: string }[] = await expectOk(call(rounds.GET))
    expect(allRounds.filter((r) => r.game_id === existing.id)).toHaveLength(2)
  })

  it('a game against an unknown team is rejected by the DB', async () => {
    const res = await call(games.POST, {
      method: 'POST',
      body: {
        icke_cup_id: CUP_ID,
        team_1_id: crypto.randomUUID(),
        team_2_id: teamIds.A[0],
        start_at: '2026-07-04T09:00:00',
        round: 'Vorrunde',
        sitting: 1,
        court: 1,
      },
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('enters all Vorrunde scores, including one drawn round', async () => {
    const position = (teamId: string): number => {
      const letter = Object.keys(teamIds).find((l) => teamIds[l].includes(teamId))!
      return teamIds[letter].indexOf(teamId) + 1
    }
    // The sitting game A1-A4 gets a 15:15 first round: a draw awards no round win
    const drawGame = (await cupGames(CUP_ID)).find(
      (g) =>
        String(g.sitting) === '1' &&
        [g.team_1_id, g.team_2_id].sort().join() === [teamIds.A[0], teamIds.A[3]].sort().join()
    )!
    expect(await enterScores('Vorrunde', position, drawGame.id)).toBe(48)

    const scored = (await cupGames(CUP_ID)).find((g) => g.id === drawGame.id)!
    expect(scored.round1_winner).toBeNull() // 15:15
    expect(scored.round2_winner).toBe(teamIds.A[0]) // A1 won round 2
  })

  // ---- Phase 5: Finalrunde seeding ------------------------------------------
  it('seeds E-H with the group winners/seconds/thirds/fourths and creates 48 more games', async () => {
    const cup1Teams = ((await expectOk(call(teams.GET))) as { id: string; icke_cup_id: string }[]).filter(
      (t) => t.icke_cup_id === CUP_ID
    )
    const vorrundeGames = (await cupGames(CUP_ID)).filter((g) => g.round === 'Vorrunde')
    const { newGroups, assignments } = seedFinalGroups(
      CUP_ID,
      cup1Teams as never,
      vorrundeGames,
      await cupGroups(CUP_ID),
      await allMemberships()
    )

    // Winners rule: E must hold exactly A1, B1, C1, D1
    const groupE = newGroups.find((g) => g.name === 'E')!
    const eTeams = assignments.filter((a) => a.group_id === groupE.id).map((a) => a.team_id)
    expect(eTeams.sort()).toEqual([teamIds.A[0], teamIds.B[0], teamIds.C[0], teamIds.D[0]].sort())

    for (const group of newGroups) {
      await expectOk(call(groups.POST, { method: 'POST', body: group }))
    }
    for (const assignment of assignments) {
      await expectOk(call(groupTeams.POST, { method: 'POST', body: assignment }))
    }

    // Double-click protection: group E already exists for this cup
    const dupe = await call(groups.POST, {
      method: 'POST',
      body: { id: crypto.randomUUID(), icke_cup_id: CUP_ID, name: 'E' },
    })
    expect(dupe.status).toBeGreaterThanOrEqual(400)

    const byName = Object.fromEntries(
      newGroups.map((g) => [g.name, assignments.filter((a) => a.group_id === g.id).map((a) => a.team_id)])
    )
    const finalGames = buildScheduleGames(
      FINALRUNDE_SCHEDULE,
      'Finalrunde',
      CUP_ID,
      '2026-07-04',
      '13:30',
      (group, pos) => byName[group]?.[pos - 1]
    )
    expect(finalGames).toHaveLength(48)
    await Promise.all(finalGames.map((game) => expectOk(call(games.POST, { method: 'POST', body: game }))))

    await expectOk(
      call(cupById.PUT, {
        method: 'PUT',
        params: { id: CUP_ID },
        body: { title: 'Icke-Cup 2026', address: 'Berlin', state: 'Finalrunde' },
      })
    )
  })

  // ---- Phase 6: Finalrunde + final evaluation --------------------------------
  it('plays the Finalrunde and assigns final places 1-16 exactly once', async () => {
    // In every final group the team from the alphabetically earlier old group wins
    const finalPosition = (teamId: string): number => {
      const letter = Object.keys(teamIds).find((l) => teamIds[l].includes(teamId))!
      return ['A', 'B', 'C', 'D'].indexOf(letter) + 1
    }
    expect(await enterScores('Finalrunde', finalPosition)).toBe(48)

    const cup1Teams = (
      (await expectOk(call(teams.GET))) as { id: string; icke_cup_id: string; name: string; contact: string }[]
    ).filter((t) => t.icke_cup_id === CUP_ID)
    const finalGames = (await cupGames(CUP_ID)).filter((g) => g.round === 'Finalrunde')
    const places = computeFinalPlaces(cup1Teams as never, finalGames, await cupGroups(CUP_ID), await allMemberships())

    for (const { id, final_place } of places) {
      const team = cup1Teams.find((t) => t.id === id)!
      await expectOk(
        call(teamById.PUT, {
          method: 'PUT',
          params: { id },
          body: { name: team.name, contact: team.contact, final_place },
        })
      )
    }
    await expectOk(
      call(cupById.PUT, {
        method: 'PUT',
        params: { id: CUP_ID },
        body: { title: 'Icke-Cup 2026', address: 'Berlin', state: 'Abgeschlossen' },
      })
    )

    const stored = ((await expectOk(call(teams.GET))) as { icke_cup_id: string; name: string; final_place: number }[])
      .filter((t) => t.icke_cup_id === CUP_ID)
      .sort((a, b) => Number(a.final_place) - Number(b.final_place))
    expect(stored.map((t) => Number(t.final_place))).toEqual(Array.from({ length: 16 }, (_, i) => i + 1))

    // E: winners in old-group order, F: the seconds, G: thirds, H: fourths
    expect(stored.map((t) => t.name)).toEqual([
      'Berlin Butterflies',
      'All Nations',
      'Bodenwischer',
      'Generation Z',
      'Generation Mixed',
      'Lichtenberger Löwen',
      'Klf Sportsfreunde',
      'Lucky Volley',
      'Friesen',
      'Pankow 96',
      'SCC',
      'HIB Volleys',
      'Vorspiel QSV',
      'Treptow Racoons',
      'JKO',
      'Woltersdorf',
    ])
    expect(teamName(teamIds.A[0])).toBe('Berlin Butterflies') // sanity: id bookkeeping intact
  })

  // ---- Phase 7: teardown -----------------------------------------------------
  it('refuses to delete a team that has played', async () => {
    const res = await call(teamById.DELETE, { method: 'DELETE', params: { id: teamIds.A[0] } })
    expect(res.status).toBe(409)
  })

  it('deleting the cup cascades everything but leaves the other cup intact', async () => {
    await expectOk(call(cupById.DELETE, { method: 'DELETE', params: { id: CUP_ID } }))

    expect(await cupGames(CUP_ID)).toHaveLength(0)
    expect(await cupGroups(CUP_ID)).toHaveLength(0)
    const remainingTeams = ((await expectOk(call(teams.GET))) as { icke_cup_id: string }[]).filter(
      (t) => t.icke_cup_id === CUP_ID
    )
    expect(remainingTeams).toHaveLength(0)

    const otherGames = await cupGames(CUP2_ID)
    expect(otherGames).toHaveLength(1)
    const allRounds: { game_id: string }[] = await expectOk(call(rounds.GET))
    expect(allRounds.filter((r) => r.game_id === otherGames[0].id)).toHaveLength(2)
  })
})
