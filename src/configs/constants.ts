import type { CupState } from '@/types/tournament'

export const STATE_OPTIONS: CupState[] = ['Bevorstehend', 'Vorrunde', 'Finalrunde', 'Abgeschlossen']

export const VORRUNDE_GROUPS = ['A', 'B', 'C', 'D']
export const FINALRUNDE_GROUPS = ['E', 'F', 'G', 'H']

// Courts 1-3 are played sitting, courts 4-6 standing
export const COURT_IS_SITTING = [true, true, true, false, false, false]

export const TEAMS_PER_CUP = 16

export const MINUTES_PER_ROUND = 30
