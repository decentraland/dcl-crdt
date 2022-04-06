import { crdtProtocol } from '../../src'
import { Message } from '../../src/types'
import { compareStatePayloads, sleep } from '.'
import logTest from './logger'

/**
 * Sandbox type opts
 * @internal
 */
type Sandbox = {
  clientLength: number
  delay?: boolean
}

/**
 * Generate clients, transport and compare fns so its easier to write tests.
 * @internal
 */
export function createSandbox<T = Buffer>(opts: Sandbox) {
  /**
   *
   */
  const testLogger = logTest()

  /**
   * Transport method to broadcast the messages.
   * @internal
   */
  function broadcast(uuid: string) {
    return {
      send: async (message: Message<T>) => {
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
  const clients = Array.from({ length: opts.clientLength }).map((_, index) => {
    const uuid = `${index}`
    const ws = broadcast(uuid)
    const crdt = crdtProtocol<T>(ws.send, uuid)
    return {
      ...crdt,
      sendMessage: function (message: Message<T>) {
        testLogger.addMessage(message)
        return crdt.sendMessage(message)
      }
    }
  })

  /**
   *  Expose fn to compare every client state with each other.
   *  And also, saves the state in the test file.
   */
  function compare() {
    expect(compareStatePayloads(clients.map((c) => c.getState()))).toBe(true)
    testLogger.print(clients[0].getState())
  }

  return {
    compare,
    clients
  }
}
