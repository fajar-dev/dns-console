export interface ConsoleMetric {
  label: string
  value: string | number
  icon: string
  description: string
  loading?: boolean
  tone?: 'primary' | 'error'
}
