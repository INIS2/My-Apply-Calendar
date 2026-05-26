const STORAGE_KEY = "my-apply-calendar.v3";
const LEGACY_STORAGE_KEY = "my-apply-calendar.v1";
const SUPABASE_JS_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const SUPABASE_URL = "https://cygklvuqrsenohnwileg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_JJ_AgZ5MbwhjeBYCaOQkoA_-aFzd0Jl";

let supabaseClient = null;
let supabaseSession = null;
let supabaseProfile = null;

const stagePresets = [
  ["1차", "원서", "제출"],
  ["1차", "서류", "결과발표"],
  ["2차", "필기", "응시"],
  ["3차", "면접", "응시"],
  ["최종", "합격", "결과발표"],
];

const sampleApplies = [
  {
    apply_id: makeId(),
    company_name: "Google Korea",
    title: "Product Designer",
    priority_color: "RED",
    status: "IN_PROGRESS",
    memo: "포트폴리오와 면접 질문 복기 필요",
    notice_url: "https://example.com",
    apply_url: "https://example.com/apply",
    stages: [
      stageSeed("1차", "원서", "제출", "2026-05-24T18:00", "", true, "DONE"),
      stageSeed("최종", "면접", "응시", "2026-05-29T14:00", "", false, ""),
    ],
  },
  {
    apply_id: makeId(),
    company_name: "Toss",
    title: "UX Researcher",
    priority_color: "YELLOW",
    status: "IN_PROGRESS",
    memo: "1차 면접 준비",
    notice_url: "",
    apply_url: "",
    stages: [
      stageSeed("1차", "면접", "응시", "2026-05-26T10:00", "", false, ""),
      stageSeed("1차", "면접", "결과발표", "2026-06-02T18:00", "", false, ""),
    ],
  },
  {
    apply_id: makeId(),
    company_name: "Coupang",
    title: "Data Analyst",
    priority_color: "BLUE",
    status: "PASS",
    memo: "최종 합격",
    notice_url: "",
    apply_url: "",
    stages: [
      stageSeed("1차", "서류", "결과발표", "2026-05-12T18:00", "", true, "PASS"),
      stageSeed("2차", "면접", "응시", "2026-05-19T10:00", "", true, "PASS"),
      stageSeed("최종", "합격", "결과발표", "2026-05-22T18:00", "", true, "PASS"),
    ],
  },
];

const state = {
  applies: loadApplies(),
  view: "dashboard",
  previousView: "dashboard",
  query: "",
  editingId: null,
  draft: null,
  calendarDate: new Date(),
};

const els = {
  screens: document.querySelectorAll(".screen"),
  backButton: document.querySelector("#backButton"),
  navButtons: document.querySelectorAll("[data-view]"),
  monthButtons: document.querySelectorAll("[data-month]"),
  newApplyButton: document.querySelector("#newApplyButton"),
  mobileNewApplyButton: document.querySelector("#mobileNewApplyButton"),
  searchInput: document.querySelector("#searchInput"),
  applyList: document.querySelector("#applyList"),
  summaryTotal: document.querySelector("#summaryTotal"),
  summaryLive: document.querySelector("#summaryLive"),
  summaryDone: document.querySelector("#summaryDone"),
  profileTotal: document.querySelector("#profileTotal"),
  profileLive: document.querySelector("#profileLive"),
  profileDone: document.querySelector("#profileDone"),
  focusTitle: document.querySelector("#focusTitle"),
  focusCopy: document.querySelector("#focusCopy"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarTitleMini: document.querySelector("#calendarTitleMini"),
  calendarSubtitle: document.querySelector("#calendarSubtitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarGridMini: document.querySelector("#calendarGridMini"),
  detailPriorityRail: document.querySelector("#detailPriorityRail"),
  detailCompany: document.querySelector("#detailCompany"),
  detailRole: document.querySelector("#detailRole"),
  detailNotes: document.querySelector("#detailNotes"),
  detailUrl: document.querySelector("#detailUrl"),
  detailApplyUrl: document.querySelector("#detailApplyUrl"),
  priorityOptions: document.querySelector("#priorityOptions"),
  addStageButton: document.querySelector("#addStageButton"),
  stageRows: document.querySelector("#stageRows"),
  saveDetailButton: document.querySelector("#saveDetailButton"),
  cancelDetailButton: document.querySelector("#cancelDetailButton"),
  deleteApplyButton: document.querySelector("#deleteApplyButton"),
  dayDialog: document.querySelector("#dayDialog"),
  dayDialogTitle: document.querySelector("#dayDialogTitle"),
  dayDetails: document.querySelector("#dayDetails"),
  closeDayDialogButton: document.querySelector("#closeDayDialogButton"),
  syncStatus: document.querySelector("#syncStatus"),
  connectionDot: document.querySelector("#connectionDot"),
  connectionLabel: document.querySelector("#connectionLabel"),
  connectionHint: document.querySelector("#connectionHint"),
  authForm: document.querySelector("#authForm"),
  authEmailInput: document.querySelector("#authEmailInput"),
  authPasswordInput: document.querySelector("#authPasswordInput"),
  authPasswordConfirmInput: document.querySelector("#authPasswordConfirmInput"),
  authNicknameInput: document.querySelector("#authNicknameInput"),
  authMessage: document.querySelector("#authMessage"),
  signInButton: document.querySelector("#signInButton"),
  signUpButton: document.querySelector("#signUpButton"),
  signOutButton: document.querySelector("#signOutButton"),
  syncLocalButton: document.querySelector("#syncLocalButton"),
};

function makeId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function stageSeed(nth_type, step_type, state_type, start_at, end_at, is_completed, result) {
  return {
    stage_id: makeId(),
    nth_type,
    step_type,
    state_type,
    memo: "",
    start_at,
    end_at,
    is_unknown_date: false,
    unknown_date_text: "",
    is_completed,
    result,
    sort_order: 0,
  };
}

function loadApplies() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return normalizeApplies(JSON.parse(raw));
    } catch {
      return normalizeApplies(sampleApplies);
    }
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    try {
      return normalizeApplies(JSON.parse(legacy));
    } catch {
      return normalizeApplies(sampleApplies);
    }
  }

  return normalizeApplies(sampleApplies);
}

