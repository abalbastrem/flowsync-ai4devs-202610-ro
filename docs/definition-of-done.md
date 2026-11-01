# Definition of Done

Applies to every Story in Jira.

## A Story is done when

- All its Given/When/Then acceptance criteria pass.
- Automated tests cover them and are green (see TDD below).
- Lint, typecheck and build pass in every part of the repo it touches.
- It works in the latest Chrome desktop.
- The PR has been reviewed and merged into `s2/start`.

NFR-6 (browsers) is split: Chrome on every Story, and one pass on the latest two versions of Chrome, Firefox, Safari and Edge desktop before the test week.

## TDD

TDD happens in the Subtasks. The Story's G/W/T criteria say what must end up tested; the Subtasks are where the tests get written.

- Every G/W/T criterion ends up covered by at least one test, named after the criterion.
- Each Subtask that changes behaviour starts with a failing test. Commit it on its own (`test:`) before the code that makes it pass (`feat:`), so the history shows it failed first.
- Backend: Japa functional tests. They hit the same SQLite file as the dev server, so isolate them with the `testUtils.db()` hooks.
- Frontend: Vitest and Testing Library.
- End to end: Playwright, only where a single session can't prove the behaviour (real-time updates between two sessions).

## Size

Every Story carries a `size:S`, `size:M` or `size:L` label. Sizes aren't used to plan or prioritize: they check that the work can be reviewed calmly.

- **S:** a small change on existing pieces.
- **M:** a full vertical slice (data, API, UI, tests) that still fits in one reviewable PR.
- **L:** doesn't fit in one PR.

An L Story is split into smaller Stories when they would each deliver value on their own. When it can't be split that way, it stays whole, with several Subtasks delivered in more than one PR.

## Technical decisions

A cross-cutting technical decision is recorded in a document, not in a ticket. The work of applying it is a Subtask of the first Story that needs it.
