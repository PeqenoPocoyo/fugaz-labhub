// Inspector — painel direito no padrão TIA Portal.
// Com dispositivo selecionado: identidade, estado, propriedades e PORTAS
// (com valor vivo e botão de conexão — mesma mecânica do clique na cena).
// Sem seleção: visão geral da bancada (nós, conexões, trens de força).
import React, { useMemo, useState } from 'react'
import type { SceneObject } from '../../store/sceneStore'
import type { DrivetrainView } from '../../store/sceneStore'

interface InspectorProps {
  device: SceneObject | null
  objects: Record<string, SceneObject>
  connections: any[]
  drivetrains: DrivetrainView[]
  onConectarDe: (qualifiedId: string) => void
  onFechar: () => void
  onRemover: (id: string) => void
  onDefinirPropriedade?: (id: string, chave: string, valor: any) => Promise<void>
}

/** formata um valor de porta para exibição curta */
function fmt(v: any): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3)
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 22)
  return String(v).slice(0, 24)
}

const catCor = (c?: string) =>
  c === 'plc' ? 'var(--cat-plc)' : c === 'sensor' ? 'var(--cat-sensor)'
  : c === 'actuator' ? 'var(--cat-actuator)' : c === 'drive' ? 'var(--cat-drive)'
  : c === 'transmission' ? 'var(--cat-transmission)' : c === 'vision' ? 'var(--cat-vision)'
  : 'var(--cat-other)'

