const STORAGE_KEY = "my-apply-calendar.v1";

const defaultEventTemplates = [
  ["공고일", "announce"],
  ["원서접수마감", "go"],
  ["서류 발표", "announce"],
  ["필기일", "go"],
  ["필기발표", "announce"],
  ["면접일", "go"],
  ["면접 발표", "announce"],
  ["최합발표", "announce"],
];

const sampleData = [
  {
    id: makeId(),
    company: "한국전력공사",
    role: "전산직",
    url: "https://example.com",
    applyUrl: "https://example.com/apply",
    priority: "high",
    notes: "면접 다녀온 뒤 질문 복기 필요",
    events: [
      { id: makeId(), label: "원서접수마감", type: "go", date: "2026-05-25", unknown: false, done: true, result: "submitted", review: "" },
      { id: makeId(), label: "면접일", type: "go", date: "2026-05-29", unknown: false, done: false, result: "", review: "" },
      { id: makeId(), label: "면접 발표", type: "announce", date: "2026-06-05", unknown: false, done: false, result: "", review: "" },
    ],
  },
  {
    id: makeId(),
    company: "서울교통공사",
    role: "정보보안",
    url: "",
    applyUrl: "",
    priority: "medium",
    notes: "",
    events: [
      { id: makeId(), label: "필기일", type: "go", date: "2026-05-31", unknown: false, done: false, result: "", review: "" },
      { id: makeId(), label: "필기발표", type: "announce", date: "", unknown: true, done: false, result: "", review: "" },
    ],
  },
];

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const state = {
  applications: loadApplications(),
  view: "list",
  query: "",
  editingId: null,
  calendarDate: new Date(2026, 4, 1),
};

const els = {
  newApplyButton: document.querySelector("#newApplyButton"),
  viewButtons: document.querySelectorAll(".view-button"),
  listView: document.querySelector("#listView"),
  calendarView: document.querySelector("#calendarView"),
  applyList: document.querySelector("#applyList"),
  searchInput: document.querySelector("#searchInput"),
  summaryTotal: document.querySelector("#summaryTotal"),
  summaryLive: document.querySelector("#summaryLive"),
  focusTitle: document.querySelector("#focusTitle"),
  focusCopy: document.querySelector("#focusCopy"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  settingsView: document.querySelector("#settingsView"),
  navButtons: document.querySelectorAll("[data-view]"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  applyDialog: document.querySelector("#applyDialog"),
  applyForm: document.querySelector("#applyForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  cancelDialogButton: document.querySelector("#cancelDialogButton"),
  deleteApplyButton: document.querySelector("#deleteApplyButton"),
  addEventButton: document.querySelector("#addEventButton"),
  eventRows: document.querySelector("#eventRows"),
  dayDialog: document.querySelector("#dayDialog"),
  dayDialogTitle: document.querySelector("#dayDialogTitle"),
  closeDayDialogButton: document.querySelector("#closeDayDialogButton"),
  dayDetails: document.querySelector("#dayDetails"),
};

function loadApplications() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return normalizeApplications(sampleData);
  }

  try {
    return normalizeApplications(JSON.parse(raw));
  } catch {
    return normalizeApplications(sampleData);
  }
}

function normalizeApplications(applications) {
  return applications.map((app) => ({
    ...app,
    applyUrl: app.applyUrl || "",
    priority: app.priority || "medium",
    events: (app.events || []).map((event, index) => ({
      id: event.id || makeId(),
      label: event.label || `일정 ${index + 1}`,
      type: event.type || event.event_type || "announce",
      date: event.date || event.event_date || "",
      unknown: Boolean(event.unknown ?? event.is_unknown),
      done: Boolean(event.done ?? event.is_done ?? event.result),
      result: event.result || "",
      review: event.review || "",
    })),
  }));
}

function saveApplications() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.applications));
}

function formatDate(dateString) {
  if (!dateString) return "미정";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", weekday: "short" }).format(new Date(`${dateString}T00:00:00`));
}

function isUpcoming(dateString) {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateString}T00:00:00`);
  return target >= today;
}

function getFilteredApplications() {
  const query = state.query.trim().toLowerCase();
  if (!query) return state.applications;
  return state.applications.filter((app) => {
    const haystack = [app.company, app.role, getAutoStatus(app).label, app.notes, ...app.events.map((event) => event.label)].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function getNeedsCheck(app) {
  return app.events.filter((event) => {
    if (event.unknown || !event.date) return false;
    const eventDate = new Date(`${event.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today && !event.done;
  });
}

function render() {
  renderSummary();
  renderList();
  renderCalendar();
}

