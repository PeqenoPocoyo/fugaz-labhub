// Scene Store — Estado da cena (sincronizado com o backend via useWorldSync)
import { create } from 'zustand'

export type WireDomain = 'electrical' | 'pneumatic' | 'hydraulic' | 'data' | 'signal'

export interface SceneObject {
  id: string
  type: string
  type_id?: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  properties: Record<string, any>
  layer: string
  category?: string
}

export interface Connection {
  id: string
  from: [number, number, number]
  to: [number, number, number]
  domain: WireDomain
  properties: Record<string, any>
}

export interface MountSlotView {
  id: string
  device_id: string
  position: [number, number, number]
  occupied: boolean
  label: string
  accepts: string[]
}

export interface ConduitView {
  id: string
  path: [number, number, number][]
  kind: string  // "conduit" | "cable_tray"
}

export interface DrivetrainView {
  id: string
  source_id: string
  target_id: string
  transmissions: string[]
  mode: 'direct' | 'linked'
}

interface SceneState {
  objects: Record<string, SceneObject>
  connections: Connection[]
  slots: MountSlotView[]
  conduits: ConduitView[]
  drivetrains: DrivetrainView[]
  selectedId: string | null
  setWorld: (objects: Record<string, SceneObject>) => void
  setConnections: (connections: Connection[]) => void
  setSlots: (slots: MountSlotView[]) => void
  setConduits: (conduits: ConduitView[]) => void
  setDrivetrains: (d: DrivetrainView[]) => void
  addObject: (obj: SceneObject) => void
  updateObject: (id: string, updates: Partial<SceneObject>) => void
  removeObject: (id: string) => void
  selectObject: (id: string | null) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  objects: {},
  connections: [],
  slots: [],
  conduits: [],
  drivetrains: [],
  selectedId: null,
  setWorld: (objects) => set({ objects }),
  setConnections: (connections) => set({ connections }),
  setSlots: (slots) => set({ slots }),
  setConduits: (conduits) => set({ conduits }),
  setDrivetrains: (drivetrains) => set({ drivetrains }),
  addObject: (obj) => set((s) => ({ objects: { ...s.objects, [obj.id]: obj } })),
  updateObject: (id, updates) =>
    set((s) => ({ objects: { ...s.objects, [id]: { ...s.objects[id], ...updates } } })),
  removeObject: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.objects
      return { objects: rest, selectedId: s.selectedId === id ? null : s.selectedId }
    }),
  selectObject: (id) => set({ selectedId: id }),
}))
