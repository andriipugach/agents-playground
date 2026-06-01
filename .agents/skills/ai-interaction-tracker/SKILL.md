---
name: ai-interaction-tracker
description: Use when AI-assisted work includes coding, research, planning, or important decisions that should be captured as structured Markdown logs
---

# AI Interaction Tracker

Track important AI-assisted work in structured Markdown entries so teams can audit progress, understand decisions, and continue work without losing context.

**Core principle:** Log outcomes and rationale, not full chat transcripts.

## When to Log

Use the mixed default:

1. **Task milestones** - when meaningful progress is completed
2. **Major decisions** - when technical or product direction changes

Always log when any of these happen:

- Significant code change, bug fix, refactor, or implementation milestone
- Research result that changes approach, estimates, or risk profile
- Plan update that changes sequence, scope, or dependencies
- Architectural, product, or process decision with trade-offs

Skip logs for trivial activity:

- Reading files without new insight
- Formatting-only edits without impact
- Re-running unchanged commands that add no signal

## Log File Location

Default path:

`docs/ai-interaction-logs/YYYY-MM-DD.md`

Rules:

- Use user-provided path if explicitly requested
- If log file does not exist, create it with the header template below
- Append entries in chronological order

### Daily File Header

```markdown
# AI Interaction Log - YYYY-MM-DD

## Context
- Project:
- Primary objective:
- Participants:
```

## Entry Types

Use exactly one type per entry:

- `coding` - implementation, debugging, tests, refactors
- `research` - findings from docs, experiments, comparisons
- `planning` - plans, sequencing, scope updates, execution strategy
- `decision` - explicit choices with rationale and trade-offs

## Entry Template (Canonical)

Use this exact structure so logs stay machine- and human-readable:

```markdown
## [HH:MM] <short title>

- Type: coding | research | planning | decision
- Objective: <what this work block was trying to achieve>
- Importance: <why this matters now>
- Work Summary:
  - <key action or finding>
  - <key action or finding>
- Outputs:
  - Files: `<path>`, `<path>` or `none`
  - Artifacts: `<command output/doc/spec/link>` or `none`
- Decision Notes:
  - Decision: <explicit decision or `none`>
  - Rationale: <reasoning or `none`>
  - Alternatives considered: <list or `none`>
- Risks / Unknowns:
  - <risk, dependency, unanswered question> or `none`
- Next Steps:
  - <next concrete action>
- Traceability:
  - Related issue/spec/PR: <id or link or `none`>
  - Confidence: high | medium | low
```

## Logging Workflow

1. Detect milestone or major decision.
2. Classify entry type (`coding`, `research`, `planning`, `decision`).
3. Fill canonical template with concrete details.
4. Keep statements factual and specific.
5. Append entry to daily log file.
6. If a previous decision is superseded, add a new entry noting the change and rationale.

## Quality Bar

A good entry is:

- **Actionable:** someone else can continue from it
- **Traceable:** points to files, specs, issues, or outputs
- **Decision-aware:** captures why a direction was chosen
- **Concise:** focused on signal, no transcript dumps

## Common Mistakes

Avoid:

- Logging vague notes like "worked on feature" without impact
- Omitting rationale for important choices
- Mixing multiple unrelated decisions in one entry
- Forgetting next steps or risks
- Copy-pasting chat text instead of summarizing outcomes

## Examples

### Coding Example

```markdown
## [14:05] Add retry handling for webhook delivery

- Type: coding
- Objective: Prevent transient HTTP failures from dropping webhook events.
- Importance: Failed deliveries caused data sync gaps.
- Work Summary:
  - Added exponential retry logic for 429/5xx responses.
  - Added unit tests for max-attempt and success-after-retry paths.
- Outputs:
  - Files: `src/webhooks/deliver.ts`, `tests/webhooks/deliver.test.ts`
  - Artifacts: `npm test tests/webhooks/deliver.test.ts`
- Decision Notes:
  - Decision: Retry transient failures up to 4 attempts.
  - Rationale: Balances reliability and duplicate-delivery risk.
  - Alternatives considered: Infinite retries; no retries.
- Risks / Unknowns:
  - Need monitoring alert for repeated permanent failures.
- Next Steps:
  - Add retry metrics to dashboard.
- Traceability:
  - Related issue/spec/PR: ENG-184
  - Confidence: high
```

### Research Example

```markdown
## [15:10] Compare cache invalidation approaches

- Type: research
- Objective: Select invalidation method for frequently updated dashboards.
- Importance: Current cache staleness is visible to customers.
- Work Summary:
  - Evaluated tag-based invalidation vs TTL-only strategy.
  - Verified framework support and operational complexity.
- Outputs:
  - Files: `docs/cache-evaluation.md`
  - Artifacts: Bench notes from local load simulation
- Decision Notes:
  - Decision: Favor tag-based invalidation with fallback TTL.
  - Rationale: Better freshness control with predictable behavior.
  - Alternatives considered: TTL-only.
- Risks / Unknowns:
  - Need clear tag naming conventions before rollout.
- Next Steps:
  - Draft implementation plan for phased migration.
- Traceability:
  - Related issue/spec/PR: SPEC-cache-refresh
  - Confidence: medium
```

### Planning Example

```markdown
## [16:00] Re-sequence delivery plan for dependency risk

- Type: planning
- Objective: Reduce blocking risk from external API approval.
- Importance: Original sequence could stall implementation for multiple days.
- Work Summary:
  - Reordered milestones to build internal adapters first.
  - Split rollout into two independently shippable phases.
- Outputs:
  - Files: `docs/plans/integration-rollout.md`
  - Artifacts: Updated milestone checklist
- Decision Notes:
  - Decision: Build adapter layer before external API integration.
  - Rationale: Enables progress while approval is pending.
  - Alternatives considered: Wait for approval before coding.
- Risks / Unknowns:
  - Adapter assumptions may need revision after final API contract.
- Next Steps:
  - Add contract-validation tasks once approval arrives.
- Traceability:
  - Related issue/spec/PR: PLAN-62
  - Confidence: medium
```

### Decision Example

```markdown
## [16:45] Choose optimistic concurrency strategy

- Type: decision
- Objective: Prevent lost updates in concurrent edit flows.
- Importance: Data conflicts currently overwrite user changes.
- Work Summary:
  - Reviewed revision token and last-write-wins options.
  - Assessed implementation effort and user impact.
- Outputs:
  - Files: `docs/decisions/adr-012-concurrency.md`
  - Artifacts: ADR-012 draft
- Decision Notes:
  - Decision: Use revision tokens with conflict prompts.
  - Rationale: Preserves user intent and avoids silent data loss.
  - Alternatives considered: Last-write-wins.
- Risks / Unknowns:
  - Need clear conflict-resolution UX copy.
- Next Steps:
  - Implement API conflict response contract.
- Traceability:
  - Related issue/spec/PR: ADR-012
  - Confidence: high
```
