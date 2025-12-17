// Pricing Calculator Page - Comprehensive service comparison
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SEO } from '@/components/seo'
import Navbar from '@/components/layout/Navbar'
import { cmsPricing, CMSPricingConfig } from '@/services/cms'
import {
  Calculator,
  ArrowRight,
  Users,
  Building2,
  Target,
  Crosshair,
  Check,
  X,
  Trash2,
  Plus,
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
  quarterlyEvents: { enabled: boolean; costPerPerson: number }
  yearEndParty: { enabled: boolean; costPerPerson: number }
  assets: { enabled: boolean; costPerHire: number }
}

interface CustomAdditional {
  id: string
  name: string
  costPerPerson: number
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one-off'
  enabled: boolean
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

const colorClasses: Record<string, {
  bg: string;
  text: string;
  border: string;
  light: string;
  borderActive: string;
  bgLight: string;
}> = {
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-300', light: 'bg-amber-50', borderActive: 'border-amber-500', bgLight: 'bg-amber-100' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-300', light: 'bg-blue-50', borderActive: 'border-blue-500', bgLight: 'bg-blue-100' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-300', light: 'bg-emerald-50', borderActive: 'border-emerald-500', bgLight: 'bg-emerald-100' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-300', light: 'bg-purple-50', borderActive: 'border-purple-500', bgLight: 'bg-purple-100' },
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
  const defaultSalary = Number(config.default_salary) || 50000
  const defaultDeskFee = Number(config.default_desk_fee) || 5000
  const defaultLunchFee = Number(config.default_lunch_fee) || 500
  const defaultAssetCost = Number(config.default_asset_cost) || 25000

  const [needs, setNeeds] = useState({ recruitment: true, eor: true })
  const [hireType, setHireType] = useState<'single' | 'team'>('team')
  const [expandedPricing, setExpandedPricing] = useState<string | null>(null)
  const [roles, setRoles] = useState<HireRole[]>([
    { id: '1', title: 'Mid-level', salary: defaultSalary, count: 1, year: 1 },
  ])
  const [years, setYears] = useState(1)
  const [additionals, setAdditionals] = useState<Additionals>({
    deskFees: { enabled: true, costPerDesk: defaultDeskFee },
    monthlyLunches: { enabled: true, costPerPerson: defaultLunchFee },
    quarterlyEvents: { enabled: true, costPerPerson: 500 },
    yearEndParty: { enabled: true, costPerPerson: 1000 },
    assets: { enabled: true, costPerHire: defaultAssetCost },
  })
  const [customAdditionals, setCustomAdditionals] = useState<CustomAdditional[]>([])

  // Update defaults when config loads
  useEffect(() => {
    if (apiConfig) {
      setRoles([{ id: '1', title: 'Mid-level', salary: Number(apiConfig.default_salary) || 50000, count: 1, year: 1 }])
      setAdditionals({
        deskFees: { enabled: true, costPerDesk: Number(apiConfig.default_desk_fee) || 5000 },
        monthlyLunches: { enabled: true, costPerPerson: Number(apiConfig.default_lunch_fee) || 500 },
        quarterlyEvents: { enabled: true, costPerPerson: 500 },
        yearEndParty: { enabled: true, costPerPerson: 1000 },
        assets: { enabled: true, costPerHire: Number(apiConfig.default_asset_cost) || 25000 },
      })
    }
  }, [apiConfig])

  const totalHires = roles.reduce((sum, r) => sum + r.count, 0)
  // Calculate weighted average annual salary (accounting for which year each role is hired)
  const totalAnnualSalary = roles.reduce((sum, r) => sum + (r.salary * r.count * 12), 0)

  const addRole = (year: number) => {
    setRoles([...roles, { id: Date.now().toString(), title: '', salary: 50000, count: 1, year }])
  }

  const removeRole = (id: string) => {
    if (roles.length > 1) setRoles(roles.filter(r => r.id !== id))
  }

