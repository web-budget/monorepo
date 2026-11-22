<script setup lang="ts">
import ModuleHome from '@/components/layout/ModuleHome.vue'
import { registrationSection } from '@/components/layout/sections'
import { useModuleCounts } from '@/composables/useModuleCounts'
import { useCardsStore } from '@/stores/cards'
import { useClassificationsStore } from '@/stores/classifications'
import { useCostCentersStore } from '@/stores/costCenters'
import { useWalletsStore } from '@/stores/wallets'

const wallets = useWalletsStore()
const cards = useCardsStore()
const classifications = useClassificationsStore()
const costCenters = useCostCentersStore()

const { counts } = useModuleCounts({
  '/registration/wallets': () => wallets.count('ALL'),
  '/registration/cards': () => cards.count('ALL'),
  '/registration/classifications': () => classifications.count('ALL'),
  '/registration/cost-centers': () => costCenters.count('ALL'),
})
</script>

<template>
  <ModuleHome
    :section="registrationSection"
    description="module-home.description.registration"
    :counts="counts"
  />
</template>
