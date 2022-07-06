import { CRDT, Message, Payload, State } from './types'
export * from './types'

/**
 * Compare raw data.
 * @internal
 */
export function sameData<T>(a: T, b: T): boolean {
  // At reference level
  if (a === b) return true

  if (Buffer) {
    if (a instanceof Buffer && b instanceof Buffer) {
      // Deep level
      return a.equals(b)
    }
  }

  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.byteLength !== b.byteLength) {
      return false
    }

    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) {
        return false
      }
    }
    return true
  }

  return false
}

/**
 * @public
 * CRDT protocol.
 * Stores the latest state, and decides whenever we have
 * to process and store the new data in case its an update, or
 * to discard and send our local value cause remote it's outdated.
 */
export function crdtProtocol<
  T extends number | Uint8Array | Buffer | string
>(): CRDT<T> {
  /**
   * Local state where we store the latest lamport timestamp
   * and the raw data value
   * @internal
   */
  const state: State<T> = {}

  /**
   * We should call this fn in order to update the state
   * @internal
   */
  function updateState(
    key: string,
    data: T | null,
    remoteTimestamp: number
  ): Payload<T> {
    const timestamp = Math.max(remoteTimestamp, state[key]?.timestamp || 0)

    return (state[key] = { timestamp, data })
  }

  /**
   * Create an event for the specified key and store the new data and
   * lamport timestmap incremented by one in the state.
   * @public
   */
  function createEvent(key: string, data: T | null): Message<T> {
    // Increment the timestamp
    const timestamp = (state[key]?.timestamp || 0) + 1
    updateState(key, data, timestamp)

    return { key, data, timestamp }
  }

  /**
   * Process the received message only if the lamport number recieved is higher
   * than the stored one. If its lower, we spread it to the network to correct the peer.
   * If they are equal, the bigger raw data wins.

   * Returns the recieved data if the lamport number was bigger than ours.
   * If it was an outdated message, then we return void
   * @public
   */
  function processMessage(message: Message<T>): Message<T> {
    const { key, data, timestamp } = message
    const current = state[key]

    // The received message is > than our current value, update our state.
    if (!current || current.timestamp < timestamp) {
      updateState(key, data, timestamp)
      return message
    }

    // Outdated Message. Resend our state message through the wire.
    if (current.timestamp > timestamp) {
      return {
        key,
        data: current.data,
        timestamp: current.timestamp
      }
    }

    // Same data, same timestamp. Weirdo echo message.
    if (sameData(current.data, data)) {
      return message
    }

    // Race condition, same timestamp diff data.
    function compareData(current: T | null, data: T | null) {
      return current! > data!
    }

    if (compareData(current.data, data)) {
      return {
        key,
        data: current.data,
        timestamp: current.timestamp
      }
    }
    updateState(key, data, timestamp).data
    return message
  }

  /**
   * Returns the current state
   * @public
   */
  function getState(): State<T> {
    return { ...state } as State<T>
  }

  return {
    createEvent,
    processMessage,
    getState
  }
}
