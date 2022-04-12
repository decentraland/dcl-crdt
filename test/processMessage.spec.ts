import expect from 'expect'

import { compareData } from './utils'
import { createSandbox } from './utils/sandbox'

describe('CRDT process message', () => {
  it('should return the data if its a new message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key = 'key-A'
    const messageA = clientA.createEvent(key, Buffer.from('casla'))
    const value = clientB.processMessage(messageA)

    expect(compareData(value.data as Buffer, messageA.data)).toBe(true)
  })

  it('should return void if its an outdated message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key = 'key-A'

    clientA.createEvent(key, Buffer.from('casla'))
    const { data } = clientA.createEvent(key, Buffer.from('casla2'))

    const messageB = clientB.createEvent(key, Buffer.from('boedo'))
    // LamportA: 2, data: casla2
    // LamportB: 1, data: boedo
    const value = clientA.processMessage(messageB)
    await clientB.sendMessage(messageB)
    expect(value.data).toBe(data)
    expect(clientB.getState()[key].data).toBe(data)
  })

  it('should return data if they have the same lamport number but bigger raw value', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key = 'key-A'

    const messageA = clientA.createEvent(key, Buffer.from('casla'))
    const messageB = clientB.createEvent(key, Buffer.from('boedo'))
    // LamportA: 1, data: casla2
    // LamportB: 1, data: boedo
    // dataA > dataB
    const valueB = clientB.processMessage(messageA)
    const valueA = clientA.processMessage(messageB)
    expect(valueA.data).toBe(messageA.data)
    expect(compareData(valueB.data as Buffer, messageA.data)).toBe(true)
  })
})
