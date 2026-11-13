import { create } from 'zustand'

interface NotificationStore {
  nonLues: number
  setNonLues: (n: number) => void
  decrement:  () => void
  reset:      () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  nonLues:    0,
  setNonLues: (n) => set({ nonLues: n }),
  decrement:  () => set((s) => ({ nonLues: Math.max(0, s.nonLues - 1) })),
  reset:      () => set({ nonLues: 0 }),
}))
