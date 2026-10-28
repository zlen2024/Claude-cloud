const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = d => d ? new Date(d).toLocaleString("ms-MY", { dateStyle: "medium", timeStyle: "short" }) : "—";
const rm = n => "RM " + Number(n).toLocaleString("en-MY", { maximumFractionDigits: 0 });
const initials = n => n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
const store = { get: k => { try { return localStorage.getItem(k) } catch { return null } },
                set: (k, v) => { try { localStorage.setItem(k, v) } catch {} } };

async function api(path, opt = {}) {
  const r = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, ...opt,
                                         body: opt.body && JSON.stringify(opt.body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Ralat " + r.status);
  return data;
}

/* ---------- navigation model ---------- */
const ROUTES = {
  dashboard:     { label: "Dashboard", icon: "home",  product: "command", tab: true },
  orders:        { label: "Orders",    icon: "box",   product: "command", tab: true },
  staff:         { label: "Kerja",     icon: "check", product: "command", tab: true },
  customers:     { label: "Customers", icon: "users", product: "crm",     tab: true },
  blast:         { label: "Blast",     icon: "mega",  product: "reach",   tab: true },
  notifications: { label: "Notifications", icon: "bell", product: "reach" },
};
const GROUPS = [["Operations", ["dashboard", "orders", "staff"]], ["Customers", ["customers"]], ["Engage", ["blast", "notifications"]]];
const PRODUCT_NAME = { command: "Operations", crm: "Customers", reach: "Reach" };
const STATE_LABEL = { pending: "Pending", in_progress: "In progress", done: "Done" };
let staff = [], me = null;

const statusPill = o => `<span class="pill ${o.status === "completed" ? "ok" : o.overdue ? "bad" : "acc"}">${o.overdue && o.status !== "completed" ? "Lewat · " : ""}${esc(o.status_label)}</span>`;
const chip = (i, t, sub = "") => `<div class="card-h"><div class="chip">${IC[i]}</div><div><b>${t}</b>${sub ? `<span>${sub}</span>` : ""}</div></div>`;
const head = (t, sub, right = "") => `<div class="head"><div><h1>${t}</h1><div class="mute">${sub}</div></div>${right}</div>`;
const spark = seed => { const p = Array.from({ length: 12 }, (_, i) => [i * 30, 24 - Math.round((Math.sin(i * .8 + seed) + 1) * 6 + i * .7)]);
  return `<svg class="sp" viewBox="0 0 330 30" preserveAspectRatio="none"><path d="M${p.map(x => x.join(",")).join(" L")}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>` };

/* ---------- UI helpers ---------- */
function animateIn(root) {
  gsap.from($$(".card,.kpi,.item,.hero", root), { y: 18, opacity: 0, stagger: .04, duration: .5, ease: "power3.out", clearProps: "transform,opacity" });
  $$(".bar i", root).forEach(b => gsap.to(b, { width: b.dataset.w + "%", duration: 1, ease: "power2.out", delay: .15 }));
  $$(".ring", root).forEach(r => { const o = { p: 0 }; gsap.to(o, { p: +r.dataset.p, duration: 1, ease: "power2.out", onUpdate: () => r.style.setProperty("--p", o.p) }) });
  $$("[data-count]", root).forEach(el => { const o = { v: 0 }, money = el.dataset.money;
    gsap.to(o, { v: +el.dataset.count, duration: 1, ease: "power1.out", onUpdate: () => el.textContent = money ? rm(o.v) : Math.round(o.v) }) });
}
function openSheet(html) {
  $("#sheet").innerHTML = `<div class="grab"></div>` + html;
  $("#modal").classList.add("open");
  const desktop = matchMedia("(min-width:640px)").matches;
  gsap.fromTo("#sheet", desktop ? { scale: .94, opacity: 0 } : { yPercent: 100 }, desktop ? { scale: 1, opacity: 1, duration: .3, ease: "back.out(1.5)" } : { yPercent: 0, duration: .4, ease: "power3.out" });
}
function closeSheet() {
  const desktop = matchMedia("(min-width:640px)").matches;
  gsap.to("#sheet", { ...(desktop ? { opacity: 0, scale: .96 } : { yPercent: 100 }), duration: .22, ease: "power2.in",
    onComplete: () => { $("#modal").classList.remove("open"); gsap.set("#sheet", { clearProps: "all" }) } });
}
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeSheet() });
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast glass"; t.textContent = msg; document.body.append(t);
  gsap.from(t, { y: 30, opacity: 0, duration: .35, ease: "power3.out" });
  gsap.to(t, { opacity: 0, y: 10, delay: 2.6, duration: .3, onComplete: () => t.remove() });
}
async function guard(fn) { try { await fn() } catch (e) { toast(e.message) } }

