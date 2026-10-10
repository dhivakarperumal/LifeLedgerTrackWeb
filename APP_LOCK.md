# App Lock

App Lock protects the private Life Ledger web app after account sign-in. It is separate from the account login password and is available from **Security** in the sidebar (`/#/admin/settings`).

## Set Up

1. Sign in to Life Ledger with an account that can access the admin app.
2. Open **Security** from the sidebar.
3. Turn on **App Lock** and choose a method.
4. Set up and confirm the selected PIN, pattern, or lock password. For biometrics, register a platform authenticator first.
5. Enter your account password to confirm the change, then save.

Security changes require the account password. Disabling App Lock also requires explicit confirmation. A Google-only account without an account password must set one before it can configure App Lock.

## Lock Methods

- **Fingerprint / biometrics:** Uses WebAuthn with a platform authenticator such as Windows Hello or Touch ID. Life Ledger never reads fingerprint data. A compatible browser, platform authenticator, and secure context are required. `localhost` is accepted for local development; production requires HTTPS.
- **PIN:** 4 to 6 digits. A custom keypad provides clear, delete, and submit controls.
- **Pattern:** Connect at least 4 distinct dots on the 3 by 3 grid.
- **Password:** 12 to 128 characters, with a show/hide control.

PINs, patterns, and App Lock passwords are bcrypt-hashed on the server. They are not stored in browser storage. Failed verification attempts trigger progressive delays. Biometric cancellation or unsupported devices do not unlock the app; use the configured fallback.

## Lock Policy

Security settings include locking when the tab is hidden and an inactivity timeout of disabled, 1, 5, 10, or 30 minutes. App Lock also protects on application startup and supported page-hide transitions. Private routes keep the intended URL behind the lock screen, while private APIs and uploaded media are checked server-side.

## Configuration

The backend loads variables from `Backend/.env`. Keep the existing MySQL settings and configure a strong `JWT_SECRET`; the backend now requires it and does not use a hardcoded fallback.

For local development, WebAuthn can use the browser origin `http://localhost:5173` and RP ID `localhost`. The backend can infer these from the request, but setting them explicitly is recommended:

```env
JWT_SECRET=<strong-random-server-secret>
APP_LOCK_ORIGIN=http://localhost:5173
APP_LOCK_RP_ID=localhost
```

For production, use the exact HTTPS app origin and its domain:

```env
NODE_ENV=production
JWT_SECRET=<strong-random-server-secret>
APP_FRONTEND_ORIGIN=https://app.example.com
APP_LOCK_ORIGIN=https://app.example.com
APP_LOCK_RP_ID=app.example.com
APP_LOCK_COOKIE_SAMESITE=lax
```

`APP_FRONTEND_ORIGIN` is the allowed frontend origin for credentialed cross-origin requests. Multiple origins may be comma-separated. If the frontend and API are on different sites, set `APP_LOCK_COOKIE_SAMESITE=none`; this requires HTTPS and secure cookies. Keep `APP_LOCK_RP_ID` aligned with the WebAuthn domain.

On backend startup, the database initializer creates the App Lock tables. Existing numeric App Lock user keys are migrated to the matching `users.user_id` values without replacing stored credential hashes. App Lock settings, challenges, and unlock sessions are stored in `app_lock_settings`, `app_lock_challenges`, and `app_lock_sessions`.

## Run

From the repository root:

```powershell
npm run dev
```

Or start the services separately:

```powershell
npm run backend
npm run frontend
```

Restart the backend after changing backend code or environment variables. The frontend dev server runs at `http://localhost:5173`; the backend defaults to port `5000`.

## Verify

1. Open **Security**, enable App Lock with each method, and verify setup requires matching confirmation and the account password.
2. Lock the app, then try correct and incorrect credentials. Verify failed attempts delay retries and only a successful server verification unlocks.
3. Visit a private URL directly and refresh while locked; private content should remain hidden until unlock.
4. Hide and restore the tab, wait for the configured timeout, and test browser navigation. Verify the lock screen returns.
5. Test logout while locked and confirm private routes redirect to login.
6. On a supported device, register and authenticate with a platform authenticator; also cancel the browser prompt and test the fallback.
7. Confirm existing income, expense, transfer, diary, memory, and calendar workflows after unlocking.

WebAuthn can be unavailable in embedded browsers, unsupported browsers, or insecure non-localhost origins. In that case, the interface reports that platform authentication is unavailable and the configured fallback remains available.
