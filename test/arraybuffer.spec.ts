import { compareData, createSandbox } from './utils'

function textToUint8Array(value) {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
  return new Uint8Array(stringValue.split('').map((c) => c.charCodeAt(0)))
}

describe('CRDT Uint8Array', () => {
  it('should return the same data', async () => {
    const { clients, compare } = createSandbox<Uint8Array>({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key = 'key-A'

    const messageA = clientA.createEvent(key, textToUint8Array('Hola'))
    const messageB = clientB.createEvent(key, textToUint8Array('Hola'))
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

    const messageA = clientA.createEvent(key, textToUint8Array('a'))
    const messageB = clientB.createEvent(key, textToUint8Array('b'))
    // b > a
    await Promise.all([
      clientB.sendMessage(messageB),
      clientA.sendMessage(messageA)
    ])
    compare()
    expect(
      compareData(clientA.getState()[key].data, textToUint8Array('b'))
    ).toBe(true)
  })
  it('should return the bigger raw data. a.byteLength !== b.byteLength', async () => {
    const { clients, compare } = createSandbox<Uint8Array>({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key = 'key-A'

    const messageA = clientA.createEvent(key, textToUint8Array('aa'))
    const messageB = clientB.createEvent(key, textToUint8Array('b'))
    // b > a
    await Promise.all([
      clientB.sendMessage(messageB),
      clientA.sendMessage(messageA)
    ])
    compare()
    expect(
      compareData(clientA.getState()[key].data, textToUint8Array('b'))
    ).toBe(true)
  })
})
