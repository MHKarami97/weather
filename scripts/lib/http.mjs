const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404])

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export class HttpError extends Error {
  constructor(status, body) {
    super(`HTTP ${status} ${body}`.trim())
    this.name = 'HttpError'
    this.status = status
  }
}

export async function getJson(url, { headers = {}, attempts = 3, timeoutMs = 25_000 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new HttpError(response.status, body.slice(0, 160))
      }
      return await response.json()
    } catch (error) {
      lastError = error
      if (NON_RETRYABLE_STATUSES.has(error.status) || attempt === attempts) break
      await sleep(1500 * attempt)
    }
  }
  throw lastError
}

/** Runs `worker` over `items` with bounded concurrency. Never throws: every slot is `{ ok, value | error }`. */
export async function settleWithConcurrency(items, limit, worker, delayMs = 0) {
  const results = new Array(items.length)
  let cursor = 0
  const lane = async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index).then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error }),
      )
      if (delayMs) await sleep(delayMs)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
  return results
}
