export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'neutral'
    },
    card: {
      slots: {
        root: 'overflow-hidden rounded-lg shadow-none'
      },
      variants: {
        variant: {
          outline: {
            root: 'bg-default ring ring-default divide-y divide-muted'
          }
        }
      }
    },
    button: {
      slots: {
        base: 'rounded-md font-medium transition-colors'
      }
    },
    input: {
      slots: { base: 'h-9 shadow-none' },
      variants: {
        variant: {
          outline: 'text-highlighted bg-default ring ring-inset ring-default hover:ring-accented dark:ring-accented'
        }
      },
      defaultVariants: { size: 'sm' }
    },
    select: {
      slots: {
        base: 'h-9 shadow-none',
        item: 'data-highlighted:not-data-disabled:before:bg-primary/10'
      },
      variants: {
        variant: {
          outline: 'text-highlighted bg-default ring ring-inset ring-default hover:ring-accented dark:ring-accented'
        }
      },
      defaultVariants: { size: 'sm' }
    },
    textarea: {
      slots: { base: 'shadow-none' },
      variants: {
        variant: {
          outline: 'text-highlighted bg-default ring ring-inset ring-default hover:ring-accented dark:ring-accented'
        }
      },
      defaultVariants: { size: 'sm' }
    },
    switch: {
      slots: {
        base: 'rounded-lg data-[state=unchecked]:bg-default data-[state=unchecked]:ring data-[state=unchecked]:ring-accented',
        thumb: 'rounded-md bg-inverted shadow-none data-[state=checked]:bg-white'
      }
    },
    formField: {
      slots: {
        help: 'mt-1.5 text-xs leading-5 text-muted',
        hint: 'text-xs text-muted',
        error: 'mt-1.5 text-xs leading-5 text-error'
      }
    },
    alert: {
      slots: {
        root: 'rounded-lg p-3',
        title: 'text-sm font-medium',
        description: 'text-xs leading-5',
        icon: 'mt-0.5 size-4'
      }
    },
    modal: {
      slots: {
        content: 'divide-y-0',
        header: 'min-h-0 p-5 pb-2 sm:p-5 sm:pb-2',
        body: 'p-5 pt-2 sm:p-5 sm:pt-2',
        footer: 'px-5 pt-2 pb-5 sm:px-5',
        title: 'text-base font-semibold tracking-tight',
        description: 'mt-1 text-xs leading-5 text-muted'
      },
      variants: {
        overlay: {
          true: { overlay: 'bg-black/45 backdrop-blur-[2px]' }
        },
        fullscreen: {
          false: { content: 'max-w-[520px] rounded-lg shadow-2xl' }
        }
      }
    }
  }
})