function normalizeApplies(applies) {
  return applies.map((apply) => {
    const applyId = apply.apply_id || apply.id || makeId();
    const stages = apply.stages || apply.apply_stages || apply.events || [];
    return {
      apply_id: applyId,
      company_name: apply.company_name || apply.company || "",
      title: apply.title || apply.role || "",
      priority_color: normalizePriority(apply.priority_color || apply.priority),
      status: normalizeStatus(apply.status, stages),
      memo: apply.memo || apply.notes || "",
      notice_url: apply.notice_url || apply.url || "",
      apply_url: apply.apply_url || apply.applyUrl || "",
      stages: normalizeStages(stages),
    };
  });
}

function normalizeStages(stages) {
  return stages.map((stage, index) => {
    const startAt = stage.start_at || dateToDateTime(stage.date || stage.event_date);
    const result = normalizeResult(stage.result);
    return {
      stage_id: stage.stage_id || stage.id || makeId(),
      nth_type: stage.nth_type || inferNthType(index),
      step_type: stage.step_type || stage.label || "전형",
      state_type: stage.state_type || inferStateType(stage.type || stage.event_type),
      memo: stage.memo || stage.review || "",
      start_at: stage.is_unknown_date || stage.unknown || stage.is_unknown ? "" : startAt,
      end_at: stage.end_at || "",
      is_unknown_date: Boolean(stage.is_unknown_date ?? stage.unknown ?? stage.is_unknown),
      unknown_date_text: stage.unknown_date_text || "",
      is_completed: Boolean(stage.is_completed ?? stage.done ?? stage.is_done ?? result),
      result,
      sort_order: Number(stage.sort_order || index),
    };
  });
}

function normalizePriority(value) {
  const map = { high: "RED", medium: "YELLOW", low: "BLUE", drop: "GRAY" };
  const priority = map[value] || String(value || "GREEN").toUpperCase();
  return ["RED", "YELLOW", "GREEN", "BLUE", "GRAY"].includes(priority) ? priority : "GREEN";
}

function normalizeStatus(value, stages = []) {
  const status = String(value || "").toUpperCase();
  if (["NOT_STARTED", "IN_PROGRESS", "PASS", "FAIL", "DROP"].includes(status)) return status;
  if (stages.some((stage) => normalizeResult(stage.result) === "FAIL")) return "FAIL";
  if (stages.length && stages.every((stage) => Boolean(stage.is_completed ?? stage.done ?? stage.result))) return "PASS";
  return stages.length ? "IN_PROGRESS" : "NOT_STARTED";
}

function normalizeResult(value) {
  const map = { done: "DONE", pass: "PASS", fail: "FAIL", skip: "SKIP", submitted: "DONE" };
  const result = map[value] || String(value || "").toUpperCase();
  return ["DONE", "PASS", "FAIL", "SKIP"].includes(result) ? result : "";
}

function inferNthType(index) {
  if (index === 0) return "1차";
  if (index === 1) return "2차";
  if (index === 2) return "3차";
  return "최종";
}

function inferStateType(type) {
  return type === "go" ? "응시" : "결과발표";
}

function dateToDateTime(date) {
  return date ? `${date}T09:00` : "";
}

function saveApplies() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.applies));
}

function getAppUrl() {
  return new URL("./", window.location.href).href;
}

