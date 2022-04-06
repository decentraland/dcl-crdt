import { compareData } from './utils'
import { createSandbox } from './utils/sandbox'

describe('CRDT Uint8Array', () => {
  const encode = new TextEncoder()
  it('should return the same data', async () => {
    const { clients, compare } = createSandbox<Uint8Array>({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key = 'key-A'

    const messageA = clientA.createEvent(key, encode.encode('Hola'))
    const messageB = clientB.createEvent(key, encode.encode('Hola'))
    await Promise.all([
      clientB.sendMessage(messageB),
      clientA.sendMessage(messageA)
    ])
    compare()
    expect(compareData(messageA.data, messageA.data)).toBe(true)
  })

  it('should return the bigger raw data', async () => {
    const { clients, compare } = createSandbox<Uint8Array>({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key = 'key-A'

    const messageA = clientA.createEvent(key, encode.encode('a'))
    const messageB = clientB.createEvent(key, encode.encode('b'))
    // b > a
    await Promise.all([
      clientB.sendMessage(messageB),
      clientA.sendMessage(messageA)
    ])
    compare()
    expect(compareData(clientA.getState()[key].data, encode.encode('b'))).toBe(
      true
    )
  })
  it('should return the bigger raw data. a.byteLength !== b.byteLength', async () => {
    const { clients, compare } = createSandbox<Uint8Array>({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key = 'key-A'

    const messageA = clientA.createEvent(key, encode.encode('aa'))
    const messageB = clientB.createEvent(key, encode.encode('b'))
    // b > a
    await Promise.all([
      clientB.sendMessage(messageB),
      clientA.sendMessage(messageA)
    ])
    compare()
    expect(compareData(clientA.getState()[key].data, encode.encode('b'))).toBe(
      true
    )
  })
})
