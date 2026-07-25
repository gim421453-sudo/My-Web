# School and NEIS Multi-School Requirements

Owner Preview Batch 3 keeps the current school board integration read-safe. Browser clients must not fetch `school.busanedu.net` directly because redirects and CORS can fail noisily.

Future work item: `REQ-SCHOOL-NEIS-MULTI-SCHOOL`

- Provide a configured server proxy for public school board HTML.
- Support multiple school profiles with office code, school code, homepage URL, notice URL, and home-letter URL.
- Keep NEIS API fetches separate from public homepage scraping.
- Do not treat raw source HTML as application data.
- Cache the last successful board rows read-only when the proxy is unavailable.
- Surface proxy-unconfigured states as user guidance, not repeated browser errors.
- Do not store API keys, tokens, UIDs, emails, or workspace IDs in user-facing diagnostics.