function isRemoteReady() {
  return Boolean(supabaseClient && supabaseSession?.user);
}

async function initSupabase() {
  try {
    setConnectionState("pending", "Supabase 확인 중", "프로젝트와 세션을 확인하고 있습니다.");
    const { createClient } = await import(SUPABASE_JS_URL);
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    setAuthMessage("Supabase 연결 준비 완료", "ok");
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    supabaseSession = data.session;
    supabaseClient.auth.onAuthStateChange((event, session) => {
      supabaseSession = session;
      if (event === "INITIAL_SESSION") return;
      setTimeout(() => {
        if (session?.user) {
          ensureProfile().then(loadRemoteApplies).catch(showError);
      } else {
        supabaseProfile = null;
        setConnectionState("pending", "Supabase 연결됨", "로그아웃 상태입니다. 로컬 캐시 데이터가 표시됩니다.");
        render();
      }
      }, 0);
    });
    if (supabaseSession?.user) {
      await ensureProfile();
      await loadRemoteApplies();
    } else {
      setConnectionState("pending", "Supabase 연결됨", "마이페이지에서 로그인하면 DB 데이터를 불러옵니다.");
    }
  } catch (error) {
    supabaseClient = null;
    supabaseSession = null;
    showError(error);
  }
}

function setSyncStatus(message) {
  els.syncStatus.textContent = message;
}

function setConnectionState(stateName, label, hint) {
  els.connectionDot.className = `connection-dot ${stateName}`;
  els.connectionLabel.textContent = label;
  els.connectionHint.textContent = hint;
  els.syncStatus.textContent = label;
}

function setAuthMessage(message, tone = "") {
  els.authMessage.textContent = message;
  els.authMessage.className = `form-message ${tone}`.trim();
}

function validateAuthFields({ confirmPassword = false } = {}) {
  const email = els.authEmailInput.value.trim();
  const password = els.authPasswordInput.value;
  const passwordConfirm = els.authPasswordConfirmInput.value;

  els.authEmailInput.setCustomValidity("");
  els.authPasswordInput.setCustomValidity("");
  els.authPasswordConfirmInput.setCustomValidity("");

  if (!email || !els.authEmailInput.checkValidity()) {
    els.authEmailInput.setCustomValidity("올바른 이메일 주소를 입력하세요.");
    els.authEmailInput.reportValidity();
    setAuthMessage("올바른 이메일 주소를 입력하세요.", "error");
    return false;
  }

  if (password.length < 8) {
    els.authPasswordInput.setCustomValidity("비밀번호는 8자 이상이어야 합니다.");
    els.authPasswordInput.reportValidity();
    setAuthMessage("비밀번호는 8자 이상이어야 합니다.", "error");
    return false;
  }

  if (confirmPassword && password !== passwordConfirm) {
    els.authPasswordConfirmInput.setCustomValidity("비밀번호가 일치하지 않습니다.");
    els.authPasswordConfirmInput.reportValidity();
    setAuthMessage("비밀번호가 일치하지 않습니다.", "error");
    return false;
  }

  return true;
}

function showError(error) {
  console.warn("Handled app error", error);
  const message = error?.message || "연결 중 오류가 발생했습니다";
  if (error?.code === "42501") {
    setConnectionState("error", "DB 권한 설정 필요", "Supabase SQL Editor에서 GRANT 권한 SQL을 실행해야 합니다.");
    setAuthMessage("DB 권한 설정이 필요합니다. GRANT SQL을 실행해 주세요.", "error");
    return;
  }
  setConnectionState("error", "Supabase 오류", message);
  setAuthMessage(message, "error");
}

async function ensureProfile(nickname = "") {
  if (!isRemoteReady()) return;
  const user = supabaseSession.user;
  const payload = {
    user_id: user.id,
    email: user.email,
    nickname: nickname || user.user_metadata?.nickname || user.email?.split("@")[0] || "MAC User",
  };
  const { data, error } = await supabaseClient
    .from("users")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  supabaseProfile = data;
  setConnectionState("remote", "Supabase 동기화", `${supabaseProfile.nickname} 계정으로 연결되었습니다.`);
}

async function loadRemoteApplies() {
  if (!isRemoteReady()) return;
  setConnectionState("pending", "Supabase 동기화 중", "DB에서 지원 데이터를 불러오고 있습니다.");
  const { data: applies, error: appliesError } = await supabaseClient
    .from("applies")
    .select("*")
    .order("created_at", { ascending: false });
  if (appliesError) throw appliesError;

  const applyIds = applies.map((apply) => apply.apply_id);
  let stages = [];
  if (applyIds.length) {
    const { data, error } = await supabaseClient
      .from("apply_stages")
      .select("*")
      .in("apply_id", applyIds)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    stages = data;
  }

  const stagesByApply = new Map();
  stages.forEach((stage) => {
    const list = stagesByApply.get(stage.apply_id) || [];
    list.push(remoteStageToLocal(stage));
    stagesByApply.set(stage.apply_id, list);
  });

  state.applies = normalizeApplies(applies.map((apply) => ({
    ...apply,
    stages: stagesByApply.get(apply.apply_id) || [],
  })));
  saveApplies();
  setConnectionState("remote", "Supabase 동기화됨", `${state.applies.length}개 지원 항목을 DB에서 불러왔습니다.`);
  render();
}

