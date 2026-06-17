# TODO - Step 2 Health Information UI Redesign

- [ ] Inspect current Step 2 UI structure and extraction state variables in `client/src/pages/Goals.jsx`.
- [ ] Implement new Step 2 layout order: AI upload card FIRST, OR divider, manual form SECOND.
- [ ] Replace upload placeholder UI with: drag/drop area, select file button, selected filename card, remove button.
- [ ] Wire Analyze button to `reportAnalysisApi.extractReport()` and show loading UI + toasts.
- [ ] On success: show success toast, summary card, and auto-fill existing manual form fields from extraction payload.
- [ ] On failure: show red warning card + toast; keep manual form fully editable.
- [ ] Ensure meal planner generation works unchanged in all scenarios (manual only, upload then edit, upload only).
- [ ] Sanity check TypeScript/JS runtime issues (variable names, state updates) inside `Goals.jsx`.

