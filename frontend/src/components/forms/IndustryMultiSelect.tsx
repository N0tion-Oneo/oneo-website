import { useIndustries } from '@/hooks'
import MultiSelect from './MultiSelect'
import type { Industry } from '@/types'

interface IndustryMultiSelectProps {
  selected: Industry[]
  onChange: (selected: Industry[]) => void
  maxItems?: number
  label?: string
}

export default function IndustryMultiSelect({
  selected,
  onChange,
  maxItems = 5,
  label = 'Industries',
}: IndustryMultiSelectProps) {
  const { industries, isLoading, error } = useIndustries()

  return (
    <MultiSelect
      label={label}
      options={industries}
      selected={selected}
      onChange={onChange}
      placeholder="Search industries..."
      maxItems={maxItems}
      groupByCategory={false}
      isLoading={isLoading}
      error={error}
    />
  )
}
