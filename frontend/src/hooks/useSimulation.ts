// useSimulation — Hook para controle de simulação via WebSocket
import { useEffect, useCallback, useRef } from 'react'
import { useSceneStore } from '../store/sceneStore'

export const useSimulation = (wsUrl: string) => {
  const wsRef = useRef<WebSocket | null>(null)
  const { addObject, updateObject } = useSceneStore()

  const connect = useCallback(() => {
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[Sim] WebSocket conectado')
      ws.send(JSON.stringify({ type: 'ping' }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'simulation_tick':
            // Atualizar tempo de simulação
            break
          case 'simulation_status':
            console.log('[Sim] Status:', msg.running)
            break
          case 'device_added':
            if (msg.device) {
              addObject({
                id: msg.device.id,
                type: msg.device.type_id,
                position: msg.device.position
                  ? [msg.device.position.x, msg.device.position.y, msg.device.position.z]
                  : [0, 0.5, 0],
                rotation: [0, 0, 0],
                scale: [0.5, 0.5, 0.5],
                properties: msg.device.properties || {},
                layer: 'devices',
              })
            }
            break
          case 'protocol_status':
            console.log('[Sim] Protocol:', msg.result)
            break
          case 'pong':
            break
          default:
            console.log('[Sim] Message:', msg)
        }
      } catch (e) {
        console.error('[Sim] Parse error:', e)
      }
    }

    ws.onclose = () => {
      console.log('[Sim] Desconectado, reconectando em 3s...')
      setTimeout(connect, 3000)
    }

    ws.onerror = (err) => {
      console.error('[Sim] Erro:', err)
    }
  }, [wsUrl, addObject, updateObject])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  const sendCommand = useCallback((command: string, params: Record<string, any> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', command, ...params }))
    }
  }, [])

  const startSimulation = useCallback(() => {
    sendCommand('start_simulation')
  }, [sendCommand])

  const stopSimulation = useCallback(() => {
    sendCommand('stop_simulation')
  }, [sendCommand])

  const addDevice = useCallback((deviceType: string, config: Record<string, any> = {}) => {
    sendCommand('add_device', { device_type: deviceType, config })
  }, [sendCommand])

  const connectProtocol = useCallback((protocol: string, config: Record<string, any>) => {
    sendCommand('connect', { protocol, config })
  }, [sendCommand])

  return {
    startSimulation,
    stopSimulation,
    addDevice,
    connectProtocol,
    sendCommand,
  }
}
