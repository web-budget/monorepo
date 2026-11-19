import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertDescription } from './AlertDescription.vue'
export { default as AlertTitle } from './AlertTitle.vue'

export const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-md border px-4 py-3 text-sm has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:translate-y-px',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted text-foreground [&>svg]:text-muted-foreground',
        destructive:
          'border-destructive/40 bg-expense-muted text-foreground [&>svg]:text-destructive',
        attention:
          'border-highlight bg-highlight/35 text-foreground [&>svg]:text-highlight-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
export type AlertVariants = VariantProps<typeof alertVariants>
