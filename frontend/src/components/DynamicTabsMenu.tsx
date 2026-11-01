// DynamicTabsMenu — Menu lateral com abas dinâmicas
// Abas só aparecem quando o elemento correspondente está selecionado
import React, { useState, useMemo } from 'react'
import {
  Settings, Thermometer, Droplets, Wind, Activity,
  Cpu, Zap, Camera, Play, Plus
} from 'lucide-react'

interface TabDefinition {
  id: string
  name: string
  icon: React.FC<any>
  color: string
  requiredDeviceType: string | null
  requiredLayer: string | null
  component: React.FC<any>
}

// Componentes das aba (declarados antes do TAB_DEFINITIONS)
const PropertyPanelTab: React.FC<any> = ({ device }) => (
  <div className="p-3 space-y-2">
    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Dispositivo Selecionado</div>
    <div className="bg-[#0A0E17] border border-[#2D3748] rounded-lg p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400">ID</span>
        <span className="text-[10px] font-mono text-gray-300">{device?.id || '-'}</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400">Tipo</span>
        <span className="text-[10px] font-mono text-[#00D4FF]">{device?.type || '-'}</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400">Camada</span>
        <span className="text-[10px] font-mono text-gray-300">{device?.layer || '-'}</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400">Posição</span>
        <span className="text-[10px] font-mono text-gray-300">
          {device?.position?.map?.((p: number) => p.toFixed(2)).join(', ') || '-'}
        </span>
      </div>
    </div>
  </div>
)

const IOTab: React.FC<any> = ({ device }) => (
  <div className="p-3 space-y-3">
    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Entradas/Saídas</div>
    <div className="bg-[#0A0E17] border border-[#2D3748] rounded-lg p-2">
      {device?.ports ? Object.entries(device.ports).map(([id, port]: any) => (
        <div key={id} className="flex items-center justify-between mb-2 p-1.5 bg-[#1A1F2E]/50 rounded border border-[#2D3748]/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00D4FF] shrink-0" />
            <span className="text-[10px] text-gray-300 font-mono">{port.label || id}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600">{port.type}</span>
            <div className="w-6 h-2 bg-[#2D3748] rounded-full overflow-hidden">
              <div className="h-full bg-[#10B981] w-1/2" />
            </div>
          </div>
        </div>
      )) : (
        <div className="text-center py-4 text-[10px] text-gray-500">
          Nenhuma I/O configurada
        </div>
      )}
    </div>
    <div className="mt-2">
      <button className="w-full py-1.5 text-xs text-[#00D4FF] hover:text-white bg-[#00D4FF]/10 rounded hover:bg-[#00D4FF]/20 transition flex items-center justify-center gap-1">
        <Plus size={12} /> Configurar I/O
      </button>
    </div>
  </div>
)

const SimulationTab: React.FC = () => (
  <div className="p-3 space-y-3">
    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Controle de Simulação</div>
    <div className="bg-[#0A0E17] border border-[#2D3748] rounded-lg p-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-gray-400">Status</span>
        <span className="text-[10px] font-mono text-[#10B981]">● Parado</span>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-[#10B981]/20 text-[#10B981] rounded hover:bg-[#10B981]/30 transition flex items-center justify-center gap-1">
          <Play size={14} /> Iniciar
        </button>
        <button className="flex-1 py-2 bg-[#EF4444]/20 text-[#EF4444] rounded hover:bg-[#EF4444]/30 transition flex items-center justify-center gap-1">
          ■ Parar
        </button>
      </div>
      <div className="mt-2">
        <label className="text-[10px] text-gray-500 block mb-1">Velocidade</label>
        <input type="range" min="0.1" max="10" step="0.1" value="1" className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]" />
      </div>
    </div>
  </div>
)

const VisionTab: React.FC<any> = () => (
  <div className="p-3 space-y-3">
    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Visão Computacional</div>
    <div className="bg-[#0A0E17] border border-[#2D3748] rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">Câmera</span>
        <span className="text-[10px] font-mono text-[#00D4FF]">Ativa</span>
      </div>
      <div className="h-24 bg-[#0A0E17] rounded border border-[#2D3748] flex items-center justify-center">
        <span className="text-[10px] text-gray-600">Sem sinal</span>
      </div>
      <div className="mt-2 flex gap-2">
        <button className="flex-1 py-1.5 text-xs text-[#00D4FF] hover:text-white bg-[#00D4FF]/10 rounded hover:bg-[#00D4FF]/20 transition flex items-center justify-center gap-1">
          <Camera size={12} /> Ativar
        </button>
      </div>
    </div>
  </div>
)

const ThermalTab: React.FC = () => (
  <div className="p-3 space-y-3">
    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Análise Térmica</div>
    <div className="bg-[#0A0E17] border border-[#2D3748] rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">Temperatura</span>
        <span className="text-[10px] font-mono text-[#FF6B35]">25°C</span>
      </div>
      <div className="h-1 bg-[#2D3748] rounded-full overflow-hidden mb-2">
        <div className="h-full bg-[#FF6B35] w-1/4" />
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">Limite</span>
        <span className="text-[10px] font-mono text-gray-300">85°C</span>
      </div>
    </div>
  </div>
)