function remoteStageToLocal(stage) {
  return {
    ...stage,
    start_at: toLocalDateTime(stage.start_at),
    end_at: toLocalDateTime(stage.end_at),
  };
}

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toRemoteDateTime(value) {
  return value ? new Date(value).toISOString() : null;
}

function applyToRemote(apply) {
  return {
    apply_id: apply.apply_id,
    user_id: supabaseSession.user.id,
    company_name: apply.company_name,
    title: apply.title,
    priority_color: apply.priority_color,
    status: apply.status,
    memo: apply.memo || null,
    notice_url: apply.notice_url || null,
    apply_url: apply.apply_url || null,
  };
}

function stageToRemote(stage, applyId) {
  return {
    stage_id: stage.stage_id,
    apply_id: applyId,
    user_id: supabaseSession.user.id,
    nth_type: stage.nth_type,
    step_type: stage.step_type,
    state_type: stage.state_type,
    memo: stage.memo || null,
    start_at: stage.is_unknown_date ? null : toRemoteDateTime(stage.start_at),
    end_at: stage.is_unknown_date ? null : toRemoteDateTime(stage.end_at),
    is_unknown_date: stage.is_unknown_date,
    unknown_date_text: stage.unknown_date_text || null,
    is_completed: stage.is_completed,
    result: stage.result || null,
    sort_order: stage.sort_order,
  };
}

async function saveRemoteApply(apply) {
  const { error: applyError } = await supabaseClient
    .from("applies")
    .upsert(applyToRemote(apply), { onConflict: "apply_id" });
  if (applyError) throw applyError;

  const { error: deleteError } = await supabaseClient
    .from("apply_stages")
    .delete()
    .eq("apply_id", apply.apply_id);
  if (deleteError) throw deleteError;

  if (apply.stages.length) {
    const { error: stagesError } = await supabaseClient
      .from("apply_stages")
      .insert(apply.stages.map((stage) => stageToRemote(stage, apply.apply_id)));
    if (stagesError) throw stagesError;
  }
}

async function deleteRemoteApply(applyId) {
  const { error } = await supabaseClient
    .from("applies")
    .delete()
    .eq("apply_id", applyId);
  if (error) throw error;
}

function setView(view) {
  state.previousView = state.view === "detail" ? state.previousView : state.view;
  state.view = view;
  els.screens.forEach((screen) => screen.classList.toggle("active", screen.id === `${view}View`));
  els.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  els.backButton.classList.toggle("visible", view === "detail");
  document.body.dataset.view = view;
  render();
}

function render() {
  renderStats();
  renderFocus();
  renderList();
  renderCalendars();
  if (state.view === "detail") renderDetail();
}

function renderStats() {
  const done = state.applies.filter(isApplyDone).length;
  const live = state.applies.filter((apply) => apply.status !== "DROP" && !isApplyDone(apply)).length;
  [
    [els.summaryTotal, state.applies.length],
    [els.summaryLive, live],
    [els.summaryDone, done],
    [els.profileTotal, state.applies.length],
    [els.profileLive, live],
    [els.profileDone, done],
  ].forEach(([el, value]) => {
    el.textContent = value;
  });
}

function renderFocus() {
  const next = getFlatStages()
    .filter(({ stage }) => isUpcoming(stage.start_at) && !stage.is_completed && !stage.result)
    .sort((a, b) => a.stage.start_at.localeCompare(b.stage.start_at))[0];
  if (!next) {
    els.focusTitle.textContent = "다음 일정 없음";
    els.focusCopy.textContent = "지원 단계를 추가하면 여기에 표시됩니다.";
    return;
  }
  els.focusTitle.textContent = `${next.apply.company_name} · ${stageTitle(next.stage)}`;
  els.focusCopy.textContent = `${formatDateTime(next.stage.start_at)}까지 챙겨야 합니다.`;
}

function renderList() {
  const applies = getFilteredApplies();
  els.applyList.innerHTML = applies.length
    ? applies.map(applyCard).join("")
    : `<div class="empty-state">표시할 지원 항목이 없습니다.</div>`;
}

