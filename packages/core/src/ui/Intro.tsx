import type { ReactNode } from 'react';

export interface IntroProps {
  title: string;
  lede: string;
  /** Exactly the steps of the "how it works" list, in order. */
  steps: readonly string[];
  exampleTitle?: string;
  example: string;
  /** Decorative-but-described illustration, built from plain elements. */
  illustration: ReactNode;
  ctaLabel: string;
  onCta: () => void;
}

/** "Start here" page: plain-English explainer shared by both apps. */
export function Intro({ title, lede, steps, exampleTitle = 'A worked example', example, illustration, ctaLabel, onCta }: IntroProps) {
  return (
    <article className="ax-intro" aria-labelledby="ax-intro-title">
      <h2 id="ax-intro-title" className="ax-intro-title">{title}</h2>
      <p className="ax-intro-lede">{lede}</p>
      <section aria-labelledby="ax-intro-how">
        <h3 id="ax-intro-how">How it works</h3>
        <ol className="ax-intro-steps">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      <div className="ax-intro-figure">{illustration}</div>
      <section aria-labelledby="ax-intro-example">
        <h3 id="ax-intro-example">{exampleTitle}</h3>
        <p>{example}</p>
      </section>
      <p>
        <button type="button" className="ax-btn ax-btn--primary ax-intro-cta" onClick={onCta}>
          {ctaLabel}
        </button>
      </p>
    </article>
  );
}