/* ---------- views ---------- */
const views = {
  async dashboard(v) {
    const s = await api("/admin/stats"), max = Math.max(1, ...s.by_status.map(x => x.count));
    v.innerHTML = `
      <div class="hero"><small>Ringkasan hari ini</small>
        <h2>Hai ${esc(me?.name || "")}, ${s.active_orders} order sedang berjalan${s.overdue ? ` · ${s.overdue} lewat` : ""}.</h2>
        <div class="q"><a href="#/staff">Kerja saya</a><a href="#/orders">Semua order</a><a href="#/blast">Hantar promo</a></div></div>
      <div class="kpis">
        <div class="card kpi"><span class="l">Active orders</span><b data-count="${s.active_orders}">0</b>${spark(1)}</div>
        <div class="card kpi"><span class="l">Overdue</span><b style="color:var(--destructive)" data-count="${s.overdue}">0</b>${spark(2)}</div>
        <div class="card kpi"><span class="l">Revenue</span><b data-count="${s.revenue}" data-money="1">0</b>${spark(3)}</div>
        <div class="card kpi"><span class="l">Customers</span><b data-count="${s.customers}">0</b>${spark(4)}</div></div>
      <div class="stack cols">
        <div class="card">${chip("pie", "Orders ikut status", "Pipeline semasa")}
          ${s.by_status.map(x => `<div class="statrow"><span class="mute">${x.label}</span><b>${x.count}</b><div class="bar"><i data-w="${x.count / max * 100}"></i></div></div>`).join("")}</div>
        <div class="card">${chip("trend", "Prestasi department", "Siap vs tertunggak")}
          ${Object.entries(s.departments).map(([d, x]) => { const t = x.pending + x.in_progress + x.done || 1;
            return `<div class="statrow"><b style="text-transform:capitalize">${d}</b><span class="mute small">${x.done}/${t} siap · ${x.in_progress} jalan</span><div class="bar"><i data-w="${x.done / t * 100}"></i></div></div>` }).join("")}</div>
      </div>`;
  },

  async orders(v) {
    const list = await api("/orders"), q0 = sessionStorage.getItem("gq") || "";
    const filters = [["", "Semua"], ["active", "Active"], ["overdue", "Lewat"], ["completed", "Completed"]];
    let f = "";
    v.innerHTML = head("Orders", "Semua tempahan dalam satu sistem", `<button class="sm desk" id="new2">${IC.plus}Order baru</button>`) +
      `<div class="toolbar"><input id="q" placeholder="Cari kod, nama, tajuk" value="${esc(q0)}" enterkeyhint="search"></div>
       <div class="seg">${filters.map(([k, l]) => `<button data-f="${k}" class="${k === f ? "on" : ""}">${l}</button>`).join("")}</div>
       <div class="list" id="list"></div>`;
    const draw = () => {
      const q = $("#q").value.toLowerCase();
      const rows = list.filter(o => (o.code + o.title + o.customer.name).toLowerCase().includes(q))
        .filter(o => !f || (f === "active" ? o.status !== "completed" : f === "overdue" ? o.overdue : o.status === f));
      $("#list").innerHTML = rows.map(o => `
        <div class="item card" data-id="${o.id}"><div class="ring" data-p="${Math.round(o.progress * 100)}">${Math.round(o.progress * 100)}%</div>
          <div class="main"><b>${esc(o.title)}</b><div class="meta">${o.code} · ${esc(o.customer.name)}</div><div style="margin-top:4px">${statusPill(o)}</div></div>
          <div class="side"><b class="small">${rm(o.amount)}</b><span class="meta">${o.due_date || ""}</span></div></div>`).join("") || `<div class="empty card">Tiada order.</div>`;
      $$("#list .item").forEach(r => r.onclick = () => orderSheet(+r.dataset.id));
      animateIn($("#list"));
    };
    $("#q").oninput = draw;
    $$(".seg button").forEach(b => b.onclick = () => { f = b.dataset.f; $$(".seg button").forEach(x => x.classList.toggle("on", x === b)); draw() });
    $("#new2").onclick = newOrderSheet;
    sessionStorage.removeItem("gq"); draw();
  },

  async staff(v) {
    const dept = me?.department || "", all = await api("/orders" + (dept ? "?department=" + dept : ""));
    const open = all.filter(o => o.status !== "completed");
    v.innerHTML = head(`Kerja ${dept ? `<span class="pill acc">${dept}</span>` : ""}`, dept ? "Update progress kerja department anda" : "Admin: semua department") +
      `<div class="list">${open.map(o => `
        <div class="card"><div style="display:flex;gap:10px;align-items:flex-start"><div style="flex:1;min-width:0"><b>${esc(o.title)}</b>
          <div class="meta mute small">${o.code} · ${esc(o.customer.name)} · due ${o.due_date || "—"}</div></div>${statusPill(o)}</div>
          ${o.tasks.filter(t => !dept || t.department === dept).map(t => `
            <div class="task"><div style="display:flex;justify-content:space-between;align-items:center"><b style="text-transform:capitalize">${t.department}</b>
              <span class="pill ${t.state === "done" ? "ok" : t.state === "in_progress" ? "warn" : ""}">${STATE_LABEL[t.state]}</span></div>
              ${t.updated_by ? `<div class="small mute">oleh ${esc(t.updated_by)}${t.note ? ` · “${esc(t.note)}”` : ""}</div>` : ""}
              ${t.state !== "done" ? `<div class="row"><input placeholder="Nota (optional)" data-note="${o.id}-${t.department}">
                ${t.state === "pending" ? `<button class="sm ghost" data-act="${o.id}|${t.department}|in_progress">Mula</button>` : ""}
                <button class="sm" data-act="${o.id}|${t.department}|done">Siap</button></div>` : ""}
            </div>`).join("")}</div>`).join("") || `<div class="empty card">Tiada kerja tertunggak 🎉</div>`}</div>`;
    $$("[data-act]").forEach(b => b.onclick = () => guard(async () => {
      const [id, d, state] = b.dataset.act.split("|");
      const r = await api(`/orders/${id}/tasks/${d}`, { method: "PATCH", body: { state, staff_id: me.id, note: $(`[data-note="${id}-${d}"]`).value } });
      toast(`${r.code} → ${r.status_label}${r.notifications_sent ? ` · ${r.notifications_sent} notifikasi` : ""}`); render();
    }));
  },

  async customers(v) {
    const list = await api("/customers");
    let seg = "";
    v.innerHTML = head("Customers", "Rekod, segment dan sejarah pembelian", `<button class="sm desk" id="newc">${IC.plus}Customer</button>`) +
      `<div class="toolbar"><input id="q" placeholder="Cari nama, phone, email"></div>
       <div class="seg">${[["", "Semua"], ["new", "New"], ["repeat", "Repeat"], ["vip", "VIP"]].map(([k, l]) => `<button data-s="${k}" class="${k === seg ? "on" : ""}">${l}</button>`).join("")}</div>
       <div class="list" id="list"></div>`;
    const draw = () => {
      const q = $("#q").value.toLowerCase();
      $("#list").innerHTML = list.filter(c => (!seg || c.segment === seg) && (c.name + c.phone + c.email).toLowerCase().includes(q)).map(c => `
        <div class="item card" data-id="${c.id}"><div class="avatar">${initials(c.name)}</div>
          <div class="main"><b>${esc(c.name)}</b><div class="meta">${esc(c.phone || c.email)} · ${c.order_count} order</div>
            <div class="pills" style="margin-top:4px">${c.tags.map(t => `<span class="pill">${esc(t)}</span>`).join("")}</div></div>
          <div class="side"><span class="pill ${c.segment === "vip" ? "warn" : c.segment === "repeat" ? "ok" : ""}">${c.segment}</span><span class="meta">${rm(c.total_spent)}</span></div></div>`).join("") || `<div class="empty card">Tiada customer.</div>`;
      $$("#list .item").forEach(r => r.onclick = () => customerSheet(+r.dataset.id));
      animateIn($("#list"));
    };
    $("#q").oninput = draw;
    $$(".seg button").forEach(b => b.onclick = () => { seg = b.dataset.s; $$(".seg button").forEach(x => x.classList.toggle("on", x === b)); draw() });
    $("#newc").onclick = () => customerForm();
    draw();
  },

  async blast(v) {
    const camps = await api("/campaigns");
    v.innerHTML = head("Customer Blast", "Promosi & follow-up — hanya kepada yang consent") + `
      <div class="stack cols"><div class="card form">${chip("send", "Campaign baru", "WhatsApp · Email · SMS")}
        <label>Nama campaign</label><input id="n" placeholder="Promo Raya">
        <div class="two"><div class="form"><label>Channel</label><select id="ch"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option></select></div>
          <div class="form"><label>Target</label><select id="aud"><option value="">Semua</option><option>new</option><option>repeat</option><option>vip</option></select></div></div>
        <label>Mesej — guna {name}</label><textarea id="m" rows="4">Hi {name}, ada promo istimewa untuk anda bulan ni!</textarea>
        <div class="pills" id="pv"></div><button class="block" id="go">${IC.send}Hantar blast</button></div>
      <div class="card">${chip("clock", "Campaign lepas")}
        <div class="list">${camps.map(c => `<div class="task" style="margin:0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(c.name)}</b><span class="pill acc">${c.channel}</span></div>
          <div class="small mute">${c.sent} dihantar · ${c.skipped} skip · ${fmt(c.created_at)}</div></div>`).join("") || `<div class="empty">Belum ada.</div>`}</div></div></div>`;
    const pv = () => guard(async () => { const r = await api(`/campaigns/preview?channel=${$("#ch").value}&audience=${$("#aud").value}`);
      $("#pv").innerHTML = `<span class="pill ok">${r.eligible} akan terima</span><span class="pill">${r.skipped_no_consent} skip (tiada consent)</span>` });
    $("#ch").onchange = $("#aud").onchange = pv; pv();
    $("#go").onclick = () => guard(async () => {
      if (!$("#n").value.trim()) return toast("Isi nama campaign");
      const r = await api("/campaigns", { method: "POST", body: { name: $("#n").value, channel: $("#ch").value, audience: $("#aud").value, message: $("#m").value } });
      toast(`${r.sent} mesej dihantar`); render();
    });
  },

  async notifications(v) {
    const l = await api("/notifications");
    v.innerHTML = head("Notifications", "Prototype: mesej direkod sahaja, gateway belum disambung") +
      `<div class="list">${l.map(n => `<div class="item card" style="cursor:default;align-items:flex-start"><div class="chip">${IC[n.kind === "campaign" ? "mega" : "bell"]}</div>
        <div class="main"><b>${esc(n.customer)}</b><div class="small" style="white-space:normal">${esc(n.message)}</div><div class="meta">${fmt(n.created_at)} · ${esc(n.recipient)}</div></div>
        <div class="side"><span class="pill acc">${n.channel}</span></div></div>`).join("") || `<div class="empty card">Tiada notifikasi.</div>`}</div>`;
  },
};

