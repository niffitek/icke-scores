import * as cupById from '@/app/api/cups/[id]/route'
import * as cups from '@/app/api/cups/route'
import * as games from '@/app/api/games/route'
import * as groupTeams from '@/app/api/group-teams/route'
import * as groups from '@/app/api/groups/route'
import * as login from '@/app/api/login/route'
import * as roundById from '@/app/api/rounds/[id]/route'
import * as rounds from '@/app/api/rounds/route'
import * as teamById from '@/app/api/teams/[id]/route'
import * as teams from '@/app/api/teams/route'

import { call, expectOk } from './client'

const uuid = () => crypto.randomUUID()

describe('auth', () => {
  it('rejects every mutation without the admin token', async () => {
    const attempts = [
      call(cups.POST, { method: 'POST', body: {}, auth: false }),
      call(cupById.PUT, { method: 'PUT', body: {}, params: { id: 'x' }, auth: false }),
      call(cupById.DELETE, { method: 'DELETE', params: { id: 'x' }, auth: false }),
      call(teams.POST, { method: 'POST', body: {}, auth: false }),
      call(teamById.PUT, { method: 'PUT', body: {}, params: { id: 'x' }, auth: false }),
      call(teamById.DELETE, { method: 'DELETE', params: { id: 'x' }, auth: false }),
      call(games.POST, { method: 'POST', body: {}, auth: false }),
      call(groups.POST, { method: 'POST', body: {}, auth: false }),
      call(groupTeams.POST, { method: 'POST', body: {}, auth: false }),
      call(groupTeams.DELETE, { method: 'DELETE', search: '?team_id=x', auth: false }),
      call(roundById.PUT, { method: 'PUT', body: {}, params: { id: 'x' }, auth: false }),
    ]
    for (const attempt of await Promise.all(attempts)) {
      expect(attempt.status).toBe(401)
    }
  })

  it('reads are public', async () => {
    for (const handler of [cups.GET, teams.GET, games.GET, groups.GET, groupTeams.GET, rounds.GET]) {
      expect((await call(handler, { auth: false })).status).toBe(200)
    }
  })

  it('login returns the token only for the right password', async () => {
    const wrong = await call(login.POST, { method: 'POST', body: { password: 'nope' }, auth: false })
    expect(wrong.status).toBe(401)
    const empty = await call(login.POST, { method: 'POST', body: {}, auth: false })
    expect(empty.status).toBe(401)
    const right = await call(login.POST, {
      method: 'POST',
      body: { password: process.env.ADMIN_PASSWORD },
      auth: false,
    })
    expect(right.status).toBe(200)
    expect(right.body.token).toBe(process.env.ADMIN_TOKEN)
  })
})

describe('input validation', () => {
  const cupId = uuid()

  beforeAll(async () => {
    await expectOk(call(cups.POST, { method: 'POST', body: { id: cupId, title: 'Validation Cup', address: '' } }))
  })

  it('cups: POST without id/title is a 400', async () => {
    expect((await call(cups.POST, { method: 'POST', body: { title: 'no id' } })).status).toBe(400)
    expect((await call(cups.POST, { method: 'POST', body: { id: uuid() } })).status).toBe(400)
  })

  it('cups: PUT rejects a typo state and unknown ids', async () => {
    const typo = await call(cupById.PUT, {
      method: 'PUT',
      body: { title: 't', address: '', state: 'vorrunde' },
      params: { id: cupId },
    })
    expect(typo.status).toBe(400)
    const unknown = await call(cupById.PUT, {
      method: 'PUT',
      body: { title: 't', address: '', state: 'Bevorstehend' },
      params: { id: uuid() },
    })
    expect(unknown.status).toBe(404)
  })

  it('teams: POST requires id, name and cup; PUT of unknown team is a 404', async () => {
    expect((await call(teams.POST, { method: 'POST', body: { id: uuid(), name: 'No cup' } })).status).toBe(400)
    expect((await call(teams.POST, { method: 'POST', body: { id: uuid(), icke_cup_id: cupId } })).status).toBe(400)
    const unknown = await call(teamById.PUT, {
      method: 'PUT',
      body: { name: 'x', contact: '' },
      params: { id: uuid() },
    })
    expect(unknown.status).toBe(404)
  })

  it('games: POST validates teams, round, sitting and court', async () => {
    const teamA = uuid()
    const teamB = uuid()
    await expectOk(call(teams.POST, { method: 'POST', body: { id: teamA, name: 'A', icke_cup_id: cupId } }))
    await expectOk(call(teams.POST, { method: 'POST', body: { id: teamB, name: 'B', icke_cup_id: cupId } }))
    const base = { icke_cup_id: cupId, team_1_id: teamA, team_2_id: teamB, round: 'Vorrunde', sitting: 1, court: 1 }

    expect((await call(games.POST, { method: 'POST', body: { ...base, team_2_id: teamA } })).status).toBe(400)
    expect((await call(games.POST, { method: 'POST', body: { ...base, round: 'Halbfinale' } })).status).toBe(400)
    expect((await call(games.POST, { method: 'POST', body: { ...base, sitting: 2 } })).status).toBe(400)
    expect((await call(games.POST, { method: 'POST', body: { ...base, court: 7 } })).status).toBe(400)
    expect((await call(games.POST, { method: 'POST', body: { ...base, team_1_id: null } })).status).toBe(400)
  })

  it('rounds: PUT rejects negative and non-numeric points, 404s unknown rounds', async () => {
    const negative = await call(roundById.PUT, {
      method: 'PUT',
      body: { points_team_1: -1, points_team_2: 5 },
      params: { id: uuid() },
    })
    expect(negative.status).toBe(400)
    const garbage = await call(roundById.PUT, {
      method: 'PUT',
      body: { points_team_1: 'abc', points_team_2: 5 },
      params: { id: uuid() },
    })
    expect(garbage.status).toBe(400)
    const unknown = await call(roundById.PUT, {
      method: 'PUT',
      body: { points_team_1: 21, points_team_2: 10 },
      params: { id: uuid() },
    })
    expect(unknown.status).toBe(404)
  })

  it('group-teams: unknown group 404s, missing fields 400', async () => {
    expect((await call(groupTeams.POST, { method: 'POST', body: { team_id: uuid() } })).status).toBe(400)
    expect((await call(groupTeams.POST, { method: 'POST', body: { group_id: uuid(), team_id: uuid() } })).status).toBe(
      404
    )
    expect((await call(groupTeams.DELETE, { method: 'DELETE', search: '?group_id=x' })).status).toBe(400)
  })
})
