import { describe, expect, it } from 'vitest'
import { problem } from '@/test/crud'
import { useServerErrors } from '@/composables/useServerErrors'

describe('useServerErrors by field', () => {
  it('separates the messages that belong to a field from the general ones', async () => {
    const errors = useServerErrors()

    await errors.run(() =>
      Promise.reject(
        problem(409, {
          error: 'conflicting-properties',
          parameters: { 'compartment.name': 'Car' },
        }),
      ),
    )

    expect(errors.fieldMessages.value).toEqual({
      name: 'Já existe um cofrinho com o nome "Car" nesta carteira',
    })
    expect(errors.fields.value).toEqual(['name'])
    expect(errors.generalMessages.value).toEqual([])

    await errors.run(() => Promise.reject(problem(500)))

    expect(errors.fieldMessages.value).toEqual({})
    expect(errors.generalMessages.value).toHaveLength(1)
  })

  it('puts the refusals of the piggy bank on the value, the target and the date', async () => {
    const errors = useServerErrors()

    await errors.run(() =>
      Promise.reject(
        problem(400, { error: 'insufficient-compartment-balance', parameters: { balance: 1000 } }),
      ),
    )
    expect(Object.keys(errors.fieldMessages.value)).toEqual(['value'])
    expect(errors.fieldMessages.value.value).toMatch(/que é R\$\s?1\.000,00\./)

    await errors.run(() =>
      Promise.reject(problem(400, { error: 'compartment-target-date-in-past' })),
    )
    expect(Object.keys(errors.fieldMessages.value)).toEqual(['targetDate'])

    await errors.run(() =>
      Promise.reject(problem(400, { error: 'invalid-compartment-target-value' })),
    )
    expect(Object.keys(errors.fieldMessages.value)).toEqual(['targetValue'])

    await errors.run(() =>
      Promise.reject(problem(400, { error: 'invalid-compartment-movement-value' })),
    )
    expect(Object.keys(errors.fieldMessages.value)).toEqual(['value'])
  })

  it('keeps a refusal without a field as a general message and clears everything', async () => {
    const errors = useServerErrors()

    await errors.run(() =>
      Promise.reject(
        problem(400, { error: 'compartment-with-balance', parameters: { balance: 1 } }),
      ),
    )

    expect(errors.generalMessages.value).toHaveLength(1)
    expect(errors.fieldMessages.value).toEqual({})

    errors.clear()

    expect(errors.messages.value).toEqual([])
  })
})
