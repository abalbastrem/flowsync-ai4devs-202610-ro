import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, deleteTask, getTasks } from '@/lib/api'

const respondWith = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('deleteTask', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves on a 204, which has no body', async () => {
    const fetchMock = respondWith(new Response(null, { status: 204 }))

    await expect(deleteTask('a-token', 7)).resolves.toBeUndefined()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/tasks\/7$/)
    expect(options.method).toBe('DELETE')
    expect(options.headers.Authorization).toBe('Bearer a-token')
  })

  it('rejects with the status on a 404', async () => {
    respondWith(new Response(null, { status: 404 }))

    const error = await deleteTask('a-token', 7).catch((cause) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
  })
})

describe('getTasks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('gives up on a request that never answers, so polling can carry on', async () => {
    const controller = new AbortController()
    const timeout = vi
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(controller.signal)
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () =>
              reject(new DOMException('Timed out', 'TimeoutError')),
            )
          }),
      ),
    )

    const result = getTasks('a-token').catch((cause) => cause)
    controller.abort()
    const error = await result

    expect(timeout).toHaveBeenCalledWith(10_000)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
  })
})
