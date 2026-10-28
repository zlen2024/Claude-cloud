const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = d => d ? new Date(d).toLocaleString("ms-MY", { dateStyle: "medium", timeStyle: "short" }) : "—";
const rm = n => "RM " + Number(n).toLocaleString("en-MY", { maximumFractionDigits: 0 });
const initials = n => (n || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
const store = { get: k => { try { return localStorage.getItem(k) } catch { return null } },
                set: (k, v) => { try { localStorage.setItem(k, v) } catch {} } };

class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status } }
async function api(path, opt = {}) {
  const r = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, credentials: "same-origin", ...opt,
                                         body: opt.body && JSON.stringify(opt.body) });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !path.startsWith("/auth/")) { me = null; showLogin(); }
  if (!r.ok) throw new ApiError(typeof data.detail === "string" ? data.detail : "Ralat " + r.status, r.status);
  return data;
}
const download = path => { location.href = "/api" + path };

/* ---------- navigation model: each route declares the permission it needs ---------- */
const ROUTES = {
  dashboard:     { label: "Dashboard", icon: "home",  product: "command", perm: "view_reports" },
  orders:        { label: "Orders",    icon: "box",   product: "command", perm: "view_orders" },
  work:          { label: "Kerja",     icon: "check", product: "command", perm: "update_tasks" },
  customers:     { label: "Customers", icon: "users", product: "crm",     perm: "manage_customers" },
  blast:         { label: "Blast",     icon: "mega",  product: "reach",   perm: "send_campaigns" },
  notifications: { label: "Notifikasi", icon: "bell", product: "reach",   perm: "view_notifications" },
  team:          { label: "Team",      icon: "team",  product: "command", perm: "manage_staff" },
};
const GROUPS = [["Operations", ["dashboard", "orders", "work"]], ["Customers", ["customers"]],
                ["Engage", ["blast", "notifications"]], ["Admin", ["team"]]];
const PRODUCT_NAME = { command: "Operations", crm: "Customers", reach: "Reach" };
const STATE_LABEL = { pending: "Pending", in_progress: "In progress", done: "Done" };
const ROLE_LABEL = { admin: "Admin", sales: "Sales / CS", design: "Design", production: "Production", delivery: "Delivery" };
const NOTI_STATE = { queued: ["", "Dalam queue"], sent: ["ok", "Dihantar"], simulated: ["acc", "Simulasi"], failed: ["bad", "Gagal"] };
let me = null;
const can = p => !!me?.permissions.includes(p);
const allowed = () => Object.keys(ROUTES).filter(k => can(ROUTES[k].perm));
const homeRoute = () => can("view_reports") ? "dashboard" : can("manage_orders") ? "orders" : "work";

const statusPill = o => `<span class="pill ${o.status === "completed" ? "ok" : o.overdue ? "bad" : "acc"}">${o.overdue && o.status !== "completed" ? "Lewat · " : ""}${esc(o.status_label)}</span>`;
const chip = (i, t, sub = "") => `<div class="card-h"><div class="chip">${IC[i]}</div><div><b>${t}</b>${sub ? `<span>${sub}</span>` : ""}</div></div>`;
const head = (t, sub, right = "") => `<div class="head"><div><h1>${t}</h1><div class="mute">${sub}</div></div>${right ? `<div class="actions">${right}</div>` : ""}</div>`;
const spark = values => {
  const max = Math.max(1, ...values), step = 330 / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(28 - v / max * 24).toFixed(1)}`);
  return `<svg class="sp" viewBox="0 0 330 30" preserveAspectRatio="none"><path d="M${pts.join(" L")}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};
