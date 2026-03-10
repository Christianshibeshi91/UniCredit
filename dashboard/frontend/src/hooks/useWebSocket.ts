import { useEffect, useRef, useCallback } from "react"
import { create } from "zustand"

export interface WsEvent {
  type: string
  data: Record<string, unknown>
  timestamp: string
}

interface WsState {
  connected: boolean
  events: WsEvent[]
  automationStatus: "idle" | "running" | "stopped"
  setConnected: (v: boolean) => void
  addEvent: (e: WsEvent) => void
  setAutomationStatus: (s: "idle" | "running" | "stopped") => void
  clearEvents: () => void
}

export const useWsStore = create<WsState>((set) => ({
  connected: false,
  events: [],
  automationStatus: "idle",
  setConnected: (v) => set({ connected: v }),
  addEvent: (e) =>
    set((s) => ({ events: [e, ...s.events].slice(0, 200) })),
  setAutomationStatus: (automationStatus) => set({ automationStatus }),
  clearEvents: () => set({ events: [] }),
}))

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const { setConnected, addEvent, setAutomationStatus } = useWsStore()

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

    ws.onopen = () => {
      setConnected(true)
      retryRef.current = 0
    }

    ws.onmessage = (msg) => {
      try {
        const event: WsEvent = JSON.parse(msg.data)
        addEvent(event)
        if (event.type === "automation_status") {
          setAutomationStatus(event.data.status as "idle" | "running" | "stopped")
        }
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      // Exponential backoff reconnect
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000)
      retryRef.current++
      setTimeout(connect, delay)
    }

    ws.onerror = () => ws.close()
    wsRef.current = ws
  }, [setConnected, addEvent, setAutomationStatus])

  useEffect(() => {
    connect()
    return () => { wsRef.current?.close() }
  }, [connect])

  return wsRef
}
