import { Shield, Target, TrendingUp } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { CompartmentType } from '@/types'

export const COMPARTMENT_TYPE_ICONS: Record<CompartmentType, Component> = {
  RESERVE: Shield,
  INVESTMENT: TrendingUp,
  GOAL: Target,
}

export function percentageOf(progress: number): number {
  return Math.floor(progress * 100)
}

export function progressWidth(progress: number): number {
  return Math.min(100, progress * 100)
}
