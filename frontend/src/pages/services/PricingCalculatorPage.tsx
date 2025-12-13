// Pricing Calculator Page - Comprehensive service comparison
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SEO } from '@/components/seo'
import Navbar from '@/components/layout/Navbar'
import { cmsPricing, CMSPricingConfig, CMSPricingFeature } from '@/services/cms'
import {
  Calculator,
  ArrowRight,
  Users,
  Building2,
  Target,
  Crosshair,
  Check,
  X,
  Trophy,
  Star,
  Plus,
  Trash2,
  Briefcase,
  Coffee,
  PartyPopper,
  Calendar,
  Laptop,
} from 'lucide-react'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface HireRole {
  id: string
  title: string
  salary: number
  count: number
  year: number // which year this role is hired
}

interface Additionals {
  deskFees: { enabled: boolean; costPerDesk: number }
  monthlyLunches: { enabled: boolean; costPerPerson: number }
  quarterlyEvents: { enabled: boolean; costPerEvent: number }
  yearEndParty: { enabled: boolean; totalCost: number }
  assets: { enabled: boolean; costPerHire: number }
}

// Default features (fallback if API fails)
const defaultFeatures = [
  { name: 'Talent Sourcing & Recruitment', category: 'recruitment' },
  { name: 'Candidate Screening', category: 'recruitment' },
  { name: 'Interview Coordination', category: 'recruitment' },
  { name: 'Free Replacements', category: 'retained' },
  { name: 'Guaranteed Placements', category: 'retained' },
  { name: 'Always-On Recruitment', category: 'retained' },
  { name: 'Legal Employment', category: 'employment' },
  { name: 'Payroll & Benefits', category: 'employment' },
  { name: 'HR Support', category: 'employment' },
  { name: 'Asset Management', category: 'additional' },
  { name: 'Office Solutions', category: 'additional' },
  { name: 'Culture & Events', category: 'additional' },
]

// Default config (fallback if API fails)
const defaultConfig: Partial<CMSPricingConfig> = {
  enterprise_markup_year1: '0.22',
  enterprise_markup_year2: '0.20',
  enterprise_markup_year3: '0.18',
  enterprise_markup_year4_plus: '0.16',
  enterprise_additionals_fee: '0.12',
  enterprise_assets_fee: '0.12',
  eor_monthly_fee: '7000',
  eor_additionals_fee: '0.20',
  eor_assets_fee: '0.20',
  retained_monthly_retainer: '20000',
  retained_placement_fee: '0.05',
  headhunting_placement_fee: '0.20',
  default_salary: '45000',
  default_desk_fee: '5000',
  default_lunch_fee: '500',
  default_event_cost: '15000',
  default_party_cost: '50000',
  default_asset_cost: '25000',
}

const services = [
  { key: 'enterprise', name: 'Enterprise', icon: Building2, color: 'amber', link: '/enterprise', needsRecruitment: true, needsEOR: true },
  { key: 'eor', name: 'EOR Only', icon: Users, color: 'blue', link: '/eor', needsRecruitment: false, needsEOR: true },
  { key: 'retained', name: 'Retained', icon: Target, color: 'emerald', link: '/retained-recruitment', needsRecruitment: true, needsEOR: false },
  { key: 'headhunting', name: 'Headhunting', icon: Crosshair, color: 'purple', link: '/headhunting', needsRecruitment: true, needsEOR: false },
]

const colorClasses: Record<string, { bg: string; text: string; border: string; light: string }> = {
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-300', light: 'bg-amber-50' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-300', light: 'bg-blue-50' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-300', light: 'bg-emerald-50' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-300', light: 'bg-purple-50' },
}

