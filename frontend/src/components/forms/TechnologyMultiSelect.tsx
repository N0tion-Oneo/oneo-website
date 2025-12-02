import { useTechnologies } from '@/hooks'
import MultiSelect from './MultiSelect'
import type { Technology } from '@/types'

interface TechnologyMultiSelectProps {
  selected: Technology[]
  onChange: (selected: Technology[]) => void
  maxItems?: number
  label?: string
}

export default function TechnologyMultiSelect({
  selected,
  onChange,
  maxItems = 20,
  label = 'Technologies',
}: TechnologyMultiSelectProps) {
  const { technologies, isLoading, error } = useTechnologies()

  return (
    <MultiSelect
      label={label}
      options={technologies}
      selected={selected}
      onChange={onChange}
      placeholder="Search technologies..."
      maxItems={maxItems}
      groupByCategory={true}
      isLoading={isLoading}
      error={error}
    />
  )
}
