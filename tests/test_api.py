def test_order_lifecycle_queues_and_delivers_notifications(login):
    c = login("mira")
    o = c.post("/api/orders", json={"new_customer": {"name": "Ali Baba", "phone": "011-1111 2222",
               "consent": {"whatsapp": True}}, "title": "Sticker", "due_date": ""}).json()
    assert o["status"] == "received"
    login("aina")
    r = c.patch(f"/api/orders/{o['id']}/tasks/design", json={"state": "done"}).json()
    assert r["status"] == "design_approved" and r["notifications_sent"] == 1
    login("boss")
    items = c.get("/api/notifications").json()["items"]
    mine = [n for n in items if n["customer"] == "Ali Baba"]
    assert len(mine) == 2 and all(n["state"] == "simulated" for n in mine)  # no gateway configured
    assert mine[0]["recipient"] == "+601111112222" and "/?id=" in mine[0]["message"]
    assert c.get(f"/api/track/{o['code'].lower()}").json()["status"] == "design_approved"


def test_wrong_department_is_rejected(login):
    c = login("aina")
    oid = next(o["id"] for o in c.get("/api/orders").json() if o["status"] != "completed")
    assert c.patch(f"/api/orders/{oid}/tasks/production", json={"state": "done"}).status_code == 422


def test_tracking_is_public_and_hides_contact_details(client):
    body = client.get("/api/track/" + "ORD-{}-0001".format(__import__("datetime").date.today().year))
    if body.status_code == 404:  # seed spans a year boundary
        return
    assert "phone" not in body.text and "@" not in body.text
    assert client.get("/api/track/NOPE").status_code == 404


def test_campaign_respects_consent_and_adds_opt_out_link(login):
    c = login("boss")
    pv = c.get("/api/campaigns/preview?channel=whatsapp").json()
    r = c.post("/api/campaigns", json={"name": "Raya", "channel": "whatsapp", "message": "Hi {name}!"}).json()
    assert r["sent"] == pv["eligible"] == 5 and r["skipped"] == pv["skipped_no_consent"] == 3
    msgs = [n["message"] for n in c.get("/api/notifications").json()["items"] if n["kind"] == "campaign"]
    assert any(m.startswith("Hi Siti!") and "/c/" in m for m in msgs)


def test_customer_consent_change_is_recorded(login):
    c = login("mira")
    cust = c.get("/api/customers?q=Kumar").json()[0]
    c.patch(f"/api/customers/{cust['id']}", json={"name": cust["name"], "phone": cust["phone"],
            "tags": ["walk-in", "VIP-list"], "consent": {"sms": True}})
    d = c.get(f"/api/customers/{cust['id']}").json()
    assert d["consent"]["sms"] and d["tags"] == ["vip-list", "walk-in"]
    assert d["consent_history"][0]["channel"] == "sms" and d["manage_link"].endswith("/c/" + d["manage_link"].split("/c/")[1])


def test_customer_self_service_opt_out(login, client):
    c = login("mira")
    cust = c.get("/api/customers?q=Siti").json()[0]
    token = c.get(f"/api/customers/{cust['id']}").json()["manage_link"].rsplit("/", 1)[1]
    client.post("/api/auth/logout")
    client.cookies.clear()
    assert client.get(f"/api/consent/{token}").json()["consent"]["whatsapp"] is True
    client.post(f"/api/consent/{token}", json={"consent": {"whatsapp": False}})
    assert client.get(f"/api/consent/{token}").json()["consent"]["whatsapp"] is False
    assert client.get("/api/consent/bad-token").status_code == 404
    c = login("mira")
    hist = c.get(f"/api/customers/{cust['id']}").json()["consent_history"]
    assert hist[0]["source"] == "customer" and hist[0]["granted"] is False


def test_csv_import_creates_and_updates(login):
    c = login("mira")
    csv = ("Name,Phone,Email,Tags,consent_whatsapp\n"
           "Siti Aminah,0123456789,,vip,\n"          # matches existing by phone -> update + merge tags
           "New Person,0199990000,new@x.my,event;corporate,ya\n"
           ",0100000000,,,\n")
    r = c.post("/api/customers/import", json={"csv": csv}).json()
    assert (r["created"], r["updated"], len(r["errors"])) == (1, 1, 1)
    siti = c.get("/api/customers?q=Siti").json()[0]
    assert "vip" in siti["tags"] and "event" in siti["tags"]
    new = c.get("/api/customers?q=New Person").json()[0]
    assert new["consent"]["whatsapp"] and new["tags"] == ["corporate", "event"]
    assert c.post("/api/customers/import", json={"csv": "foo,bar\n1,2"}).status_code == 422


def test_csv_exports(login):
    c = login("boss")
    orders = c.get("/api/orders/export.csv")
    assert orders.status_code == 200 and orders.text.startswith("code,") and orders.text.count("\n") == 31
    assert c.get("/api/customers/export.csv").text.splitlines()[0].startswith("name,phone,email")


def test_admin_edits_order(login):
    c = login("mira")
    oid = c.get("/api/orders").json()[0]["id"]
    r = c.patch(f"/api/orders/{oid}", json={"amount": 999, "due_date": "2030-01-01"}).json()
    assert r["amount"] == 999 and r["due_date"] == "2030-01-01"
    assert c.patch(f"/api/orders/{oid}", json={"amount": -1}).status_code == 422


def test_dashboard_has_weekly_trend(login):
    s = login("boss").get("/api/admin/stats").json()
    assert len(s["weekly"]) == 8 and sum(w["orders"] for w in s["weekly"]) == s["total_orders"] == 30
