import api from '@/lib/api'
import { getDisplayCup } from '@/services/cups'
import type { Cup } from '@/types/tournament'

jest.mock('@/lib/api', () => ({ get: jest.fn() }))

const cup = (id: string, state: Cup['state'], created_at: string): Cup => ({
  id,
  state,
  created_at,
  title: id,
  address: '',
})

const mockCups = (cups: Cup[]) => (api.get as jest.Mock).mockResolvedValue({ data: cups })

describe('getDisplayCup', () => {
  it('prefers the running cup over a newer upcoming one', async () => {
    mockCups([cup('old', 'Vorrunde', '2025-01-01'), cup('new', 'Bevorstehend', '2026-01-01')])
    expect((await getDisplayCup())?.id).toBe('old')
  })

  it('falls back to the newest cup so a finished cup stays visible', async () => {
    mockCups([cup('older', 'Abgeschlossen', '2024-01-01'), cup('latest', 'Abgeschlossen', '2025-01-01')])
    expect((await getDisplayCup())?.id).toBe('latest')
  })

  it('is undefined without cups', async () => {
    mockCups([])
    expect(await getDisplayCup()).toBeUndefined()
  })
})
