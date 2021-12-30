import { crdtProtocol, Message, State } from '../src'
import expect from 'expect'

/**
 * Compare buffer data
 */
function compareData(a: Buffer, b: Buffer) {
  return a.equals(b)
}

/**
 * Compare state between clients
 */
function compareStatePayloads(states: State<Buffer>[]) {
  if (!states.length) {
    return true
  }
  const keys = Object.keys(states[0])
  // console.log(states)
  return states.every(
    (s) =>
      s.length === states[0].length &&
      keys.every((key) => compareData(s[key].data, states[0][key].data))
  )
}

/**
 * Sandbox type opts
 */
type Sandbox = {
  clientLength: number
}

/**
 * Generate clients, transport and compare fns so its easier to write tests.
 */
function createSandbox(opts: Sandbox) {
  // Fake uuiid generator
  let id = 0
  const getId = () => {
    id = id + 1
    return id.toString()
  }

  /**
   * Transport method to broadcast the messages.
   */
  function broadcast(uuid: string) {
    return {
      send: async (message: Message<Buffer>) => {
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

describe('CRDT protocol', () => {
  it('should store the message A in all the clients', async () => {
    const { clients, compare } = createSandbox({ clientLength: 2 })
    const [clientA] = clients
    const key = 'key-A'
    const messageA = clientA.createEvent(key, Buffer.from('casla'))
    await clientA.sendMessage(messageA)
    compare()
    expect(clientA.getState()[key].data).toBe(messageA.data)
  })

  it('same as before but with more clients (N > 2)', async () => {
    const { clients, compare } = createSandbox({ clientLength: 20 })
    const [clientA] = clients
    const messageA = clientA.createEvent('key-A', Buffer.from('casla'))
    await clientA.sendMessage(messageA)
    compare()
  })

  it('should decline message A if both messages are sent at the same time and data B > data A', async () => {
    const { clients, compare } = createSandbox({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key = 'key-A'

    // Buffer('a') > Buffer('z')
    const messageA = clientA.createEvent(key, Buffer.from('a'))
    const messageB = clientB.createEvent(key, Buffer.from('z'))
    const promiseA = clientA.sendMessage(messageA)
    const promiseB = clientB.sendMessage(messageB)
    await Promise.all([promiseA, promiseB])
    compare()
    expect(compareData(clientA.getState()[key].data, messageB.data)).toBe(true)
  })

  it('same as before but with more clients (N > 2)', async () => {
    const { clients, compare } = createSandbox({ clientLength: 20 })
    const [clientA, clientB] = clients
    const key = 'key-A'
    const messageA = clientA.createEvent(key, Buffer.from('boedo'))
    const messageB = clientB.createEvent(key, Buffer.from('casla'))
    const promiseA = clientA.sendMessage(messageA)
    const promiseB = clientB.sendMessage(messageB)
    await Promise.all([promiseA, promiseB])
    compare()
    expect(compareData(clientA.getState()[key].data, messageB.data)).toBe(true)
  })

  it('should store both keys', async () => {
    const { clients, compare } = createSandbox({ clientLength: 2 })
    const [clientA, clientB] = clients
    const keyA = 'key-A'
    const keyB = 'key-B'

    const messageA = clientA.createEvent(keyA, Buffer.from('boedo'))
    const messageB = clientB.createEvent(keyB, Buffer.from('casla'))

    const p1 = clientA.sendMessage(messageA)
    const p2 = clientB.sendMessage(messageB)
    await Promise.all([p1, p2])

    const messageB2 = clientB.createEvent(keyB, Buffer.from('a'))
    const messageA2 = clientA.createEvent(keyB, Buffer.from('z'))
    const p3 = clientB.sendMessage(messageB2)
    const p4 = clientA.sendMessage(messageA2)
    await Promise.all([p3, p4])
    compare()
    expect(clientA.getState()[keyB].data).toBe(messageA2.data)
  })

  it('should store both keys, even if we send the messages in diff order z > a', async () => {
    const { clients, compare } = createSandbox({ clientLength: 2 })
    const [clientA, clientB] = clients
    const keyA = 'key-A'
    const keyB = 'key-B'

    const messageA = clientA.createEvent(keyA, Buffer.from('boedo'))
    const messageB = clientB.createEvent(keyB, Buffer.from('casla'))
    await Promise.all([
      clientA.sendMessage(messageA),
      clientB.sendMessage(messageB)
    ])

    const messageB2 = clientB.createEvent(keyB, Buffer.from('z'))
    const messageA2 = clientA.createEvent(keyB, Buffer.from('a'))
    const p1 = clientA.sendMessage(messageA2)
    const p2 = clientB.sendMessage(messageB2)
    await Promise.all([p1, p2])

    compare()
    expect(clientA.getState()[keyB].data).toBe(messageB2.data)
  })

  it('same as before but with more clients (N > 2)', async () => {
    const { clients, compare } = createSandbox({ clientLength: 20 })
    const [clientA, clientB, clientC] = clients
    const keyA = 'key-A'
    const keyB = 'key-B'

    const messageA = clientA.createEvent(keyA, Buffer.from('boedo'))
    const messageB = clientB.createEvent(keyB, Buffer.from('casla'))
    const promises = []
    promises.push(clientA.sendMessage(messageA))
    promises.push(clientB.sendMessage(messageB))

    const messageB2 = clientB.createEvent(keyB, Buffer.from('a'))
    const messageC = clientC.createEvent(keyB, Buffer.from('z'))
    promises.push(clientC.sendMessage(messageC))
    promises.push(clientB.sendMessage(messageB2))
    await Promise.all(promises)
    compare()
  })
})
