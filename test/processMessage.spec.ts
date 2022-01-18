import expect from 'expect'

import { compareData, createSandbox } from './utils'

describe('CRDT process message', () => {
  it('should return the data if its a new message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key = 'key-A'
    const messageA = clientA.createEvent(key, Buffer.from('casla'))
    const value = await clientB.processMessage(messageA)

    expect(compareData(value as Buffer, messageA.data)).toBe(true)
  })

  it('should return void if its an outdated message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key = 'key-A'

    clientA.createEvent(key, Buffer.from('casla'))
    clientA.createEvent(key, Buffer.from('casla2'))

    const messageB = clientB.createEvent(key, Buffer.from('boedo'))
    // LamportA: 2, data: casla2
    // LamportB: 1, data: boedo
    const value = await clientA.processMessage(messageB)
    expect(value).toBe(undefined)
  })

  it('should return data if they have the same lamport number but bigger raw value', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key = 'key-A'

    const messageA = clientA.createEvent(key, Buffer.from('casla'))
    const messageB = clientB.createEvent(key, Buffer.from('boedo'))
    // LamportA: 1, data: casla2
    // LamportB: 1, data: boedo
    // dataA > dataB
    const valueB = await clientB.processMessage(messageA)
    const valueA = await clientA.processMessage(messageB)

    expect(valueA).toBe(undefined)
    expect(compareData(valueB as Buffer, messageA.data)).toBe(true)
  })
})
