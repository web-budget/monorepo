import { flushPromises } from '@vue/test-utils'

const ROUNDS = 5

export async function settle() {
  for (let round = 0; round < ROUNDS; round++) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}
