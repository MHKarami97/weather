import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const readJson = async (file) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

/** File layout: <root>/sources/<sourceId>/latest.json and <root>/sources/<sourceId>/provinces/<provinceId>.json */
export class SnapshotStore {
  constructor(rootDir) {
    this.rootDir = rootDir
  }

  sourceDir(sourceId) {
    return path.join(this.rootDir, 'sources', sourceId)
  }

  /** The Windy snapshot predates multi-source support and lives at the root for backward compatibility. */
  readRootLatest() {
    return readJson(path.join(this.rootDir, 'latest.json'))
  }

  readLatest(sourceId) {
    return readJson(path.join(this.sourceDir(sourceId), 'latest.json'))
  }

  readProvince(sourceId, provinceId) {
    return readJson(path.join(this.sourceDir(sourceId), 'provinces', `${provinceId}.json`))
  }

  async writeProvince(sourceId, doc) {
    const dir = path.join(this.sourceDir(sourceId), 'provinces')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, `${doc.id}.json`), JSON.stringify(doc))
  }

  async writeLatest(sourceId, latest) {
    await mkdir(this.sourceDir(sourceId), { recursive: true })
    await writeFile(path.join(this.sourceDir(sourceId), 'latest.json'), JSON.stringify(latest))
  }
}
