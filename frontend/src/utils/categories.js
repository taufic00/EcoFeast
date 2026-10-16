// Shared category and unit definitions used by donations and NGO requirements.

export const CATEGORIES = [
  { value: 'food', label: 'Food', defaultUnit: 'kg' },
  { value: 'clothes', label: 'Clothes', defaultUnit: 'pieces' },
  { value: 'books', label: 'Books & Stationery', defaultUnit: 'pieces' },
  { value: 'household', label: 'Household Items', defaultUnit: 'pieces' },
  { value: 'other', label: 'Other', defaultUnit: 'pieces' },
]

export const UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'pieces', label: 'pieces' },
]

export function categoryLabel(value) {
  return CATEGORIES.find((c) => c.value === value)?.label || 'Other'
}

export function defaultUnitFor(category) {
  return CATEGORIES.find((c) => c.value === category)?.defaultUnit || 'pieces'
}
