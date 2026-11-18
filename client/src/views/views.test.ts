import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import i18n from '@/locales'
import ConfigurationHomeView from '@/views/configuration/ConfigurationHomeView.vue'
import FinancialHomeView from '@/views/financial/FinancialHomeView.vue'
import HomeView from '@/views/HomeView.vue'
import RegistrationHomeView from '@/views/registration/RegistrationHomeView.vue'

describe('placeholder views', () => {
  it.each([
    ['HomeView', HomeView, 'Acesso rápido'],
    ['RegistrationHomeView', RegistrationHomeView, 'Cadastros'],
    ['FinancialHomeView', FinancialHomeView, 'Financeiro'],
    ['ConfigurationHomeView', ConfigurationHomeView, 'Configurações'],
  ])('%s renders its title', (_name, view, text) => {
    expect(mount(view, { global: { plugins: [i18n] } }).text()).toContain(text)
  })
})
