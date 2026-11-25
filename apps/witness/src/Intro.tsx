import { Intro } from '@anchora/core/ui'

const STEPS = [
  'Every action that grants access or changes behaviour must write its record in the same step.',
  'If that record cannot be written, the action is refused. It does not happen.',
  'Actions that remove access are different: they still complete, and the record waits in a queue, because blocking a removal would make the system less safe.',
]

const STORY = {
  title: 'The forty minutes the audit store was down',
  paragraphs: [
    "On the same morning, the audit store went down for forty minutes. During that window a contractor asked for administrator rights. The platform refused: no record, no grant. A departing employee's access was revoked in the same window. That went through, and its record waited in a queue, because refusing a removal during an outage would leave the system less safe than the outage itself.",
    "When the store came back, the queued row landed, in order, before anything else was written. The coverage matrix then answered the auditor's next question without a meeting: of the fifteen actions that matter, is each one recorded, and is there a test that proves it?",
    'Nothing was missed. Nothing had to be taken on trust.',
  ],
}

const EXAMPLE =
  'The coverage matrix is a table of all 15 actions. Each row shows whether a test proves that the action leaves a record.'

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
      story={STORY}
      steps={STEPS}
      example={EXAMPLE}
      illustration={<Illustration />}
      ctaLabel="See the coverage matrix"
      onCta={onOpen}
    />
  )
}