function applyCard(apply) {
  const next = getNextStage(apply);
  const status = getApplyStatus(apply);
  const completion = getCompletionRatio(apply);
  const dday = next?.start_at ? getDday(next.start_at) : "";
  return `
    <article class="apply-card priority-${priorityClass(apply.priority_color)}" data-open="${escapeAttr(apply.apply_id)}" tabindex="0" role="button" aria-label="${escapeAttr(apply.company_name)} 상세">
      <span class="card-rail" aria-hidden="true"></span>
      <div class="card-body">
        <div class="card-top">
          <div>
            <h2>${escapeHtml(apply.company_name || "회사명 없음")}</h2>
            <p>${escapeHtml(apply.title || "공고명 없음")}${next ? ` · ${escapeHtml(stageTitle(next))}` : ""}</p>
          </div>
          <div class="d-day ${status.tone}">
            <span>${escapeHtml(status.label)}</span>
            ${dday ? `<strong>${escapeHtml(dday)}</strong>` : ""}
          </div>
        </div>
        <div class="progress-track" aria-label="진행률 ${completion}%"><span style="width: ${completion}%"></span></div>
      </div>
    </article>
  `;
}

function renderCalendars() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const title = `${year}년 ${month + 1}월`;
  els.calendarTitle.textContent = `${month + 1}월 일정`;
  els.calendarTitleMini.textContent = title;
  els.calendarSubtitle.textContent = title;
  const cells = calendarCells(year, month);
  els.calendarGrid.innerHTML = cells;
  els.calendarGridMini.innerHTML = cells;
}

function calendarCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - firstDay);
  const byDate = groupStagesByDate();
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(date);
    const stages = byDate.get(dateKey) || [];
    cells.push(`
      <button class="day-cell ${date.getMonth() === month ? "" : "muted"} ${stages.length ? "has-event" : ""}" type="button" data-date="${dateKey}">
        <span>${date.getDate()}</span>
        <div class="day-markers">
          ${stages.slice(0, 3).map(({ stage }) => `<i class="${escapeAttr(stageMarkerClass(stage))}"></i>`).join("")}
        </div>
      </button>
    `);
  }
  return cells.join("");
}

function openDetail(apply = null) {
  state.editingId = apply?.apply_id || null;
  state.draft = structuredClone(apply || createEmptyApply());
  setView("detail");
}

function createEmptyApply() {
  return {
    apply_id: makeId(),
    company_name: "",
    title: "",
    priority_color: "GREEN",
    status: "NOT_STARTED",
    memo: "",
    notice_url: "",
    apply_url: "",
    stages: stagePresets.map(([nth_type, step_type, state_type], index) => ({
      stage_id: makeId(),
      nth_type,
      step_type,
      state_type,
      memo: "",
      start_at: "",
      end_at: "",
      is_unknown_date: false,
      unknown_date_text: "",
      is_completed: false,
      result: "",
      sort_order: index,
    })),
  };
}

function renderDetail() {
  if (!state.draft) return;
  els.detailCompany.value = state.draft.company_name;
  els.detailRole.value = state.draft.title;
  els.detailNotes.value = state.draft.memo;
  els.detailUrl.value = state.draft.notice_url;
  els.detailApplyUrl.value = state.draft.apply_url;
  els.detailPriorityRail.className = `priority-rail priority-${priorityClass(state.draft.priority_color)}`;
  els.priorityOptions.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.priority === priorityClass(state.draft.priority_color));
  });
  els.stageRows.innerHTML = [...state.draft.stages]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(stageRow)
    .join("");
  els.deleteApplyButton.hidden = !state.editingId;
}

function stageRow(stage, index) {
  return `
    <article class="stage-card" data-stage-id="${escapeAttr(stage.stage_id)}">
      <div class="stage-head">
        <span>${escapeHtml(stage.nth_type || `${index + 1}차`)}</span>
        <label class="check-label">
          <input data-stage-field="is_completed" type="checkbox" ${stage.is_completed || stage.result ? "checked" : ""} />
          완료
        </label>
      </div>
      <div class="stage-grid">
        <label>
          <span>차수</span>
          <input data-stage-field="nth_type" value="${escapeAttr(stage.nth_type)}" placeholder="1차" />
        </label>
        <label>
          <span>단계</span>
          <input data-stage-field="step_type" value="${escapeAttr(stage.step_type)}" placeholder="면접" />
        </label>
        <label>
          <span>상태</span>
          <input data-stage-field="state_type" value="${escapeAttr(stage.state_type)}" placeholder="응시" />
        </label>
        <label>
          <span>시작</span>
          <input data-stage-field="start_at" type="datetime-local" value="${escapeAttr(stage.start_at)}" ${stage.is_unknown_date ? "disabled" : ""} />
        </label>
        <label>
          <span>종료</span>
          <input data-stage-field="end_at" type="datetime-local" value="${escapeAttr(stage.end_at)}" ${stage.is_unknown_date ? "disabled" : ""} />
        </label>
        <label class="check-label boxed">
          <input data-stage-field="is_unknown_date" type="checkbox" ${stage.is_unknown_date ? "checked" : ""} />
          미정
        </label>
        <label>
          <span>미정 메모</span>
          <input data-stage-field="unknown_date_text" value="${escapeAttr(stage.unknown_date_text)}" placeholder="하반기 예정" />
        </label>
        <label>
          <span>결과</span>
          <select data-stage-field="result">
            <option value="" ${!stage.result ? "selected" : ""}>대기</option>
            <option value="DONE" ${stage.result === "DONE" ? "selected" : ""}>완료</option>
            <option value="PASS" ${stage.result === "PASS" ? "selected" : ""}>합격</option>
            <option value="FAIL" ${stage.result === "FAIL" ? "selected" : ""}>불합격</option>
            <option value="SKIP" ${stage.result === "SKIP" ? "selected" : ""}>포기</option>
          </select>
        </label>
        <button class="ghost-button remove-stage" data-remove-stage type="button">삭제</button>
      </div>
      <textarea data-stage-field="memo" rows="2" placeholder="단계 메모">${escapeHtml(stage.memo)}</textarea>
    </article>
  `;
}

