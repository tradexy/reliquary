import { Intro } from '@anchora/core/ui'

const STEPS = [
  'Every action that grants access or changes behaviour must write its record in the same step.',
  'If that record cannot be written, the action is refused. It does not happen.',
  'Actions that remove access are different: they still complete, and the record waits in a queue, because blocking a removal would make the system less safe.',
]

const EXAMPLE =
  'The audit store (the place records are kept) goes down. Someone tries to grant a role: refused, because the change would widen access with no record. Someone tries to revoke a role: it completes, and the record is queued. The coverage matrix, a table of all 14 actions, shows whether a test proves each one is recorded.'

function Illustration() {
  return (
    <div
      role="img"
      aria-label="Two columns. Stops: actions that widen access are refused when the audit store is down. Queues: actions that remove access go ahead and wait in a queue."
    >
      <div className="ax-fig-cols" aria-hidden="true">
        <div className="ax-fig-col">
          <h4>Stops</h4>
          <ul>
            <li>Grant a role</li>
            <li>Widen access</li>
            <li>Change behaviour</li>
          </ul>
          <p className="ax-fig-caption">Refused until the record can be written.</p>
        </div>
        <div className="ax-fig-col">
          <h4>Queues</h4>
          <ul>
            <li>Revoke a role</li>
            <li>Remove access</li>
          </ul>
          <p className="ax-fig-caption">Goes ahead. The record waits in a queue.</p>
        </div>
      </div>
    </div>
  )
}

export function WitnessIntro({ onOpen }: { onOpen: () => void }) {
  return (
    <Intro
      title="What Witness does"
      lede="Seal asks whether the record changed. Witness asks a different question: did the action leave a record at all?"
      steps={STEPS}
      example={EXAMPLE}
      illustration={<Illustration />}
      ctaLabel="See the coverage matrix"
      onCta={onOpen}
    />
  )
}