const OilTab: React.FC = () => (
  <div className="p-3 space-y-3">
    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Óleo & Lubrificante</div>
    <div className="bg-[#0A0E17] border border-[#2D3748] rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">TBN</span>
        <span className="text-[10px] font-mono text-[#10B981]">10.0</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">Vida Útil</span>
        <span className="text-[10px] font-mono text-[#10B981]">85%</span>
      </div>
    </div>
  </div>
)

const GasTab: React.FC = () => (
  <div className="p-3 space-y-3">
    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Gases & Pneumática</div>
    <div className="bg-[#0A0E17] border border-[#2D3748] rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">Pressão</span>
        <span className="text-[10px] font-mono text-[#3B82F6]">6.0 bar</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">Pureza</span>
        <span className="text-[10px] font-mono text-[#3B82F6]">99.5%</span>
      </div>
    </div>
  </div>
)

const VibrationTab: React.FC = () => (
  <div className="p-3 space-y-3">
    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Vibração</div>
    <div className="bg-[#0A0E17] border border-[#2D3748] rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">RMS</span>
        <span className="text-[10px] font-mono text-[#EC4899]">0.5 mm/s</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">Status</span>
        <span className="text-[10px] font-mono text-[#10B981]">Normal</span>
      </div>
    </div>
  </div>
)

const TAB_DEFINITIONS: TabDefinition[] = [
  {
    id: 'properties',
    name: 'Propriedades',
    icon: Settings,
    color: '#00D4FF',
    requiredDeviceType: null,
    requiredLayer: null,
    component: PropertyPanelTab,
  },
  {
    id: 'io_control',
    name: 'I/Os & Conexão',
    icon: Zap,
    color: '#FF6B35',
    requiredDeviceType: null,
    requiredLayer: null,
    component: IOTab,
  },
  {
    id: 'simulation',
    name: 'Simulação',
    icon: Play,
    color: '#10B981',
    requiredDeviceType: null,
    requiredLayer: null,
    component: SimulationTab,
  },
  {
    id: 'vision',
    name: 'Visão Computacional',
    icon: Camera,
    color: '#7C3AED',
    requiredDeviceType: 'camera_ip',
    requiredLayer: null,
    component: VisionTab,
  },
  {
    id: 'thermal',
    name: 'Térmico',
    icon: Thermometer,
    color: '#F59E0B',
    requiredDeviceType: null,
    requiredLayer: null,
    component: ThermalTab,
  },
  {
    id: 'oil',
    name: 'Óleo & Lubrificante',
    icon: Droplets,
    color: '#8B5CF6',
    requiredDeviceType: null,
    requiredLayer: null,
    component: OilTab,
  },
  {
    id: 'gas',
    name: 'Gases & Pneumática',
    icon: Wind,
    color: '#3B82F6',
    requiredDeviceType: null,
    requiredLayer: null,
    component: GasTab,
  },
  {
    id: 'vibration',
    name: 'Vibração',
    icon: Activity,
    color: '#EC4899',
    requiredDeviceType: null,
    requiredLayer: null,
    component: VibrationTab,
  },
]

export const DynamicTabsMenu: React.FC<{ selectedDevice: any }> = ({ selectedDevice }) => {
  const [activeTab, setActiveTab] = useState('properties')

  const availableTabs = useMemo(() => {
    return TAB_DEFINITIONS.filter(tab => {
      if (tab.requiredDeviceType && selectedDevice?.type !== tab.requiredDeviceType) {
        return false
      }
      if (tab.requiredLayer && selectedDevice?.layer !== tab.requiredLayer) {
        return false
      }
      return true
    })
  }, [selectedDevice])

  React.useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id)
    }
  }, [availableTabs, activeTab])

  const TabComponent = availableTabs.find(t => t.id === activeTab)?.component || PropertyPanelTab

  return (
    <div className="border-t border-[#2D3748] bg-[#1A1F2E] flex flex-col min-h-0">
      <div className="flex-1 overflow-x-auto px-2 py-1.5 bg-[#161B26]/50 border-b border-[#2D3748] scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                    : 'text-gray-400 hover:text-white hover:bg-[#2D3748]/50'
                }`}
              >
                <tab.icon size={11} className={`shrink-0 ${isActive ? 'text-[#00D4FF]' : 'text-gray-500'}`} />
                <span className={`text-[9px] font-medium whitespace-nowrap ${isActive ? 'text-[#00D4FF]' : 'text-gray-400'}`}>
                  {tab.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {availableTabs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <Cpu size={32} className="mb-2 opacity-50" />
            <p className="text-[10px]">Selecione um dispositivo<br className="hidden sm:block" />para acessar as opções</p>
          </div>
        ) : (
          <TabComponent device={selectedDevice} />
        )}
      </div>
    </div>
  )
}