function syncDraftFromFields() {
  if (!state.draft) return;
  state.draft.company_name = els.detailCompany.value.trim();
  state.draft.title = els.detailRole.value.trim();
  state.draft.memo = els.detailNotes.value.trim();
  state.draft.notice_url = els.detailUrl.value.trim();
  state.draft.apply_url = els.detailApplyUrl.value.trim();
  state.draft.status = deriveStatus(state.draft);
}

function updateDraftStage(row) {
  const stage = state.draft.stages.find((item) => item.stage_id === row.dataset.stageId);
  if (!stage) return;
  const field = (name) => row.querySelector(`[data-stage-field="${name}"]`);
  stage.nth_type = field("nth_type").value.trim();
  stage.step_type = field("step_type").value.trim();
  stage.state_type = field("state_type").value.trim();
  stage.start_at = field("is_unknown_date").checked ? "" : field("start_at").value;
  stage.end_at = field("is_unknown_date").checked ? "" : field("end_at").value;
  stage.is_unknown_date = field("is_unknown_date").checked;
  stage.unknown_date_text = field("unknown_date_text").value.trim();
  stage.result = field("result").value;
  stage.is_completed = field("is_completed").checked || Boolean(stage.result);
  stage.memo = field("memo").value.trim();
  field("start_at").disabled = stage.is_unknown_date;
  field("end_at").disabled = stage.is_unknown_date;
  state.draft.status = deriveStatus(state.draft);
}

async function saveDetail() {
  syncDraftFromFields();
  if (!state.draft.company_name || !state.draft.title) {
    els.detailCompany.reportValidity();
    els.detailRole.reportValidity();
    return;
  }
  state.draft.stages = state.draft.stages
    .filter((stage) => stage.nth_type || stage.step_type || stage.state_type)
    .map((stage, index) => ({ ...stage, sort_order: index }));
  state.draft.status = deriveStatus(state.draft);
  if (state.editingId) {
    state.applies = state.applies.map((apply) => apply.apply_id === state.editingId ? state.draft : apply);
  } else {
    state.applies.unshift(state.draft);
  }
  try {
    if (isRemoteReady()) {
      setSyncStatus("저장 중...");
      await saveRemoteApply(state.draft);
      await loadRemoteApplies();
    } else {
      saveApplies();
    }
    state.draft = null;
    setView("dashboard");
  } catch (error) {
    showError(error);
  }
}

function deriveStatus(apply) {
  if (apply.priority_color === "GRAY") return "DROP";
  if (!apply.stages.length) return "NOT_STARTED";
  if (apply.stages.some((stage) => stage.result === "FAIL")) return "FAIL";
  if (apply.stages.length && apply.stages.every((stage) => stage.is_completed || stage.result)) {
    return apply.stages.some((stage) => stage.result === "PASS") ? "PASS" : "IN_PROGRESS";
  }
  return "IN_PROGRESS";
}

