<script setup lang="ts">
import ModuleHome from '@/components/layout/ModuleHome.vue'
import { financialSection } from '@/components/layout/sections'
import { useModuleCounts } from '@/composables/useModuleCounts'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

const financialPeriods = useFinancialPeriodsStore()

const { counts } = useModuleCounts({
  '/financial/periods': () => financialPeriods.count('ALL'),
})
</script>

<template>
  <ModuleHome
    :section="financialSection"
    description="module-home.description.financial"
    :counts="counts"
  />
</template>
