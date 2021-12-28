import { Message, Payload, SendUpdates, State } from './types'
export * from './types'

/**
 * CRDT protocol.
 * Stores the latest state, and decides whenever we have
 * to process and store the new data in case its an update, or
 * to discard and send our local value cause remote it's outdated.
 */
export function crdtProtocol<T>(sendUpdates: SendUpdates<T>) {
  /**
   * Local state where we store the latest lamport timestamp
   * and the raw data value
   */
  let state: State<T> = {}
  /**
   * Every time we create/receive/send a message
   * we should call this fn in order to update the state with the new payload.
   */
  function tickEvent(
    key: string,
    data: T,
    remoteTimestamp?: number
  ): Payload<T> {
    const current = remoteTimestamp || state[key]?.timestamp || 0

    return (state[key] = {
      timestamp: current + 1,
      data
    })
  }

  /**
   * Create an event for the specified key and store the new
   * lamport timestmap and data in the store state.
   */
  function createEvent(key: string, data: T): Message<T> {
    const message = tickEvent(key, data)
    return { key, data: message.data, timestamp: message.timestamp }
  }

  /**
   *
   */
  function sendMessage(key: string, data: T) {
    const event = tickEvent(key, data)
    const message = { ...event, key }
    return sendUpdates(message)
  }

  /**
   * Process the received message only if the lamport number is higher than
   * the current one. If not, seems we have a race condition.
   * The bigger raw data wins, and spreads the network with this new value.
   */
  function processMessage(message: Message<T>) {
    const { key, data, timestamp } = message
    const current = state[key]

    // Somehow the message that we sent came back as an echo.
    if (current?.timestamp === timestamp && current?.data === data) {
      return
    }

    // If the received timestamp is > than our current value,
    // store the new payload and increment our lamport timestamp by one
    if (!current || current.timestamp < timestamp) {
      return tickEvent(key, data, timestamp)
    }

    // If our current timestamp is higher, then send the message
    // to the network with our payload.
    if (current.timestamp > timestamp) {
      return sendMessage(key, current.data)
    }

    // if both timestamps are equal, then we have a race condition.
    // We should compare the raw data and the higher one wins.
    function compareData(current: unknown, data: unknown) {
      return (current as number) > (data as number)
    }
    return compareData(current.data, data)
      ? sendMessage(key, current.data)
      : tickEvent(key, data, timestamp)
  }

  /**
   * Returns the current state
   */
  function getState(): State<T> {
    return { ...state } as State<T>
  }

  /**
   * Returns the current state
   */
  function clearState(): State<T> {
    return (state = {}) as State<T>
  }

  return {
    createEvent,
    sendMessage,
    processMessage,
    getState,
    clearState
  }
}