/* ---------- sheets ---------- */
async function orderSheet(id) {
  const o = await api("/orders/" + id);
  openSheet(`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="mute small">${o.code}</span>${statusPill(o)}</div>
    <h2>${esc(o.title)}</h2><div class="mute small">${esc(o.customer.name)} · ${rm(o.amount)} · due ${o.due_date || "—"}</div>
    ${o.details ? `<p>${esc(o.details)}</p>` : ""}
    <div class="bar" style="margin:14px 0"><i data-w="${o.progress * 100}"></i></div>
    <div class="pills">${o.tasks.map(t => `<span class="pill ${t.state === "done" ? "ok" : t.state === "in_progress" ? "warn" : ""}">${t.department}: ${STATE_LABEL[t.state]}</span>`).join("")}</div>
    <h4 style="margin:16px 0 4px">Timeline</h4><div class="timeline">${o.logs.map(l => `<div><span><b>${l.label}</b> <span class="mute">· ${esc(l.by)} · ${fmt(l.at)}</span></span></div>`).join("")}</div>
    <div class="two" style="margin-top:18px"><a href="/?id=${o.code}" target="_blank"><button class="ghost block">Link tracking</button></a><button class="block" onclick="closeSheet()">Tutup</button></div>`);
  animateIn($("#sheet"));
}
async function customerSheet(id) {
  const c = await api("/customers/" + id);
  openSheet(`<div style="display:flex;gap:12px;align-items:center"><div class="avatar">${initials(c.name)}</div><div style="flex:1"><h2 style="margin:0">${esc(c.name)}</h2>
      <div class="mute small">${esc(c.phone)} ${c.email ? "· " + esc(c.email) : ""}</div></div><span class="pill acc">${c.segment}</span></div>
    <div class="two" style="margin:14px 0"><div class="task" style="margin:0"><div class="small mute">Orders</div><b>${c.order_count}</b></div><div class="task" style="margin:0"><div class="small mute">Jumlah belian</div><b>${rm(c.total_spent)}</b></div></div>
    <div class="pills">${Object.entries(c.consent).map(([k, on]) => `<span class="pill ${on ? "ok" : "bad"}">${k} ${on ? "✓" : "✗"}</span>`).join("")}</div>
    ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
    <h4 style="margin:16px 0 4px">Sejarah pembelian</h4><div class="timeline">${c.orders.map(o => `<div><span><b>${esc(o.title)}</b> <span class="mute">· ${o.code} · ${rm(o.amount)} · ${o.status_label}</span></span></div>`).join("") || `<span class="mute">—</span>`}</div>
    <h4 style="margin:16px 0 4px">Rekod consent</h4><div class="timeline">${c.consent_history.map(h => `<div><span>${h.channel} ${h.granted ? "setuju" : "tarik balik"} <span class="mute">· ${esc(h.source)} · ${fmt(h.at)}</span></span></div>`).join("") || `<span class="mute small">Tiada rekod.</span>`}</div>
    <div class="two" style="margin-top:18px"><button class="ghost block" id="ed">Edit</button><button class="block" onclick="closeSheet()">Tutup</button></div>`);
  $("#ed").onclick = () => customerForm(c);
}
function customerForm(c = {}) {
  openSheet(`<h2>${c.id ? "Edit customer" : "Customer baru"}</h2><div class="form" style="margin-top:12px">
    <input id="cn" placeholder="Nama" value="${esc(c.name)}" autocomplete="name">
    <div class="two"><input id="cp" placeholder="Telefon" inputmode="tel" value="${esc(c.phone)}"><input id="ce" placeholder="Email" inputmode="email" value="${esc(c.email)}"></div>
    <input id="ct" placeholder="Tags (pisah koma)" value="${esc((c.tags || []).join(", "))}">
    <textarea id="cno" rows="2" placeholder="Nota">${esc(c.notes)}</textarea>
    <label>Consent terima mesej</label>
    <div class="chk">${["whatsapp", "email", "sms"].map(k => `<label><input type="checkbox" data-c="${k}" ${c.consent?.[k] ? "checked" : ""}>${k}</label>`).join("")}</div>
    <div class="two"><button class="ghost block" onclick="closeSheet()">Batal</button><button class="block" id="sv">Simpan</button></div></div>`);
  $("#sv").onclick = () => guard(async () => {
    const body = { name: $("#cn").value.trim(), phone: $("#cp").value, email: $("#ce").value, notes: $("#cno").value,
      tags: $("#ct").value.split(",").map(s => s.trim()).filter(Boolean), consent: Object.fromEntries($$("[data-c]").map(x => [x.dataset.c, x.checked])) };
    if (!body.name) return toast("Nama diperlukan");
    await api("/customers" + (c.id ? "/" + c.id : ""), { method: c.id ? "PATCH" : "POST", body });
    closeSheet(); toast("Disimpan"); render();
  });
}
async function newOrderSheet() {
  const cs = await api("/customers");
  openSheet(`<h2>Order baru</h2><div class="form" style="margin-top:12px"><label>Customer</label>
    <select id="oc">${cs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>
    <input id="ot" placeholder="Tajuk order"><textarea id="od" rows="2" placeholder="Butiran"></textarea>
    <div class="two"><input id="oa" type="number" inputmode="decimal" placeholder="Amount (RM)"><input id="ou" type="date"></div>
    <div class="two"><button class="ghost block" onclick="closeSheet()">Batal</button><button class="block" id="sv">Cipta order</button></div></div>`);
  $("#sv").onclick = () => guard(async () => {
    if (!$("#ot").value.trim()) return toast("Tajuk diperlukan");
    const o = await api("/orders", { method: "POST", body: { customer_id: +$("#oc").value, title: $("#ot").value, details: $("#od").value, amount: +$("#oa").value || 0, due_date: $("#ou").value } });
    closeSheet(); toast("Order " + o.code + " dicipta"); location.hash = "#/orders"; render();
  });
}
function staffSheet() {
  openSheet(`<h2>Login sebagai (demo)</h2><div class="list" style="margin-top:12px">${staff.map(s => `
    <div class="item card" data-id="${s.id}"><div class="avatar">${initials(s.name)}</div><div class="main"><b>${esc(s.name)}</b><div class="meta">${s.role}</div></div>
    ${me?.id === s.id ? `<span class="pill ok">aktif</span>` : ""}</div>`).join("")}</div>`);
  $$("#sheet .item").forEach(r => r.onclick = () => { setMe(+r.dataset.id); closeSheet(); render() });
}

