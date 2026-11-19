import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border border-transparent px-1.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-accent',
        neutral: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        approved:
          'bg-income-muted text-income before:size-1.5 before:rounded-full before:bg-current before:content-[""]',
        pending:
          'bg-highlight text-highlight-foreground before:size-1.5 before:rounded-full before:bg-current before:content-[""]',
        blocked:
          'bg-expense-muted text-expense before:size-1.5 before:rounded-full before:bg-current before:content-[""]',
        outline:
          'border-border font-mono text-[11px] text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
