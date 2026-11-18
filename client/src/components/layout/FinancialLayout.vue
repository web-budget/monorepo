<script setup lang="ts">
import { CalendarDays, ChartLine, CreditCard, RefreshCw } from 'lucide-vue-next'
import SideMenu from '@/components/layout/SideMenu.vue'
import type { MenuGroup } from '@/components/layout/menu'
import PageStructure from '@/components/PageStructure.vue'

const items: MenuGroup[] = [
  {
    label: 'menu.financial',
    items: [
      { label: 'period-movement.menu', icon: CalendarDays },
      { label: 'recurrent-movement.menu', icon: RefreshCw },
      { label: 'credit-card-invoice.menu', icon: CreditCard },
      { label: 'period-closing.menu', icon: ChartLine },
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
