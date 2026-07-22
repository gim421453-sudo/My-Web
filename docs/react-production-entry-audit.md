# React Production Entry Audit

Date: 2026-07-22

## Summary

The current production application entry is still the static `index.html` + `app.js` app. A single routed React production app is not present in `src`: there is no `src/main.tsx`, no `src/App.tsx`, no production `BrowserRouter`, no `Routes`, and no `createBrowserRouter` setup.

## React Entry Search

Checked:

- `src/main.tsx`: not found
- `src/App.tsx`: not found
- `RouterProvider`: not found as a production entry
- `BrowserRouter`: found only in development guard preview entries
- `Routes` / `Route`: not found as a production route tree
- `createBrowserRouter`: not found
- `ReactDOM.createRoot` / `createRoot`: found in standalone HTML entries
- `index.html` React mount element: not present
- Vite entry: default `index.html`
- multi HTML entries: present as standalone development or read-only pages

## Static Production Entry

`index.html` contains static DOM roots:

- `#loginScreen`
- `#app`
- `#nav`
- `#content`
- dialogs used by `app.js`

It loads compat Firebase SDKs and static scripts, ending with:

```html
<script src="app.js?v=111"></script>
```

It does not contain:

- `<div id="root"></div>`
- React module entry
- `src/main.tsx`
- React router

## Standalone HTML React Entries

These files contain `<div id="root"></div>` and a Vite module entry:

| HTML | Entry | Classification |
| --- | --- | --- |
| `auth-provider-preview.html` | `src/dev-auth-preview/main.tsx` | development preview |
| `legacy-auth-adapter-preview.html` | `src/dev-legacy-auth-adapter/main.tsx` | development preview |
| `legacy-auth-guard-preview.html` | `src/dev-legacy-guard/main.tsx` | development preview |
| `login-bridge-preview.html` | `src/dev-login-bridge/main.tsx` | development preview |
| `owner-admin-diagnostics.html` | `src/dev-diagnostics/main.tsx` | development diagnostics |
| `protected-route-bridge-preview.html` | `src/dev-protected-route-bridge/main.tsx` | development preview |
| `require-auth-bridge-preview.html` | `src/dev-require-auth-bridge/main.tsx` | development preview |
| `require-workspace-role-bridge-preview.html` | `src/dev-require-workspace-role-bridge/main.tsx` | development preview |
| `shadow-auth-test.html` | `src/dev-shadow/main.tsx` | development shadow verification |
| `verify-email.html` | `src/pages/verifyEmailMain.tsx` | standalone read-only React page |
| `login-devices.html` | `src/pages/Settings/loginDevicesMain.tsx` | standalone read-only React page |
| `notifications.html` | `src/pages/Settings/notificationsMain.tsx` | standalone read-only React page |

## Build Output Relationship

`npm run build` runs Vite against the default static `index.html`, then `scripts/copy-static-assets.mjs` copies only:

- `styles.css`
- `app.js`
- `shared`
- `services`
- `pm-env.js`

The standalone React HTML files are not copied by `copy-static-assets.mjs`. Therefore they are currently development/source-root pages, not established production routes in the built static output.

## Production Route List

No production React route tree exists.

| Route | Component | Auth required | Workspace required | Guard | Actual production access |
| --- | --- | --- | --- | --- | --- |
| none | none | n/a | n/a | n/a | no React production route tree |

## Static App and React App Relationship

| Surface | Entry | Runtime | Current role |
| --- | --- | --- | --- |
| Static app | `index.html` -> `app.js?v=111` | Firebase compat + root services | current operational app |
| React transition code | `src/**` | Vite + React + modular Firebase | staged migration code |
| Development previews | standalone `*-preview.html` files | Vite module entries | isolated verification |
| Read-only React pages | `verify-email.html`, `login-devices.html`, `notifications.html` | Vite module entries | direct-entry pages, not routed from static app |

## Conclusion

There is no real React production router to switch yet. The safest next production integration should add one isolated route or standalone static link first, instead of changing the operational `index.html + app.js` app or assuming `/login` already reaches `src/pages/Login.tsx`.
