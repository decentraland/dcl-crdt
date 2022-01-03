import expect from 'expect'

import { compareData, compareStatePayloads, createSandbox } from './utils'

describe('CRDT protocol', () => {
  it('should return true if there is no state', () => {
    expect(compareStatePayloads([])).toBe(true)
  })
  ;[true, false].forEach((delay) => {
    const msg = delay ? '[Delay] ' : ''
    it(`${msg}should store the message A in all the clients`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA] = clients
      const key = 'key-A'
      const messageA = clientA.createEvent(key, Buffer.from('casla'))
      await clientA.sendMessage(messageA)
      compare()
      expect(clientA.getState()[key].data).toBe(messageA.data)
    })

    it(`${msg}one message with more clients (N > 2)`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 20, delay })
      const [clientA] = clients
      const messageA = clientA.createEvent('key-A', Buffer.from('casla'))
      await clientA.sendMessage(messageA)
      compare()
    })

    it(`${msg}should decline message A if both messages are sent at the same time and data B > data A`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA, clientB] = clients
      const key = 'key-A'

      // Buffer('a') > Buffer('z')
      const messageA = clientA.createEvent(key, Buffer.from('a'))
      const messageB = clientB.createEvent(key, Buffer.from('z'))
      const promiseA = clientA.sendMessage(messageA)
      const promiseB = clientB.sendMessage(messageB)
      await Promise.all([promiseA, promiseB])
      compare()
      expect(compareData(clientA.getState()[key].data, messageB.data)).toBe(
        true
      )
    })

    it(`${msg}B > A but with more clients (N > 2)`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 4, delay })
      const [clientA, clientB] = clients
      const key = 'key-A'
      const messageA = clientA.createEvent(key, Buffer.from('a'))
      const messageB = clientB.createEvent(key, Buffer.from('b'))
      const promiseA = clientA.sendMessage(messageA)
      const promiseB = clientB.sendMessage(messageB)
      await Promise.all([promiseA, promiseB])
      compare()
      expect(compareData(clientA.getState()[key].data, messageB.data)).toBe(
        true
      )
    })

    it(`${msg}should store both keys`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
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

    it(`${msg}should store both keys, even if we send the messages in diff order z > a`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA, clientB] = clients
      const keyA = 'key-A'
      const keyB = 'key-B'

      const messageA = clientA.createEvent(keyA, Buffer.from('boedo'))
      const messageB = clientB.createEvent(keyB, Buffer.from('casla'))
      const promises = [
        clientA.sendMessage(messageA),
        clientB.sendMessage(messageB)
      ]
      await Promise.all(promises)
      const messageB2 = clientB.createEvent(keyB, Buffer.from('z'))
      const messageA2 = clientA.createEvent(keyB, Buffer.from('a'))
      const p1 = clientA.sendMessage(messageA2)
      const p2 = clientB.sendMessage(messageB2)

      await Promise.all([p1, p2])
      compare()
      expect(clientA.getState()[keyB].data).toBe(messageB2.data)
    })

    it(`${msg}same as before but with more clients (N > 2)`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 3, delay })
      const [clientA, clientB] = clients
      const keyA = 'key-A'
      const keyB = 'key-B'

      const messageA = clientA.createEvent(keyA, Buffer.from('boedo'))
      const messageB = clientB.createEvent(keyB, Buffer.from('casla'))
      const promises = [
        clientA.sendMessage(messageA),
        clientB.sendMessage(messageB)
      ]
      await Promise.all(promises)
      const messageB2 = clientB.createEvent(keyB, Buffer.from('z'))
      const messageA2 = clientA.createEvent(keyB, Buffer.from('a'))
      const p1 = clientA.sendMessage(messageA2)
      const p2 = clientB.sendMessage(messageB2)
      await Promise.all([p1, p2])
      compare()
      expect(clientA.getState()[keyB].data).toBe(messageB2.data)
    })

    it(`${msg}A, B and C send at the same time for the same key. Bigger raw should win`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 3, delay })
      const [clientA, clientB, clientC] = clients
      const key = 'key-A'

      // Buffer('a') > Buffer('z')
      const messageA = clientA.createEvent(key, Buffer.from('A'))
      const messageB = clientB.createEvent(key, Buffer.from('z'))
      const messageC = clientC.createEvent(key, Buffer.from('C'))
      const p1 = clientA.sendMessage(messageA)
      const p2 = clientB.sendMessage(messageB)
      const p3 = clientC.sendMessage(messageC)
      await Promise.all([p1, p2, p3])
      compare()
      expect(compareData(clientA.getState()[key].data, Buffer.from('z'))).toBe(
        true
      )
    })

    it(`${msg}A sends message, B has higher timestamp.`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 3, delay })
      const [clientA, clientB] = clients
      const key = 'key-A'

      // Buffer('a') > Buffer('z')
      const messageB1 = clientB.createEvent(key, Buffer.from('A'))
      const messageB2 = clientB.createEvent(key, Buffer.from('B'))
      const messageA = clientA.createEvent(key, Buffer.from('C'))
      const p2 = clientB.sendMessage(messageB1)
      const p3 = clientB.sendMessage(messageB2)
      await Promise.all([p2, p3])
      await clientA.sendMessage(messageA)
      compare()
      expect(compareData(clientA.getState()[key].data, Buffer.from('B'))).toBe(
        true
      )
    })
  })
})