function weeklyChart(weeks, width) {
  // Drawn at the container's real pixel width so text and dots keep their size on any screen.
  const W = Math.max(280, Math.round(width)), H = W < 500 ? 170 : 220, pad = 22, bw = (W - pad * 2) / weeks.length;
  const maxO = Math.max(1, ...weeks.map(w => w.orders)), maxR = Math.max(1, ...weeks.map(w => w.revenue));
  const y = (v, m) => H - pad - v / m * (H - pad * 2);
  const narrow = W < 500, label = d => new Date(d).toLocaleDateString("ms-MY", { day: "numeric", month: "short" });
  const line = weeks.map((w, i) => `${(pad + bw * i + bw / 2).toFixed(1)},${y(w.revenue, maxR).toFixed(1)}`).join(" L");
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Orders dan revenue 8 minggu">
    ${[0, .5, 1].map(f => `<line x1="${pad}" x2="${W - pad}" y1="${y(f * maxO, maxO)}" y2="${y(f * maxO, maxO)}" class="grid"/>`).join("")}
    ${weeks.map((w, i) => `<rect class="b" x="${pad + bw * i + bw * .22}" width="${bw * .56}" y="${y(w.orders, maxO)}" height="${H - pad - y(w.orders, maxO)}" rx="6"><title>${w.orders} order</title></rect>
      ${narrow && i % 2 ? "" : `<text x="${pad + bw * i + bw / 2}" y="${H - 6}" text-anchor="middle">${label(w.week)}</text>`}`).join("")}
    <path class="ln" d="M${line}" fill="none"/>
    ${weeks.map((w, i) => `<circle class="pt" cx="${pad + bw * i + bw / 2}" cy="${y(w.revenue, maxR)}" r="3.5"><title>${rm(w.revenue)}</title></circle>`).join("")}
  </svg><div class="legend"><span><i class="b"></i>Orders</span><span><i class="ln"></i>Revenue</span></div>`;
}

/* ---------- UI helpers ---------- */
function animateIn(root) {
  gsap.from($$(".card,.kpi,.item,.hero", root), { y: 16, opacity: 0, stagger: .035, duration: .45, ease: "power3.out", clearProps: "transform,opacity" });
  $$(".bar i", root).forEach(b => gsap.to(b, { width: b.dataset.w + "%", duration: 1, ease: "power2.out", delay: .15 }));
  $$(".ring", root).forEach(r => { const o = { p: 0 }; gsap.to(o, { p: +r.dataset.p, duration: 1, ease: "power2.out", onUpdate: () => r.style.setProperty("--p", o.p) }) });
  $$("[data-count]", root).forEach(el => { const o = { v: 0 }, money = el.dataset.money;
    gsap.to(o, { v: +el.dataset.count, duration: 1, ease: "power1.out", onUpdate: () => el.textContent = money ? rm(o.v) : Math.round(o.v) }) });
  gsap.from($$(".chart rect.b", root), { scaleY: 0, transformOrigin: "50% 100%", stagger: .05, duration: .6, ease: "power3.out", delay: .1 });
  $$(".chart .ln", root).forEach(p => { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.2, delay: .3, ease: "power2.out" }) });
}
const isWide = () => matchMedia("(min-width:640px)").matches;
function openSheet(html) {
  $("#sheet").innerHTML = `<div class="grab"></div>` + html;
  $("#modal").classList.add("open");
  gsap.fromTo("#sheet", isWide() ? { scale: .94, opacity: 0 } : { yPercent: 100 },
    isWide() ? { scale: 1, opacity: 1, duration: .3, ease: "back.out(1.5)" } : { yPercent: 0, duration: .4, ease: "power3.out" });
  animateIn($("#sheet"));
}
function closeSheet() {
  gsap.to("#sheet", { ...(isWide() ? { opacity: 0, scale: .96 } : { yPercent: 100 }), duration: .22, ease: "power2.in",
    onComplete: () => { $("#modal").classList.remove("open"); gsap.set("#sheet", { clearProps: "all" }) } });
}
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeSheet() });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#modal").classList.contains("open")) closeSheet() });
function toast(msg, bad = false) {
  const t = document.createElement("div"); t.className = "toast glass" + (bad ? " bad" : ""); t.textContent = msg; t.setAttribute("role", "status");
  document.body.append(t);
  gsap.from(t, { y: 30, opacity: 0, duration: .35, ease: "power3.out" });
  gsap.to(t, { opacity: 0, y: 10, delay: 2.8, duration: .3, onComplete: () => t.remove() });
}
async function guard(fn, btn) {
  if (btn) btn.disabled = true;
  try { await fn() } catch (e) { if (e.status !== 401) toast(e.message, true) } finally { if (btn) btn.disabled = false }
}
const gatewayPills = g => Object.entries(g).map(([ch, live]) => `<span class="pill ${live ? "ok" : ""}">${ch} · ${live ? "live" : "simulasi"}</span>`).join("");

/* ---------- views ---------- */
const views = {
  async dashboard(v) {
    const s = await api("/admin/stats"), max = Math.max(1, ...s.by_status.map(x => x.count));
    const wk = s.weekly, last = wk.at(-1), prev = wk.at(-2) || { orders: 0, revenue: 0 };
    const delta = (a, b) => b ? Math.round((a - b) / b * 100) : 0;
    v.innerHTML = `
      <div class="hero"><small>${esc(me.business_name)} · ringkasan hari ini</small>
        <h2>Hai ${esc(me.name)}, ${s.active_orders} order sedang berjalan${s.overdue ? ` · ${s.overdue} lewat` : ""}.</h2>
        <div class="q"><a href="#/orders">Semua order</a><a href="#/customers">Customers</a><a href="#/blast">Hantar promo</a></div></div>
      <div class="kpis">
        <div class="card kpi"><span class="l">Active orders</span><b data-count="${s.active_orders}">0</b>${spark(wk.map(w => w.orders))}</div>
        <div class="card kpi"><span class="l">Overdue</span><b style="color:var(--destructive)" data-count="${s.overdue}">0</b>${spark(wk.map(w => Math.max(0, w.orders - w.completed)))}</div>
        <div class="card kpi"><span class="l">Revenue · 8 minggu</span><b data-count="${wk.reduce((a, w) => a + w.revenue, 0)}" data-money="1">0</b>${spark(wk.map(w => w.revenue))}</div>
        <div class="card kpi"><span class="l">Customers</span><b data-count="${s.customers}">0</b>${spark(wk.map(w => w.completed))}</div></div>
      <div class="card" style="margin-bottom:12px">${chip("chart", "Orders & revenue", `Minggu ini ${last.orders} order (${delta(last.orders, prev.orders) >= 0 ? "+" : ""}${delta(last.orders, prev.orders)}%) · ${rm(last.revenue)}`)}<div id="wchart"></div></div>
      <div class="stack cols">
        <div class="card">${chip("pie", "Orders ikut status", "Pipeline semasa")}
          ${s.by_status.map(x => `<div class="statrow"><span class="mute">${x.label}</span><b>${x.count}</b><div class="bar"><i data-w="${x.count / max * 100}"></i></div></div>`).join("")}</div>
        <div class="card">${chip("trend", "Prestasi department", "Siap vs tertunggak")}
          ${Object.entries(s.departments).map(([d, x]) => { const t = x.pending + x.in_progress + x.done || 1;
            return `<div class="statrow"><b style="text-transform:capitalize">${d}</b><span class="mute small">${x.done}/${t} siap · ${x.in_progress} jalan · ${x.pending} pending</span><div class="bar"><i data-w="${x.done / t * 100}"></i></div></div>` }).join("")}
          <div style="margin-top:16px">${chip("plug", "Gateway mesej", "Set env untuk hantar sebenar")}<div class="pills">${gatewayPills(me.gateways)}</div></div></div>
      </div>`;
    const box = $("#wchart");
    box.innerHTML = weeklyChart(wk, box.clientWidth);
  },

  async orders(v) {
    const list = await api("/orders"), q0 = sessionStorage.getItem("gq") || "";
    let f = "";
    const actions = (can("import_export") ? `<button class="sm ghost" id="exp">${IC.download}CSV</button>` : "") +
                    (can("manage_orders") ? `<button class="sm desk" id="new2">${IC.plus}Order baru</button>` : "");
    v.innerHTML = head("Orders", `${list.length} tempahan dalam satu sistem`, actions) +
      `<div class="toolbar"><input id="q" placeholder="Cari kod, nama, tajuk" value="${esc(q0)}" enterkeyhint="search" aria-label="Cari order"></div>
       <div class="seg">${[["", "Semua"], ["active", "Active"], ["overdue", "Lewat"], ["completed", "Completed"]].map(([k, l]) => `<button data-f="${k}" class="${k === f ? "on" : ""}">${l}</button>`).join("")}</div>
       <div class="list" id="list"></div>`;
    const draw = () => {
      const q = $("#q").value.toLowerCase();
      const rows = list.filter(o => (o.code + o.title + o.customer.name).toLowerCase().includes(q))
        .filter(o => !f || (f === "active" ? o.status !== "completed" : f === "overdue" ? o.overdue : o.status === f));
      $("#list").innerHTML = rows.map(o => `
        <button class="item card" data-id="${o.id}"><div class="ring" data-p="${Math.round(o.progress * 100)}">${Math.round(o.progress * 100)}%</div>
          <div class="main"><b>${esc(o.title)}</b><div class="meta">${o.code} · ${esc(o.customer.name)}</div><div style="margin-top:4px">${statusPill(o)}</div></div>
          <div class="side"><b class="small">${rm(o.amount)}</b><span class="meta">${o.due_date || ""}</span></div></button>`).join("") || `<div class="empty card">Tiada order.</div>`;
      $$("#list .item").forEach(r => r.onclick = () => orderSheet(+r.dataset.id));
      animateIn($("#list"));
    };
    $("#q").oninput = draw;
    $$(".seg button").forEach(b => b.onclick = () => { f = b.dataset.f; $$(".seg button").forEach(x => x.classList.toggle("on", x === b)); draw() });
    $("#new2")?.addEventListener("click", newOrderSheet);
    $("#exp")?.addEventListener("click", () => download("/orders/export.csv"));
    sessionStorage.removeItem("gq"); draw();
  },

  async work(v) {
    const dept = me.department || "", all = await api("/orders" + (dept ? "?department=" + dept : ""));
    const open = all.filter(o => o.status !== "completed");
    v.innerHTML = head(`Kerja ${dept ? `<span class="pill acc">${dept}</span>` : ""}`,
        dept ? `${open.length} kerja tertunggak untuk department anda` : "Semua department") +
      `<div class="list">${open.map(o => `
        <div class="card"><div style="display:flex;gap:10px;align-items:flex-start"><div style="flex:1;min-width:0"><b>${esc(o.title)}</b>
          <div class="meta mute small">${o.code} · ${esc(o.customer.name)} · due ${o.due_date || "—"}</div></div>${statusPill(o)}</div>
          ${o.tasks.filter(t => !dept || t.department === dept).map(t => `
            <div class="task"><div style="display:flex;justify-content:space-between;align-items:center"><b style="text-transform:capitalize">${t.department}</b>
              <span class="pill ${t.state === "done" ? "ok" : t.state === "in_progress" ? "warn" : ""}">${STATE_LABEL[t.state]}</span></div>
              ${t.updated_by ? `<div class="small mute">oleh ${esc(t.updated_by)}${t.note ? ` · “${esc(t.note)}”` : ""}</div>` : ""}
              ${t.state !== "done" && (me.role === "admin" || t.department === dept) ? `<div class="row"><input placeholder="Nota (optional)" data-note="${o.id}-${t.department}" aria-label="Nota">
                ${t.state === "pending" ? `<button class="sm ghost" data-act="${o.id}|${t.department}|in_progress">Mula</button>` : ""}
                <button class="sm" data-act="${o.id}|${t.department}|done">Siap</button></div>` : ""}
            </div>`).join("")}</div>`).join("") || `<div class="empty card">Tiada kerja tertunggak 🎉</div>`}</div>`;
    $$("[data-act]").forEach(b => b.onclick = () => guard(async () => {
      const [id, d, state] = b.dataset.act.split("|");
      const r = await api(`/orders/${id}/tasks/${d}`, { method: "PATCH", body: { state, note: $(`[data-note="${id}-${d}"]`).value } });
      toast(`${r.code} → ${r.status_label}${r.notifications_sent ? ` · ${r.notifications_sent} notifikasi` : ""}`); render();
    }, b));
  },

  async customers(v) {
    const list = await api("/customers");
    let seg = "";
    const actions = (can("import_export") ? `<button class="sm ghost" id="imp">${IC.upload}Import</button><button class="sm ghost" id="exp">${IC.download}CSV</button>` : "") +
                    `<button class="sm desk" id="newc">${IC.plus}Customer</button>`;
    v.innerHTML = head("Customers", `${list.length} rekod · segment & sejarah pembelian`, actions) +
      `<div class="toolbar"><input id="q" placeholder="Cari nama, phone, email" aria-label="Cari customer"></div>
       <div class="seg">${[["", "Semua"], ["new", "New"], ["repeat", "Repeat"], ["vip", "VIP"]].map(([k, l]) => `<button data-s="${k}" class="${k === seg ? "on" : ""}">${l}</button>`).join("")}</div>
       <div class="list" id="list"></div><input type="file" id="file" accept=".csv,text/csv" hidden>`;
    const draw = () => {
      const q = $("#q").value.toLowerCase();
      $("#list").innerHTML = list.filter(c => (!seg || c.segment === seg) && (c.name + c.phone + c.email).toLowerCase().includes(q)).map(c => `
        <button class="item card" data-id="${c.id}"><div class="avatar">${initials(c.name)}</div>
          <div class="main"><b>${esc(c.name)}</b><div class="meta">${esc(c.phone || c.email)} · ${c.order_count} order</div>
            <div class="pills" style="margin-top:4px">${c.tags.map(t => `<span class="pill">${esc(t)}</span>`).join("")}</div></div>
          <div class="side"><span class="pill ${c.segment === "vip" ? "warn" : c.segment === "repeat" ? "ok" : ""}">${c.segment}</span><span class="meta">${rm(c.total_spent)}</span></div></button>`).join("") || `<div class="empty card">Tiada customer.</div>`;
      $$("#list .item").forEach(r => r.onclick = () => customerSheet(+r.dataset.id));
      animateIn($("#list"));
    };
    $("#q").oninput = draw;
    $$(".seg button").forEach(b => b.onclick = () => { seg = b.dataset.s; $$(".seg button").forEach(x => x.classList.toggle("on", x === b)); draw() });
    $("#newc").onclick = () => customerForm();
    $("#exp")?.addEventListener("click", () => download("/customers/export.csv"));
    $("#imp")?.addEventListener("click", importSheet);
    draw();
  },

  async blast(v) {
    const camps = await api("/campaigns");
    v.innerHTML = head("Customer Blast", "Promosi & follow-up — hanya kepada yang consent") + `
      <div class="stack cols"><div class="card form">${chip("send", "Campaign baru", "Link urus langganan ditambah automatik")}
        <label for="n">Nama campaign</label><input id="n" placeholder="Promo Raya">
        <div class="two"><div class="form"><label for="ch">Channel</label><select id="ch"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option></select></div>
          <div class="form"><label for="aud">Target</label><select id="aud"><option value="">Semua</option><option value="new">New</option><option value="repeat">Repeat</option><option value="vip">VIP</option><option value="corporate">Tag: corporate</option><option value="reseller">Tag: reseller</option><option value="event">Tag: event</option></select></div></div>
        <label for="m">Mesej — guna {name}</label><textarea id="m" rows="4">Hi {name}, ada promo istimewa untuk anda bulan ni!</textarea>
        <div class="pills" id="pv"></div><button class="block" id="go">${IC.send}Hantar blast</button></div>
      <div class="card">${chip("clock", "Campaign lepas")}
        <div class="list">${camps.map(c => `<div class="task" style="margin:0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(c.name)}</b><span class="pill acc">${c.channel}</span></div>
          <div class="small mute">${c.sent} dihantar · ${c.skipped} skip · ${c.audience || "semua"} · ${fmt(c.created_at)}</div></div>`).join("") || `<div class="empty">Belum ada.</div>`}</div></div></div>`;
    const pv = () => guard(async () => { const r = await api(`/campaigns/preview?channel=${$("#ch").value}&audience=${encodeURIComponent($("#aud").value)}`);
      $("#pv").innerHTML = `<span class="pill ok">${r.eligible} akan terima</span><span class="pill">${r.skipped_no_consent} skip (tiada consent)</span><span class="pill ${r.live ? "ok" : "warn"}">${r.live ? "gateway live" : "mod simulasi"}</span>` });
    $("#ch").onchange = $("#aud").onchange = pv; pv();
    $("#go").onclick = () => guard(async () => {
      if (!$("#n").value.trim()) return toast("Isi nama campaign", true);
      if (!confirm(`Hantar "${$("#n").value}" melalui ${$("#ch").value}?`)) return;
      const r = await api("/campaigns", { method: "POST", body: { name: $("#n").value, channel: $("#ch").value, audience: $("#aud").value, message: $("#m").value } });
      toast(`${r.sent} mesej dihantar ke queue`); render();
    }, $("#go"));
  },

  async notifications(v) {
    const { items, counts, gateways } = await api("/notifications?limit=100");
    v.innerHTML = head("Notifikasi", "Outbox semua mesej automatik & campaign", counts.failed ? `<button class="sm" id="retry">${IC.refresh}Cuba semula ${counts.failed}</button>` : "") +
      `<div class="card" style="margin-bottom:12px"><div class="pills">${Object.entries(NOTI_STATE).map(([k, [cls, l]]) => `<span class="pill ${cls}">${l}: ${counts[k] || 0}</span>`).join("")}</div>
        <div class="pills" style="margin-top:8px">${gatewayPills(gateways)}</div></div>
       <div class="list">${items.map(n => `<div class="item card" style="cursor:default;align-items:flex-start"><div class="chip">${IC[n.kind === "campaign" ? "mega" : "bell"]}</div>
        <div class="main"><b>${esc(n.customer)}</b><div class="small msg">${esc(n.message)}</div>
          <div class="meta">${fmt(n.created_at)} · ${esc(n.recipient)}${n.detail ? " · " + esc(n.detail) : ""}</div></div>
        <div class="side"><span class="pill acc">${n.channel}</span><span class="pill ${NOTI_STATE[n.state][0]}">${NOTI_STATE[n.state][1]}</span></div></div>`).join("") || `<div class="empty card">Tiada notifikasi.</div>`}</div>`;
    $("#retry")?.addEventListener("click", e => guard(async () => { const r = await api("/notifications/retry", { method: "POST" }); toast(`${r.requeued} mesej dicuba semula`); setTimeout(render, 600) }, e.currentTarget));
  },

  async team(v) {
    const list = await api("/staff");
    v.innerHTML = head("Team", "Akaun staff & role", `<button class="sm" id="adds">${IC.plus}Staff</button>`) +
      `<div class="list">${list.map(s => `<div class="item card" style="cursor:default"><div class="avatar">${initials(s.name)}</div>
        <div class="main"><b>${esc(s.name)} ${s.id === me.id ? `<span class="pill ok">anda</span>` : ""}</b><div class="meta">@${esc(s.username)} · ${ROLE_LABEL[s.role]}</div></div>
        <div class="side">${s.active ? `<span class="pill ok">aktif</span>` : `<span class="pill bad">nyahaktif</span>`}
          ${s.id !== me.id ? `<button class="sm ghost" data-edit="${s.id}">${IC.edit}</button>` : ""}</div></div>`).join("")}</div>
      <div class="card" style="margin-top:12px">${chip("team", "Role & akses")}
        <div class="small mute" style="display:grid;gap:6px"><div><b>Admin</b> — semua, termasuk dashboard, blast dan team.</div><div><b>Sales / CS</b> — cipta & edit order, customers, import/export, notifikasi.</div>
        <div><b>Design / Production / Delivery</b> — lihat order, update kerja department sendiri sahaja.</div></div></div>`;
    $("#adds").onclick = () => staffForm();
    $$("[data-edit]").forEach(b => b.onclick = () => staffForm(list.find(s => s.id === +b.dataset.edit)));
  },
};

