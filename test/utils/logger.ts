import { CRDT, Message } from '../../src/types'

function writeToFile(_fileName: string, _data: string) {}

function readFromFile(_filename: string) {
  return ''
}

export function logTest<T = unknown>() {
  const messages: Message<string>[] = []

  function parseData(data: T) {
    if (data instanceof Uint8Array || data instanceof Buffer) {
      return new TextDecoder().decode(data)
    }
    return data.toString()
  }

  function addMessage(message: Message<T>) {
    messages.push({ ...message, data: parseData(message.data) })
  }

  function parseState(state: ReturnType<CRDT<T>['getState']>): string[] {
    return Object.entries(state).map(([key, { data, timestamp }]) =>
      JSON.stringify({ key, data: parseData(data), timestamp }, null, 0)
    )
  }

  function print(state: ReturnType<CRDT<T>['getState']>) {
    const filename = expect.getState().currentTestName
    const messagesToPrint = [
      `# ${filename}`,
      '# Messages sent over the wire',
      ...messages,
      '# End of messages',
      '# Final CRDT State',
      ...parseState(state),
      ''
    ]
    if (!!process.env.DEBUG) {
      messagesToPrint.forEach((m) => console.log(m, '\n'))
    }
    const previousTest = readFromFile(filename)
    if (previousTest) {
      // compare this messagesToPrint with the previous one
      // if there is an error throw
      // expect(previousTest).toEqual(messagesToPrint)
    }
    writeToFile('fileName', messagesToPrint.join(''))
  }

  return {
    addMessage,
    print
  }
}

export default logTest
