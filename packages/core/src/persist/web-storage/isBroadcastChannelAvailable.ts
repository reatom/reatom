const initIsBroadcastChannelAvailable = () => {
  try {
    if (globalThis.BroadcastChannel) {
      // BroadcastChannel can be banned by security policies, but to know it, you need to instantiate it
      const broadcastChannel = new globalThis.BroadcastChannel('')
      broadcastChannel.close()
      return true
    }

    return false
  } catch {
    return false
  }
}

export const isBroadcastChannelAvailable = /* @__PURE__ */ initIsBroadcastChannelAvailable()
