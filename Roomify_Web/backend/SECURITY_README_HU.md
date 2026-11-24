# Roomify – Web Application Security (magyar útmutató)

## Pontosan mi változott?

Az eredeti React frontend és az üzleti API routerek (chores, tickets, groceries, stb.) megmaradtak. A biztonsági modulhoz az integráció miatt **csak három meglévő backend-fájlba** kerültek minimális módosítások: `routers/auth.py`, `routers/users.py` és `main.py`. Az új fájlok: `security.py`, `password_policy.py`, `login_limit.py`. A tesztmappa az eredeti ZIP-ben már meglévő, **tesztfájlokat nem adtam hozzá az átadott csomaghoz**.

## Fontos működés

- `security.py`: Argon2id jelszóhash; JWT Bearer access token, 30 perc alapértelmezett lejárat; ellenőrzés adatbázisból; szerepkör-dependency (`require_role`). A token a tárolt jelszóhash-hez kapcsolt HMAC-verziót tartalmaz, ezért **jelszóváltoztatás után a korábbi JWT-ket elutasítja**.
- `password_policy.py`: **minimum 15 karakter**, maximum 1024; kötelező szám/nagybetű/special karakter nincs. Csak új jelszavaknál ellenőrizzük.
- `login_limit.py`: 5 sikertelen próbálkozás / 15 perc / IP+e-mail a futó Python-processzen belül. **Nem teljes körű, elosztott brute-force-védelem**: több Azure workerhez központi Redis vagy gateway rate limiting szükséges, és a kérésszám korlátozása IP-alapon is ajánlott.
- `routers/auth.py`: nyilvános regisztráció során **csak tenant** hozható létre. Techniciant/manager-t kizárólag megbízható adminisztrációs folyamattal szabad létrehozni. A felhasználó továbbra is lakcím alapján csatlakozhat házhoz; éles rendszerhez **meghívó/jóváhagyás szükséges**, mert a cím ismerete nem elégséges jogosultsági bizonyíték.
- `routers/users.py`: új jelszó policy + eltérő új jelszó ellenőrzés.
- `main.py`: CORS whitelist és néhány HTTP security header.

## Indítás Windows PowerShell alatt

A `backend` mappában:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Az utolsó parancs eredményét másold be `.env`-ben a `SECRET_KEY=` után. Az adatbázis eléréséhez **valódi Azure SQL beállítások és ODBC Driver 18** kellenek. Csak saját, engedélyezett fejlesztői adatbázist használj. A `.env` fájlt ne commitold!

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

Tesztfelület: http://127.0.0.1:8000/docs

## Mit kell még beállítani / integrálni?

1. **Frontend:** jelenleg `localStorage`-ban tárolja a Bearer-tokent; ez XSS esetén ellopható. Jobb megoldás lehet a BFF / HttpOnly Secure SameSite cookie + CSRF-védelem, de ehhez frontend/backend közös átállás kell. A `logout()` csak a böngészőből törli a tokent, nem vonja vissza a szerveren; a token lejáratig használható.
2. **Frontend:** a regisztrációs UI még 8 karaktert jelez és manager/technician létrehozást kínál. A backend most biztonsági okból **15 karaktert követel, és a privilegizált önregisztrációt 403-mal elutasítja**. A frontend megjelenítését a csapatnak frissítenie kell.
3. **E-mail alapú jelszó-visszaállítás, eszközös passkeys/WebAuthn és server-side logout** nem kész; ezek külső szolgáltatást vagy token/session adattárolást igényelnek. Az arcfelismerős frontend jelenleg demonstráció, nem hitelesítés.
4. **Ticket fotók:** a projekt `/uploads` alatt statikusan szolgálja ki a képeket, így az URL birtokában auth nélkül elérhetők. Szükség esetén privát letöltési endpoint és jogosultságellenőrzés kell. A content-type címkét nem elegendő hiteles képtípus-ellenőrzésnek tekinteni.
5. **Adatbázis:** a megadott Azure SQL script újrafuttatása táblákat töröl és újra létrehoz; meglévő éles adatokon ne futtasd! A seedelt manager jelszóhash-e `!`, így érvénytelen, valódi account provisioning kell. Az SQL `records` oszlopok app-oldali titkosítása jelenleg csak adatbázisterv, nem megvalósított kód.
6. **Hálózat:** HTTPS-only Azure telepítés, Azure SQL tűzfal/VNet hozzáférés, TLS és titkok kezelése Lovróval/Razvannal együtt ellenőrzendő. Ezt a helyi kód önmagában nem biztosítja.
7. **Jelszó-ellenőrzés:** a minimumhossz mellett ismert kompromittált jelszavak tiltását és biztonságos fiók-visszaállítást is meg kell valósítani éles használathoz.
8. **A fenti kód nem teljes penetrációs teszt vagy security audit**. A projekt engedélyezett fejlesztői környezetében szükséges integrációs tesztelés és az Azure SQL kapcsolat ellenőrzése.

## Python mini-jegyzet

- `def` = függvény létrehozása.
- `return` = visszatérési érték.
- `Depends(get_current_user)` = FastAPI előbb ellenőrzi a Bearer tokent, majd a függvénynek átadja a belépett User objektumot.
- `Depends(require_role("tenant"))` = a felhasználót csak tenant szerepkörrel engedi tovább; egyébként 403.
- `try/except` = elkapjuk a hibás JWT / Argon2 hash miatti kivételeket.
- `db.get(User, user_id)` = az adatbázisban keresett felhasználó szerveroldali ellenőrzése. A szerepkört **nem a kliens JWT-payloadjából** bízzuk meg.
- `HTTPException(401)` = nincs érvényes hitelesítés; `403` = van hitelesítés, de nincs engedély.
- `hmac.compare_digest` = állandó idejű összehasonlítás a token jelszóverziójával.
- `SECRET_KEY` = a JWT aláírás titkos kulcsa; **soha ne töltsd fel GitHubra**.

## Fontys portfólióhoz

A Realise dokumentumba a ténylegesen elkészült `security.py`, `password_policy.py`, `login_limit.py` és az auth/users integráció kerülhet. A Validate részbe kizárólag **valóban lefuttatott** teszteket és eredményeket írj. Az Azure SQL és a teljes frontend integráció eredményét ne állítsd késznek, amíg a csapat nem ellenőrizte.

## Ellenőrzés a csomag összeállításakor

A Python-fájlok szintaxisellenőrzése sikerült. Egy *külön, nem csomagolt* ideiglenes SQLite TestClient ellenőrzésben 12/12 vizsgálat sikerült: `/health`, privilegizált regisztráció tiltása, rövid jelszó elutasítása, tenant regisztráció, `/auth/me` hitelesítéssel, token nélküli kérés tiltása, szerepkör tiltása, hibás token tiltása, jelszóváltoztatás, régi token elutasítása, régi jelszó tiltása, új jelszavas login. Ez **nem** Azure SQL vagy teljes alkalmazás penetrációs teszt.
