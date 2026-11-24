<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const route = useRoute()

const crumbs = computed(() => {
  const seen = new Set<string>()
  return route.matched.flatMap((record) => {
    const label = record.meta.breadcrumb
    if (typeof label !== 'string' || seen.has(label)) {
      return []
    }
    seen.add(label)
    return [{ label, path: record.path }]
  })
})
</script>

<template>
  <Breadcrumb v-if="crumbs.length > 0" :aria-label="$t('layout.breadcrumb')" class="mb-3">
    <BreadcrumbList>
      <template v-for="(crumb, index) in crumbs" :key="crumb.label">
        <BreadcrumbSeparator v-if="index > 0" />
        <BreadcrumbItem>
          <BreadcrumbPage v-if="index === crumbs.length - 1">{{ $t(crumb.label) }}</BreadcrumbPage>
          <BreadcrumbLink v-else as-child>
            <RouterLink :to="crumb.path">{{ $t(crumb.label) }}</RouterLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
