/**
 * Struct of the message that's being transfered between clients.
 */
export type Message<T = unknown> = {
  key: string
  timestamp: number
  data: T
}

/**
 * Payload that its being stored in the state.
 */
export type Payload<T = unknown> = {
  timestamp: number
  data: T
}

/**
 * Local state
 */
export type State<T = unknown> = Record<string, Payload<T> | undefined>

/**
 * Function to send updates to the other clients.
 */
export type SendUpdates<T = unknown> = (message: Message<T>) => Promise<void>
