import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys'

// In-memory storage for serverless environment
const memoryStorage = new Map()

export function useMemoryAuthState() {
  const creds = initAuthCreds()
  const keys = {}

  return {
    state: {
      creds,
      keys
    },
    saveCreds: () => {
      // For serverless, we don't persist creds between requests
      // Each request gets fresh auth state
    }
  }
}

export function useInMemoryAuthState(sessionId) {
  let authState = memoryStorage.get(sessionId)

  if (!authState) {
    authState = {
      creds: initAuthCreds(),
      keys: {}
    }
    memoryStorage.set(sessionId, authState)
  }

  return {
    state: {
      creds: authState.creds,
      keys: authState.keys
    },
    saveCreds: () => {
      // Update in-memory storage
      memoryStorage.set(sessionId, authState)
    }
  }
}