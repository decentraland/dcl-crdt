import { sameData, State } from '../../src'

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
  const keys = Object.keys(baseState)
  return states.every(
    (s) =>
      s.length === baseState.length &&
      keys.every(
        (key) =>
          s[key].timestamp === baseState[key].timestamp &&
          compareData(s[key].data, baseState[key].data)
      )
  )
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