function renderSummary() {
  const flatEvents = state.applications.flatMap((app) => app.events.map((event) => ({ ...event, app })));
  const nextEvent = flatEvents
    .filter((event) => isUpcoming(event.date) && !event.done && !event.result)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  els.summaryTotal.textContent = state.applications.length;
  els.summaryLive.textContent = state.applications.filter((app) => app.priority !== "drop" && getAutoStatus(app).tone !== "done").length;
  if (nextEvent) {
    els.focusTitle.textContent = `${nextEvent.app.company} · ${nextEvent.label}`;
    els.focusCopy.textContent = `${formatDate(nextEvent.date)}까지 챙겨야 합니다.`;
  } else {
    els.focusTitle.textContent = "Application tracker";
    els.focusCopy.textContent = "Keep the next step visible.";
  }
}

function renderList() {
  const apps = getFilteredApplications();
  if (!apps.length) {
    els.applyList.innerHTML = `<div class="empty-state">아직 표시할 지원 항목이 없습니다.</div>`;
    return;
  }

  els.applyList.innerHTML = apps.map((app) => {
    const needsCheck = getNeedsCheck(app);
    const autoStatus = getAutoStatus(app);
    const sortedEvents = [...app.events].sort((a, b) => (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31"));
    return `
      <article class="apply-card ${app.priority === "drop" ? "is-drop" : ""}" data-open="${app.id}" tabindex="0" role="button" aria-label="${escapeAttr(app.company)} 수정">
        <span class="priority-bar ${app.priority}" aria-hidden="true"></span>
        <div class="card-main">
          <div class="card-topline">
            <div class="title-stack">
              <h3>${escapeHtml(app.company)}</h3>
              <span class="status-pill ${autoStatus.tone}">${escapeHtml(autoStatus.label)}</span>
            </div>
            <div class="card-links">
              ${linkButton(app.url, "공고 URL")}
              ${linkButton(app.applyUrl, "지원 URL")}
            </div>
          </div>
          <div class="subline-row">
            ${app.notes ? `<p class="review-text">${escapeHtml(app.notes)}</p>` : `<p class="review-text">${escapeHtml(app.role)}</p>`}
            ${needsCheck.length ? `<span class="check-pill">${needsCheck.length}개 체크 필요</span>` : ""}
          </div>
          <div class="card-events" style="--event-count: ${Math.max(sortedEvents.length, 1)}">
            ${sortedEvents.map((event) => timelineSegment(event)).join("")}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function linkButton(url, label) {
  if (!url) {
    return `<span class="link-button disabled">${label}</span>`;
  }

  return `<a class="link-button" href="${escapeAttr(url)}" target="_blank" rel="noreferrer" data-stop-open>${label}</a>`;
}

function timelineSegment(event) {
  const progressClass = getEventProgressClass(event);
  return `
    <span class="timeline-segment ${event.type} ${progressClass}">
      <strong>${eventIcon(event.type)} ${escapeHtml(event.label)}</strong>
    </span>
  `;
}

function getEventProgressClass(event) {
  if (event.unknown || !event.date) return "is-unknown";
  if (event.done || event.result) return "is-done";
  const today = getToday();
  const eventDate = new Date(`${event.date}T00:00:00`);
  if (eventDate < today) return "is-overdue";
  return "is-upcoming";
}

function getAutoStatus(app) {
  if (app.priority === "drop") {
    return { label: "Drop", tone: "muted" };
  }

  const today = getToday();
  const datedEvents = app.events
    .filter((event) => event.date && !event.unknown)
    .map((event) => ({ ...event, dateObject: new Date(`${event.date}T00:00:00`) }))
    .sort((a, b) => a.dateObject - b.dateObject);
  const uncheckedPast = datedEvents.find((event) => event.dateObject < today && !event.done && !event.result);

  if (uncheckedPast) {
    return { label: `${uncheckedPast.label} 체크 필요`, tone: "warn" };
  }

  const nextEvent = datedEvents.find((event) => event.dateObject >= today && !event.done && !event.result);
  if (nextEvent) {
    const diffDays = Math.ceil((nextEvent.dateObject - today) / 86400000);
    return { label: `${nextEvent.label} ${diffDays === 0 ? "오늘" : `${diffDays}일`}`, tone: nextEvent.type };
  }

  if (datedEvents.length) {
    return { label: "모든 일정 확인 완료", tone: "done" };
  }

  return { label: "일정 미정", tone: "muted" };
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  els.calendarTitle.textContent = `${year}년 ${month + 1}월`;

  const start = new Date(year, month, 1);
  const firstDay = start.getDay();
  const gridStart = new Date(year, month, 1 - firstDay);
  const byDate = groupEventsByDate();
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(date);
    const events = byDate.get(dateKey) || [];
    cells.push(`
      <button class="day-cell ${date.getMonth() === month ? "" : "is-muted"} ${events.length ? "has-events" : ""}" type="button" data-date="${dateKey}">
        <span class="day-number">${date.getDate()}</span>
        ${events.slice(0, 3).map((item) => `<span class="calendar-event ${item.event.type}">${eventIcon(item.event.type)} ${escapeHtml(item.app.company)} ${escapeHtml(item.event.label)}</span>`).join("")}
        ${events.length > 3 ? `<span class="event-meta">+${events.length - 3}</span>` : ""}
      </button>
    `);
  }

  els.calendarGrid.innerHTML = cells.join("");
}

function groupEventsByDate() {
  const map = new Map();
  state.applications.forEach((app) => {
    app.events.forEach((event) => {
      if (!event.date || event.unknown) return;
      const list = map.get(event.date) || [];
      list.push({ app, event });
      map.set(event.date, list);
    });
  });
  return map;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventIcon(type) {
  return type === "go" ? "▶" : "●";
}

function openApplyDialog(app = null) {
  const fields = els.applyForm.elements;
  state.editingId = app?.id || null;
  els.dialogTitle.textContent = app ? "Edit Apply" : "New Apply";
  els.deleteApplyButton.hidden = !app;
  fields.company.value = app?.company || "";
  fields.role.value = app?.role || "";
  fields.url.value = app?.url || "";
  fields.applyUrl.value = app?.applyUrl || "";
  fields.priority.value = app?.priority || "medium";
  fields.notes.value = app?.notes || "";
  renderEventRows(app?.events || createDefaultEvents());
  els.applyDialog.showModal();
}

function createDefaultEvents() {
  return defaultEventTemplates.map(([label, type]) => ({
    id: makeId(),
    label,
    type,
    date: "",
    unknown: false,
    done: false,
    result: "",
    review: "",
  }));
}

function renderEventRows(events) {
  els.eventRows.innerHTML = events.map((event) => eventRowTemplate(event)).join("");
}

function eventRowTemplate(event) {
  return `
    <div class="event-row" data-event-id="${event.id}">
      <input data-field="label" value="${escapeAttr(event.label)}" aria-label="일정 이름" />
      <select data-field="type" aria-label="일정 속성">
        <option value="announce" ${event.type === "announce" ? "selected" : ""}>Announce</option>
        <option value="go" ${event.type === "go" ? "selected" : ""}>GO</option>
      </select>
      <input data-field="date" type="date" value="${escapeAttr(event.date || "")}" ${event.unknown ? "disabled" : ""} aria-label="날짜" />
      <label class="unknown-label"><input data-field="unknown" type="checkbox" ${event.unknown ? "checked" : ""} />미정</label>
      <select data-field="result" aria-label="결과">
        <option value="" ${!event.result ? "selected" : ""}>결과/체크 전</option>
        <option value="done" ${event.result === "done" ? "selected" : ""}>다녀옴/완료</option>
        <option value="pass" ${event.result === "pass" ? "selected" : ""}>합격</option>
        <option value="fail" ${event.result === "fail" ? "selected" : ""}>불합격</option>
        <option value="skip" ${event.result === "skip" ? "selected" : ""}>미참석/포기</option>
      </select>
      <button class="ghost-button" type="button" data-remove-event="${event.id}" aria-label="일정 삭제">삭제</button>
      <textarea class="wide" data-field="review" rows="2" placeholder="후기 또는 메모">${escapeHtml(event.review || "")}</textarea>
    </div>
  `;
}

function collectEvents() {
  return [...els.eventRows.querySelectorAll(".event-row")].map((row) => {
    const unknown = row.querySelector('[data-field="unknown"]').checked;
    const result = row.querySelector('[data-field="result"]').value;
    return {
    id: row.dataset.eventId || makeId(),
      label: row.querySelector('[data-field="label"]').value.trim(),
      type: row.querySelector('[data-field="type"]').value,
      date: unknown ? "" : row.querySelector('[data-field="date"]').value,
      unknown,
      done: Boolean(result),
      result,
      review: row.querySelector('[data-field="review"]').value.trim(),
    };
  }).filter((event) => event.label);
}

function handleSubmit(event) {
  event.preventDefault();
  const form = new FormData(els.applyForm);
  const payload = {
    id: state.editingId || makeId(),
    company: form.get("company").trim(),
    role: form.get("role").trim(),
    url: form.get("url").trim(),
    applyUrl: form.get("applyUrl").trim(),
    priority: form.get("priority"),
    notes: form.get("notes").trim(),
    events: collectEvents(),
  };

  if (state.editingId) {
    state.applications = state.applications.map((app) => app.id === state.editingId ? payload : app);
  } else {
    state.applications.unshift(payload);
  }

  saveApplications();
  els.applyDialog.close();
  render();
}

function openDayDialog(dateKey) {
  const events = groupEventsByDate().get(dateKey) || [];
  els.dayDialogTitle.textContent = formatDate(dateKey);
  els.dayDetails.innerHTML = events.length
    ? events.map(({ app, event }) => `
      <article class="day-item">
        <strong>${eventIcon(event.type)} ${escapeHtml(app.company)} · ${escapeHtml(event.label)}</strong>
        <p class="event-meta">${escapeHtml(app.role)} · ${escapeHtml(getAutoStatus(app).label)}</p>
        ${event.review ? `<p class="review-text">${escapeHtml(event.review)}</p>` : ""}
      </article>
    `).join("")
    : `<div class="empty-state">이 날짜에는 일정이 없습니다.</div>`;
  els.dayDialog.showModal();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

els.newApplyButton.addEventListener("click", () => openApplyDialog());
els.applyForm.addEventListener("submit", handleSubmit);
els.closeDialogButton.addEventListener("click", () => els.applyDialog.close());
els.cancelDialogButton.addEventListener("click", () => els.applyDialog.close());
els.closeDayDialogButton.addEventListener("click", () => els.dayDialog.close());

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.view);
  });
});

function setView(view) {
  state.view = view;
  els.navButtons.forEach((item) => {
    const isActive = item.dataset.view === view;
    item.classList.toggle("active", isActive);
    if (item.hasAttribute("aria-selected")) {
      item.setAttribute("aria-selected", String(isActive));
    }
  });
  els.listView.classList.toggle("active", view === "list");
  els.calendarView.classList.toggle("active", view === "calendar");
  els.settingsView.classList.toggle("active", view === "settings");
}

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderList();
});

els.applyList.addEventListener("click", (event) => {
  if (suppressCardOpen) {
    event.preventDefault();
    return;
  }
  if (event.target.closest("[data-stop-open]")) return;
  const id = event.target.closest("[data-open]")?.dataset.open;
  if (!id) return;
  const app = state.applications.find((item) => item.id === id);
  if (app) openApplyDialog(app);
});

let swipeStart = null;
let suppressCardOpen = false;

els.applyList.addEventListener("pointerdown", (event) => {
  const card = event.target.closest("[data-open]");
  if (!card || event.target.closest("[data-stop-open]")) return;
  swipeStart = { id: card.dataset.open, x: event.clientX, y: event.clientY };
});

els.applyList.addEventListener("pointerup", (event) => {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x;
  const dy = Math.abs(event.clientY - swipeStart.y);
  if (dx < -82 && dy < 48 && window.matchMedia("(max-width: 1200px)").matches) {
    suppressCardOpen = true;
    state.applications = state.applications.map((app) => (
      app.id === swipeStart.id ? { ...app, priority: "drop" } : app
    ));
    saveApplications();
    render();
    window.setTimeout(() => {
      suppressCardOpen = false;
    }, 0);
  }
  swipeStart = null;
});

els.applyList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const id = event.target.closest("[data-open]")?.dataset.open;
  if (!id) return;
  event.preventDefault();
  const app = state.applications.find((item) => item.id === id);
  if (app) openApplyDialog(app);
});

els.addEventButton.addEventListener("click", () => {
  els.eventRows.insertAdjacentHTML("beforeend", eventRowTemplate({
    id: makeId(),
    label: "추가 일정",
    type: "announce",
    date: "",
    unknown: false,
    done: false,
    result: "",
    review: "",
  }));
});

els.eventRows.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-event]");
  if (!removeButton) return;
  removeButton.closest(".event-row").remove();
});

els.eventRows.addEventListener("change", (event) => {
  if (event.target.dataset.field !== "unknown") return;
  const row = event.target.closest(".event-row");
  const dateInput = row.querySelector('[data-field="date"]');
  dateInput.disabled = event.target.checked;
  if (event.target.checked) dateInput.value = "";
});

els.deleteApplyButton.addEventListener("click", () => {
  if (!state.editingId) return;
  state.applications = state.applications.filter((app) => app.id !== state.editingId);
  saveApplications();
  els.applyDialog.close();
  render();
});

els.prevMonthButton.addEventListener("click", () => {
  state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
  renderCalendar();
});

els.nextMonthButton.addEventListener("click", () => {
  state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
  renderCalendar();
});

els.calendarGrid.addEventListener("click", (event) => {
  const cell = event.target.closest("[data-date]");
  if (cell) openDayDialog(cell.dataset.date);
});

render();