/* ---------- sheets ---------- */
async function orderSheet(id) {
  const o = await api("/orders/" + id);
  openSheet(`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="mute small">${o.code}</span>${statusPill(o)}</div>
    <h2>${esc(o.title)}</h2><div class="mute small">${esc(o.customer.name)} · ${rm(o.amount)} · due ${o.due_date || "—"}</div>
    ${o.details ? `<p style="white-space:pre-line">${esc(o.details)}</p>` : ""}
    <div class="bar" style="margin:14px 0"><i data-w="${o.progress * 100}"></i></div>
    <div class="pills">${o.tasks.map(t => `<span class="pill ${t.state === "done" ? "ok" : t.state === "in_progress" ? "warn" : ""}">${t.department}: ${STATE_LABEL[t.state]}</span>`).join("")}</div>
    <h4 style="margin:16px 0 4px">Timeline</h4><div class="timeline">${o.logs.map(l => `<div><span><b>${l.label}</b> <span class="mute">· ${esc(l.by)} · ${fmt(l.at)}</span></span></div>`).join("")}</div>
    <div class="two" style="margin-top:18px"><button class="ghost block" id="link">${IC.link}Salin link</button>
      ${can("manage_orders") ? `<button class="ghost block" id="edit">${IC.edit}Edit</button>` : `<button class="block" id="close">Tutup</button>`}</div>`);
  $("#link").onclick = async () => { const url = `${location.origin}/?id=${o.code}`;
    try { await navigator.clipboard.writeText(url); toast("Link tracking disalin") } catch { prompt("Link tracking:", url) } };
  $("#close")?.addEventListener("click", closeSheet);
  $("#edit")?.addEventListener("click", () => orderForm(o));
}
function orderForm(o) {
  openSheet(`<h2>Edit ${o.code}</h2><div class="form" style="margin-top:12px">
    <label for="ot">Tajuk</label><input id="ot" value="${esc(o.title)}">
    <label for="od">Butiran</label><textarea id="od" rows="3">${esc(o.details)}</textarea>
    <div class="two"><div class="form"><label for="oa">Amount (RM)</label><input id="oa" type="number" min="0" step="0.01" inputmode="decimal" value="${o.amount}"></div>
      <div class="form"><label for="ou">Due date</label><input id="ou" type="date" value="${o.due_date || ""}"></div></div>
    <div class="two"><button class="ghost block" id="cancel">Batal</button><button class="block" id="sv">Simpan</button></div></div>`);
  $("#cancel").onclick = () => orderSheet(o.id);
  $("#sv").onclick = e => guard(async () => {
    await api("/orders/" + o.id, { method: "PATCH", body: { title: $("#ot").value, details: $("#od").value, amount: +$("#oa").value || 0, due_date: $("#ou").value || null } });
    toast("Order dikemas kini"); closeSheet(); render();
  }, e.currentTarget);
}
async function customerSheet(id) {
  const c = await api("/customers/" + id);
  openSheet(`<div style="display:flex;gap:12px;align-items:center"><div class="avatar">${initials(c.name)}</div><div style="flex:1;min-width:0"><h2 style="margin:0">${esc(c.name)}</h2>
      <div class="mute small">${esc(c.phone)} ${c.email ? "· " + esc(c.email) : ""}</div></div><span class="pill acc">${c.segment}</span></div>
    <div class="two" style="margin:14px 0"><div class="task" style="margin:0"><div class="small mute">Orders</div><b>${c.order_count}</b></div><div class="task" style="margin:0"><div class="small mute">Jumlah belian</div><b>${rm(c.total_spent)}</b></div></div>
    <div class="pills">${Object.entries(c.consent).map(([k, on]) => `<span class="pill ${on ? "ok" : "bad"}">${k} ${on ? "✓" : "✗"}</span>`).join("")}</div>
    ${c.notes ? `<p style="white-space:pre-line">${esc(c.notes)}</p>` : ""}
    <h4 style="margin:16px 0 4px">Sejarah pembelian</h4><div class="timeline">${c.orders.map(o => `<div><span><b>${esc(o.title)}</b> <span class="mute">· ${o.code} · ${rm(o.amount)} · ${o.status_label}</span></span></div>`).join("") || `<span class="mute">—</span>`}</div>
    <h4 style="margin:16px 0 4px">Rekod consent</h4><div class="timeline">${c.consent_history.map(h => `<div><span>${h.channel} ${h.granted ? "setuju" : "tarik balik"} <span class="mute">· ${esc(h.source)} · ${fmt(h.at)}</span></span></div>`).join("") || `<span class="mute small">Tiada rekod.</span>`}</div>
    <div class="two" style="margin-top:18px"><button class="ghost block" id="cl">${IC.link}Link consent</button><button class="block" id="ed">${IC.edit}Edit</button></div>`);
  $("#ed").onclick = () => customerForm(c);
  $("#cl").onclick = async () => { try { await navigator.clipboard.writeText(c.manage_link); toast("Link urus langganan disalin") } catch { prompt("Link urus langganan:", c.manage_link) } };
}
function customerFields(c = {}) {
  return `<input id="cn" placeholder="Nama" value="${esc(c.name)}" autocomplete="name" aria-label="Nama">
    <div class="two"><input id="cp" placeholder="Telefon" inputmode="tel" value="${esc(c.phone)}" aria-label="Telefon"><input id="ce" placeholder="Email" inputmode="email" value="${esc(c.email)}" aria-label="Email"></div>
    <input id="ct" placeholder="Tags (pisah koma)" value="${esc((c.tags || []).join(", "))}" aria-label="Tags">
    <label>Consent terima mesej (customer setuju)</label>
    <div class="chk">${["whatsapp", "email", "sms"].map(k => `<label><input type="checkbox" data-c="${k}" ${c.consent?.[k] ? "checked" : ""}>${k}</label>`).join("")}</div>`;
}
const readCustomerFields = () => ({ name: $("#cn").value.trim(), phone: $("#cp").value, email: $("#ce").value, notes: $("#cno")?.value || "",
  tags: $("#ct").value.split(",").map(s => s.trim()).filter(Boolean), consent: Object.fromEntries($$("[data-c]").map(x => [x.dataset.c, x.checked])) });
