import { useSkills } from '@/hooks'
import MultiSelect from './MultiSelect'
import type { Skill } from '@/types'

interface SkillMultiSelectProps {
  selected: Skill[]
  onChange: (selected: Skill[]) => void
  maxItems?: number
  label?: string
}

export default function SkillMultiSelect({
  selected,
  onChange,
  maxItems = 15,
  label = 'Skills',
}: SkillMultiSelectProps) {
  const { skills, isLoading, error } = useSkills()

  return (
    <MultiSelect
      label={label}
      options={skills}
      selected={selected}
      onChange={onChange}
      placeholder="Search skills..."
      maxItems={maxItems}
      groupByCategory={true}
      isLoading={isLoading}
      error={error}
    />
  )
}
