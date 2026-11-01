// Layer Store — Gerenciamento de camadas
import { create } from 'zustand'

interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  color: string
}

interface LayerState {
  layers: Layer[]
  activeLayer: string
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  setOpacity: (id: string, opacity: number) => void
  setActiveLayer: (id: string) => void
  addLayer: (layer: Layer) => void
}

export const useLayerStore = create<LayerState>((set) => ({
  layers: [
    { id: 'infra', name: 'Infraestrutura', visible: true, locked: false, opacity: 1, color: '#64748B' },
    { id: 'circuits', name: 'Circuitos', visible: true, locked: false, opacity: 1, color: '#00D4FF' },
    { id: 'devices', name: 'Dispositivos', visible: true, locked: false, opacity: 1, color: '#FF6B35' },
    { id: 'logic', name: 'Lógica', visible: true, locked: false, opacity: 0.7, color: '#7C3AED' },
    { id: 'data', name: 'Dados', visible: true, locked: false, opacity: 0.5, color: '#10B981' },
    { id: 'vision', name: 'Visão', visible: false, locked: false, opacity: 0.6, color: '#F59E0B' },
  ],
  activeLayer: 'devices',
  toggleVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    })),
  toggleLock: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, locked: !l.locked } : l
      ),
    })),
  setOpacity: (id, opacity) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, opacity } : l
      ),
    })),
  setActiveLayer: (id) => set({ activeLayer: id }),
  addLayer: (layer) =>
    set((state) => ({ layers: [...state.layers, layer] })),
}))
