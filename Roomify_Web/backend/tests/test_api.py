"""API tests: real requests to the FastAPI app, against a SQLite test database (see conftest.py)."""
from datetime import date

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
    taken = {"name": "X", "email": "user2@test.nl", "password": "longenough", "role": "technician"}
    assert client.post("/auth/register", json=taken).status_code == 409
    short = {"name": "X", "email": "x@test.nl", "password": "short", "role": "technician"}
    assert client.post("/auth/register", json=short).status_code == 422


def test_register_technician(client):
    response = client.post("/auth/register", json={
        "name": "Fixer", "email": "fix@test.nl", "password": "longenough",
        "role": "technician", "specialty": "Electrical",
    })
    assert response.status_code == 201
    team = client.get("/houses/team", headers=as_user(MANAGER)).json()
    assert {"name": "Fixer", "specialty": "Electrical"}.items() <= next(t for t in team if t["name"] == "Fixer").items()


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

def test_add_weekly_chore_until_end_of_month(client):
    start = first_of_next_month()
    response = client.post("/chores/assignments", headers=as_user(TOM), json={
        "title": "Clean the oven", "tenant_id": ANA, "first_date": start.isoformat(), "repeat": "WEEKLY",
    })
    assert response.status_code == 201
    days = [date.fromisoformat(e["due_date"]) for e in response.json()]
    assert days[0] == start
    assert all((b - a).days == 7 for a, b in zip(days, days[1:]))
    assert all(d.month == start.month for d in days) and len(days) >= 4

    schedule = client.get(f"/chores/schedule?year={start.year}&month={start.month}", headers=as_user(ANA)).json()
    assert len(schedule) == len(days)
    assert all(e["is_mine"] and e["tenant_name"] == "Ana Tenant" for e in schedule)

    # same chore on the same day again: refused
    again = client.post("/chores/assignments", headers=as_user(TOM), json={
        "title": "Clean the oven", "tenant_id": ANA, "first_date": start.isoformat(),
    })
    assert again.status_code == 409


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
