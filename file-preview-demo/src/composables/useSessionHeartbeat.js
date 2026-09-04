import { onMounted, onUnmounted } from 'vue'
import { heartbeat } from '@/api/auth'

const HEARTBEAT_INTERVAL = 60 * 1000

export function useSessionHeartbeat() {
  let timer = null

  async function sendHeartbeat() {
    try {
      await heartbeat()
    } catch {
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') sendHeartbeat()
  }

  onMounted(() => {
    sendHeartbeat()
    timer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    if (timer) window.clearInterval(timer)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return { sendHeartbeat }
}