/* ---------- shell ---------- */
function setMe(id) { me = staff.find(s => s.id === id) || staff[0]; store.set("who", me.id); $("#av").textContent = initials(me.name) }
function setTheme(dark) { document.documentElement.classList.toggle("dark", dark); store.set("theme", dark ? "dark" : "light") }

function drawNav(name) {
  $("#side").innerHTML = `<div class="brand"><div class="logo">O</div><div><b>OrderFlow</b><div class="small mute">All-in-one operations</div></div></div>` +
    GROUPS.map(([h, keys]) => `<h6>${h}</h6>` + keys.map(k => `<a href="#/${k}" class="${k === name ? "on" : ""}">${IC[ROUTES[k].icon]}${ROUTES[k].label}</a>`).join("")).join("") +
    `<div class="foot"><a href="/" target="_blank">${IC.globe}Public tracking</a><a href="#" id="themeD">${IC.moon}Tukar tema</a></div>`;
  $("#themeD").onclick = e => { e.preventDefault(); setTheme(!document.documentElement.classList.contains("dark")) };
  $("#tabs").innerHTML = Object.entries(ROUTES).filter(([, r]) => r.tab).map(([k, r]) => `<a href="#/${k}" class="${k === name ? "on" : ""}">${IC[r.icon]}${r.label}</a>`).join("");
}

