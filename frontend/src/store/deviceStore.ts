// Device Store — Biblioteca de dispositivos
import { create } from 'zustand'
import axios from 'axios'

interface DeviceDefinition {
  id: string
  name: string
  category: string
  manufacturer: string
  model: string
  image: string
  dimensions: { width: number; height: number; depth: number }
  ports: Array<{ id: string; type: string; label: string; range?: [number, number] }>
  properties: Record<string, any>
  factory_defaults: Record<string, any>
  protocols: string[]
  physics: Record<string, any>
}

interface DeviceState {
  catalog: DeviceDefinition[]
  categories: string[]
  selectedDeviceType: string | null
  loading: boolean
  fetchCatalog: () => Promise<void>
  selectDeviceType: (type: string | null) => void
}

export const useDeviceStore = create<DeviceState>((set) => ({
  catalog: [],
  categories: [],
  selectedDeviceType: null,
  loading: false,
  fetchCatalog: async () => {
    set({ loading: true })
    try {
      const res = await axios.get('/api/devices/catalog')
      set({ catalog: res.data.devices, categories: res.data.categories, loading: false })
    } catch (e) {
      console.error('Failed to fetch catalog:', e)
      set({ loading: false })
    }
  },
  selectDeviceType: (type) => set({ selectedDeviceType: type }),
}))
