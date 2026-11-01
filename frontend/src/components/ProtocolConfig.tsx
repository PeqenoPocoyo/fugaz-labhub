// ProtocolConfig — Configuração de protocolos
import React, { useState } from 'react'
import { Settings, Wifi, Plug, Usb } from 'lucide-react'
import axios from 'axios'

const protocols = [
  { id: 'modbus_tcp', name: 'ModBus TCP/IP', icon: Wifi, color: '#00D4FF' },
  { id: 'opc_ua', name: 'OPC UA', icon: Plug, color: '#7C3AED' },
  { id: 'serial_usb', name: 'Serial/USB', icon: Usb, color: '#FF6B35' },
]

const ProtocolConfig: React.FC = () => {
  const [selectedProtocol, setSelectedProtocol] = useState('modbus_tcp')
  const [config, setConfig] = useState({
    host: '192.168.0.1',
    port: 502,
    unit_id: 1,
  })
  const [status, setStatus] = useState<string | null>(null)

  const handleConnect = async () => {
    try {
      const res = await axios.post('/api/protocols/connect', {
        protocol: selectedProtocol,
        config,
      })
      setStatus(res.data.success ? 'Conectado' : `Erro: ${res.data.error}`)
    } catch (e: any) {
      setStatus(`Erro: ${e.message}`)
    }
  }

  const handleDisconnect = async () => {
    try {
      await axios.post(`/api/protocols/disconnect/${selectedProtocol}`)
      setStatus('Desconectado')
    } catch (e: any) {
      setStatus(`Erro: ${e.message}`)
    }
  }

  return (
    <div className="p-3 border-t border-[#2D3748]">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <Settings size={14} /> Protocolos
      </h2>

      {/* Protocol selector */}
      <div className="flex gap-1 mb-3">
        {protocols.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProtocol(p.id)}
            className={`flex-1 px-2 py-1.5 text-[10px] rounded-lg transition ${
              selectedProtocol === p.id
                ? 'bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30'
                : 'text-gray-400 hover:text-white hover:bg-[#2D3748]'
            }`}
          >
            <p.icon size={12} className="mx-auto mb-0.5" />
            {p.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Config fields */}
      <div className="space-y-2 mb-3">
        <div>
          <label className="text-[10px] text-gray-500">Host / IP</label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            className="w-full px-2 py-1 text-xs bg-[#0A0E17] border border-[#2D3748] rounded text-gray-300 focus:outline-none focus:border-[#00D4FF]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">Porta</label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-xs bg-[#0A0E17] border border-[#2D3748] rounded text-gray-300 focus:outline-none focus:border-[#00D4FF]"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Unit ID</label>
            <input
              type="number"
              value={config.unit_id}
              onChange={(e) => setConfig({ ...config, unit_id: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-xs bg-[#0A0E17] border border-[#2D3748] rounded text-gray-300 focus:outline-none focus:border-[#00D4FF]"
            />
          </div>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`text-xs mb-2 px-2 py-1 rounded ${
          status === 'Conectado' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/20 text-[#EF4444]'
        }`}>
          {status}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleConnect}
          className="flex-1 px-3 py-1.5 text-xs bg-[#10B981]/20 text-[#10B981] rounded-lg hover:bg-[#10B981]/30 transition"
        >
          Conectar
        </button>
        <button
          onClick={handleDisconnect}
          className="flex-1 px-3 py-1.5 text-xs bg-[#EF4444]/20 text-[#EF4444] rounded-lg hover:bg-[#EF4444]/30 transition"
        >
          Desconectar
        </button>
      </div>
    </div>
  )
}

export default ProtocolConfig