  const updateRole = (id: string, field: keyof HireRole, value: string | number) => {
    setRoles(roles.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const addCustomAdditional = () => {
    setCustomAdditionals([
      ...customAdditionals,
      { id: Date.now().toString(), name: '', costPerPerson: 0, frequency: 'monthly', enabled: true }
    ])
  }

  const removeCustomAdditional = (id: string) => {
    setCustomAdditionals(customAdditionals.filter(c => c.id !== id))
  }

  const updateCustomAdditional = (id: string, field: keyof CustomAdditional, value: string | number | boolean) => {
    setCustomAdditionals(customAdditionals.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const monthlyAdditionals = useMemo(() => {
    let total = 0
    if (additionals.deskFees.enabled) total += additionals.deskFees.costPerDesk * totalHires
    if (additionals.monthlyLunches.enabled) total += additionals.monthlyLunches.costPerPerson * totalHires
    if (additionals.quarterlyEvents.enabled) total += (additionals.quarterlyEvents.costPerPerson * totalHires * 4) / 12
    if (additionals.yearEndParty.enabled) total += (additionals.yearEndParty.costPerPerson * totalHires) / 12
    // Add custom recurring additionals
    customAdditionals.filter(c => c.enabled && c.frequency !== 'one-off').forEach(custom => {
      if (custom.frequency === 'monthly') {
        total += custom.costPerPerson * totalHires
      } else if (custom.frequency === 'quarterly') {
        total += (custom.costPerPerson * totalHires * 4) / 12
      } else if (custom.frequency === 'annual') {
        total += (custom.costPerPerson * totalHires) / 12
      }
    })
    return total
  }, [additionals, totalHires, customAdditionals])

  const oneTimeAdditionals = useMemo(() => {
    let total = 0
    if (additionals.assets.enabled) total += additionals.assets.costPerHire * totalHires
    // Add custom one-off additionals
    customAdditionals.filter(c => c.enabled && c.frequency === 'one-off').forEach(custom => {
      total += custom.costPerPerson * totalHires
    })
    return total
  }, [additionals, totalHires, customAdditionals])

  // Filter services based on needs and hire type
  const relevantServices = useMemo(() => {
    return services.filter(s => {
      // Both recruitment and EOR - show only Enterprise
      if (needs.recruitment && needs.eor) {
        return s.key === 'enterprise'
      }
      // EOR only (no recruitment)
      if (!needs.recruitment && needs.eor) {
        return s.key === 'eor'
      }
      // Recruitment only (no EOR)
      if (needs.recruitment && !needs.eor) {
        if (hireType === 'single') return s.key === 'headhunting'
        if (hireType === 'team') return s.key === 'retained'
      }
      return false
    })
  }, [needs, hireType])

  // Get roles grouped by year
  const rolesByYear = useMemo(() => {
    const grouped: Record<number, HireRole[]> = {}
    for (let y = 1; y <= years; y++) {
      grouped[y] = roles.filter(r => r.year === y)
    }
    return grouped
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
      let entAssets = additionals.assets.enabled ? additionals.assets.costPerHire * newHires * enterpriseAssetsFee : 0
      // Add custom one-off additionals
      customAdditionals.filter(c => c.enabled && c.frequency === 'one-off').forEach(custom => {
        entAssets += custom.costPerPerson * newHires * enterpriseAssetsFee
      })
      cumulativeHiresEnt += newHires

      // Calculate salary margin based on each employee's tenure
      // For each role, calculate their tenure in the current year and apply appropriate markup
      let entSalaryMargin = 0
      const currentYear = y + 1 // 1-indexed year
      roles
        .filter(r => r.year <= currentYear) // Only include employees hired up to current year
        .forEach(role => {
          const employeeTenure = currentYear - role.year // 0 = first year, 1 = second year, etc.
          const markupRate = enterpriseMarkups[Math.min(employeeTenure, 3)] ?? 0.16
          const roleSalary = role.salary * role.count * 12
          entSalaryMargin += roleSalary * markupRate
        })
      let entAdditionals = 0
      if (additionals.deskFees.enabled) entAdditionals += additionals.deskFees.costPerDesk * cumulativeHiresEnt * 12
      if (additionals.monthlyLunches.enabled) entAdditionals += additionals.monthlyLunches.costPerPerson * cumulativeHiresEnt * 12
      if (additionals.quarterlyEvents.enabled) entAdditionals += additionals.quarterlyEvents.costPerPerson * cumulativeHiresEnt * 4
      if (additionals.yearEndParty.enabled) entAdditionals += additionals.yearEndParty.costPerPerson * cumulativeHiresEnt
      // Add custom recurring additionals
      customAdditionals.filter(c => c.enabled && c.frequency !== 'one-off').forEach(custom => {
        if (custom.frequency === 'monthly') {
          entAdditionals += custom.costPerPerson * cumulativeHiresEnt * 12
        } else if (custom.frequency === 'quarterly') {
          entAdditionals += custom.costPerPerson * cumulativeHiresEnt * 4
        } else if (custom.frequency === 'annual') {
          entAdditionals += custom.costPerPerson * cumulativeHiresEnt
        }
      })
      const entAdditionalsFeeCalc = entAdditionals * enterpriseAdditionalsFee
      enterpriseByYear.push({
        salaryMargin: entSalaryMargin,
        monthlyFees: 0,
        placementFees: 0,
        additionalsFees: entAdditionalsFeeCalc,
        assetsFees: entAssets,
        total: entSalaryMargin + entAdditionalsFeeCalc + entAssets,
      })

      // EOR year breakdown - flat monthly fee per employee, cumulative hiring
      // Each year pays for all employees hired up to that point
      cumulativeHiresEor += newHires
      const eorMonthlyFeesCalc = eorMonthlyFee * cumulativeHiresEor * 12
      eorByYear.push({
        salaryMargin: 0,
        monthlyFees: eorMonthlyFeesCalc,
        placementFees: 0,
        additionalsFees: 0,
        assetsFees: 0,
        total: eorMonthlyFeesCalc,
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
        rate: `${formatPct(enterpriseMarkups[0] ?? 0.22)}→${formatPct(enterpriseMarkups[3] ?? 0.16)} fee`,
        note: `+${formatPct(enterpriseAdditionalsFee)} on additionals`,
        byYear: enterpriseByYear,
        totals: sumTotals(enterpriseByYear),
      },
      eor: {
        total: eorTotal,
        upfront: 0,
        monthly: eorMonthlyFee * totalHires, // Current monthly cost based on total employees
        rate: `R${eorMonthlyFee.toLocaleString()}/person/mo`,
        note: 'Flat monthly fee per employee',
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
  }, [roles, additionals, years, config, customAdditionals])

  return (
    <div className="min-h-screen bg-white">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Calculator className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-[13px] font-medium text-amber-400 uppercase tracking-wide">
              Pricing Calculator
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Compare Our <span className="text-amber-400">Services</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl">
            Build your hiring plan and see transparent pricing across all our service offerings.
            Get instant estimates tailored to your specific needs.
          </p>
        </div>
      </div>

      {/* Pricing Models Panel */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-8">
            <span className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">Step 1</span>
            <h2 className="text-[28px] font-bold text-gray-900 mt-1">Understand Our Pricing Models</h2>
            <p className="text-[15px] text-gray-600 mt-2">Explore how each service is priced before building your plan.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden min-h-[70vh] flex">
            {/* Vertical Tabs */}
            <div className="w-[200px] bg-gray-50 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">Our Services</h3>
              </div>
              {[
                { key: 'enterprise', name: 'Enterprise', icon: Building2, color: 'amber' },
                { key: 'eor', name: 'EOR Only', icon: Users, color: 'blue' },
                { key: 'retained', name: 'Retained', icon: Target, color: 'emerald' },
                { key: 'headhunting', name: 'Headhunting', icon: Crosshair, color: 'purple' },
              ].map((tab) => {
                const colors = colorClasses[tab.color]!
                const isActive = expandedPricing === tab.key || (!expandedPricing && tab.key === 'enterprise')
                return (
                  <button
                    key={tab.key}
                    onClick={() => setExpandedPricing(tab.key)}
                    className={`w-full px-4 py-4 flex items-center gap-3 text-left transition-all border-l-4 ${
                      isActive
                        ? `${colors.borderActive} bg-white`
                        : 'border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isActive ? colors.bgLight : 'bg-gray-200'
                    }`}>
                      <tab.icon className={`w-4 h-4 ${
                        isActive ? colors.text : 'text-gray-500'
                      }`} />
                    </div>
                    <span className={`text-[14px] font-medium ${
                      isActive ? 'text-gray-900' : 'text-gray-600'
                    }`}>{tab.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Content Panel */}
            <div className="flex-1">
              {/* Enterprise Content */}
              {(expandedPricing === 'enterprise' || !expandedPricing) && (
                <div className="h-full bg-gradient-to-br from-amber-600 via-amber-500 to-amber-400 p-8 flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <span className="text-amber-100 text-[13px] font-medium uppercase tracking-wide">Complete Solution</span>
                      <h2 className="text-white text-[28px] font-bold">Enterprise</h2>
                    </div>
                  </div>

                  <p className="text-white/90 text-[16px] leading-relaxed mb-8 max-w-xl">
                    Our all-in-one solution. We find, hire, and employ your team. You get dedicated talent without the administrative burden of legal employment, payroll, or HR.
                  </p>

                  <div className="flex-1 flex items-center">
                    <div className="grid md:grid-cols-2 gap-6 w-full">
                      {/* Pricing Box */}
                      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                        <h3 className="text-white/80 text-[13px] font-medium uppercase tracking-wide mb-4">Pricing Model</h3>
                        <p className="text-white text-[18px] font-semibold mb-4">Salary Markup</p>
                        <p className="text-white/70 text-[14px] mb-4">Markup decreases as employee tenure increases</p>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-white/80">Year 1</span>
                            <span className="text-white text-[24px] font-bold">{Math.round(Number(config.enterprise_markup_year1) * 100 || 22)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/80">Year 2</span>
                            <span className="text-white text-[24px] font-bold">{Math.round(Number(config.enterprise_markup_year2) * 100 || 20)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/80">Year 3</span>
                            <span className="text-white text-[24px] font-bold">{Math.round(Number(config.enterprise_markup_year3) * 100 || 18)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-white/80">Year 4+</span>
                            <span className="text-white text-[24px] font-bold">{Math.round(Number(config.enterprise_markup_year4_plus) * 100 || 16)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Features Box */}
                      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                        <h3 className="text-white/80 text-[13px] font-medium uppercase tracking-wide mb-4">What's Included</h3>
                        <ul className="space-y-3">
                          {features
                            .filter(f => serviceFeatures.enterprise[f.name])
                            .map(f => (
                              <li key={f.name} className="flex items-center gap-3 text-white">
                                <Check className="w-5 h-5 text-amber-200" /> {f.name}
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EOR Content */}
              {expandedPricing === 'eor' && (
                <div className="h-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 p-8 flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <span className="text-blue-100 text-[13px] font-medium uppercase tracking-wide">Employment Only</span>
                      <h2 className="text-white text-[28px] font-bold">EOR Only</h2>
                    </div>
                  </div>

                  <p className="text-white/90 text-[16px] leading-relaxed mb-8 max-w-xl">
                    Already have candidates? We handle employment, payroll, benefits, and compliance. You manage the work, we manage the rest.
                  </p>

                  <div className="flex-1 flex items-center">
                    <div className="grid md:grid-cols-2 gap-6 w-full">
                      {/* Pricing Box */}
                      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                        <h3 className="text-white/80 text-[13px] font-medium uppercase tracking-wide mb-4">Pricing Model</h3>
                        <p className="text-white text-[18px] font-semibold mb-4">Fixed Monthly Fee</p>
                        <p className="text-white/70 text-[14px] mb-6">Simple, predictable pricing per employee</p>
                        <div className="text-center">
                          <span className="text-white text-[56px] font-bold leading-none">R{Number(config.eor_monthly_fee || 7000).toLocaleString()}</span>
                          <p className="text-white/80 text-[16px] mt-2">per person / month</p>
                        </div>
                      </div>

                      {/* Features Box */}
                      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                        <h3 className="text-white/80 text-[13px] font-medium uppercase tracking-wide mb-4">What's Included</h3>
                        <ul className="space-y-3">
                          {features
                            .filter(f => serviceFeatures.eor[f.name])
                            .map(f => (
                              <li key={f.name} className="flex items-center gap-3 text-white">
                                <Check className="w-5 h-5 text-blue-200" /> {f.name}
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Retained Content */}
              {expandedPricing === 'retained' && (
                <div className="h-full bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 p-8 flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <span className="text-emerald-100 text-[13px] font-medium uppercase tracking-wide">Team Building</span>
                      <h2 className="text-white text-[28px] font-bold">Retained</h2>
                    </div>
                  </div>

                  <p className="text-white/90 text-[16px] leading-relaxed mb-8 max-w-xl">
                    Building a team? Get priority access to our recruitment team with guaranteed placements and free replacements.
                  </p>

                  <div className="flex-1 flex items-center">
                    <div className="grid md:grid-cols-2 gap-6 w-full">
                      {/* Pricing Box */}
                      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                        <h3 className="text-white/80 text-[13px] font-medium uppercase tracking-wide mb-4">Pricing Model</h3>
                        <p className="text-white text-[18px] font-semibold mb-4">Retainer + Placement Fee</p>
                        <p className="text-white/70 text-[14px] mb-6">Monthly retainer plus small fee per successful hire</p>
                        <div className="flex items-center justify-center gap-6">
                          <div className="text-center">
                            <span className="text-white text-[40px] font-bold leading-none">R{(Number(config.retained_monthly_retainer || 20000) / 1000)}k</span>
                            <p className="text-white/80 text-[14px] mt-1">per month</p>
                          </div>
                          <span className="text-white/50 text-[32px]">+</span>
                          <div className="text-center">
                            <span className="text-white text-[40px] font-bold leading-none">{Math.round(Number(config.retained_placement_fee) * 100 || 5)}%</span>
                            <p className="text-white/80 text-[14px] mt-1">per placement</p>
                          </div>
                        </div>
                      </div>

                      {/* Features Box */}
                      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                        <h3 className="text-white/80 text-[13px] font-medium uppercase tracking-wide mb-4">What's Included</h3>
                        <ul className="space-y-3">
                          {features
                            .filter(f => serviceFeatures.retained[f.name])
                            .map(f => (
                              <li key={f.name} className="flex items-center gap-3 text-white">
                                <Check className="w-5 h-5 text-emerald-200" /> {f.name}
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Headhunting Content */}
              {expandedPricing === 'headhunting' && (
                <div className="h-full bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400 p-8 flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                      <Crosshair className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <span className="text-purple-100 text-[13px] font-medium uppercase tracking-wide">Single Hire</span>
                      <h2 className="text-white text-[28px] font-bold">Headhunting</h2>
                    </div>
                  </div>

                  <p className="text-white/90 text-[16px] leading-relaxed mb-8 max-w-xl">
                    Need one key hire? No retainers, no commitments. Pay only when we successfully place your candidate.
                  </p>

                  <div className="flex-1 flex items-center">
                    <div className="grid md:grid-cols-2 gap-6 w-full">
                      {/* Pricing Box */}
                      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                        <h3 className="text-white/80 text-[13px] font-medium uppercase tracking-wide mb-4">Pricing Model</h3>
                        <p className="text-white text-[18px] font-semibold mb-4">Success-Based Fee</p>
                        <p className="text-white/70 text-[14px] mb-6">No upfront costs. Pay only when we deliver.</p>
                        <div className="text-center">
                          <span className="text-white text-[56px] font-bold leading-none">{Math.round(Number(config.headhunting_placement_fee) * 100 || 20)}%</span>
                          <p className="text-white/80 text-[16px] mt-2">of annual salary</p>
                        </div>
                      </div>

                      {/* Features Box */}
                      <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                        <h3 className="text-white/80 text-[13px] font-medium uppercase tracking-wide mb-4">What's Included</h3>
                        <ul className="space-y-3">
                          {features
                            .filter(f => serviceFeatures.headhunting[f.name])
                            .map(f => (
                              <li key={f.name} className="flex items-center gap-3 text-white">
                                <Check className="w-5 h-5 text-purple-200" /> {f.name}
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Configurator + Sticky Card */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Section Header */}
        <div className="mb-8">
          <span className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">Step 2</span>
          <h2 className="text-[28px] font-bold text-gray-900 mt-1">Build Your Plan & See Your Estimate</h2>
          <p className="text-[15px] text-gray-600 mt-2">Configure your requirements and watch your estimate update in real-time.</p>
        </div>

        <div className="flex gap-8">
          {/* Left: Configurator */}
          <div className="flex-1 space-y-6">
            {/* Services Needed */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h3 className="text-[14px] font-semibold text-gray-900 mb-4">What do you need?</h3>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${needs.recruitment ? 'border-gray-900 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={needs.recruitment}
                    onChange={(e) => setNeeds({ ...needs, recruitment: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <div>
                    <span className="text-[14px] font-medium text-gray-900 block">Recruitment</span>
                    <span className="text-[12px] text-gray-500">Find & hire talent</span>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${needs.eor ? 'border-gray-900 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={needs.eor}
                    onChange={(e) => setNeeds({ ...needs, eor: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <div>
                    <span className="text-[14px] font-medium text-gray-900 block">Employment</span>
                    <span className="text-[12px] text-gray-500">EOR services</span>
                  </div>
                </label>
              </div>

              {/* Hire Type - shown when recruitment is selected but NOT when both are selected */}
              {needs.recruitment && !needs.eor && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-[13px] text-gray-600 mb-3">What type of hiring?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setHireType('single')}
                      className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-[13px] font-medium transition-all ${
                        hireType === 'single'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Single Hire
                    </button>
                    <button
                      onClick={() => setHireType('team')}
                      className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-[13px] font-medium transition-all ${
                        hireType === 'team'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Team / Multiple
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hiring Plan */}
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-gray-900">Hiring Plan</h3>
                <select
                  value={years}
                  onChange={(e) => {
                    const newYears = Number(e.target.value)
                    setYears(newYears)
                    setRoles(roles.filter(r => r.year <= newYears))
                  }}
                  className="h-8 px-2 border border-gray-300 rounded text-[13px] bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                >
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                {Array.from({ length: years }, (_, i) => i + 1).map((year) => {
                  const yearRoles = rolesByYear[year] || []
                  return (
                    <div key={year} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold text-gray-700">Year {year}</span>
                        <button
                          onClick={() => addRole(year)}
                          className="text-[12px] text-gray-500 hover:text-gray-900 font-medium"
                        >
                          + Add
                        </button>
                      </div>
                      {yearRoles.length === 0 ? (
                        <p className="text-[13px] text-gray-400 italic">No hires planned</p>
                      ) : (
                        <div className="space-y-2">
                          {yearRoles.map((role) => (
                            <div key={role.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={role.title}
                                onChange={(e) => updateRole(role.id, 'title', e.target.value)}
                                placeholder="Role"
                                className="flex-1 min-w-0 h-8 px-2 border border-gray-200 rounded text-[13px] focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                              />
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[12px]">R</span>
                                <input
                                  type="number"
                                  value={role.salary}
                                  onChange={(e) => updateRole(role.id, 'salary', Number(e.target.value))}
                                  className="w-24 h-8 pl-5 pr-1 border border-gray-200 rounded text-[13px] focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                                  step="5000"
                                />
                              </div>
                              <input
                                type="number"
                                value={role.count}
                                onChange={(e) => updateRole(role.id, 'count', Number(e.target.value))}
                                className="w-12 h-8 px-1 border border-gray-200 rounded text-[13px] text-center focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                                min="1"
                              />
                              <button
                                onClick={() => removeRole(role.id)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded transition-colors"
                              >
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

              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-[13px] text-gray-600">{totalHires} hire{totalHires !== 1 ? 's' : ''}</span>
                <span className="text-[14px] font-semibold text-gray-900">{formatCurrency(totalAnnualSalary)}/yr</span>
              </div>
            </div>

            {/* Additional Services (only for Enterprise - when both recruitment AND EOR selected) */}
            {needs.recruitment && needs.eor && (
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-[14px] font-semibold text-gray-900 mb-4">Additional Services</h3>

                {/* Column Headers */}
                <div className="flex items-center text-[10px] text-gray-500 uppercase tracking-wide mb-2 px-3">
                  <span className="flex-1">Service</span>
                  <span className="w-[120px] text-center">Rate</span>
                  <span className="w-[80px] text-right">Total</span>
                </div>

                {/* Annual Costs */}
                <div className="mb-3">
                  <div className="space-y-1.5">
                    {[
                      {
                        key: 'deskFees',
                        label: 'Desk/Co-working',
                        value: additionals.deskFees.costPerDesk,
                        enabled: additionals.deskFees.enabled,
                        annual: additionals.deskFees.costPerDesk * totalHires * 12,
                        inputLabel: '/mo/pp'
                      },
                      {
                        key: 'monthlyLunches',
                        label: 'Monthly Lunches',
                        value: additionals.monthlyLunches.costPerPerson,
                        enabled: additionals.monthlyLunches.enabled,
                        annual: additionals.monthlyLunches.costPerPerson * totalHires * 12,
                        inputLabel: '/mo/pp'
                      },
                      {
                        key: 'quarterlyEvents',
                        label: 'Quarterly Events',
                        value: additionals.quarterlyEvents.costPerPerson,
                        enabled: additionals.quarterlyEvents.enabled,
                        annual: additionals.quarterlyEvents.costPerPerson * totalHires * 4,
                        inputLabel: '/qtr/pp'
                      },
                      {
                        key: 'yearEndParty',
                        label: 'Year-End Party',
                        value: additionals.yearEndParty.costPerPerson,
                        enabled: additionals.yearEndParty.enabled,
                        annual: additionals.yearEndParty.costPerPerson * totalHires,
                        inputLabel: '/pp'
                      },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => {
                              const key = item.key as keyof Additionals
                              setAdditionals({
                                ...additionals,
                                [key]: { ...additionals[key], enabled: e.target.checked }
                              })
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 flex-shrink-0"
                          />
                          <span className="text-[13px] text-gray-700 truncate">{item.label}</span>
                        </label>
                        <div className="w-[120px] flex items-center justify-center gap-1">
                          <span className="text-[11px] text-gray-400">R</span>
                          <input
                            type="number"
                            value={item.value}
                            onChange={(e) => {
                              const key = item.key as keyof Additionals
                              const valueKey = key === 'deskFees' ? 'costPerDesk' : 'costPerPerson'
                              setAdditionals({
                                ...additionals,
                                [key]: { ...additionals[key], [valueKey]: Number(e.target.value) }
                              })
                            }}
                            className="w-20 h-8 px-2 border border-gray-200 rounded text-[13px] text-right focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none disabled:opacity-50 disabled:bg-gray-100"
                            disabled={!item.enabled}
                          />
                          <span className="text-[9px] text-gray-400 w-[36px]">{item.inputLabel}</span>
                        </div>
                        <span className="w-[80px] text-[12px] font-medium text-gray-700 text-right">
                          {item.enabled ? formatCurrency(item.annual) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center px-3 py-2 border-t border-gray-200 mt-2">
                    <span className="flex-1 text-[12px] font-medium text-gray-600">Annual subtotal</span>
                    <span className="w-[120px]"></span>
                    <span className="w-[80px] text-[13px] font-semibold text-gray-900 text-right">{formatCurrency(monthlyAdditionals * 12)}</span>
                  </div>
                </div>

                {/* One-Off Costs */}
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 px-3">One-Off Costs</div>
                  <div className="flex items-center bg-white rounded-lg px-3 py-2 border border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={additionals.assets.enabled}
                        onChange={(e) => {
                          setAdditionals({
                            ...additionals,
                            assets: { ...additionals.assets, enabled: e.target.checked }
                          })
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 flex-shrink-0"
                      />
                      <span className="text-[13px] text-gray-700 truncate">Assets (laptop, etc)</span>
                    </label>
                    <div className="w-[120px] flex items-center justify-center gap-1">
                      <span className="text-[11px] text-gray-400">R</span>
                      <input
                        type="number"
                        value={additionals.assets.costPerHire}
                        onChange={(e) => {
                          setAdditionals({
                            ...additionals,
                            assets: { ...additionals.assets, costPerHire: Number(e.target.value) }
                          })
                        }}
                        className="w-20 h-8 px-2 border border-gray-200 rounded text-[13px] text-right focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none disabled:opacity-50 disabled:bg-gray-100"
                        disabled={!additionals.assets.enabled}
                      />
                      <span className="text-[9px] text-gray-400 w-[36px]">/hire</span>
                    </div>
                    <span className="w-[80px] text-[12px] font-medium text-gray-700 text-right">
                      {additionals.assets.enabled ? formatCurrency(oneTimeAdditionals) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center px-3 py-2 border-t border-gray-200 mt-2">
                    <span className="flex-1 text-[12px] font-medium text-gray-600">One-off subtotal</span>
                    <span className="w-[120px]"></span>
                    <span className="w-[80px] text-[13px] font-semibold text-gray-900 text-right">{formatCurrency(oneTimeAdditionals)}</span>
                  </div>
                </div>

                {/* Custom Services */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2 px-3">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Custom Services</span>
                    <button
                      onClick={addCustomAdditional}
                      className="flex items-center gap-1 text-[12px] text-gray-600 hover:text-gray-900 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Custom
                    </button>
                  </div>
                  {customAdditionals.length === 0 ? (
                    <p className="text-[13px] text-gray-400 italic px-3 py-2">No custom services added</p>
                  ) : (
                    <div className="space-y-1.5">
                      {customAdditionals.map((custom) => {
                        // Calculate annual cost for this custom service
                        let customAnnual = 0
                        if (custom.enabled) {
                          if (custom.frequency === 'monthly') {
                            customAnnual = custom.costPerPerson * totalHires * 12
                          } else if (custom.frequency === 'quarterly') {
                            customAnnual = custom.costPerPerson * totalHires * 4
                          } else if (custom.frequency === 'annual') {
                            customAnnual = custom.costPerPerson * totalHires
                          } else if (custom.frequency === 'one-off') {
                            customAnnual = custom.costPerPerson * totalHires
                          }
                        }
                        return (
                          <div key={custom.id} className="flex items-center bg-white rounded-lg px-3 py-2 border border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={custom.enabled}
                                onChange={(e) => updateCustomAdditional(custom.id, 'enabled', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 flex-shrink-0"
                              />
                              <input
                                type="text"
                                value={custom.name}
                                onChange={(e) => updateCustomAdditional(custom.id, 'name', e.target.value)}
                                placeholder="Service name"
                                className="flex-1 min-w-0 h-6 px-1 border-0 text-[13px] text-gray-700 focus:ring-0 outline-none bg-transparent"
                              />
                            </label>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-gray-400">R</span>
                              <input
                                type="number"
                                value={custom.costPerPerson}
                                onChange={(e) => updateCustomAdditional(custom.id, 'costPerPerson', Number(e.target.value))}
                                className="w-16 h-7 px-1 border border-gray-200 rounded text-[12px] text-right focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none disabled:opacity-50 disabled:bg-gray-100"
                                disabled={!custom.enabled}
                              />
                              <select
                                value={custom.frequency}
                                onChange={(e) => updateCustomAdditional(custom.id, 'frequency', e.target.value)}
                                className="h-7 px-1 border border-gray-200 rounded text-[11px] focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none disabled:opacity-50 disabled:bg-gray-100"
                                disabled={!custom.enabled}
                              >
                                <option value="monthly">/mo/pp</option>
                                <option value="quarterly">/qtr/pp</option>
                                <option value="annual">/yr/pp</option>
                                <option value="one-off">/hire</option>
                              </select>
                            </div>
                            <span className="w-[70px] text-[12px] font-medium text-gray-700 text-right">
                              {custom.enabled ? formatCurrency(customAnnual) : '—'}
                            </span>
                            <button
                              onClick={() => removeCustomAdditional(custom.id)}
                              className="ml-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Sticky Service Card */}
          <div className="w-[340px] flex-shrink-0">
            <div className="sticky top-24">
              {!needs.recruitment && !needs.eor ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calculator className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-[14px] text-gray-600 font-medium">Select a service to see your estimate</p>
                  <p className="text-[13px] text-gray-400 mt-1">Choose Recruitment or Employment</p>
                </div>
              ) : (
                <>
                  {relevantServices.map((s) => {
                    const calc = calculations[s.key]
                    const colors = colorClasses[s.color]
                    if (!calc || !colors) return null

                    return (
                      <div key={s.key} className={`rounded-xl border-2 overflow-hidden bg-white shadow-lg ${colors.border}`}>
                        {/* Header */}
                        <div className={`${colors.bg} px-5 py-5`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-11 h-11 bg-white/20 rounded-lg flex items-center justify-center">
                              <s.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-[17px]">{s.name}</h3>
                              <p className="text-white/70 text-[12px]">{calc.rate}</p>
                            </div>
                          </div>
                          {calc.note && <p className="text-white/60 text-[12px]">{calc.note}</p>}
                        </div>

                        {/* Total Price */}
                        <div className="px-5 py-5 border-b border-gray-100 bg-gray-50">
                          {s.key === 'eor' ? (
                            <>
                              <div className="text-[12px] text-gray-500 uppercase tracking-wide mb-1">Monthly Cost</div>
                              <div className={`text-[28px] font-bold ${colors.text}`}>
                                {formatCurrency(calc.monthly)}
                              </div>
                              <div className="text-[13px] text-gray-500">
                                {formatCurrency(calc.monthly * 12)}/year • {formatCurrency(calc.total)} total
                              </div>
                              {/* Year by Year for EOR (if multi-year) */}
                              {years > 1 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                                  {calc.byYear.map((yearData, idx) => {
                                    // Calculate cumulative employees for this year
                                    const hiresUpToYear = roles
                                      .filter(r => r.year <= idx + 1)
                                      .reduce((sum, r) => sum + r.count, 0)
                                    return (
                                      <div key={idx} className="flex justify-between text-[13px]">
                                        <span className="text-gray-500">
                                          Year {idx + 1}
                                          <span className="text-gray-400 ml-1">({hiresUpToYear} employee{hiresUpToYear !== 1 ? 's' : ''})</span>
                                        </span>
                                        <span className="font-medium text-gray-700">{formatCurrency(yearData.total)}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="text-[12px] text-gray-500 uppercase tracking-wide mb-1">Estimated Total</div>
                              <div className={`text-[28px] font-bold ${colors.text}`}>
                                {formatCurrency(calc.total)}
                              </div>
                              <div className="text-[13px] text-gray-500">over {years} year{years > 1 ? 's' : ''}</div>
                              {/* Year by Year (if multi-year) */}
                              {years > 1 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                                  {calc.byYear.map((yearData, idx) => {
                                    const enterpriseMarkups = [
                                      Number(config.enterprise_markup_year1) || 0.22,
                                      Number(config.enterprise_markup_year2) || 0.20,
                                      Number(config.enterprise_markup_year3) || 0.18,
                                      Number(config.enterprise_markup_year4_plus) || 0.16,
                                    ]
                                    const rateForYear = s.key === 'enterprise' ? enterpriseMarkups[Math.min(idx, 3)] : null
                                    return (
                                      <div key={idx} className="flex justify-between text-[13px]">
                                        <span className="text-gray-500">
                                          Year {idx + 1}
                                          {rateForYear != null && (
                                            <span className="text-gray-400 ml-1">({Math.round(rateForYear * 100)}%)</span>
                                          )}
                                        </span>
                                        <span className="font-medium text-gray-700">{formatCurrency(yearData.total)}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Cost Breakdown */}
                        <div className="px-5 py-4 border-b border-gray-100">
                          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Cost Breakdown</div>
                          <div className="space-y-1.5">
                            {calc.totals.salaryMargin > 0 && (
                              <div className="flex justify-between text-[13px]">
                                <span className="text-gray-600">Salary Margin</span>
                                <span className="font-medium text-gray-900">{formatCurrency(calc.totals.salaryMargin)}</span>
                              </div>
                            )}
                            {calc.totals.monthlyFees > 0 && (
                              <div className="flex justify-between text-[13px]">
                                <span className="text-gray-600">{s.key === 'eor' ? 'EOR Fees' : 'Retainer'}</span>
                                <span className="font-medium text-gray-900">{formatCurrency(calc.totals.monthlyFees)}</span>
                              </div>
                            )}
                            {calc.totals.placementFees > 0 && (
                              <div className="flex justify-between text-[13px]">
                                <span className="text-gray-600">Placement Fee</span>
                                <span className="font-medium text-gray-900">{formatCurrency(calc.totals.placementFees)}</span>
                              </div>
                            )}
                            {calc.totals.additionalsFees > 0 && (
                              <div className="flex justify-between text-[13px]">
                                <span className="text-gray-600">Additionals</span>
                                <span className="font-medium text-gray-900">{formatCurrency(calc.totals.additionalsFees)}</span>
                              </div>
                            )}
                            {calc.totals.assetsFees > 0 && (
                              <div className="flex justify-between text-[13px]">
                                <span className="text-gray-600">Assets</span>
                                <span className="font-medium text-gray-900">{formatCurrency(calc.totals.assetsFees)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Features */}
                        <div className="px-5 py-4 border-b border-gray-100">
                          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">Includes</div>
                          <div className="space-y-1">
                            {features
                              .filter((feature) => serviceFeatures[s.key as keyof typeof serviceFeatures]?.[feature.name])
                              .map((feature) => (
                                <div key={feature.name} className="flex items-center gap-2 text-[12px]">
                                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                  <span className="text-gray-700">{feature.name}</span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="p-5">
                          <Link
                            to={s.link}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 ${colors.bg} text-white text-[14px] font-medium rounded-lg hover:opacity-90 transition-opacity`}
                          >
                            Learn More <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-[20px] font-semibold text-white mb-2">Ready to discuss your needs?</h3>
              <p className="text-[15px] text-gray-300">Get a detailed proposal tailored to your specific requirements.</p>
            </div>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 text-[14px] font-medium rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Get a Quote <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
