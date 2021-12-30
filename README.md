CRDT Protocol

```ts
const client = crdtProtocol<Buffer>(async (message: Message<Buffer>) => {
  await transport.send(message)
}, uuid())
const clientB = crdtProtocol<Buffer>(async (message: Message<Buffer>) => {
  await transport.send(message)
}, uuid())

const message = clientA.createEvent('keyA', Buffer.from('message'))
await clientA.sendMessage(message)
```