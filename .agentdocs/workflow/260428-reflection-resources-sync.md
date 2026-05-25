# Reflection Resources Sync

## Vision

Home should surface the most reachable Week resources inside the Learning Map itself: `Lectures` uses current-week PPTs and `Lab` uses current-week Lab PDFs. Homework should treat AI Reflection and BK Reflection as separate live teacher-site questionnaires when server credentials are configured, while keeping templates available when sync is unavailable.

## TODO

- [x] Copy AI reflection, BK questionnaire, and CS201 textbook PDFs into protected public asset paths.
- [x] Replace the separate Home weekly materials panel with Learning Map Lecture PPT and Lab columns backed by the existing course-materials manifest.
- [x] Add Resources textbook download entry.
- [x] Add server-only teacher-site reflection login, course-tree discovery, questionnaire read, and questionnaire submit helpers.
- [x] Add reflection week and submit API routes guarded by the local portal session.
- [x] Add Homework reflection template download, sync status, response editor, and manual submit UI.
- [x] Correct reflection availability: weeks 1/4/6 are AI-only, and weeks 2/3/5/7 are AI plus two BK questionnaires.
- [x] Add unit/component/e2e coverage for resources, templates, sync fallback, and submit behavior.
- [x] Run final validation: `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`.

## Implementation Notes

- Teacher-site credentials are read only from `CS201_BK_USER_MAP`; no credential value belongs in source, docs, tests, or generated assets.
- `questionnaire_no=1` is AI Reflection. `questionnaire_no=2` and `questionnaire_no=3` are BK Reflection; only weeks 2, 3, 5, and 7 expose both BK questionnaires.
- External sync reads `/api/profile/`, `/api/user_courses_bk_jpa/{username}/`, `/api/coursebkproject/{spk}/?context=student`, and `/api/coursebkquestionnairesubmission/`.
- If teacher-site login or week matching fails, the API returns local fallback questionnaire data with submission disabled and template links still available.
