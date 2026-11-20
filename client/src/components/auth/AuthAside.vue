<script setup lang="ts">
import { CalendarRange, ChartColumn, TrendingUp } from 'lucide-vue-next'
import BrandMark from '@/components/brand/BrandMark.vue'
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import { APP_VERSION_LABEL } from '@/utils/appVersion'

const features = [
  { icon: CalendarRange, label: 'auth-aside.features.periods' },
  { icon: ChartColumn, label: 'auth-aside.features.dashboards' },
  { icon: TrendingUp, label: 'auth-aside.features.forecast' },
]
</script>

<template>
  <aside
    data-slot="auth-aside"
    class="auth-aside bg-sidebar border-border relative hidden flex-col justify-between overflow-hidden border-r p-10 lg:flex"
  >
    <div class="flex items-center gap-3">
      <BrandMark :size="32" />
      <BrandWordmark class="text-xl" />
    </div>
    <div class="grid max-w-sm gap-4">
      <h2 class="text-3xl font-semibold tracking-tight text-balance">
        {{ $t('auth-aside.headline') }}
      </h2>
      <p class="text-muted-foreground">{{ $t('auth-aside.tagline') }}</p>
      <ul class="grid gap-2.5 pt-2">
        <li v-for="feature in features" :key="feature.label" class="flex items-center gap-2.5">
          <component :is="feature.icon" class="text-primary" />
          {{ $t(feature.label) }}
        </li>
      </ul>
    </div>
    <p class="text-muted-foreground font-mono text-[11px]">webBudget {{ APP_VERSION_LABEL }}</p>
  </aside>
</template>

<style scoped>
.auth-aside {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 31px,
    color-mix(in oklch, var(--border) 70%, transparent) 31px,
    color-mix(in oklch, var(--border) 70%, transparent) 32px
  );
}

.auth-aside::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 28px;
  width: 1px;
  background: color-mix(in oklch, var(--highlight) 80%, transparent);
}
</style>
