# Putting Roomify on Azure

Two parts: the **backend** (FastAPI, `backend/`) on Azure App Service, and the **frontend**
(React, `frontend/`) as a static website on Azure Storage. The backend talks to the Azure SQL database.

Checked locally on 25 Nov 2026: 80 backend tests pass, the frontend builds, and every page
works for tenant, property manager and technician.

## 1. Backend: Azure App Service (Linux, Python 3.12)

**GitHub Actions** (`.github/workflows/deploy.yml`) deploys `Roomify_Web/backend` on every push to `main`.
- `app-name` in `deploy.yml` must be the real App Service name. `student-housing-api.azurewebsites.net`
  does not exist at the moment, so check the name in the Azure portal.
- The repository secret `AZURE_WEBAPP_PUBLISH_PROFILE` must contain the App Service publish profile.

**Startup command** (App Service → Configuration → General settings):

    python -m uvicorn main:app --host 0.0.0.0 --port 8000

Use one process: the login limit (5 wrong tries / 15 min) is kept in memory.

**App settings** (App Service → Environment variables). The same names as `backend/.env.example`:

| Name | Value |
|---|---|
| `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | from Razvan |
| `DB_DRIVER` | `ODBC Driver 18 for SQL Server` |
| `SECRET_KEY` | a new random value: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `FRONTEND_ORIGINS` | the website address, e.g. `https://studenthousingpwa.z1.web.core.windows.net` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` (App Service installs `requirements.txt` itself) |

Never put these values in GitHub. `.env` is only for running it on your own laptop.

**Database firewall** (Azure SQL server → Networking): allow the App Service to connect
("Allow Azure services and resources to access this server", or add the App Service outbound IPs).

**Check it works** in the browser:
- `https://<app-name>.azurewebsites.net/health` → `{"status":"ok"}`: the API runs
- `https://<app-name>.azurewebsites.net/health/db` → `{"database":"ok"}`: the database is reachable.
  It also wakes up the serverless database: if it says "not reachable yet", wait a minute and refresh.
- `https://<app-name>.azurewebsites.net/docs`: all endpoints

If `/health/db` keeps failing with a driver error ("Can't open lib 'ODBC Driver 18…'"), set `DB_DRIVER`
to `ODBC Driver 17 for SQL Server`.

## 2. Frontend: Azure Storage static website

The backend address is put into the frontend **when it is built**, so build it after the backend runs:

    cd Roomify_Web/frontend
    npm ci
    $env:VITE_API_URL = "https://<app-name>.azurewebsites.net"
    npm run build

Upload everything inside `frontend/dist/` to the `$web` container (replace the old files: the website
that is online now is an old build with fake logins that never talks to the backend).

Storage account → Static website: set **both** the index document and the **error document** to
`index.html`. Otherwise refreshing a page like `/tenant/schedule` gives a 404.

## 3. Accounts for testing

- Tenants sign up on the website (Create an account): they join a house by typing its street and city
  exactly as the manager saved it, e.g. `Kerkstraat 12` + `Eindhoven`.
- Managers and technicians cannot sign up (security rule). Make them from the `backend` folder with the
  database settings in `.env`:

      python create_account.py manager    --name "Mia de Jong" --email mia@roomify.nl
      python create_account.py technician --name "Theo de Vries" --email theo@roomify.nl --specialty "Plumbing"

## 4. Known limits (not bugs in this deploy)

- **Face login** answers "not available yet" until: Razvan creates the `face_login` table (SQL in
  `backend/models.py`), Eszter writes `face_crypto.py`, and Manuel's AI (`torch`, `facenet-pytorch`,
  `Pillow`) is installed. `routers/face.py` (Manuel's test endpoint) is switched off in `main.py`
  because it needs `torch` at startup.
- **Ticket photos** are saved in `backend/uploads/` on the App Service. A new deploy can remove them
  (Azure Blob Storage is the planned fix).
- **Appointment date** for a technician visit (M-11) needs a new column from Razvan first.
