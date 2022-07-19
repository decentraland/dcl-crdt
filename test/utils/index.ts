import { sameData, State, stateIterator } from '../../src'

/**
 * Compare buffer data
 * @internal
 */
export function compareData(a: unknown, b: unknown) {
  return sameData(a, b)
}

/**
 * Compare state between clients
 * @internal
 */
export function compareStatePayloads<T = Buffer>(states: State<T>[]) {
  if (!states.length) {
    return true
  }

  const baseState = states[0]
  const key1EqualSizes = states.every((s) => s.size === baseState.size)
  if (!key1EqualSizes) {
    return false
  }

  return states.every((currentState) => {
    for (const [key1, key2, baseStatePayload] of stateIterator(baseState)) {
      const key2EqualSizes = states.every(
        (s) => s.get(key1) && s.get(key1).size === baseState.get(key1).size
      )
      if (!key2EqualSizes) {
        return false
      }

      const currentStatePayload = currentState.get(key1)?.get(key2)
      const isDifferent =
        !currentStatePayload ||
        currentStatePayload.timestamp !== baseStatePayload.timestamp ||
        !compareData(currentStatePayload.data, baseStatePayload.data)

      if (isDifferent) {
        return false
      }
    }
    return true
  })
}

/**
 * Fake sleep ms network
 * @internal
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
