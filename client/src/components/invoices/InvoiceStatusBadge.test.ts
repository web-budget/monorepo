import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue'
import { createTestPlugins } from '@/test/mounting'
import type { InvoiceStatus } from '@/types'

function text(status: InvoiceStatus) {
  const { plugins } = createTestPlugins()
  return mount(InvoiceStatusBadge, { props: { status }, global: { plugins } }).text()
}

describe('InvoiceStatusBadge', () => {
  it('says whether the invoice is open, closed or paid', () => {
    expect(text('OPEN')).toBe('Aberta')
    expect(text('CLOSED')).toBe('Fechada')
    expect(text('PAID')).toBe('Paga')
  })
})