async function render() {
  const name = ROUTES[location.hash.slice(2)] ? location.hash.slice(2) : "dashboard", r = ROUTES[name];
  document.body.dataset.product = r.product;
  document.documentElement.dataset.product = r.product;
  $("#ttl").textContent = r.label; $("#sub").textContent = PRODUCT_NAME[r.product];
  drawNav(name);
  $("#fab").style.display = ["orders", "customers"].includes(name) ? "" : "none";
  $("#fab").onclick = name === "orders" ? newOrderSheet : () => customerForm();
  const v = $("#view");
  try { await views[name](v); animateIn(v); window.scrollTo(0, 0) }
  catch (e) { v.innerHTML = `<div class="card">Ralat: ${esc(e.message)}</div>` }
}

(async () => {
  $("#srIcon").outerHTML = IC.search; $("#bell").innerHTML = IC.bell; $("#fab").innerHTML = IC.plus;
  setTheme(store.get("theme") === "dark");
  $("#bell").onclick = () => location.hash = "#/notifications";
  $("#av").onclick = staffSheet;
  $("#gs").onkeydown = e => { if (e.key === "Enter") { sessionStorage.setItem("gq", e.target.value); location.hash === "#/orders" ? render() : location.hash = "#/orders" } };
  staff = await api("/staff"); setMe(+store.get("who"));
  window.onhashchange = render;
  if (!location.hash) location.hash = me.role === "admin" ? "#/dashboard" : "#/staff"; else render();
  // slow drifting orbs behind the glass
  $$(".orbs i").forEach((o, i) => gsap.to(o, { x: i % 2 ? -60 : 60, y: i ? 40 : -30, scale: 1.1, duration: 9 + i * 3, repeat: -1, yoyo: true, ease: "sine.inOut" }));
})();
