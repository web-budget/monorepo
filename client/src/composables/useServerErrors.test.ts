import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { useServerErrors } from '@/composables/useServerErrors'

describe('useServerErrors', () => {
  it('reports success and keeps no message', async () => {
    const { messages, run } = useServerErrors()

    expect(await run(() => Promise.resolve())).toBe(true)
    expect(messages.value).toEqual([])
  })

  it('translates the details of an API error', async () => {
    const { messages, run } = useServerErrors()

    const result = await run(() =>
      Promise.reject(
        new ApiError({ error: 'conflict', parameters: { 'wallet.name': 'Main' } }, 409),
      ),
    )

    expect(result).toBe(false)
    expect(messages.value).toEqual(['Nome "Main" já esta em uso'])
  })

  it('translates a detail that has no parameters', async () => {
    const { messages, run } = useServerErrors()

    await run(() => Promise.reject(new ApiError(null, 500)))

    expect(messages.value).toEqual([
      'Tente novamente mais tarde ou entre em contato com o administrador',
    ])
  })

  it('shows nothing for an error handled by navigation', async () => {
    const { messages, run } = useServerErrors()

    expect(await run(() => Promise.reject(new ApiError(null, 403)))).toBe(false)
    expect(messages.value).toEqual([])
  })

  it('falls back to the unknown error for anything else', async () => {
    const { messages, run } = useServerErrors()

    await run(() => Promise.reject(new Error('boom')))

    expect(messages.value).toEqual([
      'Um erro inesperado aconteceu, entre em contato com o administrador',
    ])
  })

  it('clears the previous messages on the next run', async () => {
    const { messages, run } = useServerErrors()
    await run(() => Promise.reject(new ApiError(null, 500)))

    await run(() => Promise.resolve())

    expect(messages.value).toEqual([])
  })
})
