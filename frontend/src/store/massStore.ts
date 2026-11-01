// Mass Store — Gerenciamento de objetos de massa (sólidos, líquidos, gases)
import { create } from 'zustand'

interface MassObject {
  id: string
  material_id: string
  material_name: string
  category: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  mass: number
  volume: number
  density: number
  color: string
  layer: string
}

interface MassState {
  objects: Record<string, MassObject>
  selectedId: string | null
  addObject: (obj: MassObject) => void
  removeObject: (id: string) => void
  updateObject: (id: string, updates: Partial<MassObject>) => void
  selectObject: (id: string | null) => void
  clearObjects: () => void
}

export const useMassStore = create<MassState>((set) => ({
  objects: {},
  selectedId: null,
  addObject: (obj) =>
    set((state) => ({
      objects: { ...state.objects, [obj.id]: obj },
    })),
  removeObject: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.objects
      return {
        objects: rest,
        selectedId: state.selectedId === id ? null : state.selectedId,
      }
    }),
  updateObject: (id, updates) =>
    set((state) => ({
      objects: {
        ...state.objects,
        [id]: { ...state.objects[id], ...updates },
      },
    })),
  selectObject: (id) => set({ selectedId: id }),
  clearObjects: () => set({ objects: {}, selectedId: null }),
}))
