import { crdtProtocol, Message, State } from '../src'

/**
 * Compare buffer data
 * @internal
 */
export function compareData(a: Buffer, b: Buffer) {
  return a.equals(b)
}

/**
 * Compare state between clients
 * @internal
 */
export function compareStatePayloads(states: State<Buffer>[]) {
  if (!states.length) {
    return true
  }
  const baseState = states[0]
  const keys = Object.keys(baseState)
  return states.every(
    (s) =>
      s.length === baseState.length &&
      keys.every(
        (key) =>
          compareData(s[key].data, baseState[key].data) &&
          s[key].timestamp === baseState[key].timestamp
      )
  )
}

/**
 * Sandbox type opts
 * @internal
 */
type Sandbox = {
  clientLength: number
  delay?: boolean
}

/**
 * Fake sleep ms network
 * @internal
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate clients, transport and compare fns so its easier to write tests.
 * @internal
 */
export function createSandbox(opts: Sandbox) {
  // Fake uuiid generator
  let id = 0
  const getId = () => {
    id = id + 1
    return id.toString()
  }

  /**
   * Transport method to broadcast the messages.
   * @internal
   */
  function broadcast(uuid: string) {
    return {
      send: async (message: Message<Buffer>) => {
        const randomTime = (Math.random() * 100 + 50) | 0
        if (opts.delay) {
          await sleep(randomTime)
        }
        await Promise.all(
          clients.map((c) => c.getUUID() !== uuid && c.processMessage(message))
        )
      }
    }
  }

  /**
   * Generate all the clients
   */
  const clients = Array.from({ length: opts.clientLength }).map(() => {
    const uuid = getId()
    const ws = broadcast(uuid)
    return crdtProtocol<Buffer>(ws.send, uuid)
  })

  /**
   *  Expose fn to compare every client state with each other.
   */
  function compare() {
    expect(compareStatePayloads(clients.map((c) => c.getState()))).toBe(true)
  }

  return {
    compare,
    clients
  }
}

/**
 * Shuffle an array of unknonw values without mutation
 * @internal
 */
export function shuffle<T = unknown>(value: T[]) {
  return value
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}
