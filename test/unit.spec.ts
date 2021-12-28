import { crdtProtocol, Message, State } from '../src'
import expect from 'expect'

function compareStatePayloads(states: State<Buffer>[]) {
  if (!states.length) {
    return true
  }
  const keys = Object.keys(states[0])
  console.log(states)
  return states.every(
    (s) =>
      s.length === states[0].length &&
      keys.every((key) => s[key].data.equals(states[0][key].data))
  )
}

describe('CRDT protocol', () => {
  it('smoke test', async () => {
    function compare() {
      expect(
        compareStatePayloads([
          server.getState(),
          ...clients.map((c) => c.getState())
        ])
      ).toBe(true)
    }


    // Kind of server. We only receive messages to store the state.
    const ws = {
      send: async (message: Message<Buffer>) => {
        await server.processMessage(message)
        await Promise.all(clients.map((c) => c.processMessage(message)))
      }
    }
    const server = crdtProtocol<Buffer>(async (_message: Message<Buffer>) => {})

    // All the clients that can send messages
    const clients: typeof server[] = []
    const clientA = crdtProtocol<Buffer>(async (message: Message<Buffer>) => {
      await ws.send(message)
    })
    const clientB = crdtProtocol<Buffer>(async (message: Message<Buffer>) => {
      await ws.send(message)
    })
    const clientC = crdtProtocol<Buffer>(async (message: Message<Buffer>) => {
      await ws.send(message)
    })
    clients.push(clientA, clientB, clientC)

    // Start sending messages
    const messageA = clientA.createEvent('key-A', Buffer.from('casla'))
    await clientA.sendMessage(messageA.key, messageA.data)
    compare()
    const messageB = clientA.createEvent('key-A', Buffer.from('boedo'))
    await clientB.sendMessage(messageB.key, messageB.data)
    compare()
  })
})
