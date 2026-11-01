// WebSocket Hook — Comunicação com backend
import { useEffect, useRef, useCallback } from 'react'

interface WSMessage {
  type: string
  [key: string]: any
}

export const useWebSocket = (url: string) => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket conectado')
        ws.send(JSON.stringify({ type: 'ping' }))
      }

      ws.onmessage = (event) => {
        const msg: WSMessage = JSON.parse(event.data)
        handleMessage(msg)
      }

      ws.onclose = () => {
        console.log('WebSocket desconectado, reconectando...')
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket erro:', error)
      }
    } catch (e) {
      console.error('Falha ao conectar WebSocket:', e)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }
  }, [url])

  const handleMessage = (msg: WSMessage) => {
    switch (msg.type) {
      case 'simulation_tick':
        // Atualizar estado da simulação
        break
      case 'device_added':
        // Adicionar dispositivo à cena
        break
      case 'protocol_status':
        console.log('Protocol status:', msg.result)
        break
      case 'pong':
        break
      default:
        console.log('WS message:', msg)
    }
  }

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { send, disconnect }
}