function getFilteredApplies() {
  const query = state.query.trim().toLowerCase();
  if (!query) return state.applies;
  return state.applies.filter((apply) => {
    const haystack = [
      apply.company_name,
      apply.title,
      apply.memo,
      apply.status,
      ...apply.stages.flatMap((stage) => [stage.nth_type, stage.step_type, stage.state_type, stage.memo]),
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function getFlatStages() {
  return state.applies.flatMap((apply) => apply.stages.map((stage) => ({ apply, stage })));
}

function groupStagesByDate() {
  const map = new Map();
  getFlatStages().forEach(({ apply, stage }) => {
    const dateKey = dateTimeToDate(stage.start_at);
    if (!dateKey || stage.is_unknown_date) return;
    const list = map.get(dateKey) || [];
    list.push({ apply, stage });
    map.set(dateKey, list);
  });
  return map;
}

function getNextStage(apply) {
  const today = getToday();
  return apply.stages
    .filter((stage) => stage.start_at && !stage.is_unknown_date && !stage.is_completed && !stage.result)
    .map((stage) => ({ ...stage, dateObject: new Date(stage.start_at) }))
    .sort((a, b) => Math.abs(a.dateObject - today) - Math.abs(b.dateObject - today))[0];
}

function getApplyStatus(apply) {
  if (apply.status === "DROP") return { label: "보류", tone: "muted" };
  if (apply.status === "PASS") return { label: "합격", tone: "done" };
  if (apply.status === "FAIL") return { label: "불합격", tone: "warn" };
  const next = getNextStage(apply);
  if (!next) return { label: "일정 미정", tone: "muted" };
  return { label: stageTitle(next), tone: stageMarkerClass(next) };
}

function isApplyDone(apply) {
  return ["PASS", "FAIL", "DROP"].includes(apply.status)
    || (apply.stages.length > 0 && apply.stages.every((stage) => stage.is_completed || stage.result));
}

function getCompletionRatio(apply) {
  if (!apply.stages.length) return 0;
  return Math.round((apply.stages.filter((stage) => stage.is_completed || stage.result).length / apply.stages.length) * 100);
}

function getDday(dateTime) {
  const diff = Math.ceil((new Date(dateTime) - getToday()) / 86400000);
  if (diff === 0) return "D-Day";
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function isUpcoming(dateTime) {
  if (!dateTime) return false;
  return new Date(dateTime) >= getToday();
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDateTime(dateTime) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(dateTime));
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", weekday: "short" }).format(new Date(`${dateString}T00:00:00`));
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateTimeToDate(dateTime) {
  return dateTime ? dateTime.slice(0, 10) : "";
}

function stageTitle(stage) {
  return [stage.nth_type, stage.step_type, stage.state_type].filter(Boolean).join(" · ");
}

function stageMarkerClass(stage) {
  return ["응시", "제출"].includes(stage.state_type) ? "go" : "announce";
}

function priorityClass(priority) {
  return { RED: "high", YELLOW: "medium", GREEN: "low", BLUE: "low", GRAY: "drop" }[priority] || "low";
}

function priorityFromClass(priority) {
  return { high: "RED", medium: "YELLOW", low: "BLUE", drop: "GRAY" }[priority] || "GREEN";
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

function openDayDialog(dateKey) {
  const stages = groupStagesByDate().get(dateKey) || [];
  els.dayDialogTitle.textContent = formatDate(dateKey);
  els.dayDetails.innerHTML = stages.length
    ? stages.map(({ apply, stage }) => `
      <article class="day-item">
        <strong>${escapeHtml(apply.company_name)} · ${escapeHtml(stageTitle(stage))}</strong>
        <p>${escapeHtml(apply.title)} ${stage.start_at ? `· ${escapeHtml(getDday(stage.start_at))}` : ""}</p>
      </article>
    `).join("")
    : `<div class="empty-state">이 날짜에는 일정이 없습니다.</div>`;
  els.dayDialog.showModal();
}

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

els.newApplyButton.addEventListener("click", () => openDetail());
els.mobileNewApplyButton.addEventListener("click", () => openDetail());
els.backButton.addEventListener("click", () => setView(state.previousView || "dashboard"));
els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderList();
});

els.applyList.addEventListener("click", (event) => {
  const id = event.target.closest("[data-open]")?.dataset.open;
  const apply = state.applies.find((item) => item.apply_id === id);
  if (apply) openDetail(apply);
});

els.applyList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const id = event.target.closest("[data-open]")?.dataset.open;
  const apply = state.applies.find((item) => item.apply_id === id);
  if (!apply) return;
  event.preventDefault();
  openDetail(apply);
});

els.monthButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + (button.dataset.month === "next" ? 1 : -1));
    renderCalendars();
  });
});

[els.calendarGrid, els.calendarGridMini].forEach((grid) => {
  grid.addEventListener("click", (event) => {
    const dateKey = event.target.closest("[data-date]")?.dataset.date;
    if (dateKey) openDayDialog(dateKey);
  });
});

els.priorityOptions.addEventListener("click", (event) => {
  const priority = event.target.closest("[data-priority]")?.dataset.priority;
  if (!priority || !state.draft) return;
  state.draft.priority_color = priorityFromClass(priority);
  state.draft.status = deriveStatus(state.draft);
  renderDetail();
});