function customerForm(c = {}) {
  openSheet(`<h2>${c.id ? "Edit customer" : "Customer baru"}</h2><div class="form" style="margin-top:12px">
    ${customerFields(c)}<textarea id="cno" rows="2" placeholder="Nota" aria-label="Nota">${esc(c.notes)}</textarea>
    <div class="two"><button class="ghost block" id="cancel">Batal</button><button class="block" id="sv">Simpan</button></div></div>`);
  $("#cancel").onclick = closeSheet;
  $("#sv").onclick = e => guard(async () => {
    const body = readCustomerFields();
    if (!body.name) return toast("Nama diperlukan", true);
    await api("/customers" + (c.id ? "/" + c.id : ""), { method: c.id ? "PATCH" : "POST", body });
    closeSheet(); toast("Disimpan"); render();
  }, e.currentTarget);
}
async function newOrderSheet() {
  const cs = await api("/customers");
  openSheet(`<h2>Order baru</h2><div class="form" style="margin-top:12px">
    <div class="seg" style="margin:0"><button class="on" data-m="old">Customer sedia ada</button><button data-m="new">Customer baru</button></div>
    <div id="cold"><select id="oc" aria-label="Customer">${cs.map(c => `<option value="${c.id}">${esc(c.name)} — ${esc(c.phone || c.email)}</option>`).join("")}</select></div>
    <div id="cnew" class="form" hidden>${customerFields()}</div>
    <label for="ot">Order</label><input id="ot" placeholder="Tajuk order"><textarea id="od" rows="2" placeholder="Butiran (saiz, kuantiti, warna…)" aria-label="Butiran"></textarea>
    <div class="two"><input id="oa" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Amount (RM)" aria-label="Amount"><input id="ou" type="date" aria-label="Due date"></div>
    <div class="two"><button class="ghost block" id="cancel">Batal</button><button class="block" id="sv">Cipta order</button></div></div>`);
  let mode = "old";
  $$("[data-m]").forEach(b => b.onclick = () => { mode = b.dataset.m; $$("[data-m]").forEach(x => x.classList.toggle("on", x === b)); $("#cold").hidden = mode !== "old"; $("#cnew").hidden = mode !== "new" });
  $("#cancel").onclick = closeSheet;
  $("#sv").onclick = e => guard(async () => {
    if (!$("#ot").value.trim()) return toast("Tajuk diperlukan", true);
    const body = { title: $("#ot").value, details: $("#od").value, amount: +$("#oa").value || 0, due_date: $("#ou").value };
    if (mode === "old") body.customer_id = +$("#oc").value;
    else { body.new_customer = readCustomerFields(); if (!body.new_customer.name) return toast("Nama customer diperlukan", true) }
    const o = await api("/orders", { method: "POST", body });
    closeSheet(); toast("Order " + o.code + " dicipta"); location.hash === "#/orders" ? render() : location.hash = "#/orders";
  }, e.currentTarget);
}
function importSheet() {
  openSheet(`<h2>Import customers</h2><p class="mute small">Dari Google Sheets: File → Download → CSV. Column: <b>name</b>, phone, email, tags, notes, consent_whatsapp, consent_email, consent_sms (ya/tidak). Customer sedia ada dipadankan ikut phone atau email.</p>
    <div class="form"><button class="ghost block" id="pick">${IC.upload}Pilih fail CSV</button><div id="res"></div>
    <a class="small" href="data:text/csv;charset=utf-8,name,phone,email,tags,notes,consent_whatsapp,consent_email,consent_sms%0AContoh Nama,0123456789,contoh@email.com,vip,,ya,ya,tidak" download="template-customers.csv">Muat turun template</a></div>`);
  $("#pick").onclick = () => $("#file").click();
  $("#file").onchange = e => { const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => guard(async () => {
      const r = await api("/customers/import", { method: "POST", body: { csv: reader.result } });
      $("#res").innerHTML = `<div class="pills"><span class="pill ok">${r.created} baru</span><span class="pill acc">${r.updated} dikemas kini</span>${r.errors.length ? `<span class="pill bad">${r.errors.length} ralat</span>` : ""}</div>
        ${r.errors.length ? `<div class="small mute" style="margin-top:6px">${r.errors.map(esc).join("<br>")}</div>` : ""}`;
      toast("Import selesai"); e.target.value = ""; views.customers($("#view")).then(() => animateIn($("#view")));
    });
    reader.readAsText(f); };
}
function staffForm(s) {
  openSheet(`<h2>${s ? "Edit " + esc(s.name) : "Staff baru"}</h2><div class="form" style="margin-top:12px">
    ${s ? "" : `<input id="sn" placeholder="Nama" aria-label="Nama"><input id="su" placeholder="Username" autocapitalize="none" aria-label="Username">`}
    <label for="sr">Role</label><select id="sr">${Object.entries(ROLE_LABEL).map(([k, l]) => `<option value="${k}" ${s?.role === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <label for="sp">${s ? "Reset password (kosongkan jika tidak tukar)" : "Password (min 8 aksara)"}</label><input id="sp" type="password" autocomplete="new-password">
    ${s ? `<div class="chk"><label><input type="checkbox" id="sa" ${s.active ? "checked" : ""}>Akaun aktif</label></div>` : ""}
    <div class="two"><button class="ghost block" id="cancel">Batal</button><button class="block" id="sv">Simpan</button></div></div>`);
  $("#cancel").onclick = closeSheet;
  $("#sv").onclick = e => guard(async () => {
    if (s) await api("/staff/" + s.id, { method: "PATCH", body: { role: $("#sr").value, active: $("#sa").checked, password: $("#sp").value || null } });
    else await api("/staff", { method: "POST", body: { name: $("#sn").value, username: $("#su").value, role: $("#sr").value, password: $("#sp").value } });
    closeSheet(); toast("Disimpan"); render();
  }, e.currentTarget);
}
function profileSheet() {
  const extra = ["notifications", "team"].filter(k => can(ROUTES[k].perm));
  openSheet(`<div style="display:flex;gap:12px;align-items:center"><div class="avatar">${initials(me.name)}</div><div><h2 style="margin:0">${esc(me.name)}</h2><div class="mute small">@${esc(me.username)} · ${ROLE_LABEL[me.role]}</div></div></div>
    <div class="list" style="margin-top:16px">
      ${extra.map(k => `<a class="item card" href="#/${k}"><div class="chip">${IC[ROUTES[k].icon]}</div><div class="main"><b>${ROUTES[k].label}</b></div></a>`).join("")}
      <button class="item card" id="th"><div class="chip">${IC.moon}</div><div class="main"><b>Tema ${document.documentElement.classList.contains("dark") ? "terang" : "gelap"}</b></div></button>
      <a class="item card" href="/" target="_blank"><div class="chip">${IC.globe}</div><div class="main"><b>Page tracking customer</b></div></a>
      <button class="item card" id="lo"><div class="chip" style="color:var(--destructive)">${IC.logout}</div><div class="main"><b>Log keluar</b></div></button></div>`);
  $$("#sheet a.item[href^='#']").forEach(a => a.addEventListener("click", closeSheet));
  $("#th").onclick = () => { setTheme(!document.documentElement.classList.contains("dark")); closeSheet() };
  $("#lo").onclick = logout;
}

/* ---------- auth ---------- */
async function showLogin() {
  document.body.classList.add("auth"); document.body.classList.remove("booting");
  const cfg = await fetch("/api/auth/config").then(r => r.json()).catch(() => ({}));
  $("#view").innerHTML = `<div class="login card"><div class="logo" style="margin-bottom:14px">O</div>
    <h1>${esc(cfg.business_name || "OrderFlow")}</h1><p class="mute">Log masuk untuk teruskan.</p>
    <form class="form" id="lf" style="margin-top:16px"><input id="lu" placeholder="Username" autocomplete="username" autocapitalize="none" required aria-label="Username">
      <input id="lp" type="password" placeholder="Password" autocomplete="current-password" required aria-label="Password"><button class="block" id="lb">Log masuk</button></form>
    ${cfg.demo ? `<div style="margin-top:18px"><div class="small mute" style="margin-bottom:8px">Akaun demo (password <b>demo1234</b>)</div>
      <div class="pills">${["boss", "mira", "aina", "hafiz", "zul"].map(u => `<button class="sm ghost" data-u="${u}">${u}</button>`).join("")}</div></div>` : ""}</div>`;
  gsap.from(".login", { y: 24, opacity: 0, duration: .6, ease: "power3.out" });
  const go = () => guard(async () => {
    await api("/auth/login", { method: "POST", body: { username: $("#lu").value, password: $("#lp").value } });
    await boot();
  }, $("#lb"));
  $("#lf").onsubmit = e => { e.preventDefault(); go() };
  $$("[data-u]").forEach(b => b.onclick = () => { $("#lu").value = b.dataset.u; $("#lp").value = "demo1234"; go() });
}
async function logout() {
  await api("/auth/logout", { method: "POST" }).catch(() => {});
  me = null; closeSheet(); location.hash = ""; showLogin();
}

/* ---------- shell ---------- */
function setTheme(dark) { document.documentElement.classList.toggle("dark", dark); store.set("theme", dark ? "dark" : "light") }

function drawNav(name) {
  const keys = allowed();
  $("#side").innerHTML = `<div class="brand"><div class="logo">O</div><div><b>${esc(me.business_name)}</b><div class="small mute">All-in-one operations</div></div></div>` +
    GROUPS.map(([h, ks]) => ks.filter(k => keys.includes(k))).map((ks, i) => ks.length ? `<h6>${GROUPS[i][0]}</h6>` +
      ks.map(k => `<a href="#/${k}" class="${k === name ? "on" : ""}">${IC[ROUTES[k].icon]}${ROUTES[k].label}</a>`).join("") : "").join("") +
    `<div class="foot"><a href="/" target="_blank">${IC.globe}Page tracking</a><a href="#" id="themeD">${IC.moon}Tukar tema</a><a href="#" id="logoutD">${IC.logout}Log keluar</a></div>`;
  $("#themeD").onclick = e => { e.preventDefault(); setTheme(!document.documentElement.classList.contains("dark")) };
  $("#logoutD").onclick = e => { e.preventDefault(); logout() };
  const tabs = keys.filter(k => k !== "team" && (k !== "notifications" || keys.length <= 4)).slice(0, 5);
  $("#tabs").style.gridTemplateColumns = `repeat(${tabs.length},1fr)`;
  $("#tabs").innerHTML = tabs.map(k => `<a href="#/${k}" class="${k === name ? "on" : ""}">${IC[ROUTES[k].icon]}${ROUTES[k].label}</a>`).join("");
  $("#bell").hidden = !can("view_notifications");
}

async function render() {
  if (!me) return;
  const want = location.hash.slice(2), name = allowed().includes(want) ? want : homeRoute(), r = ROUTES[name];
  if (want !== name) { history.replaceState(null, "", "#/" + name) }
  document.body.dataset.product = r.product; document.documentElement.dataset.product = r.product;
  $("#ttl").textContent = r.label; $("#sub").textContent = PRODUCT_NAME[r.product];
  drawNav(name);
  const fab = { orders: can("manage_orders") && newOrderSheet, customers: can("manage_customers") && (() => customerForm()) }[name];
  $("#fab").style.display = fab ? "" : "none"; $("#fab").onclick = fab || null;
  const v = $("#view");
  try { await views[name](v); animateIn(v); window.scrollTo(0, 0) }
  catch (e) { if (e.status !== 401) v.innerHTML = `<div class="card">Ralat: ${esc(e.message)}</div>` }
}

async function boot() {
  try { me = await api("/auth/me") } catch { return showLogin() }
  document.body.classList.remove("auth", "booting");
  $("#av").textContent = initials(me.name);
  render();
}

(() => {
  $("#srIcon").outerHTML = IC.search; $("#bell").innerHTML = IC.bell; $("#fab").innerHTML = IC.plus;
  $("#fab").setAttribute("aria-label", "Tambah"); $("#bell").setAttribute("aria-label", "Notifikasi");
  setTheme(store.get("theme") === "dark");
  $("#bell").onclick = () => location.hash = "#/notifications";
  $("#av").onclick = profileSheet;
  $("#gs").onkeydown = e => { if (e.key === "Enter") { sessionStorage.setItem("gq", e.target.value); location.hash === "#/orders" ? render() : location.hash = "#/orders" } };
  window.onhashchange = render;
  boot();
  $$(".orbs i").forEach((o, i) => gsap.to(o, { x: i % 2 ? -60 : 60, y: i ? 40 : -30, scale: 1.1, duration: 9 + i * 3, repeat: -1, yoyo: true, ease: "sine.inOut" }));
})();
