import { Message, Payload, SendUpdates, State } from './types'
export * from './types'

/**
 * Compare raw data.
 */
function sameData<T = unknown>(a: T, b: T) {
  if (a instanceof Buffer && b instanceof Buffer) {
    return a.equals(b)
  }
  return a === b
}

/**
 * @public
 * CRDT protocol.
 * Stores the latest state, and decides whenever we have
 * to process and store the new data in case its an update, or
 * to discard and send our local value cause remote it's outdated.
 */
export function crdtProtocol<T>(sendUpdates: SendUpdates<T>, id: string) {
  /**
   * UUID identifier
   */
  const uuid = id

  /**
   * Logger
   */
  function log(...args: any) {
    return
    console.log(`${uuid}: ${JSON.stringify(args, null)}`)
  }

  /**
   * Local state where we store the latest lamport timestamp
   * and the raw data value
   */
  let state: State<T> = {}
  /**
   * Every time we create/receive/send a message
   * we should call this fn in order to update the state
   * and increment the counter by one
   */
  function tickEvent(
    key: string,
    data: T,
    remoteTimestamp?: number
  ): Payload<T> {
    const current = Math.max(remoteTimestamp || 0, state[key]?.timestamp || 0)

    return (state[key] = {
      timestamp: current + 1,
      data
    })
  }

  /**
   * Create an event for the specified key and store the new data and
   * lamport timestmap incremented by one in the state.
   */
  function createEvent(key: string, data: T): Message<T> {
    const message = tickEvent(key, data)
    return { key, data: message.data, timestamp: message.timestamp }
  }

  /**
   * Send generated message, and increment the counter by one
   */
  function sendMessage(message: Message<T>) {
    const { timestamp } = tickEvent(message.key, message.data)
    return sendUpdates({ ...message, timestamp })
  }

  /**
   * Process the received message only if the lamport number is higher than
   * the current one. If not, seems we have a race condition.
   * The bigger raw data wins, and spreads it to the network
   */
  function processMessage(message: Message<T>) {
    const { key, data, timestamp } = message
    const current = state[key]
    log(current, message)
    // Somehow the message that we sent came back as an echo.
    if (sameData(current?.data, data)) {
      log('same data')
      return
    }

    // If the received timestamp is > than our current value,
    // store the new payload and increment our lamport timestamp by one
    if (!current || current.timestamp < timestamp) {
      log('tick event', data, timestamp)
      return tickEvent(key, data, timestamp)
    }

    // If our current timestamp is higher, then send the message
    // to the network with our payload without incrementing the counter.
    if (current.timestamp > timestamp) {
      log('send updates')
      // return sendMessage({
      //   key,
      //   data: current.data,
      //   timestamp: current.timestamp
      // })
      return sendUpdates({
        key,
        timestamp: current.timestamp,
        data: current.data
      })
    }

    // if both timestamps are equal, then we have a race condition.
    // We should compare the raw data and the higher one wins.
    // We MUST increment the counter.
    function compareData(current: unknown, data: unknown) {
      return (current as number) > (data as number)
    }
    log(
      'compare data',
      compareData(current.data, data) ? current : data,
      timestamp
    )
    return compareData(current.data, data)
      ? sendMessage({ key, data: current.data, timestamp: current.timestamp })
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

  /**
   * Returns the uuid
   */
  function getUUID(): string {
    return uuid
  }

  return {
    createEvent,
    sendMessage,
    processMessage,
    getState,
    getUUID,
    clearState
  }
}
