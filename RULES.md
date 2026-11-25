# RULES — Kiroween 2026

Single source of truth for the competition's rules and for what we have learned about
how they are applied. If a claim about eligibility, deadlines, categories, prizes or
submission mechanics appears in another file, it belongs here instead.

- **Source:** https://kiroween.devpost.com/rules (Official Rules), `/details/faqs`,
  `/resources`, and the participant emails received 13–21 Nov 2026.
- **Last verified:** 24 Nov 2026. Re-check the Rules tab before submitting; the sponsor
  may amend them.

---

## 1. Key dates (all 2026)

| Event | When |
| --- | --- |
| Registration period | 13 Oct 08:30 PT – 4 Dec 14:00 PT |
| Submission period | 30 Oct 09:00 PT – 4 Dec 14:00 PT |
| Credit requests close | 1 Dec 12:00 PT (**8pm UK**) |
| Credit codes expire | 4 Dec (redeem before then) |
| Redeemed credits expire | 31 Dec 23:59 PT |
| **Deadline** | **Fri 4 Dec, 14:00 PT = 22:00 London** |
| Judging | 16 Dec – 29 Jan 2027 |
| Winners announced | on or around 3 Feb 2027 |

No extensions. Late submissions are not accepted.

## 2. Eligibility

- Open to individuals at or above the age of majority in their country, teams of up to
  **3** people, and organisations.
- **Not** open to residents of: Argentina, Australia, Belarus, Brazil, Crimea, Cuba,
  Donetsk People's Republic, Iran, Italy, North Korea, Luhansk People's Republic,
  Philippines, Quebec, Russia, Syria, UAE — plus anyone comprehensively sanctioned by
  OFAC. The UK is eligible.
- Employees, judges, and their immediate families/households are excluded, as are
  organisations involved in running the hackathon.
- A team needs one appointed Representative who submits on its behalf.

**Our position:** individual entrant, UK, above 18, working solo.

## 3. Categories — pick exactly one

| Category | What it asks for |
| --- | --- |
| Resurrection | Bring a dead technology back to life |
| Frankenstein | Stitch together a chimera of technologies into one app |
| Skeleton Crew | A skeleton template plus **two distinct applications** built from it |
| Costume Contest | Any app, judged on a haunting, polished UI |

**Our position: Skeleton Crew.** One reusable `@anchora/core` evidence skeleton powering two distinct applications (`apps/seal` and `apps/witness` in separate folders), an offline verifier CLI, and an offline Kiro MCP server.

## 4. What must be submitted

1. A **working software application** built with Kiro (IDE, CLI, Web and/or Crew).
2. **Public GitHub repository** — not GitLab or Bitbucket — containing all source,
   assets and instructions.
   - Open-source licence file, detectable and visible in the repo's About section.
   - **`/.kiro` directory at the repository root**, showing specs, hooks and steering.
   - **Do not gitignore `.kiro`** — doing so can disqualify.
   - Skeleton Crew only: two separate app folders.
3. **URL to the working app.** Login credentials, if any, go in the submission form
   (visible to judges only).
4. **Text description** of features and functionality.
5. **Demo video**, under **3 minutes**, public on YouTube, showing the project working on
   the device it was built for, with no third-party trademarks or copyrighted music.
6. **A write-up on how Kiro was used** (IDE/CLI/Web/Crew, custom agents, hooks,
   spec-driven development, steering, MCP, property-based testing, powers).
7. Category and any bonus-prize fields.

**Language:** everything in English, or an English translation.

## 5. New projects only

- The project must be **created during the submission period** (from 30 Oct 2026).
- Pre-existing projects, including Kiroween 2025 projects, are ineligible.
- Standard resources (frameworks, libraries, starter templates) are fine; **disclose any
  other pre-existing code** that is incorporated.
- Multiple submissions are allowed but each must be unique and substantially different.

**Our position:** started 13 Nov 2026. Everything in the repository was written for
this entry.

## 6. Judging

**Stage One — pass/fail.** Does the project fit the theme and reasonably apply Kiro?
Insufficient use of Kiro can mean disqualification at the judges' discretion.

**Stage Two — five criteria, equally weighted (20% each):**

| Criterion | Question asked |
| --- | --- |
| Potential Impact | Real problem, real audience, would anyone use it? |
| Technological Implementation | How thoroughly and skilfully Kiro was used; was there a strategy; variety of tools; experimentation |
| Design | Complete, coherent, polished product — not a proof of concept |
| Innovation/Idea | Creative, novel, differs from existing concepts; unusual data or technologies |
| Presentation | Does the video show it working end to end; is the pitch clear and memorable |

Ties are re-scored with a 20-point maximum per criterion, escalating by +10 each round.

## 7. Prizes

