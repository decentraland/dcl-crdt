/**
 * Struct of the message that's being transfered between clients.
 * @public
 */
export type Message<T = unknown> = {
  key: string
  timestamp: number
  data: T
}

/**
 * Payload that its being stored in the state.
 * @public
 */
export type Payload<T = unknown> = {
  timestamp: number
  data: T
}

/**
 * Local state
 * @public
 */
export type State<T = unknown> = Record<string, Payload<T> | undefined>

/**
 * CRDT return type
 * @public
 */
export type CRDT<T = unknown> = {
  createEvent(key: string, data: T): Message<T>
  processMessage(message: Message<T>): Message<T>
  getState(): State<T>
  getUUID(): string
}
