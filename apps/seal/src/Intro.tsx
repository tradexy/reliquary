import { Intro } from '@anchora/core/ui'

const STEPS = [
  'Each entry gets a fingerprint, called a hash, made from its contents.',
  'Each entry also stores the fingerprint of the entry before it, so the entries hold hands in a chain.',
  'Every so often the end of the chain is signed (a seal), and a copy (an anchor) is put somewhere that cannot be overwritten.',
]

const EXAMPLE =
  'On 1 November at 09:00, someone with database access changes the subject of entry 217. Nothing looks wrong in the table. Seal recomputes the fingerprint, sees it no longer matches, and reports the first broken entry: 217. Recomputing every later fingerprint does not help, because the signed copy of the chain end was already written.'

function Illustration() {
  return (
    <div
      role="img"
      aria-label="Three entries in a row joined by arrows. Entry 216 and entry 218 are intact. Entry 217 was changed, so the link from 217 to 218 is broken."
    >
      <div className="ax-fig-row" aria-hidden="true">
        <div className="ax-fig-block">
          <strong>Entry 216</strong>
          <span>hash a41f…</span>
        </div>
        <div className="ax-fig-arrow">&rarr;</div>
        <div className="ax-fig-block" data-bad="true">
          <strong>Entry 217 (changed)</strong>
          <span>hash now 09c2…</span>
        </div>
        <div className="ax-fig-arrow" data-bad="true">&#x2715;</div>
        <div className="ax-fig-block">
          <strong>Entry 218</strong>
          <span>expects 7be3…</span>
        </div>
      </div>
      <p className="ax-fig-caption">
        Entry 218 still holds the old fingerprint of 217, so the change shows up as a broken link.
        The hashes here are shortened for the picture.
      </p>
    </div>
  )
}

export function SealIntro({ onOpen }: { onOpen: () => void }) {
  return (
    <Intro
      title="What Seal does"
      lede="An audit log is the list of everything that happened in a system. Seal makes it so that if anyone changes that list afterwards, you can tell."
      steps={STEPS}
      example={EXAMPLE}
      illustration={<Illustration />}
      ctaLabel="Open the chain"
      onCta={onOpen}
    />
  )
}
