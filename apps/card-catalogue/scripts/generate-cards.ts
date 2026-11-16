/**
 * generate-cards.ts
 *
 * Seeded, deterministic generator producing ~2000 realistic British
 * local-history catalogue records in the dBase export shape (ALL CAPS
 * column names, trailing-space-padded strings).
 *
 * Outputs to apps/card-catalogue/data/cards.json.
 *
 * Run with:
 *   npx tsx apps/card-catalogue/scripts/generate-cards.ts
 *
 * The seed is fixed so the output is reproducible. The three deliberately
 * broken rows are appended last and are always identically positioned so
 * tests can target them by content rather than index.
 *
 * Broken rows:
 *   1. Missing SHELFMARK                → rejected (no archive reference)
 *   2. Impossible DATE '18999'          → rejected (not a valid year form)
 *   3. Blank TITLE                      → rejected (unsearchable card)
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Seeded PRNG (mulberry32) ───────────────────────────────────────────────
// A simple 32-bit PRNG that is deterministic given a seed. No external deps.

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

const rng = mulberry32(0xc0ffee42)

function pick<T>(arr: readonly T[]): T {
  const idx = Math.floor(rng() * arr.length)
  return arr[idx] ?? arr[0]!
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const result: T[] = []
  for (let i = 0; i < n; i++) result.push(pick(arr))
  return result
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s : s + ' '.repeat(len - s.length)
}

// ── Vocabulary ────────────────────────────────────────────────────────────

const SURNAMES = [
  'ATKINSON', 'BAINES', 'BARKER', 'BEECH', 'BIRCH', 'BLACKBURN', 'BOOTH',
  'BRIERLEY', 'BROOKS', 'BROWN', 'BUCKLEY', 'BURNLEY', 'CALDER', 'CARR',
  'CARTWRIGHT', 'CHADWICK', 'CLARK', 'CLEGG', 'CLIFTON', 'COATES',
  'COCKCROFT', 'COLDWELL', 'COLLIER', 'COOPER', 'CRABTREE', 'CROMPTON',
  'CROSSLEY', 'CUNLIFFE', 'DAWSON', 'DEWHURST', 'DUCKWORTH', 'EARNSHAW',
  'EASTWOOD', 'ECCLES', 'FARRAR', 'FIRTH', 'FLETCHER', 'FOSTER', 'FOX',
  'GARSIDE', 'GILL', 'GLOVER', 'GOULD', 'GRANT', 'GREENWOOD', 'GRIME',
  'HAGUE', 'HALL', 'HAMILL', 'HARDCASTLE', 'HARGREAVES', 'HARRISON',
  'HARTLEY', 'HEAP', 'HELLIWELL', 'HERON', 'HIRST', 'HODGSON', 'HOGG',
  'HOLDSWORTH', 'HOLROYD', 'HOWARTH', 'HUDSON', 'INGHAM', 'JACKSON',
  'JAGGER', 'JENKINS', 'JESSOP', 'JORDAN', 'KERSHAW', 'LEES', 'LIGHTFOOT',
  'LISTER', 'LONGBOTTOM', 'MALLINSON', 'MARSDEN', 'MELLOR', 'MIDGLEY',
  'MITCHELL', 'MOORHOUSE', 'MOSS', 'MOXON', 'MURGATROYD', 'NAYLOR',
  'NICHOLS', 'NORRIS', 'ORMROYD', 'PICKLES', 'PRIESTLEY', 'RAMSDEN',
  'RAWSON', 'RILEY', 'ROBINSON', 'ROGERSON', 'RUSHWORTH', 'SCHOFIELD',
  'SHAW', 'SHUTTLEWORTH', 'SMITH', 'STANSFIELD', 'SUGDEN', 'SUTCLIFFE',
  'SYKES', 'TAYLOR', 'THORNTON', 'THWAITES', 'TOMLINSON', 'UTTLEY',
  'VARLEY', 'WADE', 'WALKER', 'WALSH', 'WHITAKER', 'WHITELEY', 'WILD',
  'WILKINSON', 'WOOD', 'WRIGLEY',
]

const FORENAMES_M = [
  'ABRAHAM', 'ALBERT', 'ALFRED', 'ARCHIBALD', 'ARTHUR', 'BENJAMIN',
  'CHARLES', 'CLARENCE', 'CLEMENT', 'EDGAR', 'EDWARD', 'EDWIN', 'ERNEST',
  'EZRA', 'FREDERICK', 'GEORGE', 'HAROLD', 'HARRY', 'HENRY', 'HERBERT',
  'HORACE', 'HUGH', 'ISAAC', 'JAMES', 'JASPER', 'JOHN', 'JOSEPH',
  'LEONARD', 'LEWIS', 'MARTIN', 'NATHANIEL', 'NOAH', 'OLIVER', 'OSCAR',
  'PERCIVAL', 'REGINALD', 'RICHARD', 'ROBERT', 'SAMUEL', 'SEPTIMUS',
  'SILAS', 'STANLEY', 'THOMAS', 'WALTER', 'WILFRED', 'WILLIAM',
]

const FORENAMES_F = [
  'ADA', 'AGNES', 'ALICE', 'ANNIE', 'BEATRICE', 'BLANCHE', 'CAROLINE',
  'CHARLOTTE', 'CLARA', 'CONSTANCE', 'DOROTHY', 'EDITH', 'ELEANOR',
  'ELIZABETH', 'ELLEN', 'EMMA', 'ESTHER', 'ETHEL', 'FLORENCE', 'FRANCES',
  'GERTRUDE', 'GRACE', 'HARRIET', 'HELEN', 'HILDA', 'IDA', 'ISABELLA',
  'JANE', 'JANET', 'LILLIAN', 'LOUISA', 'LUCY', 'MABEL', 'MARGARET',
  'MARTHA', 'MARY', 'MAUD', 'MILDRED', 'MIRIAM', 'NORA', 'OLIVE',
  'PHOEBE', 'RACHEL', 'RUTH', 'SARAH', 'SOPHIA', 'VIOLET', 'WINIFRED',
]

const STREETS = [
  'ALBERT STREET', 'ASH GROVE', 'BACK LANE', 'BANK STREET', 'BRIDGE STREET',
  'BROOK LANE', 'BURN ROAD', 'CHAPEL HILL', 'CHURCH LANE', 'CHURCH STREET',
  'CLIFTON ROAD', 'CLOUGH ROAD', 'CROSS STREET', 'DALE STREET', 'ELM TERRACE',
  'FOLD LANE', 'GREAT NORTHERN STREET', 'GREEN LANE', 'GROVE STREET',
  'HALL LANE', 'HEATH ROAD', 'HIGH STREET', 'HILL TOP', 'HOLLY GROVE',
  'IVY TERRACE', 'JUNCTION STREET', 'KING STREET', 'LANE HEAD',
  'LEDGER LANE', 'LIME GROVE', 'LOW LANE', 'MARKET PLACE', 'MILL LANE',
  'MOSS LANE', 'NEW ROAD', 'NORTH STREET', 'OAK AVENUE', 'OLD ROAD',
  'ORCHARD LANE', 'PARK ROAD', 'QUEENS ROAD', 'REGENT STREET', 'ROOK LANE',
  'SCHOOL LANE', 'SOUTH STREET', 'SPRING GROVE', 'STATION ROAD',
  'STONE ROW', 'TENTER LANE', 'THE FOLD', 'TOWN STREET', 'VALLEY ROAD',
  'VICTORIA AVENUE', 'WATER STREET', 'WEST STREET', 'WOOD LANE', 'YARN STREET',
]

const RECORD_TYPES = [
  'Birth certificate', 'Marriage certificate', 'Death certificate',
  'Baptism register entry', 'Burial register entry', 'Census return',
  'Trade directory entry', 'Electoral roll', 'Rate book entry',
  'Tithe apportionment', 'Enclosure award', 'Poor law record',
  'Apprenticeship indenture', 'Will and probate', 'Deeds',
  'Sale catalogue', 'Photograph', 'Postcard', 'Newspaper cutting',
  'Manuscript letter', 'Account book', 'Parish vestry minutes',
  'School log book', 'Medical officer report', 'Nonconformist register',
  'Militia muster roll', 'Coroner\'s inquest', 'Quarter sessions record',
  'Court leet record', 'Manor court roll',
]

const SUBJECTS = [
  'Agriculture', 'Architecture', 'Canal trade', 'Charities', 'Childhood',
  'Church records', 'Civil registration', 'Cloth trade', 'Coal mining',
  'Domestic service', 'Education', 'Electoral reform', 'Enclosure',
  'Family history', 'Health and sanitation', 'Housing', 'Industry',
  'Inland navigation', 'Labour movement', 'Land tenure', 'Law and order',
  'Local government', 'Markets and fairs', 'Migration', 'Nonconformity',
  'Occupations', 'Philanthropy', 'Poor relief', 'Population', 'Railway',
  'Religion', 'Retail trade', 'Roads and turnpikes', 'Textile industry',
  'Town planning', 'Trade and commerce', 'Transport', 'Women and work',
  'Woollen industry', 'Working conditions',
]

const NOTE_PHRASES = [
  'Condition: fair.', 'Condition: good.', 'Condition: poor — foxing.',
  'Duplicate held in county archive.', 'Annotated in pencil.',
  'See also companion volume.', 'Transcription available.',
  'Partial — pages missing.', 'Restricted access.', 'Oversized — flat storage.',
  'Relates to neighbouring township.', 'Cross-ref: estate papers.',
  'Gift of the estate, 1952.', 'Acquired with the Ashworth bequest.',
  'Formerly in the parish chest.', 'Microfilm copy available.',
  'Original in poor condition; handle with cotton gloves.',
  '', '', '', '', // blank notes are common
]

const DATE_FORMS = [
  // Plain year — most common
  (y: number) => String(y),
  (y: number) => String(y),
  (y: number) => String(y),
  // Circa
  (y: number) => `c.${y}`,
  (y: number) => `c.${y}`,
  // Range
  (y: number) => `${y}-${y + Math.floor(rng() * 10) + 1}`,
  // Qualified
  (y: number) => `${y}?`,
  (y: number) => `before ${y}`,
  (y: number) => `after ${y}`,
  // Absent
  (_y: number) => '',
]

function randomYear(): number {
  // Local history records: weight towards 1840–1950
  return 1750 + Math.floor(rng() * 210)
}

function randomDate(): string {
  const year = randomYear()
  const form = pick(DATE_FORMS)
  return form(year)
}

// Shelfmark: prefix/sequence, e.g. LH/0042, PH/0197
const PREFIXES = ['LH', 'PH', 'REG', 'CERT', 'MAP', 'DEED', 'NEWS', 'MAN']

function shelfmark(seq: number): string {
  const prefix = pick(PREFIXES)
  return `${prefix}/${String(seq).padStart(4, '0')}`
}

// ── Row builder ───────────────────────────────────────────────────────────

interface RawCard {
  SHELFMARK: string
  SURNAME: string
  FORENAMES: string
  TITLE: string
  DATE: string
  SUBJECT: string
  NOTES: string
}

function buildRow(seq: number): RawCard {
  const isFemale = rng() < 0.42
  const forenames = isFemale ? pick(FORENAMES_F) : pick(FORENAMES_M)
  const surname = pick(SURNAMES)
  const street = pick(STREETS)
  const recordType = pick(RECORD_TYPES)

  // Title mimics what a card index volunteer would type in 1994.
  const title = `${recordType}: ${surname}, ${forenames} of ${street}`

  return {
    SHELFMARK: padRight(shelfmark(seq), 12),
    SURNAME: padRight(surname, 20),
    FORENAMES: padRight(forenames, 20),
    TITLE: padRight(title, 80),
    DATE: padRight(randomDate(), 12),
    SUBJECT: padRight(pick(SUBJECTS), 30),
    NOTES: padRight(pick(NOTE_PHRASES), 60),
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

const RECORD_COUNT = 1997 // leaves room for the three broken rows → total 2000

const records: Array<Partial<RawCard>> = []

for (let i = 1; i <= RECORD_COUNT; i++) {
  records.push(buildRow(i))
}

// ── Three deliberately broken rows ───────────────────────────────────────
// These are always appended in this exact order at the end of the file so
// tests can reference them by content. Comments explain the rejection reason.

// Broken row 1: missing SHELFMARK
records.push({
  SHELFMARK: '',                                     // ← rejected: no archive reference
  SURNAME: padRight('ARMITAGE', 20),
  FORENAMES: padRight('JOSIAH', 20),
  TITLE: padRight('Census return: ARMITAGE, JOSIAH of MILL LANE', 80),
  DATE: padRight('1881', 12),
  SUBJECT: padRight('Family history', 30),
  NOTES: padRight('', 60),
})

// Broken row 2: impossible DATE
records.push({
  SHELFMARK: padRight('ERR/0001', 12),
  SURNAME: padRight('THWAITES', 20),
  FORENAMES: padRight('EMILY', 20),
  TITLE: padRight('Birth certificate: THWAITES, EMILY of CHURCH LANE', 80),
  DATE: padRight('18999', 12),                       // ← rejected: not a valid year form
  SUBJECT: padRight('Civil registration', 30),
  NOTES: padRight('', 60),
})

// Broken row 3: blank TITLE
records.push({
  SHELFMARK: padRight('ERR/0002', 12),
  SURNAME: padRight('GREENWOOD', 20),
  FORENAMES: padRight('JOSEPH', 20),
  TITLE: '',                                         // ← rejected: unsearchable
  DATE: padRight('1904', 12),
  SUBJECT: padRight('Coal mining', 30),
  NOTES: padRight('Condition: poor.', 60),
})

// ── Write output ──────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = join(__dirname, '..', 'data')
const outPath = join(outDir, 'cards.json')

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(records, null, 2), 'utf8')

console.log(`Wrote ${records.length} records to ${outPath}`)
console.log(`  ${RECORD_COUNT} valid records`)
console.log(`  3 deliberately broken rows (indices ${RECORD_COUNT}–${records.length - 1})`)
