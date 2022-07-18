import { createInterface } from 'readline'
import fs from 'fs-extra'
import path from 'path'

import { CRDT, Message, Payload, State } from '../../src/types'
import { stateIterator } from '../../src'

export function getDataPath(fileName: string) {
  return path.resolve(process.cwd(), 'data', fileName)
}

export async function* readByLine(fileName: string) {
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

export function snapshotTest<T = unknown>() {
  const messages: Message<string>[] = []

  function getTestPath(fileName: string) {
    return path.resolve(process.cwd(), 'test', 'pre-data', fileName)
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
  function dataToString<T>(data: T) {
    if (data instanceof Uint8Array || data instanceof Buffer) {
      return new TextDecoder().decode(data)
    }
    return data.toString()
  }

  function addMessage(message: Message<T>) {
    messages.push({ ...message, data: dataToString(message.data) })
  }

  function stateToString<T>(state: State<T>): string {
    const objState = {}
    for (const [key1, key2, value] of stateIterator(state)) {
      objState[`${key1}.${key2}`] = {
        timestamp: value.timestamp,
        data: dataToString(value.data)
      }
    }
    return JSON.stringify(objState, null, 0)
  }

  async function validateSpec(state: State<T>) {
    const { currentTestName: testName, testPath } = expect.getState()
    const fileName = getfileNameFromSpec(testPath)
    const messagesToPrint = [
      `# ${testName}`,
      '# Messages sent over the wire',
      ...messages.map((m) => JSON.stringify(m, null, 0)),
      '# End of messages',
      '# Final CRDT State',
      stateToString(state),
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
