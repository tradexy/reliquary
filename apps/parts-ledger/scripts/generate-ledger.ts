/**
 * generate-ledger.ts
 *
 * Seeded, deterministic generator producing ~1200 realistic automotive parts
 * stock ledger rows in the dot-matrix print format (ALL CAPS column names,
 * space-padded strings).
 *
 * Outputs to apps/parts-ledger/data/ledger.json.
 *
 * Run with:
 *   npx tsx apps/parts-ledger/scripts/generate-ledger.ts
 *
 * The seed is fixed so output is reproducible. Three deliberately broken rows
 * are appended at the end so tests can target them by content.
 *
 * Broken rows:
 *   1. QTY = 'n/a'       → rejected (non-numeric count)
 *   2. BIN = ''          → rejected (no bin code, cannot be located)
 *   3. STATUS = 'Z'      → rejected (unknown status letter)
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s += 0x6d2b79f5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

const rng = mulberry32(0xdeadbe42)

function pick<T>(arr: readonly T[]): T {
  const idx = Math.floor(rng() * arr.length)
  return arr[idx] ?? arr[0]!
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length)
}

function zeroPad(n: number, len: number): string {
  return String(n).padStart(len, '0')
}

// ── Vocabulary ────────────────────────────────────────────────────────────

const PART_CATEGORIES = [
  { prefix: 'BRK', name: 'BRAKE' },
  { prefix: 'ENG', name: 'ENGINE' },
  { prefix: 'EXH', name: 'EXHAUST' },
  { prefix: 'FIL', name: 'FILTER' },
  { prefix: 'FUE', name: 'FUEL' },
  { prefix: 'GBX', name: 'GEARBOX' },
  { prefix: 'IGN', name: 'IGNITION' },
  { prefix: 'SUS', name: 'SUSPENSION' },
  { prefix: 'TRN', name: 'TRANSMISSION' },
  { prefix: 'WHB', name: 'WHEEL BEARING' },
] as const

const DESCRIPTIONS: Record<string, readonly string[]> = {
  BRAKE: [
    'FRONT BRAKE PAD SET',
    'REAR BRAKE PAD SET',
    'BRAKE DISC FRONT',
    'BRAKE DISC REAR',
    'BRAKE CALIPER LH',
    'BRAKE CALIPER RH',
    'BRAKE MASTER CYLINDER',
    'BRAKE SERVO UNIT',
    'HANDBRAKE CABLE',
    'BRAKE HOSE FRONT',
  ],
  ENGINE: [
    'HEAD GASKET SET',
    'TIMING BELT KIT',
    'TIMING CHAIN KIT',
    'CAM BELT TENSIONER',
    'CRANKSHAFT PULLEY',
    'OIL PUMP',
    'WATER PUMP',
    'THERMOSTAT',
    'ROCKER COVER GASKET',
    'SUMP PLUG WASHER PKT',
  ],
  EXHAUST: [
    'FRONT PIPE',
    'CENTRE SECTION',
    'REAR SILENCER',
    'CATALYTIC CONVERTER',
    'FLEX PIPE',
    'EXHAUST MANIFOLD GASKET',
    'LAMBDA SENSOR',
    'CLAMP 50MM',
    'EXHAUST MOUNT RUBBER',
    'BACK BOX',
  ],
  FILTER: [
    'OIL FILTER',
    'AIR FILTER',
    'FUEL FILTER',
    'CABIN POLLEN FILTER',
    'FUEL STRAINER',
    'CRANKCASE BREATHER FILTER',
    'TRANSMISSION FILTER',
    'POWER STEERING FILTER',
  ],
  FUEL: [
    'FUEL PUMP',
    'FUEL PUMP IN-TANK',
    'FUEL PRESSURE REGULATOR',
    'FUEL INJECTOR',
    'FUEL RAIL',
    'THROTTLE BODY',
    'IDLE CONTROL VALVE',
    'FUEL FILLER CAP LOCKING',
  ],
  GEARBOX: [
    'CLUTCH KIT 3 PIECE',
    'CLUTCH PLATE',
    'CLUTCH PRESSURE PLATE',
    'CLUTCH RELEASE BEARING',
    'GEARBOX MOUNT',
    'GEAR SELECTOR CABLE',
    'REVERSE LIGHT SWITCH',
    'GEARBOX OIL SEAL',
  ],
  IGNITION: [
    'SPARK PLUG',
    'IGNITION COIL PACK',
    'DISTRIBUTOR CAP',
    'DISTRIBUTOR ROTOR ARM',
    'HT LEAD SET',
    'IGNITION MODULE',
    'CRANK POSITION SENSOR',
    'CAMSHAFT POSITION SENSOR',
  ],
  SUSPENSION: [
    'FRONT SHOCK ABSORBER',
    'REAR SHOCK ABSORBER',
    'COIL SPRING FRONT',
    'COIL SPRING REAR',
    'TOP STRUT MOUNT',
    'LOWER WISHBONE',
    'TRACK ROD END',
    'BALL JOINT LOWER',
    'ANTI-ROLL BAR LINK',
    'FRONT HUB BEARING',
  ],
  TRANSMISSION: [
    'DRIVESHAFT LH',
    'DRIVESHAFT RH',
    'CV JOINT OUTER',
    'CV JOINT INNER',
    'DRIVESHAFT GAITER KIT',
    'PROP SHAFT CENTRE BEARING',
    'DIFFERENTIAL MOUNT',
  ],
  'WHEEL BEARING': [
    'FRONT WHEEL BEARING',
    'REAR WHEEL BEARING',
    'HUB NUT',
    'ABS RELUCTOR RING',
    'WHEEL SPEED SENSOR',
  ],
}

const VEHICLES = [
  'FORD FOCUS 1.6',
  'FORD FOCUS 2.0 TDCI',
  'FORD MONDEO 2.0 TDCI',
  'FORD FIESTA 1.4',
  'FORD TRANSIT 2.4 TDCI',
  'VAUXHALL ASTRA 1.6',
  'VAUXHALL VECTRA 2.2',
  'VAUXHALL ZAFIRA 1.8',
  'VAUXHALL CORSA 1.2',
  'PEUGEOT 206 1.4',
  'PEUGEOT 307 1.6 HDI',
  'PEUGEOT 406 2.0 HDI',
  'RENAULT MEGANE 1.6',
  'RENAULT LAGUNA 1.9 DCI',
  'RENAULT CLIO 1.2',
  'VOLKSWAGEN GOLF 1.9 TDI',
  'VOLKSWAGEN PASSAT 1.9 TDI',
  'VOLKSWAGEN POLO 1.4',
  'BMW 3 SERIES 2.0D',
  'BMW 5 SERIES 3.0D',
  'AUDI A4 1.9 TDI',
  'AUDI A3 2.0 TDI',
  'HONDA CIVIC 1.4',
  'HONDA ACCORD 2.2 CDTI',
  'TOYOTA COROLLA 1.6',
  'NISSAN MICRA 1.0',
  'NISSAN PRIMERA 1.8',
  'CITROEN XSARA 1.6',
  'CITROEN C3 1.4 HDI',
  'SEAT LEON 1.9 TDI',
  'FIAT PUNTO 1.2',
  'SKODA OCTAVIA 1.9 TDI',
  'MITSUBISHI L200 2.5 DID',
  'LAND ROVER FREELANDER 2.0 TD4',
]

// Bin codes: row A–D, positions 1–12
const BIN_ROWS = ['A', 'B', 'C', 'D']
const BIN_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function randomBin(): string {
  const row = pick(BIN_ROWS)
  const pos = pick(BIN_POSITIONS)
  return `${row}${pos}`
}

// STATUS: A = active (~80%), D = discontinued (~20%)
const STATUS_POOL = ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'D', 'D'] as const

// Date strings — roughly 1990s stock
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
function randomDate(): string {
  const year = 1988 + Math.floor(rng() * 16) // 1988–2003
  const month = pick(MONTHS)
  const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0')
  return `${day}/${month}/${year}`
}

// ── Row builder ───────────────────────────────────────────────────────────

interface RawLedgerRow {
  PART_NO: string
  DESCRIPTION: string
  VEHICLE: string
  QTY: string
  BIN: string
  STATUS: string
  PRICE_P: string
  LAST_MOVED: string
}

function buildRow(seq: number): RawLedgerRow {
  const category = pick(PART_CATEGORIES)
  const descList = DESCRIPTIONS[category.name] ?? DESCRIPTIONS['BRAKE']!
  const description = pick(descList)
  const vehicle = pick(VEHICLES)

  // Part number: category prefix + sequential number within that prefix, zero-padded.
  const partNo = `${category.prefix}${zeroPad(seq, 5)}`

  // QTY: mostly small integers, occasionally zero (backorder / discontinued)
  const qty = Math.floor(rng() * 24)

  // Price in pence: 500–45000 (£5–£450), or blank for some parts
  const priceP = rng() < 0.05
    ? ''
    : String(500 + Math.floor(rng() * 44500))

  // LAST_MOVED: blank for ~10% of items
  const lastMoved = rng() < 0.1 ? '' : randomDate()

  return {
    PART_NO: padRight(partNo, 12),
    DESCRIPTION: padRight(description, 40),
    VEHICLE: padRight(vehicle, 36),
    QTY: padRight(String(qty), 6),
    BIN: padRight(randomBin(), 4),
    STATUS: padRight(pick(STATUS_POOL), 2),
    PRICE_P: padRight(priceP, 8),
    LAST_MOVED: padRight(lastMoved, 12),
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

const RECORD_COUNT = 1197 // leaves room for the three broken rows → total 1200

const records: Array<Partial<RawLedgerRow>> = []

for (let i = 1; i <= RECORD_COUNT; i++) {
  records.push(buildRow(i))
}

// ── Three deliberately broken rows ───────────────────────────────────────
// Always appended in this exact order at the end of the file.

// Broken row 1: non-numeric QTY ('n/a')
records.push({
  PART_NO: padRight('ERR00001', 12),
  DESCRIPTION: padRight('BRAKE PAD SET FRONT', 40),
  VEHICLE: padRight('FORD FOCUS 1.6', 36),
  QTY: padRight('n/a', 6),                            // ← rejected: non-numeric
  BIN: padRight('A3', 4),
  STATUS: padRight('A', 2),
  PRICE_P: padRight('3200', 8),
  LAST_MOVED: padRight('12/06/1999', 12),
})

// Broken row 2: missing BIN
records.push({
  PART_NO: padRight('ERR00002', 12),
  DESCRIPTION: padRight('OIL FILTER', 40),
  VEHICLE: padRight('VAUXHALL ASTRA 1.6', 36),
  QTY: padRight('4', 6),
  BIN: '',                                             // ← rejected: no bin code
  STATUS: padRight('A', 2),
  PRICE_P: padRight('850', 8),
  LAST_MOVED: padRight('03/11/2001', 12),
})

// Broken row 3: unknown STATUS letter 'Z'
records.push({
  PART_NO: padRight('ERR00003', 12),
  DESCRIPTION: padRight('TIMING BELT KIT', 40),
  VEHICLE: padRight('VOLKSWAGEN GOLF 1.9 TDI', 36),
  QTY: padRight('2', 6),
  BIN: padRight('C7', 4),
  STATUS: padRight('Z', 2),                            // ← rejected: unknown status
  PRICE_P: padRight('7500', 8),
  LAST_MOVED: padRight('22/08/2000', 12),
})

// ── Write output ──────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = join(__dirname, '..', 'data')
const outPath = join(outDir, 'ledger.json')

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(records, null, 2), 'utf8')

console.log(`Wrote ${records.length} records to ${outPath}`)
console.log(`  ${RECORD_COUNT} valid records`)
console.log(`  3 deliberately broken rows (indices ${RECORD_COUNT}–${records.length - 1})`)
