# Roomify frontend

The website of Roomify: tenants share chores, groceries and repairs, property managers
assign repairs, technicians fix them. Built with React 19, React Router and Vite.
It talks to the FastAPI backend in `../backend`.

## Run it on your laptop

1. Start the backend first (see `../DEPLOY.md`), it runs on http://localhost:8000.
2. Then:

       cd Roomify_Web/frontend
       npm install
       cp .env.example .env.local     # only needed if the backend runs somewhere else
       npm run dev

3. Open http://localhost:5173.

Other commands: `npm run lint` (check the code), `npm run build` (the website for Azure, in `dist/`).

## Settings (`.env.local`)

| Name | What it does |
|---|---|
| `VITE_API_URL` | Address of the backend. Default `http://localhost:8000`. `.env.production` has the Azure one. |
| `VITE_FACE_LOGIN` | `true` shows the face login buttons. Keep `false` until face login works in the backend. |

## How the code is organised

    src/
      main.jsx            starts the app (router + logged-in user)
      App.jsx             all page addresses; which role may open which page
      config.js           switches for parts that are not ready yet (face login)
      api/
        client.js         the only place that calls the backend (address, token, errors, 401 = log out)
        roomify.js        one function per backend endpoint
        auth.js           login, register, logout
        convert.js        backend words -> page words (urgency, status, ticket shapes)
        useApi.js         hook: load data when a page opens (data, error, loading, reload)
        userContext.js    useUser(): who is logged in
      components/         parts used on several pages (layout, cards, chips, photo, bell ...)
      pages/              one file per page, named after the role: Tenant..., Manager..., Technician...
      utils/dates.js      date helpers
      index.css           all styles

## Logging in

After login the user (from `GET /users/me`) is kept in `UserProvider`.
`AppLayout` sends people who are not logged in to the login page, and `RequireRole`
sends a user who opens another role's page (e.g. a tenant on `/manager`) to their own home page.
When the backend answers 401 (the token expires after 30 minutes), `client.js` logs the user out.

## Not ready yet

- **Forgot password**: the page only explains to ask the property manager; there is no reset in the backend.
- **Face login**: hidden behind `VITE_FACE_LOGIN`.
- **Technician working days, hours and cities**: shown, but not saved (no backend column).
