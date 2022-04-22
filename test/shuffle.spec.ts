import { CRDT } from '../src'
import { compareStatePayloads, shuffle } from './utils'
import { createSandbox } from './utils/sandbox'

function createMessages(
  client: CRDT<Buffer> & { id: string },
  key: string,
  length: number = 1
) {
  return Array.from({ length }).map((_, index) =>
    client.createEvent(key, Buffer.from(`Message-${index}-${client.id}`))
  )
}

async function prepareSandbox() {
  const { clients, compare } = createSandbox({ clientLength: 3 })
  const [clientA, clientB, clientC] = clients
  const key = 'key-A'
  const m1 = createMessages(clientA, key, 2)
  await Promise.all(m1.map((m) => clientA.sendMessage(m)))

  const m2 = createMessages(clientB, key, 1)[0] // data: Message-1-2
  const m3 = createMessages(clientC, key, 1)[0] // data: Message-1-3
  // m3 > m2. m3 wins.
  await Promise.all([clientB.sendMessage(m2), clientC.sendMessage(m3)])
  const messages = [...m1, m2, m3]

  await compare()
  expect(clientA.getState()[key].data).toStrictEqual(m3.data)

  // A sends to messages, B & C receive them.
  // B & C creates a new message at the same time. C > B so message C wins.
  // Final result: State with message C
  return {
    clients,
    messages
  }
}

describe('Process messages and get the same result', () => {
  it('should process all the messages and get the same state', async () => {
    const { messages, clients } = await prepareSandbox()
    const [clientA] = createSandbox({ clientLength: 1 }).clients

    await Promise.all(
      messages.map(async (message) => await clientA.processMessage(message))
    )

    expect(
      compareStatePayloads([clients[0].getState(), clientA.getState()])
    ).toBe(true)
  })

  it('should process all the messages and get the same state even if we sent them in a diff order', async () => {
    const { messages, clients } = await prepareSandbox()
    const [clientA] = createSandbox({ clientLength: 1 }).clients

    await Promise.all(
      shuffle(messages).map(async (message) => clientA.processMessage(message))
    )

    expect(
      compareStatePayloads([clients[0].getState(), clientA.getState()])
    ).toBe(true)
  })
})
