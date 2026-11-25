import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { useServerErrors } from '@/composables/useServerErrors'
import { isHandled } from '@/utils/handledErrors'

describe('useServerErrors', () => {
  it('forgets the messages and the fields when cleared', async () => {
    const { fields, messages, clear, run } = useServerErrors()
    await run(() =>
      Promise.reject(
        new ApiError({ error: 'conflict', parameters: { 'wallet.name': 'Main' } }, 409),
      ),
    )

    clear()

    expect(messages.value).toEqual([])
    expect(fields.value).toEqual([])
  })

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

  it('names the fields the server says are in conflict and forgets them on the next run', async () => {
    const { fields, run } = useServerErrors()

    await run(() =>
      Promise.reject(
        new ApiError({ error: 'conflict', parameters: { 'card.last-four-digits': '1234' } }, 409),
      ),
    )
    expect(fields.value).toEqual(['lastFourDigits'])

    await run(() => Promise.resolve())
    expect(fields.value).toEqual([])
  })

  it('drops the marks of the fields on demand', async () => {
    const { fields, clearFields, run } = useServerErrors()
    await run(() =>
      Promise.reject(new ApiError({ error: 'conflict', parameters: { 'wallet.name': 'A' } }, 409)),
    )

    clearFields()

    expect(fields.value).toEqual([])
  })

  it('marks the error as handled so no toast repeats it', async () => {
    const { run } = useServerErrors()
    const failure = new ApiError(null, 500)

    await run(() => Promise.reject(failure))

    expect(isHandled(failure)).toBe(true)
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
