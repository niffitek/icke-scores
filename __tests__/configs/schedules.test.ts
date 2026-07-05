import { FINALRUNDE_GROUPS, VORRUNDE_GROUPS } from '@/configs/constants'
import { FINALRUNDE_SCHEDULE, VORRUNDE_SCHEDULE } from '@/configs/schedules'

// The printed PDF plan contained a typo (Endrunde 16:30, Feld 4: "F1-F3" while F1
// was also on Feld 5); these invariants pin the corrected schedules for good.

const ALL_PAIRS = ['1-2', '1-3', '1-4', '2-3', '2-4', '3-4']

const pairKey = (match: string): { group: string; pair: string } => {
  const [left, right] = match.split('-')
  const positions = [left[1], right[1]].sort()
  return { group: left[0], pair: `${positions[0]}-${positions[1]}` }
}

const checkSchedule = (schedule: string[][], groups: string[]) => {
  it('has 8 rounds of 6 fully occupied courts', () => {
    expect(schedule).toHaveLength(8)
    schedule.forEach((row) => expect(row).toHaveLength(6))
  })

  it('only pairs teams within the same group', () => {
    schedule.flat().forEach((match) => {
      const [left, right] = match.split('-')
      expect(left[0]).toBe(right[0])
      expect(groups).toContain(left[0])
      expect(left).not.toBe(right)
    })
  })

  it('never schedules a team on two courts at once', () => {
    schedule.forEach((row) => {
      const busy = row.flatMap((match) => match.split('-'))
      expect(new Set(busy).size).toBe(12)
    })
  })

  it.each(groups)('group %s plays every pairing exactly once sitting and once standing', (group) => {
    const pairsOn = (courts: number[]) =>
      schedule
        .flatMap((row) => courts.map((court) => row[court]))
        .map(pairKey)
        .filter((p) => p.group === group)
        .map((p) => p.pair)
        .sort()

    expect(pairsOn([0, 1, 2])).toEqual(ALL_PAIRS) // sitting courts 1-3
    expect(pairsOn([3, 4, 5])).toEqual(ALL_PAIRS) // standing courts 4-6
  })
}

describe('VORRUNDE_SCHEDULE', () => checkSchedule(VORRUNDE_SCHEDULE, VORRUNDE_GROUPS))
describe('FINALRUNDE_SCHEDULE', () => checkSchedule(FINALRUNDE_SCHEDULE, FINALRUNDE_GROUPS))