els.addStageButton.addEventListener("click", () => {
  syncDraftFromFields();
  state.draft.stages.push({
    stage_id: makeId(),
    nth_type: "커스텀",
    step_type: "새 전형",
    state_type: "알림",
    memo: "",
    start_at: "",
    end_at: "",
    is_unknown_date: false,
    unknown_date_text: "",
    is_completed: false,
    result: "",
    sort_order: state.draft.stages.length,
  });
  renderDetail();
});

els.stageRows.addEventListener("input", (event) => {
  const row = event.target.closest("[data-stage-id]");
  if (row) updateDraftStage(row);
});

els.stageRows.addEventListener("change", (event) => {
  const row = event.target.closest("[data-stage-id]");
  if (row) updateDraftStage(row);
});

els.stageRows.addEventListener("click", (event) => {
  const row = event.target.closest("[data-stage-id]");
  if (!event.target.closest("[data-remove-stage]") || !row) return;
  state.draft.stages = state.draft.stages.filter((item) => item.stage_id !== row.dataset.stageId);
  renderDetail();
});

els.saveDetailButton.addEventListener("click", saveDetail);
els.cancelDetailButton.addEventListener("click", () => setView(state.previousView || "dashboard"));
els.deleteApplyButton.addEventListener("click", () => {
  if (!state.editingId) return;
  const applyId = state.editingId;
  const removeLocal = () => {
    state.applies = state.applies.filter((apply) => apply.apply_id !== applyId);
    saveApplies();
    state.draft = null;
    setView("dashboard");
  };
  if (!isRemoteReady()) {
    removeLocal();
    return;
  }
  setSyncStatus("삭제 중...");
  deleteRemoteApply(applyId)
    .then(loadRemoteApplies)
    .then(() => {
      state.draft = null;
      setView("dashboard");
    })
    .catch(showError);
});
els.closeDayDialogButton.addEventListener("click", () => els.dayDialog.close());

els.authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  els.signInButton.click();
});

els.authPasswordConfirmInput.addEventListener("input", () => {
  els.authPasswordConfirmInput.setCustomValidity("");
  if (els.authPasswordConfirmInput.value && els.authPasswordInput.value !== els.authPasswordConfirmInput.value) {
    setAuthMessage("비밀번호가 아직 일치하지 않습니다.", "error");
  } else {
    setAuthMessage("");
  }
});

els.signInButton.addEventListener("click", async () => {
  if (!validateAuthFields()) return;
  if (!supabaseClient) {
    setAuthMessage("Supabase 연결을 준비 중입니다. 잠시 후 다시 시도하세요.", "error");
    return;
  }
  try {
    setSyncStatus("로그인 중...");
    setAuthMessage("로그인 중...");
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: els.authEmailInput.value.trim(),
      password: els.authPasswordInput.value,
    });
    if (error) throw error;
    await ensureProfile();
    await loadRemoteApplies();
    setAuthMessage("로그인 완료", "ok");
  } catch (error) {
    showError(error);
  }
});

els.signUpButton.addEventListener("click", async () => {
  if (!validateAuthFields({ confirmPassword: true })) return;
  if (!supabaseClient) {
    setAuthMessage("Supabase 연결을 준비 중입니다. 잠시 후 다시 시도하세요.", "error");
    return;
  }
  els.authPasswordConfirmInput.setCustomValidity("");
  try {
    setSyncStatus("가입 중...");
    setAuthMessage("회원가입 요청 중...");
    const nickname = els.authNicknameInput.value.trim();
    const { data, error } = await supabaseClient.auth.signUp({
      email: els.authEmailInput.value.trim(),
      password: els.authPasswordInput.value,
      options: {
        data: { nickname },
        emailRedirectTo: getAppUrl(),
      },
    });
    if (error) throw error;
    supabaseSession = data.session;
    if (data.session?.user) {
      await ensureProfile(nickname);
      await loadRemoteApplies();
      setAuthMessage("회원가입 및 로그인 완료", "ok");
    } else {
      setSyncStatus("가입 확인 메일을 확인하세요");
      setConnectionState("pending", "이메일 확인 필요", "메일의 확인 링크를 누른 뒤 로그인하세요.");
      setAuthMessage("가입 확인 메일을 확인하세요.", "ok");
    }
  } catch (error) {
    showError(error);
  }
});

els.signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  supabaseSession = null;
  supabaseProfile = null;
  setConnectionState("pending", "Supabase 연결됨", "로그아웃 상태입니다. 로컬 캐시 데이터가 표시됩니다.");
  render();
});

els.syncLocalButton.addEventListener("click", async () => {
  if (!isRemoteReady()) {
    setSyncStatus("로그인 후 동기화할 수 있습니다");
    return;
  }
  try {
    setSyncStatus("로컬 데이터 업로드 중...");
    for (const apply of state.applies) {
      await saveRemoteApply(apply);
    }
    await loadRemoteApplies();
  } catch (error) {
    showError(error);
  }
});

setView("dashboard");
initSupabase();
