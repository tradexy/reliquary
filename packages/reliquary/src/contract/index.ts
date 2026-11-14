export type {
  RawRow,
  FieldMapping,
  Normalised,
  Rejected,
  LegacySource,
  ResurrectionReport,
} from './types.js'

export type { ValidationResult, ValidationFailure, ValidationSuccess } from './validate.js'
export { validateSource, assertValidSource } from './validate.js'
