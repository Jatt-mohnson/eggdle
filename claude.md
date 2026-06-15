## Development Lifecycle (SDD)

For non-trivial work (new features, significant refactors, multi-file changes), follow this 5-phase Spec-Driven Development lifecycle. For small bug fixes or isolated changes, phases 1-2 can be lightweight (mental checklist rather than a spec file).

### Phase 1 — Research & Design
Explore the codebase, validate assumptions, identify impacted files and cross-service concerns. For larger work, draft or update a spec in `docs/specs/` under the appropriate epic directory. Use the **research-design** subagent (`.claude/agents/research-design.md`) to keep exploration noise out of the main context.

### Phase 2 — Plan Approval
Present the approach to the user before writing code. For spec-driven work, the spec serves as the contract. For smaller work, a concise summary of what will change and why is sufficient.

### Phase 3 — Build
Implement following the approved plan. Use the **builder** subagent (`.claude/agents/builder.md`) in a worktree for larger implementations to isolate trial-and-error from the main context.

### Phase 4 — Adversarial Review
Review the diff for resilience, financial risk, unhappy paths, and test rigor. Use the **review** subagent (`.claude/agents/review.md`) to get an independent assessment. If issues are found, iterate — do not ship with known gaps.

### Phase 5 — Validate
Run the full test suite, linting, and cross-service checks. Use the **validate** subagent (`.claude/agents/validate.md`). A task is not done until this phase passes.

### When to Use Subagents
- **Always** for phases 4-5 on non-trivial work (keeps review/validation independent and context-clean).
- **Recommended** for phases 1 and 3 when the work touches multiple modules or requires significant exploration/implementation.
- **Optional** for small, isolated changes where the overhead isn't worth it.