| Prize | Amount | Notes |
| --- | --- | --- |
| 1st / 2nd / 3rd overall | $30k / $20k / $10k | all eligible submissions |
| Best Resurrection / Frankenstein / Skeleton Crew / Costume Contest | $5k each | one winner per category |
| Best Startup Project | $10k | founder proof, LinkedIn, site |
| Best Ghost of Kiroween Past | $2k | must have registered for 2025 |
| Best Kiro Crew App | $1k | separate public repo |
| Best Student Project (per category) | $1.5k + Pro Max | all team members students |
| Best Demo | $1k | best Presentation score inside the top 10% overall |
| Bonus Blog | 2,000 credits × **100 winners** | top-scoring submissions that include a blog post |
| Social Blitz | 3-month Pro+ × 5 | post judged by the Kiro team |

An entry can win **one** overall or category prize **plus any number of bonuses**.

## 8. Bonus prize conditions

- **Blog:** public post on a third-party platform during the submission period, must
  mention it is written as part of Kiroween 2026, URL in the form.
- **Social:** post must **start** with `#KiroweenHackathon26`, be public, during the
  submission period, and share what you like about Kiro and how it changed your approach.
- **Best Demo:** no extra step; all eligible submissions are considered.
- **Kiro Crew App:** public repo for the Crew app, GitHub account matching the entry.
- **Startup / Student / Ghost:** requires the specific proofs listed in the Rules.

**Our position:** eligible for Skeleton Crew, Best Demo, Blog and Social. Not eligible
for Startup, Student, Ghost or Crew.

## 9. Testing, modifications, IP

- The project must be available **free of charge, without restriction**, for judges to
  test until the judging period ends (**29 Jan 2027**).
- Judges are not obliged to test; they may judge from the description, images and video.
- No changes to the submission after the deadline. The sponsor may permit narrow
  removals (e.g. infringing material, personal data) that do not alter substance.
- Submissions remain the entrant's IP; the sponsor gets a licence to judge and to
  promote for three years.
- Winners must complete affidavits/tax forms (W-9 for US residents, W-8BEN otherwise)
  within 10 business days. Prizes are paid within 60 days of forms.
- Winners are responsible for their own taxes and fees.

## 10. What we learned operationally (not in the Rules tab)

These cost us real time. They belong here so we do not relearn them.

1. **The category on the credit request form is not binding.** It exists to check you
   are human. Changing category later is explicitly allowed ("don't worry, you can
   change your mind later"). Do **not** resubmit a corrected request unless something
   was actually wrong; duplicates get the same outcome.
2. **Include the category word in the description.** Our first credit request was
   rejected because the answer described the project without naming Resurrection,
   Frankenstein, Skeleton Crew or Costume Contest. Name it in the first two words.
3. **The name on the Devpost profile must match the government ID exactly**, including
   middle names. This is the most common identity-check failure. Changing it is done in
   Devpost settings, independently of the Google account used to sign in.
4. **Credits need an ID check** (selfie + government ID via Didit), reviewed within ~48
   business hours. Approval does not guarantee a code if supply runs out. Request by
   1 Dec; redeem by 4 Dec.
5. **Kiro CLI identity matters.** Signing in through the device flow created a separate
   **Builder ID** principal with the same email, which had no plan and refused every
   request with "monthly usage limit reached". Fix: `kiro-cli login --social google`.
   Confirm with `kiro-cli whoami` — it must say "Logged in with Google".
6. **The free plan blocks the CLI** even with 4,000 bonus credits; the IDE and Web kept
   working. This is not a login problem, and re-authenticating does not fix it.
7. **Free credits do not lift the plan cap.** The dashboard showed 0/50 used while every
   request was refused; the dashboard lags, the service is authoritative.
8. **Upgrading to Pro does not retroactively clear a monthly cap** for the CLI unless you
   also re-authenticate with the right identity (see 5).
9. **Pro's first month is free** only when upgrading from Free, and only for the rest of
   that calendar month. Other tiers pay the prorated difference above Pro.
10. **Judges may test the live URL until 29 Jan**, so do not push to `main` after
    submission. Work on a branch; our CI deploys on every push to `main`.

## 11. Compliance checklist (our entry)

- [x] Built during the submission period
- [x] Uses Kiro (CLI 3.5.0, steering, EARS specs, 3 hooks, 2 validated custom agents, offline MCP server, Kiro Power, self-audit bundle)
- [x] Public GitHub repo with MIT licence visible in About
- [x] `/.kiro` at root, not gitignored
- [x] Live URL, no login, free to access
- [x] Text description and Kiro write-up prepared
- [ ] Video under 3 minutes, public on YouTube
- [ ] Devpost submission with category **Skeleton Crew**
- [ ] Blog post URL (bonus)
- [ ] Social post URL (bonus)
- [ ] Freeze `main` after submission

## 12. Ways entries commonly die

- Missing or undetectable licence in About.
- `.kiro` absent, or present but gitignored.
- Repo private, or on GitLab/Bitbucket.
- Video over three minutes, or not public, or no working footage.
- No working URL, or a URL that needs credentials that were not supplied.
- Insufficient use of Kiro (Stage One fail).
- Reusing a pre-existing project without disclosure.
- Editing the submission after the deadline.
