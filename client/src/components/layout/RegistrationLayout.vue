<script setup lang="ts">
import { CalendarDays, CreditCard, Network, Tag, Wallet } from 'lucide-vue-next'
import SideMenu from '@/components/layout/SideMenu.vue'
import type { MenuGroup } from '@/components/layout/menu'
import PageStructure from '@/components/PageStructure.vue'

const items: MenuGroup[] = [
  {
    label: 'menu.registration',
    items: [
      { label: 'card.menu', icon: CreditCard, to: '/registration/cards' },
      { label: 'wallet.menu', icon: Wallet, to: '/registration/wallets' },
      { label: 'classification.menu', icon: Tag, to: '/registration/classifications' },
      { label: 'cost-center.menu', icon: Network, to: '/registration/cost-centers' },
      { label: 'financial-period.menu', icon: CalendarDays, to: '/registration/financial-periods' },
    ],
  },
]
</script>

<template>
  <PageStructure>
    <template #side-menu>
      <SideMenu :items="items" />
    </template>
  </PageStructure>
</template>