export default function PricingCalculatorPage() {
  // Fetch pricing config and features from API
  const { data: apiConfig } = useQuery({
    queryKey: ['cms', 'pricing', 'config-public'],
    queryFn: cmsPricing.getConfigPublic,
  })

  const { data: apiFeatures } = useQuery({
    queryKey: ['cms', 'pricing', 'features-public'],
    queryFn: cmsPricing.getFeaturesPublic,
  })

  // Use API config or fallback to defaults
  const config = apiConfig || defaultConfig

  // Build features and service features from API data
  const features = useMemo(() => {
    if (apiFeatures && apiFeatures.length > 0) {
      return apiFeatures.map(f => ({ name: f.name, category: f.category }))
    }
    return defaultFeatures
  }, [apiFeatures])

  const serviceFeatures = useMemo(() => {
    if (apiFeatures && apiFeatures.length > 0) {
      return {
        enterprise: Object.fromEntries(apiFeatures.map(f => [f.name, f.included_in_enterprise])),
        eor: Object.fromEntries(apiFeatures.map(f => [f.name, f.included_in_eor])),
        retained: Object.fromEntries(apiFeatures.map(f => [f.name, f.included_in_retained])),
        headhunting: Object.fromEntries(apiFeatures.map(f => [f.name, f.included_in_headhunting])),
      }
    }
    // Fallback to default logic
    return {
      enterprise: Object.fromEntries(defaultFeatures.map(f => [f.name, true])),
      eor: Object.fromEntries(defaultFeatures.map(f => [f.name, f.category === 'employment' || f.category === 'additional'])),
      retained: Object.fromEntries(defaultFeatures.map(f => [f.name, f.category === 'recruitment' || f.category === 'retained'])),
      headhunting: Object.fromEntries(defaultFeatures.map(f => [f.name, f.category === 'recruitment'])),
    }
  }, [apiFeatures])

  // Get default values from config
  const defaultSalary = Number(config.default_salary) || 45000
  const defaultDeskFee = Number(config.default_desk_fee) || 5000
  const defaultLunchFee = Number(config.default_lunch_fee) || 500
  const defaultEventCost = Number(config.default_event_cost) || 15000
  const defaultPartyCost = Number(config.default_party_cost) || 50000
  const defaultAssetCost = Number(config.default_asset_cost) || 25000

  const [needs, setNeeds] = useState({ recruitment: true, eor: true })
  const [roles, setRoles] = useState<HireRole[]>([
    { id: '1', title: 'Mid-level', salary: defaultSalary, count: 1, year: 1 },
  ])
  const [years, setYears] = useState(1)
  const [additionals, setAdditionals] = useState<Additionals>({
    deskFees: { enabled: true, costPerDesk: defaultDeskFee },
    monthlyLunches: { enabled: true, costPerPerson: defaultLunchFee },
    quarterlyEvents: { enabled: true, costPerEvent: defaultEventCost },
    yearEndParty: { enabled: true, totalCost: defaultPartyCost },
    assets: { enabled: true, costPerHire: defaultAssetCost },
  })

  // Update defaults when config loads
  useEffect(() => {
    if (apiConfig) {
      setRoles([{ id: '1', title: 'Mid-level', salary: Number(apiConfig.default_salary) || 45000, count: 1, year: 1 }])
      setAdditionals({
        deskFees: { enabled: true, costPerDesk: Number(apiConfig.default_desk_fee) || 5000 },
        monthlyLunches: { enabled: true, costPerPerson: Number(apiConfig.default_lunch_fee) || 500 },
        quarterlyEvents: { enabled: true, costPerEvent: Number(apiConfig.default_event_cost) || 15000 },
        yearEndParty: { enabled: true, totalCost: Number(apiConfig.default_party_cost) || 50000 },
        assets: { enabled: true, costPerHire: Number(apiConfig.default_asset_cost) || 25000 },
      })
    }
  }, [apiConfig])

  const totalHires = roles.reduce((sum, r) => sum + r.count, 0)
  // Calculate weighted average annual salary (accounting for which year each role is hired)
  const totalAnnualSalary = roles.reduce((sum, r) => sum + (r.salary * r.count * 12), 0)

  const addRole = (year: number) => {
    setRoles([...roles, { id: Date.now().toString(), title: '', salary: 40000, count: 1, year }])
  }

  const removeRole = (id: string) => {
    if (roles.length > 1) setRoles(roles.filter(r => r.id !== id))
  }

  const updateRole = (id: string, field: keyof HireRole, value: string | number) => {
    setRoles(roles.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const monthlyAdditionals = useMemo(() => {
    let total = 0
    if (additionals.deskFees.enabled) total += additionals.deskFees.costPerDesk * totalHires
    if (additionals.monthlyLunches.enabled) total += additionals.monthlyLunches.costPerPerson * totalHires
    if (additionals.quarterlyEvents.enabled) total += additionals.quarterlyEvents.costPerEvent / 3
    if (additionals.yearEndParty.enabled) total += additionals.yearEndParty.totalCost / 12
    return total
  }, [additionals, totalHires])

  const oneTimeAdditionals = useMemo(() => {
    if (additionals.assets.enabled) return additionals.assets.costPerHire * totalHires
    return 0
  }, [additionals, totalHires])

  // Filter services based on needs
  const relevantServices = useMemo(() => {
    return services.filter(s => {
      if (needs.recruitment && needs.eor) return true
      if (needs.recruitment && !needs.eor) return s.needsRecruitment && !s.needsEOR
      if (!needs.recruitment && needs.eor) return s.needsEOR && !s.needsRecruitment
      return false
    })
  }, [needs])

  // Get roles grouped by year
  const rolesByYear = useMemo(() => {
    const grouped: Record<number, HireRole[]> = {}
    for (let y = 1; y <= years; y++) {
      grouped[y] = roles.filter(r => r.year === y)
    }
    return grouped
  }, [roles, years])

  // Calculate cumulative hires and salaries per year
  const yearlyStats = useMemo(() => {
    const stats: { hires: number; salary: number; cumulativeHires: number; cumulativeSalary: number }[] = []
    let cumulativeHires = 0
    let cumulativeSalary = 0

    for (let y = 1; y <= years; y++) {
      const yearRoles = roles.filter(r => r.year === y)
      const yearHires = yearRoles.reduce((sum, r) => sum + r.count, 0)
      const yearSalary = yearRoles.reduce((sum, r) => sum + (r.salary * r.count * 12), 0)
      cumulativeHires += yearHires
      cumulativeSalary += yearSalary
      stats.push({ hires: yearHires, salary: yearSalary, cumulativeHires, cumulativeSalary })
    }
    return stats
  }, [roles, years])

  interface YearBreakdown {
    salaryMargin: number
    monthlyFees: number
    placementFees: number
    additionalsFees: number
    assetsFees: number
    total: number
  }

  interface ServiceCalc {
    total: number
    upfront: number
    monthly: number
    rate: string
    note: string
    byYear: YearBreakdown[]
    totals: {
      salaryMargin: number
      monthlyFees: number
      placementFees: number
      additionalsFees: number
      assetsFees: number
    }
  }

  const calculations = useMemo((): Record<string, ServiceCalc> => {
    const months = years * 12
    // Get pricing rates from config
    const enterpriseMarkups = [
      Number(config.enterprise_markup_year1) || 0.22,
      Number(config.enterprise_markup_year2) || 0.20,
      Number(config.enterprise_markup_year3) || 0.18,
      Number(config.enterprise_markup_year4_plus) || 0.16,
    ]
    const enterpriseAdditionalsFee = Number(config.enterprise_additionals_fee) || 0.12
    const enterpriseAssetsFee = Number(config.enterprise_assets_fee) || 0.12
    const eorMonthlyFee = Number(config.eor_monthly_fee) || 7000
    const eorAdditionalsFee = Number(config.eor_additionals_fee) || 0.20
    const eorAssetsFee = Number(config.eor_assets_fee) || 0.20
    const retainedMonthlyRetainer = Number(config.retained_monthly_retainer) || 20000
    const retainedPlacementFee = Number(config.retained_placement_fee) || 0.05
    const headhuntingPlacementFee = Number(config.headhunting_placement_fee) || 0.20

    // Calculate year-by-year for each service with itemized breakdown
    const enterpriseByYear: YearBreakdown[] = []
    const eorByYear: YearBreakdown[] = []
    const retainedByYear: YearBreakdown[] = []
    const headhuntingByYear: YearBreakdown[] = []

    let cumulativeHiresEnt = 0
    let cumulativeHiresEor = 0

    for (let y = 0; y < years; y++) {
      const yearRoles = roles.filter(r => r.year === y + 1)
      const newHires = yearRoles.reduce((sum, r) => sum + r.count, 0)
      const yearPlacementSalary = yearRoles.reduce((sum, r) => sum + (r.salary * r.count * 12), 0)

      // Enterprise year breakdown
      // Enterprise uses MARKUP (% added on top of salary)
      // IMPORTANT: Markup rate is based on EMPLOYEE TENURE, not client tenure
      // Each employee's markup decreases based on how long THEY have been employed
      const entAssets = additionals.assets.enabled ? additionals.assets.costPerHire * newHires * enterpriseAssetsFee : 0
      cumulativeHiresEnt += newHires

      // Calculate salary margin based on each employee's tenure
      // For each role, calculate their tenure in the current year and apply appropriate markup
      let entSalaryMargin = 0
      const currentYear = y + 1 // 1-indexed year
      roles
        .filter(r => r.year <= currentYear) // Only include employees hired up to current year
        .forEach(role => {
          const employeeTenure = currentYear - role.year // 0 = first year, 1 = second year, etc.
          const markupRate = enterpriseMarkups[Math.min(employeeTenure, 3)]
          const roleSalary = role.salary * role.count * 12
          entSalaryMargin += roleSalary * markupRate
        })
      let entAdditionals = 0
      if (additionals.deskFees.enabled) entAdditionals += additionals.deskFees.costPerDesk * cumulativeHiresEnt * 12
      if (additionals.monthlyLunches.enabled) entAdditionals += additionals.monthlyLunches.costPerPerson * cumulativeHiresEnt * 12
      if (additionals.quarterlyEvents.enabled) entAdditionals += additionals.quarterlyEvents.costPerEvent * 4
      if (additionals.yearEndParty.enabled) entAdditionals += additionals.yearEndParty.totalCost
      const entAdditionalsFeeCalc = entAdditionals * enterpriseAdditionalsFee
      enterpriseByYear.push({
        salaryMargin: entSalaryMargin,
        monthlyFees: 0,
        placementFees: 0,
        additionalsFees: entAdditionalsFeeCalc,
        assetsFees: entAssets,
        total: entSalaryMargin + entAdditionalsFeeCalc + entAssets,
      })

      // EOR year breakdown
      const eorAssets = additionals.assets.enabled ? additionals.assets.costPerHire * newHires * eorAssetsFee : 0
      cumulativeHiresEor += newHires
      const eorMonthlyFeesCalc = eorMonthlyFee * cumulativeHiresEor * 12
      let eorAdditionals = 0
      if (additionals.deskFees.enabled) eorAdditionals += additionals.deskFees.costPerDesk * cumulativeHiresEor * 12
      if (additionals.monthlyLunches.enabled) eorAdditionals += additionals.monthlyLunches.costPerPerson * cumulativeHiresEor * 12
      if (additionals.quarterlyEvents.enabled) eorAdditionals += additionals.quarterlyEvents.costPerEvent * 4
      if (additionals.yearEndParty.enabled) eorAdditionals += additionals.yearEndParty.totalCost
      const eorAdditionalsFeeCalc = eorAdditionals * eorAdditionalsFee
      eorByYear.push({
        salaryMargin: 0,
        monthlyFees: eorMonthlyFeesCalc,
        placementFees: 0,
        additionalsFees: eorAdditionalsFeeCalc,
        assetsFees: eorAssets,
        total: eorMonthlyFeesCalc + eorAdditionalsFeeCalc + eorAssets,
      })

      // Retained year breakdown
      // Retained uses MARKUP (% added on top of salary)
      const retMonthlyFeesCalc = retainedMonthlyRetainer * 12
      const retPlacement = yearPlacementSalary * retainedPlacementFee
      retainedByYear.push({
        salaryMargin: 0,
        monthlyFees: retMonthlyFeesCalc,
        placementFees: retPlacement,
        additionalsFees: 0,
        assetsFees: 0,
        total: retMonthlyFeesCalc + retPlacement,
      })

      // Headhunting year breakdown
      // Headhunting uses MARKUP (% added on top of salary)
      const headPlacement = yearPlacementSalary * headhuntingPlacementFee
      headhuntingByYear.push({
        salaryMargin: 0,
        monthlyFees: 0,
        placementFees: headPlacement,
        additionalsFees: 0,
        assetsFees: 0,
        total: headPlacement,
      })
    }

    const sumTotals = (arr: YearBreakdown[]) => ({
      salaryMargin: arr.reduce((a, b) => a + b.salaryMargin, 0),
      monthlyFees: arr.reduce((a, b) => a + b.monthlyFees, 0),
      placementFees: arr.reduce((a, b) => a + b.placementFees, 0),
      additionalsFees: arr.reduce((a, b) => a + b.additionalsFees, 0),
      assetsFees: arr.reduce((a, b) => a + b.assetsFees, 0),
    })

    const enterpriseTotal = enterpriseByYear.reduce((a, b) => a + b.total, 0)
    const eorTotal = eorByYear.reduce((a, b) => a + b.total, 0)
    const retainedTotal = retainedByYear.reduce((a, b) => a + b.total, 0)
    const headhuntingTotal = headhuntingByYear.reduce((a, b) => a + b.total, 0)

    // Format percentages for display
    const formatPct = (val: number) => `${Math.round(val * 100)}%`

    return {
      enterprise: {
        total: enterpriseTotal,
        upfront: 0,
        monthly: enterpriseTotal / months,
        rate: `${formatPct(enterpriseMarkups[0])}→${formatPct(enterpriseMarkups[3])} markup`,
        note: `Decreases yearly · +${formatPct(enterpriseAdditionalsFee)} on additionals`,
        byYear: enterpriseByYear,
        totals: sumTotals(enterpriseByYear),
      },
      eor: {
        total: eorTotal,
        upfront: 0,
        monthly: eorTotal / months,
        rate: `R${eorMonthlyFee.toLocaleString()}/person/mo`,
        note: `+ ${formatPct(eorAdditionalsFee)} on additionals`,
        byYear: eorByYear,
        totals: sumTotals(eorByYear),
      },
      retained: {
        total: retainedTotal,
        upfront: retainedByYear[0]?.placementFees || 0,
        monthly: retainedMonthlyRetainer,
        rate: `R${retainedMonthlyRetainer.toLocaleString()}/mo retainer`,
        note: `+ ${formatPct(retainedPlacementFee)} placement fee`,
        byYear: retainedByYear,
        totals: sumTotals(retainedByYear),
      },
      headhunting: {
        total: headhuntingTotal,
        upfront: headhuntingByYear[0]?.total || 0,
        monthly: 0,
        rate: `${formatPct(headhuntingPlacementFee)} placement fee`,
        note: 'Per successful hire',
        byYear: headhuntingByYear,
        totals: sumTotals(headhuntingByYear),
      },
    }
  }, [roles, additionals, years, config])

  const mostCompleteKey = useMemo(() => {
    const relevant = relevantServices.map(s => ({
      key: s.key,
      features: Object.values(serviceFeatures[s.key]).filter(Boolean).length
    }))
    if (relevant.length === 0) return null
    return relevant.reduce((max, curr) => curr.features > max.features ? curr : max).key
  }, [relevantServices])

  const lowestCostKey = useMemo(() => {
    if (relevantServices.length === 0) return null
    const costs = relevantServices.map(s => ({
      key: s.key,
      total: calculations[s.key].total
    }))
    return costs.reduce((min, curr) => curr.total < min.total ? curr : min).key
  }, [relevantServices, calculations])

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO />
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-gray-400" />
          <h1 className="text-lg font-bold text-gray-900">Service Comparison Calculator</h1>
        </div>

        {/* Input Section - 3 columns when EOR selected, 2 columns otherwise */}
        <div className={`grid gap-4 mb-4 ${needs.eor ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {/* Column 1: Needs */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Services Needed</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needs.recruitment}
                  onChange={(e) => setNeeds({ ...needs, recruitment: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <div>
                  <span className="text-[12px] font-medium text-gray-900">Recruitment</span>
                  <p className="text-[10px] text-gray-500">Help finding & hiring candidates</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needs.eor}
                  onChange={(e) => setNeeds({ ...needs, eor: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <div>
                  <span className="text-[12px] font-medium text-gray-900">Employment (EOR)</span>
                  <p className="text-[10px] text-gray-500">We employ staff on your behalf</p>
                </div>
              </label>
            </div>
          </div>

          {/* Column 2: Hiring Plan */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Hiring Plan</h3>
              <select
                value={years}
                onChange={(e) => {
                  const newYears = Number(e.target.value)
                  setYears(newYears)
                  setRoles(roles.filter(r => r.year <= newYears))
                }}
                className="px-2 py-1 border border-gray-200 rounded text-[11px]"
              >
                {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            {/* Column Headers */}
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <span className="flex-1 text-[9px] font-semibold text-gray-400 uppercase">Role</span>
              <span className="w-20 text-[9px] font-semibold text-gray-400 uppercase text-center">Salary/mo</span>
              <span className="w-10 text-[9px] font-semibold text-gray-400 uppercase text-center">Qty</span>
              <span className="w-5"></span>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {Array.from({ length: years }, (_, i) => i + 1).map((year) => {
                const yearRoles = rolesByYear[year] || []
                return (
                  <div key={year}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-gray-500">Year {year}</span>
                      <button onClick={() => addRole(year)} className="text-[10px] text-gray-400 hover:text-gray-600">+ Add</button>
                    </div>
                    {yearRoles.length === 0 ? (
                      <p className="text-[10px] text-gray-300 italic pl-1">No hires planned</p>
                    ) : (
                      <div className="space-y-1">
                        {yearRoles.map((role) => (
                          <div key={role.id} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={role.title}
                              onChange={(e) => updateRole(role.id, 'title', e.target.value)}
                              placeholder="Role title"
                              className="flex-1 min-w-0 px-2 py-1 border border-gray-200 rounded text-[11px]"
                            />
                            <div className="relative">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">R</span>
                              <input
                                type="number"
                                value={role.salary}
                                onChange={(e) => updateRole(role.id, 'salary', Number(e.target.value))}
                                className="w-20 pl-4 pr-1 py-1 border border-gray-200 rounded text-[11px]"
                                step="5000"
                              />
                            </div>
                            <input
                              type="number"
                              value={role.count}
                              onChange={(e) => updateRole(role.id, 'count', Number(e.target.value))}
                              className="w-10 px-1 py-1 border border-gray-200 rounded text-[11px] text-center"
                              min="1"
                            />
                            <button onClick={() => removeRole(role.id)} className="text-gray-300 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-500 flex justify-between">
              <span>{totalHires} total hires</span>
              <span className="font-medium text-gray-700">{formatCurrency(totalAnnualSalary)}/yr</span>
            </div>
          </div>

          {/* Column 3: Additionals - only show when EOR is selected */}
          {needs.eor && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Additionals</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={additionals.deskFees.enabled} onChange={(e) => setAdditionals({ ...additionals, deskFees: { ...additionals.deskFees, enabled: e.target.checked }})} className="w-3.5 h-3.5 rounded border-gray-300" />
                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-700">Desk/Co-working</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-[10px]">R</span>
                  <input type="number" value={additionals.deskFees.costPerDesk} onChange={(e) => setAdditionals({ ...additionals, deskFees: { ...additionals.deskFees, costPerDesk: Number(e.target.value) }})} className="w-16 px-1.5 py-1 border border-gray-200 rounded text-[11px] text-right" disabled={!additionals.deskFees.enabled} />
                  <span className="text-[10px] text-gray-400">/mo</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={additionals.monthlyLunches.enabled} onChange={(e) => setAdditionals({ ...additionals, monthlyLunches: { ...additionals.monthlyLunches, enabled: e.target.checked }})} className="w-3.5 h-3.5 rounded border-gray-300" />
                  <Coffee className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-700">Monthly Lunches</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-[10px]">R</span>
                  <input type="number" value={additionals.monthlyLunches.costPerPerson} onChange={(e) => setAdditionals({ ...additionals, monthlyLunches: { ...additionals.monthlyLunches, costPerPerson: Number(e.target.value) }})} className="w-16 px-1.5 py-1 border border-gray-200 rounded text-[11px] text-right" disabled={!additionals.monthlyLunches.enabled} />
                  <span className="text-[10px] text-gray-400">/pp</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={additionals.quarterlyEvents.enabled} onChange={(e) => setAdditionals({ ...additionals, quarterlyEvents: { ...additionals.quarterlyEvents, enabled: e.target.checked }})} className="w-3.5 h-3.5 rounded border-gray-300" />
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-700">Quarterly Events</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-[10px]">R</span>
                  <input type="number" value={additionals.quarterlyEvents.costPerEvent} onChange={(e) => setAdditionals({ ...additionals, quarterlyEvents: { ...additionals.quarterlyEvents, costPerEvent: Number(e.target.value) }})} className="w-16 px-1.5 py-1 border border-gray-200 rounded text-[11px] text-right" disabled={!additionals.quarterlyEvents.enabled} />
                  <span className="text-[10px] text-gray-400">/event</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={additionals.yearEndParty.enabled} onChange={(e) => setAdditionals({ ...additionals, yearEndParty: { ...additionals.yearEndParty, enabled: e.target.checked }})} className="w-3.5 h-3.5 rounded border-gray-300" />
                  <PartyPopper className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-700">Year-End Party</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-[10px]">R</span>
                  <input type="number" value={additionals.yearEndParty.totalCost} onChange={(e) => setAdditionals({ ...additionals, yearEndParty: { ...additionals.yearEndParty, totalCost: Number(e.target.value) }})} className="w-16 px-1.5 py-1 border border-gray-200 rounded text-[11px] text-right" disabled={!additionals.yearEndParty.enabled} />
                  <span className="text-[10px] text-gray-400">/year</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={additionals.assets.enabled} onChange={(e) => setAdditionals({ ...additionals, assets: { ...additionals.assets, enabled: e.target.checked }})} className="w-3.5 h-3.5 rounded border-gray-300" />
                  <Laptop className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] text-gray-700">Assets (laptop, etc)</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-[10px]">R</span>
                  <input type="number" value={additionals.assets.costPerHire} onChange={(e) => setAdditionals({ ...additionals, assets: { ...additionals.assets, costPerHire: Number(e.target.value) }})} className="w-16 px-1.5 py-1 border border-gray-200 rounded text-[11px] text-right" disabled={!additionals.assets.enabled} />
                  <span className="text-[10px] text-gray-400">/hire</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-500 flex justify-between">
              <span>Monthly additionals</span>
              <span className="font-medium text-gray-700">{formatCurrency(monthlyAdditionals)}</span>
            </div>
          </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
          {!needs.recruitment && !needs.eor ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-[14px]">Select at least one service need to see comparison</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="w-[130px] p-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide"></th>
                    {relevantServices.map((s) => {
                      const isMostComplete = s.key === mostCompleteKey
                      const isLowestCost = s.key === lowestCostKey
                      // Check if this service covers both needs when both are selected
                      const coversBothNeeds = needs.recruitment && needs.eor && s.needsRecruitment && s.needsEOR
                      const isPartialSolution = needs.recruitment && needs.eor && !(s.needsRecruitment && s.needsEOR)
                      const colors = colorClasses[s.color]
                      return (
                        <th key={s.key} className={`p-3 text-center ${isMostComplete ? colors.light : isLowestCost ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex flex-wrap justify-center gap-1 min-h-[20px]">
                              {coversBothNeeds && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full shadow-sm">
                                  Complete Solution
                                </span>
                              )}
                              {isPartialSolution && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-gray-400 text-white text-[9px] font-medium rounded-full">
                                  {s.needsRecruitment ? 'Recruitment Only' : 'EOR Only'}
                                </span>
                              )}
                              {isMostComplete && !coversBothNeeds && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full shadow-sm">
                                  <Trophy className="w-2.5 h-2.5" /> Most Complete
                                </span>
                              )}
                              {isLowestCost && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-full shadow-sm">
                                  <Star className="w-2.5 h-2.5" /> Lowest Cost
                                </span>
                              )}
                            </div>
                            <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center shadow-sm`}>
                              <s.icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[13px] font-bold text-gray-900">{s.name}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {/* Pricing Rate */}
                  <tr className="bg-gray-800">
                    <td colSpan={relevantServices.length + 1} className="px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      Pricing Model
                    </td>
                  </tr>
                  <tr className="border-b-2 border-gray-200 bg-white">
                    <td className="p-3 text-gray-700 font-medium">Rate</td>
                    {relevantServices.map((s) => (
                      <td key={s.key} className="p-3 text-center">
                        <div className="font-bold text-gray-900 text-[13px]">
                          {calculations[s.key].rate}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {calculations[s.key].note}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Total Row */}
                  <tr className="border-b-2 border-gray-300 bg-gray-100">
                    <td className="p-3 font-bold text-gray-900">Estimated Total</td>
                    {relevantServices.map((s) => {
                      const colors = colorClasses[s.color]
                      const isLowestCost = s.key === lowestCostKey
                      return (
                        <td key={s.key} className={`p-3 text-center ${isLowestCost ? 'bg-green-50' : ''}`}>
                          <span className={`text-[18px] font-black ${isLowestCost ? 'text-green-600' : colors.text}`}>
                            {formatCurrency(calculations[s.key].total)}
                          </span>
                          <div className="text-[10px] text-gray-500 mt-0.5">over {years} year{years > 1 ? 's' : ''}</div>
                        </td>
                      )
                    })}
                  </tr>

                  {/* Features Section */}
                  <tr className="bg-gray-800">
                    <td colSpan={relevantServices.length + 1} className="px-3 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      What's Included
                    </td>
                  </tr>
                  {features.map((feature, idx) => (
                    <tr key={feature.name} className={`border-b border-gray-200 bg-white hover:bg-gray-50 ${idx === features.length - 1 ? 'border-b-2' : ''}`}>
                      <td className="p-2.5 text-gray-700 font-medium">{feature.name}</td>
                      {relevantServices.map((s) => {
                        const included = serviceFeatures[s.key][feature.name]
                        return (
                          <td key={s.key} className="p-2.5 text-center">
                            {included ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" strokeWidth={3} />
                            ) : (
                              <X className="w-5 h-5 text-red-400 mx-auto" strokeWidth={2.5} />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {/* CTA Row */}
                  <tr className="bg-gray-100">
                    <td className="p-3"></td>
                    {relevantServices.map((s) => {
                      const colors = colorClasses[s.color]
                      return (
                        <td key={s.key} className="p-3 text-center">
                          <Link
                            to={s.link}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 ${colors.bg} text-white text-[11px] font-bold rounded-lg hover:opacity-90 shadow-sm transition-all hover:shadow-md`}
                          >
                            Learn More <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            )}
        </div>

        {/* Cost Breakdown Cards - Below Comparison */}
        {(needs.recruitment || needs.eor) && (
          <div className="mt-6">
            <h2 className="text-[14px] font-bold text-gray-900 mb-3">Detailed Cost Breakdown</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {relevantServices.map((s) => {
                const calc = calculations[s.key]
                const colors = colorClasses[s.color]
                return (
                  <div key={s.key} className={`rounded-xl border-2 ${colors.border} overflow-hidden bg-white`}>
                    {/* Header */}
                    <div className={`${colors.bg} px-4 py-3 flex items-center gap-3`}>
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <s.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-[14px]">{s.name}</h3>
                        <p className="text-white/80 text-[10px]">{calc.rate}</p>
                      </div>
                    </div>

                    {/* Cost Items */}
                    <div className="p-4 space-y-2">
                      {calc.totals.salaryMargin > 0 && (
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-gray-600">Salary Margin</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(calc.totals.salaryMargin)}</span>
                        </div>
                      )}
                      {calc.totals.monthlyFees > 0 && (
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-gray-600">{s.key === 'eor' ? 'EOR Fees' : 'Retainer Fees'}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(calc.totals.monthlyFees)}</span>
                        </div>
                      )}
                      {calc.totals.placementFees > 0 && (
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-gray-600">Placement Fees</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(calc.totals.placementFees)}</span>
                        </div>
                      )}
                      {calc.totals.additionalsFees > 0 && (
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-gray-600">Additionals Mgmt</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(calc.totals.additionalsFees)}</span>
                        </div>
                      )}
                      {calc.totals.assetsFees > 0 && (
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-gray-600">Assets Mgmt</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(calc.totals.assetsFees)}</span>
                        </div>
                      )}

                      {/* Total */}
                      <div className={`mt-3 pt-3 border-t-2 ${colors.border}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] font-bold text-gray-900">Total ({years}Y)</span>
                          <span className={`text-[16px] font-black ${colors.text}`}>{formatCurrency(calc.total)}</span>
                        </div>
                      </div>

                      {/* Year by Year */}
                      {years > 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Year by Year</p>
                          <div className="space-y-1">
                            {calc.byYear.map((yearData, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px]">
                                <span className="text-gray-500">Year {idx + 1}</span>
                                <span className="font-medium text-gray-700">{formatCurrency(yearData.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="px-4 pb-4">
                      <Link
                        to={s.link}
                        className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 ${colors.bg} text-white text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity`}
                      >
                        Learn More <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-6 flex items-center justify-between bg-white rounded-xl border-2 border-gray-200 p-4">
          <div>
            <p className="text-[13px] font-bold text-gray-900">Ready to discuss your needs?</p>
            <p className="text-[11px] text-gray-500">Get a detailed proposal tailored to your requirements.</p>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-[12px] font-bold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Get a Quote <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
