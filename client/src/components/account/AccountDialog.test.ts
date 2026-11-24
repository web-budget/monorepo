import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AccountDialog from '@/components/account/AccountDialog.vue'
import { useAccountDialog } from '@/composables/useAccountDialog'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins } from '@/test/mounting'
import { useCompactViewport } from '@/test/crud'
import { settle } from '@/test/settle'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const dialog = useAccountDialog()

function mountDialog(hasPassword = true) {
  const { plugins } = createTestPlugins({
    initialState: {
      auth: {
        session: {
          name: 'Maria Conceição',
          email: 'maria@exemplo.com.br',
          hasPassword,
          googleLinked: false,
          totpEnabled: true,
        },
      },
    },
  })
  return mount(AccountDialog, { attachTo: document.body, global: { plugins } })
}

async function show(tab: Parameters<typeof dialog.show>[0] = null, hasPassword = true) {
  const wrapper = mountDialog(hasPassword)
  dialog.show(tab)
  await settle()
  return wrapper
}

function content() {
  return document.body.querySelector('[data-slot="account-dialog"]') as HTMLElement
}

function nav() {
  return content().querySelector('nav') as HTMLElement
}

function navButton(label: string) {
  return [...nav().querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.includes(label),
  ) as HTMLButtonElement
}

function title() {
  return content().querySelector('[data-slot="dialog-title"]')?.textContent
}

function description() {
  return content().querySelector('[data-slot="dialog-description"]')
}

describe('AccountDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    useCompactViewport(false)
  })

  afterEach(() => {
    dialog.close()
    useCompactViewport(false)
  })

  it('stays closed until something asks for it', async () => {
    mountDialog()
    await settle()

    expect(content()).toBeNull()
  })

  it('opens on the profile on the desktop even when no tab was asked', async () => {
    await show()

    expect(title()).toBe('Perfil')
    expect(description()?.textContent?.trim()).toBe('O e-mail não muda.')
    expect(content().querySelector('input')).not.toBeNull()
  })

  it('has the side menu with the title, the e-mail and the four tabs, the current one marked', async () => {
    await show('security')

    expect(nav().textContent).toContain('Minha conta')
    expect(nav().textContent).toContain('maria@exemplo.com.br')
    expect([...nav().querySelectorAll('button')].map((tab) => tab.textContent?.trim())).toEqual([
      'Perfil',
      'Preferências',
      'Senha',
      'Segurança',
    ])
    expect(navButton('Segurança').getAttribute('aria-current')).toBe('page')
    expect(navButton('Perfil').getAttribute('aria-current')).toBeNull()
  })

  it('has no tab for the notifications', async () => {
    await show()

    expect(nav().textContent).not.toContain('Notificações')
  })

  it('changes the tab from the side menu and titles each one', async () => {
    await show('profile')

    navButton('Preferências').click()
    await settle()
    expect(title()).toBe('Preferências')
    expect(description()?.className).toContain('sr-only')
    expect(content().textContent).toContain('Idioma')

    navButton('Senha').click()
    await settle()
    expect(title()).toBe('Trocar senha')
    expect(description()?.textContent?.trim()).toBe('Para a conta maria@exemplo.com.br.')

    navButton('Segurança').click()
    await settle()
    expect(title()).toBe('Segurança')
    expect(content().textContent).toContain('Verificação em duas etapas')
  })

  it('titles the password tab as Senha, without description, for a Google only account', async () => {
    await show('password', false)

    expect(title()).toBe('Senha')
    expect(description()?.className).toContain('sr-only')
    expect(content().textContent).toContain('Você entra com o Google')
  })

  it('closes with the close button', async () => {
    await show('profile')

    ;(content().querySelector('button[aria-label="Fechar"]') as HTMLButtonElement).click()
    await settle()

    expect(dialog.open.value).toBe(false)
    expect(content()).toBeNull()
  })

  it('closes when the session ends under it', async () => {
    await show('profile')
    const auth = useAuthStore()

    auth.session = { ...auth.session!, name: 'Maria da Silva' }
    await settle()
    expect(dialog.open.value).toBe(true)

    auth.session = null
    await settle()

    expect(dialog.open.value).toBe(false)
    expect(content()).toBeNull()
  })

  it('closes with Escape', async () => {
    await show('profile')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()

    expect(dialog.open.value).toBe(false)
  })

  it('does not show the side menu on the phone, which opens on the list of tabs', async () => {
    useCompactViewport(true)
    await show()

    expect(nav().className).toContain('max-md:hidden')
    expect(title()).toBe('Minha conta')
    expect(description()?.textContent?.trim()).toBe('maria@exemplo.com.br')
    const list = content().querySelector('[data-slot="account-tabs"]') as HTMLElement
    expect([...list.querySelectorAll('button')].map((tab) => tab.textContent?.trim())).toEqual([
      'Perfil',
      'Preferências',
      'Senha',
      'Segurança',
    ])
    expect(content().querySelector('button[aria-label="Voltar"]')).toBeNull()
  })

  it('enters a tab over the list on the phone, with the back button', async () => {
    useCompactViewport(true)
    await show()

    ;(content().querySelector('[data-slot="account-tabs"] button') as HTMLButtonElement).click()
    await settle()

    expect(title()).toBe('Perfil')
    expect(content().querySelector('[data-slot="account-tabs"]')).toBeNull()

    ;(content().querySelector('button[aria-label="Voltar"]') as HTMLButtonElement).click()
    await settle()

    expect(title()).toBe('Minha conta')
    expect(content().querySelector('[data-slot="account-tabs"]')).not.toBeNull()
  })

  it('opens straight on the asked tab on the phone', async () => {
    useCompactViewport(true)
    await show('profile')

    expect(title()).toBe('Perfil')
    expect(content().querySelector('button[aria-label="Voltar"]')).not.toBeNull()
  })
})

describe('AccountDialog notifications tab', () => {
  afterEach(() => {
    dialog.close()
    useCompactViewport(false)
    document.body.innerHTML = ''
  })

  it('puts the notifications tab between preferences and password for the financial area', async () => {
    const wrapper = mountDialog()
    vi.mocked(useAuthStore().hasRole).mockImplementation((role) => role === 'FINANCIAL')
    dialog.show('notifications')
    await settle()

    expect([...nav().querySelectorAll('button')].map((tab) => tab.textContent?.trim())).toEqual([
      'Perfil',
      'Preferências',
      'Notificações',
      'Senha',
      'Segurança',
    ])
    expect(title()).toBe('Notificações')
    expect(content().querySelector('[role="switch"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('does not offer the notifications tab to who is out of the financial area', async () => {
    const wrapper = mountDialog()
    dialog.show()
    await settle()

    expect(navButton('Notificações')).toBeUndefined()
    wrapper.unmount()
  })
})
