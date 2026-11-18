import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-150 outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-destructive/30',
        outline:
          'border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 has-[>svg]:px-3',
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5',
        lg: 'h-10 px-5 has-[>svg]:px-4',
        icon: 'size-9 px-0',
        'icon-xs': "size-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 px-0',
        'icon-lg': 'size-10 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
