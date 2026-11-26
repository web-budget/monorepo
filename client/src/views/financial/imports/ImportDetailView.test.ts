import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importsApi } from '@/api/imports'
import { IMPORT_POLLING_INTERVAL } from '@/composables/useImportPolling'
import { buttonWithText, mountView, problem } from '@/test/crud'
import type { ImportView } from '@/types'
import ImportDetailScreen from '@/views/financial/imports/ImportDetailView.vue'

vi.mock('@/api/imports')

const visa = { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' }
const checking = { id: 'w-1', name: 'Conta corrente' }
const financialPeriod = { id: 'p-11', name: 'Novembro de 2026', status: 'OPEN', expired: false }

function entry(overrides: Partial<ImportView>): ImportView {
  return {
    id: 'i-1',
    fileName: 'fatura-visa-novembro.ofx',
    target: 'CARD',
    card: visa,
    financialPeriod,
    status: 'READY',
    createdOn: '2026-11-26T09:02:00',
    ...overrides,
  } as ImportView
}

async function render(item: ImportView) {
  vi.mocked(importsApi.findById).mockResolvedValue(item)
  return mountView(ImportDetailScreen, 'imports', { id: 'i-1' })
}

describe('ImportDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the file with its destination, the period and the status', async () => {
    const { wrapper } = await render(entry({}))

    expect(wrapper.find('h1').text()).toBe('fatura-visa-novembro.ofx')
    expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Pronta')
    expect(wrapper.text()).toContain('Visa Platinum ••4821')
    expect(wrapper.text()).toContain('Novembro de 2026')
    expect(wrapper.text()).toContain('26/11/2026 09:02')
    expect(importsApi.findById).toHaveBeenCalledWith('i-1', false)
  })

  it.each([
    ['READY', 'O rascunho para conferir fica na próxima etapa.'],
    ['SAVED', 'O resumo da importação salva fica na próxima etapa.'],
    ['UNDONE', 'O resumo da importação desfeita fica na próxima etapa.'],
  ] as const)('keeps a simple state for the %s import', async (status, text) => {
    const { wrapper } = await render(entry({ status }))

    expect(wrapper.find('[data-slot="later"]').text()).toBe(text)
  })

  it('reads the file while it is processing and passes to the next state by itself', async () => {
    vi.mocked(importsApi.findById)
      .mockResolvedValueOnce(entry({ status: 'PROCESSING' }))
      .mockResolvedValueOnce(entry({ status: 'READY' }))
    const { wrapper } = await mountView(ImportDetailScreen, 'imports', { id: 'i-1' })

    expect(wrapper.find('[data-slot="processing"]').text()).toContain('Lendo o arquivo')
    expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Processando')

    await vi.advanceTimersByTimeAsync(IMPORT_POLLING_INTERVAL)
    await flushPromises()

    expect(wrapper.find('[data-slot="processing"]').exists()).toBe(false)
    expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Pronta')
  })

  it.each([
    ['invalid-ofx-file', 'O arquivo não é um OFX', 'Exporte de novo no banco, em OFX.'],
    [
      'card-statement-on-wallet',
      'O arquivo é de cartão de crédito, e o destino é uma carteira',
      'Importe de novo com um cartão como destino.',
    ],
    [
      'no-open-invoice',
      'A fatura de Novembro de 2026 do Visa Platinum ••4821 não está aberta',
      'Reabra a fatura ou importe em outro período.',
    ],
    ['something-new', 'Não foi possível ler o arquivo', 'Confira o arquivo e importe de novo.'],
  ])('explains the %s error', async (error, title, text) => {
    const { wrapper } = await render(entry({ status: 'FAILED', error }))
    const alert = wrapper.find('[data-slot="import-error"]')

    expect(alert.text()).toContain(title)
    expect(alert.text()).toContain(text)
    expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Com erro')
    expect(wrapper.text()).toContain('fatura-visa-novembro.ofx')
  })

  it('opens the new import on the same destination to import again', async () => {
    const { wrapper, router } = await render(entry({ status: 'FAILED', error: 'invalid-ofx-file' }))

    await buttonWithText(wrapper, 'Importar de novo').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('imports.create')
    expect(router.currentRoute.value.query).toEqual({ card: 'c-1', period: 'p-11' })
  })

  it('opens the new import with a wallet when the file was from an account and the destination a card', async () => {
    const { wrapper, router } = await render(
      entry({ status: 'FAILED', error: 'account-statement-on-card' }),
    )

    await buttonWithText(wrapper, 'Importar de novo').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ wallet: '', period: 'p-11' })
  })

  it('shows a wallet import', async () => {
    const { wrapper } = await render(
      entry({ target: 'WALLET', card: undefined, wallet: checking, status: 'SAVED' }),
    )

    expect(wrapper.text()).toContain('Conta corrente')
  })

  it('does not show the import that was loaded before for another one', async () => {
    vi.mocked(importsApi.findById).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(
      ImportDetailScreen,
      'imports',
      { id: 'i-1' },
      {
        imports: { current: entry({ id: 'i-0' }) },
      },
    )

    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('shows the server error when the import cannot be loaded', async () => {
    vi.mocked(importsApi.findById).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(ImportDetailScreen, 'imports', { id: 'i-1' })

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(false)
  })
})
