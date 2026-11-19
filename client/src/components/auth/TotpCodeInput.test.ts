import { mount, type DOMWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import TotpCodeInput from '@/components/auth/TotpCodeInput.vue'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

function boxesOf(wrapper: { findAll: (selector: string) => DOMWrapper<Element>[] }) {
  return wrapper.findAll('input[autocomplete="one-time-code"]')
}

function render(props: Record<string, unknown> = {}) {
  const { plugins } = createTestPlugins()
  const code = ref('')
  const completed: string[] = []
  const Host = defineComponent({
    components: { TotpCodeInput },
    setup: () => ({ code, props, completed }),
    template:
      '<TotpCodeInput ref="input" v-model="code" label="Dígito" v-bind="props" @complete="completed.push($event)" />',
  })
  const wrapper = mount(Host, { attachTo: document.body, global: { plugins } })
  return { wrapper, code, completed }
}

async function typeInto(
  wrapper: ReturnType<typeof render>['wrapper'],
  index: number,
  digit: string,
) {
  const input = boxesOf(wrapper)[index]!
  await input.setValue(digit)
  await settle()
}

describe('TotpCodeInput', () => {
  it('shows six boxes labelled by position, with a separator in the middle', () => {
    const { wrapper } = render()

    const inputs = boxesOf(wrapper)
    expect(inputs).toHaveLength(6)
    expect(inputs[0]!.attributes('aria-label')).toBe('Dígito 1')
    expect(inputs[5]!.attributes('aria-label')).toBe('Dígito 6')
    expect(wrapper.findAll('span[aria-hidden="true"]')).toHaveLength(1)
  })

  it('builds the code digit by digit and reports it when complete', async () => {
    const { wrapper, code, completed } = render()

    for (const [index, digit] of [...'482015'].entries()) {
      await typeInto(wrapper, index, digit)
    }

    expect(code.value).toBe('482015')
    expect(completed).toEqual(['482015'])
  })

  it('shows the digits it was given', () => {
    const { wrapper, code } = render()
    code.value = '123'

    return settle().then(() => {
      const values = boxesOf(wrapper).map((input) => (input.element as HTMLInputElement).value)
      expect(values.slice(0, 3)).toEqual(['1', '2', '3'])
    })
  })

  it('marks every box as invalid when asked to', () => {
    const { wrapper } = render({ invalid: true })

    for (const input of boxesOf(wrapper)) {
      expect(input.attributes('aria-invalid')).toBe('true')
    }
  })

  it('does not mark the boxes as invalid by default', () => {
    const { wrapper } = render()

    expect(boxesOf(wrapper)[0]!.attributes('aria-invalid')).toBeUndefined()
  })

  it('disables the boxes', () => {
    const { wrapper } = render({ disabled: true })

    expect(boxesOf(wrapper)[0]!.attributes('disabled')).toBeDefined()
  })

  it('focuses the first box on demand', async () => {
    const { wrapper } = render()
    const input = wrapper.findComponent(TotpCodeInput)

    ;(input.vm as unknown as { focus: () => void }).focus()

    expect(document.activeElement).toBe(boxesOf(wrapper)[0]!.element)
  })
})
