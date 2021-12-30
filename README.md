CRDT Protocol

```ts
type Transport {
  send(message: Message): Promise<void>
  on(event: 'message' | 'error'): Promise<void>
}

const clientA = crdtProtocol<Buffer>(async (message: Message<Buffer>) => {
  await transportA.send(message)
}, uuid())
const clientB = crdtProtocol<Buffer>(async (message: Message<Buffer>) => {
  await transportB.send(message)
}, uuid())

transportA.on('message', clientA.processMessage)
transportB.on('message', clientB.processMessage)

const message = clientA.createEvent('keyA', Buffer.from('message'))
await clientA.sendMessage(message)
```
