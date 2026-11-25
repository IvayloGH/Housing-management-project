"""API tests: real requests to the FastAPI app, against a SQLite test database (see conftest.py)."""
from datetime import date, timedelta

import pytest

from conftest import ANA, MANAGER, OTHER_MANAGER, TECH, TOM, ZED, as_user


def first_of_next_month() -> date:
    today = date.today()
    return date(today.year + (today.month == 12), today.month % 12 + 1, 1)


# ---------- register / join a house ----------

def test_register_tenant_joins_house_by_address(client):
    response = client.post("/auth/register", json={
        "name": "New Person", "email": "new@test.nl", "password": "longenough",
        "role": "tenant", "street": "kerkstraat 12", "city": "EINDHOVEN", "room_number": "07",
    })
    assert response.status_code == 201
    token = response.json()["access_token"]

    profile = client.get("/users/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert profile["role"] == "tenant"
    assert profile["house_name"] == "Kerkstraat 12"
    assert profile["room_number"] == "07"


def test_register_with_unknown_address_is_refused(client):
    response = client.post("/auth/register", json={
        "name": "Lost", "email": "lost@test.nl", "password": "longenough",
        "role": "tenant", "street": "Nowhere 1", "city": "Eindhoven",
    })
    assert response.status_code == 404


def test_register_needs_unique_email_and_long_password(client):
    home = {"role": "tenant", "street": "Kerkstraat 12", "city": "Eindhoven"}
    taken = {"name": "X", "email": "user2@test.nl", "password": "longenough"} | home
    assert client.post("/auth/register", json=taken).status_code == 409
    short = {"name": "X", "email": "x@test.nl", "password": "short"} | home
    assert client.post("/auth/register", json=short).status_code == 422


@pytest.mark.parametrize("role", ["technician", "property_manager"])
def test_only_tenants_can_sign_up_themselves(client, role):
    # Security rule: managers and technicians are made with create_account.py
    response = client.post("/auth/register", json={
        "name": "Fixer", "email": "fix@test.nl", "password": "longenough", "role": role,
    })
    assert response.status_code == 403


# ---------- tickets: the whole flow ----------

def report(client, user=TOM, **extra):
    body = {"title": "Shower leaks", "description": "Water on the floor", "location": "Bathroom 1", "urgency": "LOW"}
    response = client.post("/tickets", json=body | extra, headers=as_user(user))
    assert response.status_code == 201
    return response.json()


def test_ticket_flow_from_report_to_fixed(client):
    ticket = report(client)
    assert ticket["reported_by_name"] == "Tom Tenant"
    assert ticket["house_name"] == "Kerkstraat 12"
    tid = ticket["ticket_id"]

    # manager changes urgency + category, leaves a note, assigns
    updated = client.put(f"/tickets/{tid}", json={"urgency": "HIGH", "category": "Plumbing"}, headers=as_user(MANAGER))
    assert updated.status_code == 200
    assert (updated.json()["urgency"], updated.json()["category"]) == ("HIGH", "Plumbing")

    assert client.post(f"/tickets/{tid}/notes", json={"text": "Bring a new seal"}, headers=as_user(MANAGER)).status_code == 201
    assigned = client.put(f"/tickets/{tid}/assign", json={"technician_id": TECH}, headers=as_user(MANAGER)).json()
    assert assigned["status"] == "ASSIGNED"
    assert assigned["technician_name"] == "Theo Technician"

    # technician sees the job + the note, and fixes it
    jobs = client.get("/tickets/assigned", headers=as_user(TECH)).json()
    assert [j["ticket_id"] for j in jobs] == [tid]
    assert jobs[0]["last_note"] == "Bring a new seal"
    client.post(f"/tickets/{tid}/notes", json={"text": "Replaced the seal"}, headers=as_user(TECH))
    fixed = client.put(f"/tickets/{tid}/status", json={"status": "RESOLVED"}, headers=as_user(TECH)).json()
    assert fixed["status"] == "RESOLVED"
    assert fixed["last_note"] == "Replaced the seal"

    # the housemate can read the notes too
    notes = client.get(f"/tickets/{tid}/notes", headers=as_user(ANA)).json()
    assert [n["text"] for n in notes] == ["Bring a new seal", "Replaced the seal"]

    # everyone involved got notifications
    manager_msgs = [n["message"] for n in client.get("/notifications", headers=as_user(MANAGER)).json()]
    tech_msgs = [n["message"] for n in client.get("/notifications", headers=as_user(TECH)).json()]
    tom_msgs = [n["message"] for n in client.get("/notifications", headers=as_user(TOM)).json()]
    assert "New report: Shower leaks at Kerkstraat 12." in manager_msgs
    assert "New job: Shower leaks at Kerkstraat 12." in tech_msgs
    assert "Theo Technician fixed: Shower leaks." in tom_msgs


def test_other_people_cannot_touch_a_ticket(client):
    tid = report(client)["ticket_id"]
    # a manager of another house, a tenant of another house, an unassigned technician
    assert client.put(f"/tickets/{tid}", json={"urgency": "HIGH"}, headers=as_user(OTHER_MANAGER)).status_code == 404
    assert client.get(f"/tickets/{tid}/notes", headers=as_user(ZED)).status_code == 404
    assert client.post(f"/tickets/{tid}/notes", json={"text": "hi"}, headers=as_user(TECH)).status_code == 404
    # wrong role entirely
    assert client.get("/tickets/manager", headers=as_user(TOM)).status_code == 403
    # not logged in
    assert client.get("/tickets/house").status_code == 401


def test_bad_urgency_is_refused(client):
    tid = report(client)["ticket_id"]
    assert client.put(f"/tickets/{tid}", json={"urgency": "SUPER"}, headers=as_user(MANAGER)).status_code == 422


def test_decline_only_while_not_assigned(client):
    first = report(client)["ticket_id"]
    second = report(client, title="Broken lamp")["ticket_id"]
    client.put(f"/tickets/{second}/assign", json={"technician_id": TECH}, headers=as_user(MANAGER))

    assert client.delete(f"/tickets/{first}", headers=as_user(MANAGER)).status_code == 204
    assert client.delete(f"/tickets/{second}", headers=as_user(MANAGER)).status_code == 409
    remaining = [t["ticket_id"] for t in client.get("/tickets/manager", headers=as_user(MANAGER)).json()]
    assert remaining == [second]


def test_photo_upload(client, tmp_path):
    tid = report(client)["ticket_id"]
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 100

    ok = client.post(f"/tickets/{tid}/photos", files={"file": ("leak.png", png, "image/png")}, headers=as_user(TOM))
    assert ok.status_code == 201
    url = ok.json()["url"]
    assert url.startswith("/uploads/tickets/") and url.endswith(".png")
    assert (tmp_path / "tickets" / url.rsplit("/", 1)[1]).read_bytes() == png

    ticket = client.get("/tickets/house", headers=as_user(ANA)).json()[0]
    assert ticket["photo_urls"] == [url]

    text = client.post(f"/tickets/{tid}/photos", files={"file": ("x.txt", b"hi", "text/plain")}, headers=as_user(TOM))
    assert text.status_code == 415
    other_house = client.post(f"/tickets/{tid}/photos", files={"file": ("a.png", png, "image/png")}, headers=as_user(ZED))
    assert other_house.status_code == 404


# ---------- chores ----------

def test_add_weekly_chore_for_the_next_12_weeks(client):
    start = first_of_next_month()
    response = client.post("/chores/assignments", headers=as_user(TOM), json={
        "title": "Clean the oven", "tenant_id": ANA, "first_date": start.isoformat(), "repeat": "WEEKLY",
    })
    assert response.status_code == 201
    days = [date.fromisoformat(e["due_date"]) for e in response.json()]
    assert days[0] == start
    assert all((b - a).days == 7 for a, b in zip(days, days[1:]))
    assert len(days) == 13 and (days[-1] - start).days == 84   # first day + 12 weeks, also into next months

    # rotation (M-07): Ana starts, then it goes round the house (Tom, Ana, Tom, ...)
    doers = [e["tenant_id"] for e in response.json()]
    assert doers == [[ANA, TOM][i % 2] for i in range(len(days))]

    schedule = client.get(f"/chores/schedule?year={start.year}&month={start.month}", headers=as_user(ANA)).json()
    in_month = [d for d in doers[:len(schedule)]]
    assert len(schedule) == sum(1 for d in days if d.month == start.month)
    assert [e["is_mine"] for e in schedule] == [d == ANA for d in in_month]

    # same chore on the same day again: refused
    again = client.post("/chores/assignments", headers=as_user(TOM), json={
        "title": "Clean the oven", "tenant_id": ANA, "first_date": start.isoformat(),
    })
    assert again.status_code == 409


def test_once_chore_stays_with_the_chosen_person(client):
    start = first_of_next_month().isoformat()
    response = client.post("/chores/assignments", headers=as_user(TOM), json={
        "title": "Defrost freezer", "tenant_id": ANA, "first_date": start, "repeat": "ONCE",
    })
    assert response.status_code == 201
    assert [e["tenant_id"] for e in response.json()] == [ANA]


def test_marking_done_keeps_the_plan_without_doubles(client):
    today = date.today()
    added = client.post("/chores/assignments", headers=as_user(TOM), json={
        "title": "Bins", "tenant_id": TOM, "first_date": today.isoformat(), "repeat": "WEEKLY",
    }).json()
    assert len(added) == 13
    # Tom does today's turn; the plan is topped up so it still reaches 12 weeks from today
    done = client.put(f"/chores/assignments/{added[0]['assignment_id']}/done", headers=as_user(TOM))
    assert done.status_code == 200
    mine_and_ana = client.get("/chores/mine?limit=50", headers=as_user(TOM)).json() + \
        client.get("/chores/mine?limit=50", headers=as_user(ANA)).json()
    bins = sorted(date.fromisoformat(e["due_date"]) for e in mine_and_ana if e["chore_title"] == "Bins")
    assert bins[-1] == today + timedelta(weeks=12)
    assert len(bins) == len(set(bins)) == 12   # nothing planned twice


def test_chore_rules(client):
    start = first_of_next_month().isoformat()
    other_house = {"title": "Bins", "tenant_id": ZED, "first_date": start}
    assert client.post("/chores/assignments", json=other_house, headers=as_user(TOM)).status_code == 400
    past = {"title": "Bins", "tenant_id": ANA, "first_date": "2020-01-01"}
    assert client.post("/chores/assignments", json=past, headers=as_user(TOM)).status_code == 400


def test_housemates(client):
    mates = client.get("/users/housemates", headers=as_user(TOM)).json()
    assert [(h["name"], h["is_me"]) for h in mates] == [("Ana Tenant", False), ("Tom Tenant", True)]


# ---------- houses ----------

def test_manager_adds_and_edits_house(client):
    new = client.post("/houses", json={"street": "Markt 5", "city": "Eindhoven"}, headers=as_user(MANAGER))
    assert new.status_code == 201
    house = new.json()
    assert (house["name"], house["address"], house["tenant_count"]) == ("Markt 5", "Markt 5, Eindhoven", 0)

    edited = client.put(f"/houses/{house['house_id']}", json={"street": "Markt 6", "city": "Eindhoven"}, headers=as_user(MANAGER))
    assert edited.json()["address"] == "Markt 6, Eindhoven"
    other = client.put(f"/houses/{house['house_id']}", json={"street": "X", "city": "Y"}, headers=as_user(OTHER_MANAGER))
    assert other.status_code == 404

    names = [h["name"] for h in client.get("/houses", headers=as_user(MANAGER)).json()]
    assert names == ["Kerkstraat 12", "Markt 6"]


# ---------- notifications ----------

def test_notifications_mark_read_only_your_own(client):
    report(client)
    note = client.get("/notifications", headers=as_user(MANAGER)).json()[0]
    assert note["is_read"] is False

    assert client.put(f"/notifications/{note['notification_id']}/read", headers=as_user(TOM)).status_code == 404
    read = client.put(f"/notifications/{note['notification_id']}/read", headers=as_user(MANAGER))
    assert read.json()["is_read"] is True


# ---------- groceries + expenses (existing endpoints, end to end) ----------

def test_grocery_bought_and_split_cost(client):
    item = client.post("/groceries", json={"name": "Dish soap"}, headers=as_user(TOM)).json()
    assert client.get("/groceries", headers=as_user(ANA)).json()[0]["name"] == "Dish soap"
    assert client.put(f"/groceries/{item['item_id']}/bought", headers=as_user(TOM)).json()["is_bought"] is True

    expense = client.post("/expenses", json={"description": "Dish soap", "amount": "3.01"}, headers=as_user(TOM)).json()
    shares = {s["tenant_name"]: (s["amount_owed"], s["is_settled"]) for s in expense["shares"]}
    assert shares == {"Tom Tenant": ("1.51", True), "Ana Tenant": ("1.50", False)}

    balances = {b["tenant_name"]: b["balance"] for b in client.get("/expenses/balances", headers=as_user(ANA)).json()}
    assert balances == {"Tom Tenant": "1.50", "Ana Tenant": "-1.50"}

    settled = client.put(f"/expenses/{expense['expense_id']}/shares/{ANA}/settle", headers=as_user(TOM))
    assert settled.status_code == 200


# ---------- face login while the face_login table is not in Azure SQL yet ----------

def test_face_status_without_face_table_says_not_available(client):
    from sqlalchemy.exc import ProgrammingError

    from database import get_db
    from main import app

    real_db = app.dependency_overrides[get_db]

    def db_without_face_table():
        for db in real_db():
            real_get = db.get

            def get(model, key, *args, **kwargs):
                if model.__name__ == "FaceLogin":
                    raise ProgrammingError("SELECT", {}, Exception("Invalid object name 'face_login'"))
                return real_get(model, key, *args, **kwargs)

            db.get = get
            yield db

    app.dependency_overrides[get_db] = db_without_face_table
    try:
        response = client.get("/auth/face", headers=as_user(TOM))
    finally:
        app.dependency_overrides[get_db] = real_db
    assert response.status_code == 503


def test_health_db(client):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/health/db").json() == {"database": "ok"}
