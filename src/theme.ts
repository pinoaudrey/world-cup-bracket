import { createTheme, type MantineColorsTuple } from '@mantine/core'

// FIFA World Cup 2026 palette — royal blue, green, red, and lime, taken from
// the tournament branding. We override Mantine's blue / green / red / lime so
// the primary accent AND the existing green/red status colors (bracket
// connectors, correct/wrong cards, badges) all pick up the World Cup look
// automatically. Index 6 is the base shade Mantine uses by default.
const blue: MantineColorsTuple = [
  '#edf1ff', '#d3dcfb', '#a4b5f3', '#7189ec', '#4a64e7',
  '#3251e4', '#2950e3', '#1c40cb', '#1539b5', '#0a2f9f',
]
const green: MantineColorsTuple = [
  '#e4faeb', '#c0f0d1', '#96e4b1', '#67d88f', '#43ce72',
  '#2bc762', '#1faa4c', '#198f3f', '#107733', '#036025',
]
const red: MantineColorsTuple = [
  '#ffece8', '#fcd4cc', '#f6a89b', '#f17a66', '#ec543a',
  '#ea3f20', '#dd3319', '#bb2813', '#9c1f0d', '#7d1506',
]
const lime: MantineColorsTuple = [
  '#f5fce0', '#eaf6c1', '#d9ee8c', '#c8e656', '#bce02b',
  '#b4dd16', '#a6c70e', '#8caf05', '#779600', '#627d00',
]

// Hard-stop color blocks for the header ribbon, evoking the "26" graphic.
export const WC_RIBBON =
  'linear-gradient(90deg, #e5371d 0 25%, #2950e3 25% 50%, #1faa4c 50% 75%, #a6d81e 75% 100%)'

export const theme = createTheme({
  fontFamily:
    'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  primaryColor: 'blue',
  defaultRadius: 'md',
  colors: { blue, green, red, lime },
})
