// DeviceCard — Cartão que "desencaixa" mostrando portas físicas + valores ao vivo
import React, { useState, useEffect } from 'react'
import { X, Power, AlertTriangle, Radio, Cable, Gauge } from 'lucide-react'

interface PortView {
  id: string
  name: string
  direction: string
  domain: string
  data_type: string
  value: any
}

interface DeviceCardProps {
  deviceId: string | null
  onClose: () => void
}

const DOMAIN_LABEL: Record<string, { color: string; label: string }> = {
  electrical: { color: '#FFB300', label: 'ELÉTRICA' },
  pneumatic:  { color: '#29B6F6', label: 'PNEUMÁTICA' },
  hydraulic:  { color: '#26C6DA', label: 'HIDRÁULICA' },
  data:       { color: '#AB47BC', label: 'DADOS' },
  signal:     { color: '#66BB6A', label: 'SINAL' },
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ deviceId, onClose }) => {
  const [device, setDevice] = useState<any>(null)
  const [tab, setTab] = useState<'ports' | 'props' | 'comm'>('ports')

  useEffect(() => {
    if (!deviceId) { setDevice(null); return }
    const load = () =>
      fetch(`/api/devices/${deviceId}`).then(r => r.json()).then(setDevice).catch(() => {})
    load()
    const iv = setInterval(load, 500) // valores ao vivo
    return () => clearInterval(iv)
  }, [deviceId])

  if (!deviceId || !device) return null

  const ports: PortView[] = Object.values(device.ports || {})
  const inPorts = ports.filter(p => p.direction === 'input')
  const outPorts = ports.filter(p => p.direction === 'output')

  return (
    <div className="flex flex-col h-full bg-[#141922] border-l border-[#232C38]">
      {/* Cabeçalho */}
      <div className="p-3 border-b border-[#232C38] bg-[#1A2130]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="fz-display text-sm text-white">{device.name}</h3>
            <p className="text-[9px] font-mono text-[#6B7787] mt-0.5">{device.id}</p>
          </div>
          <button onClick={onClose} className="text-[#6B7787] hover:text-white"><X size={15} /></button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
            device.state?.powered ? 'bg-[#66BB6A]/15 text-[#66BB6A]' : 'bg-[#6B7787]/15 text-[#6B7787]'
          }`}>
            <Power size={10} /> {device.state?.powered ? 'ENERGIZADO' : 'DESLIGADO'}
          </span>
          {device.state?.error && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EF5350]/15 text-[#EF5350]">
              <AlertTriangle size={10} /> {device.state?.error_msg || 'ERRO'}
            </span>
          )}
          <span className="ml-auto text-[9px] font-mono text-[#6B7787]">{device.layer}</span>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mt-3">
          {[
            { id: 'ports', label: 'Portas', icon: Cable },
            { id: 'props', label: 'Especificações', icon: Gauge },
            { id: 'comm', label: 'Comunicação', icon: Radio },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition ${
                tab === t.id ? 'bg-[#00E5FF]/15 text-[#00E5FF]' : 'text-[#6B7787] hover:text-[#D7DEE8]'
              }`}>
              <t.icon size={10} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'ports' && (
          <div className="space-y-4">
            {/* Entradas */}
            {inPorts.length > 0 && (
              <div>
                <h4 className="fz-label mb-1.5 flex items-center gap-1">▸ Entradas ({inPorts.length})</h4>
                <div className="space-y-1">
                  {inPorts.map(p => <PortRow key={p.id} port={p} />)}
                </div>
              </div>
            )}
            {/* Saídas */}
            {outPorts.length > 0 && (
              <div>
                <h4 className="fz-label mb-1.5 flex items-center gap-1">▸ Saídas ({outPorts.length})</h4>
                <div className="space-y-1">
                  {outPorts.map(p => <PortRow key={p.id} port={p} />)}
                </div>
              </div>
            )}
            {ports.length === 0 && <p className="text-[10px] text-[#6B7787]">Nenhuma porta</p>}
          </div>
        )}

        {tab === 'props' && (
          <div className="space-y-1.5">
            {Object.entries(device.properties || {}).map(([k, v]: any) => (
              <div key={k} className="flex items-center justify-between p-2 bg-[#0B0E13] rounded border border-[#232C38]">
                <span className="text-[10px] text-[#6B7787]">{k}</span>
                <span className="text-[11px] font-mono text-[#D7DEE8]">
                  {typeof v === 'object' ? `${v.value ?? JSON.stringify(v)}${v.unit ? ' ' + v.unit : ''}` : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'comm' && (
          <div className="space-y-2">
            <p className="text-[10px] text-[#6B7787]">Protocolos e endereçamento</p>
            <div className="p-3 bg-[#0B0E13] rounded border border-[#232C38] text-[10px] font-mono text-[#6B7787]">
              Configure em <span className="text-[#AB47BC]">Protocolos</span> no console.
              <br />Endereços ModBus disponíveis quando servidor ativo.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const PortRow: React.FC<{ port: PortView }> = ({ port }) => {
  const dom = DOMAIN_LABEL[port.domain] || DOMAIN_LABEL.signal
  const isActive = port.value === true || (typeof port.value === 'number' && port.value > 0)
  return (
    <div className={`flex items-center gap-2 p-1.5 rounded border transition ${
      isActive ? 'bg-[#0B0E13] border-[#66BB6A]/40' : 'bg-[#0B0E13] border-[#232C38]'
    }`}>
      {/* Conector físico */}
      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{
        background: dom.color,
        boxShadow: isActive ? `0 0 6px ${dom.color}` : 'none',
      }} />
      <span className="text-[10px] text-[#D7DEE8] font-medium w-20 truncate">{port.name}</span>
      <span className="text-[9px] font-mono px-1 rounded" style={{ background: `${dom.color}20`, color: dom.color }}>
        {dom.label}
      </span>
      <span className="ml-auto text-[10px] font-mono" style={{ color: isActive ? '#66BB6A' : '#6B7787' }}>
        {formatValue(port.value)}
      </span>
    </div>
  )
}

function formatValue(v: any): string {
  if (typeof v === 'boolean') return v ? 'ON' : 'OFF'
  if (typeof v === 'number') return v.toFixed(2)
  if (v === null || v === undefined) return '—'
  return String(v).slice(0, 12)
}

export default DeviceCard