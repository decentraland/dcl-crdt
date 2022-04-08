import { createInterface } from 'readline'
import fs from 'fs-extra'
import path from 'path'

import { CRDT, Message } from '../../src/types'

export function snapshotTest<T = unknown>() {
  const messages: Message<string>[] = []

  async function* readByLine(fileName: string) {
    try {
      const fileStream = fs.createReadStream(getDataPath(fileName))
      const interf = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      })
      for await (const line of interf) {
        yield line
      }
    } catch (e) {
      throw new Error(`Expect ${fileName} to exists at data/ folder`)
    }
  }

  function getTestPath(fileName: string) {
    return path.resolve(process.cwd(), 'test', 'pre-data', fileName)
  }

  function getDataPath(fileName: string) {
    return path.resolve(process.cwd(), 'data', fileName)
  }

  function getfileNameFromSpec(spec: string) {
    return path
      .relative(process.cwd(), spec)
      .replace('.ts', '')
      .replace('test/', '')
      .replace('.spec', '.test')
  }

  async function writeToFile(fileName: string, data: string) {
    await fs.appendFile(getTestPath(fileName), data)
  }

  async function validateTestIfExists(
    testName: string,
    fileName: string,
    messages: string[]
  ) {
    let start = false
    let index = 0
    for await (const line of readByLine(fileName)) {
      if (line === messages[0]) {
        start = true
      }

      if (!start) continue

      if (start && line === messages[messages.length - 1]) {
        break
      }

      if (start && line !== messages[index]) {
        expect(line).toEqual(messages[index])
      }
      index++
    }

    if (!start) {
      throw new Error(
        `Spec ${testName} missing at data/${fileName}. Update snapshots`
      )
    }
  }
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

  async function validateSpec(state: ReturnType<CRDT<T>['getState']>) {
    const { currentTestName: testName, testPath } = expect.getState()
    const fileName = getfileNameFromSpec(testPath)
    const messagesToPrint = [
      `# ${testName}`,
      '# Messages sent over the wire',
      ...messages.map((m) => JSON.stringify(m, null, 0)),
      '# End of messages',
      '# Final CRDT State',
      ...parseState(state),
      '#'
    ]

    if (!!process.env.DEBUG) {
      messagesToPrint.forEach((m) => console.log(m, '\n'))
    }

    if (!process.env.CI) {
      await writeToFile(fileName, messagesToPrint.join('\n') + '\n')
    }

    await validateTestIfExists(testName, fileName, messagesToPrint)
  }

  return {
    addMessage,
    validateSpec
  }
}

export default snapshotTest
