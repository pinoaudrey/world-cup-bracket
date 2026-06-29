import { createTheme, type MantineColorsTuple } from '@mantine/core'

// Deep maroon used for the app header bar and the championship card.
const maroon: MantineColorsTuple = [
  '#fdecef',
  '#f6d6da',
  '#e9aab2',
  '#dd7d89',
  '#d25767',
  '#cb3f51',
  '#c83447',
  '#b22a3b',
  '#7a1626', // 8 — brand header
  '#591019',
]

export const theme = createTheme({
  fontFamily:
    'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  primaryColor: 'blue',
  defaultRadius: 'md',
  colors: { maroon },
})