export const Inspector: React.FC<InspectorProps> = ({
  device, objects, connections, drivetrains, onConectarDe, onFechar, onRemover, onDefinirPropriedade,
}) => {
  const [aba, setAba] = useState<'propriedades' | 'portas' | 'estado'>('propriedades')
  const [edit, setEdit] = useState<{ chave: string; valor: string } | null>(null)

  const portas = useMemo(() => {
    if (!device?.ports) return []
    return Object.entries(device.ports).map(([pid, p]: [string, any]) => ({
      pid, ...p,
      qualifiedId: p.qualified_id || `${device.id}_${pid}`,
      conectada: !!p.connected_to,
    }))
  }, [device])

  if (!device) {
    // ---------- visão geral ----------
    return (
      <div className="sh-panel" style={{ height: '100%', borderLeft: '1px solid var(--line)' }}>
        <div className="sh-panel-head"><span className="fz-label">Visão geral</span></div>
        <div className="sh-panel-body">
          <table className="sh-grid">
            <tbody>
              <tr><td style={{ color: 'var(--tx-mut)' }}>Nós na bancada</td>
                  <td className="sh-num">{Object.keys(objects).length}</td></tr>
              <tr><td style={{ color: 'var(--tx-mut)' }}>Conexões (fios)</td>
                  <td className="sh-num">{connections.length}</td></tr>
              <tr><td style={{ color: 'var(--tx-mut)' }}>Trens de força</td>
                  <td className="sh-num">{drivetrains.length}</td></tr>
            </tbody>
          </table>

          <div style={{ padding: '8px 6px 4px' }} className="fz-label">Trens de força</div>
          <table className="sh-grid">
            <thead><tr><th>Origem</th><th>Via</th><th style={{ textAlign: 'right' }}>Carga</th></tr></thead>
            <tbody>
              {drivetrains.length === 0 && (
                <tr><td colSpan={3} style={{ color: 'var(--tx-dim)' }}>nenhum</td></tr>
              )}
              {drivetrains.map(d => (
                <tr key={d.id}>
                  <td>{objects[d.source_id]?.type || d.source_id.slice(-6)}</td>
                  <td style={{ color: 'var(--tx-dim)' }}>
                    {d.transmissions.length ? d.transmissions.map(t => (objects[t]?.type || '?')).join(' › ') : 'direto'}
                  </td>
                  <td className="sh-num">{objects[d.target_id]?.type || d.target_id.slice(-6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ---------- dispositivo selecionado ----------
  const st = device.properties || {}
  const erro = (device as any).state?.error
  const rodando = st.running ?? st.on ?? st.active

  const salvar = async (chave: string, bruto: string) => {
    let v: any = bruto
    if (bruto === 'true') v = true; else if (bruto === 'false') v = false
    else if (bruto !== '' && !isNaN(Number(bruto))) v = Number(bruto)
    await onDefinirPropriedade?.(device.id, chave, v)
    setEdit(null)
  }

  return (
    <div className="sh-panel" style={{ height: '100%', borderLeft: '1px solid var(--line)' }}>
      {/* cabeçalho de identidade */}
      <div className="sh-panel-head" style={{ gap: 6 }}>
        <span className="sh-dot" style={{ background: catCor(device.category) }} />
        <span className="fz-mono" style={{ fontSize: 10, color: 'var(--tx)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {device.type}
        </span>
        <button className="sh-btn" style={{ height: 18, padding: '0 5px' }} onClick={onFechar} title="Fechar">✕</button>
      </div>

      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>
        <div className="fz-mono" style={{ fontSize: 9, color: 'var(--tx-dim)' }}>{device.type_id}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {erro
            ? <span className="sh-chip fault">FALHA</span>
            : rodando
              ? <span className="sh-chip ok">RODANDO</span>
              : <span className="sh-chip">PARADO</span>}
          {device.ports && <span className="sh-chip">{Object.keys(device.ports).length} portas</span>}
        </div>
      </div>

      {/* abas */}
      <div className="sh-console-tabs">
        {(['propriedades', 'portas', 'estado'] as const).map(a => (
          <button key={a} className={`sh-tab${aba === a ? ' on' : ''}`} onClick={() => setAba(a)}>{a}</button>
        ))}
      </div>

      <div className="sh-panel-body">
        {aba === 'propriedades' && (
          <table className="sh-grid">
            <tbody>
              {Object.entries(st)
                .filter(([k]) => !k.startsWith('_') && !Array.isArray(st[k]))
                .map(([k, v]) => {
                  const obj = v as any
                  const conf = obj && typeof obj === 'object' && 'value' in obj
                  const valor = conf ? obj.value : v
                  const unidad = conf && obj.unit ? ` ${obj.unit}` : ''
                  return (
                    <tr key={k}>
                      <td style={{ color: 'var(--tx-mut)', width: '46%' }}>{k.replace(/_/g, ' ')}</td>
                      <td className="sh-num"
                        onDoubleClick={() => conf && onDefinirPropriedade && setEdit({ chave: k, valor: String(valor) })}
                        title={conf && onDefinirPropriedade ? 'duplo clique p/ editar' : ''}>
                        {edit?.chave === k ? (
                          <input autoFocus className="fz-mono sh-input" style={{ paddingLeft: 4, height: 16, width: '100%', textAlign: 'right' }}
                            value={edit.valor}
                            onChange={e => setEdit({ chave: k, valor: e.target.value })}
                            onBlur={() => salvar(k, edit.valor)}
                            onKeyDown={e => { if (e.key === 'Enter') salvar(k, edit.valor); if (e.key === 'Escape') setEdit(null) }} />
                        ) : (
                          <>{fmt(valor)}{unidad}</>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}

        {aba === 'portas' && (
          <table className="sh-grid">
            <thead><tr><th>Porta</th><th>Dir</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
            <tbody>
              {portas.map(p => (
                <tr key={p.pid}>
                  <td title={p.name}>
                    {p.name || p.pid}
                    {p.conectada && <span style={{ color: 'var(--ok)', marginLeft: 4 }}>•</span>}
                  </td>
                  <td className="fz-mono" style={{ color: 'var(--tx-dim)', fontSize: 9 }}>
                    {p.direction === 'input' ? 'IN' : p.direction === 'output' ? 'OUT' : 'BI'}
                  </td>
                  <td className="sh-num">{fmt(p.value)}</td>
                  <td style={{ width: 20 }}>
                    <button className="sh-btn" style={{ height: 16, padding: '0 4px', fontSize: 8 }}
                      title="iniciar fiação por esta porta"
                      onClick={() => onConectarDe(p.qualifiedId)}>
                      ⟶
                    </button>
                  </td>
                </tr>
              ))}
              {portas.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--tx-dim)' }}>sem portas</td></tr>}
            </tbody>
          </table>
        )}

        {aba === 'estado' && (
          <table className="sh-grid">
            <tbody>
              {Object.entries(st)
                .filter(([, v]) => Array.isArray(v))
                .map(([k, v]: [string, any]) => (
                  <tr key={k}>
                    <td style={{ color: 'var(--tx-mut)' }}>{k.replace(/_/g, ' ')}</td>
                    <td className="sh-num">{v.length} itens</td>
                  </tr>
                ))}
              <tr><td style={{ color: 'var(--tx-mut)' }}>posição</td>
                <td className="sh-num">{device.position.map(n => n.toFixed(2)).join(', ')}</td></tr>
              <tr><td style={{ color: 'var(--tx-mut)' }}>id</td>
                <td className="sh-num" style={{ fontSize: 8 }}>{device.id}</td></tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="sh-div-h" style={{ padding: 6, display: 'flex', gap: 6 }}>
        <button className="sh-btn danger" style={{ flex: 1 }} onClick={() => onRemover(device.id)}>
          remover da bancada
        </button>
      </div>
    </div>
  )
}

export default Inspector
