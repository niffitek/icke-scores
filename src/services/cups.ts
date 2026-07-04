import api from '@/lib/api'
import type { Cup } from '@/types/tournament'

export const getCups = async (): Promise<Cup[]> => {
  const response = await api.get<Cup[]>('/cups')
  return response.data
}

export const getCup = async (id: string): Promise<Cup | undefined> => {
  const cups = await getCups()
  return cups.find((cup) => cup.id === id)
}

export const getActiveCup = async (): Promise<Cup | undefined> => {
  const cups = await getCups()
  return cups.find((cup) => cup.state === 'Vorrunde' || cup.state === 'Finalrunde')
}

export const createCup = async (cup: Cup): Promise<void> => {
  await api.post('/cups', cup)
}

export const updateCup = async (id: string, cup: Partial<Cup>): Promise<void> => {
  await api.put(`/cups/${id}`, cup)
}

export const deleteCup = async (id: string): Promise<void> => {
  await api.delete(`/cups/${id}`)
}
