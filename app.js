function appTodayValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}
const today = appTodayValue();

const defaults = {
  subjects: ["국어", "수학", "영어", "과학", "사회", "정보"],
  publishers: ["미래엔", "천재교육", "비상교육", "동아출판", "지학사", "능률", "YBM", "기타"],
  textbooks: ["기본서", "자습서", "평가문제집", "교과서", "프린트", "기타"],
  scheduleTypes: ["학교", "학원", "수업", "시험", "수행평가", "과제", "개인", "등하교", "기타"],
  quickButtons: ["schedules", "notices", "penalties", "assignments", "exams", "portfolios"]
};

let accounts = [];

const initialStore = {
  settings: {
    siteName: "개인 관리 프로그램",
    logoText: "PM",
    systemNotice: "시스템 공지사항입니다. 홈페이지 관리에서 수정할 수 있습니다.",
    editMode: false,
    labels: {},
    quickButtons: [...defaults.quickButtons],
    subjects: [...defaults.subjects],
    publishers: [...defaults.publishers],
    textbooks: [...defaults.textbooks]
  },
  schedules: [
    { id: 1, title: "수학 수행평가 준비", date: "2026-06-17", start_time: "19:00", end_time: "20:30", type: "수행평가", importance: "매우 높음", status: "예정", memo: "함수 단원 정리" },
    { id: 2, title: "영어 단어 시험", date: "2026-06-20", start_time: "09:00", end_time: "09:30", type: "시험", importance: "높음", status: "예정", memo: "Unit 4-5" }
  ],
  notices: [
    { id: 1, title: "수학 수행평가 안내", source: "학원", subject: "수학", importance: "높음", notice_date: "2026-06-14", content: "함수 활용 보고서 제출", visibility: "일반 공개" },
    { id: 2, title: "시스템 공지사항", source: "시스템", subject: "공통", importance: "보통", notice_date: today, content: "관리자 페이지에서 수정 가능", visibility: "일반 공개" }
  ],
  subjects: [
    { id: 1, name: "국어", teacher: "김국어", textbook: "교과서", publisher: "미래엔", location: "2층 3반", scope: "문학, 독서", memo: "" },
    { id: 2, name: "수학", teacher: "박수학", textbook: "기본서", publisher: "천재교육", location: "학원 A실", scope: "함수", memo: "" },
    { id: 3, name: "영어", teacher: "이영어", textbook: "자습서", publisher: "YBM", location: "영어실", scope: "Unit 4-5", memo: "" }
  ],
  teachers: [
    { id: 1, name: "김국어", subject: "국어", type: "학교", phone: "", email: "", exam_style: "서술형 비중 높음", memo: "" },
    { id: 2, name: "박수학", subject: "수학", type: "학원", phone: "", email: "", exam_style: "유형 반복, 계산 실수 감점", memo: "" },
    { id: 3, name: "이영어", subject: "영어", type: "학교", phone: "", email: "", exam_style: "어휘와 본문 암기", memo: "" }
  ],
  materials: [
    { id: 1, title: "수학 1단원 개념 정리 PDF", subject: "수학", type: "PDF", link: "https://drive.google.com", tags: "개념", visibility: "일반 공개" },
    { id: 2, title: "영어 본문 해석 자료", subject: "영어", type: "PDF", link: "https://drive.google.com", tags: "해석", visibility: "일반 공개" }
  ],
  assignments: [
    { id: 1, title: "과학 실험 보고서", subject: "과학", teacher: "최과학", date: "2026-06-21", place: "학교", importance: "높음", checked: "미확인", file_link: "" }
  ],
  portfolios: [
    { id: 1, title: "방송부 장비 관리 프로젝트", category: "방송/영상", date: "2026-05-20", description: "장비 대여 기록과 점검표 제작", skills: "운영, 문서화", file_link: "https://drive.google.com", image_link: "", video_link: "", result_link: "", reflection: "관리 프로세스를 개선했다.", visibility: "일반 공개" },
    { id: 2, title: "3D 프린터 배기 시스템 설계", category: "3D프린팅", date: "2026-04-18", description: "환기 구조 설계", skills: "3D 모델링, 기계공학", file_link: "https://drive.google.com", image_link: "", video_link: "", result_link: "", reflection: "안전성과 유지보수를 고려했다.", visibility: "일반 공개" }
  ],
  penalties: [
    { id: 1, date: "2026-06-09", title: "준비물 미지참", points: "1", reason: "과학 준비물", status: "확인 완료" }
  ],
  exams: [
    { id: 1, year: "2026", title: "25.9월 중1 국어 정기평가(중1)", subject: "국어", teacher: "김국어", date: "2026-06-09", type: "일반", grade: "중1", examPaperPdf: "", answerPdf: "", omrImage: "", answer_key: "12345", student_answer: "12335", base_score: 100, raw_score: 80, score: 80, average: 72, top30: 88, high_score: 96, question_count: 5, analysis: "문학 문항 보완 필요" }
  ],
  timetable: [
    { id: 1, day: "월", period: "1교시", time: "08:40-09:25", subject: "국어", teacher: "김국어", room: "2층 3반" },
    { id: 2, day: "월", period: "2교시", time: "09:35-10:20", subject: "수학", teacher: "박수학", room: "학원 A실" },
    { id: 3, day: "화", period: "1교시", time: "08:40-09:25", subject: "영어", teacher: "이영어", room: "영어실" }
  ],
  profile: { name: "개인 사용자", phone: "", email: "user@example.com", school: "", memo: "내 정보와 업무일지를 관리합니다." },
  diary: [
    { id: 1, date: today, title: "업무일지", content: "오늘 해야 할 일과 기록을 정리합니다.", mood: "보통" }
  ],
  people: [
    { id: 1, name: "김친구", birthday: "2009-08-12", phone: "010-0000-0000", email: "friend@example.com", address: "서울시", organization: "학교", relationship: "친구", memo: "같은 동아리", private_memo: "관리자 전용 메모" }
  ],
  friendAwards: [
    { id: 1, person: "김친구", date: today, type: "상점", points: "1", reason: "도움 기록", memo: "관리자만 열람" }
  ],
  requests: []
};

const pageMeta = {
  dashboard: ["▦", "메인 대시보드"],
  personal: ["⌂", "내정보 관리"],
  schedules: ["📅", "일정 관리"],
  notices: ["📌", "공지 관리"],
  subjects: ["□", "과목 관리"],
  teachers: ["👤", "선생님 관리"],
  materials: ["↗", "수업 자료"],
  assignments: ["☑", "과제 관리"],
  exams: ["◇", "시험/성적 관리"],
  portfolios: ["★", "포트폴리오"],
  penalties: ["!", "벌점 관리"],
  people: ["◎", "친구/인물 관리"],
  friendAwards: ["⚑", "친구 상벌점"],
  timetable: ["▤", "시간표"],
  print: ["⎙", "프린트"],
  site: ["⚙", "홈페이지 관리"],
  admin: ["⚙", "관리자 설정"],
  requests: ["✉", "수정 요청함"]
};

const permissions = {
  schedules: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] },
  notices: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] },
  subjects: { create: ["admin"], edit: ["admin"], del: ["admin"] },
  teachers: { create: ["admin"], edit: ["admin"], del: ["admin"] },
  materials: { create: ["admin"], edit: ["admin"], del: ["admin"] },
  assignments: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] },
  exams: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] },
  portfolios: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] },
  penalties: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] },
  people: { create: ["admin"], edit: ["admin"], del: ["admin"] },
  friendAwards: { create: ["admin"], edit: ["admin"], del: ["admin"] },
  timetable: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] },
  requests: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] }
};

let store = emptyWorkspaceStoreV36("signed-out");
let currentUser = null;
let currentPage = "dashboard";
let editing = null;
let pendingPasswordAction = null;
let authWorkspaceStateV36 = { loading: false, error: "", currentWorkspaceId: "", currentRole: "" };
let workspaceDataRenderTimerV45 = null;
let workspaceMembersUnsubscribeV49 = null;
let workspaceMembersIdV49 = "";
let workspaceMembersRenderTimerV49 = null;
let currentUserUnsubscribeV50 = null;
let currentUserDocUidV50 = "";
let currentUserSystemOwnerCacheV61 = {};

function loadStore() {
  try {
    const saved = window.PMDataService?.loadStore
      ? window.PMDataService.loadStore()
      : null;
    if (!saved) return structuredClone(initialStore);
    return mergeStore(saved);
  } catch {
    return structuredClone(initialStore);
  }
}

function mergeStore(saved) {
  const merged = {
    ...structuredClone(initialStore),
    ...saved,
    settings: { ...structuredClone(initialStore.settings), ...(saved.settings || {}) }
  };
  ["people", "friendAwards", "diary"].forEach((key) => {
    if (!Array.isArray(merged[key])) merged[key] = structuredClone(initialStore[key]);
  });
  if (!merged.profile) merged.profile = structuredClone(initialStore.profile);
  return merged;
}

function emptyWorkspaceStoreV36(workspaceId) {
  const empty = structuredClone(initialStore);
  Object.keys(empty).forEach((key) => {
    if (Array.isArray(empty[key])) empty[key] = [];
  });
  empty.workspace_id = workspaceId || window.PMDataService?.currentWorkspaceId?.() || "personal-local";
  empty.schema_version = 1;
  empty.created_at = new Date().toISOString();
  empty.updated_at = new Date().toISOString();
  empty.settings = {
    ...structuredClone(initialStore.settings),
    labels: {},
    quickButtons: [...defaults.quickButtons],
    subjects: [...defaults.subjects],
    publishers: [...defaults.publishers],
    textbooks: [...defaults.textbooks]
  };
  empty.profile = { name: "", phone: "", email: "", school: "", memo: "" };
  return empty;
}

function workspaceIdForUserV36(user) {
  return user?.workspace_id || user?.workspaceId || (user?.uid ? `ws_${user.uid}` : user?.id ? `ws_${user.id}` : "personal-local");
}

function loadWorkspaceStoreV36(workspaceId) {
  const saved = window.PMDataService?.loadStore?.(workspaceId);
  if (!saved) return emptyWorkspaceStoreV36(workspaceId);
  return mergeStore({ ...saved, workspace_id: workspaceId });
}

function activateWorkspaceForUserV36(user) {
  const workspaceId = window.PMDataService?.setWorkspaceId?.(workspaceIdForUserV36(user)) || workspaceIdForUserV36(user);
  if (user) user.workspace_id = workspaceId;
  window.PMWorkspaceService?.ensurePersonalWorkspace?.(authStateV31, user || currentUser);
  authWorkspaceStateV36 = { loading: false, error: "", currentWorkspaceId: workspaceId, currentRole: user?.role || "" };
  store = loadWorkspaceStoreV36(workspaceId);
  store.workspace_id = workspaceId;
  saveStore({ skipRemote: true });
  startWorkspaceDataSyncV45(workspaceId);
  applySettings();
  editing = null;
  pendingPasswordAction = null;
  if (content) content.replaceChildren();
  return workspaceId;
}

function startWorkspaceDataSyncV45(workspaceId) {
  if (!isFirebaseBackedSessionV45()) {
    window.PMWorkspaceDataService?.stop?.();
    stopCurrentUserRealtimeV50();
    console.info(`[PM workspace sync] skipped local account workspaceId=${workspaceId || ""}`);
    return;
  }
  if (!workspaceId || !window.PMWorkspaceDataService?.start) return;
  startCurrentUserRealtimeV50();
  startWorkspaceMembersRealtimeV49(workspaceId);
  window.PMWorkspaceDataService.start({
    workspaceId,
    uid: currentUser?.uid || currentUser?.id || "",
    role: currentUser?.role || "",
    store,
    onRemoteChange() {
      if (!store || store.workspace_id !== workspaceId) return;
      saveStore({ skipRemote: true });
      applySettings();
      clearTimeout(workspaceDataRenderTimerV45);
      workspaceDataRenderTimerV45 = setTimeout(() => {
        if (!currentUser || app?.classList.contains("hidden")) return;
        try {
          buildNav();
          renderPage(currentPage || "dashboard");
        } catch (error) {
          console.warn("[PM workspace sync] render after remote update failed", error);
        }
      }, 150);
    }
  });
}

function isFirebaseBackedSessionV45() {
  if (currentUser?.provider !== "firebase") return false;
  const uid = currentUser?.uid || currentUser?.id || "";
  if (!uid) return false;
  try {
    const firebaseUid = window.firebase?.auth?.().currentUser?.uid || "";
    return !!window.firebase?.apps?.length && !!firebaseUid && firebaseUid === uid;
  } catch {
    return false;
  }
}

function resetCurrentWorkspaceDataV36() {
  const workspaceId = currentUser?.workspace_id || store.workspace_id || window.PMDataService?.currentWorkspaceId?.() || "personal-local";
  window.PMDataService?.clearWorkspaceCache?.(workspaceId);
  store = emptyWorkspaceStoreV36(workspaceId);
  saveStore();
  applySettings();
  buildNav();
  renderPage("dashboard");
  showMessage("데이터 초기화 완료", "현재 로그인한 계정의 workspace 데이터만 빈 상태로 초기화했습니다.");
}

function clearSessionStateV36() {
  window.PMWorkspaceDataService?.stop?.();
  stopWorkspaceMembersRealtimeV49();
  stopCurrentUserRealtimeV50();
  currentUser = null;
  authWorkspaceStateV36 = { loading: false, error: "", currentWorkspaceId: "", currentRole: "" };
  currentPage = "dashboard";
  editing = null;
  pendingPasswordAction = null;
  store = emptyWorkspaceStoreV36("signed-out");
  if (content) content.replaceChildren();
}

function saveStore(options = {}) {
  const canSyncRemote = isFirebaseBackedSessionV45();
  if (window.PMDataService?.saveStore) {
    store = window.PMDataService.saveStore(store);
    if (canSyncRemote && !options.skipRemote && currentUser && store?.workspace_id && store.workspace_id !== "signed-out" && !window.PMWorkspaceDataService?.isApplyingRemote?.()) {
      window.PMWorkspaceDataService?.scheduleSave?.(store?.workspace_id, store);
    }
    return;
  }
  const workspaceId = store?.workspace_id || "personal-local";
  localStorage.setItem(`app:${workspaceId}:store`, JSON.stringify(store));
  if (canSyncRemote && !options.skipRemote && currentUser && workspaceId !== "signed-out" && !window.PMWorkspaceDataService?.isApplyingRemote?.()) {
    window.PMWorkspaceDataService?.scheduleSave?.(workspaceId, store);
  }
}

function subjectsList() {
  return [...new Set([...(store.settings.subjects || []), ...store.subjects.map((s) => s.name)].filter(Boolean))];
}

function teachersList() {
  return [...new Set(store.teachers.map((t) => t.name).filter(Boolean))];
}

function peopleNames() {
  return [...new Set((store.people || []).map((person) => person.name).filter(Boolean))];
}

function publishersList() {
  return [...new Set([...(store.settings.publishers || []), ...store.subjects.map((s) => s.publisher)].filter(Boolean))];
}

function textbooksList() {
  return [...new Set([...(store.settings.textbooks || []), ...store.subjects.map((s) => s.textbook)].filter(Boolean))];
}

function pageLabel(key) {
  return store.settings.labels?.[key] || pageMeta[key]?.[1] || key;
}

function can(action, key) {
  if (!currentUser || currentUser.role === "print") return false;
  return (permissions[key]?.[action] || []).includes(currentUser.role);
}

function isAdmin() {
  return currentUser?.role === "admin";
}

function roleName(role) {
  return { admin: "관리자", user: "일반 사용자", print: "프린트 전용" }[role] || role;
}

function init() {
  applySettings();
  loginForm.addEventListener("submit", onLogin);
  logoutBtn.addEventListener("click", logout);
  menuToggle.addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
  globalSearch.addEventListener("input", () => renderPage(currentPage));
  document.querySelectorAll("[data-demo]").forEach((btn) => btn.addEventListener("click", () => {
    const account = accounts.find((item) => item.role === btn.dataset.demo);
    email.value = account.email;
    password.value = account.password;
  }));
  editorForm.addEventListener("submit", saveEditor);
  cancelEditor.addEventListener("click", closeEditor);
  document.getElementById("closeEditor").addEventListener("click", closeEditor);
  passwordForm.addEventListener("submit", confirmPassword);
  cancelPassword.addEventListener("click", () => { pendingPasswordAction = null; passwordDialog.close(); });
  restoreSession();
}

function applySettings() {
  document.title = store.settings.siteName;
  loginTitle.textContent = store.settings.siteName;
  brandName.textContent = store.settings.siteName;
  brandMark.textContent = store.settings.logoText || "PM";
}

function onLogin(event) {
  event.preventDefault();
  const account = accounts.find((item) => item.email === email.value.trim() && item.password === password.value);
  if (!account) {
    loginError.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
    return;
  }
  currentUser = account;
  activateWorkspaceForUserV36(account);
  sessionStorage.setItem("pm-current-user", account.email);
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  roleLabel.textContent = `${account.name} · ${roleName(account.role)}`;
  buildNav();
  renderPage(account.role === "print" ? "print" : "dashboard");
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem("pm-current-user");
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
}

function restoreSession() {
  const savedEmail = sessionStorage.getItem("pm-current-user");
  if (!savedEmail) return;
  const account = accounts.find((item) => item.email === savedEmail);
  if (!account) return;
  currentUser = account;
  activateWorkspaceForUserV36(account);
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  roleLabel.textContent = `${account.name} · ${roleName(account.role)}`;
  buildNav();
  renderPage(account.role === "print" ? "print" : "dashboard");
}

function navKeys() {
  if (currentUser?.role === "print") return ["print"];
  const keys = ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "timetable", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "site", "admin", "print");
  return keys;
}

function buildNav() {
  nav.innerHTML = navKeys().map((key) => {
    const [icon] = pageMeta[key];
    const edit = store.settings.editMode && isAdmin() ? `<input class="nav-edit-input" data-label-key="${key}" value="${escapeHtml(pageLabel(key))}" />` : pageLabel(key);
    return `<button class="nav-btn" data-page="${key}"><span class="nav-icon">${icon}</span><span>${edit}</span></button>`;
  }).join("");
  nav.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", (event) => {
    if (event.target.matches(".nav-edit-input")) return;
    renderPage(btn.dataset.page);
  }));
  nav.querySelectorAll(".nav-edit-input").forEach((input) => input.addEventListener("change", () => {
    store.settings.labels[input.dataset.labelKey] = input.value;
    saveStore();
    buildNav();
  }));
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin"].includes(key) && !isAdmin()) {
    key = "dashboard";
  }
  currentPage = key;
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  if (key === "dashboard") return renderDashboard();
  if (key === "personal") return renderPersonal();
  if (key === "exams") return renderExams();
  if (key === "timetable") return renderTimetableV2();
  if (key === "print") return renderPrint();
  if (key === "site") return renderSiteV2();
  if (key === "admin") return renderAdmin();
  renderCollection(key);
}

function renderDashboard() {
  const blocks = [
    ["schedules", "오늘 일정", store.schedules.filter((x) => x.date === today).map((x) => `${x.title} ${x.start_time || ""}`)],
    ["schedules", "전체 일정", store.schedules.map((x) => `${x.date} · ${x.title}`)],
    ["notices", "공지", store.notices.map((x) => `${x.title} · ${x.source}`)],
    ["materials", "자료", store.materials.map((x) => `${x.title} · ${x.subject}`)],
    ["assignments", "과제", store.assignments.map((x) => `${x.date} · ${x.title}`)],
    ["exams", "시험", store.exams.map((x) => `${x.date} · ${x.title}`)],
    ["portfolios", "포트폴리오", store.portfolios.map((x) => `${x.title} · ${x.category}`)],
    ["penalties", "벌점", store.penalties.map((x) => `${x.title} · ${x.points}점`)]
  ];
  content.innerHTML = `
    <div class="system-notice"><strong>시스템 공지</strong><span>${escapeHtml(store.settings.systemNotice)}</span></div>
    <section class="panel">
      <div class="panel-head"><h3>빠른 등록</h3><span class="muted">홈페이지 관리에서 버튼을 바꿀 수 있습니다.</span></div>
      <div class="quick-actions">${store.settings.quickButtons.map((key) => `<button data-quick="${key}" ${!can("create", key) ? "disabled" : ""}>${pageLabel(key)} 추가</button>`).join("")}</div>
    </section>
    <div class="dashboard-grid">
      ${blocks.map(([key, title, items]) => dashboardBox(key, title, items)).join("")}
    </div>
  `;
  content.querySelectorAll("[data-go]").forEach((btn) => btn.addEventListener("click", () => renderPage(btn.dataset.go)));
  content.querySelectorAll("[data-quick]").forEach((btn) => btn.addEventListener("click", () => openEditor(btn.dataset.quick, null, "dashboard")));
}

function dashboardBox(key, title, items) {
  return `<section class="panel dash-box">
    <div class="panel-head"><h3>${title}</h3><button class="ghost small" data-go="${key}">더보기</button></div>
    <div class="scroll-list">${items.length ? items.map((item) => `<div>${escapeHtml(item)}</div>`).join("") : `<div class="empty">항목 없음</div>`}</div>
  </section>`;
}

function renderPersonal() {
  const profile = store.profile || (store.profile = {});
  content.innerHTML = `
    <section class="panel">
      <div class="panel-head"><h3>내정보 관리</h3><button id="saveProfile" type="button">저장</button></div>
      <div class="form-grid">
        <label>이름<input id="profileName" value="${escapeHtml(profile.name || currentUser.name || "")}" /></label>
        <label>연락처<input id="profilePhone" value="${escapeHtml(profile.phone || "")}" /></label>
        <label>이메일<input id="profileEmail" value="${escapeHtml(profile.email || currentUser.email || "")}" /></label>
        <label>학교/소속<input id="profileSchool" value="${escapeHtml(profile.school || "")}" /></label>
        <label class="wide">메모<textarea id="profileMemo">${escapeHtml(profile.memo || "")}</textarea></label>
        <label class="wide">현재 비밀번호<input id="profilePassword" type="password" placeholder="내정보 저장 전 비밀번호 확인" /></label>
      </div>
      <p id="profileError" class="error"></p>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>업무일지</h3><button id="addDiary" type="button">일지 추가</button></div>
      <div class="cards">${(store.diary || []).map((row) => `<article class="card"><h3>${escapeHtml(row.title)}</h3><span>${escapeHtml(row.date)} · ${escapeHtml(row.mood)}</span><p>${escapeHtml(row.content)}</p></article>`).join("") || `<div class="empty">업무일지가 없습니다.</div>`}</div>
    </section>
  `;
  document.getElementById("saveProfile").addEventListener("click", saveProfile);
  document.getElementById("addDiary").addEventListener("click", () => {
    store.diary = store.diary || [];
    store.diary.unshift({ id: Date.now(), date: today, title: "새 업무일지", content: "오늘 한 일과 다음 할 일을 적어보세요.", mood: "보통" });
    saveStore();
    renderPersonal();
  });
}

function saveProfile() {
  const error = document.getElementById("profileError");
  if (document.getElementById("profilePassword").value !== currentUser.password) {
    error.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  store.profile = {
    name: document.getElementById("profileName").value,
    phone: document.getElementById("profilePhone").value,
    email: document.getElementById("profileEmail").value,
    school: document.getElementById("profileSchool").value,
    memo: document.getElementById("profileMemo").value
  };
  currentUser.name = store.profile.name || currentUser.name;
  saveStore();
  roleLabel.textContent = `${currentUser.name} · ${roleName(currentUser.role)}`;
  error.textContent = "";
  showMessage("저장 완료", "내정보가 저장되었습니다.");
}

const columns = {
  schedules: ["title", "date", "start_time", "end_time", "type", "importance", "status"],
  notices: ["title", "source", "subject", "importance", "notice_date", "visibility"],
  subjects: ["name", "teacher", "textbook", "publisher", "location", "scope"],
  teachers: ["name", "subject", "type", "exam_style", "phone", "email"],
  materials: ["title", "subject", "type", "link", "tags", "visibility"],
  assignments: ["title", "subject", "teacher", "date", "place", "importance", "checked"],
  portfolios: ["title", "category", "date", "description", "skills", "file_link", "video_link", "visibility"],
  penalties: ["date", "title", "points", "reason", "status"],
  people: ["name", "birthday", "phone", "email", "address", "relationship", "memo"],
  friendAwards: ["person", "date", "type", "points", "reason", "memo"],
  requests: ["target", "requester", "content", "status"]
};

const labels = {
  title: "제목", date: "날짜", start_time: "시작", end_time: "종료", type: "유형", importance: "중요도", status: "상태",
  source: "출처", subject: "과목", notice_date: "공지일", visibility: "공개", name: "이름", teacher: "선생님",
  textbook: "교과서", publisher: "출판사", location: "장소", scope: "범위", exam_style: "출제유형",
  phone: "연락처", email: "이메일", link: "링크", tags: "태그", place: "구분", checked: "확인",
  category: "카테고리", description: "설명", skills: "기술/역량", file_link: "파일 링크", image_link: "이미지 링크",
  video_link: "영상 링크", result_link: "결과물 링크", reflection: "느낀 점", points: "점수", reason: "사유",
  birthday: "생일", address: "주소", relationship: "관계", private_memo: "비공개 메모", person: "친구/인물",
  target: "대상", requester: "요청자", content: "내용"
};

function renderCollection(key) {
  const rows = filteredRows(key);
  content.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <h3>${pageLabel(key)}</h3>
        <div class="row-actions">
          ${selectExportButton(key)}
          <button id="addBtn" ${!can("create", key) ? "disabled" : ""}>새 항목</button>
        </div>
      </div>
      ${filterBar(key)}
      ${selectToolbar(key)}
      ${collectionTable(key, rows)}
    </section>
  `;
  addBtn.addEventListener("click", () => openEditor(key, null, key));
  content.querySelectorAll("[data-filter]").forEach((input) => input.addEventListener("input", () => renderCollection(key)));
  content.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => openEditor(key, Number(btn.dataset.edit), key)));
  content.querySelectorAll("[data-delete]").forEach((btn) => btn.addEventListener("click", () => requirePassword(() => deleteRow(key, Number(btn.dataset.delete)))));
  content.querySelectorAll("[data-request]").forEach((btn) => btn.addEventListener("click", () => requestEdit(key, Number(btn.dataset.request))));
  const selectAll = document.getElementById("selectAllRows");
  if (selectAll) selectAll.addEventListener("change", () => content.querySelectorAll("[data-row-id]").forEach((box) => { box.checked = selectAll.checked; }));
  const exportBtn = document.getElementById("exportSelected");
  if (exportBtn) exportBtn.addEventListener("click", () => exportSelected(key));
}

function filterBar(key) {
  const fields = columns[key] || [];
  return `<div class="toolbar">${fields.slice(0, 6).map((field) => {
    const values = [...new Set((store[key] || []).map((row) => row[field]).filter(Boolean))];
    if (values.length && values.length < 12) {
      return `<label class="inline-filter">${labels[field] || field}<select data-filter="${field}"><option value="">전체</option>${values.map((value) => `<option>${escapeHtml(value)}</option>`).join("")}</select></label>`;
    }
    return `<label class="inline-filter">${labels[field] || field}<input data-filter="${field}" placeholder="검색" /></label>`;
  }).join("")}</div>`;
}

function filteredRows(key) {
  const query = globalSearch.value.trim().toLowerCase();
  const filterInputs = [...document.querySelectorAll("[data-filter]")].map((el) => [el.dataset.filter, el.value]);
  return (store[key] || []).filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query)) return false;
    return filterInputs.every(([field, value]) => !value || String(row[field] || "").includes(value));
  });
}

function selectToolbar(key) {
  return `<div class="select-toolbar"><label><input id="selectAllRows" type="checkbox" /> 전체 선택</label><button id="exportSelected" class="ghost">선택 다운로드</button></div>`;
}

function selectExportButton() {
  return "";
}

function collectionTable(key, rows) {
  if (!rows.length) return `<div class="empty">항목이 없습니다.</div>`;
  const cols = columns[key] || Object.keys(rows[0]).filter((x) => x !== "id");
  return `<div class="table-wrap"><table><thead><tr><th>선택</th>${cols.map((col) => `<th>${labels[col] || col}</th>`).join("")}<th>관리</th></tr></thead><tbody>
    ${rows.map((row) => `<tr><td><input type="checkbox" data-row-id="${row.id}" /></td>${cols.map((col) => `<td>${escapeHtml(row[col] || "")}</td>`).join("")}<td>${rowActions(key, row)}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function rowActions(key, row) {
  const edit = can("edit", key) ? `<button class="ghost" data-edit="${row.id}">수정</button>` : `<button class="ghost" data-request="${row.id}">수정 요청</button>`;
  const del = can("del", key) ? `<button class="danger" data-delete="${row.id}">삭제</button>` : "";
  return `<span class="row-actions">${edit}${del}</span>`;
}

function fieldsFor(key) {
  const common = {
    schedules: [["title", "제목", "text", true], ["date", "날짜", "date"], ["start_time", "시작", "time"], ["end_time", "종료", "time"], ["type", "유형", "select", defaults.scheduleTypes], ["importance", "중요도", "select", ["낮음", "보통", "높음", "매우 높음"]], ["status", "상태", "select", ["예정", "진행 중", "완료", "취소"]], ["memo", "메모", "textarea"]],
    notices: [["title", "제목", "text", true], ["source", "출처", "select", ["카카오톡", "학교", "학원", "선생님", "시스템", "기타"]], ["subject", "과목", "select", ["공통", ...subjectsList()]], ["importance", "중요도", "select", ["낮음", "보통", "높음", "매우 높음"]], ["notice_date", "날짜", "date"], ["content", "내용", "textarea"], ["visibility", "공개", "select", ["일반 공개", "관리자 전용"]]],
    subjects: [["name", "과목명", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["textbook", "교과서", "select", textbooksList()], ["publisher", "출판사", "select", publishersList()], ["location", "장소", "text"], ["scope", "범위", "textarea"], ["memo", "메모", "textarea"]],
    teachers: [["name", "이름", "text", true], ["subject", "과목", "select", subjectsList()], ["type", "학교/학원", "select", ["학교", "학원", "기타"]], ["exam_style", "시험 출제유형", "textarea"], ["phone", "연락처", "text"], ["email", "이메일", "email"], ["memo", "메모", "textarea"]],
    materials: [["title", "자료명", "text", true], ["subject", "과목", "select", subjectsList()], ["type", "자료유형", "select", ["PDF", "이미지", "문서", "PPT", "영상", "링크"]], ["link", "링크", "url"], ["tags", "태그", "text"], ["visibility", "공개", "select", ["일반 공개", "관리자 전용", "비공개"]]],
    assignments: [["title", "과제명", "text", true], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["date", "마감일", "date"], ["place", "구분", "select", ["학교", "학원", "기타"]], ["importance", "중요도", "select", ["낮음", "보통", "높음", "매우 높음"]], ["checked", "확인", "select", ["미확인", "확인"]], ["file_link", "파일 링크", "url"]],
    portfolios: [["title", "제목", "text", true], ["category", "카테고리", "select", ["학교 활동", "프로젝트", "발표", "수행평가", "코딩", "기계공학", "컴퓨터공학", "방송/영상", "3D프린팅", "기타"]], ["date", "날짜", "date"], ["description", "설명", "textarea"], ["skills", "사용 기술/역량", "text"], ["file_link", "관련 파일 링크", "url"], ["image_link", "이미지 링크", "url"], ["video_link", "영상 링크", "url"], ["result_link", "결과물 링크", "url"], ["reflection", "느낀 점", "textarea"], ["visibility", "공개", "select", ["일반 공개", "관리자 전용", "비공개"]]],
    penalties: [["date", "날짜", "date"], ["title", "벌점 항목", "text", true], ["points", "벌점 점수", "select", ["1", "2", "3", "4", "5", "10"]], ["reason", "사유", "text"], ["status", "상태", "select", ["등록됨", "확인 완료", "이의제기", "해결됨"]]],
    people: [["name", "이름", "text", true], ["birthday", "생일", "date"], ["phone", "연락처", "text"], ["email", "이메일", "email"], ["address", "주소", "text"], ["organization", "학교/반/소속", "text"], ["relationship", "관계", "select", ["친구", "선생님", "가족", "기타"]], ["memo", "메모", "textarea"], ["private_memo", "비공개 메모", "textarea"]],
    friendAwards: [["person", "친구/인물", "select", peopleNames()], ["date", "날짜", "date"], ["type", "유형", "select", ["상점", "벌점", "칭찬", "주의", "기타"]], ["points", "점수", "select", ["1", "2", "3", "4", "5", "10"]], ["reason", "사유", "textarea"], ["memo", "관리자 메모", "textarea"]],
    requests: [["target", "대상", "text", true], ["requester", "요청자", "text"], ["content", "내용", "textarea", true], ["status", "상태", "select", ["접수", "검토 중", "반영", "반려"]]]
  };
  return common[key] || [];
}

function openEditor(key, id = null, origin = key) {
  if (id && !can("edit", key)) return requestEdit(key, id);
  if (!id && !can("create", key)) return;
  const row = id ? store[key].find((item) => item.id === id) : {};
  editing = { key, id, origin };
  dialogTitle.textContent = id ? `${pageLabel(key)} 수정` : `${pageLabel(key)} 추가`;
  editorFields.innerHTML = fieldsFor(key).map(([name, label, type, requiredOrOptions]) => inputHtml(name, label, type, requiredOrOptions, row[name])).join("");
  if (id) {
    editorFields.insertAdjacentHTML("beforeend", `<label class="wide">현재 비밀번호<input name="_confirm_password" type="password" required placeholder="수정 저장 전 비밀번호 확인" /></label>`);
  }
  editorError.textContent = "";
  editorDialog.showModal();
}

function inputHtml(name, label, type, requiredOrOptions, value = "") {
  const isRequired = requiredOrOptions === true;
  const options = Array.isArray(requiredOrOptions) ? requiredOrOptions : null;
  const wide = type === "textarea" || name.includes("link") ? "wide" : "";
  if (options) return `<label class="${wide}">${label}<select name="${name}" ${isRequired ? "required" : ""}>${options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  if (type === "textarea") return `<label class="${wide}">${label}<textarea name="${name}" ${isRequired ? "required" : ""}>${escapeHtml(value)}</textarea></label>`;
  return `<label class="${wide}">${label}<input name="${name}" type="${type}" value="${escapeHtml(value || defaultValue(name, type))}" ${isRequired ? "required" : ""} /></label>`;
}

function defaultValue(name, type) {
  if (name.includes("date")) return today;
  if (type === "number") return "0";
  return "";
}

function closeEditor() {
  editing = null;
  editorDialog.close();
}

function saveEditor(event) {
  event.preventDefault();
  if (!editing) return;
  const payload = Object.fromEntries(new FormData(editorForm).entries());
  if (editing.id && payload._confirm_password !== currentUser.password) {
    editorError.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  delete payload._confirm_password;
  const origin = editing.origin;
  const rows = store[editing.key];
  if (editing.id) {
    const index = rows.findIndex((row) => row.id === editing.id);
    rows[index] = { ...rows[index], ...payload };
  } else {
    rows.unshift({ id: Date.now(), ...payload, created_by: currentUser.email });
  }
  saveStore();
  closeEditor();
  renderPage(origin || currentPage);
}

function markWorkspaceDeleted(key, id) {
  window.PMWorkspaceDataService?.markDeleted?.(key, id);
}

function markWorkspaceDeletedRows(key, rows) {
  (rows || []).forEach((row) => markWorkspaceDeleted(key, row?.id ?? row));
}

function deleteRow(key, id) {
  markWorkspaceDeleted(key, id);
  store[key] = store[key].filter((row) => row.id !== id);
  saveStore();
  renderPage(key);
}

function requestEdit(key, id) {
  const row = store[key].find((item) => item.id === id);
  store.requests.unshift({ id: Date.now(), target: `${pageLabel(key)}: ${row?.title || row?.name || id}`, requester: currentUser.email, content: "수정 요청이 있습니다.", status: "접수" });
  saveStore();
  showMessage("수정 요청", "관리자에게 수정 요청을 보냈습니다.");
}

function requirePassword(action) {
  pendingPasswordAction = action;
  confirmPasswordInput.value = "";
  passwordError.textContent = "";
  passwordDialog.showModal();
}

function confirmPassword(event) {
  event.preventDefault();
  if (confirmPasswordInput.value !== currentUser.password) {
    passwordError.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  passwordDialog.close();
  const action = pendingPasswordAction;
  pendingPasswordAction = null;
  action?.();
}

function renderTimetable() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const periods = ["1교시", "2교시", "3교시", "4교시", "5교시", "6교시", "7교시", "8교시"];
  const times = ["08:40-09:25", "09:35-10:20", "10:30-11:15", "11:25-12:10", "13:10-13:55", "14:05-14:50", "15:00-15:45", "15:55-16:40"];
  content.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <h3>일~토 시간표</h3>
        <div class="row-actions"><button id="addTime">수동 생성</button><button id="deleteTime" class="danger">선택 삭제</button></div>
      </div>
      <div class="timetable-grid">
        <div class="tt-head">교시/시간</div>${days.map((day) => `<div class="tt-head">${day}</div>`).join("")}
        ${periods.map((period, i) => `<div class="tt-time"><strong>${period}</strong><span>${times[i]}</span></div>${days.map((day) => timeCell(day, period, times[i])).join("")}`).join("")}
      </div>
    </section>
  `;
  content.querySelectorAll("[data-time-edit]").forEach((cell) => cell.addEventListener("click", () => editTimeCell(cell.dataset.day, cell.dataset.period, cell.dataset.time)));
  addTime.addEventListener("click", () => editTimeCell("월", "1교시", "08:40-09:25"));
  deleteTime.addEventListener("click", () => requirePassword(() => {
    const ids = [...content.querySelectorAll("[data-time-check]:checked")].map((x) => Number(x.dataset.timeCheck));
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((row) => ids.includes(row.id)));
    store.timetable = store.timetable.filter((row) => !ids.includes(row.id));
    saveStore();
    renderTimetable();
  }));
}

function timeCell(day, period, time) {
  const row = store.timetable.find((item) => item.day === day && item.period === period);
  if (!row) return `<div class="tt-cell empty-cell" data-time-edit data-day="${day}" data-period="${period}" data-time="${time}">+</div>`;
  return `<div class="tt-cell" data-time-edit data-day="${day}" data-period="${period}" data-time="${time}">
    <input type="checkbox" data-time-check="${row.id}" onclick="event.stopPropagation()" />
    <strong>${escapeHtml(row.subject)}</strong><span>${escapeHtml(row.teacher || "")}</span><small>${escapeHtml(row.room || "")}</small>
  </div>`;
}

function editTimeCell(day, period, time) {
  if (!can("edit", "timetable")) return;
  const row = store.timetable.find((item) => item.day === day && item.period === period) || { id: Date.now(), day, period, time, subject: subjectsList()[0], teacher: teachersList()[0], room: "" };
  const subject = prompt(`${day} ${period} 과목`, row.subject);
  if (!subject) return;
  const teacher = prompt("선생님", row.teacher || "");
  const room = prompt("장소", row.room || "");
  const exists = store.timetable.find((item) => item.id === row.id);
  const next = { ...row, subject, teacher, room };
  if (exists) Object.assign(exists, next);
  else store.timetable.push(next);
  saveStore();
  renderTimetable();
}

function renderExams() {
  const rows = store.exams;
  const selected = rows[0] || {};
  content.innerHTML = `
    <section class="exam-filter">
      <label>시험년도<select><option>2026</option><option>2025</option></select></label>
      <label>사용여부<select><option>사용</option><option>미사용</option></select></label>
      <label>학년<select><option>전체</option><option>중1</option><option>중2</option><option>중3</option></select></label>
      <label>과목<input id="examSubjectFilter" /></label>
      <label>시험명<input id="examTitleFilter" /></label>
      <label>시험일자<input type="date" value="2026-04-17" /> ~ <input type="date" value="${today}" /></label>
      <button id="examSearch">검색</button>
      <button id="omrDown" class="ghost">OMR카드 DOWN</button>
    </section>
    <div class="exam-layout">
      <section class="panel exam-left">
        <table><thead><tr><th>과목</th><th>시험명</th><th>시험지</th></tr></thead><tbody>
          ${rows.map((row) => `<tr><td>${escapeHtml(row.subject)}</td><td>${escapeHtml(row.title)}</td><td>${row.examPaperPdf || "첨부"}</td></tr>`).join("")}
        </tbody></table>
        <div class="score-summary">
          <span>응시인원수 <b>${rows.length}</b> 명</span><span>평균 <b>${selected.average || 0}</b> 점</span><span>최고점 <b>${selected.high_score || 0}</b> 점</span>
        </div>
      </section>
      <section class="panel exam-center">
        <div class="panel-head"><h3>시험 등록</h3><div class="row-actions"><button id="addExam">시험추가</button><button id="saveExam" class="ghost">저장</button></div></div>
        ${examForm(selected)}
        <hr />
        <div class="panel-head"><h3>정답</h3><div class="row-actions"><button id="extractOmr" class="ghost">문항 이미지 추출</button><button id="gradeExam">채점</button></div></div>
        <div class="answer-table">${answerTable(selected)}</div>
      </section>
      <section class="panel exam-right">
        <h3>영역평균</h3>${metricTable(selected)}
        <h3>문항별정답률</h3>${questionRateTable(selected)}
        <h3>성적 분석</h3>${scoreBars(rows)}
      </section>
    </div>
  `;
  addExam.addEventListener("click", () => addBlankExam());
  saveExam.addEventListener("click", () => requirePassword(saveExamForm));
  gradeExam.addEventListener("click", gradeCurrentExam);
  extractOmr.addEventListener("click", fakeOmrExtract);
  omrDown.addEventListener("click", downloadOmrCard);
}

function examForm(row) {
  return `<div class="exam-form">
    <label>시험명<input id="examTitle" value="${escapeHtml(row.title || "")}" /></label>
    <label>시험유형<select id="examType"><option ${row.type === "일반" ? "selected" : ""}>일반</option><option ${row.type === "모의수능" ? "selected" : ""}>모의수능</option></select></label>
    <label>과목<select id="examSubject">${subjectsList().map((x) => `<option ${x === row.subject ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select></label>
    <label>시험범위<input id="examScope" value="${escapeHtml(row.scope || "")}" /></label>
    <label>기본점수<input id="examBase" type="number" value="${row.base_score || 100}" /></label>
    <label>원점수<input id="examRaw" type="number" value="${row.raw_score || row.score || 0}" /></label>
    <label>시험지(pdf)<input id="examPaperPdf" type="file" accept=".pdf" /></label>
    <label>정답(pdf)<input id="answerPdf" type="file" accept=".pdf" /></label>
    <label>내답 OMR 사진<input id="omrImage" type="file" accept="image/*" /></label>
    <label>문항수<input id="questionCount" type="number" value="${row.question_count || 5}" /></label>
    <label class="wide">정답<input id="answerKey" value="${escapeHtml(row.answer_key || "")}" /></label>
    <label class="wide">내답<input id="studentAnswer" value="${escapeHtml(row.student_answer || "")}" /></label>
    <label class="wide">시험메모<input id="examAnalysis" value="${escapeHtml(row.analysis || "")}" /></label>
  </div>`;
}

function answerTable(row) {
  const count = Number(row.question_count || 5);
  const key = row.answer_key || "";
  const mine = row.student_answer || "";
  return `<table><thead><tr><th>NO</th><th>정답</th><th>내답</th><th>결과</th></tr></thead><tbody>${Array.from({ length: count }, (_, i) => `<tr><td>${i + 1}</td><td>${key[i] || ""}</td><td>${mine[i] || ""}</td><td>${key[i] && mine[i] ? (key[i] === mine[i] ? "정답" : "오답") : ""}</td></tr>`).join("")}</tbody></table>`;
}

function metricTable(row) {
  return `<table><thead><tr><th>영역</th><th>평균</th><th>상위30%</th><th>최고점</th></tr></thead><tbody><tr><td>${escapeHtml(row.subject || "-")}</td><td>${row.average || 0}</td><td>${row.top30 || 0}</td><td>${row.high_score || 0}</td></tr></tbody></table>`;
}

function questionRateTable(row) {
  const count = Number(row.question_count || 5);
  return `<table><thead><tr><th>번호</th><th>정답</th><th>①</th><th>②</th><th>③</th><th>④</th><th>⑤</th><th>정답률</th></tr></thead><tbody>${Array.from({ length: count }, (_, i) => `<tr><td>${i + 1}</td><td>${(row.answer_key || "")[i] || ""}</td><td></td><td></td><td></td><td></td><td></td><td>${Math.max(40, 95 - i * 7)}%</td></tr>`).join("")}</tbody></table>`;
}

function scoreBars(rows) {
  return rows.map((row) => `<div class="bar-row"><span>${escapeHtml(row.subject)}</span><div class="bar"><i style="width:${Number(row.score || 0)}%"></i></div><strong>${row.score || 0}</strong></div>`).join("");
}

function addBlankExam() {
  store.exams.unshift({ id: Date.now(), year: "2026", title: "새 시험", subject: subjectsList()[0], type: "일반", date: today, base_score: 100, raw_score: 0, score: 0, average: 0, top30: 0, high_score: 0, question_count: 5, answer_key: "", student_answer: "", analysis: "" });
  saveStore();
  renderExams();
}

function saveExamForm() {
  const row = store.exams[0];
  Object.assign(row, {
    title: examTitle.value,
    type: examType.value,
    subject: examSubject.value,
    scope: examScope.value,
    base_score: Number(examBase.value || 100),
    raw_score: Number(examRaw.value || 0),
    score: Number(examRaw.value || 0),
    question_count: Number(questionCount.value || 5),
    answer_key: answerKey.value,
    student_answer: studentAnswer.value,
    analysis: examAnalysis.value,
    examPaperPdf: examPaperPdf.files[0]?.name || row.examPaperPdf || "",
    answerPdf: answerPdf.files[0]?.name || row.answerPdf || "",
    omrImage: omrImage.files[0]?.name || row.omrImage || ""
  });
  saveStore();
  renderExams();
}

function fakeOmrExtract() {
  const fileName = omrImage.files[0]?.name || "";
  const digits = fileName.replace(/\D/g, "").slice(0, Number(questionCount.value || 5));
  studentAnswer.value = digits || "12345".slice(0, Number(questionCount.value || 5));
  showMessage("OMR 판별", "정적 MVP에서는 사진의 숫자 패턴을 임시 판별합니다. 실제 자동 판별은 OCR/OMR 엔진 연결이 필요합니다.");
}

function gradeCurrentExam() {
  const key = answerKey.value.trim();
  const mine = studentAnswer.value.trim();
  if (!key || !mine) return showMessage("채점 실패", "정답과 내답을 입력하거나 OMR을 판별하세요.");
  let correct = 0;
  for (let i = 0; i < key.length; i += 1) if (key[i] === mine[i]) correct += 1;
  examRaw.value = Math.round((correct / key.length) * Number(examBase.value || 100));
  showMessage("채점 완료", `${correct}/${key.length}문항 정답, 원점수 ${examRaw.value}점`);
}

function renderPrint() {
  const keys = ["schedules", "notices", "materials", "assignments", "exams", "portfolios"];
  content.innerHTML = `
    <section class="panel print-config">
      <div class="panel-head"><h3>프린트 설정</h3><button id="buildPrint">미리보기/출력</button></div>
      <div class="form-grid">
        <label>형식<select id="printFormat"><option>성적표</option><option>보고서</option><option>PDF/프린트</option><option>엑셀 CSV</option></select></label>
        <label>제목<input id="printTitle" value="${escapeHtml(store.settings.siteName)} 보고서" /></label>
      </div>
      <div class="check-grid">${keys.map((key) => `<label><input type="checkbox" data-print-key="${key}" checked /> ${pageLabel(key)}</label>`).join("")}</div>
    </section>
    <section id="printPreview" class="panel print-area"></section>
  `;
  buildPrint.addEventListener("click", () => {
    const selected = [...content.querySelectorAll("[data-print-key]:checked")].map((x) => x.dataset.printKey);
    if (printFormat.value === "엑셀 CSV") return exportSelectedKeys(selected);
    printPreview.innerHTML = `<div class="report-cover"><h1>${escapeHtml(printTitle.value)}</h1><p>${today}</p></div>${selected.map(printSection).join("")}`;
    if (printFormat.value === "PDF/프린트") window.print();
  });
}

function printSection(key) {
  const rows = store[key] || [];
  const cols = columns[key] || Object.keys(rows[0] || {});
  return `<section class="report-section"><h2>${pageLabel(key)}</h2>${rows.length ? `<table><thead><tr>${cols.map((c) => `<th>${labels[c] || c}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>` : `<p>항목 없음</p>`}</section>`;
}

function renderSite() {
  content.innerHTML = `
    <section class="panel">
      <div class="panel-head"><h3>홈페이지 관리</h3><button id="saveSite">저장</button></div>
      <div class="form-grid">
        <label>홈페이지 이름<input id="siteNameInput" value="${escapeHtml(store.settings.siteName)}" /></label>
        <label>로고 글자<input id="logoTextInput" value="${escapeHtml(store.settings.logoText)}" /></label>
        <label>수정모드<select id="editModeInput"><option value="off">끄기</option><option value="on" ${store.settings.editMode ? "selected" : ""}>켜기</option></select></label>
        <label class="wide">시스템 공지<textarea id="systemNoticeInput">${escapeHtml(store.settings.systemNotice)}</textarea></label>
        <label class="wide">빠른등록 버튼<select id="quickButtonSelect" multiple>${Object.keys(pageMeta).filter((k) => permissions[k]?.create).map((key) => `<option value="${key}" ${store.settings.quickButtons.includes(key) ? "selected" : ""}>${pageLabel(key)}</option>`).join("")}</select></label>
        <label class="wide">과목 선택값<textarea id="subjectOptions">${subjectsList().join("\n")}</textarea></label>
        <label class="wide">교과서 선택값<textarea id="textbookOptions">${textbooksList().join("\n")}</textarea></label>
        <label class="wide">출판사 선택값<textarea id="publisherOptions">${publishersList().join("\n")}</textarea></label>
        <label class="wide">현재 비밀번호<input id="sitePasswordInput" type="password" placeholder="홈페이지 설정 저장 전 비밀번호 확인" /></label>
      </div>
      <p id="siteError" class="error"></p>
      <p class="muted">수정모드를 켜면 사이드탭 이름을 사이드바에서 바로 바꿀 수 있습니다.</p>
    </section>
  `;
  document.getElementById("saveSite").addEventListener("click", () => {
    try {
      const siteNameField = document.getElementById("siteNameInput");
      const logoField = document.getElementById("logoTextInput");
      const editModeField = document.getElementById("editModeInput");
      const noticeField = document.getElementById("systemNoticeInput");
      const quickField = document.getElementById("quickButtonSelect");
      const subjectField = document.getElementById("subjectOptions");
      const textbookField = document.getElementById("textbookOptions");
      const publisherField = document.getElementById("publisherOptions");
      const passwordField = document.getElementById("sitePasswordInput");
      const errorField = document.getElementById("siteError");

      if (!passwordField || passwordField.value !== currentUser.password) {
        if (errorField) errorField.textContent = "비밀번호가 올바르지 않습니다.";
        return;
      }
      if (errorField) errorField.textContent = "";
      store.settings.siteName = siteNameField.value;
      store.settings.logoText = logoField.value;
      store.settings.systemNotice = noticeField.value;
      store.settings.editMode = editModeField.value === "on";
      store.settings.quickButtons = [...quickField.selectedOptions].map((x) => x.value);
      store.settings.subjects = splitLines(subjectField.value);
      store.settings.textbooks = splitLines(textbookField.value);
      store.settings.publishers = splitLines(publisherField.value);
      saveStore();
      applySettings();
      buildNav();
      showMessage("저장 완료", "홈페이지 설정이 반영되었습니다.");
    } catch (error) {
      const errorField = document.getElementById("siteError");
      if (errorField) errorField.textContent = `저장 중 오류가 발생했습니다: ${error.message}`;
    }
  });
}

function splitLines(text) {
  return text.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
}

function renderAdmin() {
  content.innerHTML = `
    <div class="stats">
      ${adminStat("계정 수", accounts.length, "관리자/일반/프린트", "admin")}
      ${adminStat("수정 요청", store.requests.length, "관리자 검토 필요", "requests")}
      ${adminStat("자료 수", store.materials.length, "Drive 링크 중심", "materials")}
      ${adminStat("시스템 공지", "활성", "홈페이지 관리에서 수정", "site")}
    </div>
    <section class="panel">
      <div class="panel-head"><h3>관리자 설정</h3><div class="row-actions"><button id="bulkDownload">일괄 다운로드</button><button id="bulkUpload" class="ghost">일괄 업로드</button></div></div>
      <div class="table-wrap"><table><thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>권한</th></tr></thead><tbody>${accounts.map((a) => `<tr><td>${a.name}</td><td>${a.email}</td><td>${roleName(a.role)}</td><td><select data-role="${a.id}"><option ${a.role === "admin" ? "selected" : ""}>admin</option><option ${a.role === "user" ? "selected" : ""}>user</option><option ${a.role === "print" ? "selected" : ""}>print</option></select></td></tr>`).join("")}</tbody></table></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>새 계정 생성</h3><button id="createAccount">계정 생성</button></div>
      <div class="form-grid"><label>이름<input id="newName" /></label><label>이메일<input id="newEmail" /></label><label>비밀번호<input id="newPw" /></label><label>역할<select id="newRole"><option value="user">일반</option><option value="admin">관리자</option><option value="print">프린트</option></select></label></div>
    </section>
  `;
  content.querySelectorAll("[data-go]").forEach((btn) => btn.addEventListener("click", () => renderPage(btn.dataset.go)));
  bulkDownload.addEventListener("click", () => exportSelectedKeys(Object.keys(columns)));
  bulkUpload.addEventListener("click", () => showMessage("일괄 업로드", "CSV/JSON 업로드 영역입니다. 실제 DB 연결 시 파일 파싱으로 확장할 수 있습니다."));
  createAccount.addEventListener("click", () => requirePassword(() => {
    accounts.push({ id: Date.now(), name: newName.value || "새 계정", email: newEmail.value, password: newPw.value || "1234", role: newRole.value, pin: "1234" });
    renderAdmin();
  }));
}

function adminStat(title, value, hint, page) {
  return `<div class="stat"><div class="mini-head"><span>${title}</span><button class="ghost small" data-go="${page}">더보기</button></div><strong>${value}</strong><span>${hint}</span></div>`;
}

function exportSelected(key) {
  const ids = [...content.querySelectorAll("[data-row-id]:checked")].map((x) => Number(x.dataset.rowId));
  const rows = (store[key] || []).filter((row) => !ids.length || ids.includes(row.id));
  exportRows(`${pageLabel(key)}_${today}.csv`, rows, columns[key]);
}

function exportSelectedKeys(keys) {
  const text = keys.map((key) => {
    const rows = store[key] || [];
    const cols = columns[key] || Object.keys(rows[0] || {});
    return `[${pageLabel(key)}]\n${rowsToCsv(rows, cols)}`;
  }).join("\n\n");
  exportCsv(`개인관리_일괄다운로드_${today}.csv`, text);
}

function exportRows(filename, rows, cols) {
  exportCsv(filename, rowsToCsv(rows, cols || Object.keys(rows[0] || {})));
}

function rowsToCsv(rows, cols) {
  const head = cols.map((c) => labels[c] || c).join(",");
  const body = rows.map((row) => cols.map((c) => `"${String(row[c] ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  return `${head}\n${body}`;
}

function exportCsv(filename, text) {
  const blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showMessage(title, body) {
  messageTitle.textContent = title;
  messageBody.textContent = body;
  messageDialog.showModal();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]));
}

function renderSite() {
  const quickOptions = Object.keys(pageMeta)
    .filter((key) => permissions[key]?.create)
    .map((key) => `<option value="${key}" ${store.settings.quickButtons.includes(key) ? "selected" : ""}>${escapeHtml(pageLabel(key))}</option>`)
    .join("");

  content.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <h3>홈페이지 관리</h3>
        <button id="saveSite" type="button">저장</button>
      </div>
      <div class="form-grid">
        <label>홈페이지 이름<input id="siteNameInput" value="${escapeHtml(store.settings.siteName)}" /></label>
        <label>로고 글자<input id="logoTextInput" value="${escapeHtml(store.settings.logoText)}" /></label>
        <label>수정모드
          <select id="editModeInput">
            <option value="off" ${store.settings.editMode ? "" : "selected"}>끄기</option>
            <option value="on" ${store.settings.editMode ? "selected" : ""}>켜기</option>
          </select>
        </label>
        <label class="wide">시스템 공지<textarea id="systemNoticeInput">${escapeHtml(store.settings.systemNotice)}</textarea></label>
        <label class="wide">빠른등록 버튼<select id="quickButtonSelect" multiple>${quickOptions}</select></label>
        <label class="wide">과목 선택값<textarea id="subjectOptions">${escapeHtml(subjectsList().join("\n"))}</textarea></label>
        <label class="wide">교과서 선택값<textarea id="textbookOptions">${escapeHtml(textbooksList().join("\n"))}</textarea></label>
        <label class="wide">출판사 선택값<textarea id="publisherOptions">${escapeHtml(publishersList().join("\n"))}</textarea></label>
        <label class="wide">현재 비밀번호<input id="sitePasswordInput" type="password" placeholder="홈페이지 설정 저장 전 비밀번호 확인" /></label>
      </div>
      <p id="siteError" class="error"></p>
      <p class="muted">수정모드를 켜면 사이드탭 이름을 사이드바에서 바로 바꿀 수 있습니다.</p>
    </section>
  `;

  document.getElementById("saveSite").addEventListener("click", saveSiteSettings);
}

function saveSiteSettings() {
  const errorField = document.getElementById("siteError");
  try {
    const passwordField = document.getElementById("sitePasswordInput");
    if (!passwordField || passwordField.value !== currentUser.password) {
      errorField.textContent = "비밀번호가 올바르지 않습니다.";
      return;
    }

    store.settings.siteName = document.getElementById("siteNameInput").value;
    store.settings.logoText = document.getElementById("logoTextInput").value;
    store.settings.systemNotice = document.getElementById("systemNoticeInput").value;
    store.settings.editMode = document.getElementById("editModeInput").value === "on";
    store.settings.quickButtons = [...document.getElementById("quickButtonSelect").selectedOptions].map((option) => option.value);
    store.settings.subjects = splitLines(document.getElementById("subjectOptions").value);
    store.settings.textbooks = splitLines(document.getElementById("textbookOptions").value);
    store.settings.publishers = splitLines(document.getElementById("publisherOptions").value);

    saveStore();
    applySettings();
    buildNav();
    renderSite();
    showMessage("저장 완료", "홈페이지 설정이 반영되었습니다.");
  } catch (error) {
    if (errorField) errorField.textContent = `저장 중 오류가 발생했습니다: ${error.message}`;
  }
}

function renderSiteV2() {
  content.replaceChildren();

  const panel = document.createElement("section");
  panel.className = "panel";

  const head = document.createElement("div");
  head.className = "panel-head";
  const title = document.createElement("h3");
  title.textContent = "홈페이지 관리";
  const saveButton = document.createElement("button");
  saveButton.id = "saveSite";
  saveButton.type = "button";
  saveButton.textContent = "저장";
  head.append(title, saveButton);

  const grid = document.createElement("div");
  grid.className = "form-grid";
  grid.append(
    makeTextField("홈페이지 이름", "siteNameInput", store.settings.siteName),
    makeTextField("로고 글자", "logoTextInput", store.settings.logoText),
    makeSelectField("수정모드", "editModeInput", [["off", "끄기"], ["on", "켜기"]], store.settings.editMode ? "on" : "off"),
    makeTextareaField("시스템 공지", "systemNoticeInput", store.settings.systemNotice),
    makeMultiSelectField("빠른등록 버튼", "quickButtonSelect", Object.keys(pageMeta).filter((key) => permissions[key]?.create).map((key) => [key, pageLabel(key)]), store.settings.quickButtons),
    makeTextareaField("과목 선택값", "subjectOptions", subjectsList().join("\n")),
    makeTextareaField("교과서 선택값", "textbookOptions", textbooksList().join("\n")),
    makeTextareaField("출판사 선택값", "publisherOptions", publishersList().join("\n")),
    makePasswordField("현재 비밀번호", "sitePasswordInput", "홈페이지 설정 저장 전 비밀번호 확인")
  );

  const error = document.createElement("p");
  error.id = "siteError";
  error.className = "error";

  const hint = document.createElement("p");
  hint.className = "muted";
  hint.textContent = "수정모드를 켜면 사이드탭 이름을 사이드바에서 바로 바꿀 수 있습니다.";

  panel.append(head, grid, error, hint);
  content.append(panel);
  saveButton.addEventListener("click", saveSiteSettingsV2);
}

function makeField(labelText, id, element) {
  const label = document.createElement("label");
  label.textContent = labelText;
  if (element.tagName === "TEXTAREA" || element.multiple) label.className = "wide";
  element.id = id;
  label.append(element);
  return label;
}

function makeTextField(label, id, value) {
  const input = document.createElement("input");
  input.value = value || "";
  return makeField(label, id, input);
}

function makePasswordField(label, id, placeholder) {
  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = placeholder;
  return makeField(label, id, input);
}

function makeTextareaField(label, id, value) {
  const textarea = document.createElement("textarea");
  textarea.value = value || "";
  return makeField(label, id, textarea);
}

function makeSelectField(label, id, options, selectedValue) {
  const select = document.createElement("select");
  options.forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    option.selected = value === selectedValue;
    select.append(option);
  });
  return makeField(label, id, select);
}

function makeMultiSelectField(label, id, options, selectedValues) {
  const select = document.createElement("select");
  select.multiple = true;
  options.forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    option.selected = selectedValues.includes(value);
    select.append(option);
  });
  return makeField(label, id, select);
}

function saveSiteSettingsV2() {
  const errorField = document.getElementById("siteError");
  const passwordField = document.getElementById("sitePasswordInput");
  if (!passwordField || passwordField.value !== currentUser.password) {
    errorField.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }

  store.settings.siteName = document.getElementById("siteNameInput").value;
  store.settings.logoText = document.getElementById("logoTextInput").value;
  store.settings.systemNotice = document.getElementById("systemNoticeInput").value;
  store.settings.editMode = document.getElementById("editModeInput").value === "on";
  store.settings.quickButtons = [...document.getElementById("quickButtonSelect").selectedOptions].map((option) => option.value);
  store.settings.subjects = splitLines(document.getElementById("subjectOptions").value);
  store.settings.textbooks = splitLines(document.getElementById("textbookOptions").value);
  store.settings.publishers = splitLines(document.getElementById("publisherOptions").value);

  saveStore();
  applySettings();
  buildNav();
  renderSiteV2();
  showMessage("저장 완료", "홈페이지 설정이 반영되었습니다.");
}

function renderTimetableV2() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const periods = ["1교시", "2교시", "3교시", "4교시", "5교시", "6교시", "7교시", "8교시"];
  const times = ["08:40-09:25", "09:35-10:20", "10:30-11:15", "11:25-12:10", "13:10-13:55", "14:05-14:50", "15:00-15:45", "15:55-16:40"];

  content.replaceChildren();
  const panel = document.createElement("section");
  panel.className = "panel";

  const head = document.createElement("div");
  head.className = "panel-head";
  const title = document.createElement("h3");
  title.textContent = "일~토 시간표";
  const actions = document.createElement("div");
  actions.className = "row-actions";
  const addButton = document.createElement("button");
  addButton.id = "addTime";
  addButton.type = "button";
  addButton.textContent = "수동 생성";
  const password = document.createElement("input");
  password.id = "timetablePassword";
  password.type = "password";
  password.placeholder = "삭제 비밀번호";
  password.style.width = "140px";
  const deleteButton = document.createElement("button");
  deleteButton.id = "deleteTime";
  deleteButton.type = "button";
  deleteButton.className = "danger";
  deleteButton.textContent = "선택 삭제";
  actions.append(addButton, password, deleteButton);
  head.append(title, actions);

  const grid = document.createElement("div");
  grid.className = "timetable-grid";
  grid.append(makeTimeHead("교시/시간"), ...days.map(makeTimeHead));

  periods.forEach((period, index) => {
    const timeBox = document.createElement("div");
    timeBox.className = "tt-time";
    timeBox.innerHTML = `<strong>${period}</strong><span>${times[index]}</span>`;
    grid.append(timeBox);
    days.forEach((day) => grid.append(makeTimeCellV2(day, period, times[index])));
  });

  const error = document.createElement("p");
  error.id = "timetableError";
  error.className = "error";

  panel.append(head, grid, error);
  content.append(panel);

  addButton.addEventListener("click", () => editTimeCellV2("월", "1교시", "08:40-09:25"));
  deleteButton.addEventListener("click", deleteSelectedTimetable);
}

function makeTimeHead(text) {
  const div = document.createElement("div");
  div.className = "tt-head";
  div.textContent = text;
  return div;
}

function makeTimeCellV2(day, period, time) {
  const row = store.timetable.find((item) => item.day === day && item.period === period);
  const cell = document.createElement("div");
  cell.className = row ? "tt-cell" : "tt-cell empty-cell";
  cell.dataset.day = day;
  cell.dataset.period = period;
  cell.dataset.time = time;
  if (!row) {
    cell.textContent = "+";
  } else {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.timeCheck = String(row.id);
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    const subject = document.createElement("strong");
    subject.textContent = row.subject || "";
    const teacher = document.createElement("span");
    teacher.textContent = row.teacher || "";
    const room = document.createElement("small");
    room.textContent = row.room || "";
    cell.append(checkbox, subject, teacher, room);
  }
  cell.addEventListener("click", () => editTimeCellV2(day, period, time));
  return cell;
}

function editTimeCellV2(day, period, time) {
  if (!can("edit", "timetable")) return;
  const row = store.timetable.find((item) => item.day === day && item.period === period) || { id: Date.now(), day, period, time, subject: subjectsList()[0] || "", teacher: teachersList()[0] || "", room: "" };
  const subject = prompt(`${day} ${period} 과목`, row.subject || "");
  if (!subject) return;
  const teacher = prompt("선생님", row.teacher || "");
  const room = prompt("장소", row.room || "");
  const exists = store.timetable.find((item) => item.id === row.id);
  const next = { ...row, subject, teacher, room };
  if (exists) Object.assign(exists, next);
  else store.timetable.push(next);
  saveStore();
  renderTimetableV2();
}

function deleteSelectedTimetable() {
  const error = document.getElementById("timetableError");
  if (!can("del", "timetable")) {
    error.textContent = "시간표 삭제는 관리자만 가능합니다.";
    return;
  }
  const password = document.getElementById("timetablePassword");
  if (!password || password.value !== currentUser.password) {
    error.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  const ids = [...content.querySelectorAll("[data-time-check]:checked")].map((box) => Number(box.dataset.timeCheck));
  if (!ids.length) {
    error.textContent = "삭제할 시간표를 선택하세요.";
    return;
  }
  store.timetable = store.timetable.filter((row) => !ids.includes(row.id));
  saveStore();
  renderTimetableV2();
}

extendAppV4();
extendAppV5();
extendAppV6();
extendAppV7();
extendAppV8();
extendAppV9();
extendAppV10();
extendAppV11();

// Final auth boot calls init after all extension layers are loaded.

function extendAppV4() {
  Object.assign(pageMeta, {
    meals: ["식", "급식 관리"],
    budget: ["원", "예산 관리"],
    clubs: ["동", "동아리 관리"]
  });
  Object.assign(permissions, {
    meals: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] },
    budget: { create: ["admin"], edit: ["admin"], del: ["admin"] },
    clubs: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] }
  });
  store.settings.systemNoticeEnabled ??= true;
  store.settings.hiddenFilterFields ??= [];
  store.meals ??= [
    { id: 1, date: today, meal: "점심", menu: "쌀밥, 미역국, 닭갈비, 배추김치, 과일", calories: "820kcal", memo: "알레르기 정보 확인" }
  ];
  store.budget ??= [
    { id: 1, date: today, type: "지출", category: "교재", amount: "15000", title: "문제집 구입", method: "카드", memo: "" }
  ];
  store.clubs ??= [
    { id: 1, name: "메이커 동아리", role: "부원", teacher: teachersList()[0] || "", location: "창의실", schedule: "수 7교시", memo: "활동 보고서 작성" }
  ];
  store.timetableSets ??= [
    { id: "school", name: "학교수업 > 2026년 1학기 2학년", type: "학교수업" },
    { id: "after", name: "방과후학교 > 2026년 1학기 방과후학교", type: "방과후" },
    { id: "night", name: "야자 > 2026년 동아고 동아리활동", type: "야자" },
    { id: "club", name: "동아리 > 2026학년도 2학년 찾아가는 학과체험", type: "동아리" }
  ];
  store.timetable.forEach((row) => { row.setId ??= "school"; });
  saveStore();
}

function navKeys() {
  if (currentUser?.role === "print") return ["print"];
  const keys = ["dashboard", "personal", "schedules", "notices", "meals", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "timetable", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "admin", "print");
  return keys;
}

function can(action, key) {
  if (!currentUser || currentUser.role === "print") return false;
  if (currentUser.role === "admin") return true;
  if (currentUser.permissions?.[key]?.[action] !== undefined) return currentUser.permissions[key][action];
  return (permissions[key]?.[action] || []).includes(currentUser.role);
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  if (key === "dashboard") return renderDashboardV4();
  if (key === "personal") return renderPersonalV4();
  if (key === "meals") return renderCollectionV4("meals");
  if (key === "budget") return renderCollectionV4("budget");
  if (key === "clubs") return renderCollectionV4("clubs");
  if (key === "penalties") return renderPenaltiesV4();
  if (key === "notices") return renderCollectionV4("notices");
  if (key === "timetable") return renderTimetableV4();
  if (key === "print") return renderPrintV4();
  if (key === "admin") return renderAdminV4();
  if (key === "site") return renderSiteV4();
  if (key === "exams") return renderExams();
  renderCollection(key);
}

function updateGreeting() {
  if (!currentUser) return;
  const suffix = currentUser.role === "admin" ? "관리자님 어서오십시오." : currentUser.role === "print" ? "사용자님 프린트 전용계정입니다." : "사용자님 어서오십시오.";
  roleLabel.textContent = `${currentUser.name} ${suffix}`;
}

function renderDashboardV4() {
  const blocks = [
    ["schedules", "일정", store.schedules.map((x) => `${x.date || ""} ${x.title || ""}`)],
    ["notices", "공지", visibleNotices().map((x) => `${x.title || ""} ${x.source || ""}`)],
    ["meals", "급식", (store.meals || []).map((x) => `${x.date || ""} ${x.meal || ""} ${x.menu || ""}`)],
    ["assignments", "과제", store.assignments.map((x) => `${x.date || ""} ${x.title || ""}`)],
    ["exams", "시험", store.exams.map((x) => `${x.date || ""} ${x.title || ""}`)],
    ["portfolios", "포트폴리오", store.portfolios.map((x) => `${x.title || ""} ${x.file_link || ""}`)],
    ["penalties", "벌점", store.penalties.map((x) => `${x.title || ""} ${x.points || 0}점`)],
    ["timetable", "시간표", store.timetable.slice(0, 12).map((x) => `${x.day || ""} ${x.period || ""} ${x.subject || ""}`)],
    ["clubs", "동아리", (store.clubs || []).map((x) => `${x.name || ""} ${x.schedule || ""}`)]
  ];
  content.replaceChildren();
  if (store.settings.systemNoticeEnabled) {
    const notice = el("div", "system-notice");
    notice.append(el("strong", "", "시스템 공지"), el("span", "", store.settings.systemNotice || ""));
    content.append(notice);
  }
  const quick = panel("빠른 등록");
  const actions = el("div", "quick-actions");
  (store.settings.quickButtons || []).forEach((key) => {
    const btn = button(`${pageLabel(key)} 추가`);
    btn.disabled = !can("create", key);
    btn.addEventListener("click", () => openEditor(key, null, "dashboard"));
    actions.append(btn);
  });
  quick.append(actions);
  content.append(quick);
  const grid = el("div", "dashboard-grid");
  blocks.forEach(([key, title, items]) => grid.append(dashboardBoxV4(key, title, items)));
  content.append(grid);
}

function dashboardBoxV4(key, title, items) {
  const box = panel("");
  box.classList.add("dash-box");
  const head = el("div", "panel-head");
  head.append(el("h3", "", title));
  const more = button("더보기", "ghost small");
  more.addEventListener("click", () => renderPage(key));
  head.append(more);
  const list = el("div", "scroll-list");
  if (!items.length) list.append(el("div", "empty", "항목 없음"));
  items.forEach((item) => list.append(el("div", "", item)));
  box.append(head, list);
  return box;
}

function renderCollectionV4(key) {
  content.replaceChildren();
  const rows = filteredRowsV4(key);
  const section = panel(pageLabel(key));
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const add = button("새 항목");
  add.disabled = !can("create", key);
  add.addEventListener("click", () => openEditorV4(key));
  const download = button("보고서 다운로드", "ghost");
  download.addEventListener("click", () => downloadReportV4(key));
  actions.append(download, add);
  head.append(actions);
  section.append(filterBarV4(key), tableV4(key, rows));
  content.append(section);
}

function renderPenaltiesV4() {
  const total = (store.penalties || []).reduce((sum, row) => sum + Number(row.points || 0), 0);
  content.replaceChildren();
  const stat = el("div", "stats");
  const item = el("div", "stat");
  item.append(el("span", "", "현재 벌점 합계"), el("strong", "", `${total}점`), el("span", "", "관리자만 수정/삭제 가능"));
  stat.append(item);
  content.append(stat);
  renderCollectionV4("penalties");
  content.prepend(stat);
}

function fieldsForV4(key) {
  const map = {
    notices: [["title", "제목", "text", true], ["source", "출처", "select", ["시스템", "학교", "학원", "선생님", "기타"]], ["subject", "과목", "select", ["", "공통", ...subjectsList()]], ["importance", "중요도", "select", ["낮음", "보통", "높음", "매우 높음"]], ["notice_date", "날짜", "date"], ["content", "내용", "textarea"], ["memo", "메모", "textarea"], ["visibility", "공개", "select", ["일반 공개", "관리자 전용"]]],
    meals: [["date", "날짜", "date", true], ["meal", "구분", "select", ["아침", "점심", "저녁", "간식"]], ["menu", "메뉴", "textarea", true], ["calories", "열량", "text"], ["memo", "메모", "textarea"]],
    budget: [["date", "날짜", "date"], ["type", "입출금", "select", ["수입", "지출"]], ["category", "분류", "select", ["교재", "교통", "식비", "회비", "행사", "기타"]], ["amount", "금액", "number", true], ["title", "내용", "text", true], ["method", "수단", "select", ["현금", "카드", "계좌", "기타"]], ["memo", "메모", "textarea"]],
    clubs: [["name", "동아리명", "text", true], ["role", "역할", "text"], ["teacher", "담당 선생님", "select", teachersList()], ["location", "장소", "text"], ["schedule", "시간표", "text"], ["memo", "활동 내용/메모", "textarea"]],
    penalties: [["date", "날짜", "date"], ["title", "벌점 항목", "text", true], ["points", "벌점 점수", "select", ["1", "2", "3", "4", "5", "10"]], ["reason", "사유", "textarea"], ["status", "상태", "select", ["등록됨", "확인 완료", "이의제기", "해결됨"]]]
  };
  return map[key] || fieldsFor(key);
}

function columnsForV4(key) {
  return {
    notices: ["title", "source", "subject", "importance", "notice_date", "content", "memo", "visibility"],
    meals: ["date", "meal", "menu", "calories", "memo"],
    budget: ["date", "type", "category", "amount", "title", "method", "memo"],
    clubs: ["name", "role", "teacher", "location", "schedule", "memo"],
    penalties: ["date", "title", "points", "reason", "status"]
  }[key] || columns[key] || [];
}

function filterBarV4(key) {
  const bar = el("div", "toolbar");
  ["subject", "teacher", "location"].forEach((field) => {
    if ((store.settings.hiddenFilterFields || []).includes(field)) return;
    const values = uniqueValuesFor(field);
    const select = document.createElement("select");
    select.dataset.filter = field;
    select.append(option("", `${labelFor(field)} 전체`));
    values.forEach((value) => select.append(option(value, value)));
    select.value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
    select.addEventListener("change", () => {
      sessionStorage.setItem(`filter:${key}:${field}`, select.value);
      renderPage(key);
    });
    bar.append(makeField(labelFor(field), `filter-${field}`, select));
  });
  columnsForV4(key).slice(0, 4).forEach((field) => {
    const input = document.createElement("input");
    input.dataset.filter = field;
    input.placeholder = `${labelFor(field)} 검색`;
    input.value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
    input.addEventListener("input", () => {
      sessionStorage.setItem(`filter:${key}:${field}`, input.value);
      renderPage(key);
    });
    bar.append(input);
  });
  return bar;
}

function filteredRowsV4(key) {
  const query = globalSearch.value.trim().toLowerCase();
  return (key === "notices" ? visibleNotices() : (store[key] || [])).filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query)) return false;
    const fields = [...new Set(["subject", "teacher", "location", ...columnsForV4(key).slice(0, 4)])];
    for (const field of fields) {
      const value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
      if (value && !String(row[field] || "").includes(value)) return false;
    }
    return true;
  });
}

function tableV4(key, rows) {
  if (!rows.length) return el("div", "empty", "항목이 없습니다.");
  const cols = columnsForV4(key);
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  cols.forEach((col) => hr.append(el("th", "", labelFor(col))));
  hr.append(el("th", "", "관리"));
  thead.append(hr);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => tr.append(el("td", "", row[col] || "")));
    const td = el("td");
    const edit = button(can("edit", key) ? "수정" : "수정 요청", "ghost");
    edit.addEventListener("click", () => can("edit", key) ? openEditorV4(key, row.id) : requestEdit(key, row.id));
    td.append(edit);
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      td.append(del);
    }
    tr.append(td);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function openEditorV4(key, id = null) {
  if (id && !can("edit", key)) return requestEdit(key, id);
  if (!id && !can("create", key)) return;
  const row = id ? (store[key] || []).find((item) => item.id === id) : {};
  editing = { key, id, origin: key, v4: true };
  dialogTitle.textContent = `${pageLabel(key)} ${id ? "수정" : "추가"}`;
  editorFields.replaceChildren();
  fieldsForV4(key).forEach(([name, label, type, requiredOrOptions]) => {
    editorFields.append(inputNodeV4(name, label, type, requiredOrOptions, row?.[name] || ""));
  });
  if (id) editorFields.append(inputNodeV4("_confirm_password", "현재 비밀번호", "password", true, ""));
  if (key === "notices") bindNoticeSourceV4();
  editorError.textContent = "";
  editorDialog.showModal();
}

function saveEditor(event) {
  event.preventDefault();
  if (!editing) return;
  const payload = Object.fromEntries(new FormData(editorForm).entries());
  if (editing.id && payload._confirm_password !== currentUser.password) {
    editorError.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  delete payload._confirm_password;
  const origin = editing.origin;
  const rows = store[editing.key] || (store[editing.key] = []);
  if (editing.id) {
    const index = rows.findIndex((row) => row.id === editing.id);
    rows[index] = { ...rows[index], ...payload };
  } else if (Object.values(payload).some((value) => String(value || "").trim())) {
    rows.unshift({ id: Date.now(), ...payload, created_by: currentUser.email });
  }
  saveStore();
  closeEditor();
  renderPage(origin || currentPage);
}

function renderTimetableV4() {
  const setId = sessionStorage.getItem("pm-timetable-set") || store.timetableSets[0]?.id || "school";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const periods = ["1교시", "2교시", "3교시", "4교시", "5교시", "6교시", "7교시", "8교시"];
  const times = ["08:40-09:25", "09:35-10:20", "10:30-11:15", "11:25-12:10", "13:10-13:55", "14:05-14:50", "15:00-15:45", "15:55-16:40"];
  content.replaceChildren();
  const section = panel("시간표");
  const selector = document.createElement("select");
  store.timetableSets.forEach((set) => selector.append(option(set.id, set.name)));
  selector.value = setId;
  selector.addEventListener("change", () => { sessionStorage.setItem("pm-timetable-set", selector.value); renderTimetableV4(); });
  const checks = el("div", "check-grid");
  [["teacher", "선생님"], ["room", "강의실"], ["seat", "좌석"]].forEach(([field, label]) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = sessionStorage.getItem(`show-${field}`) !== "false";
    input.addEventListener("change", () => { sessionStorage.setItem(`show-${field}`, input.checked); renderTimetableV4(); });
    const lab = document.createElement("label");
    lab.append(input, document.createTextNode(` ${label}`));
    checks.append(lab);
  });
  section.append(selector, checks);
  const grid = el("div", "timetable-grid");
  grid.append(makeTimeHead("교시/시간"), ...days.map(makeTimeHead));
  periods.forEach((period, i) => {
    const timeBox = el("div", "tt-time");
    timeBox.append(el("strong", "", period), el("span", "", times[i]));
    grid.append(timeBox);
    days.forEach((day) => grid.append(makeTimeCellV4(setId, day, period, times[i])));
  });
  section.append(grid);
  content.append(section);
}

function makeTimeCellV4(setId, day, period, time) {
  const row = store.timetable.find((item) => (item.setId || "school") === setId && item.day === day && item.period === period);
  const cell = el("div", row ? "tt-cell" : "tt-cell empty-cell");
  if (!row) cell.textContent = "+";
  else {
    cell.append(el("strong", "", row.subject || ""));
    if (sessionStorage.getItem("show-teacher") !== "false") cell.append(el("span", "", row.teacher || ""));
    if (sessionStorage.getItem("show-room") !== "false") cell.append(el("small", "", row.room || ""));
    if (sessionStorage.getItem("show-seat") !== "false" && row.seat) cell.append(el("small", "", `좌석 ${row.seat}`));
  }
  cell.addEventListener("click", () => editTimeCellV4(setId, day, period, time, row));
  return cell;
}

function editTimeCellV4(setId, day, period, time, row) {
  if (!can("create", "timetable") && !can("edit", "timetable")) return;
  const subject = prompt(`${day} ${period} 과목`, row?.subject || "");
  if (subject === null) return;
  const teacher = prompt("선생님", row?.teacher || "");
  if (teacher === null) return;
  const room = prompt("위치", row?.room || "");
  if (room === null) return;
  const seat = prompt("좌석", row?.seat || "");
  if (seat === null) return;
  if (row) Object.assign(row, { subject, teacher, room, seat });
  else store.timetable.push({ id: Date.now(), setId, day, period, time, subject, teacher, room, seat });
  saveStore();
  renderTimetableV4();
}

function renderPersonalV4() {
  const profile = store.profile || (store.profile = {});
  content.replaceChildren();
  const info = panel("내정보 관리");
  const grid = el("div", "form-grid");
  grid.append(makeTextField("이름", "profileName", profile.name || currentUser.name || ""), makeTextField("연락처", "profilePhone", profile.phone || ""), makeTextField("이메일", "profileEmail", profile.email || currentUser.email || ""), makeTextField("학교/소속", "profileSchool", profile.school || ""), makeTextareaField("메모", "profileMemo", profile.memo || ""), makePasswordField("현재 비밀번호", "profilePassword", "내정보 저장 확인"));
  const save = button("저장");
  const error = el("p", "error");
  save.addEventListener("click", () => {
    if (document.getElementById("profilePassword").value !== currentUser.password) return error.textContent = "비밀번호가 올바르지 않습니다.";
    store.profile = { name: profileName.value, phone: profilePhone.value, email: profileEmail.value, school: profileSchool.value, memo: profileMemo.value };
    currentUser.name = store.profile.name || currentUser.name;
    saveStore();
    updateGreeting();
    showMessage("저장 완료", "내정보가 저장되었습니다.");
  });
  info.append(grid, save, error);
  const diary = panel("업무일지");
  const form = el("div", "form-grid");
  form.append(makeTextField("제목", "diaryTitle", ""), makeTextField("기분/상태", "diaryMood", "보통"), makeTextareaField("내용", "diaryContent", ""));
  const add = button("일지 저장");
  add.addEventListener("click", () => {
    if (!diaryTitle.value.trim() && !diaryContent.value.trim()) return;
    store.diary.unshift({ id: Date.now(), date: today, title: diaryTitle.value || "업무일지", mood: diaryMood.value || "보통", content: diaryContent.value });
    saveStore();
    renderPersonalV4();
  });
  const cards = el("div", "cards");
  (store.diary || []).forEach((row) => {
    const card = el("article", "card");
    card.append(el("h3", "", row.title || ""), el("span", "", `${row.date || ""} · ${row.mood || ""}`), el("p", "", row.content || ""));
    cards.append(card);
  });
  diary.append(form, add, cards);
  content.append(info, diary);
}

function renderAdminV4() {
  content.replaceChildren();
  const section = panel("관리자 설정");
  const sys = document.createElement("select");
  sys.append(option("on", "시스템 공지 활성"), option("off", "시스템 공지 비활성"));
  sys.value = store.settings.systemNoticeEnabled ? "on" : "off";
  sys.addEventListener("change", () => { store.settings.systemNoticeEnabled = sys.value === "on"; saveStore(); });
  section.append(makeField("시스템 공지", "systemNoticeEnabled", sys));
  const table = el("div", "table-wrap");
  const t = document.createElement("table");
  const body = document.createElement("tbody");
  accounts.forEach((account) => {
    const tr = document.createElement("tr");
    tr.append(el("td", "", account.name), el("td", "", account.email), el("td", "", roleName(account.role)));
    const pw = document.createElement("input");
    pw.placeholder = "새 비밀번호";
    const pwBtn = button("PW 변경", "ghost");
    pwBtn.addEventListener("click", () => { if (pw.value) { account.password = pw.value; showMessage("변경 완료", "계정 비밀번호가 변경되었습니다."); } });
    const td = el("td");
    td.append(pw, pwBtn);
    tr.append(td);
    body.append(tr);
  });
  t.append(body);
  table.append(t);
  const perms = el("div", "check-grid");
  ["schedules", "notices", "meals", "assignments", "exams", "portfolios", "timetable", "clubs"].forEach((key) => {
    const label = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = (permissions[key]?.create || []).includes("user");
    check.addEventListener("change", () => {
      ["create"].forEach((action) => {
        permissions[key][action] = check.checked ? [...new Set([...permissions[key][action], "user"])] : permissions[key][action].filter((role) => role !== "user");
      });
    });
    label.append(check, document.createTextNode(` 일반 사용자 ${pageLabel(key)} 추가 허용`));
    perms.append(label);
  });
  const bulk = button("모든 자료 일괄 다운로드");
  bulk.addEventListener("click", () => exportSelectedKeys([...Object.keys(columns), "meals", "budget", "clubs"]));
  section.append(table, el("h3", "", "권한 종류"), perms, bulk);
  content.append(section);
}

function renderSiteV4() {
  renderSiteV2();
  const enable = document.createElement("select");
  enable.append(option("on", "시스템 공지 활성"), option("off", "시스템 공지 비활성"));
  enable.value = store.settings.systemNoticeEnabled ? "on" : "off";
  enable.addEventListener("change", () => { store.settings.systemNoticeEnabled = enable.value === "on"; saveStore(); });
  content.querySelector(".form-grid")?.append(makeField("시스템 공지 표시", "systemNoticeToggle", enable));
}

function saveSiteSettingsV2() {
  const errorField = document.getElementById("siteError");
  const passwordField = document.getElementById("sitePasswordInput");
  if (!passwordField || passwordField.value !== currentUser.password) {
    errorField.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  store.settings.siteName = document.getElementById("siteNameInput").value;
  store.settings.logoText = document.getElementById("logoTextInput").value;
  store.settings.systemNotice = document.getElementById("systemNoticeInput").value;
  store.settings.editMode = document.getElementById("editModeInput").value === "on";
  store.settings.quickButtons = [...document.getElementById("quickButtonSelect").selectedOptions].map((option) => option.value);
  store.settings.subjects = splitLines(document.getElementById("subjectOptions").value);
  store.settings.textbooks = splitLines(document.getElementById("textbookOptions").value);
  store.settings.publishers = splitLines(document.getElementById("publisherOptions").value);
  const sys = document.getElementById("systemNoticeToggle");
  if (sys) store.settings.systemNoticeEnabled = sys.value === "on";
  saveStore();
  applySettings();
  buildNav();
  renderSiteV4();
  showMessage("저장 완료", "홈페이지 설정이 저장되었습니다.");
}

function renderPrintV4() {
  const keys = ["schedules", "notices", "meals", "assignments", "exams", "portfolios", "penalties", "clubs", "budget"];
  content.replaceChildren();
  const section = panel("프린트 센터");
  const format = document.createElement("select");
  ["보고서", "성적표", "PDF/프린트", "CSV"].forEach((x) => format.append(option(x, x)));
  section.append(makeField("형식", "printFormatV4", format));
  const checks = el("div", "check-grid");
  keys.forEach((key) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.printKey = key;
    input.checked = key !== "budget" || isAdmin();
    const lab = document.createElement("label");
    lab.append(input, document.createTextNode(` ${pageLabel(key)}`));
    checks.append(lab);
  });
  const build = button("미리보기/출력");
  const preview = el("section", "panel print-area premium-report");
  build.addEventListener("click", () => {
    const selected = [...checks.querySelectorAll("[data-print-key]:checked")].map((x) => x.dataset.printKey);
    if (format.value === "CSV") return exportSelectedKeys(selected);
    preview.innerHTML = `<div class="report-cover"><h1>${escapeHtml(store.settings.siteName)} 보고서</h1><p>${today}</p></div>${selected.map(printSection).join("")}`;
    if (format.value === "PDF/프린트") window.print();
  });
  section.append(checks, build);
  content.append(section, preview);
}

function ensureFloatingButtons() {
  let tools = document.getElementById("floatingTools");
  if (!tools) {
    tools = el("div", "floating-tools");
    tools.id = "floatingTools";
    document.body.append(tools);
  }
  tools.replaceChildren();
  const time = button("시", "float-btn");
  time.title = "시간표 빠른 보기";
  time.addEventListener("click", () => showQuickPopup("timetable"));
  const meal = button("식", "float-btn");
  meal.title = "급식 빠른 보기";
  meal.addEventListener("click", () => showQuickPopup("meals"));
  tools.append(time, meal);
}

function showQuickPopup(type) {
  const old = document.getElementById("quickPopup");
  if (old) old.remove();
  const wrap = el("div", "quick-popup");
  wrap.id = "quickPopup";
  const head = el("div", "panel-head");
  head.append(el("h3", "", type === "meals" ? "급식 빠른 보기" : "시간표 빠른 보기"));
  const close = button("×", "icon-button");
  close.addEventListener("click", () => wrap.remove());
  head.append(close);
  wrap.append(head);
  if (type === "meals") (store.meals || []).slice(0, 7).forEach((row) => wrap.append(el("p", "", `${row.date} ${row.meal}: ${row.menu}`)));
  else (store.timetable || []).slice(0, 12).forEach((row) => wrap.append(el("p", "", `${row.day} ${row.period} ${row.subject} ${row.teacher || ""} ${row.room || ""}`)));
  document.body.append(wrap);
}

function downloadOmrCard() {
  const html = `<!doctype html><meta charset="utf-8"><title>OMR 카드</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;text-align:center}.bubble{display:inline-block;border:1px solid #333;border-radius:50%;width:24px;height:24px;line-height:24px;margin:2px}</style><h1>OMR 카드</h1><p>이름: ____________ 학번: ____________ 시험명: ____________</p><table><thead><tr><th>번호</th><th>①</th><th>②</th><th>③</th><th>④</th><th>⑤</th></tr></thead><tbody>${Array.from({ length: 50 }, (_, i) => `<tr><td>${i + 1}</td><td><span class="bubble">1</span></td><td><span class="bubble">2</span></td><td><span class="bubble">3</span></td><td><span class="bubble">4</span></td><td><span class="bubble">5</span></td></tr>`).join("")}</tbody></table>`;
  exportCsv(`OMR카드_${today}.html`, html);
}

function inputNodeV4(name, label, type, requiredOrOptions, value) {
  let node;
  const options = Array.isArray(requiredOrOptions) ? requiredOrOptions : null;
  if (options) {
    node = document.createElement("select");
    options.forEach((item) => node.append(option(item, item)));
    node.value = value || options[0] || "";
  } else if (type === "textarea") {
    node = document.createElement("textarea");
    node.value = value || "";
  } else {
    node = document.createElement("input");
    node.type = type || "text";
    node.value = value || defaultValue(name, type);
  }
  node.name = name;
  if (requiredOrOptions === true) node.required = true;
  return makeField(label, `field-${name}`, node);
}

function bindNoticeSourceV4() {
  const source = editorFields.querySelector('[name="source"]');
  const subject = editorFields.querySelector('[name="subject"]');
  if (!source || !subject) return;
  const sync = () => {
    const isSystem = source.value === "시스템";
    subject.disabled = isSystem;
    if (isSystem) subject.value = "";
  };
  source.addEventListener("change", sync);
  sync();
}

function visibleNotices() {
  return (store.notices || []).filter((row) => row.source !== "시스템" || store.settings.systemNoticeEnabled);
}

function uniqueValuesFor(field) {
  return [...new Set(Object.values(store).flatMap((value) => Array.isArray(value) ? value.map((row) => row[field]).filter(Boolean) : []))];
}

function labelFor(field) {
  return labels[field] || { meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모" }[field] || field;
}

function option(value, text) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = text;
  return item;
}

function button(text, className = "") {
  const item = document.createElement("button");
  item.type = "button";
  item.className = className;
  item.textContent = text;
  return item;
}

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

function panel(title) {
  const section = el("section", "panel");
  if (title !== undefined) {
    const head = el("div", "panel-head");
    if (title) head.append(el("h3", "", title));
    section.append(head);
  }
  return section;
}

function downloadReportV4(key) {
  const rows = store[key] || [];
  const cols = columnsForV4(key);
  const html = `<!doctype html><meta charset="utf-8"><title>${pageLabel(key)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111827}h1{text-align:center}table{width:100%;border-collapse:collapse;margin-top:24px}th{background:#f3f4f6}th,td{border:1px solid #d1d5db;padding:10px;text-align:left;vertical-align:top}</style><h1>${pageLabel(key)} 보고서</h1><p>생성일: ${today}</p><table><thead><tr>${cols.map((c) => `<th>${labelFor(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  exportCsv(`${pageLabel(key)}_보고서_${today}.html`, html);
}

function extendAppV5() {
  const savedAccounts = JSON.parse(localStorage.getItem("pm-accounts-v5") || "null");
  if (Array.isArray(savedAccounts)) accounts = savedAccounts;
  store.settings.timetablePeriods ??= 8;
  store.settings.examSelectedIds ??= [];
  store.settings.filterHidden ??= {};
  (store.notices || []).forEach((row) => {
    row.deadline_required ??= row.deadline_date ? "필요" : "불필요";
    row.deadline_date ??= "";
    row.memo ??= "";
  });
  (store.exams || []).forEach((row) => {
    row.rank ??= "";
    row.student_count ??= "";
    row.percentile ??= "";
    row.grade_level ??= "";
    row.exam_group ??= row.date || today;
    row.memo ??= row.analysis || "";
  });
  saveStore();
}

function saveAccountsV5() {
  localStorage.setItem("pm-accounts-v5", JSON.stringify(accounts));
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV5();
  if (key === "dashboard") return renderDashboardV5();
  if (key === "personal") return renderPersonalV4();
  if (key === "meals") return renderCollectionV5("meals");
  if (key === "budget") return renderCollectionV5("budget");
  if (key === "clubs") return renderCollectionV5("clubs");
  if (key === "notices") return renderCollectionV5("notices");
  if (key === "penalties") return renderPenaltiesV5();
  if (key === "timetable") return renderTimetableV5();
  if (key === "print") return renderPrintV5();
  if (key === "admin") return renderAdminV5();
  if (key === "site") return renderSiteV4();
  if (key === "exams") return renderExamsV5();
  renderCollectionV5(key);
}

function updateRequestBadgeV5() {
  const siteBtn = document.querySelector('[data-page="site"] span:last-child');
  if (!siteBtn || !isAdmin()) return;
  const count = (store.requests || []).filter((row) => row.status === "접수" || row.status === "검토 중").length;
  siteBtn.textContent = count ? `${pageLabel("site")} (${count})` : pageLabel("site");
}

function renderDashboardV5() {
  const blocks = [
    ["schedules", "일정", store.schedules || []],
    ["notices", "공지", visibleNotices() || []],
    ["meals", "급식", store.meals || []],
    ["assignments", "과제", store.assignments || []],
    ["exams", "시험", store.exams || []],
    ["portfolios", "포트폴리오", store.portfolios || []],
    ["penalties", "벌점", store.penalties || []],
    ["timetable", "시간표", store.timetable || []],
    ["clubs", "동아리", store.clubs || []]
  ];
  content.replaceChildren();
  if (store.settings.systemNoticeEnabled) {
    const notice = el("div", "system-notice");
    notice.append(el("strong", "", "시스템 공지"), el("span", "", store.settings.systemNotice || ""));
    content.append(notice);
  }
  const quick = panel("빠른 등록");
  const actions = el("div", "quick-actions");
  (store.settings.quickButtons || []).forEach((key) => {
    const btn = button(`${pageLabel(key)} 추가`);
    btn.disabled = !can("create", key);
    btn.addEventListener("click", () => openEditorV5(key));
    actions.append(btn);
  });
  quick.append(actions);
  content.append(quick);
  const grid = el("div", "dashboard-grid");
  blocks.forEach(([key, title, rows]) => grid.append(dashboardBoxV5(key, title, rows)));
  content.append(grid);
}

function dashboardBoxV5(key, title, rows) {
  const box = panel("");
  box.classList.add("dash-box");
  const head = el("div", "panel-head");
  head.append(el("h3", "", title));
  const more = button("더보기", "ghost small");
  more.addEventListener("click", () => renderPage(key));
  head.append(more);
  const list = el("div", "scroll-list");
  if (!rows.length) list.append(el("div", "empty", "항목 없음"));
  rows.slice(0, 80).forEach((row) => {
    const line = button(summaryTextV5(row), "dash-view-row");
    line.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    list.append(line);
  });
  box.append(head, list);
  return box;
}

function summaryTextV5(row) {
  return [row.date || row.notice_date || "", row.title || row.name || row.subject || row.meal || "", row.menu || row.content || row.memo || row.analysis || ""].filter(Boolean).join(" · ");
}

function showViewerV5(title, row) {
  messageTitle.textContent = title;
  messageBody.replaceChildren();
  const box = el("div", "detail-grid");
  Object.entries(row).filter(([key]) => key !== "id").forEach(([key, value]) => {
    const item = el("div", "info-box");
    item.append(el("span", "", labelFor(key)), el("strong", "", String(value || "")));
    box.append(item);
  });
  messageBody.append(box);
  messageDialog.showModal();
}

function renderCollectionV5(key) {
  content.replaceChildren();
  const rows = filteredRowsV5(key);
  if (key === "penalties") {
    const total = (store.penalties || []).reduce((sum, row) => sum + Number(row.points || 0), 0);
    const stat = el("div", "stats");
    const item = el("div", "stat");
    item.append(el("span", "", "현재 벌점 합계"), el("strong", "", `${total}점`), el("span", "", "관리자만 수정/삭제 가능"));
    stat.append(item);
    content.append(stat);
  }
  const section = panel(pageLabel(key));
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  if (key === "meals") actions.append(mealImportButtonV5());
  const download = button("보고서 다운로드", "ghost");
  download.addEventListener("click", () => downloadReportV5(key, rows));
  const add = button("새 항목");
  add.disabled = !can("create", key);
  add.addEventListener("click", () => openEditorV5(key));
  actions.append(download, add);
  head.append(actions);
  section.append(filterBarV5(key), tableV5(key, rows));
  content.append(section);
}

function renderPenaltiesV5() {
  renderCollectionV5("penalties");
}

function filterBarV5(key) {
  const bar = el("div", "toolbar");
  const fields = [...new Set(["subject", "teacher", "location", "phone", "email", ...columnsForV5(key).slice(0, 5)])].filter((field) => field !== "id");
  fields.forEach((field) => {
    if (store.settings.filterHidden?.[field]) return;
    const input = document.createElement("input");
    input.dataset.filter = field;
    input.placeholder = `${labelFor(field)} 검색`;
    input.value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
    input.addEventListener("input", () => sessionStorage.setItem(`filter:${key}:${field}`, input.value));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") renderPage(key); });
    bar.append(input);
  });
  const apply = button("검색", "ghost");
  apply.addEventListener("click", () => renderPage(key));
  const reset = button("필터 초기화", "ghost");
  reset.addEventListener("click", () => {
    fields.forEach((field) => sessionStorage.removeItem(`filter:${key}:${field}`));
    globalSearch.value = "";
    renderPage(key);
  });
  bar.append(apply, reset);
  return bar;
}

function filteredRowsV5(key) {
  const query = globalSearch.value.trim().toLowerCase();
  return (key === "notices" ? visibleNotices() : (store[key] || [])).filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query)) return false;
    const fields = [...new Set(["subject", "teacher", "location", "phone", "email", ...columnsForV5(key).slice(0, 5)])];
    return fields.every((field) => {
      const value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
      return !value || String(row[field] || "").includes(value);
    });
  });
}

function columnsForV5(key) {
  return {
    notices: ["title", "source", "subject", "importance", "notice_date", "deadline_required", "deadline_date", "content", "memo", "visibility"],
    meals: ["date", "meal", "menu", "calories", "memo"],
    budget: ["date", "type", "category", "amount", "title", "method", "memo"],
    clubs: ["name", "role", "teacher", "location", "schedule", "memo"],
    penalties: ["date", "title", "points", "reason", "status"],
    exams: ["date", "title", "subject", "score", "rank", "student_count", "percentile", "grade_level", "average", "high_score", "memo"]
  }[key] || columns[key] || [];
}

function fieldsForV5(key) {
  const map = {
    notices: [["title", "제목", "text", true], ["source", "출처", "select", ["학교", "학원", "선생님", "시스템", "기타"]], ["subject", "과목", "select", ["", "공통", ...subjectsList()]], ["importance", "중요도", "select", ["낮음", "보통", "높음", "매우 높음"]], ["notice_date", "공지일", "date"], ["deadline_required", "마감일 여부", "select", ["불필요", "필요"]], ["deadline_date", "마감일", "date"], ["content", "내용", "textarea"], ["memo", "메모", "textarea"], ["visibility", "공개", "select", ["일반 공개", "관리자 전용"]]],
    meals: [["date", "날짜", "date", true], ["meal", "구분", "select", ["아침", "점심", "저녁", "간식"]], ["menu", "메뉴", "textarea", true], ["calories", "열량", "text"], ["memo", "메모", "textarea"]],
    penalties: [["date", "날짜", "date"], ["title", "벌점 항목", "text", true], ["points", "벌점 점수", "select", ["1", "2", "3", "4", "5", "10"]], ["reason", "사유", "textarea"], ["status", "상태", "select", ["등록됨", "확인 완료", "이의제기", "해결됨"]]]
  };
  return map[key] || fieldsForV4(key);
}

function tableV5(key, rows) {
  if (!rows.length) return el("div", "empty", "항목이 없습니다.");
  const cols = columnsForV5(key);
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  cols.forEach((col) => hr.append(el("th", "", labelFor(col))));
  hr.append(el("th", "", "관리"));
  thead.append(hr);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => tr.append(el("td", "", row[col] || "")));
    const td = el("td", "row-actions");
    const view = button("보기", "ghost");
    view.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    const edit = button(can("edit", key) ? "수정" : "수정 요청", "ghost");
    edit.addEventListener("click", () => can("edit", key) ? openEditorV5(key, row.id) : requestEdit(key, row.id));
    td.append(view, edit);
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      td.append(del);
    }
    tr.append(td);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function openEditorV5(key, id = null) {
  if (id && !can("edit", key)) return requestEdit(key, id);
  if (!id && !can("create", key)) return;
  const row = id ? (store[key] || []).find((item) => item.id === id) : {};
  editing = { key, id, origin: key, v5: true };
  dialogTitle.textContent = `${pageLabel(key)} ${id ? "수정" : "추가"}`;
  editorFields.replaceChildren();
  fieldsForV5(key).forEach(([name, label, type, requiredOrOptions]) => editorFields.append(inputNodeV4(name, label, type, requiredOrOptions, row?.[name] || "")));
  if (id) editorFields.append(inputNodeV4("_confirm_password", "현재 비밀번호", "password", true, ""));
  if (key === "notices") bindNoticeEditorV5();
  editorError.textContent = "";
  editorDialog.showModal();
}

function bindNoticeEditorV5() {
  const source = editorFields.querySelector('[name="source"]');
  const subject = editorFields.querySelector('[name="subject"]');
  const deadlineRequired = editorFields.querySelector('[name="deadline_required"]');
  const deadlineDate = editorFields.querySelector('[name="deadline_date"]');
  const sync = () => {
    if (source && subject) {
      const isSystem = source.value === "시스템";
      subject.disabled = isSystem;
      if (isSystem) subject.value = "";
    }
    if (deadlineRequired && deadlineDate) {
      const needed = deadlineRequired.value === "필요";
      deadlineDate.disabled = !needed;
      if (!needed) deadlineDate.value = "";
    }
  };
  source?.addEventListener("change", sync);
  deadlineRequired?.addEventListener("change", sync);
  sync();
}

function mealImportButtonV5() {
  const wrap = el("span", "file-action");
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,.txt,.xlsx,.xls,.hwp";
  input.hidden = true;
  input.addEventListener("change", () => importMealsV5(input.files[0]));
  const btn = button("급식 파일 업로드", "ghost");
  btn.addEventListener("click", () => input.click());
  wrap.append(input, btn);
  return wrap;
}

function importMealsV5(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "");
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed = lines.slice(lines[0]?.includes("date") || lines[0]?.includes("날짜") ? 1 : 0).map((line) => {
      const cells = line.split(/,|\t/).map((cell) => cell.trim());
      return { id: Date.now() + Math.random(), date: cells[0] || today, meal: cells[1] || "점심", menu: cells[2] || cells.join(" "), calories: cells[3] || "", memo: cells[4] || "" };
    });
    store.meals.unshift(...parsed);
    saveStore();
    renderPage("meals");
    showMessage("업로드 완료", "CSV/텍스트 형식의 급식 자료를 불러왔습니다. 엑셀/한글 파일은 CSV로 저장해서 올리면 가장 안정적입니다.");
  };
  reader.readAsText(file, "utf-8");
}

function renderTimetableV5() {
  const setId = sessionStorage.getItem("pm-timetable-set") || store.timetableSets[0]?.id || "school";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const periods = Array.from({ length: Number(store.settings.timetablePeriods || 8) }, (_, i) => `${i + 1}교시`);
  const times = ["08:40-09:25", "09:35-10:20", "10:30-11:15", "11:25-12:10", "13:10-13:55", "14:05-14:50", "15:00-15:45", "15:55-16:40", "16:50-17:35", "17:45-18:30", "19:00-19:50", "20:00-20:50"];
  content.replaceChildren();
  const section = panel("시간표");
  const tools = el("div", "toolbar");
  const selector = document.createElement("select");
  store.timetableSets.forEach((set) => selector.append(option(set.id, set.name)));
  selector.value = setId;
  selector.addEventListener("change", () => { sessionStorage.setItem("pm-timetable-set", selector.value); renderTimetableV5(); });
  const rename = button("선택 이름 수정", "ghost");
  rename.addEventListener("click", () => {
    const set = store.timetableSets.find((item) => item.id === selector.value);
    const next = prompt("시간표 이름", set?.name || "");
    if (next && set) { set.name = next; saveStore(); renderTimetableV5(); }
  });
  const addSet = button("시간표 추가", "ghost");
  addSet.addEventListener("click", () => {
    const name = prompt("새 시간표 이름", "새 시간표");
    if (!name) return;
    const id = `set-${Date.now()}`;
    store.timetableSets.push({ id, name, type: "사용자" });
    sessionStorage.setItem("pm-timetable-set", id);
    saveStore();
    renderTimetableV5();
  });
  const deleteSet = button("시간표 삭제", "danger");
  deleteSet.addEventListener("click", () => {
    if (!isAdmin()) return showMessage("권한 없음", "시간표 삭제는 관리자만 가능합니다.");
    markWorkspaceDeleted("timetableSets", selector.value);
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((item) => (item.setId || "school") === selector.value));
    store.timetableSets = store.timetableSets.filter((item) => item.id !== selector.value);
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((item) => (item.setId || "school") === selector.value));
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((item) => (item.setId || "school") === selector.value));
    store.timetable = store.timetable.filter((item) => (item.setId || "school") !== selector.value);
    sessionStorage.removeItem("pm-timetable-set");
    saveStore();
    renderTimetableV5();
  });
  const clearSet = button("선택 시간표 일괄 삭제", "danger");
  clearSet.addEventListener("click", () => {
    if (!isAdmin()) return showMessage("권한 없음", "일괄 삭제는 관리자만 가능합니다.");
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((item) => (item.setId || "school") === selector.value));
    store.timetable = store.timetable.filter((item) => (item.setId || "school") !== selector.value);
    saveStore();
    renderTimetableV5();
  });
  const addPeriod = button("교시 추가", "ghost");
  addPeriod.addEventListener("click", () => { store.settings.timetablePeriods = Number(store.settings.timetablePeriods || 8) + 1; saveStore(); renderTimetableV5(); });
  tools.append(selector, rename, addSet, deleteSet, clearSet, addPeriod);
  section.append(tools);
  const grid = el("div", "timetable-grid");
  grid.style.gridTemplateColumns = "120px repeat(7, minmax(120px, 1fr))";
  grid.append(makeTimeHead("교시/시간"), ...days.map(makeTimeHead));
  periods.forEach((period, i) => {
    const timeBox = el("div", "tt-time");
    timeBox.append(el("strong", "", period), el("span", "", times[i] || ""));
    grid.append(timeBox);
    days.forEach((day) => grid.append(makeTimeCellV4(setId, day, period, times[i] || "")));
  });
  section.append(grid);
  content.append(section);
}

function showQuickPopup(type) {
  const old = document.getElementById("quickPopup");
  if (old) old.remove();
  const wrap = el("div", "quick-popup");
  wrap.id = "quickPopup";
  const head = el("div", "panel-head");
  head.append(el("h3", "", type === "meals" ? "급식 빠른 보기" : "시간표 빠른 보기"));
  const close = button("×", "icon-button");
  close.addEventListener("click", () => wrap.remove());
  head.append(close);
  wrap.append(head);
  if (type === "meals") {
    (store.meals || []).slice(0, 7).forEach((row) => wrap.append(el("p", "", `${row.date} ${row.meal}: ${row.menu}`)));
  } else {
    quickTimetableRowsV5().forEach((row) => wrap.append(el("p", "", `${row.day} ${row.period} ${row.subject} ${row.teacher || ""} ${row.room || ""}`)));
  }
  document.body.append(wrap);
}

function quickTimetableRowsV5() {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const now = new Date();
  const todayName = dayNames[now.getDay()];
  const hour = now.getHours();
  let rows = (store.timetable || []).filter((row) => row.day === todayName).sort((a, b) => Number(String(a.period).replace(/\D/g, "")) - Number(String(b.period).replace(/\D/g, "")));
  const lastPeriod = Math.max(0, ...rows.map((row) => Number(String(row.period).replace(/\D/g, ""))));
  if ((hour >= 16 && lastPeriod <= 6) || !rows.length) {
    const tomorrow = dayNames[(now.getDay() + 1) % 7];
    rows = (store.timetable || []).filter((row) => row.day === tomorrow).sort((a, b) => Number(String(a.period).replace(/\D/g, "")) - Number(String(b.period).replace(/\D/g, "")));
  }
  return rows.slice(0, 12);
}

function renderAdminV5() {
  content.replaceChildren();
  const stats = el("div", "stats");
  const reqCount = (store.requests || []).filter((row) => row.status === "접수" || row.status === "검토 중").length;
  [["공지 활성", store.settings.systemNoticeEnabled ? "활성" : "비활성", "대시보드/시스템 공지 표시"], ["수정 요청", reqCount, "관리자 검토 필요"], ["시스템 상태", "정상", "로컬 저장소 기반"], ["계정 수", accounts.length, "관리자/일반/프린트"]].forEach(([a, b, c]) => {
    const item = el("div", "stat");
    item.append(el("span", "", a), el("strong", "", String(b)), el("span", "", c));
    stats.append(item);
  });
  content.append(stats);
  const section = panel("계정별 권한");
  const accountSelect = document.createElement("select");
  accounts.forEach((account) => accountSelect.append(option(String(account.id), `${account.name} · ${roleName(account.role)}`)));
  const roleSelect = document.createElement("select");
  ["admin", "user", "print"].forEach((role) => roleSelect.append(option(role, roleName(role))));
  const pw = document.createElement("input");
  pw.placeholder = "새 비밀번호";
  const permBox = el("div", "check-grid");
  const renderPerms = () => {
    const account = accounts.find((item) => String(item.id) === accountSelect.value);
    if (!account) return;
    roleSelect.value = account.role;
    permBox.replaceChildren();
    Object.keys(permissions).forEach((key) => ["create", "edit", "del"].forEach((action) => {
      const lab = document.createElement("label");
      const check = document.createElement("input");
      check.type = "checkbox";
      account.permissions ??= {};
      account.permissions[key] ??= {};
      check.checked = account.permissions[key][action] ?? (permissions[key]?.[action] || []).includes(account.role);
      check.addEventListener("change", () => {
        account.permissions[key][action] = check.checked;
        saveAccountsV5();
      });
      lab.append(check, document.createTextNode(` ${pageLabel(key)} ${action}`));
      permBox.append(lab);
    }));
  };
  accountSelect.addEventListener("change", renderPerms);
  roleSelect.addEventListener("change", () => {
    const account = accounts.find((item) => String(item.id) === accountSelect.value);
    if (account) { account.role = roleSelect.value; saveAccountsV5(); renderPerms(); buildNav(); }
  });
  const pwBtn = button("선택 계정 PW 변경", "ghost");
  pwBtn.addEventListener("click", () => {
    const account = accounts.find((item) => String(item.id) === accountSelect.value);
    if (account && pw.value) { account.password = pw.value; saveAccountsV5(); showMessage("변경 완료", "선택 계정 비밀번호가 변경되었습니다."); pw.value = ""; }
  });
  const sys = document.createElement("select");
  sys.append(option("on", "시스템 공지 활성"), option("off", "시스템 공지 비활성"));
  sys.value = store.settings.systemNoticeEnabled ? "on" : "off";
  sys.addEventListener("change", () => { store.settings.systemNoticeEnabled = sys.value === "on"; saveStore(); renderAdminV5(); });
  section.append(makeField("계정 선택", "accountPermSelect", accountSelect), makeField("역할", "accountRoleSelect", roleSelect), makeField("공지 상태", "adminNoticeState", sys), pw, pwBtn, permBox);
  content.append(section);
  renderPerms();
}

function renderPrintV5() {
  const keys = currentUser?.role === "print" ? ["schedules", "notices", "meals", "assignments", "exams", "portfolios", "penalties", "clubs"] : ["schedules", "notices", "meals", "assignments", "exams", "portfolios", "penalties", "clubs", "budget"];
  content.replaceChildren();
  const section = panel("프린트 센터");
  const format = document.createElement("select");
  ["보고서", "표 다운로드", "PDF/프린트", "CSV"].forEach((x) => format.append(option(x, x)));
  section.append(makeField("형식", "printFormatV5", format));
  const lists = el("div", "print-lists");
  keys.forEach((key) => {
    const box = el("div", "print-list");
    box.append(el("h3", "", pageLabel(key)));
    (store[key] || []).forEach((row) => {
      const lab = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.printKey = key;
      input.dataset.rowId = String(row.id);
      input.checked = key !== "budget";
      lab.append(input, document.createTextNode(` ${summaryTextV5(row)}`));
      box.append(lab);
    });
    lists.append(box);
  });
  const examSchedule = button("선택 시험일정 표 다운로드", "ghost");
  examSchedule.addEventListener("click", () => downloadExamScheduleV5(selectedPrintRowsV5("exams")));
  const build = button("미리보기/출력");
  const preview = el("section", "panel print-area premium-report");
  build.addEventListener("click", () => {
    const grouped = {};
    lists.querySelectorAll("[data-print-key]:checked").forEach((input) => {
      grouped[input.dataset.printKey] ??= [];
      const row = (store[input.dataset.printKey] || []).find((item) => String(item.id) === input.dataset.rowId);
      if (row) grouped[input.dataset.printKey].push(row);
    });
    if (format.value === "CSV") return exportCsv(`선택자료_${today}.csv`, Object.entries(grouped).map(([key, rows]) => `[${pageLabel(key)}]\n${rowsToCsv(rows, columnsForV5(key))}`).join("\n\n"));
    if (format.value === "표 다운로드") return downloadPrintTableV5(grouped);
    preview.innerHTML = `<div class="report-cover"><h1>${escapeHtml(store.settings.siteName)} 보고서</h1><p>${today}</p></div>${Object.entries(grouped).map(([key, rows]) => printRowsSectionV5(key, rows)).join("")}`;
    if (format.value === "PDF/프린트") window.print();
  });
  section.append(lists, examSchedule, build);
  content.append(section, preview);
}

function selectedPrintRowsV5(key) {
  return [...content.querySelectorAll(`[data-print-key="${key}"]:checked`)].map((input) => (store[key] || []).find((row) => String(row.id) === input.dataset.rowId)).filter(Boolean);
}

function printRowsSectionV5(key, rows) {
  const cols = columnsForV5(key);
  return `<section class="report-section"><h2>${pageLabel(key)}</h2>${rows.length ? `<table><thead><tr>${cols.map((c) => `<th>${labelFor(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>` : `<p>선택 항목 없음</p>`}</section>`;
}

function downloadPrintTableV5(grouped) {
  const html = `<!doctype html><meta charset="utf-8"><title>선택 자료 표</title><style>${reportCssV5()}</style><h1>선택 자료 표</h1>${Object.entries(grouped).map(([key, rows]) => printRowsSectionV5(key, rows)).join("")}`;
  exportCsv(`선택자료_표_${today}.html`, html);
}

function downloadExamScheduleV5(rows) {
  const target = rows.length ? rows : (store.exams || []);
  const cols = ["date", "title", "subject", "teacher", "scope", "memo"];
  const html = `<!doctype html><meta charset="utf-8"><title>시험일정표</title><style>${reportCssV5()}</style><h1>시험일정표</h1><table><thead><tr>${cols.map((c) => `<th>${labelFor(c)}</th>`).join("")}</tr></thead><tbody>${target.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  exportCsv(`시험일정표_${today}.html`, html);
}

function renderExamsV5() {
  content.replaceChildren();
  const filters = panel("시험 조회");
  const row = el("div", "exam-filter");
  const start = document.createElement("input");
  start.type = "date";
  start.id = "examStartV5";
  start.value = sessionStorage.getItem("examStartV5") || "";
  const end = document.createElement("input");
  end.type = "date";
  end.id = "examEndV5";
  end.value = sessionStorage.getItem("examEndV5") || "";
  const subject = document.createElement("select");
  subject.id = "examSubjectV5";
  subject.append(option("", "과목 전체"));
  subjectsList().forEach((name) => subject.append(option(name, name)));
  subject.value = sessionStorage.getItem("examSubjectV5") || "";
  const search = button("검색");
  search.addEventListener("click", () => {
    sessionStorage.setItem("examStartV5", start.value);
    sessionStorage.setItem("examEndV5", end.value);
    sessionStorage.setItem("examSubjectV5", subject.value);
    renderExamsV5();
  });
  const omr = button("OMR카드 DOWN", "ghost");
  omr.addEventListener("click", downloadOmrCard);
  row.append(makeField("시작일", "examStartV5", start), makeField("종료일", "examEndV5", end), makeField("과목", "examSubjectV5", subject), search, omr);
  filters.append(row);
  const layout = el("div", "exam-layout");
  const left = panel("시험 목록");
  left.append(examGroupedListV5());
  const center = panel("시험 정보");
  const selected = selectedExamV5();
  center.append(examDetailV5(selected));
  const right = panel("성적 분석");
  right.append(examAnalysisV5());
  layout.append(left, center, right);
  content.append(filters, layout);
}

function filteredExamsV5() {
  const start = sessionStorage.getItem("examStartV5") || "";
  const end = sessionStorage.getItem("examEndV5") || "";
  const subject = sessionStorage.getItem("examSubjectV5") || "";
  return (store.exams || []).filter((row) => {
    if (start && row.date < start) return false;
    if (end && row.date > end) return false;
    if (subject && row.subject !== subject) return false;
    return true;
  });
}

function examGroupedListV5() {
  const wrap = el("div", "exam-groups");
  const groups = {};
  filteredExamsV5().forEach((row) => { groups[row.date || "날짜 없음"] ??= []; groups[row.date || "날짜 없음"].push(row); });
  Object.entries(groups).forEach(([date, rows]) => {
    const details = document.createElement("details");
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = `${date} (${rows.length})`;
    details.append(summary);
    rows.forEach((row) => {
      const line = el("label", "exam-line");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = (store.settings.examSelectedIds || []).includes(row.id);
      check.addEventListener("change", () => {
        const set = new Set(store.settings.examSelectedIds || []);
        check.checked ? set.add(row.id) : set.delete(row.id);
        store.settings.examSelectedIds = [...set];
        saveStore();
        renderExamsV5();
      });
      const btn = button(`${row.subject || ""} · ${row.title || ""}`, "ghost");
      btn.addEventListener("click", () => { sessionStorage.setItem("selectedExamV5", String(row.id)); renderExamsV5(); });
      line.append(check, btn);
      details.append(line);
    });
    wrap.append(details);
  });
  const add = button("시험 등록");
  add.disabled = !can("create", "exams");
  add.addEventListener("click", () => {
    store.exams.unshift({ id: Date.now(), date: today, title: "새 시험", subject: subjectsList()[0] || "", teacher: "", scope: "", score: 0, raw_score: 0, average: 0, high_score: 0, rank: "", student_count: "", percentile: "", grade_level: "", memo: "" });
    saveStore();
    sessionStorage.setItem("selectedExamV5", String(store.exams[0].id));
    renderExamsV5();
  });
  wrap.append(add);
  return wrap;
}

function selectedExamV5() {
  const id = Number(sessionStorage.getItem("selectedExamV5") || "");
  return (store.exams || []).find((row) => row.id === id) || filteredExamsV5()[0] || {};
}

function examDetailV5(row) {
  const form = el("div", "exam-form");
  const editable = can("edit", "exams");
  const fields = [["title", "시험명"], ["date", "시험일자", "date"], ["subject", "과목"], ["teacher", "선생님"], ["scope", "범위"], ["score", "점수", "number"], ["raw_score", "원점수", "number"], ["rank", "석차", "number"], ["student_count", "응시인원", "number"], ["percentile", "백분위", "number"], ["grade_level", "등급"], ["average", "평균", "number"], ["high_score", "최고점", "number"], ["memo", "메모"]];
  fields.forEach(([name, label, type]) => {
    const input = type === "textarea" || name === "memo" || name === "scope" ? document.createElement("textarea") : document.createElement("input");
    if (type) input.type = type;
    input.id = `examV5-${name}`;
    input.value = row?.[name] || "";
    input.disabled = !editable;
    form.append(makeField(label, input.id, input));
  });
  const answerPdf = document.createElement("input");
  answerPdf.type = "file";
  answerPdf.accept = ".pdf";
  answerPdf.disabled = !editable;
  const minePdf = document.createElement("input");
  minePdf.type = "file";
  minePdf.accept = ".pdf,image/*";
  minePdf.disabled = !editable;
  form.append(makeField("정답 PDF", "examV5AnswerPdf", answerPdf), makeField("내답/OMR 파일", "examV5MinePdf", minePdf));
  if (editable && row.id) {
    const save = button("시험 정보 저장");
    save.addEventListener("click", () => {
      fields.forEach(([name]) => { row[name] = document.getElementById(`examV5-${name}`).value; });
      row.raw_score = row.raw_score || row.score;
      row.answerPdf = answerPdf.files[0]?.name || row.answerPdf || "";
      row.omrImage = minePdf.files[0]?.name || row.omrImage || "";
      saveStore();
      renderExamsV5();
    });
    form.append(save);
  } else if (!editable) {
    form.append(el("p", "muted", "일반 계정은 시험 등록과 조회만 가능하고, 기존 시험 수정은 관리자에게 요청해야 합니다."));
  }
  return form;
}

function examAnalysisV5() {
  const selected = new Set(store.settings.examSelectedIds || []);
  const rows = (store.exams || []).filter((row) => selected.size ? selected.has(row.id) : true);
  const bySubject = {};
  rows.forEach((row) => {
    bySubject[row.subject || "기타"] ??= [];
    bySubject[row.subject || "기타"].push(Number(row.score || row.raw_score || 0));
  });
  const wrap = el("div", "analysis-list");
  Object.entries(bySubject).forEach(([subject, scores]) => {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const item = el("div", "analysis-card");
    item.append(el("h3", "", subject), el("p", "", `선택 시험 ${scores.length}개 · 평균 ${avg}점`));
    const bar = el("div", "bar");
    const fill = document.createElement("i");
    fill.style.width = `${Math.min(100, avg)}%`;
    bar.append(fill);
    item.append(bar);
    wrap.append(item);
  });
  return wrap;
}

function downloadReportV5(key, rows = store[key] || []) {
  const cols = columnsForV5(key);
  const html = `<!doctype html><meta charset="utf-8"><title>${pageLabel(key)}</title><style>${reportCssV5()}</style><h1>${pageLabel(key)} 보고서</h1><p>생성일: ${today}</p><table><thead><tr>${cols.map((c) => `<th>${labelFor(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  exportCsv(`${pageLabel(key)}_보고서_${today}.html`, html);
}

function reportCssV5() {
  return "body{font-family:Arial,'Malgun Gothic',sans-serif;padding:32px;color:#111827}h1{text-align:center;margin-bottom:8px}h2{margin-top:32px;border-bottom:2px solid #111827;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:18px}th{background:#eef2f7;font-weight:700}th,td{border:1px solid #cfd8e3;padding:10px;text-align:left;vertical-align:top}.report-section{text-align:center}.report-section table{text-align:left}";
}

function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위"
  }[field] || field;
}

function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위",
    year: "시험년도", grade: "학년", base_score: "기본점수", examPaperPdf: "시험지", time: "시간", place: "장소", activity: "활동명", competency: "역량", evidence: "근거자료", draft: "세특 초안", end_date: "마지막날짜",
    lesson_date: "수업일", day: "요일", period: "교시", summary: "요약", content: "내용", homework: "과제", late: "지각 여부", attendance_note: "출결 메모",
    title: "제목", category: "분류", area: "영역", owner: "담당자", members: "팀원", start_date: "시작일", priority: "우선순위", progress: "진행상태", percent: "진행률", goal: "목표", next_action: "다음 할 일", links: "자료/링크",
    reporter: "제보자", severity: "심각도", status: "상태", page: "위치"
  }[field] || field;
}

function navKeys() {
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "notices", "examSchedules", "meals", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "projects", "portfolios", "penalties", "timetable", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "system", "print");
  return keys;
}

function buildNav() {
  ensureAppV12();
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
  });
}

function renderPage(key) {
  ensureAppV12();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();

  if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV8();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "clubs") renderCollectionV7("clubs");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV8();
  else if (key === "admin") renderAdminV12();
  else if (key === "site") renderSiteV9();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);

  appendSystemReportBoxV12();
}

ensureAppV12();
if (currentUser) {
  buildNav();
  renderPage(currentPage || "dashboard");
}

function reportPageOptionsV13() {
  return navKeys()
    .filter((key) => key !== "system" && key !== "print")
    .map((key) => [pageLabel(key), pageLabel(key)]);
}

function renderSystemV12() {
  content.replaceChildren();
  const backup = panel("백업 및 복구");
  const actions = el("div", "row-actions system-actions");
  const backupBtn = button("현재 브라우저 데이터 백업 다운로드");
  backupBtn.addEventListener("click", downloadBackupV12);
  const restoreInput = document.createElement("input");
  restoreInput.type = "file";
  restoreInput.accept = ".json";
  restoreInput.hidden = true;
  restoreInput.addEventListener("change", () => restoreBackupV12(restoreInput.files[0]));
  const restoreBtn = button("백업 파일로 현재 브라우저 복구", "ghost");
  restoreBtn.addEventListener("click", () => restoreInput.click());
  actions.append(backupBtn, restoreInput, restoreBtn);
  backup.append(actions, systemWarningV12("이 백업/복구는 서버 DB나 공용 데이터를 건드리지 않고, 현재 브라우저의 로컬 저장소(localStorage)에 있는 자료만 대상으로 합니다. 복구하면 현재 브라우저에 저장된 내용이 백업 파일 내용으로 바뀌므로 실행 전 백업을 먼저 내려받으세요."));

  const reset = panel("현재 브라우저 로컬 데이터 초기화");
  const grid = el("div", "form-grid");
  grid.append(
    makePasswordField("1차 현재 관리자 비밀번호", "resetPassword", "현재 비밀번호"),
    makeTextField("2차 관리자 PIN", "resetPin", ""),
    makePasswordField("3차 고유 초기화 패스워드", "resetPhrase", "RESET-MY-WEB-2026"),
    makeTextField("확인 문구", "resetConfirm", "로컬데이터삭제")
  );
  const resetBtn = button("현재 브라우저 로컬 데이터만 초기화", "danger");
  resetBtn.addEventListener("click", resetSystemV12);
  reset.append(grid, resetBtn, systemWarningV12("절대 서버 DB나 공용 데이터를 삭제하지 않습니다. 이 버튼은 현재 로그인한 사용자가 이 브라우저에 저장해 둔 로컬 데이터만 삭제하고 기본 상태로 되돌립니다. 다른 기기, 다른 브라우저, 실제 서버 데이터에는 영향을 주지 않습니다. 실행하려면 비밀번호, PIN, 고유 패스워드, 확인 문구 '로컬데이터삭제'가 모두 필요합니다."));

  const reports = panel("오류 제보 목록");
  reports.append(tableGenericV12("systemReports", store.systemReports || []));
  content.append(backup, reset, reports);
}

function resetSystemV12() {
  if (document.getElementById("resetPassword").value !== currentUser.password) return showMessage("초기화 차단", "1차 인증 비밀번호가 올바르지 않습니다.");
  if (document.getElementById("resetPin").value !== currentUser.pin) return showMessage("초기화 차단", "2차 인증 PIN이 올바르지 않습니다.");
  if (document.getElementById("resetPhrase").value !== (store.settings.resetPassphrase || "RESET-MY-WEB-2026")) return showMessage("초기화 차단", "3차 고유 초기화 패스워드가 올바르지 않습니다.");
  if (document.getElementById("resetConfirm").value !== "로컬데이터삭제") return showMessage("초기화 차단", "확인 문구에 로컬데이터삭제를 정확히 입력해야 합니다.");

  resetCurrentWorkspaceDataV36();
  showMessage("초기화 완료", "현재 로그인한 계정의 workspace 데이터만 초기화했습니다.");
  return;
  resetCurrentWorkspaceDataV36();
  showMessage("초기화 완료", "현재 로그인한 계정의 workspace 데이터만 초기화했습니다.");
  return;
  resetCurrentWorkspaceDataV36();
  showMessage("초기화 완료", "현재 로그인한 계정의 workspace 데이터만 초기화했습니다.");
  return;
  localStorage.removeItem("pm-store-v3");
  localStorage.removeItem("pm-accounts-v5");
  store = structuredClone(initialStore);
  accounts = [];
  ensureAppV12();
  saveAccountsV5();
  applySettings();
  buildNav();
  renderPage("dashboard");
  showMessage("로컬 초기화 완료", "현재 브라우저의 로컬 데이터만 삭제하고 기본 데이터로 초기화했습니다. 서버 DB나 공용 데이터는 삭제하지 않았습니다.");
}

function appendSystemReportBoxV12() {
  if (!currentUser || currentUser.role === "admin" || currentUser.role === "print") return;
  content.querySelector("#systemReportBox")?.remove();
  const box = panel("시스템 오류 제보");
  box.id = "systemReportBox";
  const grid = el("div", "form-grid");
  grid.append(
    makeSelectField("오류 발생 위치", "reportPage", reportPageOptionsV13(), pageLabel(currentPage)),
    makeSelectField("심각도", "reportSeverity", [["낮음", "낮음"], ["보통", "보통"], ["높음", "높음"], ["긴급", "긴급"]], "보통"),
    makeTextareaField("오류 내용", "reportContent", "")
  );
  const send = button("오류 제보 보내기");
  send.addEventListener("click", submitSystemReportV12);
  box.append(grid, send);
  content.append(box);
}

function ensureAppV12() {
  Object.assign(pageMeta, {
    projects: ["프", "프로젝트 관리"],
    system: ["백", "백업/복구"]
  });
  Object.assign(permissions, {
    projects: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] },
    system: { create: ["admin"], edit: ["admin"], del: ["admin"] }
  });
  store.projects ??= [
    {
      id: Date.now(),
      title: "개인 관리 웹앱 개선",
      category: "개인프로젝트",
      area: "웹/앱",
      owner: currentUser?.name || "관리자",
      members: "개인",
      start_date: today,
      end_date: "",
      priority: "높음",
      progress: "진행중",
      percent: "65",
      goal: "일정, 수업, 시험, 자료, 백업을 한 화면에서 관리",
      summary: "반응형 UI와 안정성 기능을 보강하는 프로젝트",
      next_action: "모바일 화면과 백업 흐름 점검",
      links: "",
      memo: ""
    }
  ];
  store.systemReports ??= [];
  store.settings ??= {};
  store.settings.resetPassphrase ??= "RESET-MY-WEB-2026";
  saveStore();
}

function navKeys() {
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "notices", "examSchedules", "meals", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "projects", "portfolios", "penalties", "timetable", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "system", "print");
  return keys;
}

function buildNav() {
  ensureAppV12();
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
  });
}

function renderPage(key) {
  ensureAppV12();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();

  if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV8();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "clubs") renderCollectionV7("clubs");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV8();
  else if (key === "admin") renderAdminV12();
  else if (key === "site") renderSiteV9();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);

  appendSystemReportBoxV12();
}

function renderProjectsV12() {
  content.replaceChildren();
  const rows = filteredRowsV12("projects");
  const section = panel("프로젝트 관리");
  const actions = el("div", "row-actions");
  const report = button("프로젝트 보고서 다운로드", "ghost");
  report.addEventListener("click", () => downloadReportV8("projects", rows));
  const add = button("새 프로젝트");
  add.addEventListener("click", () => openEditorV12("projects"));
  actions.append(report, add);
  section.querySelector(".panel-head").append(actions);
  section.append(projectSummaryV12(rows), filterBarV12("projects"), tableGenericV12("projects", rows));
  content.append(section);
}

function projectSummaryV12(rows) {
  const stats = el("div", "stats project-stats");
  [
    ["전체", rows.length],
    ["진행중", rows.filter((row) => row.progress === "진행중").length],
    ["팀프로젝트", rows.filter((row) => String(row.category || "").includes("팀")).length],
    ["완료", rows.filter((row) => row.progress === "완료").length]
  ].forEach(([name, value]) => {
    const item = el("div", "stat");
    item.append(el("span", "", name), el("strong", "", String(value)), el("span", "", "프로젝트"));
    stats.append(item);
  });
  return stats;
}

function columnsForV12(key) {
  return {
    projects: ["title", "category", "area", "owner", "members", "start_date", "end_date", "priority", "progress", "percent", "goal", "next_action"],
    systemReports: ["date", "reporter", "role", "page", "severity", "status", "content"]
  }[key] || columnsForV10(key);
}

function fieldsForV12(key) {
  return {
    projects: [["title", "프로젝트명", "text", true], ["category", "분류", "select", ["개인프로젝트", "팀프로젝트", "학교프로젝트", "동아리프로젝트", "대회/공모전", "연구/탐구", "봉사/행사", "기타"]], ["area", "영역", "select", ["웹/앱", "문서/보고서", "발표", "디자인", "영상", "3D/메이커", "데이터", "학습", "운영"]], ["owner", "담당자", "text"], ["members", "팀원", "textarea"], ["start_date", "시작일", "date"], ["end_date", "마감일", "date"], ["priority", "우선순위", "select", ["낮음", "보통", "높음", "긴급"]], ["progress", "진행상태", "select", ["구상", "진행중", "검토중", "완료", "보류"]], ["percent", "진행률(%)", "number"], ["goal", "목표", "textarea"], ["summary", "요약", "textarea"], ["next_action", "다음 할 일", "textarea"], ["links", "자료/링크", "textarea"], ["memo", "메모", "textarea"]]
  }[key] || fieldsForV10(key);
}

function filterFieldsForV12(key) {
  return { projects: ["title", "category", "area", "owner", "priority", "progress"] }[key] || filterFieldsForV10(key);
}

function filteredRowsV12(key) {
  const query = globalSearch.value.trim().toLowerCase();
  return (store[key] || []).filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query)) return false;
    return filterFieldsForV12(key).every((field) => {
      const value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
      return !value || String(row[field] || "").includes(value);
    });
  });
}

function filterBarV12(key) {
  const bar = el("div", "toolbar compact-filter");
  filterFieldsForV12(key).forEach((field) => {
    const input = document.createElement("input");
    input.placeholder = `${labelFor(field)} 검색`;
    input.value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
    input.addEventListener("input", () => sessionStorage.setItem(`filter:${key}:${field}`, input.value));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") renderPage(key); });
    bar.append(input);
  });
  const apply = button("검색", "ghost");
  apply.addEventListener("click", () => renderPage(key));
  const reset = button("필터 초기화", "ghost");
  reset.addEventListener("click", () => {
    filterFieldsForV12(key).forEach((field) => sessionStorage.removeItem(`filter:${key}:${field}`));
    renderPage(key);
  });
  bar.append(apply, reset);
  return bar;
}

function tableGenericV12(key, rows) {
  if (!rows.length) return el("div", "empty", "항목이 없습니다.");
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const head = document.createElement("tr");
  columnsForV12(key).forEach((col) => head.append(el("th", "", labelFor(col))));
  head.append(el("th", "", "관리"));
  thead.append(head);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columnsForV12(key).forEach((col) => tr.append(el("td", "", row[col] || "")));
    const td = el("td", "row-actions");
    const view = button("보기", "ghost");
    view.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    td.append(view);
    if (key !== "systemReports") {
      const edit = button(can("edit", key) ? "수정" : "수정 요청", "ghost");
      edit.addEventListener("click", () => can("edit", key) ? openEditorV12(key, row.id) : requestEdit(key, row.id));
      td.append(edit);
    }
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      td.append(del);
    }
    tr.append(td);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function openEditorV12(key, id = null) {
  if (id && !can("edit", key)) return requestEdit(key, id);
  if (!id && !can("create", key)) return;
  const row = id ? (store[key] || []).find((item) => item.id === id) : {};
  editing = { key, id, origin: key, v12: true };
  dialogTitle.textContent = `${pageLabel(key)} ${id ? "수정" : "추가"}`;
  editorFields.replaceChildren();
  fieldsForV12(key).forEach(([name, label, type, requiredOrOptions]) => editorFields.append(inputNodeV4(name, label, type, requiredOrOptions, row?.[name] || "")));
  if (id) editorFields.append(inputNodeV4("_confirm_password", "현재 비밀번호", "password", true, ""));
  editorError.textContent = "";
  editorDialog.showModal();
}

function renderAdminV12() {
  renderAdminV6();
  const reports = panel("시스템 오류 제보");
  reports.append(tableGenericV12("systemReports", store.systemReports || []));
  content.append(reports);
}

function renderSystemV12() {
  content.replaceChildren();
  const backup = panel("백업 및 복구");
  const actions = el("div", "row-actions system-actions");
  const backupBtn = button("전체 백업 다운로드");
  backupBtn.addEventListener("click", downloadBackupV12);
  const restoreInput = document.createElement("input");
  restoreInput.type = "file";
  restoreInput.accept = ".json";
  restoreInput.hidden = true;
  restoreInput.addEventListener("change", () => restoreBackupV12(restoreInput.files[0]));
  const restoreBtn = button("백업 파일 복구", "ghost");
  restoreBtn.addEventListener("click", () => restoreInput.click());
  actions.append(backupBtn, restoreInput, restoreBtn);
  backup.append(actions, systemWarningV12("백업은 현재 브라우저에 저장된 모든 자료와 계정을 JSON 파일로 저장합니다. 복구는 기존 내용을 백업 파일 내용으로 덮어쓰므로, 실행 전 현재 백업을 먼저 내려받으세요."));

  const reset = panel("시스템 초기화");
  const grid = el("div", "form-grid");
  grid.append(
    makePasswordField("1차 현재 관리자 비밀번호", "resetPassword", "현재 비밀번호"),
    makeTextField("2차 관리자 PIN", "resetPin", ""),
    makePasswordField("3차 고유 초기화 패스워드", "resetPhrase", "RESET-MY-WEB-2026"),
    makeTextField("확인 문구", "resetConfirm", "모든내용삭제")
  );
  const resetBtn = button("모든 내용 삭제 및 초기화", "danger");
  resetBtn.addEventListener("click", resetSystemV12);
  reset.append(grid, resetBtn, systemWarningV12("초기화는 일정, 공지, 시험, 수업, 자료, 프로젝트, 계정 등 모든 저장 내용을 삭제하고 빈 로컬 상태로 되돌립니다. 되돌릴 수 없으니 백업 후 실행하세요. 현재 비밀번호, PIN, 고유 패스워드, 확인 문구까지 모두 맞아야 실행됩니다."));

  const reports = panel("오류 제보 목록");
  reports.append(tableGenericV12("systemReports", store.systemReports || []));
  content.append(backup, reset, reports);
}

function systemWarningV12(text) {
  const box = el("div", "system-warning");
  box.append(el("strong", "", "주의사항 및 실행방법"), el("p", "", text));
  return box;
}

function downloadBackupV12() {
  exportCsv(`개인관리_전체백업_${today}.json`, JSON.stringify({ version: "pm-backup-v12", exportedAt: new Date().toISOString(), store, accounts }, null, 2));
}

function restoreBackupV12(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      if (!payload.store) throw new Error("백업 파일 형식이 올바르지 않습니다.");
      store = mergeStore(payload.store);
      if (Array.isArray(payload.accounts)) accounts = payload.accounts;
      ensureAppV12();
      saveStore();
      saveAccountsV5();
      applySettings();
      buildNav();
      renderPage("system");
      showMessage("복구 완료", "백업 파일로 데이터를 복구했습니다.");
    } catch (error) {
      showMessage("복구 실패", error.message);
    }
  };
  reader.readAsText(file, "utf-8");
}

function resetSystemV12() {
  if (document.getElementById("resetPassword").value !== currentUser.password) return showMessage("초기화 차단", "1차 인증 비밀번호가 올바르지 않습니다.");
  if (document.getElementById("resetPin").value !== currentUser.pin) return showMessage("초기화 차단", "2차 인증 PIN이 올바르지 않습니다.");
  if (document.getElementById("resetPhrase").value !== (store.settings.resetPassphrase || "RESET-MY-WEB-2026")) return showMessage("초기화 차단", "3차 고유 초기화 패스워드가 올바르지 않습니다.");
  if (document.getElementById("resetConfirm").value !== "모든내용삭제") return showMessage("초기화 차단", "확인 문구에 모든내용삭제를 정확히 입력해야 합니다.");
  resetCurrentWorkspaceDataV36();
  showMessage("초기화 완료", "현재 로그인한 계정의 workspace 데이터만 초기화했습니다.");
  return;
  localStorage.removeItem("pm-store-v3");
  localStorage.removeItem("pm-accounts-v5");
  store = structuredClone(initialStore);
  accounts = [];
  ensureAppV12();
  saveAccountsV5();
  applySettings();
  buildNav();
  renderPage("dashboard");
  showMessage("초기화 완료", "모든 내용이 삭제되고 기본 데이터로 초기화되었습니다.");
}

function appendSystemReportBoxV12() {
  if (!currentUser || currentUser.role === "admin" || currentUser.role === "print") return;
  content.querySelector("#systemReportBox")?.remove();
  const box = panel("시스템 오류 제보");
  box.id = "systemReportBox";
  const grid = el("div", "form-grid");
  grid.append(
    makeTextField("오류 발생 위치", "reportPage", pageLabel(currentPage)),
    makeSelectField("심각도", "reportSeverity", [["낮음", "낮음"], ["보통", "보통"], ["높음", "높음"], ["긴급", "긴급"]], "보통"),
    makeTextareaField("오류 내용", "reportContent", "")
  );
  const send = button("오류 제보 보내기");
  send.addEventListener("click", submitSystemReportV12);
  box.append(grid, send);
  content.append(box);
}

function submitSystemReportV12() {
  const contentField = document.getElementById("reportContent");
  if (!contentField?.value.trim()) return showMessage("전송 실패", "오류 내용을 입력해주세요.");
  store.systemReports ??= [];
  store.systemReports.unshift({
    id: Date.now(),
    date: today,
    reporter: currentUser.email,
    role: roleName(currentUser.role),
    page: document.getElementById("reportPage").value,
    severity: document.getElementById("reportSeverity").value,
    status: "접수",
    content: contentField.value
  });
  saveStore();
  contentField.value = "";
  showMessage("전송 완료", "오류 제보가 관리자에게 전달되었습니다.");
}

function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위",
    year: "시험년도", grade: "학년", base_score: "기본점수", examPaperPdf: "시험지", time: "시간", place: "장소", activity: "활동명", competency: "역량", evidence: "근거자료", draft: "세특 초안", end_date: "마지막날짜",
    lesson_date: "수업일", day: "요일", period: "교시", summary: "요약", content: "내용", homework: "과제", late: "지각 여부", attendance_note: "출결 메모",
    title: "제목", category: "분류", area: "영역", owner: "담당자", members: "팀원", start_date: "시작일", priority: "우선순위", progress: "진행상태", percent: "진행률", goal: "목표", next_action: "다음 할 일", links: "자료/링크",
    reporter: "제보자", severity: "심각도", status: "상태", page: "위치"
  }[field] || field;
}

ensureAppV12();
if (currentUser) {
  buildNav();
  renderPage(currentPage || "dashboard");
}

function extendAppV11() {
  Object.assign(pageMeta, {
    projects: ["프", "프로젝트 관리"],
    system: ["백", "백업/복구"]
  });
  Object.assign(permissions, {
    projects: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] },
    system: { create: ["admin"], edit: ["admin"], del: ["admin"] }
  });
  store.projects ??= [
    { id: 1, title: "개인 관리 웹앱 개선", category: "개인프로젝트", area: "웹/앱", owner: "관리자", members: "개인", start_date: today, end_date: "", priority: "높음", progress: "진행중", percent: "65", goal: "모바일에서도 편한 통합 관리 시스템 구축", summary: "반응형 UI와 백업 시스템 정리", next_action: "모바일 화면 점검", links: "", memo: "" }
  ];
  store.systemReports ??= [];
  store.settings.resetPassphrase ??= "RESET-MY-WEB-2026";
  saveStore();
}

function navKeys() {
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "notices", "examSchedules", "meals", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "projects", "portfolios", "penalties", "timetable", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "system", "print");
  return keys;
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "dashboard") return renderDashboardV8();
  if (key === "personal") return renderPersonalV8();
  if (key === "schedules") return renderSchedulesV10();
  if (key === "lessons") return renderLessonsV10();
  if (key === "projects") return renderProjectsV11();
  if (key === "system") return renderSystemV11();
  if (key === "attendance") return renderCollectionV7("attendance");
  if (key === "examSchedules") return renderCollectionV7("examSchedules");
  if (key === "records") return renderCollectionV7("records");
  if (key === "accounts") return renderAccountsV8();
  if (key === "materials" || key === "portfolios") return renderCollectionV8(key);
  if (key === "meals") return renderCollectionV7("meals");
  if (key === "budget") return renderCollectionV7("budget");
  if (key === "clubs") return renderCollectionV7("clubs");
  if (key === "notices") return renderCollectionV7("notices");
  if (key === "penalties") return renderPenaltiesV6();
  if (key === "timetable") return renderTimetableV6();
  if (key === "print") return renderPrintV7();
  if (key === "admin") return renderAdminV11();
  if (key === "site") return renderSiteV9();
  if (key === "exams") return renderExamsV6();
  renderCollectionV7(key);
}

function columnsForV11(key) {
  return {
    projects: ["title", "category", "area", "owner", "members", "start_date", "end_date", "priority", "progress", "percent", "goal", "next_action"],
    systemReports: ["date", "reporter", "role", "page", "severity", "status", "content"]
  }[key] || columnsForV10(key);
}

function fieldsForV11(key) {
  const map = {
    projects: [["title", "프로젝트명", "text", true], ["category", "분류", "select", ["개인프로젝트", "팀프로젝트", "학교프로젝트", "동아리프로젝트", "대회/공모전", "연구/탐구", "봉사/행사", "기타"]], ["area", "영역", "select", ["웹/앱", "문서/보고서", "발표", "디자인", "영상", "3D/메이커", "데이터", "학습", "운영"]], ["owner", "담당자", "text"], ["members", "팀원", "textarea"], ["start_date", "시작일", "date"], ["end_date", "마감일", "date"], ["priority", "우선순위", "select", ["낮음", "보통", "높음", "긴급"]], ["progress", "진행상태", "select", ["구상", "진행중", "검토중", "완료", "보류"]], ["percent", "진행률(%)", "number"], ["goal", "목표", "textarea"], ["summary", "요약", "textarea"], ["next_action", "다음 할 일", "textarea"], ["links", "자료/링크", "textarea"], ["memo", "메모", "textarea"]]
  };
  return map[key] || fieldsForV10(key);
}

function filterFieldsForV11(key) {
  return { projects: ["title", "category", "area", "owner", "priority", "progress"] }[key] || filterFieldsForV10(key);
}

function renderProjectsV11() {
  content.replaceChildren();
  const rows = filteredRowsV11("projects");
  const section = panel("프로젝트 관리");
  const actions = el("div", "row-actions");
  const report = button("프로젝트 보고서", "ghost");
  report.addEventListener("click", () => downloadReportV8("projects", rows));
  const add = button("새 프로젝트");
  add.addEventListener("click", () => openEditorV11("projects"));
  actions.append(report, add);
  section.querySelector(".panel-head").append(actions);
  section.append(projectSummaryV11(rows), filterBarV11("projects"), tableGenericV11("projects", rows));
  content.append(section);
  appendSystemReportBoxV11();
}

function projectSummaryV11(rows) {
  const stats = el("div", "stats project-stats");
  [["전체", rows.length], ["진행중", rows.filter((r) => r.progress === "진행중").length], ["팀프로젝트", rows.filter((r) => String(r.category || "").includes("팀")).length], ["완료", rows.filter((r) => r.progress === "완료").length]].forEach(([name, value]) => {
    const item = el("div", "stat");
    item.append(el("span", "", name), el("strong", "", String(value)), el("span", "", "프로젝트"));
    stats.append(item);
  });
  return stats;
}

function filteredRowsV11(key) {
  const query = globalSearch.value.trim().toLowerCase();
  return (store[key] || []).filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query)) return false;
    return filterFieldsForV11(key).every((field) => {
      const value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
      return !value || String(row[field] || "").includes(value);
    });
  });
}

function filterBarV11(key) {
  const bar = el("div", "toolbar compact-filter");
  filterFieldsForV11(key).forEach((field) => {
    const input = document.createElement("input");
    input.placeholder = `${labelFor(field)} 검색`;
    input.value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
    input.addEventListener("input", () => sessionStorage.setItem(`filter:${key}:${field}`, input.value));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") renderPage(key); });
    bar.append(input);
  });
  const apply = button("검색", "ghost");
  apply.addEventListener("click", () => renderPage(key));
  const reset = button("초기화", "ghost");
  reset.addEventListener("click", () => {
    filterFieldsForV11(key).forEach((field) => sessionStorage.removeItem(`filter:${key}:${field}`));
    renderPage(key);
  });
  bar.append(apply, reset);
  return bar;
}

function tableGenericV11(key, rows) {
  if (!rows.length) return el("div", "empty", "항목이 없습니다.");
  const cols = columnsForV11(key);
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  cols.forEach((col) => trh.append(el("th", "", labelFor(col))));
  trh.append(el("th", "", "관리"));
  thead.append(trh);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => tr.append(el("td", "", row[col] || "")));
    const td = el("td", "row-actions");
    const view = button("보기", "ghost");
    view.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    const edit = button(can("edit", key) ? "수정" : "수정 요청", "ghost");
    edit.addEventListener("click", () => can("edit", key) ? openEditorV11(key, row.id) : requestEdit(key, row.id));
    td.append(view, edit);
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      td.append(del);
    }
    tr.append(td);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function openEditorV11(key, id = null) {
  if (id && !can("edit", key)) return requestEdit(key, id);
  if (!id && !can("create", key)) return;
  const row = id ? (store[key] || []).find((item) => item.id === id) : {};
  editing = { key, id, origin: key, v11: true };
  dialogTitle.textContent = `${pageLabel(key)} ${id ? "수정" : "추가"}`;
  editorFields.replaceChildren();
  fieldsForV11(key).forEach(([name, label, type, requiredOrOptions]) => editorFields.append(inputNodeV4(name, label, type, requiredOrOptions, row?.[name] || "")));
  if (id) editorFields.append(inputNodeV4("_confirm_password", "현재 비밀번호", "password", true, ""));
  editorError.textContent = "";
  editorDialog.showModal();
}

function renderAdminV11() {
  renderAdminV6();
  const reports = panel("시스템 오류 제보");
  reports.append(tableGenericV11("systemReports", store.systemReports || []));
  content.append(reports);
}

function renderSystemV11() {
  content.replaceChildren();
  const backup = panel("백업 및 복구");
  const actions = el("div", "row-actions system-actions");
  const backupBtn = button("전체 백업 다운로드");
  backupBtn.addEventListener("click", downloadBackupV11);
  const restoreInput = document.createElement("input");
  restoreInput.type = "file";
  restoreInput.accept = ".json";
  restoreInput.hidden = true;
  restoreInput.addEventListener("change", () => restoreBackupV11(restoreInput.files[0]));
  const restoreBtn = button("백업 파일 복구", "ghost");
  restoreBtn.addEventListener("click", () => restoreInput.click());
  actions.append(backupBtn, restoreInput, restoreBtn);
  backup.append(actions, systemWarningV11("백업은 현재 브라우저 저장 데이터를 JSON 파일로 저장합니다. 복구는 기존 내용을 백업 파일로 덮어쓸 수 있으므로 실행 전 현재 백업을 먼저 다운로드하세요."));

  const reset = panel("시스템 초기화");
  const grid = el("div", "form-grid");
  grid.append(makePasswordField("1차: 현재 관리자 비밀번호", "resetPassword", "현재 비밀번호"), makeTextField("2차: 관리자 PIN", "resetPin", ""), makePasswordField("3차: 고유 초기화 패스워드", "resetPhrase", "RESET-MY-WEB-2026"), makeTextField("확인 문구", "resetConfirm", "모든내용삭제"));
  const resetBtn = button("모든 내용 삭제 및 초기화", "danger");
  resetBtn.addEventListener("click", resetSystemV11);
  reset.append(grid, resetBtn, systemWarningV11("초기화는 모든 저장 데이터를 삭제하고 기본값으로 되돌립니다. 되돌릴 수 없으므로 반드시 백업 후 실행하세요. 현재 비밀번호, PIN, 고유 패스워드, 확인 문구까지 3차 인증이 필요합니다."));

  const reports = panel("오류 제보 목록");
  reports.append(tableGenericV11("systemReports", store.systemReports || []));
  content.append(backup, reset, reports);
}

function systemWarningV11(text) {
  const box = el("div", "system-warning");
  box.append(el("strong", "", "주의사항"), el("p", "", text));
  return box;
}

function downloadBackupV11() {
  exportCsv(`개인관리_전체백업_${today}.json`, JSON.stringify({ version: "pm-backup-v11", exportedAt: new Date().toISOString(), store, accounts }, null, 2));
}

function restoreBackupV11(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      if (!payload.store) throw new Error("백업 파일 형식이 올바르지 않습니다.");
      store = mergeStore(payload.store);
      if (Array.isArray(payload.accounts)) accounts = payload.accounts;
      saveStore();
      saveAccountsV5();
      applySettings();
      buildNav();
      renderPage("system");
      showMessage("복구 완료", "백업 파일로 데이터를 복구했습니다.");
    } catch (error) {
      showMessage("복구 실패", error.message);
    }
  };
  reader.readAsText(file, "utf-8");
}

function resetSystemV11() {
  if (document.getElementById("resetPassword").value !== currentUser.password) return showMessage("초기화 차단", "1차 인증 비밀번호가 올바르지 않습니다.");
  if (document.getElementById("resetPin").value !== currentUser.pin) return showMessage("초기화 차단", "2차 인증 PIN이 올바르지 않습니다.");
  if (document.getElementById("resetPhrase").value !== (store.settings.resetPassphrase || "RESET-MY-WEB-2026")) return showMessage("초기화 차단", "3차 고유 초기화 패스워드가 올바르지 않습니다.");
  if (document.getElementById("resetConfirm").value !== "모든내용삭제") return showMessage("초기화 차단", "확인 문구에 모든내용삭제를 정확히 입력해야 합니다.");
  resetCurrentWorkspaceDataV36();
  showMessage("초기화 완료", "현재 로그인한 계정의 workspace 데이터만 초기화했습니다.");
  return;
  localStorage.removeItem("pm-store-v3");
  localStorage.removeItem("pm-accounts-v5");
  store = structuredClone(initialStore);
  accounts = [];
  extendAppV11();
  saveAccountsV5();
  applySettings();
  buildNav();
  renderPage("dashboard");
  showMessage("초기화 완료", "모든 내용이 삭제되고 기본 데이터로 초기화되었습니다.");
}

function appendSystemReportBoxV11() {
  if (!currentUser || currentUser.role === "admin" || currentUser.role === "print") return;
  content.querySelector("#systemReportBox")?.remove();
  const box = panel("시스템 오류 제보");
  box.id = "systemReportBox";
  const grid = el("div", "form-grid");
  grid.append(makeTextField("오류 발생 위치", "reportPage", pageLabel(currentPage)), makeSelectField("심각도", "reportSeverity", [["낮음", "낮음"], ["보통", "보통"], ["높음", "높음"], ["긴급", "긴급"]], "보통"), makeTextareaField("오류 내용", "reportContent", ""));
  const send = button("오류 제보 보내기");
  send.addEventListener("click", submitSystemReportV11);
  box.append(grid, send);
  content.append(box);
}

function submitSystemReportV11() {
  const contentField = document.getElementById("reportContent");
  if (!contentField?.value.trim()) return showMessage("전송 실패", "오류 내용을 입력해주세요.");
  store.systemReports ??= [];
  store.systemReports.unshift({ id: Date.now(), date: today, reporter: currentUser.email, role: roleName(currentUser.role), page: document.getElementById("reportPage").value, severity: document.getElementById("reportSeverity").value, status: "접수", content: contentField.value });
  saveStore();
  contentField.value = "";
  showMessage("전송 완료", "오류 제보가 관리자에게 전달되었습니다.");
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();

  if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV11();
  else if (key === "system") renderSystemV11();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV8();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "clubs") renderCollectionV7("clubs");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV11();
  else if (key === "site") renderSiteV9();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);

  appendSystemReportBoxV11();
}

function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위",
    year: "시험년도", grade: "학년", base_score: "기본점수", examPaperPdf: "시험지", time: "시간", place: "장소", activity: "활동명", competency: "역량", evidence: "근거자료", draft: "세특 초안", end_date: "마지막날짜",
    lesson_date: "수업일", day: "요일", period: "교시", summary: "요약", content: "내용", homework: "과제", late: "지각 여부", attendance_note: "출결 메모",
    title: "제목", category: "분류", area: "영역", owner: "담당자", members: "팀원", start_date: "시작일", priority: "우선순위", progress: "진행상태", percent: "진행률", goal: "목표", next_action: "다음 할 일", links: "자료/링크", reporter: "제보자", severity: "심각도", status: "상태", page: "위치"
  }[field] || field;
}

function extendAppV6() {
  Object.assign(pageMeta, {
    attendance: ["출", "출결 관리"],
    accounts: ["계", "계정 설정"]
  });
  Object.assign(permissions, {
    attendance: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] },
    accounts: { create: ["admin"], edit: ["admin"], del: ["admin"] }
  });
  store.attendance ??= [
    { id: 1, date: today, type: "등교", time: "08:20", status: "정상", memo: "" }
  ];
  store.settings.timetableTimes ??= ["08:40-09:25", "09:35-10:20", "10:30-11:15", "11:25-12:10", "13:10-13:55", "14:05-14:50", "15:00-15:45", "15:55-16:40", "16:50-17:35", "17:45-18:30", "19:00-19:50", "20:00-20:50"];
  store.settings.timetablePeriods ??= Math.max(8, store.settings.timetablePeriods || 8);
  (store.timetableSets || []).forEach((set) => {
    set.name ??= set.type || "시간표";
  });
  (store.exams || []).forEach((row) => normalizeExamV6(row));
  saveStore();
}

function navKeys() {
  if (currentUser?.role === "print") return ["print"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "notices", "meals", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "timetable", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "print");
  return keys;
}

function buildNav() {
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    const icon = el("span", "nav-icon", pageMeta[key]?.[0] || "");
    const text = el("span", "nav-text", pageLabel(key));
    btn.append(icon, text);
    if (key === "site" && isAdmin()) {
      const count = pendingRequestCountV6();
      if (count) btn.append(el("sup", "nav-badge", String(count)));
    }
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
  });
}

function updateGreeting() {
  if (!currentUser) return;
  if (currentUser.role === "admin") roleLabel.textContent = `${currentUser.name}관리자님 어서오십시오.`;
  else if (currentUser.role === "print") roleLabel.textContent = `${currentUser.name}사용자님 프린트 전용계정입니다.`;
  else roleLabel.textContent = `${currentUser.name}사용자님 어서오십시오.`;
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "dashboard") return renderDashboardV6();
  if (key === "attendance") return renderCollectionV6("attendance");
  if (key === "accounts") return renderAccountsV6();
  if (key === "personal") return renderPersonalV4();
  if (key === "meals") return renderCollectionV6("meals");
  if (key === "budget") return renderCollectionV6("budget");
  if (key === "clubs") return renderCollectionV6("clubs");
  if (key === "notices") return renderCollectionV6("notices");
  if (key === "penalties") return renderPenaltiesV6();
  if (key === "timetable") return renderTimetableV6();
  if (key === "print") return renderPrintV6();
  if (key === "admin") return renderAdminV6();
  if (key === "site") return renderSiteV4();
  if (key === "exams") return renderExamsV6();
  renderCollectionV6(key);
}

function pendingRequestCountV6() {
  return (store.requests || []).filter((row) => ["접수", "검토 중", "?묒닔", "寃??以?"].includes(row.status)).length;
}

function updateRequestBadgeV6() {
  const btn = nav.querySelector('[data-page="site"]');
  if (!btn || !isAdmin()) return;
  btn.querySelector(".nav-badge")?.remove();
  const count = pendingRequestCountV6();
  if (count) btn.append(el("sup", "nav-badge", String(count)));
}

function renderDashboardV6() {
  const penaltyTotal = (store.penalties || []).reduce((sum, row) => sum + Number(row.points || 0), 0);
  const blocks = [
    ["attendance", "출결", store.attendance || []],
    ["schedules", "일정", store.schedules || []],
    ["notices", "공지", visibleNotices() || []],
    ["meals", "급식", store.meals || []],
    ["assignments", "과제", store.assignments || []],
    ["exams", "시험", store.exams || []],
    ["portfolios", "포트폴리오", store.portfolios || []],
    ["penalties", `벌점 (${penaltyTotal}점)`, store.penalties || []],
    ["timetable", "시간표", store.timetable || []]
  ];
  content.replaceChildren();
  if (store.settings.systemNoticeEnabled) {
    const notice = el("div", "system-notice");
    notice.append(el("strong", "", "시스템 공지"), el("span", "", store.settings.systemNotice || ""));
    content.append(notice);
  }
  const quick = panel("빠른 등록");
  const actions = el("div", "quick-actions");
  (store.settings.quickButtons || []).forEach((key) => {
    const btn = button(`${pageLabel(key)} 추가`);
    btn.disabled = !can("create", key);
    btn.addEventListener("click", () => openEditorV6(key, null, "dashboard"));
    actions.append(btn);
  });
  quick.append(actions);
  content.append(quick);
  const grid = el("div", "dashboard-grid");
  blocks.forEach(([key, title, rows]) => grid.append(dashboardBoxV5(key, title, rows)));
  content.append(grid);
}

function renderCollectionV6(key) {
  content.replaceChildren();
  const rows = filteredRowsV6(key);
  const section = panel(pageLabel(key));
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  if (key === "meals") actions.append(mealImportButtonV5());
  const download = button("보고서 다운로드", "ghost");
  download.addEventListener("click", () => downloadReportV5(key, rows));
  const add = button("새 항목");
  add.disabled = !can("create", key);
  add.addEventListener("click", () => openEditorV6(key));
  actions.append(download, add);
  head.append(actions);
  section.append(filterBarV6(key), tableV6(key, rows));
  content.append(section);
}

function renderPenaltiesV6() {
  const total = (store.penalties || []).reduce((sum, row) => sum + Number(row.points || 0), 0);
  content.replaceChildren();
  const stats = el("div", "stats");
  const item = el("div", "stat");
  item.append(el("span", "", "현재 벌점 합계"), el("strong", "", `${total}점`), el("span", "", "세부 항목은 아래 표에서 확인"));
  stats.append(item);
  content.append(stats);
  const section = panel(pageLabel("penalties"));
  const addPenalty = button("새 항목", "ghost");
  addPenalty.disabled = !can("create", "penalties");
  addPenalty.addEventListener("click", () => openEditorV6("penalties"));
  section.querySelector(".panel-head").append(addPenalty);
  section.append(filterBarV6("penalties"), tableV6("penalties", filteredRowsV6("penalties")));
  content.append(section);
}

function filterFieldsForV6(key) {
  const map = {
    attendance: ["date", "type", "status"],
    schedules: ["title", "date", "type", "status"],
    notices: ["title", "source", "subject", "notice_date", "deadline_date"],
    meals: ["date", "meal", "menu"],
    subjects: ["name", "teacher", "publisher", "textbook", "location"],
    teachers: ["name", "subject", "type", "phone", "email"],
    materials: ["title", "subject", "type", "tags"],
    assignments: ["title", "subject", "teacher", "date"],
    exams: ["year", "grade", "date", "title", "subject", "teacher"],
    portfolios: ["title", "category", "date"],
    penalties: ["date", "title", "points", "status"],
    timetable: ["subject", "teacher", "room"],
    clubs: ["name", "teacher", "location"],
    budget: ["date", "type", "category", "title"],
    people: ["name", "phone", "email", "relationship"],
    friendAwards: ["person", "type", "date"]
  };
  return map[key] || (columnsForV6(key).slice(0, 4));
}

function filterBarV6(key) {
  const bar = el("div", "toolbar compact-filter");
  filterFieldsForV6(key).forEach((field) => {
    const input = document.createElement("input");
    input.dataset.filter = field;
    input.placeholder = `${labelFor(field)} 검색`;
    input.value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
    input.addEventListener("input", () => sessionStorage.setItem(`filter:${key}:${field}`, input.value));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") renderPage(key); });
    bar.append(input);
  });
  const apply = button("검색", "ghost");
  apply.addEventListener("click", () => renderPage(key));
  const reset = button("필터 초기화", "ghost");
  reset.addEventListener("click", () => {
    filterFieldsForV6(key).forEach((field) => sessionStorage.removeItem(`filter:${key}:${field}`));
    globalSearch.value = "";
    renderPage(key);
  });
  bar.append(apply, reset);
  return bar;
}

function filteredRowsV6(key) {
  const query = globalSearch.value.trim().toLowerCase();
  return (key === "notices" ? visibleNotices() : (store[key] || [])).filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query)) return false;
    return filterFieldsForV6(key).every((field) => {
      const value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
      return !value || String(row[field] || "").includes(value);
    });
  });
}

function columnsForV6(key) {
  return {
    attendance: ["date", "type", "time", "status", "memo"],
    notices: ["title", "source", "subject", "importance", "notice_date", "deadline_required", "deadline_date", "content", "memo", "visibility"],
    meals: ["date", "meal", "menu", "calories", "memo"],
    exams: ["year", "grade", "date", "title", "subject", "teacher", "score", "raw_score", "rank", "student_count", "percentile", "grade_level", "average", "base_score", "examPaperPdf", "memo"]
  }[key] || columnsForV5(key);
}

function fieldsForV6(key) {
  const map = {
    attendance: [["date", "날짜", "date"], ["type", "구분", "select", ["등교", "하교", "지각", "조퇴", "결석"]], ["time", "시간", "time"], ["status", "상태", "select", ["정상", "확인 필요", "처리 완료"]], ["memo", "메모", "textarea"]],
    notices: [["title", "제목", "text", true], ["source", "출처", "select", ["학교", "학원", "선생님", "시스템", "기타"]], ["subject", "과목", "select", ["", "공통", ...subjectsList()]], ["importance", "중요도", "select", ["낮음", "보통", "높음", "매우 높음"]], ["notice_date", "공지일", "date"], ["deadline_required", "마감일 여부", "select", ["불필요", "필요"]], ["deadline_date", "마감일", "date"], ["content", "내용", "textarea"], ["memo", "메모", "textarea"], ["visibility", "공개", "select", ["일반 공개", "관리자 전용"]]]
  };
  return map[key] || fieldsForV5(key);
}

function tableV6(key, rows) {
  if (!rows.length) return el("div", "empty", "항목이 없습니다.");
  const cols = columnsForV6(key);
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  cols.forEach((col) => hr.append(el("th", "", labelFor(col))));
  hr.append(el("th", "", "관리"));
  thead.append(hr);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => tr.append(el("td", "", row[col] || "")));
    const td = el("td", "row-actions");
    const view = button("보기", "ghost");
    view.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    const edit = button(can("edit", key) ? "수정" : "수정 요청", "ghost");
    edit.addEventListener("click", () => can("edit", key) ? openEditorV6(key, row.id) : requestEdit(key, row.id));
    td.append(view, edit);
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      td.append(del);
    }
    tr.append(td);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function openEditorV6(key, id = null, origin = key) {
  if (id && !can("edit", key)) return requestEdit(key, id);
  if (!id && !can("create", key)) return;
  const row = id ? (store[key] || []).find((item) => item.id === id) : {};
  editing = { key, id, origin, v6: true };
  dialogTitle.textContent = `${pageLabel(key)} ${id ? "수정" : "추가"}`;
  editorFields.replaceChildren();
  fieldsForV6(key).forEach(([name, label, type, requiredOrOptions]) => editorFields.append(inputNodeV4(name, label, type, requiredOrOptions, row?.[name] || "")));
  if (id) editorFields.append(inputNodeV4("_confirm_password", "현재 비밀번호", "password", true, ""));
  if (key === "notices") bindNoticeEditorV5();
  editorError.textContent = "";
  editorDialog.showModal();
}

function renderTimetableV6() {
  const setId = sessionStorage.getItem("pm-timetable-set") || store.timetableSets[0]?.id || "school";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const periods = Array.from({ length: Number(store.settings.timetablePeriods || 8) }, (_, i) => `${i + 1}교시`);
  content.replaceChildren();
  const section = panel("시간표");
  const tools = el("div", "toolbar");
  const selector = document.createElement("select");
  store.timetableSets.forEach((set) => selector.append(option(set.id, set.name)));
  selector.value = setId;
  selector.addEventListener("change", () => { sessionStorage.setItem("pm-timetable-set", selector.value); renderTimetableV6(); });
  const nameInput = document.createElement("input");
  nameInput.placeholder = "새 시간표 이름";
  const addSet = button("시간표 등록", "ghost");
  addSet.addEventListener("click", () => {
    const name = nameInput.value.trim() || prompt("시간표 이름", "새 시간표");
    if (!name) return;
    const id = `set-${Date.now()}`;
    store.timetableSets.push({ id, name, type: "사용자 등록" });
    sessionStorage.setItem("pm-timetable-set", id);
    saveStore();
    renderTimetableV6();
  });
  const rename = button("선택 이름 저장", "ghost");
  rename.addEventListener("click", () => {
    const set = store.timetableSets.find((item) => item.id === selector.value);
    const next = nameInput.value.trim() || prompt("시간표 이름", set?.name || "");
    if (next && set) { set.name = next; saveStore(); renderTimetableV6(); }
  });
  const deleteSet = button("시간표 삭제", "danger");
  deleteSet.addEventListener("click", () => {
    if (!isAdmin()) return showMessage("권한 없음", "시간표 삭제는 관리자만 가능합니다.");
    markWorkspaceDeleted("timetableSets", selector.value);
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((item) => (item.setId || "school") === selector.value));
    store.timetableSets = store.timetableSets.filter((item) => item.id !== selector.value);
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((item) => (item.setId || "school") === selector.value));
    store.timetable = store.timetable.filter((item) => (item.setId || "school") !== selector.value);
    sessionStorage.removeItem("pm-timetable-set");
    saveStore();
    renderTimetableV6();
  });
  const clearSet = button("선택 시간표 일괄 삭제", "danger");
  clearSet.addEventListener("click", () => {
    if (!isAdmin()) return showMessage("권한 없음", "일괄 삭제는 관리자만 가능합니다.");
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((item) => (item.setId || "school") === selector.value));
    store.timetable = store.timetable.filter((item) => (item.setId || "school") !== selector.value);
    saveStore();
    renderTimetableV6();
  });
  const addPeriod = button("교시 추가", "ghost");
  addPeriod.addEventListener("click", () => { store.settings.timetablePeriods = Number(store.settings.timetablePeriods || 8) + 1; saveStore(); renderTimetableV6(); });
  tools.append(selector, nameInput, addSet, rename, deleteSet, clearSet, addPeriod);
  section.append(tools);
  const grid = el("div", "timetable-grid");
  grid.append(makeTimeHead("교시/시간"), ...days.map(makeTimeHead));
  periods.forEach((period, i) => {
    const timeBox = el("div", "tt-time tt-time-edit");
    timeBox.append(el("strong", "", period));
    const timeInput = document.createElement("input");
    timeInput.value = store.settings.timetableTimes[i] || "";
    timeInput.placeholder = "00:00-00:00";
    timeInput.addEventListener("change", () => {
      store.settings.timetableTimes[i] = timeInput.value;
      (store.timetable || []).filter((row) => row.period === period).forEach((row) => { row.time = timeInput.value; });
      saveStore();
    });
    timeBox.append(timeInput);
    grid.append(timeBox);
    days.forEach((day) => grid.append(makeTimeCellV4(setId, day, period, store.settings.timetableTimes[i] || "")));
  });
  section.append(grid);
  content.append(section);
}

function renderAccountsV6() {
  content.replaceChildren();
  const section = panel("계정 설정");
  const select = document.createElement("select");
  accounts.forEach((account) => select.append(option(String(account.id), `${account.name} · ${roleName(account.role)}`)));
  const role = document.createElement("select");
  ["admin", "user", "print"].forEach((item) => role.append(option(item, roleName(item))));
  const name = document.createElement("input");
  name.placeholder = "이름";
  const emailInput = document.createElement("input");
  emailInput.placeholder = "이메일";
  const pw = document.createElement("input");
  pw.placeholder = "새 비밀번호";
  const perms = el("div", "check-grid small-checks");
  const load = () => {
    const account = accounts.find((item) => String(item.id) === select.value);
    if (!account) return;
    name.value = account.name || "";
    emailInput.value = account.email || "";
    role.value = account.role;
    perms.replaceChildren();
    Object.keys(permissions).forEach((key) => ["create", "edit", "del"].forEach((action) => {
      const lab = document.createElement("label");
      const check = document.createElement("input");
      check.type = "checkbox";
      account.permissions ??= {};
      account.permissions[key] ??= {};
      check.checked = account.permissions[key][action] ?? (permissions[key]?.[action] || []).includes(account.role);
      check.addEventListener("change", () => {
        account.permissions[key][action] = check.checked;
        saveAccountsV5();
      });
      lab.append(check, document.createTextNode(` ${pageLabel(key)} ${action}`));
      perms.append(lab);
    }));
  };
  select.addEventListener("change", load);
  const save = button("선택 계정 저장");
  save.addEventListener("click", () => {
    const account = accounts.find((item) => String(item.id) === select.value);
    if (!account) return;
    account.name = name.value;
    account.email = emailInput.value;
    account.role = role.value;
    if (pw.value) account.password = pw.value;
    saveAccountsV5();
    buildNav();
    renderAccountsV6();
  });
  const create = button("새 계정 생성", "ghost");
  create.addEventListener("click", () => {
    accounts.push({ id: Date.now(), name: "새 계정", email: `new${Date.now()}@example.com`, password: "1234", role: "user", pin: "1234", permissions: {} });
    saveAccountsV5();
    renderAccountsV6();
  });
  const grid = el("div", "form-grid");
  grid.append(makeField("계정 선택", "accountSelectV6", select), makeField("역할", "accountRoleV6", role), makeField("이름", "accountNameV6", name), makeField("이메일", "accountEmailV6", emailInput), makeField("새 비밀번호", "accountPwV6", pw));
  section.append(grid, save, create, el("h3", "", "권한 수정"), perms);
  content.append(section);
  load();
}

function renderAdminV6() {
  renderAdminV5();
  const shortcut = button("계정 설정 열기", "ghost");
  shortcut.addEventListener("click", () => renderPage("accounts"));
  content.querySelector(".panel")?.prepend(shortcut);
}

function renderPrintV6() {
  renderPrintV5();
  content.querySelector(".panel-head h3").textContent = "프린트 센터";
}

function renderExamsV6() {
  content.replaceChildren();
  const filters = panel("시험 조회");
  const row = el("div", "exam-filter");
  const start = document.createElement("input");
  start.type = "date";
  start.value = sessionStorage.getItem("examStartV6") || "";
  const end = document.createElement("input");
  end.type = "date";
  end.value = sessionStorage.getItem("examEndV6") || "";
  const subject = selectFromV6(["", ...subjectsList()], sessionStorage.getItem("examSubjectV6") || "", "과목 전체");
  const teacher = selectFromV6(["", ...teachersList()], sessionStorage.getItem("examTeacherV6") || "", "선생님 전체");
  const titleInput = document.createElement("input");
  titleInput.placeholder = "시험명";
  titleInput.value = sessionStorage.getItem("examTitleV6") || "";
  const search = button("검색");
  search.addEventListener("click", () => {
    sessionStorage.setItem("examStartV6", start.value);
    sessionStorage.setItem("examEndV6", end.value);
    sessionStorage.setItem("examSubjectV6", subject.value);
    sessionStorage.setItem("examTeacherV6", teacher.value);
    sessionStorage.setItem("examTitleV6", titleInput.value);
    renderExamsV6();
  });
  const omr = button("OMR카드 DOWN", "ghost");
  omr.addEventListener("click", downloadOmrCard);
  row.append(makeField("시작일", "examStartV6", start), makeField("종료일", "examEndV6", end), makeField("과목", "examSubjectV6", subject), makeField("선생님", "examTeacherV6", teacher), makeField("시험명", "examTitleV6", titleInput), search, omr);
  filters.append(row);
  const layout = el("div", "exam-layout");
  const left = panel("시험 목록");
  left.append(examGroupedListV6());
  const center = panel("시험 정보");
  center.append(examDetailV6(selectedExamV6()));
  const right = panel("성적 분석");
  right.append(examAnalysisV5());
  layout.append(left, center, right);
  content.append(filters, layout);
}

function filteredExamsV6() {
  const start = sessionStorage.getItem("examStartV6") || "";
  const end = sessionStorage.getItem("examEndV6") || "";
  const subject = sessionStorage.getItem("examSubjectV6") || "";
  const teacher = sessionStorage.getItem("examTeacherV6") || "";
  const title = sessionStorage.getItem("examTitleV6") || "";
  return (store.exams || []).filter((row) => {
    if (start && row.date < start) return false;
    if (end && row.date > end) return false;
    if (subject && row.subject !== subject) return false;
    if (teacher && row.teacher !== teacher) return false;
    if (title && !String(row.title || "").includes(title)) return false;
    return true;
  });
}

function examGroupedListV6() {
  const wrap = el("div", "exam-groups");
  const groups = {};
  filteredExamsV6().forEach((row) => { groups[row.date || "날짜 없음"] ??= []; groups[row.date || "날짜 없음"].push(row); });
  Object.entries(groups).forEach(([date, rows]) => {
    const details = document.createElement("details");
    details.open = true;
    details.append(el("summary", "", `${date} (${rows.length})`));
    rows.forEach((row) => {
      const line = el("label", "exam-line");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = (store.settings.examSelectedIds || []).includes(row.id);
      check.addEventListener("change", () => {
        const set = new Set(store.settings.examSelectedIds || []);
        check.checked ? set.add(row.id) : set.delete(row.id);
        store.settings.examSelectedIds = [...set];
        saveStore();
        renderExamsV6();
      });
      const btn = button(`${row.subject || ""} · ${row.title || ""}`, "ghost");
      btn.addEventListener("click", () => { sessionStorage.setItem("selectedExamV6", String(row.id)); renderExamsV6(); });
      line.append(check, btn);
      details.append(line);
    });
    wrap.append(details);
  });
  return wrap;
}

function selectedExamV6() {
  const id = Number(sessionStorage.getItem("selectedExamV6") || sessionStorage.getItem("selectedExamV5") || "");
  return (store.exams || []).find((row) => row.id === id) || filteredExamsV6()[0] || {};
}

function examDetailV6(row) {
  const form = el("div", "exam-form");
  const editable = can("edit", "exams");
  if (!row.id && can("create", "exams")) {
    const create = button("시험 정보에서 새 시험 등록");
    create.addEventListener("click", () => {
      const next = normalizeExamV6({ id: Date.now(), year: "2026", grade: "", date: today, title: "새 시험", subject: subjectsList()[0] || "", teacher: teachersList()[0] || "", base_score: 100, score: 0, raw_score: 0 });
      store.exams.unshift(next);
      saveStore();
      sessionStorage.setItem("selectedExamV6", String(next.id));
      renderExamsV6();
    });
    form.append(create);
    return form;
  }
  const fieldDefs = [["year", "시험년도", "text"], ["grade", "학년", "text"], ["title", "시험명", "text"], ["date", "시험일자", "date"], ["subject", "과목", "subject"], ["teacher", "선생님", "teacher"], ["scope", "범위", "textarea"], ["base_score", "기본점수", "number"], ["score", "점수", "number"], ["raw_score", "원점수", "number"], ["rank", "석차", "number"], ["student_count", "응시인원", "number"], ["percentile", "백분위", "number"], ["grade_level", "등급", "text"], ["average", "평균", "number"], ["high_score", "최고점", "number"], ["memo", "메모", "textarea"]];
  fieldDefs.forEach(([name, label, type]) => {
    let input;
    if (type === "subject") input = selectFromV6(subjectsList(), row[name] || "");
    else if (type === "teacher") input = selectFromV6(teachersList(), row[name] || "");
    else if (type === "textarea") input = document.createElement("textarea");
    else {
      input = document.createElement("input");
      input.type = type || "text";
    }
    input.id = `examV6-${name}`;
    input.value = row?.[name] || "";
    input.disabled = !editable || ["percentile", "grade_level", "average"].includes(name);
    if (["score", "rank", "student_count"].includes(name)) input.addEventListener("input", computeExamAutoFieldsV6);
    form.append(makeField(label, input.id, input));
  });
  const paper = document.createElement("input");
  paper.type = "file";
  paper.accept = ".pdf";
  paper.disabled = !editable;
  const answer = document.createElement("input");
  answer.type = "file";
  answer.accept = ".pdf";
  answer.disabled = !editable;
  form.append(makeField("시험지 PDF", "examV6Paper", paper), makeField("정답 PDF", "examV6Answer", answer));
  if (editable && row.id) {
    const save = button("시험 정보 저장");
    save.addEventListener("click", () => {
      fieldDefs.forEach(([name]) => { row[name] = document.getElementById(`examV6-${name}`).value; });
      row.examPaperPdf = paper.files[0]?.name || row.examPaperPdf || "";
      row.answerPdf = answer.files[0]?.name || row.answerPdf || "";
      normalizeExamV6(row);
      saveStore();
      renderExamsV6();
    });
    form.append(save);
  } else {
    form.append(el("p", "muted", "일반 계정은 조회만 가능하고 수정은 관리자에게 요청해야 합니다."));
  }
  setTimeout(computeExamAutoFieldsV6, 0);
  return form;
}

function computeExamAutoFieldsV6() {
  const score = Number(document.getElementById("examV6-score")?.value || 0);
  const rank = Number(document.getElementById("examV6-rank")?.value || 0);
  const count = Number(document.getElementById("examV6-student_count")?.value || 0);
  const pct = count && rank ? Math.round(((count - rank + 1) / count) * 1000) / 10 : "";
  const grade = score >= 90 ? "1등급" : score >= 80 ? "2등급" : score >= 70 ? "3등급" : score >= 60 ? "4등급" : score ? "5등급 이하" : "";
  const avg = averageScoreForCurrentSubjectV6();
  const p = document.getElementById("examV6-percentile");
  const g = document.getElementById("examV6-grade_level");
  const a = document.getElementById("examV6-average");
  if (p) p.value = pct;
  if (g) g.value = grade;
  if (a) a.value = avg || "";
}

function averageScoreForCurrentSubjectV6() {
  const subject = document.getElementById("examV6-subject")?.value || "";
  const rows = (store.exams || []).filter((row) => !subject || row.subject === subject);
  if (!rows.length) return "";
  return Math.round(rows.reduce((sum, row) => sum + Number(row.score || row.raw_score || 0), 0) / rows.length);
}

function normalizeExamV6(row) {
  row.year ??= "2026";
  row.grade ??= "";
  row.base_score ??= 100;
  row.examPaperPdf ??= "";
  row.percentile = row.student_count && row.rank ? String(Math.round(((Number(row.student_count) - Number(row.rank) + 1) / Number(row.student_count)) * 1000) / 10) : (row.percentile || "");
  const score = Number(row.score || row.raw_score || 0);
  row.grade_level = score >= 90 ? "1등급" : score >= 80 ? "2등급" : score >= 70 ? "3등급" : score >= 60 ? "4등급" : (score ? "5등급 이하" : row.grade_level || "");
  return row;
}

function selectFromV6(values, selected, emptyLabel = "") {
  const select = document.createElement("select");
  if (emptyLabel) select.append(option("", emptyLabel));
  values.filter(Boolean).forEach((value) => select.append(option(value, value)));
  select.value = selected || "";
  return select;
}

function downloadExamScheduleV5(rows) {
  const target = rows.length ? rows : (store.exams || []);
  const cols = ["year", "grade", "date", "title", "subject", "teacher", "scope", "examPaperPdf", "memo"];
  const html = `<!doctype html><meta charset="utf-8"><title>시험일정표</title><style>${reportCssV5()}</style><h1>시험일정표</h1><table><thead><tr>${cols.map((c) => `<th>${labelFor(c)}</th>`).join("")}</tr></thead><tbody>${target.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  exportCsv(`시험일정표_${today}.html`, html);
}

function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위",
    year: "시험년도", grade: "학년", base_score: "기본점수", examPaperPdf: "시험지", time: "시간"
  }[field] || field;
}

function extendAppV7() {
  Object.assign(pageMeta, {
    examSchedules: ["시", "시험일정"],
    records: ["세", "세특 관리"]
  });
  Object.assign(permissions, {
    examSchedules: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] },
    records: { create: ["admin", "user"], edit: ["admin"], del: ["admin"] }
  });
  store.examSchedules ??= [
    { id: 1, year: "2026", grade: "2학년", date: today, title: "국어 수행평가", subject: "국어", teacher: teachersList()[0] || "", scope: "문학 작품 분석", place: "교실", memo: "준비물 확인" }
  ];
  store.records ??= [
    { id: 1, date: today, subject: "국어", teacher: teachersList()[0] || "", activity: "토론 발표", competency: "의사소통, 비판적 사고", evidence: "발표 자료와 피드백", draft: "작품 해석 과정에서 근거를 들어 자신의 의견을 표현함.", status: "초안" }
  ];
  store.settings.enabledQuickButtons ??= {};
  store.settings.enabledSubjects ??= {};
  saveStore();
}

function roleName(role) {
  return { admin: "관리자", user: "일반 사용자", print: "프린트 전용" }[role] || role;
}

function navKeys() {
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "notices", "examSchedules", "meals", "subjects", "teachers", "materials", "assignments", "exams", "records", "portfolios", "penalties", "timetable", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "print");
  return keys;
}

function buildNav() {
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "site" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
  });
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "dashboard") return renderDashboardV7();
  if (key === "attendance") return renderCollectionV7("attendance");
  if (key === "examSchedules") return renderCollectionV7("examSchedules");
  if (key === "records") return renderCollectionV7("records");
  if (key === "accounts") return renderAccountsV7();
  if (key === "materials" || key === "portfolios") return renderCollectionV7(key);
  if (key === "personal") return renderPersonalV4();
  if (key === "meals") return renderCollectionV7("meals");
  if (key === "budget") return renderCollectionV7("budget");
  if (key === "clubs") return renderCollectionV7("clubs");
  if (key === "notices") return renderCollectionV7("notices");
  if (key === "penalties") return renderPenaltiesV6();
  if (key === "timetable") return renderTimetableV6();
  if (key === "print") return renderPrintV7();
  if (key === "admin") return renderAdminV6();
  if (key === "site") return renderSiteV7();
  if (key === "exams") return renderExamsV6();
  renderCollectionV7(key);
}

function renderDashboardV7() {
  renderDashboardV6();
  content.querySelector(".system-notice")?.remove();
  const systemBox = panel("시스템 공지");
  const state = store.settings.systemNoticeEnabled ? "활성" : "비활성";
  systemBox.append(el("p", "muted", `상태: ${state}`), el("p", "", store.settings.systemNotice || "등록된 시스템 공지가 없습니다."));
  const firstGrid = content.querySelector(".dashboard-grid");
  if (firstGrid) content.insertBefore(systemBox, firstGrid);
  else content.append(systemBox);
}

function renderCollectionV7(key) {
  content.replaceChildren();
  const rows = filteredRowsV7(key);
  const section = panel(pageLabel(key));
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  if (key === "meals") actions.append(mealImportButtonV5());
  if (["materials", "portfolios"].includes(key)) {
    const bulk = button("일괄 다운", "ghost");
    bulk.addEventListener("click", () => downloadReportV5(key, rows));
    actions.append(bulk);
  }
  const download = button("보고서 다운로드", "ghost");
  download.addEventListener("click", () => downloadReportV5(key, rows));
  const add = button("새 항목");
  add.disabled = !can("create", key);
  add.addEventListener("click", () => openEditorV7(key));
  actions.append(download, add);
  head.append(actions);
  section.append(filterBarV7(key), tableV7(key, rows));
  content.append(section);
}

function filterBarV7(key) {
  const bar = el("div", "toolbar compact-filter");
  filterFieldsForV7(key).forEach((field) => {
    const input = document.createElement("input");
    input.dataset.filter = field;
    input.placeholder = `${labelFor(field)} 검색`;
    input.value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
    input.addEventListener("input", () => sessionStorage.setItem(`filter:${key}:${field}`, input.value));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") renderPage(key); });
    bar.append(input);
  });
  const apply = button("검색", "ghost");
  apply.addEventListener("click", () => renderPage(key));
  const reset = button("필터 초기화", "ghost");
  reset.addEventListener("click", () => {
    filterFieldsForV7(key).forEach((field) => sessionStorage.removeItem(`filter:${key}:${field}`));
    globalSearch.value = "";
    renderPage(key);
  });
  bar.append(apply, reset);
  return bar;
}

function filteredRowsV7(key) {
  const query = globalSearch.value.trim().toLowerCase();
  return (key === "notices" ? visibleNotices() : (store[key] || [])).filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query)) return false;
    return filterFieldsForV7(key).every((field) => {
      const value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
      return !value || String(row[field] || "").includes(value);
    });
  });
}

function filterFieldsForV7(key) {
  const extra = {
    examSchedules: ["year", "grade", "date", "title", "subject", "teacher"],
    records: ["date", "subject", "teacher", "activity", "status"]
  };
  return extra[key] || filterFieldsForV6(key);
}

function columnsForV7(key) {
  return {
    examSchedules: ["year", "grade", "date", "title", "subject", "teacher", "scope", "place", "memo"],
    records: ["date", "subject", "teacher", "activity", "competency", "evidence", "draft", "status"]
  }[key] || columnsForV6(key);
}

function fieldsForV7(key) {
  const map = {
    examSchedules: [["year", "시험년도", "text"], ["grade", "학년", "text"], ["date", "시험일자", "date"], ["title", "시험명", "text", true], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["scope", "시험범위", "textarea"], ["place", "장소", "text"], ["memo", "메모", "textarea"]],
    records: [["date", "날짜", "date"], ["subject", "과목", "select", subjectsList()], ["teacher", "담당 선생님", "select", teachersList()], ["activity", "활동명", "text", true], ["competency", "역량/키워드", "text"], ["evidence", "근거자료", "textarea"], ["draft", "세특 초안", "textarea"], ["status", "상태", "select", ["초안", "검토중", "완료"]]]
  };
  return map[key] || fieldsForV6(key);
}

function tableV7(key, rows) {
  if (!rows.length) return el("div", "empty", "항목이 없습니다.");
  const cols = columnsForV7(key);
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  cols.forEach((col) => hr.append(el("th", "", labelFor(col))));
  hr.append(el("th", "", "관리"));
  thead.append(hr);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => tr.append(el("td", "", row[col] || "")));
    const td = el("td", "row-actions");
    const view = button("보기", "ghost");
    view.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    td.append(view);
    if (["materials", "portfolios"].includes(key)) {
      const one = button("개별 다운", "ghost");
      one.addEventListener("click", () => downloadReportV5(key, [row]));
      td.append(one);
    }
    const edit = button(can("edit", key) ? "수정" : "수정 요청", "ghost");
    edit.addEventListener("click", () => can("edit", key) ? openEditorV7(key, row.id) : requestEdit(key, row.id));
    td.append(edit);
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      td.append(del);
    }
    tr.append(td);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function openEditorV7(key, id = null, origin = key) {
  if (id && !can("edit", key)) return requestEdit(key, id);
  if (!id && !can("create", key)) return;
  const row = id ? (store[key] || []).find((item) => item.id === id) : {};
  editing = { key, id, origin, v7: true };
  dialogTitle.textContent = `${pageLabel(key)} ${id ? "수정" : "추가"}`;
  editorFields.replaceChildren();
  fieldsForV7(key).forEach(([name, label, type, requiredOrOptions]) => editorFields.append(inputNodeV4(name, label, type, requiredOrOptions, row?.[name] || "")));
  if (id) editorFields.append(inputNodeV4("_confirm_password", "현재 비밀번호", "password", true, ""));
  if (key === "notices") bindNoticeEditorV5();
  editorError.textContent = "";
  editorDialog.showModal();
}

function currentWorkspaceIdV52() {
  return currentUser?.workspace_id
    || currentUser?.workspaceId
    || currentUser?.currentWorkspaceId
    || authWorkspaceStateV36?.currentWorkspaceId
    || store?.workspace_id
    || window.PMDataService?.currentWorkspaceId?.()
    || "";
}

function currentRoleV52() {
  return currentUser?.role || authWorkspaceStateV36?.currentRole || "normal";
}

function toDateV52(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function decorateNoticeRowV52(row, existing = {}) {
  const workspaceId = row.workspaceId || row.workspace_id || existing.workspaceId || existing.workspace_id || currentWorkspaceIdV52();
  const now = new Date().toISOString();
  const authorUid = existing.authorUid || row.authorUid || currentUser?.uid || currentUser?.id || "";
  const authorEmail = existing.authorEmail || row.authorEmail || currentUser?.email || "";
  const authorName = existing.authorName || row.authorName || currentUser?.name || currentUser?.displayName || authorEmail;
  const authorRole = existing.authorRole || row.authorRole || currentRoleV52();
  return {
    ...existing,
    ...row,
    workspaceId,
    workspace_id: workspaceId,
    status: row.status || existing.status || "active",
    visibility: row.visibility || existing.visibility || "workspace",
    source: row.source || existing.source || "학교",
    subject: row.source === "시스템" ? "" : (row.subject || existing.subject || "공통"),
    notice_date: row.notice_date || existing.notice_date || today,
    authorUid,
    authorEmail,
    authorName,
    authorRole,
    created_by: existing.created_by || row.created_by || authorEmail,
    createdAt: existing.createdAt || row.createdAt || now,
    updatedAt: now
  };
}

function noticeVisibleInWorkspaceV52(row) {
  const workspaceId = currentWorkspaceIdV52();
  const rowWorkspaceId = row.workspaceId || row.workspace_id;
  if (rowWorkspaceId && workspaceId && rowWorkspaceId !== workspaceId) return false;
  if (["deleted", "archived", "hidden"].includes(String(row.status || "active"))) return false;
  const expiresAt = toDateV52(row.expiresAt || row.visibleUntil || row.autoHideAt);
  if (!expiresAt) return true;
  return expiresAt.getTime() > Date.now();
}

function cleanFirestoreObjectV52(value) {
  if (Array.isArray(value)) return value.map(cleanFirestoreObjectV52);
  if (!value || typeof value !== "object" || typeof value.toDate === "function") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cleanFirestoreObjectV52(item)])
  );
}

function visibleNotices() {
  const rows = (store.notices || []).filter(noticeVisibleInWorkspaceV52);
  console.info("[notice:visible-filter]", {
    beforeCount: (store.notices || []).length,
    afterCount: rows.length,
    workspaceId: currentWorkspaceIdV52(),
    notices: (store.notices || []).map((notice) => ({
      id: notice.id,
      title: notice.title,
      status: notice.status,
      authorRole: notice.authorRole,
      workspaceId: notice.workspaceId || notice.workspace_id,
      expiresAt: notice.expiresAt || notice.visibleUntil || notice.autoHideAt || null
    }))
  });
  return rows;
}

async function saveNoticeDirectToFirestoreV52(row) {
  if (!row || !window.PMFirebaseRuntime?.hasConfig?.()) return;
  const workspaceId = row.workspaceId || row.workspace_id || currentWorkspaceIdV52();
  if (!workspaceId || !row.id) return;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    if (!runtime) return;
    const FieldValue = firebase.firestore.FieldValue;
    const docId = String(row.id);
    console.info("[notice:add:start]", {
      workspaceId,
      uid: currentUser?.uid || currentUser?.id || "",
      role: currentRoleV52(),
      title: row.title || ""
    });
    const payload = cleanFirestoreObjectV52({ ...row, id: docId, workspaceId, workspace_id: workspaceId, updatedAt: FieldValue.serverTimestamp() });
    if (!row.createdAt) payload.createdAt = FieldValue.serverTimestamp();
    await runtime.db.collection("workspaces").doc(workspaceId).collection("notices").doc(docId).set(payload, { merge: true });
    console.info("[notice:add:success]", { workspaceId, docId });
  } catch (error) {
    console.error("[notice:add:error]", {
      workspaceId,
      uid: currentUser?.uid || currentUser?.id || "",
      role: currentRoleV52(),
      code: error?.code || "",
      message: error?.message || String(error)
    });
  }
}

function saveEditor(event) {
  event.preventDefault();
  if (!editing) return;
  const payload = Object.fromEntries(new FormData(editorForm).entries());
  if (editing.id && payload._confirm_password !== currentUser.password) {
    editorError.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  delete payload._confirm_password;
  const origin = editing.origin;
  const rows = store[editing.key] || (store[editing.key] = []);
  let savedRow = null;
  if (editing.id) {
    const index = rows.findIndex((row) => row.id === editing.id);
    if (index < 0) return;
    rows[index] = editing.key === "notices"
      ? decorateNoticeRowV52({ ...payload, id: editing.id }, rows[index])
      : { ...rows[index], ...payload };
    savedRow = rows[index];
  } else if (Object.values(payload).some((value) => String(value || "").trim())) {
    const id = Date.now();
    const row = editing.key === "notices"
      ? decorateNoticeRowV52({ id, ...payload })
      : { id, ...payload, created_by: currentUser.email };
    rows.unshift(row);
    savedRow = row;
  }
  saveStore();
  if (editing.key === "notices" && savedRow) saveNoticeDirectToFirestoreV52(savedRow);
  closeEditor();
  renderPage(origin || currentPage);
}

function renderAccountsV7() {
  renderAccountsV6();
  const panelEl = content.querySelector(".panel");
  const guide = el("section", "panel account-guide");
  guide.append(el("h3", "", "계정 추가 안내"), el("p", "", "새 계정 생성 버튼을 누르면 기본 비밀번호 1234의 일반 사용자 계정이 만들어집니다. 생성 후 이름, 이메일, 역할을 저장하고 필요한 권한을 체크하세요."), el("p", "", "프린트 전용 계정은 역할을 '프린트 전용'으로 선택하면 프린트/시험일정 중심으로 표시됩니다."));
  panelEl?.after(guide);
}

function renderSiteV7() {
  renderSiteV4();
  const grid = content.querySelector(".form-grid");
  if (!grid) return;
  grid.append(makeCheckboxGroupV7("빠른등록 활성", "quickEnabledBox", Object.keys(permissions).filter((key) => permissions[key]?.create).map((key) => [key, pageLabel(key)]), store.settings.quickButtons || []));
  grid.append(makeCheckboxGroupV7("과목 선택 활성", "subjectEnabledBox", subjectsList().map((name) => [name, name]), subjectsList()));
}

function makeCheckboxGroupV7(title, id, options, selected) {
  const wrap = el("div", "wide option-checks");
  wrap.id = id;
  wrap.append(el("strong", "", title));
  options.forEach(([value, text]) => {
    const lab = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.checked = selected.includes(value);
    lab.append(input, document.createTextNode(` ${text}`));
    wrap.append(lab);
  });
  return wrap;
}

function saveSiteSettingsV2() {
  const errorField = document.getElementById("siteError");
  const passwordField = document.getElementById("sitePasswordInput");
  if (!passwordField || passwordField.value !== currentUser.password) {
    errorField.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  store.settings.siteName = document.getElementById("siteNameInput").value;
  store.settings.logoText = document.getElementById("logoTextInput").value;
  store.settings.systemNotice = document.getElementById("systemNoticeInput").value;
  store.settings.editMode = document.getElementById("editModeInput").value === "on";
  const quickBox = document.getElementById("quickEnabledBox");
  store.settings.quickButtons = quickBox ? [...quickBox.querySelectorAll("input:checked")].map((input) => input.value) : [...document.getElementById("quickButtonSelect").selectedOptions].map((option) => option.value);
  const subjectBox = document.getElementById("subjectEnabledBox");
  store.settings.subjects = subjectBox ? [...subjectBox.querySelectorAll("input:checked")].map((input) => input.value) : splitLines(document.getElementById("subjectOptions").value);
  store.settings.textbooks = splitLines(document.getElementById("textbookOptions").value);
  store.settings.publishers = splitLines(document.getElementById("publisherOptions").value);
  const sys = document.getElementById("systemNoticeToggle");
  if (sys) store.settings.systemNoticeEnabled = sys.value === "on";
  saveStore();
  applySettings();
  buildNav();
  renderSiteV7();
  showMessage("저장 완료", "홈페이지 설정이 저장되었습니다.");
}

function renderPrintV7() {
  renderPrintV6();
  const section = content.querySelector(".panel");
  if (!section) return;
  const scheduleBtn = button("시험일정표 다운로드", "ghost");
  scheduleBtn.addEventListener("click", () => downloadExamScheduleV7(store.examSchedules || []));
  section.append(scheduleBtn);
}

function downloadExamScheduleV7(rows) {
  const target = rows.length ? rows : (store.examSchedules || []);
  const cols = columnsForV7("examSchedules");
  const html = `<!doctype html><meta charset="utf-8"><title>시험일정표</title><style>${reportCssV5()}</style><h1>시험일정표</h1><table><thead><tr>${cols.map((c) => `<th>${labelFor(c)}</th>`).join("")}</tr></thead><tbody>${target.map((r) => `<tr>${cols.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  exportCsv(`시험일정표_${today}.html`, html);
}

function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위",
    year: "시험년도", grade: "학년", base_score: "기본점수", examPaperPdf: "시험지", time: "시간", place: "장소", activity: "활동명", competency: "역량", evidence: "근거자료", draft: "세특 초안"
  }[field] || field;
}

function extendAppV8() {
  (store.examSchedules || []).forEach((row) => {
    row.end_date ??= row.date || today;
  });
  saveStore();
}

function updateGreeting() {
  if (!currentUser) return;
  const name = currentUser.name || "";
  if (currentUser.role === "admin") roleLabel.textContent = `${name}관리자님 어서오십시오.`;
  else if (currentUser.role === "print") roleLabel.textContent = `${name}사용자님 프린트 전용계정입니다.`;
  else roleLabel.textContent = `${name}사용자님 어서오십시오.`;
}

function renderDashboardV8() {
  renderDashboardV6();
  content.querySelectorAll(".system-notice").forEach((node) => node.remove());
  const existing = [...content.querySelectorAll(".panel-head h3")].find((node) => node.textContent === "시스템 공지")?.closest(".panel");
  if (existing) existing.remove();
  const systemBox = panel("시스템 공지");
  systemBox.classList.add("dashboard-system-box");
  systemBox.append(
    el("p", "muted", `상태: ${store.settings.systemNoticeEnabled ? "활성" : "비활성"}`),
    el("p", "", store.settings.systemNotice || "등록된 시스템 공지가 없습니다.")
  );
  const grid = content.querySelector(".dashboard-grid");
  if (grid) content.insertBefore(systemBox, grid);
  else content.append(systemBox);
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "dashboard") return renderDashboardV8();
  if (key === "personal") return renderPersonalV8();
  if (key === "attendance") return renderCollectionV7("attendance");
  if (key === "examSchedules") return renderCollectionV7("examSchedules");
  if (key === "records") return renderCollectionV7("records");
  if (key === "accounts") return renderAccountsV8();
  if (key === "materials" || key === "portfolios") return renderCollectionV8(key);
  if (key === "meals") return renderCollectionV7("meals");
  if (key === "budget") return renderCollectionV7("budget");
  if (key === "clubs") return renderCollectionV7("clubs");
  if (key === "notices") return renderCollectionV7("notices");
  if (key === "penalties") return renderPenaltiesV6();
  if (key === "timetable") return renderTimetableV6();
  if (key === "print") return renderPrintV7();
  if (key === "admin") return renderAdminV6();
  if (key === "site") return renderSiteV8();
  if (key === "exams") return renderExamsV6();
  renderCollectionV7(key);
}

function columnsForV7(key) {
  return {
    examSchedules: ["year", "grade", "date", "end_date", "title", "subject", "teacher", "scope", "place", "memo"],
    records: ["date", "subject", "teacher", "activity", "competency", "evidence", "draft", "status"]
  }[key] || columnsForV6(key);
}

function fieldsForV7(key) {
  const map = {
    examSchedules: [["year", "시험년도", "text"], ["grade", "학년", "text"], ["date", "시작날짜", "date"], ["end_date", "마지막날짜", "date"], ["title", "시험명", "text", true], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["scope", "시험범위", "textarea"], ["place", "장소", "text"], ["memo", "메모", "textarea"]],
    records: [["date", "날짜", "date"], ["subject", "과목", "select", subjectsList()], ["teacher", "담당 선생님", "select", teachersList()], ["activity", "활동명", "text", true], ["competency", "역량/키워드", "text"], ["evidence", "근거자료", "textarea"], ["draft", "세특 초안", "textarea"], ["status", "상태", "select", ["초안", "검토중", "완료"]]]
  };
  return map[key] || fieldsForV6(key);
}

function renderCollectionV8(key) {
  content.replaceChildren();
  const rows = filteredRowsV7(key);
  const section = panel(pageLabel(key));
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const bulk = button("일괄 다운", "ghost");
  bulk.addEventListener("click", () => downloadReportV8(key, rows));
  const add = button("새 항목");
  add.disabled = !can("create", key);
  add.addEventListener("click", () => openEditorV7(key));
  actions.append(bulk, add);
  head.append(actions);
  section.append(filterBarV7(key), tableV8(key, rows));
  content.append(section);
}

function tableV8(key, rows) {
  if (!rows.length) return el("div", "empty", "항목이 없습니다.");
  const cols = columnsForV7(key);
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  cols.forEach((col) => hr.append(el("th", "", labelFor(col))));
  hr.append(el("th", "", "관리"));
  thead.append(hr);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => tr.append(el("td", "", row[col] || "")));
    const td = el("td", "row-actions");
    const view = button("보기", "ghost");
    view.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    const one = button("개별 다운", "ghost");
    one.addEventListener("click", () => downloadReportV8(key, [row]));
    const edit = button(can("edit", key) ? "수정" : "수정 요청", "ghost");
    edit.addEventListener("click", () => can("edit", key) ? openEditorV7(key, row.id) : requestEdit(key, row.id));
    td.append(view, one, edit);
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      td.append(del);
    }
    tr.append(td);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function downloadReportV8(key, rows = store[key] || []) {
  const cols = columnsForV7(key);
  const html = `<!doctype html><meta charset="utf-8"><title>${pageLabel(key)} 보고서</title><style>${reportCssV8()}</style><main><section class="cover"><h1>${pageLabel(key)} 보고서</h1><p>생성일 ${today}</p><p>총 ${rows.length}건</p></section>${rows.map((row, index) => `<section class="report-card"><h2>${index + 1}. ${escapeHtml(row.title || row.name || row.subject || pageLabel(key))}</h2><table>${cols.map((col) => `<tr><th>${labelFor(col)}</th><td>${escapeHtml(row[col] || "")}</td></tr>`).join("")}</table></section>`).join("")}</main>`;
  exportCsv(`${pageLabel(key)}_보고서_${today}.html`, html);
}

function reportCssV8() {
  return "body{margin:0;background:#f3f5f8;color:#111827;font-family:Arial,'Malgun Gothic',sans-serif}main{max-width:980px;margin:0 auto;padding:36px}.cover{text-align:center;background:#111827;color:white;border-radius:10px;padding:34px;margin-bottom:22px}.cover h1{margin:0 0 10px;font-size:30px}.report-card{background:white;border:1px solid #d8dee8;border-radius:10px;margin:18px 0;padding:22px;box-shadow:0 8px 24px rgba(15,23,42,.06);page-break-inside:avoid}.report-card h2{margin:0 0 16px;font-size:19px;border-bottom:2px solid #111827;padding-bottom:10px}table{width:100%;border-collapse:collapse}th{width:170px;background:#f1f4f8;color:#475467}td,th{border:1px solid #d0d7e2;padding:10px;text-align:left;vertical-align:top;white-space:pre-wrap}";
}

function renderSiteV8() {
  renderSiteV7();
  ["quickButtonSelect", "subjectOptions"].forEach((id) => {
    const field = document.getElementById(id);
    field?.closest("label")?.remove();
  });
}

function saveSiteSettingsV2() {
  const errorField = document.getElementById("siteError");
  const passwordField = document.getElementById("sitePasswordInput");
  if (!passwordField || passwordField.value !== currentUser.password) {
    errorField.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  store.settings.siteName = document.getElementById("siteNameInput").value;
  store.settings.logoText = document.getElementById("logoTextInput").value;
  store.settings.systemNotice = document.getElementById("systemNoticeInput").value;
  store.settings.editMode = document.getElementById("editModeInput").value === "on";
  store.settings.quickButtons = [...document.querySelectorAll("#quickEnabledBox input:checked")].map((input) => input.value);
  store.settings.subjects = [...document.querySelectorAll("#subjectEnabledBox input:checked")].map((input) => input.value);
  store.settings.textbooks = splitLines(document.getElementById("textbookOptions").value);
  store.settings.publishers = splitLines(document.getElementById("publisherOptions").value);
  const sys = document.getElementById("systemNoticeToggle");
  if (sys) store.settings.systemNoticeEnabled = sys.value === "on";
  saveStore();
  applySettings();
  buildNav();
  renderSiteV8();
  showMessage("저장 완료", "홈페이지 설정이 저장되었습니다.");
}

function renderAccountsV8() {
  renderAccountsV7();
  content.querySelector("#allAccountsPanel")?.remove();
  const all = panel("전체 계정 목록");
  all.id = "allAccountsPanel";
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = `<thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>기본 안내</th></tr></thead><tbody>${accounts.map((account) => `<tr><td>${escapeHtml(account.name || "")}</td><td>${escapeHtml(account.email || "")}</td><td>${escapeHtml(roleName(account.role))}</td><td>${account.role === "print" ? "프린트 전용 화면 사용" : "권한 체크 후 사용"}</td></tr>`).join("")}</tbody>`;
  wrap.append(table);
  all.append(wrap);
  content.append(all);
}

function renderPersonalV8() {
  renderPersonalV4();
  content.querySelectorAll(".cards .card").forEach((card, index) => {
    const row = (store.diary || [])[index];
    if (!row) return;
    card.style.cursor = "pointer";
    card.addEventListener("click", () => showViewerV5("업무일지", row));
  });
}

function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위",
    year: "시험년도", grade: "학년", base_score: "기본점수", examPaperPdf: "시험지", time: "시간", place: "장소", activity: "활동명", competency: "역량", evidence: "근거자료", draft: "세특 초안", end_date: "마지막날짜"
  }[field] || field;
}

function extendAppV9() {
  store.settings.textbooks ??= textbooksList();
  store.settings.publishers ??= publishersList();
  saveStore();
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "dashboard") return renderDashboardV8();
  if (key === "personal") return renderPersonalV8();
  if (key === "schedules") return renderSchedulesV9();
  if (key === "attendance") return renderCollectionV7("attendance");
  if (key === "examSchedules") return renderCollectionV7("examSchedules");
  if (key === "records") return renderCollectionV7("records");
  if (key === "accounts") return renderAccountsV8();
  if (key === "materials" || key === "portfolios") return renderCollectionV8(key);
  if (key === "meals") return renderCollectionV7("meals");
  if (key === "budget") return renderCollectionV7("budget");
  if (key === "clubs") return renderCollectionV7("clubs");
  if (key === "notices") return renderCollectionV7("notices");
  if (key === "penalties") return renderPenaltiesV6();
  if (key === "timetable") return renderTimetableV6();
  if (key === "print") return renderPrintV7();
  if (key === "admin") return renderAdminV6();
  if (key === "site") return renderSiteV9();
  if (key === "exams") return renderExamsV6();
  renderCollectionV7(key);
}

function renderSchedulesV9() {
  renderCollectionV7("schedules");
  const pastePanel = panel("일정 붙여넣기 등록");
  pastePanel.classList.add("paste-panel");
  const help = el("p", "muted", "한 줄에 하나씩 붙여넣으세요. 예: 2026-06-17 19:00 20:30 수학 수행평가 준비 / 메모");
  const textarea = document.createElement("textarea");
  textarea.id = "schedulePasteInput";
  textarea.placeholder = "2026-06-17 19:00 20:30 수학 수행평가 준비 / 함수 단원 정리";
  const actions = el("div", "row-actions");
  const importBtn = button("붙여넣기 일정 등록");
  importBtn.addEventListener("click", () => importSchedulesFromPasteV9(textarea.value));
  const clearBtn = button("비우기", "ghost");
  clearBtn.addEventListener("click", () => { textarea.value = ""; });
  actions.append(importBtn, clearBtn);
  pastePanel.append(help, textarea, actions);
  content.prepend(pastePanel);
}

function importSchedulesFromPasteV9(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return showMessage("등록 실패", "붙여넣을 일정 내용이 없습니다.");
  const rows = lines.map((line) => {
    const memoSplit = line.split(/\s\/\s| \| /);
    const main = memoSplit[0].trim();
    const memo = memoSplit.slice(1).join(" / ").trim();
    const date = (main.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/) || [today])[0].replaceAll(".", "-").replaceAll("/", "-");
    const times = main.match(/\b\d{1,2}:\d{2}\b/g) || [];
    let title = main.replace(date, "").trim();
    times.forEach((time) => { title = title.replace(time, "").trim(); });
    return {
      id: Date.now() + Math.random(),
      title: title || "붙여넣기 일정",
      date,
      start_time: times[0] || "",
      end_time: times[1] || "",
      type: "기타",
      importance: "보통",
      status: "예정",
      memo
    };
  });
  store.schedules.unshift(...rows);
  saveStore();
  renderPage("schedules");
  showMessage("등록 완료", `${rows.length}개 일정을 등록했습니다.`);
}

function showQuickPopup(type) {
  const old = document.getElementById("quickPopup");
  if (old) old.remove();
  const wrap = el("div", "quick-popup");
  wrap.id = "quickPopup";
  const head = el("div", "panel-head");
  head.append(el("h3", "", type === "meals" ? "급식 빠른 보기" : "시간표 빠른 보기"));
  const close = button("×", "icon-button");
  close.addEventListener("click", () => wrap.remove());
  head.append(close);
  wrap.append(head);
  if (type === "meals") {
    (store.meals || []).slice(0, 7).forEach((row) => wrap.append(el("p", "", `${row.date} ${row.meal}: ${row.menu}`)));
  } else {
    wrap.append(quickTimetableControlsV9());
    quickTimetableRowsV9().forEach((row) => {
      const item = el("div", "quick-tt-row");
      item.append(
        el("strong", "", `${row.period || ""} ${row.time || ""}`.trim()),
        el("span", "", `${row.day || ""} · ${row.subject || ""}`),
        el("small", "", [row.teacher, row.room].filter(Boolean).join(" / "))
      );
      wrap.append(item);
    });
  }
  document.body.append(wrap);
}

function quickTimetableControlsV9() {
  const box = el("div", "quick-tt-controls");
  const selector = document.createElement("select");
  (store.timetableSets || []).forEach((set) => selector.append(option(set.id, set.name)));
  selector.value = sessionStorage.getItem("quickTimetableSet") || sessionStorage.getItem("pm-timetable-set") || store.timetableSets?.[0]?.id || "";
  const daySelect = document.createElement("select");
  ["일", "월", "화", "수", "목", "금", "토"].forEach((day) => daySelect.append(option(day, `${day}요일`)));
  daySelect.value = sessionStorage.getItem("quickTimetableDay") || ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()];
  selector.addEventListener("change", () => {
    sessionStorage.setItem("quickTimetableSet", selector.value);
    showQuickPopup("timetable");
  });
  daySelect.addEventListener("change", () => {
    sessionStorage.setItem("quickTimetableDay", daySelect.value);
    showQuickPopup("timetable");
  });
  box.append(makeField("시간표", "quickTimetableSet", selector), makeField("요일", "quickTimetableDay", daySelect));
  return box;
}

function quickTimetableRowsV9() {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const setId = sessionStorage.getItem("quickTimetableSet") || sessionStorage.getItem("pm-timetable-set") || store.timetableSets?.[0]?.id || "school";
  const selectedDay = sessionStorage.getItem("quickTimetableDay") || dayNames[new Date().getDay()];
  let rows = (store.timetable || []).filter((row) => (row.setId || "school") === setId && row.day === selectedDay);
  if (!rows.length) rows = (store.timetable || []).filter((row) => (row.setId || "school") === setId);
  if (!rows.length) rows = quickTimetableRowsV5().filter((row) => (row.setId || "school") === setId || !row.setId);
  if (!rows.length) rows = store.timetable || [];
  return rows.sort((a, b) => Number(String(a.period).replace(/\D/g, "")) - Number(String(b.period).replace(/\D/g, ""))).slice(0, 12);
}

function renderSiteV9() {
  renderSiteV8();
  ["textbookOptions", "publisherOptions"].forEach((id) => {
    const field = document.getElementById(id);
    field?.closest("label")?.remove();
  });
  const grid = content.querySelector(".form-grid");
  if (!grid) return;
  if (!document.getElementById("textbookEnabledBox")) {
    grid.append(makeCheckboxGroupV7("교과서 선택값", "textbookEnabledBox", textbooksList().map((name) => [name, name]), textbooksList()));
  }
  if (!document.getElementById("publisherEnabledBox")) {
    grid.append(makeCheckboxGroupV7("출판사 선택값", "publisherEnabledBox", publishersList().map((name) => [name, name]), publishersList()));
  }
}

function saveSiteSettingsV2() {
  const errorField = document.getElementById("siteError");
  const passwordField = document.getElementById("sitePasswordInput");
  if (!passwordField || passwordField.value !== currentUser.password) {
    errorField.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }
  store.settings.siteName = document.getElementById("siteNameInput").value;
  store.settings.logoText = document.getElementById("logoTextInput").value;
  store.settings.systemNotice = document.getElementById("systemNoticeInput").value;
  store.settings.editMode = document.getElementById("editModeInput").value === "on";
  store.settings.quickButtons = [...document.querySelectorAll("#quickEnabledBox input:checked")].map((input) => input.value);
  store.settings.subjects = [...document.querySelectorAll("#subjectEnabledBox input:checked")].map((input) => input.value);
  store.settings.textbooks = [...document.querySelectorAll("#textbookEnabledBox input:checked")].map((input) => input.value);
  store.settings.publishers = [...document.querySelectorAll("#publisherEnabledBox input:checked")].map((input) => input.value);
  const sys = document.getElementById("systemNoticeToggle");
  if (sys) store.settings.systemNoticeEnabled = sys.value === "on";
  saveStore();
  applySettings();
  buildNav();
  renderSiteV9();
  showMessage("저장 완료", "홈페이지 설정이 저장되었습니다.");
}

function extendAppV10() {
  Object.assign(pageMeta, {
    lessons: ["수", "수업 기록"]
  });
  Object.assign(permissions, {
    lessons: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] }
  });
  store.lessons ??= [];
  syncLessonsFromTimetableV10(false);
  saveStore();
}

function navKeys() {
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "notices", "examSchedules", "meals", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "portfolios", "penalties", "timetable", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "print");
  return keys;
}

function buildNav() {
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
  });
}

function updateRequestBadgeV6() {
  nav.querySelectorAll(".nav-badge").forEach((badge) => badge.remove());
  const btn = nav.querySelector('[data-page="requests"]');
  if (!btn || !isAdmin()) return;
  const count = pendingRequestCountV6();
  if (count) btn.append(el("sup", "nav-badge", String(count)));
}

function renderPage(key) {
  if (["people", "friendAwards", "site", "admin", "budget"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar").classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "dashboard") return renderDashboardV8();
  if (key === "personal") return renderPersonalV8();
  if (key === "schedules") return renderSchedulesV10();
  if (key === "lessons") return renderLessonsV10();
  if (key === "attendance") return renderCollectionV7("attendance");
  if (key === "examSchedules") return renderCollectionV7("examSchedules");
  if (key === "records") return renderCollectionV7("records");
  if (key === "accounts") return renderAccountsV8();
  if (key === "materials" || key === "portfolios") return renderCollectionV8(key);
  if (key === "meals") return renderCollectionV7("meals");
  if (key === "budget") return renderCollectionV7("budget");
  if (key === "clubs") return renderCollectionV7("clubs");
  if (key === "notices") return renderCollectionV7("notices");
  if (key === "penalties") return renderPenaltiesV6();
  if (key === "timetable") return renderTimetableV6();
  if (key === "print") return renderPrintV7();
  if (key === "admin") return renderAdminV6();
  if (key === "site") return renderSiteV9();
  if (key === "exams") return renderExamsV6();
  renderCollectionV7(key);
}

function syncLessonsFromTimetableV10(showToast = true) {
  store.lessons ??= [];
  const existing = new Set(store.lessons.map((row) => row.timetable_id || `${row.setId || "school"}-${row.day}-${row.period}-${row.subject}`));
  const added = [];
  (store.timetable || []).forEach((row) => {
    const key = String(row.id || `${row.setId || "school"}-${row.day}-${row.period}-${row.subject}`);
    if (existing.has(key)) return;
    added.push({
      id: Date.now() + Math.random(),
      timetable_id: key,
      setId: row.setId || "school",
      day: row.day || "",
      period: row.period || "",
      time: row.time || "",
      subject: row.subject || "",
      teacher: row.teacher || "",
      room: row.room || "",
      lesson_date: "",
      summary: "",
      content: "",
      homework: "",
      late: "정상",
      attendance_note: "",
      status: "자동생성"
    });
  });
  if (added.length) {
    store.lessons.unshift(...added);
    saveStore();
  }
  if (showToast) showMessage("수업 자동생성", `${added.length}개 수업 기록을 시간표에서 생성했습니다.`);
  return added.length;
}

function renderLessonsV10() {
  syncLessonsFromTimetableV10(false);
  content.replaceChildren();
  const section = panel("수업 기록");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const sync = button("시간표에서 자동생성", "ghost");
  sync.addEventListener("click", () => { syncLessonsFromTimetableV10(true); renderLessonsV10(); });
  const download = button("수업 보고서 다운로드", "ghost");
  download.addEventListener("click", () => downloadReportV8("lessons", filteredRowsV10("lessons")));
  const add = button("새 수업");
  add.addEventListener("click", () => openEditorV10("lessons"));
  actions.append(sync, download, add);
  head.append(actions);
  section.append(filterBarV10("lessons"), tableV10("lessons", filteredRowsV10("lessons")));
  content.append(section);
}

function filterFieldsForV10(key) {
  const map = {
    lessons: ["day", "period", "subject", "teacher", "late", "status"],
    schedules: ["title", "date", "type", "status"]
  };
  return map[key] || filterFieldsForV7(key);
}

function columnsForV10(key) {
  return {
    lessons: ["day", "period", "time", "subject", "teacher", "room", "lesson_date", "summary", "late", "attendance_note", "status"]
  }[key] || columnsForV7(key);
}

function fieldsForV10(key) {
  const map = {
    lessons: [["lesson_date", "수업일", "date"], ["day", "요일", "select", ["일", "월", "화", "수", "목", "금", "토"]], ["period", "교시", "text"], ["time", "수업시간", "text"], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["room", "장소", "text"], ["summary", "수업내용 요약", "textarea"], ["content", "세부 수업내용", "textarea"], ["homework", "과제/준비물", "textarea"], ["late", "지각 여부", "select", ["정상", "지각", "조퇴", "결석", "확인 필요"]], ["attendance_note", "출결 메모", "textarea"], ["status", "상태", "select", ["자동생성", "작성중", "완료"]]]
  };
  return map[key] || fieldsForV7(key);
}

function filteredRowsV10(key) {
  const query = globalSearch.value.trim().toLowerCase();
  return (store[key] || []).filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query)) return false;
    return filterFieldsForV10(key).every((field) => {
      const value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
      return !value || String(row[field] || "").includes(value);
    });
  });
}

function filterBarV10(key) {
  const bar = el("div", "toolbar compact-filter");
  filterFieldsForV10(key).forEach((field) => {
    const input = document.createElement("input");
    input.placeholder = `${labelFor(field)} 검색`;
    input.value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
    input.addEventListener("input", () => sessionStorage.setItem(`filter:${key}:${field}`, input.value));
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") renderPage(key); });
    bar.append(input);
  });
  const apply = button("검색", "ghost");
  apply.addEventListener("click", () => renderPage(key));
  const reset = button("필터 초기화", "ghost");
  reset.addEventListener("click", () => {
    filterFieldsForV10(key).forEach((field) => sessionStorage.removeItem(`filter:${key}:${field}`));
    renderPage(key);
  });
  bar.append(apply, reset);
  return bar;
}

function tableV10(key, rows) {
  if (!rows.length) return el("div", "empty", "항목이 없습니다.");
  const cols = columnsForV10(key);
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const head = document.createElement("tr");
  cols.forEach((col) => head.append(el("th", "", labelFor(col))));
  head.append(el("th", "", "관리"));
  thead.append(head);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => tr.append(el("td", "", row[col] || "")));
    const td = el("td", "row-actions");
    const view = button("보기", "ghost");
    view.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    const edit = button("수정", "ghost");
    edit.addEventListener("click", () => openEditorV10(key, row.id));
    td.append(view, edit);
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      td.append(del);
    }
    tr.append(td);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function openEditorV10(key, id = null) {
  if (id && !can("edit", key)) return requestEdit(key, id);
  if (!id && !can("create", key)) return;
  const row = id ? (store[key] || []).find((item) => item.id === id) : {};
  editing = { key, id, origin: key, v10: true };
  dialogTitle.textContent = `${pageLabel(key)} ${id ? "수정" : "추가"}`;
  editorFields.replaceChildren();
  fieldsForV10(key).forEach(([name, label, type, requiredOrOptions]) => editorFields.append(inputNodeV4(name, label, type, requiredOrOptions, row?.[name] || "")));
  if (id) editorFields.append(inputNodeV4("_confirm_password", "현재 비밀번호", "password", true, ""));
  editorError.textContent = "";
  editorDialog.showModal();
}

function renderSchedulesV10() {
  renderSchedulesV9();
  const pastePanel = content.querySelector(".paste-panel");
  if (!pastePanel || document.getElementById("scheduleFileInput")) return;
  const file = document.createElement("input");
  file.id = "scheduleFileInput";
  file.type = "file";
  file.accept = ".csv,.txt";
  file.hidden = true;
  file.addEventListener("change", () => importScheduleFileV10(file.files[0]));
  const upload = button("일정 파일 업로드", "ghost");
  upload.addEventListener("click", () => file.click());
  pastePanel.querySelector(".row-actions")?.append(file, upload);
}

function importScheduleFileV10(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => importSchedulesFromPasteV9(String(reader.result || ""));
  reader.readAsText(file, "utf-8");
}

function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위",
    year: "시험년도", grade: "학년", base_score: "기본점수", examPaperPdf: "시험지", time: "시간", place: "장소", activity: "활동명", competency: "역량", evidence: "근거자료", draft: "세특 초안", end_date: "마지막날짜",
    lesson_date: "수업일", day: "요일", period: "교시", summary: "요약", content: "내용", homework: "과제", late: "지각 여부", attendance_note: "출결 메모"
  }[field] || field;
}

// Final V12 router: keep project/system pages active after legacy duplicate declarations.
function labelFor(field) {
  return labels[field] || {
    meal: "급식", menu: "메뉴", calories: "열량", amount: "금액", method: "수단", role: "역할", schedule: "시간표", room: "위치", memo: "메모",
    deadline_required: "마감일 여부", deadline_date: "마감일", rank: "석차", student_count: "응시인원", percentile: "백분위", grade_level: "등급", raw_score: "원점수", high_score: "최고점", average: "평균", scope: "범위",
    year: "시험년도", grade: "학년", base_score: "기본점수", examPaperPdf: "시험지", time: "시간", place: "장소", activity: "활동명", competency: "역량", evidence: "근거자료", draft: "세특 초안", end_date: "마지막날짜",
    lesson_date: "수업일", day: "요일", period: "교시", summary: "요약", content: "내용", homework: "과제", late: "지각 여부", attendance_note: "출결 메모",
    title: "제목", category: "분류", area: "영역", owner: "담당자", members: "팀원", start_date: "시작일", priority: "우선순위", progress: "진행상태", percent: "진행률", goal: "목표", next_action: "다음 할 일", links: "자료/링크",
    reporter: "제보자", severity: "심각도", status: "상태", page: "위치"
  }[field] || field;
}

function navKeys() {
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "notices", "examSchedules", "meals", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "projects", "portfolios", "penalties", "timetable", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "system", "print");
  return keys;
}

function buildNav() {
  ensureAppV12();
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
  });
}

function renderPage(key) {
  ensureAppV12();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();

  if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV8();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "clubs") renderCollectionV7("clubs");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV12();
  else if (key === "site") renderSiteV9();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);

  appendSystemReportBoxV12();
}

ensureAppV12();
if (currentUser) {
  buildNav();
  renderPage(currentPage || "dashboard");
}

// Final V13 safety overrides: report location select + local-only reset wording/behavior.
function reportPageOptionsV13() {
  return navKeys()
    .filter((key) => key !== "system" && key !== "print")
    .map((key) => [pageLabel(key), pageLabel(key)]);
}

function renderSystemV12() {
  content.replaceChildren();
  const backup = panel("백업 및 복구");
  const actions = el("div", "row-actions system-actions");
  const backupBtn = button("현재 브라우저 데이터 백업 다운로드");
  backupBtn.addEventListener("click", downloadBackupV12);
  const restoreInput = document.createElement("input");
  restoreInput.type = "file";
  restoreInput.accept = ".json";
  restoreInput.hidden = true;
  restoreInput.addEventListener("change", () => restoreBackupV12(restoreInput.files[0]));
  const restoreBtn = button("백업 파일로 현재 브라우저 복구", "ghost");
  restoreBtn.addEventListener("click", () => restoreInput.click());
  actions.append(backupBtn, restoreInput, restoreBtn);
  backup.append(actions, systemWarningV12("이 백업/복구는 서버 DB나 공용 데이터를 건드리지 않고, 현재 브라우저의 로컬 저장소(localStorage)에 있는 자료만 대상으로 합니다. 복구하면 현재 브라우저에 저장된 내용이 백업 파일 내용으로 바뀌므로 실행 전 백업을 먼저 내려받으세요."));

  const reset = panel("현재 브라우저 로컬 데이터 초기화");
  const grid = el("div", "form-grid");
  grid.append(
    makePasswordField("1차 현재 관리자 비밀번호", "resetPassword", "현재 비밀번호"),
    makeTextField("2차 관리자 PIN", "resetPin", ""),
    makePasswordField("3차 고유 초기화 패스워드", "resetPhrase", "RESET-MY-WEB-2026"),
    makeTextField("확인 문구", "resetConfirm", "로컬데이터삭제")
  );
  const resetBtn = button("현재 브라우저 로컬 데이터만 초기화", "danger");
  resetBtn.addEventListener("click", resetSystemV12);
  reset.append(grid, resetBtn, systemWarningV12("절대 서버 DB나 공용 데이터를 삭제하지 않습니다. 이 버튼은 현재 로그인한 사용자가 이 브라우저에 저장해 둔 로컬 데이터만 삭제하고 기본 상태로 되돌립니다. 다른 기기, 다른 브라우저, 실제 서버 데이터에는 영향을 주지 않습니다. 실행하려면 비밀번호, PIN, 고유 패스워드, 확인 문구 '로컬데이터삭제'가 모두 필요합니다."));

  const reports = panel("오류 제보 목록");
  reports.append(tableGenericV12("systemReports", store.systemReports || []));
  content.append(backup, reset, reports);
}

function resetSystemV12() {
  if (document.getElementById("resetPassword").value !== currentUser.password) return showMessage("초기화 차단", "1차 인증 비밀번호가 올바르지 않습니다.");
  if (document.getElementById("resetPin").value !== currentUser.pin) return showMessage("초기화 차단", "2차 인증 PIN이 올바르지 않습니다.");
  if (document.getElementById("resetPhrase").value !== (store.settings.resetPassphrase || "RESET-MY-WEB-2026")) return showMessage("초기화 차단", "3차 고유 초기화 패스워드가 올바르지 않습니다.");
  if (document.getElementById("resetConfirm").value !== "로컬데이터삭제") return showMessage("초기화 차단", "확인 문구에 로컬데이터삭제를 정확히 입력해야 합니다.");
  localStorage.removeItem("pm-store-v3");
  localStorage.removeItem("pm-accounts-v5");
  store = structuredClone(initialStore);
  accounts = [];
  ensureAppV12();
  saveAccountsV5();
  applySettings();
  buildNav();
  renderPage("dashboard");
  showMessage("로컬 초기화 완료", "현재 브라우저의 로컬 데이터만 삭제하고 기본 데이터로 초기화했습니다. 서버 DB나 공용 데이터는 삭제하지 않았습니다.");
}

function appendSystemReportBoxV12() {
  if (!currentUser || currentUser.role === "admin" || currentUser.role === "print") return;
  content.querySelector("#systemReportBox")?.remove();
  const box = panel("시스템 오류 제보");
  box.id = "systemReportBox";
  const grid = el("div", "form-grid");
  grid.append(
    makeSelectField("오류 발생 위치", "reportPage", reportPageOptionsV13(), pageLabel(currentPage)),
    makeSelectField("심각도", "reportSeverity", [["낮음", "낮음"], ["보통", "보통"], ["높음", "높음"], ["긴급", "긴급"]], "보통"),
    makeTextareaField("오류 내용", "reportContent", "")
  );
  const send = button("오류 제보 보내기");
  send.addEventListener("click", submitSystemReportV12);
  box.append(grid, send);
  content.append(box);
}

// Final V14 reset behavior: empty this device only, keep only the default admin account, then log out.
function makeEmptyLocalStoreV14() {
  return {
    settings: {
      siteName: "개인 관리 프로그램",
      logoText: "PM",
      systemNotice: "",
      systemNoticeEnabled: true,
      editMode: false,
      labels: {},
      quickButtons: [],
      subjects: [],
      publishers: [],
      textbooks: [],
      resetPassphrase: "RESET-MY-WEB-2026",
      hiddenFilterFields: []
    },
    schedules: [],
    notices: [],
    subjects: [],
    teachers: [],
    materials: [],
    assignments: [],
    portfolios: [],
    penalties: [],
    exams: [],
    timetable: [],
    timetableSets: [],
    periodTimes: [],
    examSchedules: [],
    attendance: [],
    records: [],
    meals: [],
    budget: [],
    clubs: [],
    lessons: [],
    projects: [],
    people: [],
    friendAwards: [],
    requests: [],
    systemReports: [],
    diary: [],
    profile: { name: "", phone: "", email: "", school: "", memo: "" }
  };
}

function renderSystemV12() {
  content.replaceChildren();
  const backup = panel("백업 및 복구");
  const actions = el("div", "row-actions system-actions");
  const backupBtn = button("현재 기기 로컬 데이터 백업 다운로드");
  backupBtn.addEventListener("click", downloadBackupV12);
  const restoreInput = document.createElement("input");
  restoreInput.type = "file";
  restoreInput.accept = ".json";
  restoreInput.hidden = true;
  restoreInput.addEventListener("change", () => restoreBackupV12(restoreInput.files[0]));
  const restoreBtn = button("백업 파일로 현재 기기 복구", "ghost");
  restoreBtn.addEventListener("click", () => restoreInput.click());
  actions.append(backupBtn, restoreInput, restoreBtn);
  backup.append(actions, systemWarningV12("백업/복구는 서버 DB나 공용 데이터를 건드리지 않고 현재 기기, 현재 브라우저의 로컬 저장소만 대상으로 합니다. 복구하면 이 브라우저의 로컬 내용이 백업 파일 내용으로 바뀝니다."));

  const reset = panel("현재 기기 로컬 데이터 완전 초기화");
  const grid = el("div", "form-grid");
  grid.append(
    makePasswordField("1차 현재 관리자 비밀번호", "resetPassword", "현재 비밀번호"),
    makeTextField("2차 관리자 PIN", "resetPin", ""),
    makePasswordField("3차 고유 초기화 패스워드", "resetPhrase", "RESET-MY-WEB-2026"),
    makeTextField("확인 문구", "resetConfirm", "로컬데이터삭제")
  );
  const resetBtn = button("현재 기기 로컬 데이터 완전 초기화", "danger");
  resetBtn.addEventListener("click", resetSystemV12);
  reset.append(grid, resetBtn, systemWarningV12("실행하면 이 기기의 로컬 저장소에서 일정, 공지, 출결, 선생님, 과목, 시험, 자료, 시간표, 프로젝트 등 모든 자료가 빈 상태가 됩니다. 저장된 로컬 계정도 삭제되며 기본 관리자 계정은 다시 만들지 않습니다. 실행 후 자동 로그아웃됩니다. 서버 DB나 공용 데이터는 삭제하지 않습니다."));

  const reports = panel("오류 제보 목록");
  reports.append(tableGenericV12("systemReports", store.systemReports || []));
  content.append(backup, reset, reports);
}

function resetSystemV12() {
  if (document.getElementById("resetPassword").value !== currentUser.password) return showMessage("초기화 차단", "1차 인증 비밀번호가 올바르지 않습니다.");
  if (document.getElementById("resetPin").value !== currentUser.pin) return showMessage("초기화 차단", "2차 인증 PIN이 올바르지 않습니다.");
  if (document.getElementById("resetPhrase").value !== (store.settings.resetPassphrase || "RESET-MY-WEB-2026")) return showMessage("초기화 차단", "3차 고유 초기화 패스워드가 올바르지 않습니다.");
  if (document.getElementById("resetConfirm").value !== "로컬데이터삭제") return showMessage("초기화 차단", "확인 문구에 로컬데이터삭제를 정확히 입력해야 합니다.");

  store = makeEmptyLocalStoreV14();
  accounts = [];
  saveStore();
  saveAccountsV5();
  sessionStorage.removeItem("pm-current-user");
  currentUser = null;
  currentPage = "dashboard";
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
  applySettings();
  showMessage("로컬 초기화 완료", "현재 기기의 로컬 데이터가 빈 상태로 초기화되었습니다. 기본 관리자 계정은 다시 만들지 않았고 서버 DB나 공용 데이터는 삭제하지 않았습니다.");
}

// Final V15: empty-safe timetable and site-management guides.
function ensureTimetableStateV15() {
  store.timetable ??= [];
  store.timetableSets ??= [];
  store.periodTimes ??= [];
}

function timetableDaysV15() {
  return ["일", "월", "화", "수", "목", "금", "토"];
}

function timetablePeriodsV15() {
  const saved = Array.isArray(store.periodTimes) ? store.periodTimes : [];
  if (saved.length) return saved;
  return [
    { period: "1교시", time: "08:40-09:25" },
    { period: "2교시", time: "09:35-10:20" },
    { period: "3교시", time: "10:30-11:15" },
    { period: "4교시", time: "11:25-12:10" },
    { period: "5교시", time: "13:10-13:55" },
    { period: "6교시", time: "14:05-14:50" },
    { period: "7교시", time: "15:00-15:45" },
    { period: "8교시", time: "15:55-16:40" }
  ];
}

function renderTimetableV6() {
  ensureTimetableStateV15();
  content.replaceChildren();
  const section = panel("시간표");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const addSet = button("시간표 추가");
  addSet.addEventListener("click", () => {
    const name = prompt("새 시간표 이름", "학교수업 시간표");
    if (!name) return;
    const id = `set-${Date.now()}`;
    store.timetableSets.push({ id, name, type: "사용자 등록" });
    sessionStorage.setItem("pm-timetable-set", id);
    saveStore();
    renderTimetableV6();
  });
  const addPeriod = button("교시 추가", "ghost");
  addPeriod.addEventListener("click", () => {
    const periods = timetablePeriodsV15();
    const next = periods.length + 1;
    store.periodTimes = periods.map((row) => ({ ...row }));
    store.periodTimes.push({ period: `${next}교시`, time: "" });
    saveStore();
    renderTimetableV6();
  });
  actions.append(addSet, addPeriod);
  head.append(actions);

  if (!store.timetableSets.length) {
    const empty = el("div", "empty timetable-empty");
    empty.append(
      el("strong", "", "등록된 시간표가 없습니다."),
      el("p", "muted", "초기화 후에는 시간표 목록도 비어 있습니다. '시간표 추가'를 눌러 학교수업, 방과후, 야자, 동아리 시간표를 새로 만들 수 있습니다.")
    );
    section.append(empty);
    content.append(section);
    return;
  }

  const currentSetId = sessionStorage.getItem("pm-timetable-set") || store.timetableSets[0].id;
  const activeSet = store.timetableSets.some((set) => set.id === currentSetId) ? currentSetId : store.timetableSets[0].id;
  sessionStorage.setItem("pm-timetable-set", activeSet);

  const toolbar = el("div", "toolbar timetable-toolbar");
  const selector = document.createElement("select");
  store.timetableSets.forEach((set) => selector.append(option(set.id, set.name)));
  selector.value = activeSet;
  selector.addEventListener("change", () => { sessionStorage.setItem("pm-timetable-set", selector.value); renderTimetableV6(); });
  toolbar.append(makeField("시간표 선택", "timetableSetSelect", selector));

  const rename = button("이름 수정", "ghost");
  rename.addEventListener("click", () => {
    const set = store.timetableSets.find((item) => item.id === activeSet);
    const name = prompt("시간표 이름 수정", set?.name || "");
    if (!name || !set) return;
    set.name = name;
    saveStore();
    renderTimetableV6();
  });
  const clear = button("선택 시간표 비우기", "ghost");
  clear.addEventListener("click", () => requirePassword(() => {
    store.timetable = store.timetable.filter((row) => (row.setId || "school") !== activeSet);
    saveStore();
    renderTimetableV6();
  }));
  const remove = button("시간표 삭제", "danger");
  remove.addEventListener("click", () => requirePassword(() => {
    markWorkspaceDeleted("timetableSets", activeSet);
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((row) => (row.setId || "school") === activeSet));
    store.timetableSets = store.timetableSets.filter((set) => set.id !== activeSet);
    store.timetable = store.timetable.filter((row) => (row.setId || "school") !== activeSet);
    sessionStorage.removeItem("pm-timetable-set");
    saveStore();
    renderTimetableV6();
  }));
  toolbar.append(rename, clear, remove);

  const checks = el("div", "check-grid");
  [["teacher", "선생님"], ["room", "위치"], ["seat", "좌석"]].forEach(([field, label]) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = sessionStorage.getItem(`show-${field}`) !== "false";
    input.addEventListener("change", () => { sessionStorage.setItem(`show-${field}`, input.checked); renderTimetableV6(); });
    const lab = document.createElement("label");
    lab.append(input, document.createTextNode(` ${label}`));
    checks.append(lab);
  });
  section.append(toolbar, checks);

  const grid = el("div", "timetable-grid");
  grid.append(makeTimeHead("교시/시간"), ...timetableDaysV15().map(makeTimeHead));
  timetablePeriodsV15().forEach(({ period, time }) => {
    const timeBox = el("div", "tt-time");
    const editTime = button("시간", "ghost");
    editTime.addEventListener("click", () => {
      store.periodTimes = timetablePeriodsV15().map((row) => ({ ...row }));
      const target = store.periodTimes.find((row) => row.period === period);
      const next = prompt(`${period} 시간`, target?.time || time || "");
      if (next === null || !target) return;
      target.time = next;
      saveStore();
      renderTimetableV6();
    });
    timeBox.append(el("strong", "", period), el("span", "", time || "시간 미정"), editTime);
    grid.append(timeBox);
    timetableDaysV15().forEach((day) => grid.append(makeTimeCellV15(activeSet, day, period, time)));
  });
  section.append(grid);
  content.append(section);
}

function makeTimeCellV15(setId, day, period, time) {
  const row = (store.timetable || []).find((item) => (item.setId || "school") === setId && item.day === day && item.period === period);
  const cell = el("div", row ? "tt-cell" : "tt-cell empty-cell");
  if (!row) cell.textContent = "+";
  else {
    cell.append(el("strong", "", row.subject || ""));
    if (sessionStorage.getItem("show-teacher") !== "false") cell.append(el("span", "", row.teacher || ""));
    if (sessionStorage.getItem("show-room") !== "false") cell.append(el("small", "", row.room || ""));
    if (sessionStorage.getItem("show-seat") !== "false" && row.seat) cell.append(el("small", "", `좌석 ${row.seat}`));
  }
  cell.addEventListener("click", () => editTimeCellV15(setId, day, period, time, row));
  return cell;
}

function editTimeCellV15(setId, day, period, time, row) {
  if (!can("create", "timetable") && !can("edit", "timetable")) return;
  const subject = prompt(`${day} ${period} 과목`, row?.subject || "");
  if (subject === null) return;
  const teacher = prompt("선생님", row?.teacher || "");
  if (teacher === null) return;
  const room = prompt("위치", row?.room || "");
  if (room === null) return;
  const seat = prompt("좌석", row?.seat || "");
  if (seat === null) return;
  if (row) Object.assign(row, { subject, teacher, room, seat, time });
  else store.timetable.push({ id: Date.now(), setId, day, period, time, subject, teacher, room, seat });
  saveStore();
  renderTimetableV6();
}

function appendSiteHelpV15() {
  if (document.getElementById("siteHelpV15")) return;
  const guide = panel("체크 활성/선택값 만드는 방법");
  guide.id = "siteHelpV15";
  guide.classList.add("site-help");
  guide.append(
    el("p", "", "빠른등록 활성: 체크한 항목만 메인 대시보드 빠른등록 버튼으로 보입니다. 체크 해제하면 버튼에서 숨겨집니다."),
    el("p", "", "과목 선택 활성: 과목관리, 공지, 시험, 수업기록 등 과목 선택박스에서 쓸 값을 체크합니다. 새 과목은 과목관리에서 추가한 뒤 이 화면에서 저장하면 선택값에 반영됩니다."),
    el("p", "", "교과서/출판사 선택값: 과목관리의 교과서, 출판사 선택박스에 표시할 값을 체크합니다. 선택값을 늘리려면 과목관리에서 새 교과서명 또는 출판사명을 입력한 과목을 추가한 뒤 홈페이지 관리에서 체크하고 저장하세요."),
    el("p", "", "저장 방법: 원하는 체크박스를 선택한 뒤 현재 관리자 비밀번호를 입력하고 저장 버튼을 누릅니다."),
    el("p", "", "2차 관리자 PIN: 기본값은 1234입니다. 계정 설정에서 관리자 계정을 선택한 뒤 PIN 값을 바꾸고 저장하면 변경됩니다. 초기화 2차 인증에는 현재 로그인한 관리자 계정의 PIN을 사용합니다.")
  );
  content.append(guide);
}

function renderSiteV9() {
  renderSiteV8();
  ["textbookOptions", "publisherOptions"].forEach((id) => {
    const field = document.getElementById(id);
    field?.closest("label")?.remove();
  });
  const grid = content.querySelector(".form-grid");
  if (grid) {
    if (!document.getElementById("textbookEnabledBox")) {
      grid.append(makeCheckboxGroupV7("교과서 선택값", "textbookEnabledBox", textbooksList().map((name) => [name, name]), store.settings.textbooks || textbooksList()));
    }
    if (!document.getElementById("publisherEnabledBox")) {
      grid.append(makeCheckboxGroupV7("출판사 선택값", "publisherEnabledBox", publishersList().map((name) => [name, name]), store.settings.publishers || publishersList()));
    }
  }
  appendSiteHelpV15();
}

// Final V16: project tab, meal application, afterschool/club hubs, and visible version info.
function ensureAppV16() {
  Object.assign(pageMeta, {
    projects: ["프", "프로젝트 관리"],
    mealApplications: ["급", "급식 신청"],
    afterschool: ["방", "방과후"],
    clubs: ["동", "동아리"]
  });
  Object.assign(permissions, {
    projects: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] },
    mealApplications: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] },
    afterschool: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] },
    clubs: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] }
  });
  store.settings ??= {};
  store.settings.appVersion = "v16.0 - 2026-06-17";
  store.settings.hideAfterschoolNamesInNav ??= false;
  store.settings.hideClubNamesInNav ??= false;
  store.projects ??= [];
  store.mealApplications ??= [];
  store.afterschoolPrograms ??= [];
  store.afterschoolAttendance ??= [];
  store.afterschoolSchedules ??= [];
  store.clubPrograms ??= [];
  store.clubAttendance ??= [];
  store.clubSchedules ??= [];
  if (!store.afterschoolPrograms.length) {
    store.afterschoolPrograms.push({ id: `after-${Date.now()}`, name: "방과후 프로그램", teacher: "", location: "", notice: "", memo: "" });
  }
  if (!store.clubPrograms.length && Array.isArray(store.clubs) && store.clubs.length) {
    store.clubPrograms = store.clubs.map((club) => ({
      id: `club-${club.id || Date.now() + Math.random()}`,
      name: club.name || "동아리",
      teacher: club.teacher || "",
      location: club.location || "",
      notice: club.memo || "",
      memo: club.schedule || ""
    }));
  }
  if (!store.clubPrograms.length) {
    store.clubPrograms.push({ id: `club-${Date.now()}`, name: "동아리", teacher: "", location: "", notice: "", memo: "" });
  }
}

function navKeys() {
  ensureAppV16();
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "notices", "examSchedules", "meals", "mealApplications", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "projects", "portfolios", "penalties", "timetable", "afterschool", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "system", "print");
  return keys;
}

function buildNav() {
  ensureAppV16();
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
    if (key === "afterschool" && !store.settings.hideAfterschoolNamesInNav) appendProgramNavV16("afterschool");
    if (key === "clubs" && !store.settings.hideClubNamesInNav) appendProgramNavV16("clubs");
  });
}

function appendProgramNavV16(type) {
  const list = type === "afterschool" ? store.afterschoolPrograms : store.clubPrograms;
  list.forEach((program) => {
    const child = document.createElement("button");
    child.className = "nav-btn nav-child";
    child.dataset.page = type;
    child.dataset.programId = program.id;
    child.append(el("span", "nav-icon", ""), el("span", "nav-text", program.name || (type === "afterschool" ? "방과후" : "동아리")));
    child.addEventListener("click", () => renderProgramHubV16(type, program.id));
    nav.append(child);
  });
}

function renderPage(key) {
  ensureAppV16();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();

  if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramHubV16("afterschool");
  else if (key === "clubs") renderProgramHubV16("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV8();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV12();
  else if (key === "site") renderSiteV16();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);

  appendSystemReportBoxV12();
  if (key !== "print") appendVersionInfoV16();
}

function renderMealApplicationsV16() {
  content.replaceChildren();
  const section = panel("급식 신청 여부");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const yearInput = document.createElement("input");
  yearInput.type = "number";
  yearInput.id = "mealApplyYear";
  yearInput.value = sessionStorage.getItem("mealApplyYear") || String(new Date().getFullYear());
  yearInput.addEventListener("change", () => { sessionStorage.setItem("mealApplyYear", yearInput.value); renderMealApplicationsV16(); });
  actions.append(makeField("연도", "mealApplyYearWrap", yearInput));
  head.append(actions);
  const months = el("div", "cards meal-application-grid");
  Array.from({ length: 12 }, (_, i) => i + 1).forEach((month) => {
    const row = mealApplicationRowV16(yearInput.value, month);
    const card = el("article", "card meal-application-card");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = row.applied === "신청";
    check.addEventListener("change", () => {
      row.applied = check.checked ? "신청" : "미신청";
      saveStore();
      renderMealApplicationsV16();
    });
    const note = document.createElement("input");
    note.placeholder = "메모";
    note.value = row.note || "";
    note.addEventListener("change", () => { row.note = note.value; saveStore(); });
    card.append(el("h3", "", `${month}월`), el("p", "muted", row.applied || "미신청"), makeField("급식 신청", `meal-${month}`, check), note);
    months.append(card);
  });
  section.append(el("p", "muted", "각 월별로 내 급식 신청 여부를 체크해 저장합니다. 체크하면 신청, 해제하면 미신청으로 기록됩니다."), months);
  content.append(section);
}

function mealApplicationRowV16(year, month) {
  store.mealApplications ??= [];
  let row = store.mealApplications.find((item) => String(item.year) === String(year) && Number(item.month) === Number(month) && item.user === currentUser?.email);
  if (!row) {
    row = { id: Date.now() + Math.random(), year: String(year), month, user: currentUser?.email || "", applied: "미신청", note: "" };
    store.mealApplications.push(row);
  }
  return row;
}

function programConfigV16(type) {
  return type === "afterschool"
    ? { title: "방과후", programs: "afterschoolPrograms", attendance: "afterschoolAttendance", schedules: "afterschoolSchedules", hide: "hideAfterschoolNamesInNav", scheduleType: "방과후" }
    : { title: "동아리", programs: "clubPrograms", attendance: "clubAttendance", schedules: "clubSchedules", hide: "hideClubNamesInNav", scheduleType: "동아리" };
}

function renderProgramHubV16(type, selectedId = null, mode = "home") {
  ensureAppV16();
  const cfg = programConfigV16(type);
  const programs = store[cfg.programs] || [];
  const selected = programs.find((item) => item.id === selectedId) || programs[0];
  currentPage = type;
  pageTitle.textContent = cfg.title;
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === type && (!selected?.id || btn.dataset.programId === selected.id)));
  content.replaceChildren();
  const section = panel(`${cfg.title} 관리`);
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const add = button(`${cfg.title} 등록`);
  add.addEventListener("click", () => addProgramV16(type));
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = !!store.settings[cfg.hide];
  toggle.addEventListener("change", () => {
    store.settings[cfg.hide] = toggle.checked;
    saveStore();
    buildNav();
    renderProgramHubV16(type, selected?.id, mode);
  });
  actions.append(add, makeField("사이드탭 이름 숨김", `${type}NavToggle`, toggle));
  head.append(actions);

  const cards = el("div", "cards program-cards");
  programs.forEach((program) => cards.append(programCardV16(type, program)));
  section.append(cards);
  if (selected) section.append(programDetailV16(type, selected, mode));
  content.append(section);
  if (key !== "print") appendVersionInfoV16();
}

function programCardV16(type, program) {
  const cfg = programConfigV16(type);
  const card = el("article", "card program-card");
  const title = document.createElement("input");
  title.value = program.name || cfg.title;
  title.addEventListener("change", () => {
    program.name = title.value || cfg.title;
    saveStore();
    buildNav();
    renderProgramHubV16(type, program.id);
  });
  const meta = el("p", "muted", `${program.teacher || "담당 미정"} · ${program.location || "장소 미정"}`);
  const buttons = el("div", "row-actions");
  [["attendance", "출결"], ["stats", "통계"], ["notice", "안내"], ["schedule", "시간표"]].forEach(([mode, label]) => {
    const btn = button(label, "ghost");
    btn.addEventListener("click", () => renderProgramHubV16(type, program.id, mode));
    buttons.append(btn);
  });
  card.append(title, meta, buttons);
  return card;
}

function addProgramV16(type) {
  const cfg = programConfigV16(type);
  const name = prompt(`${cfg.title} 이름`, `${cfg.title} 프로그램`);
  if (!name) return;
  store[cfg.programs].push({ id: `${type}-${Date.now()}`, name, teacher: "", location: "", notice: "", memo: "" });
  saveStore();
  buildNav();
  renderProgramHubV16(type);
}

function programDetailV16(type, program, mode) {
  const cfg = programConfigV16(type);
  const detail = el("section", "panel program-detail");
  detail.append(el("h3", "", `${program.name} · ${modeLabelV16(mode)}`));
  if (mode === "attendance") detail.append(programAttendanceV16(type, program));
  else if (mode === "stats") detail.append(programStatsV16(type, program));
  else if (mode === "schedule") detail.append(programScheduleV16(type, program));
  else detail.append(programNoticeV16(type, program));
  return detail;
}

function modeLabelV16(mode) {
  return { home: "안내", attendance: "출결", stats: "통계", notice: "안내", schedule: "시간표" }[mode] || "안내";
}

function programNoticeV16(type, program) {
  const box = el("div", "form-grid");
  box.append(makeTextField("담당자/선생님", "programTeacher", program.teacher || ""), makeTextField("장소", "programLocation", program.location || ""), makeTextareaField("안내", "programNotice", program.notice || ""), makeTextareaField("메모", "programMemo", program.memo || ""));
  const save = button("안내 저장");
  save.addEventListener("click", () => {
    program.teacher = document.getElementById("programTeacher").value;
    program.location = document.getElementById("programLocation").value;
    program.notice = document.getElementById("programNotice").value;
    program.memo = document.getElementById("programMemo").value;
    saveStore();
    buildNav();
    renderProgramHubV16(type, program.id, "notice");
  });
  box.append(save);
  return box;
}

function programAttendanceV16(type, program) {
  const cfg = programConfigV16(type);
  store[cfg.attendance] ??= [];
  const wrap = el("div", "");
  const form = el("div", "form-grid");
  form.append(makeTextField("날짜", "programAttendDate", today), makeTextField("이름", "programAttendName", currentUser?.name || ""), makeSelectField("출결", "programAttendState", [["출석", "출석"], ["지각", "지각"], ["결석", "결석"], ["조퇴", "조퇴"]], "출석"), makeTextareaField("메모", "programAttendMemo", ""));
  const add = button("출결 추가");
  add.addEventListener("click", () => {
    store[cfg.attendance].unshift({ id: Date.now(), programId: program.id, date: programAttendDate.value, name: programAttendName.value, state: programAttendState.value, memo: programAttendMemo.value });
    saveStore();
    renderProgramHubV16(type, program.id, "attendance");
  });
  form.append(add);
  const rows = store[cfg.attendance].filter((row) => row.programId === program.id);
  wrap.append(form, simpleRowsTableV16(["date", "name", "state", "memo"], rows));
  return wrap;
}

function programStatsV16(type, program) {
  const cfg = programConfigV16(type);
  const rows = (store[cfg.attendance] || []).filter((row) => row.programId === program.id);
  const stats = el("div", "stats");
  ["출석", "지각", "결석", "조퇴"].forEach((state) => {
    const item = el("div", "stat");
    item.append(el("span", "", state), el("strong", "", String(rows.filter((row) => row.state === state).length)), el("span", "", "건"));
    stats.append(item);
  });
  return stats;
}

function programScheduleV16(type, program) {
  const cfg = programConfigV16(type);
  store[cfg.schedules] ??= [];
  const wrap = el("div", "");
  const form = el("div", "form-grid");
  form.append(makeTextField("요일", "programScheduleDay", "월"), makeTextField("교시", "programSchedulePeriod", "1교시"), makeTextField("시간", "programScheduleTime", ""), makeTextField("장소", "programScheduleRoom", program.location || ""), makeTextField("담당", "programScheduleTeacher", program.teacher || ""), makeTextareaField("내용", "programScheduleMemo", ""));
  const add = button("시간표 등록");
  add.addEventListener("click", () => {
    const row = { id: Date.now(), programId: program.id, day: programScheduleDay.value, period: programSchedulePeriod.value, time: programScheduleTime.value, subject: program.name, room: programScheduleRoom.value, teacher: programScheduleTeacher.value, memo: programScheduleMemo.value };
    store[cfg.schedules].unshift(row);
    const setId = `${type}-${program.id}`;
    store.timetableSets ??= [];
    if (!store.timetableSets.some((set) => set.id === setId)) store.timetableSets.push({ id: setId, name: `${cfg.title} · ${program.name}`, type: cfg.scheduleType });
    store.timetable ??= [];
    store.timetable.push({ ...row, id: Date.now() + 1, setId });
    saveStore();
    renderProgramHubV16(type, program.id, "schedule");
  });
  form.append(add);
  const rows = store[cfg.schedules].filter((row) => row.programId === program.id);
  wrap.append(form, el("p", "muted", "등록한 시간표는 시간표 탭에서 해당 방과후/동아리 시간표를 선택해 볼 수 있습니다."), simpleRowsTableV16(["day", "period", "time", "subject", "teacher", "room", "memo"], rows));
  return wrap;
}

function simpleRowsTableV16(cols, rows) {
  if (!rows.length) return el("div", "empty", "등록된 항목이 없습니다.");
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const h = document.createElement("tr");
  cols.forEach((col) => h.append(el("th", "", labelFor(col))));
  thead.append(h);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cols.forEach((col) => tr.append(el("td", "", row[col] || "")));
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function renderSiteV16() {
  renderSiteV9();
  appendVersionInfoV16(true);
}

function appendVersionInfoV16(inSite = false) {
  content.querySelector("#versionInfoV16")?.remove();
  const info = el("div", "version-info");
  info.id = "versionInfoV16";
  info.append(el("strong", "", "버전 정보"), el("span", "", store.settings.appVersion || "v16.0"), el("span", "", "업데이트할 때마다 이 번호로 화면/기능 상태를 구별합니다."));
  content.append(info);
}

ensureAppV16();

// Final V17: program navigation pages, special lectures, academic calendar upload, subject text input, safer account creation.
function ensureAppV17() {
  ensureAppV16();
  Object.assign(pageMeta, {
    academic: ["학", "학사일정"],
    specialLectures: ["특", "특강"]
  });
  Object.assign(permissions, {
    academic: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] },
    specialLectures: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] }
  });
  store.academicSchedules ??= [];
  store.specialLecturePrograms ??= [];
  store.specialLectureAttendance ??= [];
  store.specialLectureSchedules ??= [];
  store.settings.hideSpecialLectureNamesInNav ??= false;
  if (!store.specialLecturePrograms.length) store.specialLecturePrograms.push({ id: `special-${Date.now()}`, name: "특강", teacher: "", location: "", notice: "", memo: "" });
  store.settings.appVersion = "v17.0 - 2026-06-17";
}

function navKeys() {
  ensureAppV17();
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "academic", "notices", "examSchedules", "meals", "mealApplications", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "projects", "portfolios", "penalties", "timetable", "afterschool", "specialLectures", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "system", "print");
  return keys;
}

function buildNav() {
  ensureAppV17();
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
    if (key === "afterschool" && !store.settings.hideAfterschoolNamesInNav) appendProgramNavV17("afterschool");
    if (key === "specialLectures" && !store.settings.hideSpecialLectureNamesInNav) appendProgramNavV17("specialLectures");
    if (key === "clubs" && !store.settings.hideClubNamesInNav) appendProgramNavV17("clubs");
  });
}

function appendProgramNavV17(type) {
  const cfg = programConfigV17(type);
  (store[cfg.programs] || []).forEach((program) => {
    const child = document.createElement("button");
    child.className = "nav-btn nav-child";
    child.dataset.page = type;
    child.dataset.programId = program.id;
    child.append(el("span", "nav-icon", ""), el("span", "nav-text", program.name || cfg.title));
    child.addEventListener("click", () => renderProgramPageV17(type, program.id, "info"));
    nav.append(child);
  });
}

function renderPage(key) {
  ensureAppV17();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();

  if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "academic") renderAcademicV17();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramListV17("afterschool");
  else if (key === "specialLectures") renderProgramListV17("specialLectures");
  else if (key === "clubs") renderProgramListV17("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV17();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV12();
  else if (key === "site") renderSiteV16();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);

  appendSystemReportBoxV12();
  appendVersionInfoV16();
}

function programConfigV17(type) {
  if (type === "afterschool") return { title: "방과후", programs: "afterschoolPrograms", attendance: "afterschoolAttendance", schedules: "afterschoolSchedules", hide: "hideAfterschoolNamesInNav", scheduleType: "방과후" };
  if (type === "specialLectures") return { title: "특강", programs: "specialLecturePrograms", attendance: "specialLectureAttendance", schedules: "specialLectureSchedules", hide: "hideSpecialLectureNamesInNav", scheduleType: "특강" };
  return { title: "동아리", programs: "clubPrograms", attendance: "clubAttendance", schedules: "clubSchedules", hide: "hideClubNamesInNav", scheduleType: "동아리" };
}

function renderProgramListV17(type) {
  ensureAppV17();
  const cfg = programConfigV17(type);
  currentPage = type;
  pageTitle.textContent = cfg.title;
  content.replaceChildren();
  const section = panel(`${cfg.title} 관리`);
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const add = button(`${cfg.title} 등록`);
  add.addEventListener("click", () => addProgramV17(type));
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = !store.settings[cfg.hide];
  toggle.addEventListener("change", () => {
    store.settings[cfg.hide] = !toggle.checked;
    saveStore();
    buildNav();
    renderProgramListV17(type);
  });
  actions.append(add, makeField("사이드탭 이름 표시", `${type}NavToggle`, toggle));
  head.append(actions);
  if (type === "afterschool") {
    const special = button("특강 등록", "ghost");
    special.addEventListener("click", () => addProgramV17("specialLectures"));
    actions.append(special);
  }
  const cards = el("div", "cards program-cards stacked-program-cards");
  (store[cfg.programs] || []).forEach((program) => cards.append(programCardV17(type, program)));
  section.append(el("p", "muted", `${cfg.title} 이름을 누르면 정보 화면으로 이동합니다. 출결/통계/안내/시간표 버튼을 누르면 해당 화면으로 전환됩니다.`), cards);
  content.append(section);
}

function programCardV17(type, program) {
  const cfg = programConfigV17(type);
  const card = el("article", "card program-card");
  const nameBtn = button(program.name || cfg.title, "ghost program-name-btn");
  nameBtn.addEventListener("click", () => renderProgramPageV17(type, program.id, "info"));
  const rename = document.createElement("input");
  rename.value = program.name || cfg.title;
  rename.title = "이름 수정";
  rename.addEventListener("change", () => {
    program.name = rename.value || cfg.title;
    saveStore();
    buildNav();
    renderProgramListV17(type);
  });
  const buttons = el("div", "row-actions");
  [["attendance", "출결"], ["stats", "통계"], ["notice", "안내"], ["schedule", "시간표"]].forEach(([mode, label]) => {
    const btn = button(label, "ghost");
    btn.addEventListener("click", () => renderProgramPageV17(type, program.id, mode));
    buttons.append(btn);
  });
  card.append(nameBtn, rename, el("p", "muted", `${program.teacher || "담당 미정"} · ${program.location || "장소 미정"}`), buttons);
  return card;
}

function addProgramV17(type) {
  const cfg = programConfigV17(type);
  const name = prompt(`${cfg.title} 이름`, `${cfg.title} 프로그램`);
  if (!name) return;
  store[cfg.programs] ??= [];
  store[cfg.programs].push({ id: `${type}-${Date.now()}`, name, teacher: "", location: "", notice: "", memo: "" });
  saveStore();
  buildNav();
  renderProgramListV17(type);
}

function renderProgramPageV17(type, programId, mode = "info") {
  const cfg = programConfigV17(type);
  const program = (store[cfg.programs] || []).find((item) => item.id === programId) || (store[cfg.programs] || [])[0];
  if (!program) return renderProgramListV17(type);
  currentPage = type;
  pageTitle.textContent = `${cfg.title} · ${program.name}`;
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === type && btn.dataset.programId === program.id));
  content.replaceChildren();
  const section = panel(`${program.name} · ${modeLabelV17(mode)}`);
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const back = button("목록", "ghost");
  back.addEventListener("click", () => renderProgramListV17(type));
  [["info", "정보"], ["attendance", "출결"], ["stats", "통계"], ["notice", "안내"], ["schedule", "시간표"]].forEach(([nextMode, label]) => {
    const btn = button(label, nextMode === mode ? "" : "ghost");
    btn.addEventListener("click", () => renderProgramPageV17(type, program.id, nextMode));
    actions.append(btn);
  });
  actions.prepend(back);
  head.append(actions);
  if (mode === "attendance") section.append(programAttendanceV17(type, program));
  else if (mode === "stats") section.append(programStatsV16(type, program));
  else if (mode === "schedule") section.append(programScheduleV16(type, program));
  else section.append(programInfoV17(type, program, mode));
  content.append(section);
  appendVersionInfoV16();
}

function modeLabelV17(mode) {
  return { info: "정보", home: "정보", attendance: "출결", stats: "통계", notice: "안내", schedule: "시간표" }[mode] || "정보";
}

function programInfoV17(type, program, mode) {
  const title = mode === "notice" ? "안내" : "정보";
  const box = el("div", "form-grid");
  box.append(makeTextField("이름", "programName", program.name || ""), makeTextField("담당자/선생님", "programTeacher", program.teacher || ""), makeTextField("장소", "programLocation", program.location || ""), makeTextareaField(title, "programNotice", program.notice || ""), makeTextareaField("메모", "programMemo", program.memo || ""));
  const save = button(`${title} 저장`);
  save.addEventListener("click", () => {
    program.name = document.getElementById("programName").value;
    program.teacher = document.getElementById("programTeacher").value;
    program.location = document.getElementById("programLocation").value;
    program.notice = document.getElementById("programNotice").value;
    program.memo = document.getElementById("programMemo").value;
    saveStore();
    buildNav();
    renderProgramPageV17(type, program.id, mode);
  });
  box.append(save);
  return box;
}

function programAttendanceV17(type, program) {
  const wrap = programAttendanceV16(type, program);
  wrap.prepend(el("p", "muted", "출결을 추가하면 통계 화면에 자동 반영됩니다."));
  return wrap;
}

function renderAcademicV17() {
  content.replaceChildren();
  store.academicSchedules ??= [];
  const section = panel("학사일정");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*,.pdf,.hwp,.hwpx";
  file.hidden = true;
  file.addEventListener("change", () => attachAcademicFileV17(file.files[0]));
  const upload = button("학사일정 이미지/OCR 파일 첨부");
  upload.addEventListener("click", () => file.click());
  actions.append(file, upload);
  head.append(actions);
  const form = el("div", "form-grid");
  form.append(makeTextField("일정명", "academicTitle", ""), makeTextField("날짜", "academicDate", today), makeTextareaField("OCR/직접 입력 내용", "academicContent", ""));
  const add = button("학사일정 저장");
  add.addEventListener("click", () => {
    if (!academicTitle.value.trim() && !academicContent.value.trim()) return;
    store.academicSchedules.unshift({ id: Date.now(), title: academicTitle.value, date: academicDate.value, content: academicContent.value, fileName: "" });
    saveStore();
    renderAcademicV17();
  });
  section.append(el("p", "muted", "나이스 OpenAPI는 학교코드/인증키가 있으면 연동 가능하지만, 학교앱 로그인 자료는 자동으로 가져오지 않습니다. 우선 이미지나 파일을 첨부하고 OCR 결과 또는 직접 입력 내용을 저장하세요."), form, add, simpleRowsTableV16(["date", "title", "content", "fileName"], store.academicSchedules));
  content.append(section);
}

function attachAcademicFileV17(file) {
  if (!file) return;
  store.academicSchedules.unshift({ id: Date.now(), title: file.name, date: today, content: "OCR 결과를 여기에 붙여넣거나 직접 입력하세요.", fileName: file.name });
  saveStore();
  renderAcademicV17();
}

function fieldsForV7(key) {
  const map = {
    subjects: [["name", "과목명", "text", true], ["teacher", "선생님", "select", teachersList()], ["textbook", "교과서", "select", textbooksList()], ["publisher", "출판사", "select", publishersList()], ["location", "장소", "text"], ["scope", "범위", "textarea"], ["memo", "메모", "textarea"]],
    examSchedules: [["year", "시험년도", "text"], ["grade", "학년", "text"], ["date", "시험일자", "date"], ["title", "시험명", "text", true], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["scope", "시험범위", "textarea"], ["place", "장소", "text"], ["memo", "메모", "textarea"]],
    records: [["date", "날짜", "date"], ["subject", "과목", "select", subjectsList()], ["teacher", "담당 선생님", "select", teachersList()], ["activity", "활동명", "text", true], ["competency", "역량/키워드", "text"], ["evidence", "근거자료", "textarea"], ["draft", "세특 초안", "textarea"], ["status", "상태", "select", ["초안", "검토중", "완료"]]]
  };
  return map[key] || fieldsForV6(key);
}

function renderAccountsV17() {
  content.replaceChildren();
  const section = panel("계정 설정");
  const select = document.createElement("select");
  accounts.forEach((account) => select.append(option(String(account.id), `${account.name} · ${account.email} · ${roleName(account.role)}`)));
  const role = document.createElement("select");
  [["admin", "관리자"], ["user", "일반"], ["print", "프린트 전용"]].forEach(([value, text]) => role.append(option(value, text)));
  const name = document.createElement("input");
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  const pin = document.createElement("input");
  pin.placeholder = "PIN";
  const pw = document.createElement("input");
  pw.placeholder = "새 비밀번호";
  const load = () => {
    const account = accounts.find((item) => String(item.id) === select.value);
    if (!account) return;
    name.value = account.name || "";
    emailInput.value = account.email || "";
    role.value = account.role || "user";
    pin.value = account.pin || "1234";
    pw.value = "";
  };
  select.addEventListener("change", load);
  const save = button("선택 계정 저장");
  save.addEventListener("click", () => {
    const account = accounts.find((item) => String(item.id) === select.value);
    if (!account) return;
    if (!emailInput.value.includes("@")) return showMessage("저장 실패", "이메일을 올바르게 입력하세요.");
    account.name = name.value || "사용자";
    account.email = emailInput.value.trim();
    account.role = role.value;
    account.pin = pin.value || "1234";
    if (pw.value) account.password = pw.value;
    saveAccountsV5();
    buildNav();
    renderAccountsV17();
  });
  const createBox = panel("새 계정 생성");
  const cName = document.createElement("input");
  cName.placeholder = "이름";
  const cEmail = document.createElement("input");
  cEmail.type = "email";
  cEmail.placeholder = "email@example.com";
  const cPw = document.createElement("input");
  cPw.placeholder = "초기 비밀번호";
  const cRole = document.createElement("select");
  [["user", "일반"], ["print", "프린트 전용"], ["admin", "관리자"]].forEach(([value, text]) => cRole.append(option(value, text)));
  const create = button("입력한 이메일로 계정 생성");
  create.addEventListener("click", () => {
    const email = cEmail.value.trim();
    if (!email.includes("@")) return showMessage("생성 실패", "계정 이메일을 직접 입력하세요.");
    if (accounts.some((account) => account.email === email)) return showMessage("생성 실패", "이미 존재하는 이메일입니다.");
    accounts.push({ id: Date.now(), name: cName.value || "새 계정", email, password: cPw.value || "1234", role: cRole.value, pin: "1234", permissions: {} });
    saveAccountsV5();
    renderAccountsV17();
  });
  const grid = el("div", "form-grid");
  grid.append(makeField("계정 선택", "accountSelectV17", select), makeField("역할", "accountRoleV17", role), makeField("이름", "accountNameV17", name), makeField("이메일", "accountEmailV17", emailInput), makeField("PIN", "accountPinV17", pin), makeField("새 비밀번호", "accountPwV17", pw));
  const createGrid = el("div", "form-grid");
  createGrid.append(makeField("이름", "newAccountNameV17", cName), makeField("이메일", "newAccountEmailV17", cEmail), makeField("초기 비밀번호", "newAccountPwV17", cPw), makeField("역할", "newAccountRoleV17", cRole));
  createBox.append(createGrid, create, el("p", "muted", "이제 임의의 new123@example.com 계정을 자동 생성하지 않고, 입력한 이메일 그대로 계정을 만듭니다."));
  section.append(grid, save, createBox);
  content.append(section);
  load();
}

ensureAppV17();

// Final V18: Dong-A High home-letter integration.
function ensureAppV18() {
  ensureAppV17();
  Object.assign(pageMeta, {
    homeLetters: ["가", "가정통신문"]
  });
  Object.assign(permissions, {
    homeLetters: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] }
  });
  store.homeLetters ??= [];
  store.settings.homeLetterUrl ??= "https://school.busanedu.net/dong-a-h/na/ntt/selectNttList.do?bbsId=1013419&mi=622563";
  store.settings.appVersion = "v18.0 - 2026-06-17";
}

function navKeys() {
  ensureAppV18();
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "academic", "notices", "homeLetters", "examSchedules", "meals", "mealApplications", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "projects", "portfolios", "penalties", "timetable", "afterschool", "specialLectures", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "system", "print");
  return keys;
}

function buildNav() {
  ensureAppV18();
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
    if (key === "afterschool" && !store.settings.hideAfterschoolNamesInNav) appendProgramNavV17("afterschool");
    if (key === "specialLectures" && !store.settings.hideSpecialLectureNamesInNav) appendProgramNavV17("specialLectures");
    if (key === "clubs" && !store.settings.hideClubNamesInNav) appendProgramNavV17("clubs");
  });
}

function renderPage(key) {
  ensureAppV18();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();

  if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "academic") renderAcademicV17();
  else if (key === "homeLetters") renderHomeLettersV18();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramListV17("afterschool");
  else if (key === "specialLectures") renderProgramListV17("specialLectures");
  else if (key === "clubs") renderProgramListV17("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV17();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV12();
  else if (key === "site") renderSiteV18();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);

  appendSystemReportBoxV12();
  appendVersionInfoV16();
}

function renderHomeLettersV18() {
  content.replaceChildren();
  const section = panel("가정통신문");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const open = button("학교 게시판 열기", "ghost");
  open.addEventListener("click", () => window.open(store.settings.homeLetterUrl, "_blank"));
  const sync = button("학교 홈페이지에서 가져오기");
  sync.addEventListener("click", fetchHomeLettersV18);
  actions.append(open, sync);
  head.append(actions);

  const settings = el("div", "form-grid");
  settings.append(makeTextField("동아고 가정통신문 게시판 URL", "homeLetterUrlInput", store.settings.homeLetterUrl || ""));
  const saveUrl = button("URL 저장", "ghost");
  saveUrl.addEventListener("click", () => {
    store.settings.homeLetterUrl = document.getElementById("homeLetterUrlInput").value.trim();
    saveStore();
    showMessage("저장 완료", "가정통신문 게시판 주소를 저장했습니다.");
  });
  settings.append(saveUrl);

  const paste = panel("붙여넣기 가져오기");
  const textarea = document.createElement("textarea");
  textarea.id = "homeLetterPaste";
  textarea.placeholder = "학교 가정통신문 게시판 목록을 복사해 붙여넣으면 제목과 날짜를 추출합니다.";
  const pasteBtn = button("붙여넣은 목록 가져오기", "ghost");
  pasteBtn.addEventListener("click", () => importHomeLettersFromTextV18(textarea.value));
  paste.append(textarea, pasteBtn, el("p", "muted", "학교 사이트가 브라우저 자동 가져오기를 차단하면 이 방법을 사용하세요."));

  section.append(settings, el("p", "muted", "동아고 공개 가정통신문 게시판과 연결되어 있습니다. 자동 가져오기는 학교 홈페이지의 보안/CORS 설정에 따라 차단될 수 있습니다."), homeLetterTableV18(store.homeLetters || []), paste);
  content.append(section);
}

async function fetchHomeLettersV18() {
  const url = (document.getElementById("homeLetterUrlInput")?.value || store.settings.homeLetterUrl || "").trim();
  if (!url) return showMessage("가져오기 실패", "게시판 URL을 입력하세요.");
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const rows = parseHomeLettersHtmlV18(html, url);
    if (!rows.length) throw new Error("목록을 찾지 못했습니다.");
    mergeHomeLettersV18(rows);
    showMessage("가져오기 완료", `${rows.length}개 항목을 확인했습니다.`);
    renderHomeLettersV18();
  } catch (error) {
    showMessage("자동 가져오기 차단", "학교 사이트 보안 설정 때문에 브라우저에서 직접 가져오지 못했습니다. '학교 게시판 열기' 후 목록을 복사해서 붙여넣기 가져오기를 사용하세요.");
  }
}

function parseHomeLettersHtmlV18(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const links = [...doc.querySelectorAll('a[href*="selectNttInfo"], a[href*="nttSn"], td a')];
  return links.map((a) => {
    const title = a.textContent.replace(/\s+/g, " ").trim();
    if (!title || title.length < 4) return null;
    const row = a.closest("tr");
    const text = row?.innerText.replace(/\s+/g, " ") || "";
    const date = (text.match(/20\d{2}[.\-]\d{2}[.\-]\d{2}/) || [""])[0].replaceAll(".", "-");
    const href = new URL(a.getAttribute("href"), baseUrl).href;
    return { id: Date.now() + Math.random(), title, date, link: href, source: "동아고", memo: "" };
  }).filter(Boolean);
}

function importHomeLettersFromTextV18(text) {
  const rows = text.split(/\n+/).map((line) => {
    const clean = line.replace(/\s+/g, " ").trim();
    const date = (clean.match(/20\d{2}[.\-]\d{2}[.\-]\d{2}/) || [""])[0].replaceAll(".", "-");
    const title = clean.replace(/^\d+\s+/, "").replace(/20\d{2}[.\-]\d{2}[.\-]\d{2}.*/, "").trim();
    return title ? { id: Date.now() + Math.random(), title, date, link: "", source: "붙여넣기", memo: "" } : null;
  }).filter(Boolean);
  mergeHomeLettersV18(rows);
  saveStore();
  renderHomeLettersV18();
}

function mergeHomeLettersV18(rows) {
  store.homeLetters ??= [];
  const seen = new Set(store.homeLetters.map((row) => `${row.title}|${row.date}`));
  rows.forEach((row) => {
    const key = `${row.title}|${row.date}`;
    if (!seen.has(key)) {
      store.homeLetters.unshift(row);
      seen.add(key);
    }
  });
  saveStore();
}

function homeLetterTableV18(rows) {
  if (!rows.length) return el("div", "empty", "아직 가져온 가정통신문이 없습니다.");
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["date", "title", "source", "link", "memo"].forEach((col) => hr.append(el("th", "", labelFor(col))));
  thead.append(hr);
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.append(el("td", "", row.date || ""), el("td", "", row.title || ""), el("td", "", row.source || ""));
    const linkTd = el("td", "");
    if (row.link) {
      const a = document.createElement("a");
      a.href = row.link;
      a.target = "_blank";
      a.textContent = "열기";
      linkTd.append(a);
    }
    tr.append(linkTd, el("td", "", row.memo || ""));
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

function renderSiteV18() {
  renderSiteV16();
  if (document.getElementById("homeLetterSiteBox")) return;
  const box = panel("학교 홈페이지 연동");
  box.id = "homeLetterSiteBox";
  box.append(makeTextField("가정통신문 게시판 URL", "siteHomeLetterUrl", store.settings.homeLetterUrl || ""));
  const save = button("가정통신문 URL 저장", "ghost");
  save.addEventListener("click", () => {
    store.settings.homeLetterUrl = document.getElementById("siteHomeLetterUrl").value.trim();
    saveStore();
    showMessage("저장 완료", "학교 가정통신문 게시판 URL을 저장했습니다.");
  });
  box.append(save, el("p", "muted", "동아고 가정통신문 게시판 URL이 기본으로 들어가 있습니다."));
  content.append(box);
}

ensureAppV18();

// Final V19: Dong-A High school notice integration.
function ensureAppV19() {
  ensureAppV18();
  Object.assign(pageMeta, {
    schoolNotices: ["학", "학교공지"]
  });
  Object.assign(permissions, {
    schoolNotices: { create: ["admin", "user"], edit: ["admin", "user"], del: ["admin"] }
  });
  store.schoolNotices ??= [];
  store.settings.schoolNoticeUrl ??= "https://school.busanedu.net/dong-a-h/na/ntt/selectNttList.do?bbsId=1013416&mi=622560";
  store.settings.appVersion = "v19.0 - 2026-06-17";
}

function navKeys() {
  ensureAppV19();
  if (currentUser?.role === "print") return ["print", "examSchedules"];
  const keys = ["dashboard", "personal", "attendance", "schedules", "academic", "notices", "schoolNotices", "homeLetters", "examSchedules", "meals", "mealApplications", "subjects", "teachers", "materials", "lessons", "assignments", "exams", "records", "projects", "portfolios", "penalties", "timetable", "afterschool", "specialLectures", "clubs", "requests"];
  if (isAdmin()) keys.push("people", "friendAwards", "budget", "site", "accounts", "admin", "system", "print");
  return keys;
}

function buildNav() {
  ensureAppV19();
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
    if (key === "afterschool" && !store.settings.hideAfterschoolNamesInNav) appendProgramNavV17("afterschool");
    if (key === "specialLectures" && !store.settings.hideSpecialLectureNamesInNav) appendProgramNavV17("specialLectures");
    if (key === "clubs" && !store.settings.hideClubNamesInNav) appendProgramNavV17("clubs");
  });
}

function renderPage(key) {
  ensureAppV19();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();

  if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "academic") renderAcademicV17();
  else if (key === "homeLetters") renderHomeLettersV18();
  else if (key === "schoolNotices") renderSchoolNoticesV19();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramListV17("afterschool");
  else if (key === "specialLectures") renderProgramListV17("specialLectures");
  else if (key === "clubs") renderProgramListV17("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV17();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV12();
  else if (key === "site") renderSiteV19();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);

  appendSystemReportBoxV12();
  appendVersionInfoV16();
}

function renderSchoolNoticesV19() {
  content.replaceChildren();
  const section = panel("학교공지");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const open = button("학교 공지사항 열기", "ghost");
  open.addEventListener("click", () => window.open(store.settings.schoolNoticeUrl, "_blank"));
  const sync = button("학교 홈페이지에서 가져오기");
  sync.addEventListener("click", fetchSchoolNoticesV19);
  actions.append(open, sync);
  head.append(actions);

  const settings = el("div", "form-grid");
  settings.append(makeTextField("동아고 공지사항 게시판 URL", "schoolNoticeUrlInput", store.settings.schoolNoticeUrl || ""));
  const saveUrl = button("URL 저장", "ghost");
  saveUrl.addEventListener("click", () => {
    store.settings.schoolNoticeUrl = document.getElementById("schoolNoticeUrlInput").value.trim();
    saveStore();
    showMessage("저장 완료", "공지사항 게시판 주소를 저장했습니다.");
  });
  settings.append(saveUrl);

  const paste = panel("붙여넣기 가져오기");
  const textarea = document.createElement("textarea");
  textarea.id = "schoolNoticePaste";
  textarea.placeholder = "학교 공지사항 게시판 목록을 복사해 붙여넣으면 제목과 날짜를 추출합니다.";
  const pasteBtn = button("붙여넣은 목록 가져오기", "ghost");
  pasteBtn.addEventListener("click", () => importSchoolNoticesFromTextV19(textarea.value));
  paste.append(textarea, pasteBtn, el("p", "muted", "학교 사이트가 브라우저 자동 가져오기를 차단하면 이 방법을 사용하세요."));

  section.append(settings, el("p", "muted", "동아고 공개 공지사항 게시판과 연결되어 있습니다. 자동 가져오기는 학교 홈페이지의 보안/CORS 설정에 따라 차단될 수 있습니다."), schoolNoticeTableV19(store.schoolNotices || []), paste);
  content.append(section);
}

async function fetchSchoolNoticesV19() {
  const url = (document.getElementById("schoolNoticeUrlInput")?.value || store.settings.schoolNoticeUrl || "").trim();
  if (!url) return showMessage("가져오기 실패", "게시판 URL을 입력하세요.");
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const rows = parseHomeLettersHtmlV18(html, url).map((row) => ({ ...row, source: "동아고 공지" }));
    if (!rows.length) throw new Error("목록을 찾지 못했습니다.");
    mergeSchoolNoticesV19(rows);
    showMessage("가져오기 완료", `${rows.length}개 항목을 확인했습니다.`);
    renderSchoolNoticesV19();
  } catch (error) {
    showMessage("자동 가져오기 차단", "학교 사이트 보안 설정 때문에 브라우저에서 직접 가져오지 못했습니다. '학교 공지사항 열기' 후 목록을 복사해서 붙여넣기 가져오기를 사용하세요.");
  }
}

function importSchoolNoticesFromTextV19(text) {
  const rows = text.split(/\n+/).map((line) => {
    const clean = line.replace(/\s+/g, " ").trim();
    const date = (clean.match(/20\d{2}[.\-]\d{2}[.\-]\d{2}/) || [""])[0].replaceAll(".", "-");
    const title = clean.replace(/^공지\s*/, "").replace(/^\d+\s+/, "").replace(/20\d{2}[.\-]\d{2}[.\-]\d{2}.*/, "").trim();
    return title ? { id: Date.now() + Math.random(), title, date, link: "", source: "붙여넣기", memo: "" } : null;
  }).filter(Boolean);
  mergeSchoolNoticesV19(rows);
  saveStore();
  renderSchoolNoticesV19();
}

function mergeSchoolNoticesV19(rows) {
  store.schoolNotices ??= [];
  const seen = new Set(store.schoolNotices.map((row) => `${row.title}|${row.date}`));
  rows.forEach((row) => {
    const key = `${row.title}|${row.date}`;
    if (!seen.has(key)) {
      store.schoolNotices.unshift(row);
      seen.add(key);
    }
  });
  saveStore();
}

function schoolNoticeTableV19(rows) {
  if (!rows.length) return el("div", "empty", "아직 가져온 학교 공지사항이 없습니다.");
  return homeLetterTableV18(rows);
}

function renderSiteV19() {
  renderSiteV18();
  if (document.getElementById("schoolNoticeSiteBox")) return;
  const box = panel("학교 공지사항 연동");
  box.id = "schoolNoticeSiteBox";
  box.append(makeTextField("공지사항 게시판 URL", "siteSchoolNoticeUrl", store.settings.schoolNoticeUrl || ""));
  const save = button("공지사항 URL 저장", "ghost");
  save.addEventListener("click", () => {
    store.settings.schoolNoticeUrl = document.getElementById("siteSchoolNoticeUrl").value.trim();
    saveStore();
    showMessage("저장 완료", "학교 공지사항 게시판 URL을 저장했습니다.");
  });
  box.append(save, el("p", "muted", "동아고 공지사항 게시판 URL이 기본으로 들어가 있습니다."));
  content.append(box);
}

ensureAppV19();

// Final V20: Dong-A High academic schedule integration.
function ensureAppV20() {
  ensureAppV19();
  store.academicSchedules ??= [];
  store.settings.academicCalendarUrl ??= "https://school.busanedu.net/dong-a-h/sv/schdulView/schdulCalendarView.do?mi=1051003";
  store.settings.academicAnnualUrl ??= "https://school.busanedu.net/dong-a-h/cm/cntnts/cntntsView.do?cntntsId=14887&mi=622567";
  store.settings.appVersion = "v20.0 - 2026-06-17";
}

function renderAcademicV17() {
  ensureAppV20();
  content.replaceChildren();
  const section = panel("학사일정");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const openCalendar = button("행사 및 일정 열기", "ghost");
  openCalendar.addEventListener("click", () => window.open(store.settings.academicCalendarUrl, "_blank"));
  const openAnnual = button("연간 학사 일정 열기", "ghost");
  openAnnual.addEventListener("click", () => window.open(store.settings.academicAnnualUrl, "_blank"));
  const sync = button("학교 홈페이지에서 가져오기");
  sync.addEventListener("click", fetchAcademicSchedulesV20);
  actions.append(openCalendar, openAnnual, sync);
  head.append(actions);

  const urls = el("div", "form-grid");
  urls.append(
    makeTextField("행사 및 일정 URL", "academicCalendarUrlInput", store.settings.academicCalendarUrl || ""),
    makeTextField("연간 학사 일정 URL", "academicAnnualUrlInput", store.settings.academicAnnualUrl || "")
  );
  const saveUrls = button("학사일정 URL 저장", "ghost");
  saveUrls.addEventListener("click", () => {
    store.settings.academicCalendarUrl = document.getElementById("academicCalendarUrlInput").value.trim();
    store.settings.academicAnnualUrl = document.getElementById("academicAnnualUrlInput").value.trim();
    saveStore();
    showMessage("저장 완료", "학사일정 URL을 저장했습니다.");
  });
  urls.append(saveUrls);

  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*,.pdf,.hwp,.hwpx";
  file.hidden = true;
  file.addEventListener("change", () => attachAcademicFileV17(file.files[0]));
  const upload = button("학사일정 이미지/OCR 파일 첨부", "ghost");
  upload.addEventListener("click", () => file.click());

  const form = el("div", "form-grid");
  form.append(makeTextField("일정명", "academicTitle", ""), makeTextField("날짜", "academicDate", today), makeTextareaField("OCR/직접 입력 내용", "academicContent", ""));
  const add = button("학사일정 저장");
  add.addEventListener("click", () => {
    if (!academicTitle.value.trim() && !academicContent.value.trim()) return;
    store.academicSchedules.unshift({ id: Date.now(), title: academicTitle.value, date: academicDate.value, content: academicContent.value, fileName: "", source: "직접 입력", link: "" });
    saveStore();
    renderAcademicV17();
  });

  const paste = panel("붙여넣기 가져오기");
  const textarea = document.createElement("textarea");
  textarea.id = "academicPaste";
  textarea.placeholder = "학교 학사일정/행사일정 페이지 내용을 복사해 붙여넣으면 날짜와 일정명을 추출합니다.";
  const pasteBtn = button("붙여넣은 학사일정 가져오기", "ghost");
  pasteBtn.addEventListener("click", () => importAcademicFromTextV20(textarea.value));
  paste.append(textarea, pasteBtn, el("p", "muted", "자동 가져오기가 학교 사이트 보안 설정으로 막히면 이 방법을 사용하세요."));

  section.append(
    urls,
    el("p", "muted", "동아고 공개 행사 및 일정/연간 학사 일정 페이지와 연결되어 있습니다. 자동 가져오기는 학교 홈페이지 보안 설정에 따라 차단될 수 있습니다."),
    file,
    upload,
    form,
    add,
    academicTableV20(store.academicSchedules || []),
    paste
  );
  content.append(section);
}

async function fetchAcademicSchedulesV20() {
  const urls = [
    document.getElementById("academicCalendarUrlInput")?.value || store.settings.academicCalendarUrl,
    document.getElementById("academicAnnualUrlInput")?.value || store.settings.academicAnnualUrl
  ].map((url) => String(url || "").trim()).filter(Boolean);
  if (!urls.length) return showMessage("가져오기 실패", "학사일정 URL을 입력하세요.");
  try {
    const imported = [];
    for (const url of urls) {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      imported.push(...parseAcademicHtmlV20(html, url));
    }
    if (!imported.length) throw new Error("일정을 찾지 못했습니다.");
    mergeAcademicV20(imported);
    showMessage("가져오기 완료", `${imported.length}개 학사일정을 확인했습니다.`);
    renderAcademicV17();
  } catch (error) {
    showMessage("자동 가져오기 차단", "학교 사이트 보안 설정 또는 페이지 구조 때문에 직접 가져오지 못했습니다. 페이지를 열어 내용을 복사한 뒤 붙여넣기 가져오기를 사용하세요.");
  }
}

function parseAcademicHtmlV20(html, baseUrl) {
  const text = new DOMParser().parseFromString(html, "text/html").body?.innerText || "";
  return parseAcademicTextV20(text).map((row) => ({ ...row, source: "동아고", link: baseUrl }));
}

function importAcademicFromTextV20(text) {
  const rows = parseAcademicTextV20(text).map((row) => ({ ...row, source: "붙여넣기", link: "" }));
  mergeAcademicV20(rows);
  saveStore();
  renderAcademicV17();
}

function parseAcademicTextV20(text) {
  const lines = String(text || "").split(/\n+/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const rows = [];
  lines.forEach((line) => {
    const fullDate = line.match(/(20\d{2})[.\-년\s]+(\d{1,2})[.\-월\s]+(\d{1,2})/);
    const monthDay = line.match(/(^|\s)(\d{1,2})[.\-/월\s]+(\d{1,2})(일)?(\s|$)/);
    let date = "";
    if (fullDate) date = `${fullDate[1]}-${String(fullDate[2]).padStart(2, "0")}-${String(fullDate[3]).padStart(2, "0")}`;
    else if (monthDay) date = `${new Date().getFullYear()}-${String(monthDay[2]).padStart(2, "0")}-${String(monthDay[3]).padStart(2, "0")}`;
    const title = line.replace(/20\d{2}[.\-년\s]+\d{1,2}[.\-월\s]+\d{1,2}(일)?/, "").replace(/^\d{1,2}[.\-/월\s]+\d{1,2}(일)?/, "").trim();
    if (date && title && title.length > 1) rows.push({ id: Date.now() + Math.random(), date, title, content: line, fileName: "" });
  });
  return rows;
}

function mergeAcademicV20(rows) {
  store.academicSchedules ??= [];
  const seen = new Set(store.academicSchedules.map((row) => `${row.date}|${row.title}`));
  rows.forEach((row) => {
    const key = `${row.date}|${row.title}`;
    if (!seen.has(key)) {
      store.academicSchedules.unshift(row);
      seen.add(key);
    }
  });
  saveStore();
}

function academicTableV20(rows) {
  if (!rows.length) return el("div", "empty", "아직 가져온 학사일정이 없습니다.");
  return simpleRowsTableV16(["date", "title", "content", "source", "fileName"], rows);
}

function renderSiteV20() {
  renderSiteV19();
  if (document.getElementById("academicSiteBox")) return;
  const box = panel("학사일정 연동");
  box.id = "academicSiteBox";
  box.append(makeTextField("행사 및 일정 URL", "siteAcademicCalendarUrl", store.settings.academicCalendarUrl || ""), makeTextField("연간 학사 일정 URL", "siteAcademicAnnualUrl", store.settings.academicAnnualUrl || ""));
  const save = button("학사일정 URL 저장", "ghost");
  save.addEventListener("click", () => {
    store.settings.academicCalendarUrl = document.getElementById("siteAcademicCalendarUrl").value.trim();
    store.settings.academicAnnualUrl = document.getElementById("siteAcademicAnnualUrl").value.trim();
    saveStore();
    showMessage("저장 완료", "학사일정 URL을 저장했습니다.");
  });
  box.append(save, el("p", "muted", "동아고 행사 및 일정/연간 학사 일정 URL이 기본으로 들어가 있습니다."));
  content.append(box);
}

function renderPage(key) {
  ensureAppV20();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "academic") renderAcademicV17();
  else if (key === "site") renderSiteV20();
  else if (key === "schoolNotices") renderSchoolNoticesV19();
  else if (key === "homeLetters") renderHomeLettersV18();
  else if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramListV17("afterschool");
  else if (key === "specialLectures") renderProgramListV17("specialLectures");
  else if (key === "clubs") renderProgramListV17("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV17();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV12();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);
  appendSystemReportBoxV12();
  appendVersionInfoV16();
}

ensureAppV20();

// Final V21: monthly meal application planner with per-date price calculation.
function ensureAppV21() {
  ensureAppV20();
  store.mealApplications ??= [];
  store.settings.mealDinnerPrice ??= 0;
  store.settings.mealSaturdayLunchPrice ??= 0;
  store.settings.neisMealOfficeCode ??= "";
  store.settings.neisMealSchoolCode ??= "";
  store.settings.appVersion = "v22.0 - 2026-06-17";
}

function renderMealApplicationsV16() {
  ensureAppV21();
  content.replaceChildren();
  const now = new Date();
  const selectedYear = Number(sessionStorage.getItem("mealApplyYear") || now.getFullYear());
  const selectedMonth = Number(sessionStorage.getItem("mealApplyMonth") || now.getMonth() + 1);
  const section = panel("급식 신청");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const yearInput = document.createElement("input");
  yearInput.type = "number";
  yearInput.min = "2020";
  yearInput.max = "2100";
  yearInput.value = selectedYear;
  yearInput.addEventListener("change", () => {
    sessionStorage.setItem("mealApplyYear", yearInput.value || String(now.getFullYear()));
    renderMealApplicationsV16();
  });
  const monthSelect = document.createElement("select");
  Array.from({ length: 12 }, (_, i) => i + 1).forEach((month) => {
    const option = document.createElement("option");
    option.value = String(month);
    option.textContent = `${month}월`;
    option.selected = month === selectedMonth;
    monthSelect.append(option);
  });
  monthSelect.addEventListener("change", () => {
    sessionStorage.setItem("mealApplyMonth", monthSelect.value);
    renderMealApplicationsV16();
  });
  const prev = button("이전달", "ghost");
  prev.addEventListener("click", () => moveMealApplicationMonthV21(-1));
  const next = button("다음달", "ghost");
  next.addEventListener("click", () => moveMealApplicationMonthV21(1));
  const saveMeal = button("급식 신청 저장");
  saveMeal.addEventListener("click", () => {
    saveStore();
    const dinner = mealTypeSummaryV21(mealApplicationRowV21(selectedYear, selectedMonth, "dinner"));
    const saturdayLunch = mealTypeSummaryV21(mealApplicationRowV21(selectedYear, selectedMonth, "saturdayLunch"));
    showMessage("저장 완료", `${selectedYear}년 ${selectedMonth}월 급식 신청을 저장했습니다.\n석식 ${dinner.count}일, 토요일 자습 중식 ${saturdayLunch.count}일`);
  });
  actions.append(makeField("연도", "mealApplyYearWrap", yearInput), makeField("월", "mealApplyMonthWrap", monthSelect), prev, next, saveMeal);
  head.append(actions);

  const priceBox = el("div", "meal-price-box");
  priceBox.append(
    mealPriceInputV21("석식 단가", "mealDinnerPrice", "mealDinnerUnitPrice", "dinner"),
    mealPriceInputV21("토요일 자습 중식 단가", "mealSaturdayLunchPrice", "mealSaturdayLunchUnitPrice", "saturdayLunch")
  );

  const planner = el("div", "meal-planner-grid");
  planner.append(
    mealTypePlannerV21({ year: selectedYear, month: selectedMonth, type: "dinner", title: "석식", hint: "평일/주말 모두 직접 선택할 수 있습니다." }),
    mealTypePlannerV21({ year: selectedYear, month: selectedMonth, type: "saturdayLunch", title: "토요일 자습 중식", hint: "토요일은 강조 표시됩니다. 필요한 날짜만 선택하세요." })
  );

  const neis = panel("나이스 급식 불러오기");
  neis.classList.add("sub-panel");
  const neisGrid = el("div", "form-grid");
  neisGrid.append(
    makeTextField("교육청 코드", "neisMealOfficeCode", store.settings.neisMealOfficeCode || ""),
    makeTextField("학교 코드", "neisMealSchoolCode", store.settings.neisMealSchoolCode || "")
  );
  const saveNeis = button("NEIS 설정 저장", "ghost");
  saveNeis.addEventListener("click", () => {
    store.settings.neisMealOfficeCode = document.getElementById("neisMealOfficeCode").value.trim();
    store.settings.neisMealSchoolCode = document.getElementById("neisMealSchoolCode").value.trim();
    saveStore();
    showMessage("저장 완료", "나이스 급식 조회용 학교 정보를 저장했습니다.");
  });
  neis.append(
    neisGrid,
    saveNeis,
    el("p", "muted", "NEIS 공개 OpenAPI는 학교 급식 메뉴 조회가 가능합니다. 다만 이 앱은 현재 정적 로컬 웹앱이라 인증키/학교코드 설정과 브라우저 보안 제한에 따라 직접 호출이 막힐 수 있습니다. 막히면 급식 파일 업로드 탭을 같이 사용하세요.")
  );

  section.append(
    el("p", "muted", "매달 석식과 토요일 자습 중식을 따로 선택합니다. 단가를 입력하면 선택한 날짜 수와 예상 금액이 자동 계산됩니다."),
    priceBox,
    planner,
    mealApplicationSummaryV21(selectedYear, selectedMonth),
    neis
  );
  content.append(section);
}

function moveMealApplicationMonthV21(delta) {
  const now = new Date();
  let year = Number(sessionStorage.getItem("mealApplyYear") || now.getFullYear());
  let month = Number(sessionStorage.getItem("mealApplyMonth") || now.getMonth() + 1) + delta;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  if (month > 12) {
    month = 1;
    year += 1;
  }
  sessionStorage.setItem("mealApplyYear", String(year));
  sessionStorage.setItem("mealApplyMonth", String(month));
  renderMealApplicationsV16();
}

function mealPriceInputV21(label, settingKey, id, type) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "10";
  input.id = id;
  input.value = Number(store.settings[settingKey] || 0);
  input.addEventListener("input", () => {
    store.settings[settingKey] = Number(input.value || 0);
    const now = new Date();
    const year = Number(sessionStorage.getItem("mealApplyYear") || now.getFullYear());
    const month = Number(sessionStorage.getItem("mealApplyMonth") || now.getMonth() + 1);
    const row = mealApplicationRowV21(year, month, type);
    row.unitPrice = Number(input.value || 0);
    saveStore();
    updateMealTotalsV21();
  });
  return makeField(label, `${id}Wrap`, input);
}

function mealApplicationRowV21(year, month, type) {
  store.mealApplications ??= [];
  const user = currentUser?.email || "";
  let row = store.mealApplications.find((item) => String(item.year) === String(year) && Number(item.month) === Number(month) && item.user === user && item.type === type);
  if (!row) {
    row = {
      id: Date.now() + Math.random(),
      year: String(year),
      month: Number(month),
      user,
      type,
      selectedDates: [],
      unitPrice: type === "dinner" ? Number(store.settings.mealDinnerPrice || 0) : Number(store.settings.mealSaturdayLunchPrice || 0),
      note: ""
    };
    store.mealApplications.push(row);
  }
  if (!Array.isArray(row.selectedDates)) row.selectedDates = [];
  return row;
}

function mealTypePlannerV21({ year, month, type, title, hint }) {
  const row = mealApplicationRowV21(year, month, type);
  const box = el("article", "meal-planner-card");
  const selected = new Set(row.selectedDates || []);
  const days = daysInMonthV21(year, month);
  const grid = el("div", "meal-date-grid");
  days.forEach((date) => {
    const day = new Date(`${date}T00:00:00`);
    const btn = button(String(day.getDate()), "ghost meal-date-button");
    btn.dataset.mealDate = date;
    btn.dataset.mealType = type;
    btn.title = `${date} ${weekdayKoV21(day.getDay())}`;
    btn.classList.toggle("selected", selected.has(date));
    btn.classList.toggle("saturday", day.getDay() === 6);
    btn.classList.toggle("sunday", day.getDay() === 0);
    btn.innerHTML = `<strong>${day.getDate()}</strong><span>${weekdayKoV21(day.getDay())}</span>`;
    btn.addEventListener("click", () => {
      const target = mealApplicationRowV21(year, month, type);
      const set = new Set(target.selectedDates || []);
      if (set.has(date)) set.delete(date);
      else set.add(date);
      target.selectedDates = [...set].sort();
      saveStore();
      renderMealApplicationsV16();
    });
    grid.append(btn);
  });
  const note = document.createElement("textarea");
  note.placeholder = "메모";
  note.value = row.note || "";
  note.addEventListener("change", () => {
    row.note = note.value;
    saveStore();
  });
  const summary = mealTypeSummaryV21(row);
  const plannerHead = el("div", "meal-planner-head");
  plannerHead.append(el("h3", "", title), el("p", "muted", hint));
  box.append(
    plannerHead,
    el("div", "meal-total-line", `${summary.count}일 선택 · ${formatWonV21(summary.total)}원`),
    grid,
    note
  );
  return box;
}

function daysInMonthV21(year, month) {
  const total = new Date(year, month, 0).getDate();
  return Array.from({ length: total }, (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

function weekdayKoV21(day) {
  return ["일", "월", "화", "수", "목", "금", "토"][day] || "";
}

function mealTypeSummaryV21(row) {
  const count = (row.selectedDates || []).length;
  const unit = Number(row.unitPrice || 0);
  return { count, unit, total: count * unit };
}

function updateMealTotalsV21() {
  document.querySelectorAll(".meal-total-line").forEach((node) => {
    const card = node.closest(".meal-planner-card");
    const firstButton = card?.querySelector(".meal-date-button");
    if (!firstButton) return;
    const now = new Date();
    const year = Number(sessionStorage.getItem("mealApplyYear") || now.getFullYear());
    const month = Number(sessionStorage.getItem("mealApplyMonth") || now.getMonth() + 1);
    const row = mealApplicationRowV21(year, month, firstButton.dataset.mealType);
    const summary = mealTypeSummaryV21(row);
    node.textContent = `${summary.count}일 선택 · ${formatWonV21(summary.total)}원`;
  });
}

function mealApplicationSummaryV21(year, month) {
  const wrap = panel("월별 신청 요약");
  wrap.classList.add("sub-panel");
  const rows = ["dinner", "saturdayLunch"].map((type) => {
    const row = mealApplicationRowV21(year, month, type);
    const summary = mealTypeSummaryV21(row);
    return { name: type === "dinner" ? "석식" : "토요일 자습 중식", count: `${summary.count}일`, unit: `${formatWonV21(summary.unit)}원`, total: `${formatWonV21(summary.total)}원`, dates: (row.selectedDates || []).join(", ") || "-" };
  });
  const total = rows.reduce((sum, row) => sum + Number(String(row.total).replace(/[^\d]/g, "") || 0), 0);
  wrap.append(
    simpleRowsTableV16(["name", "count", "unit", "total", "dates"], rows),
    el("div", "meal-grand-total", `${year}년 ${month}월 예상 합계 ${formatWonV21(total)}원`)
  );
  return wrap;
}

function formatWonV21(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

ensureAppV21();

// Final V26: modern program hubs for afterschool, special lectures, and clubs.
function ensureAppV26() {
  ensureAppV21();
  pageMeta.afterschool = ["방", "방과후"];
  pageMeta.specialLectures = ["특", "특강"];
  pageMeta.clubs = ["동", "동아리"];
  store.settings.programNavCollapsed ??= {};
  ["afterschool", "specialLectures", "clubs"].forEach((type) => {
    const cfg = programConfigV26(type);
    store[cfg.programs] ??= [];
    store[cfg.attendance] ??= [];
    store[cfg.schedules] ??= [];
    if (!store[cfg.programs].length) {
      store[cfg.programs].push({
        id: `${type}-${Date.now()}`,
        name: cfg.defaultName,
        teacher: "",
        location: "",
        regular: "",
        notice: "",
        memo: "",
        students: "이다은\n김수민\n이민지\n박정우\n최현우"
      });
    }
  });
  store.settings.appVersion = "v26.1 - 2026-06-18";
}

function programConfigV26(type) {
  if (type === "afterschool") return { title: "방과후", titleLong: "방과후 고품격 특강 기획국", addLabel: "신규 강좌 개설등록", defaultName: "방과후 보충강좌", programs: "afterschoolPrograms", attendance: "afterschoolAttendance", schedules: "afterschoolSchedules", scheduleType: "방과후", hide: "hideAfterschoolNamesInNav", accent: "#1d5cff" };
  if (type === "specialLectures") return { title: "특강", titleLong: "특강 집중 관리 센터", addLabel: "신규 특강 개설등록", defaultName: "미적분 수능 킬러문항 집중 특강", programs: "specialLecturePrograms", attendance: "specialLectureAttendance", schedules: "specialLectureSchedules", scheduleType: "특강", hide: "hideSpecialLectureNamesInNav", accent: "#ff7a00" };
  return { title: "동아리", titleLong: "학생 자치 브랜드 동아리 활동실", addLabel: "신규 동아리 개설등록", defaultName: "소프트웨어 알고리즘 자치 동아리", programs: "clubPrograms", attendance: "clubAttendance", schedules: "clubSchedules", scheduleType: "동아리", hide: "hideClubNamesInNav", accent: "#00a878" };
}

function buildNav() {
  ensureAppV26();
  nav.replaceChildren();
  navKeys().forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.dataset.page = key;
    btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
    if (["afterschool", "specialLectures", "clubs"].includes(key)) {
      const chip = el("span", "nav-toggle-chip", store.settings.programNavCollapsed?.[key] ? "펼침" : "숨김");
      chip.title = "하위 목록 접기/펼치기";
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        store.settings.programNavCollapsed[key] = !store.settings.programNavCollapsed?.[key];
        saveStore();
        buildNav();
      });
      btn.append(chip);
    }
    if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
    btn.addEventListener("click", () => renderPage(key));
    nav.append(btn);
    if (["afterschool", "specialLectures", "clubs"].includes(key) && !store.settings.programNavCollapsed?.[key] && !store.settings[programConfigV26(key).hide]) appendProgramNavV26(key);
  });
}

function appendProgramNavV26(type) {
  const cfg = programConfigV26(type);
  (store[cfg.programs] || []).forEach((program) => {
    const child = document.createElement("button");
    child.className = "nav-btn nav-child program-nav-child";
    child.dataset.page = type;
    child.dataset.programId = program.id;
    child.append(el("span", "nav-icon", ""), el("span", "nav-text", program.name || cfg.title));
    child.addEventListener("click", () => renderProgramPageV26(type, program.id, "attendance"));
    nav.append(child);
  });
}

function renderPage(key) {
  ensureAppV26();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "academic") renderAcademicV17();
  else if (key === "site") renderSiteV20();
  else if (key === "schoolNotices") renderSchoolNoticesV19();
  else if (key === "homeLetters") renderHomeLettersV18();
  else if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramListV26("afterschool");
  else if (key === "specialLectures") renderProgramListV26("specialLectures");
  else if (key === "clubs") renderProgramListV26("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV17();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV12();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);
  appendSystemReportBoxV12();
  appendVersionInfoV16();
}

function renderProgramListV26(type) {
  ensureAppV26();
  const cfg = programConfigV26(type);
  currentPage = type;
  pageTitle.textContent = cfg.title;
  content.replaceChildren();
  const header = el("div", "program-list-header");
  const copy = el("div", "");
  copy.append(el("h2", "", cfg.titleLong), el("p", "muted", type === "clubs" ? "학생들이 주체적으로 운영하는 활동 대장, 출결 조사, 활동 일지 및 정기 모임 시간표를 한곳에서 통제합니다." : "원내 우수 보충 과정 및 특강 강좌를 기록, 정기 시간표 등록, 학생별 실시간 출결 통계를 통합 관리합니다."));
  const add = button(`+ ${cfg.addLabel}`);
  add.addEventListener("click", () => addProgramV26(type));
  header.append(copy, add);
  const optionBar = el("div", "program-option-bar");
  const showChildren = document.createElement("input");
  showChildren.type = "checkbox";
  showChildren.checked = !store.settings.programNavCollapsed?.[type];
  showChildren.addEventListener("change", () => {
    store.settings.programNavCollapsed[type] = !showChildren.checked;
    saveStore();
    buildNav();
    renderProgramListV26(type);
  });
  optionBar.append(makeField("사이드탭 하위 목록 표시", `${type}ProgramNavVisible`, showChildren));
  const cards = el("div", "modern-program-grid");
  (store[cfg.programs] || []).forEach((program) => cards.append(programCardV26(type, program)));
  content.append(header, optionBar, cards);
  appendVersionInfoV16();
}

function programCardV26(type, program) {
  const cfg = programConfigV26(type);
  const card = el("article", "modern-program-card");
  const top = el("div", "program-card-top");
  top.append(el("span", "program-badge", program.category || cfg.defaultName), el("button", "program-delete-link", "강좌삭제"));
  top.querySelector("button").addEventListener("click", () => {
    if (!confirm(`${program.name || cfg.title}을 삭제할까요?`)) return;
    markWorkspaceDeleted(cfg.programs, program.id);
    markWorkspaceDeletedRows(cfg.attendance, (store[cfg.attendance] || []).filter((item) => item.programId === program.id));
    markWorkspaceDeletedRows(cfg.schedules, (store[cfg.schedules] || []).filter((item) => item.programId === program.id));
    const setId = programSetIdV26(type, program);
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((item) => item.setId === setId));
    markWorkspaceDeleted("timetableSets", setId);
    store[cfg.programs] = (store[cfg.programs] || []).filter((item) => item.id !== program.id);
    store[cfg.attendance] = (store[cfg.attendance] || []).filter((item) => item.programId !== program.id);
    store[cfg.schedules] = (store[cfg.schedules] || []).filter((item) => item.programId !== program.id);
    store.timetable = (store.timetable || []).filter((item) => item.setId !== setId);
    store.timetableSets = (store.timetableSets || []).filter((item) => item.id !== setId);
    saveStore();
    buildNav();
    renderProgramListV26(type);
  });
  const title = el("h3", "", program.name || cfg.title);
  title.addEventListener("click", () => renderProgramPageV26(type, program.id, "attendance"));
  const subtitle = el("p", "program-desc", program.memo || (type === "clubs" ? "자치 활동 및 정기 모임 관리" : "수강생 출결과 시간표를 통합 관리"));
  const meta = el("div", "program-meta-box");
  meta.append(
    el("span", "", `강사: ${program.teacher || "담당 미정"}`),
    el("span", "", `장소: ${program.location || "장소 미정"}`),
    el("span", "", `정기일시: ${program.regular || "미등록"}`),
    el("span", "", `수강생: ${programStudentsV26(program).length}명`)
  );
  const actions = el("div", "program-action-grid");
  [["attendance", "▣", "출결"], ["stats", "⌁", "통계"], ["notice", "▤", "안내"], ["schedule", "◷", "시간표"]].forEach(([mode, icon, label]) => {
    const btn = button(`${icon}\n${label}`, `ghost program-action ${mode}`);
    btn.addEventListener("click", () => renderProgramPageV26(type, program.id, mode));
    actions.append(btn);
  });
  card.append(top, title, subtitle, meta, actions);
  return card;
}

function addProgramV26(type) {
  const cfg = programConfigV26(type);
  const name = prompt(`${cfg.title} 이름`, cfg.defaultName);
  if (!name) return;
  store[cfg.programs] ??= [];
  store[cfg.programs].push({ id: `${type}-${Date.now()}`, name, teacher: "", location: "", regular: "", notice: "", memo: "", students: "이다은\n김수민\n이민지\n박정우\n최현우" });
  saveStore();
  buildNav();
  renderProgramListV26(type);
}

function renderProgramPageV26(type, programId, mode = "attendance") {
  ensureAppV26();
  const cfg = programConfigV26(type);
  const program = (store[cfg.programs] || []).find((item) => item.id === programId) || (store[cfg.programs] || [])[0];
  if (!program) return renderProgramListV26(type);
  currentPage = type;
  pageTitle.textContent = `${cfg.title} · ${program.name}`;
  content.replaceChildren();
  const hero = el("div", "program-detail-hero");
  const left = el("div", "");
  left.append(el("span", "program-control-chip", "과정 상세 제어 센터"), el("h2", "", `${program.name || cfg.title} `), el("p", "", `${program.teacher || "담당 미정"} 선생님`));
  const back = button("목록으로 복귀", "ghost dark-ghost");
  back.addEventListener("click", () => renderProgramListV26(type));
  hero.append(left, back);
  const shell = el("section", "panel program-control-panel");
  const tabs = el("div", "program-tabs");
  [["attendance", "▣", "실시간 출결 확인/입력"], ["stats", "⌁", "종합 참석률 통계"], ["notice", "▤", "강좌 안내 및 강의 계획공지"], ["schedule", "◷", "수강 시간표 추가배정"]].forEach(([next, icon, label]) => {
    const tab = button(`${icon} ${label}`, next === mode ? "program-tab active" : "program-tab ghost");
    tab.addEventListener("click", () => renderProgramPageV26(type, program.id, next));
    tabs.append(tab);
  });
  shell.append(tabs);
  if (mode === "stats") shell.append(programStatsV26(type, program));
  else if (mode === "notice") shell.append(programNoticeV26(type, program));
  else if (mode === "schedule") shell.append(programScheduleV26(type, program));
  else shell.append(programAttendanceV26(type, program));
  content.append(hero, shell);
  appendVersionInfoV16();
}

function programStudentsV26(program) {
  return String(program.students || "이다은\n김수민\n이민지\n박정우\n최현우").split(/\n|,/).map((name) => name.trim()).filter(Boolean);
}

function programAttendanceV26(type, program) {
  const cfg = programConfigV26(type);
  const wrap = el("div", "program-mode-body");
  const date = document.createElement("input");
  date.type = "date";
  date.value = sessionStorage.getItem(`program-date-${program.id}`) || today;
  date.addEventListener("change", () => {
    sessionStorage.setItem(`program-date-${program.id}`, date.value);
    renderProgramPageV26(type, program.id, "attendance");
  });
  const bar = el("div", "attendance-date-bar");
  bar.append(makeField("지정 출결 관리일자 선택", "programAttendDateV26", date), el("p", "muted", "작성한 출결 이력은 저장 버튼을 누르면 확정 저장됩니다."));
  const tableWrap = el("div", "program-attendance-table");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  ["순번", "학생 성명", "출결 상태 서명", "출결 특이 사유 특기사항"].forEach((text) => hr.append(el("th", "", text)));
  thead.append(hr);
  const tbody = document.createElement("tbody");
  const rows = store[cfg.attendance] || [];
  programStudentsV26(program).forEach((student, index) => {
    const existing = rows.find((row) => row.programId === program.id && row.date === date.value && row.name === student) || {};
    const tr = document.createElement("tr");
    tr.append(el("td", "", String(index + 1)), el("td", "", student));
    const stateCell = document.createElement("td");
    const group = el("div", "attendance-segment");
    ["출석", "지각", "결석", "조퇴"].forEach((state) => {
      const btn = button(state, existing.state === state || (!existing.state && state === "출석") ? "att-state active" : "att-state ghost");
      btn.dataset.student = student;
      btn.dataset.state = state;
      btn.addEventListener("click", () => {
        group.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
        btn.classList.add("active");
      });
      group.append(btn);
    });
    stateCell.append(group);
    const memoCell = document.createElement("td");
    const memo = document.createElement("input");
    memo.placeholder = "예: 감기 증세, 외부 대회 참가 등";
    memo.value = existing.memo || "";
    memo.dataset.studentMemo = student;
    memoCell.append(memo);
    tr.append(stateCell, memoCell);
    tbody.append(tr);
  });
  table.append(thead, tbody);
  tableWrap.append(table);
  const roster = document.createElement("textarea");
  roster.value = program.students || programStudentsV26(program).join("\n");
  roster.placeholder = "학생 명단을 줄바꿈으로 입력";
  const saveRoster = button("학생 명단 저장", "ghost");
  saveRoster.addEventListener("click", () => {
    program.students = roster.value;
    saveStore();
    renderProgramPageV26(type, program.id, "attendance");
  });
  const save = button("출결 일지 및 일지 최종 전산망 저장");
  save.addEventListener("click", () => {
    markWorkspaceDeletedRows(cfg.attendance, (store[cfg.attendance] || []).filter((row) => row.programId === program.id && row.date === date.value));
    store[cfg.attendance] = (store[cfg.attendance] || []).filter((row) => !(row.programId === program.id && row.date === date.value));
    tableWrap.querySelectorAll(".attendance-segment").forEach((group) => {
      const active = group.querySelector(".active");
      if (!active) return;
      const student = active.dataset.student;
      const memoInput = tableWrap.querySelector(`[data-student-memo="${CSS.escape(student)}"]`);
      store[cfg.attendance].push({ id: Date.now() + Math.random(), programId: program.id, date: date.value, name: student, state: active.dataset.state, memo: memoInput?.value || "" });
    });
    saveStore();
    showMessage("저장 완료", `${program.name} ${date.value} 출결을 저장했습니다.`);
  });
  wrap.append(bar, tableWrap, el("div", "program-roster-box", makeField("수강생 명단", "programStudentsV26", roster), saveRoster), el("div", "program-sticky-actions", save));
  return wrap;
}

function programStatsV26(type, program) {
  const cfg = programConfigV26(type);
  const rows = (store[cfg.attendance] || []).filter((row) => row.programId === program.id);
  const students = programStudentsV26(program);
  const total = rows.length || students.length;
  const attended = rows.filter((row) => row.state === "출석").length || students.length;
  const rate = Math.round((attended / Math.max(total, 1)) * 100);
  const wrap = el("div", "program-mode-body");
  const stats = el("div", "stats program-stat-grid");
  [["전체 평균 출석률", `${rate}%`], ["조사 동일 기재 일수", `${new Set(rows.map((row) => row.date)).size || 0}일 간`], ["평균 출석생 입력 규모", `${students.length ? (attended / Math.max(new Set(rows.map((row) => row.date)).size || 1, 1)).toFixed(1) : 0}명 / ${students.length}명`]].forEach(([label, value]) => {
    const item = el("div", "stat");
    item.append(el("span", "", label), el("strong", "", value));
    stats.append(item);
  });
  const bars = el("div", "student-rate-list");
  students.forEach((student) => {
    const mine = rows.filter((row) => row.name === student);
    const myRate = mine.length ? Math.round((mine.filter((row) => row.state === "출석").length / mine.length) * 100) : 100;
    const item = el("div", "student-rate-item");
    item.append(el("strong", "", student), el("span", "", `${myRate}% (${mine.filter((row) => row.state === "출석").length} / ${mine.length || 1}회)`));
    const bar = el("div", "student-rate-bar");
    const fill = el("i", "");
    fill.style.width = `${myRate}%`;
    bar.append(fill);
    item.append(bar);
    bars.append(item);
  });
  wrap.append(stats, el("h4", "", "학생별 누적 수강 등원 분석표"), bars);
  return wrap;
}

function programNoticeV26(type, program) {
  const wrap = el("div", "program-mode-body");
  const form = el("div", "form-grid");
  form.append(makeTextField("강좌명", "programNameV26", program.name || ""), makeTextField("강사", "programTeacherV26", program.teacher || ""), makeTextField("장소", "programLocationV26", program.location || ""), makeTextField("정기일시", "programRegularV26", program.regular || ""), makeTextareaField("강좌 공무원 전산 통신 및 교육 안내 수칙 편집", "programNoticeV26", program.notice || ""), makeTextareaField("메모/설명", "programMemoV26", program.memo || ""));
  const save = button("기획 소감 저장");
  save.addEventListener("click", () => {
    program.name = document.getElementById("programNameV26").value;
    program.teacher = document.getElementById("programTeacherV26").value;
    program.location = document.getElementById("programLocationV26").value;
    program.regular = document.getElementById("programRegularV26").value;
    program.notice = document.getElementById("programNoticeV26").value;
    program.memo = document.getElementById("programMemoV26").value;
    saveStore();
    buildNav();
    renderProgramPageV26(type, program.id, "notice");
  });
  wrap.append(form, el("div", "program-sticky-actions", save));
  return wrap;
}

function programScheduleV26(type, program) {
  const cfg = programConfigV26(type);
  const wrap = el("div", "program-mode-body");
  const notice = el("div", "program-schedule-notice");
  notice.append(el("strong", "", `${cfg.title} 전산 시간표 연동 수칙`), el("p", "muted", "여기서 요일과 교시를 등록하면 시간표 탭에서 해당 계열 시간표를 선택했을 때 자동으로 반영되어 보입니다."));
  const preview = programSchedulePreviewV26(type, program);
  const form = el("div", "program-slot-form");
  const day = document.createElement("select");
  programDaysV26().forEach((value) => day.append(option(value, value)));
  const period = document.createElement("select");
  Array.from({ length: Number(store.settings.timetablePeriods || 8) }, (_, i) => `${i + 1}교시`).forEach((value) => period.append(option(value, value)));
  const room = document.createElement("input");
  room.placeholder = `기본: ${program.location || "장소"}`;
  room.value = program.location || "";
  const add = button("⊕ 추가 요일/시간표 연동 등록");
  add.addEventListener("click", () => {
    addProgramScheduleSlotV26(type, program, day.value, period.value, room.value || program.location || "");
    renderProgramPageV26(type, program.id, "schedule");
  });
  form.append(makeField("요일 지정", "programScheduleDayV26", day), makeField("교시 선택", "programSchedulePeriodV26", period), makeField("강의장 변경", "programScheduleRoomV26", room), add);
  const rows = (store[cfg.schedules] || []).filter((row) => row.programId === program.id);
  wrap.append(notice, el("h4", "", "현재 확정 배정된 시간표 슬롯"), programSlotChipsV26(type, program, rows), el("h4", "", "수강 시간표 시각적 격자 판"), preview, form);
  return wrap;
}

function addProgramScheduleSlotV26(type, program, day, period, room) {
  const cfg = programConfigV26(type);
  const row = { id: Date.now(), programId: program.id, day, period, time: periodTimeForV26(period), subject: program.name, room, teacher: program.teacher || "", memo: cfg.scheduleType };
  store[cfg.schedules] ??= [];
  store[cfg.schedules].unshift(row);
  const setId = programSetIdV26(type, program);
  store.timetableSets ??= [];
  const setName = `${cfg.title} · ${program.name}`;
  const existingSet = store.timetableSets.find((set) => set.id === setId);
  if (existingSet) existingSet.name = setName;
  else store.timetableSets.push({ id: setId, name: setName, type: cfg.scheduleType });
  store.timetable ??= [];
  const duplicateIndex = store.timetable.findIndex((item) => item.setId === setId && item.day === day && item.period === period && item.subject === program.name);
  const timeRow = { ...row, id: Date.now() + 1, setId, seat: "", location: room };
  if (duplicateIndex >= 0) store.timetable[duplicateIndex] = timeRow;
  else store.timetable.push(timeRow);
  saveStore();
}

function programSetIdV26(type, program) {
  return `${type}-${program.id}`;
}

function periodTimeForV26(period) {
  const idx = Math.max(0, Number(String(period).replace(/\D/g, "")) - 1);
  return store.settings.timetableTimes?.[idx] || "";
}

function programDaysV26() {
  try {
    const days = typeof timetableDaysV15 === "function" ? timetableDaysV15() : [];
    if (Array.isArray(days) && days.length) return days;
  } catch (error) {}
  return ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
}

function programSlotChipsV26(type, program, rows) {
  const wrap = el("div", "program-slot-chips");
  if (!rows.length) wrap.append(el("span", "muted", "아직 배정된 슬롯이 없습니다."));
  rows.forEach((row) => {
    const chip = el("span", "program-slot-chip", `${row.day} [${row.period}] (${row.room || "장소 미정"})`);
    wrap.append(chip);
  });
  return wrap;
}

function programSchedulePreviewV26(type, program) {
  const cfg = programConfigV26(type);
  const rows = (store[cfg.schedules] || []).filter((row) => row.programId === program.id);
  const days = programDaysV26();
  const periods = Array.from({ length: Math.max(7, Number(store.settings.timetablePeriods || 8)) }, (_, i) => `${i + 1}교시`);
  const wrap = el("div", "program-timetable-preview");
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  hr.append(el("th", "", "교시"));
  days.forEach((day) => hr.append(el("th", "", day)));
  thead.append(hr);
  const tbody = document.createElement("tbody");
  periods.forEach((period) => {
    const tr = document.createElement("tr");
    tr.append(el("th", "", period));
    days.forEach((day) => {
      const cell = document.createElement("td");
      const hit = rows.find((row) => row.day === day && row.period === period);
      if (hit) cell.append(el("div", "program-time-pill", `${program.name}\n${hit.room || ""}`));
      else cell.textContent = "-";
      tr.append(cell);
    });
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}

ensureAppV26();

// Final V28: grouped sidebar, dashboard brand button, scoped report box, and refreshed floating shortcuts.
function ensureAppV28() {
  ensureAppV26();
  store.settings.navGroupCollapsed ??= {};
  store.settings.appVersion = "v28.0 - 2026-06-18";
  setupBrandDashboardV28();
  setupDashboardShortcutsV53();
}

function setupBrandDashboardV28() {
  const brand = document.querySelector(".brand");
  if (!brand || brand.dataset.dashboardReady === "1") return;
  brand.dataset.dashboardReady = "1";
  brand.role = "button";
  brand.tabIndex = 0;
  brand.title = "메인 대시보드로 이동";
  const go = () => renderPage("dashboard");
  brand.addEventListener("click", go);
  brand.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      go();
    }
  });
}

function setupDashboardShortcutsV53() {
  const goDashboard = () => {
    if (!currentUser || app?.classList.contains("hidden")) return;
    renderPage("dashboard");
  };
  const bindClickable = (node) => {
    if (!node || node.dataset.dashboardShortcutReady === "1") return;
    if (node.classList?.contains("brand") && node.dataset.dashboardReady === "1") return;
    node.dataset.dashboardShortcutReady = "1";
    node.role = "button";
    node.tabIndex = 0;
    node.title = "메인 대시보드로 이동";
    node.addEventListener("click", goDashboard);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goDashboard();
      }
    });
  };
  bindClickable(document.querySelector(".brand"));
  bindClickable(document.querySelector(".topbar > div"));
  if (menuToggle && menuToggle.dataset.sidebarToggleStopReady !== "1") {
    menuToggle.dataset.sidebarToggleStopReady = "1";
    menuToggle.addEventListener("click", (event) => event.stopPropagation());
  }
}

function navGroupsV28() {
  const groups = [
    { id: "home", label: "기본", keys: ["dashboard", "personal", "attendance", "requests"] },
    { id: "schedule", label: "일정/생활", keys: ["schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "mealApplications", "timetable"] },
    { id: "study", label: "학습 관리", keys: ["subjects", "teachers", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "portfolios"] },
    { id: "activity", label: "활동/프로젝트", keys: ["projects", "afterschool", "specialLectures", "clubs"] },
    { id: "admin", label: "관리자", keys: ["people", "friendAwards", "penalties", "budget", "site", "accounts", "admin", "system"] },
    { id: "print", label: "출력", keys: ["print"] }
  ];
  const available = new Set(navKeys());
  return groups.map((group) => ({ ...group, keys: group.keys.filter((key) => available.has(key)) })).filter((group) => group.keys.length);
}

function buildNav() {
  ensureAppV28();
  nav.replaceChildren();
  const groups = navGroupsV28();
  if (!groups.length) {
    const status = el("div", "nav-status", currentUser ? "권한 정보 로딩 중입니다. 잠시 후에도 메뉴가 보이지 않으면 다시 로그인해 주세요." : "로그인이 필요합니다.");
    nav.append(status);
    return;
  }
  groups.forEach((group) => {
    const collapsed = !!store.settings.navGroupCollapsed[group.id];
    const header = document.createElement("button");
    header.type = "button";
    header.className = "nav-group-toggle";
    header.dataset.group = group.id;
    header.innerHTML = `<span>${escapeHtml(group.label)}</span><b>${collapsed ? "+" : "-"}</b>`;
    header.addEventListener("click", () => {
      store.settings.navGroupCollapsed[group.id] = !collapsed;
      saveStore();
      buildNav();
    });
    nav.append(header);
    if (collapsed) return;
    group.keys.forEach((key) => appendNavButtonV28(key));
  });
}

function appendNavButtonV28(key) {
  const btn = document.createElement("button");
  btn.className = "nav-btn";
  btn.dataset.page = key;
  btn.append(el("span", "nav-icon", pageMeta[key]?.[0] || ""), el("span", "nav-text", pageLabel(key)));
  if (["afterschool", "specialLectures", "clubs"].includes(key)) {
    const chip = el("span", "nav-toggle-chip", store.settings.programNavCollapsed?.[key] ? "펼침" : "숨김");
    chip.title = "하위 목록 접기/펼치기";
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      store.settings.programNavCollapsed[key] = !store.settings.programNavCollapsed?.[key];
      saveStore();
      buildNav();
    });
    btn.append(chip);
  }
  if (key === "requests" && isAdmin() && pendingRequestCountV6()) btn.append(el("sup", "nav-badge", String(pendingRequestCountV6())));
  btn.addEventListener("click", () => renderPage(key));
  nav.append(btn);
  if (["afterschool", "specialLectures", "clubs"].includes(key) && !store.settings.programNavCollapsed?.[key] && !store.settings[programConfigV26(key).hide]) appendProgramNavV26(key);
}

function renderPage(key) {
  ensureAppV28();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "academic") renderAcademicV17();
  else if (key === "site") renderSiteV20();
  else if (key === "schoolNotices") renderSchoolNoticesV19();
  else if (key === "homeLetters") renderHomeLettersV18();
  else if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramListV26("afterschool");
  else if (key === "specialLectures") renderProgramListV26("specialLectures");
  else if (key === "clubs") renderProgramListV26("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV17();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV6();
  else if (key === "timetable") renderTimetableV6();
  else if (key === "print") renderPrintV7();
  else if (key === "admin") renderAdminV12();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);
  if (key === "requests") appendSystemReportBoxV28();
  appendVersionInfoV16();
}

function appendSystemReportBoxV28() {
  if (!currentUser || currentUser.role === "print") return;
  content.querySelector("#systemReportBox")?.remove();
  const box = panel("시스템 오류 제보");
  box.id = "systemReportBox";
  const grid = el("div", "form-grid");
  grid.append(
    makeSelectField("오류 발생 위치", "reportPage", reportPageOptionsV13(), pageLabel(currentPage)),
    makeSelectField("심각도", "reportSeverity", [["낮음", "낮음"], ["보통", "보통"], ["높음", "높음"], ["긴급", "긴급"]], "보통"),
    makeTextareaField("오류 내용", "reportContent", "")
  );
  const send = button("오류 제보 보내기");
  send.addEventListener("click", submitSystemReportV12);
  box.append(grid, send);
  content.append(box);
}

function appendSystemReportBoxV12() {
  if (currentPage === "requests") appendSystemReportBoxV28();
}

function appendVersionInfoV16(inSite = false) {
  content.querySelector("#versionInfoV16")?.remove();
  const info = el("div", "version-info");
  info.id = "versionInfoV16";
  info.append(el("strong", "", "버전 정보"), el("span", "", store.settings.appVersion || "v28.0"), el("span", "", "업데이트할 때마다 이 번호로 화면/기능 상태를 구별합니다."));
  content.append(info);
}

function ensureFloatingButtons() {
  let tools = document.getElementById("floatingTools");
  if (!tools) {
    tools = el("div", "floating-tools");
    tools.id = "floatingTools";
    document.body.append(tools);
  }
  tools.replaceChildren();
  const meal = button("", "float-btn meal-float");
  meal.title = "급식 빠른 보기";
  meal.setAttribute("aria-label", "급식 빠른 보기");
  meal.innerHTML = `<span class="float-icon fork-icon">╂</span>`;
  meal.addEventListener("click", () => showQuickPopup("meals"));
  const time = button("", "float-btn time-float");
  time.title = "시간표 빠른 보기";
  time.setAttribute("aria-label", "시간표 빠른 보기");
  time.innerHTML = `<span class="float-icon clock-icon">◷</span>`;
  time.addEventListener("click", () => showQuickPopup("timetable"));
  tools.append(meal, time);
}

ensureAppV28();

// Final V29: modern penalty console and timetable editor/download.
function ensureAppV29() {
  ensureAppV28();
  store.penalties ??= [];
  ensureTimetableStateV15();
  store.settings.appVersion = "v29.0 - 2026-06-18";
}

function renderPage(key) {
  ensureAppV29();
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "academic") renderAcademicV17();
  else if (key === "site") renderSiteV20();
  else if (key === "schoolNotices") renderSchoolNoticesV19();
  else if (key === "homeLetters") renderHomeLettersV18();
  else if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramListV26("afterschool");
  else if (key === "specialLectures") renderProgramListV26("specialLectures");
  else if (key === "clubs") renderProgramListV26("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV17();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV29();
  else if (key === "timetable") renderTimetableV29();
  else if (key === "print") renderPrintV8();
  else if (key === "admin") renderAdminV12();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);
  if (key === "requests") appendSystemReportBoxV28();
  if (key !== "print") appendVersionInfoV16();
}

function renderPenaltiesV29() {
  content.replaceChildren();
  const rows = filteredRowsV6("penalties");
  const totalCount = rows.length;
  const totalPoints = rows.reduce((sum, row) => sum + Math.abs(Number(row.points || 0)), 0);
  const topStudent = penaltyTopStudentV29(rows);
  const header = el("div", "penalty-hero");
  const copy = el("div", "");
  copy.append(el("h2", "", "원내 규율 상벌점 종합 관리 및 전산 원장"), el("p", "muted", "공동 일과 규칙 준수를 정량 반영하기 위해 벌점/상점 기록과 우수 성실 표창을 관리합니다."));
  const add = button("+ 상벌점 부과 및 표창 등록");
  add.disabled = !can("create", "penalties");
  add.addEventListener("click", () => openEditorV6("penalties"));
  header.append(copy, add);
  const stats = el("div", "penalty-stat-grid");
  const countCard = el("div", "penalty-stat-card");
  countCard.append(el("span", "", "총 상벌점 처리 건수"), el("strong", "", String(totalCount)), el("p", "muted", "원내 누적 경고/상점 관리 현황입니다."));
  const pointCard = el("div", "penalty-stat-card danger");
  pointCard.append(el("span", "", `${topStudent.name || "대상 없음"} 누적벌점`), el("strong", "", `${totalPoints}`), el("p", "", "1차 모니터링"));
  stats.append(countCard, pointCard);
  const search = el("div", "penalty-search-row");
  const input = document.createElement("input");
  input.placeholder = "대상 학생이름 또는 사유 기재 검색...";
  input.value = sessionStorage.getItem("penaltyModernSearch") || "";
  input.addEventListener("input", () => {
    sessionStorage.setItem("penaltyModernSearch", input.value);
    renderPenaltiesV29();
  });
  search.append(input);
  const filtered = penaltySearchRowsV29(rows, input.value);
  const table = penaltyTableV29(filtered);
  content.append(header, stats, search, table);
}

function penaltyTopStudentV29(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const name = row.student || row.name || row.title || "대상 미지정";
    map.set(name, (map.get(name) || 0) + Math.abs(Number(row.points || 0)));
  });
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0] ? { name: sorted[0][0], points: sorted[0][1] } : { name: "", points: 0 };
}

function penaltySearchRowsV29(rows, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

function penaltyTableV29(rows) {
  const wrap = el("div", "table-wrap penalty-modern-table");
  const table = document.createElement("table");
  const head = document.createElement("thead");
  const hr = document.createElement("tr");
  ["대상 학생", "처분 구분", "기준 일자", "점수", "상벌점 사유", "결재자", "관리"].forEach((text) => hr.append(el("th", "", text)));
  head.append(hr);
  const body = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const name = row.student || row.name || row.title || "대상 미지정";
    const point = Number(row.points || 0);
    tr.append(
      el("td", "", name),
      el("td", "", row.type || row.status || "벌점"),
      el("td", "", row.date || row.created_at || today),
      el("td", "", `${point > 0 ? "-" : ""}${Math.abs(point)} P`),
      el("td", "", row.reason || row.memo || row.content || ""),
      el("td", "", row.approver || row.teacher || currentUser?.name || ""),
      penaltyActionCellV29(row)
    );
    body.append(tr);
  });
  table.append(head, body);
  wrap.append(table);
  return wrap;
}

function penaltyActionCellV29(row) {
  const td = document.createElement("td");
  const edit = button("✎", "ghost small");
  edit.title = "수정";
  edit.addEventListener("click", () => openEditorV6("penalties", row.id));
  const del = button("⌫", "ghost small");
  del.title = "삭제";
  del.disabled = !can("del", "penalties");
  del.addEventListener("click", () => requirePassword(() => {
    markWorkspaceDeleted("penalties", row.id);
    store.penalties = (store.penalties || []).filter((item) => item.id !== row.id);
    saveStore();
    renderPenaltiesV29();
  }));
  td.append(edit, del);
  return td;
}

function renderTimetableV29() {
  ensureTimetableStateV15();
  content.replaceChildren();
  const section = panel("시간표");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const addSet = button("+ 시간표 추가");
  addSet.addEventListener("click", () => addTimetableSetV29());
  const download = button("시간표 일괄 다운", "ghost");
  download.addEventListener("click", downloadTimetableBulkV29);
  const addPeriod = button("+ 신규 교시 추가", "ghost");
  addPeriod.addEventListener("click", () => {
    const periods = timetablePeriodsV29();
    store.periodTimes = periods.map((row) => ({ ...row }));
    store.periodTimes.push({ period: `${periods.length + 1}교시`, start: "", end: "", time: "" });
    saveStore();
    renderTimetableV29();
  });
  actions.append(addSet, addPeriod, download);
  head.append(actions);
  if (!store.timetableSets.length) addTimetableSetV29("학교수업 시간표", false);
  const activeSet = activeTimetableSetV29();
  const toolbar = el("div", "toolbar timetable-toolbar modern-tt-toolbar");
  const selector = document.createElement("select");
  store.timetableSets.forEach((set) => selector.append(option(set.id, set.name)));
  selector.value = activeSet;
  selector.addEventListener("change", () => {
    sessionStorage.setItem("pm-timetable-set", selector.value);
    renderTimetableV29();
  });
  const rename = button("이름 수정", "ghost");
  rename.addEventListener("click", () => renameTimetableSetV29(activeSet));
  const clear = button("선택 시간표 비우기", "ghost");
  clear.addEventListener("click", () => requirePassword(() => {
    markWorkspaceDeletedRows("timetable", (store.timetable || []).filter((row) => (row.setId || "school") === activeSet));
    store.timetable = (store.timetable || []).filter((row) => (row.setId || "school") !== activeSet);
    saveStore();
    renderTimetableV29();
  }));
  toolbar.append(makeField("시간표 선택", "timetableSetSelectV29", selector), rename, clear);
  section.append(toolbar, periodEditorV29(), timetableGridV29(activeSet), manualTimetableFormV29(activeSet));
  content.append(section);
}

function activeTimetableSetV29() {
  const current = sessionStorage.getItem("pm-timetable-set") || store.timetableSets[0]?.id || "school";
  const exists = store.timetableSets.some((set) => set.id === current);
  const active = exists ? current : store.timetableSets[0]?.id || "school";
  sessionStorage.setItem("pm-timetable-set", active);
  return active;
}

function addTimetableSetV29(defaultName = "새 시간표", rerender = true) {
  store.timetableSets ??= [];
  const name = rerender ? prompt("시간표 이름", defaultName) : defaultName;
  if (!name) return;
  const id = `set-${Date.now()}`;
  store.timetableSets.push({ id, name, type: "사용자 등록" });
  sessionStorage.setItem("pm-timetable-set", id);
  saveStore();
  if (rerender) renderTimetableV29();
}

function renameTimetableSetV29(setId) {
  const set = store.timetableSets.find((item) => item.id === setId);
  if (!set) return;
  const next = prompt("시간표 이름 수정", set.name || "");
  if (!next) return;
  set.name = next;
  saveStore();
  renderTimetableV29();
}

function timetablePeriodsV29() {
  const saved = Array.isArray(store.periodTimes) ? store.periodTimes : [];
  const base = saved.length ? saved : timetablePeriodsV15();
  return base.map((row, index) => {
    const time = row.time || [row.start, row.end].filter(Boolean).join("-");
    const [start = "", end = ""] = String(time || "").split("-");
    return { period: row.period || `${index + 1}교시`, start: row.start || start.trim(), end: row.end || end.trim(), time: time || "" };
  });
}

function periodEditorV29() {
  const box = el("section", "modern-period-editor");
  const head = el("div", "period-editor-head");
  head.append(el("h3", "", "정기 수강 교시 및 매칭 시간 설정 통제"), button("+ 신규 교시 추가", "ghost"));
  head.querySelector("button").addEventListener("click", () => {
    const periods = timetablePeriodsV29();
    store.periodTimes = periods.map((row) => ({ ...row }));
    store.periodTimes.push({ period: `${periods.length + 1}교시`, start: "", end: "", time: "" });
    saveStore();
    renderTimetableV29();
  });
  const hint = el("p", "muted", "* 원내 표시할 교시의 한계를 직접 추가 설정합니다.");
  const grid = el("div", "period-card-grid");
  timetablePeriodsV29().forEach((row, index) => grid.append(periodCardV29(row, index)));
  const close = el("div", "period-editor-actions");
  const done = button("편집완료 후 닫기");
  done.addEventListener("click", () => showMessage("저장 완료", "교시 시간이 저장되었습니다."));
  close.append(done);
  box.append(head, hint, grid, close);
  return box;
}

function periodCardV29(row, index) {
  const card = el("article", "period-card");
  const top = el("div", "period-card-top");
  top.append(el("strong", "", `${index + 1}교시 설정`));
  const del = button("삭제", "ghost small");
  del.addEventListener("click", () => {
    store.periodTimes = timetablePeriodsV29().filter((_, i) => i !== index);
    saveStore();
    renderTimetableV29();
  });
  top.append(del);
  const start = document.createElement("input");
  start.type = "time";
  start.value = row.start || "";
  const end = document.createElement("input");
  end.type = "time";
  end.value = row.end || "";
  const persist = () => {
    store.periodTimes = timetablePeriodsV29();
    store.periodTimes[index] = { period: `${index + 1}교시`, start: start.value, end: end.value, time: `${start.value}-${end.value}` };
    (store.timetable || []).filter((item) => item.period === `${index + 1}교시`).forEach((item) => { item.time = `${start.value}-${end.value}`; });
    saveStore();
  };
  start.addEventListener("change", persist);
  end.addEventListener("change", persist);
  card.append(top, makeField("시작(IN)", `periodStart${index}`, start), makeField("종료(OUT)", `periodEnd${index}`, end));
  return card;
}

function timetableGridV29(setId) {
  const grid = el("div", "timetable-grid modern-timetable-grid");
  grid.append(makeTimeHead("교시/시간"), ...programDaysV26().map(makeTimeHead));
  timetablePeriodsV29().forEach((row) => {
    const timeText = [row.start, row.end].filter(Boolean).join(" ~ ") || row.time || "";
    const timeBox = el("div", "tt-time");
    timeBox.append(el("strong", "", row.period), el("span", "", timeText || "시간 미정"));
    grid.append(timeBox);
    programDaysV26().forEach((day) => grid.append(makeTimeCellV29(setId, day, row.period, timeText)));
  });
  return grid;
}

function makeTimeCellV29(setId, day, period, time) {
  const row = (store.timetable || []).find((item) => (item.setId || "school") === setId && item.day === day && item.period === period);
  const cell = el("div", row ? "tt-cell" : "tt-cell empty-cell");
  if (row) {
    cell.append(el("strong", "", row.subject || ""), el("span", "", row.teacher || ""), el("small", "", row.room || ""));
  } else cell.textContent = "-";
  cell.addEventListener("click", () => editTimeCellV15(setId, day, period, time, row));
  return cell;
}

function manualTimetableFormV29(setId) {
  const form = el("section", "manual-timetable-form");
  form.append(el("h3", "", "시간 지정 수동 교과과정 배정서"));
  const grid = el("div", "form-grid");
  const day = document.createElement("select");
  programDaysV26().forEach((value) => day.append(option(value, value)));
  const period = document.createElement("select");
  timetablePeriodsV29().forEach((row) => period.append(option(row.period, `${row.period} (${[row.start, row.end].filter(Boolean).join(" ~ ") || row.time || "시간 미정"})`)));
  const subject = document.createElement("select");
  subjectsList().forEach((value) => subject.append(option(value, value)));
  const teacher = document.createElement("select");
  teachersList().forEach((value) => teacher.append(option(value, value)));
  const room = document.createElement("input");
  room.placeholder = "302호";
  const start = document.createElement("input");
  start.type = "time";
  const end = document.createElement("input");
  end.type = "time";
  const syncTime = () => {
    const row = timetablePeriodsV29().find((item) => item.period === period.value);
    start.value = row?.start || "";
    end.value = row?.end || "";
  };
  period.addEventListener("change", syncTime);
  syncTime();
  grid.append(
    makeField("배정 요일 *", "manualDayV29", day),
    makeField("해당 이수 교시 *", "manualPeriodV29", period),
    makeField("배치 수강과목 *", "manualSubjectV29", subject),
    makeField("강의실 호실", "manualRoomV29", room),
    makeField("강의 전임 교사 *", "manualTeacherV29", teacher),
    makeField("시작 시간", "manualStartV29", start),
    makeField("종료 시간", "manualEndV29", end)
  );
  const actions = el("div", "row-actions manual-actions");
  const cancel = button("취소", "ghost");
  cancel.addEventListener("click", () => renderTimetableV29());
  const save = button("시간표 등록 완료");
  save.addEventListener("click", () => {
    const time = [start.value, end.value].filter(Boolean).join("-");
    const row = { id: Date.now(), setId, day: day.value, period: period.value, time, subject: subject.value, teacher: teacher.value, room: room.value };
    const idx = (store.timetable || []).findIndex((item) => (item.setId || "school") === setId && item.day === row.day && item.period === row.period);
    if (idx >= 0) store.timetable[idx] = row;
    else store.timetable.push(row);
    saveStore();
    renderTimetableV29();
  });
  actions.append(cancel, save);
  form.append(grid, actions);
  return form;
}

function downloadTimetableBulkV29() {
  const rows = [];
  (store.timetableSets || []).forEach((set) => {
    (store.timetable || []).filter((row) => (row.setId || "school") === set.id).forEach((row) => rows.push({ set: set.name, day: row.day, period: row.period, time: row.time, subject: row.subject, teacher: row.teacher, room: row.room, seat: row.seat || "" }));
  });
  const reportCss = typeof reportCssV8 === "function" ? reportCssV8() : "";
  const html = `<!doctype html><meta charset="utf-8"><title>시간표 일괄 다운로드</title><style>${reportCss}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d8e3f2;padding:8px}</style><h1>시간표 일괄 다운로드</h1><p>생성일 ${today}</p><table><thead><tr><th>시간표</th><th>요일</th><th>교시</th><th>시간</th><th>과목</th><th>교사</th><th>강의실</th><th>좌석</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.set)}</td><td>${escapeHtml(row.day)}</td><td>${escapeHtml(row.period)}</td><td>${escapeHtml(row.time || "")}</td><td>${escapeHtml(row.subject || "")}</td><td>${escapeHtml(row.teacher || "")}</td><td>${escapeHtml(row.room || "")}</td><td>${escapeHtml(row.seat || "")}</td></tr>`).join("")}</tbody></table>`;
  exportCsv(`시간표_일괄다운로드_${today}.html`, html);
}

ensureAppV29();

// Final V30: dashboard card sizing and site-only system notice settings.
function ensureAppV30() {
  ensureAppV29();
  store.settings.systemNoticeEnabled ??= true;
  store.settings.appVersion = "v30.0 - 2026-06-18";
}

function renderSiteV20() {
  renderSiteV19();
  content.querySelector("#systemNoticeSiteBoxV30")?.remove();
  const noticeBox = panel("시스템 공지 설정");
  noticeBox.id = "systemNoticeSiteBoxV30";
  const grid = el("div", "form-grid site-auto-grid");
  const toggle = document.createElement("select");
  toggle.id = "systemNoticeToggle";
  [["on", "시스템 공지 활성"], ["off", "시스템 공지 비활성"]].forEach(([value, text]) => toggle.append(option(value, text)));
  toggle.value = store.settings.systemNoticeEnabled === false ? "off" : "on";
  const text = document.createElement("textarea");
  text.id = "systemNoticeInputV30";
  text.value = store.settings.systemNotice || "";
  const save = button("시스템 공지 저장");
  save.addEventListener("click", () => {
    store.settings.systemNoticeEnabled = toggle.value === "on";
    store.settings.systemNotice = text.value;
    saveStore();
    showMessage("저장 완료", "시스템 공지 설정을 홈페이지 관리에 저장했습니다.");
    renderSiteV20();
  });
  grid.append(makeField("시스템 공지 활성", "systemNoticeToggleWrapV30", toggle), makeField("시스템 공지 내용", "systemNoticeInputWrapV30", text));
  noticeBox.append(grid, save);
  const firstVersion = content.querySelector("#versionInfoV16");
  if (firstVersion) content.insertBefore(noticeBox, firstVersion);
  else content.append(noticeBox);

  if (!document.getElementById("academicSiteBox")) {
    const box = panel("학사일정 연동");
    box.id = "academicSiteBox";
    box.append(makeTextField("행사 및 일정 URL", "siteAcademicCalendarUrl", store.settings.academicCalendarUrl || ""), makeTextField("연간 학사 일정 URL", "siteAcademicAnnualUrl", store.settings.academicAnnualUrl || ""));
    const saveAcademic = button("학사일정 URL 저장", "ghost");
    saveAcademic.addEventListener("click", () => {
      store.settings.academicCalendarUrl = document.getElementById("siteAcademicCalendarUrl").value.trim();
      store.settings.academicAnnualUrl = document.getElementById("siteAcademicAnnualUrl").value.trim();
      saveStore();
      showMessage("저장 완료", "학사일정 URL을 저장했습니다.");
    });
    box.append(saveAcademic, el("p", "muted", "동아고 행사 및 일정/연간 학사 일정 URL이 기본으로 들어가 있습니다."));
    content.append(box);
  }
}

function renderAdminV12() {
  renderAdminV6();
  content.querySelector("#adminNoticeState")?.closest("label")?.remove();
  [...content.querySelectorAll("label")].forEach((label) => {
    if ((label.textContent || "").includes("공지 상태")) label.remove();
  });
}

ensureAppV30();

// Final V31: invite-only email authentication service layer.
const AUTH_KEY_V31 = "pm-auth-v31";
const ROLE_KEYS_V31 = ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"];

function roleDefinitionsV31() {
  return {
    super_manager: { label: "최고 관리자", canInvite: ROLE_KEYS_V31, sensitive: true },
    manager: { label: "관리자", canInvite: ["teacher", "normal", "viewer", "print_account"], sensitive: true },
    teacher: { label: "선생님", canInvite: [], sensitive: false },
    normal: { label: "일반 사용자", canInvite: [], sensitive: false },
    viewer: { label: "열람 전용", canInvite: [], sensitive: false },
    print_account: { label: "프린트 전용", canInvite: [], sensitive: false }
  };
}

function defaultRoleMenusV31() {
  return {
    super_manager: ["dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "mealApplications", "timetable", "subjects", "teachers", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "portfolios", "projects", "afterschool", "specialLectures", "clubs", "people", "friendAwards", "penalties", "budget", "site", "accounts", "admin", "system", "print"],
    manager: ["dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "mealApplications", "timetable", "subjects", "teachers", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "portfolios", "projects", "afterschool", "specialLectures", "clubs", "penalties", "budget", "site", "accounts", "admin", "print"],
    teacher: ["dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "meals", "timetable", "subjects", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "projects", "afterschool", "specialLectures", "clubs"],
    normal: ["dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "meals", "mealApplications", "timetable", "materials", "assignments", "examSchedules", "exams", "records", "projects", "portfolios", "afterschool", "specialLectures", "clubs"],
    viewer: ["dashboard", "personal", "requests", "schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "timetable", "materials", "examSchedules", "records", "projects", "portfolios"],
    print_account: ["print", "examSchedules"]
  };
}

function defaultActionPermissionsV31() {
  const menus = defaultRoleMenusV31();
  const readOnly = {};
  Object.keys(pageMeta).forEach((key) => {
    readOnly[key] = { view: ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"].filter((role) => menus[role]?.includes(key)), create: [], edit: [], del: [] };
  });
  const writeByRole = {
    super_manager: ["*"],
    manager: ["*"],
    teacher: ["attendance", "schedules", "notices", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "projects", "afterschool", "specialLectures", "clubs", "timetable"],
    normal: ["attendance", "schedules", "notices", "mealApplications", "assignments", "exams", "records", "lessons", "projects", "portfolios", "timetable"],
    viewer: [],
    print_account: []
  };
  Object.keys(readOnly).forEach((key) => {
    ROLE_KEYS_V31.forEach((role) => {
      const canWrite = writeByRole[role]?.includes("*") || writeByRole[role]?.includes(key);
      if (canWrite) {
        readOnly[key].create.push(role);
        readOnly[key].edit.push(role);
      }
      if (role === "super_manager" || role === "manager") readOnly[key].del.push(role);
    });
  });
  return readOnly;
}

function defaultAuthStateV31() {
  return {
    version: 31,
    auth: { currentUserId: null, sessionStartedAt: null },
    users: [],
    roles: roleDefinitionsV31(),
    permissions: defaultActionPermissionsV31(),
    invitations: []
  };
}

function legacyDemoSuperEmailV77() {
  return ["super", "example.com"].join("@");
}

const LEGACY_DEMO_EMAILS_V31 = new Set([
  ["admin", "example.com"].join("@"),
  ["user", "example.com"].join("@"),
  ["print", "example.com"].join("@"),
  legacyDemoSuperEmailV77()
]);

function removeLegacyDemoAccountsV31(state) {
  if (!state || typeof state !== "object") return state;
  state.users = Array.isArray(state.users) ? state.users : [];
  const removedUserIds = new Set();
  state.users = state.users.filter((user) => {
    const shouldRemove = LEGACY_DEMO_EMAILS_V31.has(String(user.email || "").toLowerCase());
    if (shouldRemove) {
      if (user.id) removedUserIds.add(user.id);
      if (user.uid) removedUserIds.add(user.uid);
    }
    return !shouldRemove;
  });
  if (state.auth && removedUserIds.has(state.auth.currentUserId)) {
    state.auth.currentUserId = null;
    state.auth.sessionStartedAt = null;
  }
  return state;
}

function ensureDefaultSuperAccountV38(state) {
  return removeLegacyDemoAccountsV31(state);
}

function loadAuthStateV31() {
  try {
    const saved = window.PMAuthService?.loadAuthState
      ? window.PMAuthService.loadAuthState()
      : JSON.parse(localStorage.getItem(AUTH_KEY_V31) || "null");
    if (!saved) return defaultAuthStateV31();
    const base = defaultAuthStateV31();
    return ensureDefaultSuperAccountV38({
      ...base,
      ...saved,
      auth: { ...base.auth, ...(saved.auth || {}) },
      roles: { ...base.roles, ...(saved.roles || {}) },
      permissions: { ...base.permissions, ...(saved.permissions || {}) },
      users: Array.isArray(saved.users) ? saved.users : base.users,
      invitations: Array.isArray(saved.invitations) ? saved.invitations : []
    });
  } catch (error) {
    return ensureDefaultSuperAccountV38(defaultAuthStateV31());
  }
}

let authStateV31 = loadAuthStateV31();

function saveAuthStateV31() {
  if (window.PMAuthService?.saveAuthState) {
    authStateV31 = window.PMAuthService.saveAuthState(authStateV31);
    return;
  }
  localStorage.setItem(AUTH_KEY_V31, JSON.stringify(authStateV31));
}

function normalizeLegacyRoleV31(role) {
  return { admin: "manager", user: "normal", print: "print_account" }[role] || role || "normal";
}

function syncLegacyAccountsV31() {
  removeLegacyDemoAccountsV31(authStateV31);
  saveAuthStateV31();
}

function authUserToLegacyV31(user) {
  return {
    id: user.id,
    uid: user.id,
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    pin: user.pin || "1234",
    active: user.active,
    emailVerified: user.emailVerified,
    permissions: user.permissions || {}
  };
}

function authCurrentUserV31() {
  return authStateV31.users.find((user) => user.id === authStateV31.auth.currentUserId) || null;
}

function authCanManageUsersV31() {
  return ["super_manager", "manager"].includes(currentUser?.role);
}

function authCanInviteRoleV31(role) {
  const me = authCurrentUserV31();
  if (!me) return false;
  return (authStateV31.roles[me.role]?.canInvite || []).includes(role);
}

function authMenuKeysV31(user = authCurrentUserV31()) {
  const target = user || currentUser;
  if (!target) return [];
  if (target.active === false || target.disabled === true) return [];
  if (!target.role) return ["dashboard"];
  if (target.emailVerified === false && target.provider !== "firebase") return ["dashboard", "personal"];
  user = target;
  if (Array.isArray(user.menuOverrides) && user.menuOverrides.length) return user.menuOverrides;
  return defaultRoleMenusV31()[user.role] || [];
}

function navKeys() {
  ensureAppV31();
  return authMenuKeysV31().filter((key) => pageMeta[key] || key === "schoolNotices" || key === "homeLetters" || key === "academic" || key === "mealApplications" || key === "afterschool" || key === "specialLectures");
}

function can(action, key) {
  const user = authCurrentUserV31() || currentUser;
  if (!user || user.active === false || user.disabled === true || !user.role) return false;
  if (key === "notices" && action === "create") return ["system_owner", "super_manager", "manager", "teacher", "normal"].includes(user.role);
  if (!authMenuKeysV31(user).includes(key) && action === "view") return false;
  const perm = authStateV31.permissions[key] || {};
  if (action === "view") return (perm.view || []).includes(user.role) || authMenuKeysV31(user).includes(key);
  if (user.extraPermissions?.[`${key}:${action}`] === true) return true;
  return (perm[action] || []).includes(user.role);
}

function isAdmin() {
  return ["super_manager", "manager"].includes(currentUser?.role);
}

function roleName(role) {
  return roleDefinitionsV31()[role]?.label || { admin: "관리자", user: "일반 사용자", print: "프린트 전용" }[role] || role;
}

function updateGreeting() {
  if (!currentUser) return;
  const name = currentUser.name || "";
  if (currentUser.role === "super_manager") roleLabel.textContent = `${name} 최고관리자님 어서오십시오.`;
  else if (currentUser.role === "manager") roleLabel.textContent = `${name} 관리자님 어서오십시오.`;
  else if (currentUser.role === "print_account") roleLabel.textContent = `${name} 프린트 전용계정입니다.`;
  else roleLabel.textContent = `${name} 사용자님 어서오십시오.`;
}

function onLogin(event) {
  event.preventDefault();
  ensureAppV31();
  const targetEmail = email.value.trim().toLowerCase();
  const user = authStateV31.users.find((item) => item.email.toLowerCase() === targetEmail && item.password === password.value);
  if (!user) {
    loginError.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
    return;
  }
  if (!user.active) {
    loginError.textContent = "비활성화된 계정입니다. 관리자에게 문의하세요.";
    return;
  }
  if (!user.emailVerified) {
    loginError.textContent = "이메일 인증 전에는 로그인할 수 없습니다. 초대 링크에서 인증을 완료하세요.";
    return;
  }
  user.lastLoginAt = new Date().toISOString();
  authStateV31.auth.currentUserId = user.id;
  authStateV31.auth.sessionStartedAt = new Date().toISOString();
  saveAuthStateV31();
  currentUser = authUserToLegacyV31(user);
  sessionStorage.setItem("pm-current-user", user.id);
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  updateGreeting();
  buildNav();
  renderPage(user.role === "print_account" ? "print" : "dashboard");
}

function restoreSession() {
  ensureAppV31();
  const saved = sessionStorage.getItem("pm-current-user") || authStateV31.auth.currentUserId;
  const user = authStateV31.users.find((item) => item.id === saved || item.email === saved);
  if (!user || !user.active || !user.emailVerified) return;
  currentUser = authUserToLegacyV31(user);
  authStateV31.auth.currentUserId = user.id;
  saveAuthStateV31();
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  updateGreeting();
  buildNav();
  renderPage(user.role === "print_account" ? "print" : "dashboard");
}

function logout() {
  authStateV31.auth.currentUserId = null;
  saveAuthStateV31();
  currentUser = null;
  sessionStorage.removeItem("pm-current-user");
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
  renderInviteFromUrlV31();
}

function setupAuthUiV31() {
  const demo = document.querySelector(".demo-accounts");
  if (demo) {
    demo.innerHTML = `<p class="muted invite-only-note">계정은 관리자 초대 또는 초대코드로 등록합니다.</p>`;
  }
  const emailInput = document.getElementById("email");
  if (emailInput) emailInput.placeholder = "email@example.com";
  const passwordInput = document.getElementById("password");
  if (passwordInput) passwordInput.placeholder = "비밀번호";
}

function renderInviteFromUrlV31() {
  const params = new URLSearchParams(location.search);
  const token = params.get("invite");
  if (!token) return;
  const invite = authStateV31.invitations.find((item) => item.token === token);
  loginScreen.classList.remove("hidden");
  app.classList.add("hidden");
  const panel = loginScreen.querySelector(".login-panel");
  if (!panel) return;
  if (!invite || invite.usedAt || Date.now() > Number(invite.expiresAt)) {
    if (invite && Date.now() > Number(invite.expiresAt)) invite.status = "expired";
    saveAuthStateV31();
    panel.innerHTML = `<div><p class="eyebrow">Invitation</p><h1>초대 링크 만료</h1><p class="muted">초대 링크가 없거나 만료되었습니다. 관리자에게 새 초대를 요청하세요.</p></div>`;
    return;
  }
  panel.innerHTML = `
    <div>
      <p class="eyebrow">Invite Only Registration</p>
      <h1>초대 가입</h1>
      <p class="muted">${escapeHtml(invite.name)}님, ${escapeHtml(roleName(invite.role))} 역할로 초대되었습니다.</p>
    </div>
    <form id="inviteAcceptForm" class="login-form">
      <label>이메일<input id="inviteEmail" type="email" value="${escapeHtml(invite.email)}" readonly /></label>
      <label>비밀번호 설정<input id="invitePassword" type="password" required minlength="6" /></label>
      <label>비밀번호 확인<input id="invitePassword2" type="password" required minlength="6" /></label>
      <label class="inline-filter"><input id="inviteEmailVerified" type="checkbox" /> 이메일 인증 완료</label>
      <button type="submit">가입 완료</button>
      <p id="inviteError" class="error"></p>
    </form>
  `;
  document.getElementById("inviteAcceptForm").addEventListener("submit", (event) => acceptInviteV31(event, invite));
}

function acceptInviteV31(event, invite) {
  event.preventDefault();
  const pw1 = document.getElementById("invitePassword").value;
  const pw2 = document.getElementById("invitePassword2").value;
  const verified = document.getElementById("inviteEmailVerified").checked;
  const error = document.getElementById("inviteError");
  if (pw1 !== pw2) return error.textContent = "비밀번호 확인이 일치하지 않습니다.";
  if (!verified) return error.textContent = "이메일 인증 완료 체크 후 가입할 수 있습니다.";
  if (authStateV31.users.some((user) => user.email.toLowerCase() === invite.email.toLowerCase())) return error.textContent = "이미 가입된 이메일입니다.";
  const user = {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: invite.name,
    email: invite.email,
    password: pw1,
    role: invite.role,
    active: true,
    emailVerified: true,
    status: "active",
    createdAt: new Date().toISOString(),
    lastLoginAt: "",
    menuOverrides: null,
    extraPermissions: {}
  };
  authStateV31.users.push(user);
  invite.status = "completed";
  invite.usedAt = new Date().toISOString();
  saveAuthStateV31();
  history.replaceState(null, "", location.pathname);
  showMessage("가입 완료", "이메일 인증과 비밀번호 설정이 완료되었습니다. 이제 로그인하세요.");
  location.reload();
}

function createInvitationV31({ name, email, role }) {
  if (!authCanInviteRoleV31(role)) throw new Error("현재 계정은 해당 역할을 초대할 수 없습니다.");
  const token = `inv-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 3;
  const invite = {
    id: `invite-${Date.now()}`,
    name,
    email,
    role,
    token,
    expiresAt,
    status: "invited",
    invitedBy: currentUser?.uid || currentUser?.id || "",
    invitedAt: new Date().toISOString(),
    usedAt: ""
  };
  authStateV31.invitations.unshift(invite);
  saveAuthStateV31();
  return invite;
}

function invitationLinkV31(invite) {
  return `${location.origin}${location.pathname}?invite=${encodeURIComponent(invite.token)}`;
}

function renderAccountsV17() {
  ensureAppV31();
  content.replaceChildren();
  if (!authCanManageUsersV31()) {
    content.append(el("div", "empty", "사용자 관리 권한이 없습니다."));
    return;
  }
  refreshInvitationStatusesV31();
  const section = panel("사용자 관리");
  const head = section.querySelector(".panel-head");
  head.append(el("p", "muted", "초대 기반 가입, 역할 변경, 활성화/비활성화, 메뉴 접근 권한을 관리합니다."));
  const invitePanel = panel("사용자 초대");
  invitePanel.classList.add("sub-panel");
  const inviteGrid = el("div", "form-grid");
  const name = document.createElement("input");
  const mail = document.createElement("input");
  mail.type = "email";
  const role = document.createElement("select");
  ROLE_KEYS_V31.filter(authCanInviteRoleV31).forEach((key) => role.append(option(key, roleName(key))));
  const inviteBtn = button("초대 링크 생성");
  const linkBox = document.createElement("textarea");
  linkBox.readOnly = true;
  inviteBtn.addEventListener("click", () => {
    try {
      if (!mail.value.includes("@")) throw new Error("이메일을 올바르게 입력하세요.");
      const invite = createInvitationV31({ name: name.value || mail.value.split("@")[0], email: mail.value.trim(), role: role.value });
      linkBox.value = invitationLinkV31(invite);
      renderAccountsV17();
      showMessage("초대 생성 완료", "초대 링크가 생성되었습니다. 링크를 사용자에게 전달하세요.");
    } catch (error) {
      showMessage("초대 실패", error.message);
    }
  });
  inviteGrid.append(makeField("사용자 이름", "inviteNameV31", name), makeField("이메일", "inviteEmailV31", mail), makeField("역할", "inviteRoleV31", role), inviteBtn, makeField("초대 링크", "inviteLinkV31", linkBox));
  invitePanel.append(inviteGrid);
  section.append(invitePanel, usersTableV31(), invitationsTableV31());
  content.append(section);
}

function refreshInvitationStatusesV31() {
  authStateV31.invitations.forEach((invite) => {
    if (invite.status === "invited" && Date.now() > Number(invite.expiresAt)) invite.status = "expired";
  });
  saveAuthStateV31();
}

function usersTableV31() {
  const wrap = el("div", "table-wrap auth-table");
  const table = document.createElement("table");
  table.innerHTML = `<thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>상태</th><th>이메일 인증</th><th>마지막 로그인</th><th>메뉴 접근</th><th>관리</th></tr></thead>`;
  const body = document.createElement("tbody");
  authStateV31.users.forEach((user) => {
    const tr = document.createElement("tr");
    const role = document.createElement("select");
    const editableRoleKeys = currentUser?.role === "super_manager"
      ? ROLE_KEYS_V31
      : ROLE_KEYS_V31.filter((key) => !["super_manager", "manager"].includes(key));
    const visibleRoleKeys = editableRoleKeys.includes(user.role) ? editableRoleKeys : [user.role, ...editableRoleKeys];
    visibleRoleKeys.forEach((key) => role.append(option(key, roleName(key))));
    role.value = user.role;
    role.disabled = !canModifyUserV31(user) || (user.role === "super_manager" && !["system_owner", "super_manager"].includes(currentUser?.role));
    role.addEventListener("change", () => {
      if (!canModifyUserV31(user)) return;
      if (currentUser?.role !== "super_manager" && ["super_manager", "manager"].includes(role.value)) {
        role.value = user.role;
        return;
      }
      user.role = role.value;
      user.menuOverrides = null;
      saveAuthStateV31();
      renderAccountsV17();
    });
    const active = document.createElement("input");
    active.type = "checkbox";
    active.checked = !!user.active;
    active.disabled = !canModifyUserV31(user) || user.id === currentUser?.uid;
    active.addEventListener("change", () => { user.active = active.checked; saveAuthStateV31(); });
    const menu = document.createElement("select");
    menu.multiple = true;
    menu.size = 4;
    Object.keys(pageMeta).forEach((key) => menu.append(option(key, pageLabel(key))));
    [...menu.options].forEach((opt) => { opt.selected = authMenuKeysV31(user).includes(opt.value); });
    menu.disabled = !canModifyUserV31(user);
    menu.addEventListener("change", () => {
      user.menuOverrides = [...menu.selectedOptions].map((opt) => opt.value);
      saveAuthStateV31();
    });
    const reset = button("재설정", "ghost small");
    reset.disabled = !canModifyUserV31(user);
    reset.addEventListener("click", () => {
      const next = prompt("새 임시 비밀번호", "temp1234");
      if (!next) return;
      user.password = next;
      user.passwordResetRequested = false;
      saveAuthStateV31();
      showMessage("비밀번호 재설정", `${user.email} 임시 비밀번호가 변경되었습니다.`);
    });
    const del = button("비활성", "ghost small");
    del.disabled = !canModifyUserV31(user) || user.id === currentUser?.uid;
    del.addEventListener("click", () => { user.active = false; user.status = "disabled"; saveAuthStateV31(); renderAccountsV17(); });
    tr.append(el("td", "", user.name), el("td", "", user.email), tableCellNodeV31(role), tableCellNodeV31(active), el("td", "", user.emailVerified ? "인증 완료" : "미인증"), el("td", "", user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "-"), tableCellNodeV31(menu), tableCellNodeV31(el("div", "row-actions", "")));
    tr.lastChild.append(reset, del);
    body.append(tr);
  });
  table.append(body);
  wrap.append(el("h3", "", "사용자 목록"), table);
  return wrap;
}

function tableCellNodeV31(node) {
  const td = document.createElement("td");
  td.append(node);
  return td;
}

function canModifyUserV31(user) {
  const me = authCurrentUserV31();
  if (!me) return false;
  if (me.role === "system_owner") return user.role !== "system_owner";
  if (me.role === "super_manager") return true;
  if (me.role === "manager") return !["super_manager", "manager"].includes(user.role);
  return false;
}

function invitationsTableV31() {
  const wrap = el("div", "table-wrap auth-table");
  const table = document.createElement("table");
  table.innerHTML = `<thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>상태</th><th>만료 시간</th><th>초대 링크</th></tr></thead>`;
  const body = document.createElement("tbody");
  authStateV31.invitations.forEach((invite) => {
    const link = invitationLinkV31(invite);
    const copy = button("복사", "ghost small");
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(link); showMessage("복사 완료", "초대 링크를 복사했습니다."); }
      catch { showMessage("초대 링크", link); }
    });
    const tr = document.createElement("tr");
    tr.append(el("td", "", invite.name), el("td", "", invite.email), el("td", "", roleName(invite.role)), el("td", "", invite.status === "completed" ? "가입 완료" : invite.status === "expired" ? "만료됨" : "초대됨"), el("td", "", new Date(Number(invite.expiresAt)).toLocaleString()), tableCellNodeV31(copy));
    body.append(tr);
  });
  table.append(body);
  wrap.append(el("h3", "", "초대 상태"), table);
  return wrap;
}

function ensureAppV31() {
  ensureAppV30();
  syncLegacyAccountsV31();
  ensureLessonPermissionsV48();
  setupAuthUiV31();
  renderInviteFromUrlV31();
  store.settings.appVersion = "v31.0 - 2026-06-18";
}

function ensureLessonPermissionsV48() {
  authStateV31.permissions = authStateV31.permissions || defaultActionPermissionsV31();
  authStateV31.permissions.lessons = authStateV31.permissions.lessons || { view: [], create: [], edit: [], del: [] };
  ["view", "create", "edit"].forEach((action) => {
    authStateV31.permissions.lessons[action] = Array.isArray(authStateV31.permissions.lessons[action])
      ? authStateV31.permissions.lessons[action]
      : [];
    ["super_manager", "manager", "teacher", "normal"].forEach((role) => {
      if (!authStateV31.permissions.lessons[action].includes(role)) authStateV31.permissions.lessons[action].push(role);
    });
  });
  authStateV31.permissions.lessons.del = Array.isArray(authStateV31.permissions.lessons.del)
    ? authStateV31.permissions.lessons.del
    : [];
  ["super_manager", "manager"].forEach((role) => {
    if (!authStateV31.permissions.lessons.del.includes(role)) authStateV31.permissions.lessons.del.push(role);
  });
  saveAuthStateV31();
}

ensureAppV31();

// Final V31.1: robust boot patch for invite-only auth UI.
window.__pmBootErrors = window.__pmBootErrors || [];
window.addEventListener("error", (event) => {
  window.__pmBootErrors.push(String(event.message || event.error || "unknown error"));
});

function bootAuthV31Safe() {
  try {
    authStateV31 = loadAuthStateV31();
    authStateV31 = ensureDefaultSuperAccountV38(authStateV31);
    saveAuthStateV31();
    syncLegacyAccountsV31();
    setupAuthUiV31();
    renderInviteFromUrlV31();
    if (!currentUser) {
      const saved = sessionStorage.getItem("pm-current-user") || authStateV31.auth.currentUserId;
      const user = authStateV31.users.find((item) => item.id === saved);
      if (user && user.active && user.emailVerified) {
        currentUser = authUserToLegacyV31(user);
        loginScreen.classList.add("hidden");
        app.classList.remove("hidden");
        updateGreeting();
        buildNav();
        renderPage(user.role === "print_account" ? "print" : "dashboard");
      }
    }
  } catch (error) {
    window.__pmBootErrors.push(String(error?.message || error));
  }
}

bootAuthV31Safe();
setTimeout(bootAuthV31Safe, 0);

// Final V31.2: defer the original app initialization until auth services exist.
if (!window.__pmInitV31Done) {
  window.__pmInitV31Done = true;
  try {
    init();
    bootAuthV31Safe();
  } catch (error) {
    window.__pmBootErrors.push(String(error?.message || error));
  }
}

// Final V32: integration-ready service/shared layer.
function ensureIntegrationReadyV32() {
  const workspaceId = window.PMDataService?.currentWorkspaceId?.() || store.workspace_id || "personal-local";
  store.workspace_id = store.workspace_id || workspaceId;
  store.schema_version = store.schema_version || 1;
  store.integration = {
    ...(store.integration || {}),
    mode: "prepared",
    auth_provider: "local-invite",
    data_provider: window.PMDataService?.mode || "local",
    workspace_id: store.workspace_id,
    external_links_policy: "no-user-id-email-token-in-url"
  };
  authStateV31.workspace_id = authStateV31.workspace_id || store.workspace_id;
  authStateV31.schema_version = authStateV31.schema_version || 1;
  authStateV31.auth_provider = authStateV31.auth_provider || "local-invite";
  authStateV31.users.forEach((user) => {
    user.workspace_id = user.workspace_id || store.workspace_id;
    user.role = window.PMShared?.roles?.normalizeRole?.(user.role) || user.role;
  });
  saveStore();
  saveAuthStateV31();
}

function roleDefinitionsV31() {
  const sharedRoles = window.PMShared?.roles?.roles;
  if (sharedRoles) {
    return {
      super_manager: { label: "최고 관리자", canInvite: sharedRoles.super_manager.canInvite },
      manager: { label: "관리자", canInvite: sharedRoles.manager.canInvite },
      teacher: { label: "선생님", canInvite: sharedRoles.teacher.canInvite },
      normal: { label: "일반 사용자", canInvite: sharedRoles.normal.canInvite },
      viewer: { label: "열람 전용", canInvite: sharedRoles.viewer.canInvite },
      print_account: { label: "프린트 전용", canInvite: sharedRoles.print_account.canInvite }
    };
  }
  return {
    super_manager: { label: "최고 관리자", canInvite: ["manager", "teacher", "normal", "viewer", "print_account"] },
    manager: { label: "관리자", canInvite: ["teacher", "normal", "viewer", "print_account"] },
    teacher: { label: "선생님", canInvite: [] },
    normal: { label: "일반 사용자", canInvite: [] },
    viewer: { label: "열람 전용", canInvite: [] },
    print_account: { label: "프린트 전용", canInvite: [] }
  };
}

function defaultRoleMenusV31() {
  return window.PMShared?.permissions?.defaultRoleMenus || {
    super_manager: ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "people", "friendAwards", "timetable", "print", "site", "admin", "requests", "meals", "budget", "clubs", "attendance", "accounts", "examSchedules", "records", "lessons", "projects", "system", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    manager: ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "penalties", "people", "friendAwards", "timetable", "print", "site", "admin", "requests", "meals", "budget", "clubs", "attendance", "accounts", "examSchedules", "records", "lessons", "projects", "system", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    teacher: ["dashboard", "personal", "schedules", "notices", "subjects", "teachers", "materials", "assignments", "exams", "portfolios", "timetable", "requests", "meals", "clubs", "attendance", "examSchedules", "records", "lessons", "projects", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    normal: ["dashboard", "personal", "schedules", "notices", "subjects", "materials", "assignments", "exams", "portfolios", "timetable", "requests", "meals", "attendance", "examSchedules", "records", "lessons", "projects", "mealApplications", "afterschool", "academic", "specialLectures", "homeLetters", "schoolNotices"],
    viewer: ["dashboard", "personal", "schedules", "notices", "subjects", "materials", "assignments", "exams", "portfolios", "timetable", "meals", "examSchedules", "records", "lessons", "projects", "mealApplications", "academic", "homeLetters", "schoolNotices"],
    print_account: ["print", "examSchedules"]
  };
}

function authCanInviteRoleV31(role) {
  const me = authCurrentUserV31();
  if (!me) return false;
  return window.PMShared?.roles?.canInviteRole
    ? window.PMShared.roles.canInviteRole(me.role, role)
    : (authStateV31.roles[me.role]?.canInvite || []).includes(role);
}

function canModifyUserV31(user) {
  const me = authCurrentUserV31();
  if (!me) return false;
  if (me.role === "super_manager") return true;
  return window.PMShared?.roles?.canManageUser
    ? window.PMShared.roles.canManageUser(me.role, user.role)
    : me.role === "manager" && !["super_manager", "manager"].includes(user.role);
}

function safeExternalNavigateV32(url) {
  if (window.PMShared?.navigation?.openExternalSite) {
    window.PMShared.navigation.openExternalSite(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

ensureIntegrationReadyV32();

// Final V33: Firebase-ready auth/device/notification preparation for the static app.
const AUTH_ROLES_V33 = ["system_owner", "super_manager", "manager", "teacher", "normal", "viewer", "print_account"];

function roleDefinitionsV31() {
  return {
    system_owner: { label: "서비스 운영자", canInvite: ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"], hiddenInUserApp: true },
    super_manager: { label: "최고 관리자", canInvite: ["manager", "teacher", "normal", "viewer", "print_account"] },
    manager: { label: "관리자", canInvite: ["teacher", "normal", "viewer", "print_account"] },
    teacher: { label: "선생님", canInvite: [] },
    normal: { label: "일반 사용자", canInvite: [] },
    viewer: { label: "열람 전용", canInvite: [] },
    print_account: { label: "프린트 전용", canInvite: [] }
  };
}

function roleName(role) {
  return roleDefinitionsV31()[role]?.label || { admin: "관리자", user: "일반 사용자", print: "프린트 전용" }[role] || role;
}

function authUserToLegacyV31(user) {
  const workspaceId = user.workspace_id || user.workspaceId || user.currentWorkspaceId || user.pmWorkspaceId || store.workspace_id || "personal-local";
  return {
    id: user.id,
    uid: user.uid || user.id,
    name: user.name || user.displayName,
    email: user.email,
    password: user.password || "",
    role: user.role,
    pin: user.pin || "1234",
    permissions: user.permissions || {},
    workspace_id: workspaceId,
    workspaceId,
    currentWorkspaceId: workspaceId,
    emailVerified: !!user.emailVerified,
    provider: user.provider || "local"
  };
}

function setupFirebaseReadyAuthUiV33() {
  if (!loginForm || loginForm.dataset.firebaseReady === "true") return;
  loginForm.dataset.firebaseReady = "true";
  const actions = document.createElement("div");
  actions.className = "auth-mode-actions";
  const registerBtn = button("회원가입", "ghost");
  const forgotBtn = button("비밀번호 재설정", "ghost");
  const verifyBtn = button("이메일 인증 안내", "ghost");
  const googleBtn = button("Google 로그인", "ghost google-login-btn");
  actions.append(registerBtn, forgotBtn, verifyBtn, googleBtn);
  loginError.before(actions);
  registerBtn.addEventListener("click", () => openAuthPanelV33("register"));
  forgotBtn.addEventListener("click", () => openAuthPanelV33("forgot"));
  verifyBtn.addEventListener("click", () => openAuthPanelV33("verify"));
  googleBtn.addEventListener("click", loginWithGoogleV34);
  addInviteCodeAuthButtonV38(actions);
  loginForm.addEventListener("submit", onLoginV33, true);
  loginForm.querySelector(".invite-only-note").textContent = "계정은 관리자 초대 또는 초대코드로 등록합니다.";
}

function addInviteCodeAuthButtonV38(actions) {
  if (!actions || actions.querySelector("[data-auth-mode='invite-code']")) return;
  const inviteCodeBtn = button("초대코드로 등록", "ghost");
  inviteCodeBtn.dataset.authMode = "invite-code";
  inviteCodeBtn.addEventListener("click", () => openAuthPanelV33("inviteCode"));
  actions.insertBefore(inviteCodeBtn, actions.children[1] || null);
}

function openAuthPanelV33(mode) {
  const previous = document.getElementById("authPanelV33");
  previous?.remove();
  const panel = document.createElement("div");
  panel.id = "authPanelV33";
  panel.className = "auth-panel-inline";
  const signupMode = window.PMAuthService?.getSignupMode?.() || "development";
  if (mode === "register") {
    panel.innerHTML = `
      <h3>이메일 회원가입</h3>
      <p class="muted">현재 모드: ${escapeHtml(signupMode)}. Firebase 설정 전에는 로컬 개발 어댑터로 계정 구조만 생성합니다.</p>
      <input id="regNameV33" placeholder="이름" />
      <input id="regEmailV33" type="email" placeholder="이메일" />
      <input id="regPasswordV33" type="password" placeholder="비밀번호" />
      <button type="button" id="regSubmitV33">가입하기</button>
    `;
  } else if (mode === "inviteCode") {
    panel.innerHTML = `
      <h3>초대코드로 등록</h3>
      <p class="muted">초대코드가 있으면 새 계정을 만들면서 기존 workspace에 normal 권한으로 연결합니다. 이미 계정이 있으면 로그인 후 계정 설정에서도 등록할 수 있습니다.</p>
      <input id="inviteSignupCodeV38" placeholder="PM-ABCD-1234" />
      <input id="inviteSignupNameV38" placeholder="이름" />
      <input id="inviteSignupEmailV38" type="email" placeholder="이메일" />
      <input id="inviteSignupPasswordV38" type="password" placeholder="비밀번호" />
      <button type="button" id="inviteSignupSubmitV38">초대코드로 가입</button>
    `;
  } else if (mode === "forgot") {
    panel.innerHTML = `
      <h3>비밀번호 재설정</h3>
      <p class="muted">Firebase 연결 후 재설정 메일 발송으로 전환됩니다. 현재는 구조 확인용 화면입니다.</p>
      <input id="resetEmailV33" type="email" placeholder="가입 이메일" />
      <button type="button" id="resetSubmitV33">재설정 안내</button>
    `;
  } else {
    panel.innerHTML = `
      <h3>이메일 인증</h3>
      <p class="muted">Firebase 연결 후 인증 메일 재발송과 인증 상태 확인을 처리합니다. 로컬 개발 계정은 아래 버튼으로 인증 완료 처리할 수 있습니다.</p>
      <input id="verifyEmailV33" type="email" placeholder="가입 이메일" />
      <button type="button" id="verifySubmitV33">개발용 인증 완료</button>
    `;
  }
  loginForm.append(panel);
  document.getElementById("regSubmitV33")?.addEventListener("click", registerLocalUserV33);
  document.getElementById("inviteSignupSubmitV38")?.addEventListener("click", registerWithInviteCodeV38);
  document.getElementById("resetSubmitV33")?.addEventListener("click", async () => {
    const target = document.getElementById("resetEmailV33").value.trim();
    if (!target) {
      loginError.textContent = "이메일을 입력하세요.";
      return;
    }
    if (window.PMFirebaseRuntime?.hasConfig?.()) {
      try {
        await window.PMAuthService.firebaseResetPassword(target);
        loginError.textContent = "비밀번호 재설정 메일을 보냈습니다.";
      } catch (error) {
        loginError.textContent = error.message || "재설정 메일 발송에 실패했습니다.";
      }
    } else {
      loginError.textContent = "Firebase 설정 후 해당 이메일로 재설정 메일을 보냅니다. 현재는 구조만 준비되어 있습니다.";
    }
  });
  document.getElementById("verifySubmitV33")?.addEventListener("click", verifyLocalEmailV33);
}

async function registerLocalUserV33() {
  try {
    const emailValue = document.getElementById("regEmailV33").value;
    const passwordValue = document.getElementById("regPasswordV33").value;
    const nameValue = document.getElementById("regNameV33").value;
    let user;
    if (window.PMFirebaseRuntime?.hasConfig?.()) {
      const firebaseUser = await window.PMAuthService.firebaseRegisterWithEmail(emailValue, passwordValue, nameValue);
      user = syncFirebaseUserToLocalAuthV33(firebaseUser, nameValue, "super_manager");
    } else {
      user = await window.PMAuthService.createLocalEmailUser(authStateV31, {
        email: emailValue,
        password: passwordValue,
        displayName: nameValue,
        role: "super_manager"
      });
    }
    authStateV31 = window.PMAuthService.loadAuthState();
    loginError.textContent = `${user.email} 가입 구조를 생성했습니다. 이메일 인증 안내에서 개발용 인증 완료 후 로그인하세요.`;
  } catch (error) {
    loginError.textContent = error.message || String(error);
  }
}

async function registerWithInviteCodeV38() {
  try {
    const codeValue = document.getElementById("inviteSignupCodeV38").value.trim();
    const emailValue = document.getElementById("inviteSignupEmailV38").value.trim();
    const passwordValue = document.getElementById("inviteSignupPasswordV38").value;
    const nameValue = document.getElementById("inviteSignupNameV38").value.trim();
    if (!codeValue) throw new Error("초대코드를 입력하세요.");
    if (!emailValue || !passwordValue) throw new Error("이메일과 비밀번호를 입력하세요.");

    let user;
    if (window.PMFirebaseRuntime?.hasConfig?.()) {
      const invite = await window.PMInvitationService.getRemoteInvite(codeValue);
      window.PMInvitationService.validateInvite(invite, { email: emailValue });
      let firebaseUser;
      let usedExistingAccount = false;
      try {
        firebaseUser = await window.PMAuthService.firebaseRegisterWithEmail(emailValue, passwordValue, nameValue, { skipWorkspaceBootstrap: true });
      } catch (error) {
        if (error?.code !== "auth/email-already-in-use") throw error;
        usedExistingAccount = true;
        firebaseUser = await window.PMAuthService.firebaseSignInWithEmailOnly(emailValue, passwordValue);
      }
      firebaseUser.displayName = firebaseUser.displayName || nameValue || emailValue;
      const { member } = await window.PMInvitationService.acceptRemoteInviteCode({ user: firebaseUser, code: codeValue });
      firebaseUser.pmWorkspaceId = member.workspaceId;
      firebaseUser.pmRole = member.role || "normal";
      user = syncFirebaseUserToLocalAuthV33(firebaseUser, nameValue || emailValue, member.role || "normal");
      loginError.textContent = usedExistingAccount
        ? "기존 계정으로 로그인하고 초대코드가 등록되었습니다."
        : "초대코드로 가입되었습니다. 해당 workspace에 연결되었습니다.";
    } else {
      user = await window.PMAuthService.createLocalEmailUser(authStateV31, {
        email: emailValue,
        password: passwordValue,
        displayName: nameValue,
        role: "normal"
      });
      const { member } = await window.PMInvitationService.acceptInviteCode({ authState: authStateV31, user, code: codeValue });
      user.workspace_id = member.workspaceId;
      user.role = member.role || "normal";
    }

    authStateV31 = window.PMAuthService.loadAuthState();
    saveAuthStateV31();
    if (!loginError.textContent) loginError.textContent = `${user.email} 계정이 초대코드 workspace에 연결되었습니다.`;
  } catch (error) {
    loginError.textContent = inviteSignupErrorMessageV38(error);
  }
}

function inviteSignupErrorMessageV38(error) {
  const code = error?.code || "";
  const message = error?.message || String(error);
  if (code === "auth/email-already-in-use") return "이미 가입된 이메일입니다. 기존 계정으로 로그인하고 초대코드를 등록합니다.";
  if (code === "auth/wrong-password") return "이미 가입된 이메일입니다. 비밀번호가 일치하지 않습니다. 기존 계정 비밀번호로 다시 시도해주세요.";
  if (code === "auth/invalid-credential") return "이미 가입된 이메일입니다. 비밀번호가 올바르지 않거나 다른 로그인 방식으로 가입된 계정입니다.";
  if (code === "auth/user-not-found") return "가입되지 않은 이메일입니다.";
  if (message.includes("auth/account-exists-with-different-credential") || message.includes("provider")) return "이미 Google 로그인으로 가입된 이메일입니다. Google 로그인 후 초대코드를 등록해주세요.";
  if (message.includes("존재하지 않는") || message.includes("valid")) return "유효하지 않은 초대코드입니다.";
  if (message.includes("만료")) return "만료된 초대코드입니다.";
  if (message.includes("이미 사용")) return "이미 사용된 초대코드입니다.";
  if (message.includes("workspace")) return message;
  return message;
}

function verifyLocalEmailV33() {
  const target = document.getElementById("verifyEmailV33").value.trim().toLowerCase();
  const user = authStateV31.users.find((item) => item.email.toLowerCase() === target);
  if (!user) {
    loginError.textContent = "해당 이메일 계정을 찾을 수 없습니다.";
    return;
  }
  user.emailVerified = true;
  saveAuthStateV31();
  loginError.textContent = "개발용 이메일 인증 완료 처리했습니다.";
}

async function onLoginV33(event) {
  event.preventDefault();
  if (typeof beginBrowserAuthAttemptV80 === "function") beginBrowserAuthAttemptV80();
  event.stopImmediatePropagation();
  const loginFailureFallbackTimerV85 = scheduleLoginFailureFallbackV85();
  loginError.textContent = "로그인 확인 중입니다...";
  ensureAppV31();
  const targetEmail = email.value.trim().toLowerCase();
  let user = authStateV31.users.find((item) => item.email.toLowerCase() === targetEmail);
  if (window.PMFirebaseRuntime?.hasConfig?.()) {
    try {
      const firebaseUser = await window.PMAuthService.firebaseLoginWithEmail(targetEmail, password.value);
      user = syncFirebaseUserToLocalAuthV33(firebaseUser, firebaseUser.displayName || targetEmail, user?.role || "normal");
      authStateV31 = window.PMAuthService.loadAuthState();
    } catch (error) {
      loginError.textContent = firebaseErrorMessageV35(error, "Firebase 로그인에 실패했습니다.");
      return;
    }
  } else {
    if (!await window.PMAuthService.verifyLocalPassword(user, password.value)) {
      loginError.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
      return;
    }
  }
  if (!user.active || user.disabled) {
    loginError.textContent = "비활성화된 계정입니다. 관리자에게 문의하세요.";
    return;
  }
  if (!user.emailVerified) {
    loginError.textContent = "이메일 인증 후 로그인할 수 있습니다.";
    return;
  }
  user.lastLoginAt = new Date().toISOString();
  authStateV31.auth.currentUserId = user.id;
  authStateV31.auth.sessionStartedAt = new Date().toISOString();
  saveAuthStateV31();
  clearLoginFailureFallbackV85(loginFailureFallbackTimerV85);
  currentUser = authUserToLegacyV31(user);
  currentUser.password = password.value;
  const workspaceId = activateWorkspaceForUserV36(currentUser);
  window.PMSessionService?.startSession?.(user.id);
  window.PMDeviceService?.registerLoginDevice?.(user.uid || user.id, workspaceId);
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  updateGreeting();
  buildNav();
  renderPage(user.role === "print_account" ? "print" : "dashboard");
}

function syncFirebaseUserToLocalAuthV33(firebaseUser, displayName, role) {
  const workspaceId = firebaseUser.pmWorkspaceId || `ws_${firebaseUser.uid}`;
  authStateV31.workspace_members = authStateV31.workspace_members || [];
  const existingMember = authStateV31.workspace_members.find((member) => member.workspaceId === workspaceId && member.uid === firebaseUser.uid);
  const existingUser = authStateV31.users.find((item) => item.uid === firebaseUser.uid || item.email === firebaseUser.email);
  const memberRole = firebaseUser.pmRole || existingMember?.role || existingUser?.role || role || "normal";
  let user = existingUser;
  if (!user) {
    user = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: displayName || firebaseUser.email,
      displayName: displayName || firebaseUser.email,
      role: memberRole,
      globalRole: "user",
      workspace_id: workspaceId,
      active: true,
      disabled: false,
      emailVerified: firebaseUser.emailVerified,
      provider: "firebase",
      createdAt: new Date().toISOString()
    };
    authStateV31.users.unshift(user);
  }
  user.emailVerified = firebaseUser.emailVerified;
  user.active = user.disabled !== true;
  user.workspace_id = workspaceId;
  user.role = memberRole || user.role || "normal";
  user.provider = "firebase";
  user.uid = firebaseUser.uid;
  user.id = user.id || firebaseUser.uid;
  user.name = user.name || displayName || firebaseUser.email;
  user.displayName = user.displayName || displayName || firebaseUser.email;
  const memberId = `${user.workspace_id}_${user.uid}`;
  const localMember = authStateV31.workspace_members.find((member) => member.id === memberId || (member.workspaceId === user.workspace_id && member.uid === user.uid));
  if (localMember) {
    localMember.role = user.role;
    localMember.status = "active";
  } else {
    authStateV31.workspace_members.unshift({
      id: memberId,
      workspaceId: user.workspace_id,
      uid: user.uid,
      role: user.role,
      status: "active",
      joinedAt: new Date().toISOString(),
      invitedBy: null
    });
  }
  authWorkspaceStateV36 = { loading: false, error: "", currentWorkspaceId: user.workspace_id, currentRole: user.role };
  authStateV31.workspaces = authStateV31.workspaces || [];
  if (!authStateV31.workspaces.some((workspace) => workspace.workspaceId === user.workspace_id)) {
    authStateV31.workspaces.unshift({
      workspaceId: user.workspace_id,
      name: `${user.name || user.email} workspace`,
      ownerUid: user.uid,
      plan: "firebase",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  saveAuthStateV31();
  return user;
}

function renderAccountsV17() {
  content.replaceChildren();
  content.append(el("h2", "", "사용자 관리"));
  content.append(el("p", "muted", "Firebase 전환을 고려한 사용자, 역할, 기기, 알림 구조를 관리합니다."));
  if (!authCanManageUsersV31()) {
    content.append(el("p", "empty", "사용자 관리 권한이 없습니다."));
    return;
  }
  const invite = inviteFormV31();
  content.append(invite, usersTableV31(), invitationsTableV31());
  appendFirebasePreparedSettingsV33();
}

function appendFirebasePreparedSettingsV33() {
  if (!content || document.getElementById("firebasePreparedV33")) return;
  const section = el("section", "panel", "");
  section.id = "firebasePreparedV33";
  section.append(el("h3", "", "Firebase 인증/기기/알림 준비"));
  const currentUid = currentUser?.uid || currentUser?.id || "";
  const workspaceId = currentUser?.workspace_id || store.workspace_id || "personal-local";
  const devices = window.PMDeviceService?.listDevices?.(currentUid, workspaceId) || [];
  const notifications = window.PMNotificationService?.listNotifications?.(workspaceId, currentUid) || [];
  const modeSelect = document.createElement("select");
  ["development", "public", "invite_only"].forEach((mode) => modeSelect.append(option(mode, mode)));
  modeSelect.value = window.PMAuthService?.getSignupMode?.() || "development";
  modeSelect.addEventListener("change", () => {
    window.PMAuthService?.setSignupMode?.(modeSelect.value);
    showMessage("가입 정책", `가입 정책이 ${modeSelect.value}(으)로 설정되었습니다.`);
  });
  section.append(makeField("회원가입 정책", "signupModeV33", modeSelect));
  const info = el("div", "info-grid", "");
  [
    ["workspaceId", workspaceId],
    ["현재 기기", window.PMDeviceService?.currentDeviceId?.() || "-"],
    ["등록 기기", `${devices.length}개`],
    ["앱 알림", `${notifications.filter((item) => !item.read).length}개 미읽음`]
  ].forEach(([label, value]) => {
    const card = el("div", "info-card", "");
    card.append(el("b", "", label), el("span", "", value));
    info.append(card);
  });
  section.append(info);
  const todo = el("p", "muted", "특정 기기 로그아웃, 모든 기기 로그아웃, FCM 푸시 발송은 Cloud Functions + Firebase Admin SDK 연결 후 활성화됩니다.");
  section.append(todo);
  const workspaceTools = el("div", "row-actions");
  const resetWorkspaceBtn = button("현재 계정 데이터 초기화", "danger");
  resetWorkspaceBtn.addEventListener("click", () => {
    if (!confirm("현재 로그인한 계정의 workspace 데이터만 초기화할까요? 다른 계정 데이터는 삭제되지 않습니다.")) return;
    resetCurrentWorkspaceDataV36();
  });
  const legacyImportBtn = button("기존 브라우저 데이터 가져오기 (TODO)", "ghost");
  legacyImportBtn.addEventListener("click", () => {
    window.PMDataService?.importLegacyStoreToWorkspace?.();
    showMessage("준비 중", "기존 pm-store-v3 데이터는 자동으로 가져오지 않습니다. 이후 검토/선택 가져오기 흐름으로 연결할 예정입니다.");
  });
  workspaceTools.append(resetWorkspaceBtn, legacyImportBtn);
  section.append(workspaceTools);
  content.append(section);
}

function renderAccountsV17() {
  content.replaceChildren();
  content.append(el("h2", "", "계정 설정"));
  content.append(el("p", "muted", "Firebase 전환을 고려한 사용자, 역할, 기기, 알림 구조를 관리합니다."));
  if (!authCanManageUsersV31()) {
    content.append(el("p", "empty", "사용자 관리 권한이 없습니다."));
    return;
  }
  try {
    refreshInvitationStatusesV31?.();
    const section = panel("사용자 관리");
    section.append(inviteFormV36(), usersTableV36(), invitationsTableV36());
    content.append(section);
    appendFirebasePreparedSettingsV33();
  } catch (error) {
    content.append(el("div", "restricted", `계정관리 화면을 불러오지 못했습니다: ${error.message || error}`));
  }
}

function roleOptionsForCurrentUserV36(selectedRole) {
  const keys = ["system_owner", "super_manager"].includes(currentUser?.role)
    ? ROLE_KEYS_V31
    : ROLE_KEYS_V31.filter((key) => !["super_manager", "manager"].includes(key));
  return [...new Set([selectedRole, ...keys].filter(Boolean))];
}

function usersForCurrentWorkspaceV38() {
  const workspaceId = currentUser?.workspace_id || store.workspace_id || window.PMDataService?.currentWorkspaceId?.() || "";
  const activeMembers = (authStateV31.workspace_members || [])
    .filter((member) => member.workspaceId === workspaceId && !["disabled", "withdrawn", "deleted"].includes(member.status || "active"));
  const memberUids = new Set(activeMembers.map((member) => member.uid).filter(Boolean));
  return (authStateV31.users || []).filter((user) => {
    const uid = user.uid || user.id;
    if (user.workspace_id === workspaceId || user.workspaceId === workspaceId) return true;
    if (uid && memberUids.has(uid)) return true;
    return uid && uid === (currentUser?.uid || currentUser?.id);
  });
}

let remoteWorkspaceMemberRefreshV39 = "";

async function refreshRemoteWorkspaceMembersV39(workspaceId) {
  if (!workspaceId || !window.PMFirebaseRuntime?.hasConfig?.()) return;
  if (remoteWorkspaceMemberRefreshV39 === workspaceId) return;
  remoteWorkspaceMemberRefreshV39 = workspaceId;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    if (!runtime) return;
    const snapshot = await runtime.db.collection("workspaces").doc(workspaceId).collection("members").get();
    authStateV31.workspace_members = authStateV31.workspace_members || [];
    authStateV31.users = authStateV31.users || [];
    snapshot.docs.forEach((doc) => {
      const member = doc.data();
      const uid = member.uid || doc.id;
      const memberId = `${workspaceId}_${uid}`;
      const existingMember = authStateV31.workspace_members.find((item) => item.id === memberId || (item.workspaceId === workspaceId && item.uid === uid));
      const mergedMember = {
        id: memberId,
        workspaceId,
        uid,
        role: member.role || "normal",
        status: member.status || "active",
        joinedAt: member.joinedAt || "",
        invitedBy: member.invitedBy || "",
        invitedByEmail: member.invitedByEmail || "",
        inviteCode: member.inviteCode || member.inviteCodeId || "",
        inviteCodeId: member.inviteCodeId || member.inviteCode || ""
      };
      if (existingMember) Object.assign(existingMember, mergedMember);
      else authStateV31.workspace_members.unshift(mergedMember);

      const existingUser = authStateV31.users.find((user) => user.uid === uid || user.id === uid || user.email === member.email);
      const mergedUser = {
        id: uid,
        uid,
        email: member.email || existingUser?.email || "",
        name: member.displayName || existingUser?.name || member.email || uid,
        displayName: member.displayName || existingUser?.displayName || member.email || uid,
        role: member.role || existingUser?.role || "normal",
        workspace_id: workspaceId,
        workspaceId,
        active: member.status !== "disabled",
        disabled: member.status === "disabled",
        emailVerified: existingUser?.emailVerified !== false,
        invitedBy: member.invitedBy || existingUser?.invitedBy || "",
        invitedByEmail: member.invitedByEmail || existingUser?.invitedByEmail || "",
        inviteCode: member.inviteCode || existingUser?.inviteCode || "",
        inviteCodeId: member.inviteCodeId || existingUser?.inviteCodeId || ""
      };
      if (existingUser) Object.assign(existingUser, mergedUser);
      else authStateV31.users.unshift(mergedUser);
    });
    saveAuthStateV31();
    if (currentPage === "accounts") renderAccountsV17();
  } catch (error) {
    console.error("[PM Firestore permission check]", {
      step: "load workspace members",
      path: `workspaces/${workspaceId}/members`,
      code: error?.code || "",
      message: error?.message || String(error)
    });
  } finally {
    remoteWorkspaceMemberRefreshV39 = "";
  }
}

function stopWorkspaceMembersRealtimeV49() {
  if (typeof workspaceMembersUnsubscribeV49 === "function") {
    try {
      workspaceMembersUnsubscribeV49();
    } catch (error) {
      console.warn("[PM workspace members sync] unsubscribe failed", error?.message || String(error));
    }
  }
  workspaceMembersUnsubscribeV49 = null;
  workspaceMembersIdV49 = "";
  clearTimeout(workspaceMembersRenderTimerV49);
}

async function startWorkspaceMembersRealtimeV49(workspaceId) {
  if (!workspaceId || !window.PMFirebaseRuntime?.hasConfig?.() || !isFirebaseBackedSessionV45()) return;
  if (workspaceMembersIdV49 === workspaceId && workspaceMembersUnsubscribeV49) return;
  stopWorkspaceMembersRealtimeV49();
  workspaceMembersIdV49 = workspaceId;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    if (!runtime || workspaceMembersIdV49 !== workspaceId) return;
    workspaceMembersUnsubscribeV49 = runtime.db
      .collection("workspaces")
      .doc(workspaceId)
      .collection("members")
      .onSnapshot((snapshot) => {
        applyWorkspaceMembersSnapshotV49(workspaceId, snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) })));
      }, (error) => {
        console.error(`[PM workspace members sync] listener failed workspaceId=${workspaceId} code=${error?.code || ""} message=${error?.message || String(error)}`);
      });
    console.info(`[PM workspace members sync] realtime listener started workspaceId=${workspaceId}`);
  } catch (error) {
    console.error(`[PM workspace members sync] start failed workspaceId=${workspaceId} code=${error?.code || ""} message=${error?.message || String(error)}`);
  }
}

function applyWorkspaceMembersSnapshotV49(workspaceId, members) {
  authStateV31.workspace_members = (authStateV31.workspace_members || []).filter((member) => member.workspaceId !== workspaceId);
  authStateV31.users = authStateV31.users || [];
  const currentUid = currentUser?.uid || currentUser?.id || "";
  let currentUserChanged = false;
  members.forEach((member) => {
    const uid = member.uid || member.id;
    if (!uid) return;
    const memberId = `${workspaceId}_${uid}`;
    const mergedMember = {
      id: memberId,
      workspaceId,
      uid,
      email: member.email || "",
      displayName: member.displayName || member.name || member.email || uid,
      role: member.role || "normal",
      status: member.status || "active",
      joinedAt: member.joinedAt || "",
      invitedBy: member.invitedBy || "",
      invitedByEmail: member.invitedByEmail || "",
      inviteCode: member.inviteCode || member.inviteCodeId || "",
      inviteCodeId: member.inviteCodeId || member.inviteCode || ""
    };
    authStateV31.workspace_members.unshift(mergedMember);

    const existingUser = authStateV31.users.find((user) => user.uid === uid || user.id === uid || (member.email && user.email === member.email));
    const isGlobalSystemOwner = existingUser?.role === "system_owner"
      || existingUser?.currentRole === "system_owner"
      || existingUser?.globalRole === "system_owner"
      || member.ownerGlobalRole === "system_owner";
    const appRole = isGlobalSystemOwner ? "system_owner" : mergedMember.role;
    const mergedUser = {
      id: uid,
      uid,
      email: member.email || existingUser?.email || "",
      name: member.displayName || existingUser?.name || member.email || uid,
      displayName: member.displayName || existingUser?.displayName || member.email || uid,
      role: appRole,
      currentRole: appRole,
      workspaceRole: mergedMember.role,
      workspace_id: workspaceId,
      workspaceId,
      currentWorkspaceId: workspaceId,
      active: mergedMember.status !== "disabled",
      disabled: mergedMember.status === "disabled",
      emailVerified: existingUser?.emailVerified !== false,
      provider: existingUser?.provider || "firebase",
      invitedBy: mergedMember.invitedBy,
      invitedByEmail: mergedMember.invitedByEmail,
      inviteCode: mergedMember.inviteCode,
      inviteCodeId: mergedMember.inviteCodeId
    };
    if (existingUser) Object.assign(existingUser, mergedUser);
    else authStateV31.users.unshift(mergedUser);

    if (uid === currentUid && currentUser) {
      const previousRole = currentUser.role;
      const keepSystemOwner = currentUser.role === "system_owner" || currentUser.currentRole === "system_owner" || currentUser.globalRole === "system_owner" || member.ownerGlobalRole === "system_owner";
      currentUser.role = keepSystemOwner ? "system_owner" : mergedMember.role;
      currentUser.currentRole = currentUser.role;
      currentUser.workspaceRole = mergedMember.role;
      currentUser.workspace_id = workspaceId;
      currentUser.workspaceId = workspaceId;
      currentUser.currentWorkspaceId = workspaceId;
      currentUser.active = mergedUser.active;
      currentUser.disabled = mergedUser.disabled;
      authWorkspaceStateV36 = { loading: false, error: "", currentWorkspaceId: workspaceId, currentRole: currentUser.role, workspaceRole: mergedMember.role };
      currentUserChanged = currentUserChanged || previousRole !== currentUser.role;
    }
  });
  saveAuthStateV31();
  clearTimeout(workspaceMembersRenderTimerV49);
  workspaceMembersRenderTimerV49 = setTimeout(() => {
    if (!currentUser || app?.classList.contains("hidden")) return;
    if (currentUserChanged || currentPage === "accounts") buildNav();
    if (currentUserChanged || currentPage === "accounts") renderPage(currentPage || "dashboard");
    else updateGreeting();
  }, 120);
}

function stopCurrentUserRealtimeV50() {
  if (typeof currentUserUnsubscribeV50 === "function") {
    try {
      currentUserUnsubscribeV50();
    } catch (error) {
      console.warn("[PM user profile sync] unsubscribe failed", error?.message || String(error));
    }
  }
  currentUserUnsubscribeV50 = null;
  currentUserDocUidV50 = "";
  currentUserSystemOwnerCacheV61 = {};
}

async function startCurrentUserRealtimeV50() {
  const uid = currentUser?.uid || currentUser?.id || "";
  if (!uid || !window.PMFirebaseRuntime?.hasConfig?.() || !isFirebaseBackedSessionV45()) return;
  if (currentUserDocUidV50 === uid && currentUserUnsubscribeV50) return;
  stopCurrentUserRealtimeV50();
  currentUserDocUidV50 = uid;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    if (!runtime || currentUserDocUidV50 !== uid) return;
    currentUserUnsubscribeV50 = runtime.db.collection("users").doc(uid).onSnapshot((snapshot) => {
      if (!snapshot.exists || !currentUser || (currentUser.uid || currentUser.id) !== uid) return;
      const data = snapshot.data() || {};
      const nextWorkspaceId = data.workspaceId || data.currentWorkspaceId || currentUser.workspace_id || currentUser.workspaceId;
      const keepSystemOwner = currentUser.role === "system_owner" || currentUser.currentRole === "system_owner" || currentUser.globalRole === "system_owner" || data.currentRole === "system_owner" || data.role === "system_owner" || data.globalRole === "system_owner";
      const nextRole = keepSystemOwner ? "system_owner" : data.currentRole || data.role || currentUser.role;
      const workspaceChanged = nextWorkspaceId && nextWorkspaceId !== (currentUser.workspace_id || currentUser.workspaceId);
      const roleChanged = nextRole && nextRole !== currentUser.role;
      currentUser.workspace_id = nextWorkspaceId || currentUser.workspace_id;
      currentUser.workspaceId = nextWorkspaceId || currentUser.workspaceId;
      currentUser.currentWorkspaceId = nextWorkspaceId || currentUser.currentWorkspaceId;
      currentUser.role = nextRole || currentUser.role;
      currentUser.currentRole = currentUser.role;
      currentUser.globalRole = keepSystemOwner ? "system_owner" : data.globalRole || currentUser.globalRole || "user";
      currentUser.workspaceRole = data.workspaceRole || currentUser.workspaceRole || (currentUser.role === "system_owner" ? "super_manager" : currentUser.role);
      currentUser.active = data.disabled === true ? false : currentUser.active;
      currentUser.disabled = data.disabled === true;
      currentUser.emailVerified = data.emailVerified !== false;
      const localUser = authStateV31.users.find((user) => user.uid === uid || user.id === uid);
      if (localUser) {
        localUser.workspace_id = currentUser.workspace_id;
        localUser.workspaceId = currentUser.workspaceId;
        localUser.currentWorkspaceId = currentUser.currentWorkspaceId;
        localUser.role = currentUser.role;
        localUser.currentRole = currentUser.currentRole;
        localUser.globalRole = currentUser.globalRole;
        localUser.workspaceRole = currentUser.workspaceRole;
        localUser.disabled = currentUser.disabled;
        localUser.active = currentUser.active;
      }
      saveAuthStateV31();
      if (workspaceChanged) {
        activateWorkspaceForUserV36(currentUser);
        buildNav();
        renderPage("dashboard");
      } else if (roleChanged) {
        buildNav();
        renderPage(currentPage || "dashboard");
      } else {
        updateGreeting();
      }
    }, (error) => {
      console.error(`[PM user profile sync] listener failed uid=${uid} code=${error?.code || ""} message=${error?.message || String(error)}`);
    });
    console.info(`[PM user profile sync] realtime listener started uid=${uid}`);
  } catch (error) {
    console.error(`[PM user profile sync] start failed uid=${uid} code=${error?.code || ""} message=${error?.message || String(error)}`);
  }
}

function inviteFormV36() {
  const box = panel("사용자 초대");
  box.classList.add("sub-panel");
  const grid = el("div", "form-grid");
  const name = document.createElement("input");
  name.placeholder = "사용자 이름";
  const mail = document.createElement("input");
  mail.type = "email";
  mail.placeholder = "user@example.com";
  const role = document.createElement("select");
  roleOptionsForCurrentUserV36("normal").forEach((key) => {
    if (authCanInviteRoleV31(key)) role.append(option(key, roleName(key)));
  });
  const linkBox = document.createElement("textarea");
  linkBox.readOnly = true;
  linkBox.placeholder = "초대 링크가 여기에 생성됩니다.";
  const inviteBtn = button("초대 링크 생성");
  inviteBtn.addEventListener("click", () => {
    try {
      if (!mail.value.includes("@")) throw new Error("이메일을 올바르게 입력하세요.");
      const invite = createInvitationV31({
        name: name.value.trim() || mail.value.split("@")[0],
        email: mail.value.trim().toLowerCase(),
        role: role.value || "normal"
      });
      linkBox.value = invitationLinkV31(invite);
      showMessage("초대 생성 완료", "초대 링크가 생성되었습니다.");
      renderAccountsV17();
    } catch (error) {
      showMessage("초대 실패", error.message || String(error));
    }
  });
  grid.append(
    makeField("이름", "inviteNameV36", name),
    makeField("이메일", "inviteEmailV36", mail),
    makeField("역할", "inviteRoleV36", role),
    inviteBtn,
    makeField("초대 링크", "inviteLinkV36", linkBox)
  );
  box.append(grid);
  return box;
}

function usersTableV36() {
  const wrap = el("div", "table-wrap auth-table");
  wrap.append(el("h3", "", "전체 계정"));
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>상태</th><th>이메일 인증</th><th>마지막 로그인</th><th>메뉴 접근</th><th>관리</th></tr></thead>";
  const body = document.createElement("tbody");
  const users = usersForCurrentWorkspaceV38();
  users.forEach((user) => {
    const tr = document.createElement("tr");
    const role = document.createElement("select");
    roleOptionsForCurrentUserV36(user.role).forEach((key) => role.append(option(key, roleName(key))));
    role.value = user.role || "normal";
    role.disabled = !canModifyUserV31(user) || (user.role === "super_manager" && currentUser?.role !== "super_manager");
    role.addEventListener("change", () => {
      if (!canModifyUserV31(user)) return;
      user.role = role.value;
      user.menuOverrides = null;
      syncLocalMemberRoleV36(user);
      saveAuthStateV31();
      renderAccountsV17();
    });
    const active = document.createElement("input");
    active.type = "checkbox";
    active.checked = user.active !== false && user.disabled !== true;
    active.disabled = !canModifyUserV31(user) || user.id === currentUser?.id || user.uid === currentUser?.uid;
    active.addEventListener("change", () => {
      user.active = active.checked;
      user.disabled = !active.checked;
      user.status = active.checked ? "active" : "disabled";
      syncLocalMemberRoleV36(user);
      saveAuthStateV31();
    });
    const menu = document.createElement("select");
    menu.multiple = true;
    menu.size = 5;
    Object.keys(pageMeta).forEach((key) => menu.append(option(key, pageLabel(key))));
    [...menu.options].forEach((opt) => { opt.selected = authMenuKeysV31(user).includes(opt.value); });
    menu.disabled = !canModifyUserV31(user);
    menu.addEventListener("change", () => {
      user.menuOverrides = [...menu.selectedOptions].map((opt) => opt.value);
      saveAuthStateV31();
    });
    const reset = button("PW 변경", "ghost small");
    reset.disabled = !canModifyUserV31(user);
    reset.addEventListener("click", () => {
      const next = prompt("임시 비밀번호", "temp1234");
      if (!next) return;
      user.password = next;
      user.passwordResetRequested = false;
      saveAuthStateV31();
      showMessage("비밀번호 변경", `${user.email} 임시 비밀번호가 변경되었습니다.`);
    });
    const disable = button("비활성", "ghost small");
    disable.disabled = active.disabled;
    disable.addEventListener("click", () => {
      user.active = false;
      user.disabled = true;
      user.status = "disabled";
      syncLocalMemberRoleV36(user);
      saveAuthStateV31();
      renderAccountsV17();
    });
    const actions = el("div", "row-actions");
    actions.append(reset, disable);
    tr.append(
      el("td", "", user.name || user.displayName || "-"),
      el("td", "", user.email || "-"),
      tableCellNodeV31(role),
      tableCellNodeV31(active),
      el("td", "", user.emailVerified ? "인증 완료" : "미인증"),
      el("td", "", user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "-"),
      tableCellNodeV31(menu),
      tableCellNodeV31(actions)
    );
    body.append(tr);
  });
  if (!users.length) {
    const tr = document.createElement("tr");
    const td = el("td", "empty", "현재 workspace에 등록된 사용자가 없습니다.");
    td.colSpan = 8;
    tr.append(td);
    body.append(tr);
  }
  table.append(body);
  wrap.append(table);
  return wrap;
}

function invitationsTableV36() {
  const wrap = el("div", "table-wrap auth-table");
  wrap.append(el("h3", "", "초대 상태"));
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>상태</th><th>만료 시간</th><th>초대 링크</th></tr></thead>";
  const body = document.createElement("tbody");
  (authStateV31.invitations || []).forEach((invite) => {
    const link = document.createElement("input");
    link.readOnly = true;
    link.value = invitationLinkV31(invite);
    const copy = button("복사", "ghost small");
    copy.addEventListener("click", async () => {
      await navigator.clipboard?.writeText?.(link.value);
      showMessage("복사 완료", "초대 링크를 복사했습니다.");
    });
    const linkWrap = el("div", "row-actions");
    linkWrap.append(link, copy);
    const tr = document.createElement("tr");
    tr.append(
      el("td", "", invite.name || "-"),
      el("td", "", invite.email || "-"),
      el("td", "", roleName(invite.role)),
      el("td", "", invite.status || "invited"),
      el("td", "", invite.expiresAt ? new Date(Number(invite.expiresAt)).toLocaleString() : "-"),
      tableCellNodeV31(linkWrap)
    );
    body.append(tr);
  });
  if (!body.children.length) {
    const tr = document.createElement("tr");
    const td = el("td", "empty", "생성된 초대가 없습니다.");
    td.colSpan = 6;
    tr.append(td);
    body.append(tr);
  }
  table.append(body);
  wrap.append(table);
  return wrap;
}

function syncLocalMemberRoleV36(user) {
  const workspaceId = user.workspace_id || currentUser?.workspace_id || store.workspace_id || window.PMDataService?.currentWorkspaceId?.();
  const uid = user.uid || user.id;
  if (!workspaceId || !uid) return;
  authStateV31.workspace_members = authStateV31.workspace_members || [];
  const memberId = `${workspaceId}_${uid}`;
  const member = authStateV31.workspace_members.find((item) => item.id === memberId || (item.workspaceId === workspaceId && item.uid === uid));
  if (member) {
    member.role = user.role;
    member.status = user.active === false || user.disabled ? "disabled" : "active";
  } else {
    authStateV31.workspace_members.unshift({ id: memberId, workspaceId, uid, role: user.role, status: "active", joinedAt: new Date().toISOString(), invitedBy: currentUser?.uid || currentUser?.id || null });
  }
  syncRemoteMemberRoleV39(user, workspaceId, uid);
}

async function syncRemoteMemberRoleV39(user, workspaceId, uid) {
  if (!window.PMFirebaseRuntime?.hasConfig?.()) return;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    if (!runtime) return;
    const { firestore } = runtime.sdk;
    const memberId = `${workspaceId}_${uid}`;
    const payload = {
      uid,
      workspaceId,
      email: user.email || "",
      displayName: user.displayName || user.name || user.email || "",
      role: user.role || "normal",
      status: user.active === false || user.disabled ? "disabled" : "active",
      updatedAt: firestore.serverTimestamp()
    };
    const batch = firestore.writeBatch(runtime.db);
    batch.set(firestore.doc(runtime.db, "users", uid), {
      role: payload.role,
      currentRole: payload.role,
      workspaceId,
      currentWorkspaceId: workspaceId,
      updatedAt: payload.updatedAt
    }, { merge: true });
    batch.set(firestore.doc(runtime.db, "workspace_members", memberId), payload, { merge: true });
    batch.set(firestore.doc(runtime.db, "workspaces", workspaceId, "members", uid), payload, { merge: true });
    await batch.commit();
    console.info("[PM role sync]", { workspaceId, uid, role: payload.role, usersDocumentSaved: true, workspaceMembersSaved: true });
  } catch (error) {
    console.error("[PM role sync failure]", {
      workspaceId,
      uid,
      role: user.role,
      code: error?.code || "",
      message: error?.message || String(error)
    });
    showMessage?.("권한 저장 실패", "역할 변경을 서버에 저장하지 못했습니다. Firestore Rules를 확인해주세요.");
  }
}

function renderAccountsV17() {
  window.PMWorkspaceService?.ensurePersonalWorkspace?.(authStateV31, currentUser);
  saveAuthStateV31();
  startWorkspaceMembersRealtimeV49(currentUser?.workspace_id || store.workspace_id || window.PMDataService?.currentWorkspaceId?.());
  content.replaceChildren();
  content.append(el("h2", "", "계정 설정"));
  content.append(el("p", "muted", "사용자, 역할, 초대코드, workspace 전환, 계정 탈퇴를 관리합니다."));
  content.append(workspaceSwitcherV37(), inviteCodeRegisterV37(), accountWithdrawPanelV37());
  if (!authCanManageUsersV31()) {
    content.append(el("p", "empty", "사용자 관리 권한이 없습니다. 초대코드 등록과 workspace 전환만 사용할 수 있습니다."));
    return;
  }
  try {
    window.PMInvitationService?.refreshStatuses?.(authStateV31);
    const section = panel("사용자 관리");
    section.append(inviteFormV37(), usersTableV36(), invitationsTableV37());
    content.append(section);
    appendFirebasePreparedSettingsV33();
  } catch (error) {
    content.append(el("div", "restricted", `계정관리 화면을 불러오지 못했습니다: ${error.message || error}`));
  }
}

function workspaceSwitcherV37() {
  const box = panel("workspace 전환");
  const memberships = window.PMWorkspaceService?.listMemberships?.(authStateV31, currentUser) || [];
  const select = document.createElement("select");
  memberships.forEach((member) => {
    const label = `${member.workspace?.name || member.workspaceId} · ${roleName(member.role)}`;
    select.append(option(member.workspaceId, label));
  });
  select.value = currentUser?.workspace_id || store.workspace_id || "";
  select.addEventListener("change", () => {
    try {
      const member = window.PMWorkspaceService.switchWorkspace(authStateV31, currentUser, select.value);
      const authUser = authStateV31.users.find((user) => user.id === currentUser.id || user.uid === currentUser.uid);
      if (authUser) {
        authUser.workspace_id = member.workspaceId;
        authUser.role = member.role;
      }
      saveAuthStateV31();
      activateWorkspaceForUserV36(currentUser);
      buildNav();
      renderPage("dashboard");
      showMessage("workspace 전환 완료", `${roleName(member.role)} 권한으로 전환했습니다.`);
    } catch (error) {
      showMessage("workspace 전환 실패", error.message || String(error));
    }
  });
  box.append(makeField("현재 workspace", "workspaceSwitchV37", select));
  return box;
}

function inviteCodeRegisterV37() {
  const box = panel("초대코드 등록");
  const row = el("div", "form-grid");
  const code = document.createElement("input");
  code.placeholder = "PM-ABCD-1234";
  const submit = button("초대코드 등록");
  submit.addEventListener("click", async () => {
    try {
      const authUser = authStateV31.users.find((user) => user.id === currentUser.id || user.uid === currentUser.uid) || currentUser;
      if ((authUser.workspace_id || authUser.workspaceId || currentUser.workspace_id) && !confirm("현재 연결된 workspace가 있습니다. 초대코드를 등록하면 해당 workspace로 전환됩니다. 계속할까요?")) return;
      const { member } = await window.PMInvitationService.acceptInviteCode({ authState: authStateV31, user: authUser, code: code.value });
      currentUser.workspace_id = member.workspaceId;
      currentUser.role = member.role;
      authUser.workspace_id = member.workspaceId;
      authUser.role = member.role;
      saveAuthStateV31();
      activateWorkspaceForUserV36(currentUser);
      buildNav();
      renderPage("dashboard");
      showMessage("초대코드 등록 완료", `${roleName(member.role)} 권한으로 초대받은 workspace에 연결되었습니다.`);
    } catch (error) {
      showMessage("초대코드 등록 실패", error.message || String(error));
    }
  });
  row.append(makeField("초대코드", "inviteCodeAcceptV37", code), submit);
  box.append(row, el("p", "muted", "개인 workspace 데이터는 이동하지 않고, 초대받은 workspace를 선택/전환할 수 있게 됩니다."));
  return box;
}

function accountWithdrawPanelV37() {
  const box = panel("계정 탈퇴");
  const confirm = document.createElement("input");
  confirm.placeholder = "탈퇴";
  const btn = button("계정 탈퇴 요청", "danger");
  btn.addEventListener("click", () => {
    try {
      if (confirm.value !== "탈퇴") throw new Error("확인 문구로 '탈퇴'를 입력하세요.");
      const authUser = authStateV31.users.find((user) => user.id === currentUser.id || user.uid === currentUser.uid) || currentUser;
      window.PMAccountService.withdraw(authStateV31, authUser);
      saveAuthStateV31();
      showMessage("탈퇴 처리 완료", "계정이 비활성화되었습니다. Firebase Auth 완전 삭제는 추후 Cloud Functions/Admin SDK 단계에서 처리합니다.");
      logout();
    } catch (error) {
      showMessage("탈퇴 처리 실패", error.message || String(error));
    }
  });
  const row = el("div", "form-grid");
  row.append(makeField("확인 문구", "withdrawConfirmV37", confirm), btn);
  box.append(row, el("p", "muted", "soft delete 방식으로 users.disabled/deletedAt 및 workspace_members.status를 변경합니다."));
  return box;
}

function inviteFormV37() {
  const box = panel("초대코드 생성");
  box.classList.add("sub-panel");
  const grid = el("div", "form-grid");
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.placeholder = "선택 사항";
  const role = document.createElement("select");
  roleOptionsForCurrentUserV36("teacher").forEach((key) => {
    if (window.PMInvitationService?.canCreateInvite?.(currentUser?.role, key)) role.append(option(key, roleName(key)));
  });
  const expires = document.createElement("input");
  expires.type = "number";
  expires.min = "1";
  expires.value = "72";
  const reusable = document.createElement("input");
  reusable.type = "checkbox";
  const maxUses = document.createElement("input");
  maxUses.type = "number";
  maxUses.min = "1";
  maxUses.value = "1";
  const codeBox = document.createElement("textarea");
  codeBox.readOnly = true;
  codeBox.placeholder = "생성 직후 초대코드가 표시됩니다. 다시 볼 수 없으니 바로 전달하세요.";
  const create = button("초대코드 생성");
  create.addEventListener("click", async () => {
    try {
      const { code } = await window.PMInvitationService.createInvite({
        authState: authStateV31,
        currentUser,
        workspaceId: currentUser?.workspace_id || store.workspace_id,
        role: role.value,
        email: emailInput.value,
        expiresHours: expires.value,
        maxUses: maxUses.value,
        reusable: reusable.checked
      });
      saveAuthStateV31();
      codeBox.value = code;
      showMessage("초대코드 생성 완료", "초대코드는 지금만 확인할 수 있습니다.");
    } catch (error) {
      showMessage("초대코드 생성 실패", error.message || String(error));
    }
  });
  grid.append(
    makeField("초대 이메일", "inviteEmailV37", emailInput),
    makeField("초대 역할", "inviteRoleV37", role),
    makeField("만료 시간(시간)", "inviteExpiresV37", expires),
    makeField("여러 번 사용", "inviteReusableV37", reusable),
    makeField("최대 사용 횟수", "inviteMaxUsesV37", maxUses),
    create,
    makeField("생성된 초대코드", "inviteCodeV37", codeBox)
  );
  box.append(grid);
  return box;
}

function invitationsTableV37() {
  const wrap = el("div", "table-wrap auth-table");
  wrap.append(el("h3", "", "초대코드 상태"));
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>workspace</th><th>이메일</th><th>역할</th><th>상태</th><th>사용</th><th>만료</th><th>관리</th></tr></thead>";
  const body = document.createElement("tbody");
  (authStateV31.invitations || []).forEach((invite) => {
    const revoke = button("폐기", "ghost small");
    revoke.disabled = !["pending", "invited"].includes(invite.status);
    revoke.addEventListener("click", () => {
      window.PMInvitationService?.revokeInvite?.(authStateV31, invite.invitationId || invite.id);
      saveAuthStateV31();
      renderAccountsV17();
    });
    const tr = document.createElement("tr");
    tr.append(
      el("td", "", invite.workspaceId || "-"),
      el("td", "", invite.email || "-"),
      el("td", "", roleName(invite.role)),
      el("td", "", invite.status || "pending"),
      el("td", "", `${invite.usedCount || 0}/${invite.maxUses || 1}`),
      el("td", "", invite.expiresAt ? new Date(Number(invite.expiresAt)).toLocaleString() : "-"),
      tableCellNodeV31(revoke)
    );
    body.append(tr);
  });
  if (!body.children.length) {
    const tr = document.createElement("tr");
    const td = el("td", "empty", "생성된 초대코드가 없습니다.");
    td.colSpan = 7;
    tr.append(td);
    body.append(tr);
  }
  table.append(body);
  wrap.append(table);
  return wrap;
}

async function loginWithGoogleV34() {
  if (!window.PMFirebaseRuntime?.hasConfig?.()) {
    loginError.textContent = "Firebase 설정이 필요합니다. Vite dev 서버에서 실행하거나 Firebase 설정을 먼저 연결하세요.";
    return;
  }
  try {
    const firebaseUser = await window.PMAuthService.firebaseLoginWithGoogle();
    const user = syncFirebaseUserToLocalAuthV33(firebaseUser, firebaseUser.displayName || firebaseUser.email, "super_manager");
    authStateV31 = window.PMAuthService.loadAuthState();
    completeLoginV34(user);
  } catch (error) {
    loginError.textContent = firebaseErrorMessageV35(error, "Google 로그인에 실패했습니다.");
  }
}

function firebaseErrorMessageV35(error, fallback) {
  const code = error?.code || "";
  const message = error?.message || "";
  if (code.includes("unauthorized-domain") || message.includes("auth/unauthorized-domain")) {
    return "Firebase 승인 도메인 오류입니다. Firebase Console > Authentication > Settings > Authorized domains에 localhost와 127.0.0.1을 추가하세요.";
  }
  if (code.includes("popup-blocked") || message.includes("popup")) return "팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (code.includes("user-not-found")) return "가입되지 않은 이메일입니다.";
  if (code.includes("email-already-in-use")) return "이미 가입된 이메일입니다.";
  return message || fallback;
}

function scheduleLoginFailureFallbackV85() {
  return setTimeout(() => {
    const stillOnLogin = loginScreen && !loginScreen.classList.contains("hidden");
    if (!stillOnLogin || !loginError) return;
    const currentMessage = loginError.textContent.trim();
    if (!currentMessage || currentMessage === "로그인 확인 중입니다...") {
      loginError.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
    }
  }, 5000);
}

function clearLoginFailureFallbackV85(timer) {
  if (timer) clearTimeout(timer);
}

function completeLoginV34(user) {
  user.lastLoginAt = new Date().toISOString();
  authStateV31.auth.currentUserId = user.id;
  authStateV31.auth.sessionStartedAt = new Date().toISOString();
  saveAuthStateV31();
  currentUser = authUserToLegacyV31(user);
  const workspaceId = activateWorkspaceForUserV36(currentUser);
  window.PMSessionService?.startSession?.(user.id);
  window.PMDeviceService?.registerLoginDevice?.(user.uid || user.id, workspaceId);
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  updateGreeting();
  buildNav();
  renderPage(user.role === "print_account" ? "print" : "dashboard");
}

async function logout() {
  clearAdminStandaloneAuthV62();
  try {
    if (window.PMFirebaseRuntime?.hasConfig?.()) await window.PMAuthService?.firebaseLogout?.();
  } catch (error) {
    console.warn("Firebase logout failed", error);
  }
  authStateV31.auth.currentUserId = null;
  saveAuthStateV31();
  clearSessionStateV36();
  window.PMSessionService?.endCurrentSession?.();
  sessionStorage.removeItem("pm-current-user");
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginForm.reset();
  renderInviteFromUrlV31();
}

async function restoreFirebaseSessionV34() {
  if (!window.PMFirebaseRuntime?.hasConfig?.()) return;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    if (!runtime) return;
    runtime.sdk.auth.onAuthStateChanged(runtime.auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (currentUser?.provider === "firebase") logout();
        return;
      }
      if (!canRestoreAdminStandaloneAuthV62()) {
        await runtime.sdk.auth.signOut(runtime.auth);
        showLoggedOutScreenV62();
        return;
      }
      if (currentUser) return;
      const membership = await window.PMAuthService.firebaseEnsureUserStructure(firebaseUser, firebaseUser.displayName || firebaseUser.email, "normal");
      firebaseUser.pmWorkspaceId = membership.workspaceId;
      firebaseUser.pmRole = membership.role;
      await window.PMAuthService.firebaseRegisterDevice(firebaseUser);
      const user = syncFirebaseUserToLocalAuthV33(firebaseUser, firebaseUser.displayName || firebaseUser.email, "normal");
      authStateV31 = window.PMAuthService.loadAuthState();
      completeLoginV34(user);
    });
  } catch (error) {
    console.warn("Firebase session restore failed", error);
  }
}

setupFirebaseReadyAuthUiV33();
restoreFirebaseSessionV34();

// Final V54: approval-based signup, system_owner console, and global notices.
var systemNoticesV54 = [];
var systemNoticeUnsubscribeV54 = null;
var systemOwnerStateV54 = {
  users: [],
  workspaces: [],
  workspaceMembers: [],
  workspaceNotices: [],
  joinRequests: [],
  adminApplications: [],
  systemNotices: [],
  systemIntegrations: [],
  systemIntegrationLogs: [],
  adminLogs: [],
  unsubscribers: []
};
var systemNoticeEditingIdV54 = "";
var workspaceNoticeUnsubscribeV60 = null;

function appTargetV60() {
  return window.PM_APP_TARGET || window.PM_FIREBASE_CONFIG?.appTarget || "main";
}

function isStandaloneAdminSiteV60() {
  return appTargetV60() === "admin-standalone";
}

function isAdminSurfaceV60() {
  return isStandaloneAdminSiteV60() || /^\/admin(?:\/|$)/.test(location.pathname || "");
}

const ADMIN_STANDALONE_SESSION_KEY_V62 = "pm-admin-standalone-session";
const ADMIN_STANDALONE_AUTH_ATTEMPT_KEY_V62 = "pm-admin-standalone-auth-attempt";

function adminStandaloneRequiresExplicitLoginV62() {
  return isStandaloneAdminSiteV60();
}

function beginAdminStandaloneAuthV62() {
  if (!adminStandaloneRequiresExplicitLoginV62()) return;
  sessionStorage.setItem(ADMIN_STANDALONE_AUTH_ATTEMPT_KEY_V62, "1");
}

function finishAdminStandaloneAuthV62(success) {
  if (!adminStandaloneRequiresExplicitLoginV62()) return;
  sessionStorage.removeItem(ADMIN_STANDALONE_AUTH_ATTEMPT_KEY_V62);
  if (success) sessionStorage.setItem(ADMIN_STANDALONE_SESSION_KEY_V62, "1");
  else sessionStorage.removeItem(ADMIN_STANDALONE_SESSION_KEY_V62);
}

function clearAdminStandaloneAuthV62() {
  sessionStorage.removeItem(ADMIN_STANDALONE_SESSION_KEY_V62);
  sessionStorage.removeItem(ADMIN_STANDALONE_AUTH_ATTEMPT_KEY_V62);
}

function canRestoreAdminStandaloneAuthV62() {
  if (!adminStandaloneRequiresExplicitLoginV62()) return true;
  return sessionStorage.getItem(ADMIN_STANDALONE_SESSION_KEY_V62) === "1"
    || sessionStorage.getItem(ADMIN_STANDALONE_AUTH_ATTEMPT_KEY_V62) === "1";
}

function showLoggedOutScreenV62() {
  authStateV31.auth.currentUserId = null;
  saveAuthStateV31();
  clearSessionStateV36();
  window.PMSessionService?.endCurrentSession?.();
  sessionStorage.removeItem("pm-current-user");
  app?.classList.add("hidden");
  loginScreen?.classList.remove("hidden");
}

function goToMyWorkspaceV60() {
  if (isStandaloneAdminSiteV60()) return;
  if (location.pathname !== "/") {
    history.pushState(null, "", "/");
  }
  renderPage("dashboard");
}

function workspaceNameV60(workspace) {
  return workspace?.name || workspace?.displayName || workspace?.workspaceId || workspace?.id || "";
}

function ensureSystemOwnerPatchV54() {
  pageMeta.systemOwner = pageMeta.systemOwner || ["⚙", "시스템 관리자"];
  store.settings.systemNoticeEnabled ??= true;
}

function roleDefinitionsV31() {
  return {
    system_owner: { label: "시스템 전체관리자", canInvite: [], sensitive: true, hiddenInUserApp: true },
    super_manager: { label: "최고 관리자", canInvite: ["manager", "teacher", "normal", "viewer", "print_account"], sensitive: true },
    manager: { label: "관리자", canInvite: ["teacher", "normal", "viewer", "print_account"], sensitive: true },
    teacher: { label: "선생님", canInvite: [], sensitive: false },
    normal: { label: "일반 사용자", canInvite: [], sensitive: false },
    viewer: { label: "열람 전용", canInvite: [], sensitive: false },
    print_account: { label: "프린트 전용", canInvite: [], sensitive: false },
    pending: { label: "승인 대기", canInvite: [], sensitive: false }
  };
}

function defaultRoleMenusV31() {
  return {
    system_owner: ["systemOwner", "dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "mealApplications", "timetable", "subjects", "teachers", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "portfolios", "projects", "afterschool", "specialLectures", "clubs", "people", "friendAwards", "penalties", "budget", "site", "accounts", "admin", "system", "print"],
    super_manager: ["dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "mealApplications", "timetable", "subjects", "teachers", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "portfolios", "projects", "afterschool", "specialLectures", "clubs", "people", "friendAwards", "penalties", "budget", "site", "accounts", "admin", "system", "print"],
    manager: ["dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "mealApplications", "timetable", "subjects", "teachers", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "portfolios", "projects", "afterschool", "specialLectures", "clubs", "penalties", "budget", "site", "accounts", "admin", "print"],
    teacher: ["dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "meals", "timetable", "subjects", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "projects", "afterschool", "specialLectures", "clubs"],
    normal: ["dashboard", "personal", "attendance", "requests", "schedules", "academic", "notices", "meals", "mealApplications", "timetable", "materials", "assignments", "examSchedules", "exams", "records", "projects", "portfolios", "afterschool", "specialLectures", "clubs"],
    viewer: ["dashboard", "personal", "requests", "schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "timetable", "materials", "examSchedules", "records", "projects", "portfolios"],
    print_account: ["print", "examSchedules"],
    pending: []
  };
}

function defaultActionPermissionsV31() {
  const menus = defaultRoleMenusV31();
  const roles = ["system_owner", "super_manager", "manager", "teacher", "normal", "viewer", "print_account", "pending"];
  const readOnly = {};
  Object.keys(pageMeta).forEach((key) => {
    readOnly[key] = { view: roles.filter((role) => menus[role]?.includes(key)), create: [], edit: [], del: [] };
  });
  const writeByRole = {
    system_owner: ["*"],
    super_manager: ["*"],
    manager: ["*"],
    teacher: ["attendance", "schedules", "notices", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "projects", "afterschool", "specialLectures", "clubs", "timetable"],
    normal: ["attendance", "schedules", "notices", "mealApplications", "assignments", "exams", "records", "lessons", "projects", "portfolios", "timetable"],
    viewer: [],
    print_account: [],
    pending: []
  };
  Object.keys(readOnly).forEach((key) => {
    roles.forEach((role) => {
      const canWrite = writeByRole[role]?.includes("*") || writeByRole[role]?.includes(key);
      if (canWrite) {
        readOnly[key].create.push(role);
        readOnly[key].edit.push(role);
      }
      if (["system_owner", "super_manager", "manager"].includes(role)) readOnly[key].del.push(role);
    });
  });
  return readOnly;
}

function roleName(role) {
  return roleDefinitionsV31()[role]?.label || { admin: "관리자", user: "일반 사용자", print: "프린트 전용" }[role] || role || "";
}

function authUserToLegacyV31(user) {
  const workspaceId = user.workspace_id || user.workspaceId || user.currentWorkspaceId || user.pmWorkspaceId || "";
  return {
    id: user.id || user.uid,
    uid: user.uid || user.id,
    name: user.name || user.displayName || user.email,
    displayName: user.displayName || user.name || user.email,
    email: user.email,
    password: user.password || "",
    role: user.role || "pending",
    currentRole: user.currentRole || user.role || "pending",
    globalRole: user.globalRole || (user.role === "system_owner" ? "system_owner" : "user"),
    workspaceRole: user.workspaceRole || user.pmWorkspaceRole || (user.role === "system_owner" ? "super_manager" : user.role || "pending"),
    status: user.status || (workspaceId ? "active" : "pending"),
    pendingWorkspaceId: user.pendingWorkspaceId || "",
    pin: user.pin || "1234",
    active: user.active !== false && user.disabled !== true,
    disabled: user.disabled === true,
    permissions: user.permissions || {},
    workspace_id: workspaceId,
    workspaceId,
    currentWorkspaceId: workspaceId,
    emailVerified: !!user.emailVerified,
    provider: user.provider || "local"
  };
}

function userWorkspaceIdV54(user = currentUser) {
  return user?.workspace_id || user?.workspaceId || user?.currentWorkspaceId || user?.pmWorkspaceId || "";
}

function userStatusV54(user = currentUser) {
  if (!user) return "signed_out";
  if (user.disabled === true || user.active === false) return "disabled";
  return user.status || (userWorkspaceIdV54(user) ? "active" : "pending");
}

function isApprovalGateUserV54(user = currentUser) {
  if (!user) return true;
  if (user.role === "system_owner" || user.currentRole === "system_owner" || user.globalRole === "system_owner") return false;
  const status = userStatusV54(user);
  return status === "pending" || status === "waiting_approval" || status === "rejected" || status === "disabled" || !userWorkspaceIdV54(user) || user.role === "pending";
}

function authCanManageUsersV31() {
  return ["system_owner", "super_manager", "manager"].includes(currentUser?.role);
}

function authMenuKeysV31(user = authCurrentUserV31()) {
  const target = user || currentUser;
  if (!target) return [];
  if (target.active === false || target.disabled === true) return [];
  if (isApprovalGateUserV54(target)) return [];
  if (target.role === "system_owner" && !userWorkspaceIdV54(target)) return ["systemOwner"];
  if (Array.isArray(target.menuOverrides) && target.menuOverrides.length) return target.menuOverrides;
  return defaultRoleMenusV31()[target.role] || [];
}

function navKeys() {
  ensureSystemOwnerPatchV54();
  return authMenuKeysV31().filter((key) => pageMeta[key] || ["schoolNotices", "homeLetters", "academic", "mealApplications", "afterschool", "specialLectures", "systemOwner"].includes(key));
}

function navGroupsV28() {
  const groups = [
    { id: "system-owner", label: "시스템 관리자", keys: ["systemOwner"] },
    { id: "home", label: "기본", keys: ["dashboard", "personal", "attendance", "requests"] },
    { id: "schedule", label: "일정/생활", keys: ["schedules", "academic", "notices", "schoolNotices", "homeLetters", "meals", "mealApplications", "timetable"] },
    { id: "study", label: "학습 관리", keys: ["subjects", "teachers", "materials", "lessons", "assignments", "examSchedules", "exams", "records", "portfolios"] },
    { id: "activity", label: "활동/프로젝트", keys: ["projects", "afterschool", "specialLectures", "clubs"] },
    { id: "admin", label: "관리자", keys: ["people", "friendAwards", "penalties", "budget", "site", "accounts", "admin", "system"] },
    { id: "print", label: "출력", keys: ["print"] }
  ];
  const available = new Set(navKeys());
  return groups.map((group) => ({ ...group, keys: group.keys.filter((key) => available.has(key)) })).filter((group) => group.keys.length);
}

function can(action, key) {
  const user = authCurrentUserV31() || currentUser;
  if (!user || user.active === false || user.disabled === true || !user.role || isApprovalGateUserV54(user)) return false;
  if (user.role === "system_owner") return key === "systemOwner" || !!userWorkspaceIdV54(user);
  if (key === "notices" && action === "create") return ["super_manager", "manager", "teacher", "normal"].includes(user.role);
  if (!authMenuKeysV31(user).includes(key) && action === "view") return false;
  const perm = authStateV31.permissions[key] || {};
  if (action === "view") return (perm.view || []).includes(user.role) || authMenuKeysV31(user).includes(key);
  if (user.extraPermissions?.[`${key}:${action}`] === true) return true;
  return (perm[action] || []).includes(user.role);
}

function isAdmin() {
  return ["system_owner", "super_manager", "manager"].includes(currentUser?.role);
}

function updateGreeting() {
  if (!currentUser) return;
  const name = currentUser.name || currentUser.displayName || currentUser.email || "";
  if (currentUser.role === "system_owner") roleLabel.textContent = `${name} 시스템관리자님 어서오십시오.`;
  else if (currentUser.role === "super_manager") roleLabel.textContent = `${name} 최고관리자님 어서오십시오.`;
  else if (currentUser.role === "manager") roleLabel.textContent = `${name} 관리자님 어서오십시오.`;
  else if (currentUser.role === "print_account") roleLabel.textContent = `${name} 프린트 전용계정입니다.`;
  else roleLabel.textContent = `${name} 사용자님 어서오십시오.`;
  syncSystemOwnerReturnButtonV58();
}

function syncFirebaseUserToLocalAuthV33(firebaseUser, displayName, fallbackRole) {
  const workspaceId = firebaseUser.pmWorkspaceId || firebaseUser.workspaceId || firebaseUser.currentWorkspaceId || "";
  const status = firebaseUser.pmStatus || (workspaceId ? "active" : "pending");
  const role = firebaseUser.pmRole || fallbackRole || (workspaceId ? "normal" : "pending");
  const globalRole = role === "system_owner" || firebaseUser.pmGlobalRole === "system_owner" ? "system_owner" : "user";
  const workspaceRole = firebaseUser.pmWorkspaceRole || (role === "system_owner" ? "super_manager" : role);
  authStateV31.workspace_members = authStateV31.workspace_members || [];
  const existingUser = authStateV31.users.find((item) => item.uid === firebaseUser.uid || item.id === firebaseUser.uid || item.email === firebaseUser.email);
  let user = existingUser;
  if (!user) {
    user = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: displayName || firebaseUser.email,
      displayName: displayName || firebaseUser.email,
      role,
      currentRole: role,
      workspaceRole,
      globalRole,
      workspace_id: workspaceId,
      workspaceId,
      currentWorkspaceId: workspaceId,
      status,
      active: status !== "disabled",
      disabled: status === "disabled",
      emailVerified: firebaseUser.emailVerified,
      provider: "firebase",
      createdAt: new Date().toISOString()
    };
    authStateV31.users.unshift(user);
  }
  user.emailVerified = firebaseUser.emailVerified;
  user.active = status !== "disabled";
  user.disabled = status === "disabled";
  user.status = status;
  user.workspace_id = workspaceId;
  user.workspaceId = workspaceId;
  user.currentWorkspaceId = workspaceId;
  user.pendingWorkspaceId = firebaseUser.pmPendingWorkspaceId || user.pendingWorkspaceId || "";
  user.role = role || user.role || "pending";
  user.currentRole = user.role;
  user.workspaceRole = workspaceRole;
  user.globalRole = globalRole;
  user.provider = "firebase";
  user.uid = firebaseUser.uid;
  user.id = user.id || firebaseUser.uid;
  user.name = user.name || displayName || firebaseUser.email;
  user.displayName = user.displayName || displayName || firebaseUser.email;

  if (workspaceId && status === "active") {
    const memberId = `${workspaceId}_${user.uid}`;
    const localMember = authStateV31.workspace_members.find((member) => member.id === memberId || (member.workspaceId === workspaceId && member.uid === user.uid));
    if (localMember) {
      localMember.role = workspaceRole;
      localMember.status = "active";
    } else {
      authStateV31.workspace_members.unshift({
        id: memberId,
        workspaceId,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.name || user.email,
        role: workspaceRole,
        status: "active",
        joinedAt: new Date().toISOString(),
        invitedBy: null
      });
    }
  }
  authWorkspaceStateV36 = { loading: false, error: "", currentWorkspaceId: workspaceId, currentRole: user.role, workspaceRole };
  saveAuthStateV31();
  return user;
}

function setApprovalGateModeV54(enabled) {
  app.classList.toggle("auth-gated", !!enabled);
  if (enabled) removeFloatingToolsV56();
  if (enabled) {
    nav?.replaceChildren();
    pageTitle.textContent = "승인 대기";
    roleLabel.textContent = currentUser?.email || "승인 대기";
  }
}

function stopSystemOwnerRealtimeV54() {
  (systemOwnerStateV54.unsubscribers || []).forEach((unsubscribe) => {
    try { if (typeof unsubscribe === "function") unsubscribe(); } catch {}
  });
  systemOwnerStateV54.unsubscribers = [];
  if (typeof workspaceNoticeUnsubscribeV60 === "function") {
    try { workspaceNoticeUnsubscribeV60(); } catch {}
  }
  workspaceNoticeUnsubscribeV60 = null;
}

function clearSessionStateV36() {
  window.PMWorkspaceDataService?.stop?.();
  stopWorkspaceMembersRealtimeV49();
  stopCurrentUserRealtimeV50();
  stopSystemOwnerRealtimeV54();
  if (typeof systemNoticeUnsubscribeV54 === "function") {
    try { systemNoticeUnsubscribeV54(); } catch {}
  }
  systemNoticeUnsubscribeV54 = null;
  systemNoticesV54 = [];
  currentUser = null;
  authWorkspaceStateV36 = { loading: false, error: "", currentWorkspaceId: "", currentRole: "" };
  currentPage = "dashboard";
  editing = null;
  pendingPasswordAction = null;
  store = emptyWorkspaceStoreV36("signed-out");
  app?.classList.remove("auth-gated");
  removeFloatingToolsV56();
  if (content) content.replaceChildren();
}

function renderApprovalGateV54(user = currentUser) {
  setApprovalGateModeV54(true);
  stopWorkspaceMembersRealtimeV49();
  window.PMWorkspaceDataService?.stop?.();
  content.replaceChildren();
  const status = userStatusV54(user);
  const box = panel(status === "rejected" ? "가입 신청 거절" : status === "disabled" ? "계정 비활성화" : status === "waiting_approval" ? "관리자 승인 대기" : "초대코드 입력");
  box.classList.add("approval-gate-panel");
  if (status === "waiting_approval") {
    box.append(el("p", "muted", "초대코드가 확인되었습니다. 관리자 승인 대기 중입니다. 승인 후 서비스를 이용할 수 있습니다."));
  } else if (status === "rejected") {
    box.append(el("p", "muted", "가입 신청이 거절되었습니다. 관리자에게 문의해주세요."));
  } else if (status === "disabled") {
    box.append(el("p", "muted", "비활성화된 계정입니다. 관리자에게 문의해주세요."));
  } else {
    box.append(el("p", "muted", "승인 전에는 대시보드와 사이드탭을 사용할 수 없습니다. 초대코드가 있으면 입력 후 관리자 승인을 기다려주세요."));
    const row = el("div", "form-grid");
    const code = document.createElement("input");
    code.placeholder = "PM-ABCD-1234";
    const submit = button("초대코드 제출");
    submit.addEventListener("click", async () => {
      try {
        submit.disabled = true;
        const result = await window.PMSystemAdminService.submitJoinRequest({ user, code: code.value });
        user.status = "waiting_approval";
        user.pendingWorkspaceId = result.workspaceId;
        const local = authStateV31.users.find((item) => item.uid === user.uid || item.id === user.id);
        if (local) Object.assign(local, user);
        saveAuthStateV31();
        showMessage("승인 대기", "초대코드가 확인되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다.");
        renderApprovalGateV54(user);
      } catch (error) {
        showMessage("초대코드 제출 실패", error.message || String(error));
      } finally {
        submit.disabled = false;
      }
    });
    row.append(makeField("초대코드", "approvalInviteCodeV54", code), submit);
    box.append(row);
  }
  const adminBtn = button("관리자인가요?", "ghost");
  adminBtn.addEventListener("click", () => renderAdminApplicationFormV54(user));
  box.append(el("div", "row-actions", ""), adminBtn);
  content.append(box);
}

function renderAdminApplicationFormV54(user = currentUser) {
  setApprovalGateModeV54(true);
  content.replaceChildren();
  const box = panel("관리자 신청서");
  const grid = el("div", "form-grid");
  const name = document.createElement("input");
  name.value = user?.displayName || user?.name || "";
  const mail = document.createElement("input");
  mail.type = "email";
  mail.value = user?.email || "";
  const phone = document.createElement("input");
  const org = document.createElement("input");
  const workspaceName = document.createElement("input");
  const reason = document.createElement("textarea");
  const memo = document.createElement("textarea");
  const submit = button("신청서 제출");
  submit.addEventListener("click", async () => {
    try {
      await window.PMSystemAdminService.submitAdminApplication({
        user,
        fields: {
          displayName: name.value,
          email: mail.value,
          phone: phone.value,
          organization: org.value,
          requestedWorkspaceName: workspaceName.value,
          reason: reason.value,
          memo: memo.value
        }
      });
      user.status = "waiting_approval";
      showMessage("접수 완료", "관리자 신청이 접수되었습니다. 확인 후 승인되면 서비스를 이용할 수 있습니다.");
      renderApprovalGateV54(user);
    } catch (error) {
      showMessage("신청 실패", error.message || String(error));
    }
  });
  grid.append(
    makeField("이름", "adminApplyNameV54", name),
    makeField("이메일", "adminApplyEmailV54", mail),
    makeField("연락처", "adminApplyPhoneV54", phone),
    makeField("소속/설명", "adminApplyOrgV54", org),
    makeField("원하는 workspace 이름", "adminApplyWorkspaceV54", workspaceName),
    makeField("관리자 신청 사유", "adminApplyReasonV54", reason),
    makeField("추가 메모", "adminApplyMemoV54", memo),
    submit
  );
  box.append(grid);
  content.append(box);
}

function completeLoginV34(user) {
  ensureSystemOwnerPatchV54();
  finishAdminStandaloneAuthV62(true);
  user.lastLoginAt = new Date().toISOString();
  authStateV31.auth.currentUserId = user.id;
  authStateV31.auth.sessionStartedAt = new Date().toISOString();
  saveAuthStateV31();
  currentUser = authUserToLegacyV31(user);
  currentUser.status = user.status;
  currentUser.pendingWorkspaceId = user.pendingWorkspaceId;
  currentUser.provider = user.provider || "local";
  currentUser.uid = user.uid || user.id;
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  window.PMSessionService?.startSession?.(user.id);
  if (isFirebaseBackedSessionV45()) startCurrentUserRealtimeV50();
  if (isApprovalGateUserV54(currentUser)) {
    renderApprovalGateV54(currentUser);
    return;
  }
  setApprovalGateModeV54(false);
  const workspaceId = userWorkspaceIdV54(currentUser);
  if (workspaceId) {
    activateWorkspaceForUserV36(currentUser);
    window.PMDeviceService?.registerLoginDevice?.(user.uid || user.id, workspaceId);
  }
  buildNav();
  updateGreeting();
  startSystemNoticeRealtimeV54(workspaceId);
  renderPage(isAdminSurfaceV60() ? "systemOwner" : currentUser.role === "system_owner" ? (workspaceId ? "dashboard" : "systemOwner") : currentUser.role === "print_account" ? "print" : "dashboard");
}

async function onLoginV33(event) {
  event.preventDefault();
  if (typeof beginBrowserAuthAttemptV80 === "function") beginBrowserAuthAttemptV80();
  event.stopImmediatePropagation();
  const loginFailureFallbackTimerV85 = scheduleLoginFailureFallbackV85();
  loginError.textContent = "로그인 확인 중입니다...";
  ensureSystemOwnerPatchV54();
  beginAdminStandaloneAuthV62();
  const targetEmail = email.value.trim().toLowerCase();
  let user = authStateV31.users.find((item) => item.email.toLowerCase() === targetEmail);
  if (window.PMFirebaseRuntime?.hasConfig?.()) {
    try {
      const firebaseUser = await window.PMAuthService.firebaseLoginWithEmail(targetEmail, password.value);
      user = syncFirebaseUserToLocalAuthV33(firebaseUser, firebaseUser.displayName || targetEmail, user?.role || "pending");
      authStateV31 = window.PMAuthService.loadAuthState();
    } catch (error) {
      finishAdminStandaloneAuthV62(false);
      loginError.textContent = firebaseErrorMessageV35(error, "Firebase 로그인에 실패했습니다.");
      return;
    }
  } else if (!await window.PMAuthService.verifyLocalPassword(user, password.value)) {
    finishAdminStandaloneAuthV62(false);
    loginError.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
    return;
  }
  if (!user) {
    finishAdminStandaloneAuthV62(false);
    loginError.textContent = "계정 정보를 찾을 수 없습니다.";
    return;
  }
  if (user.disabled === true || user.status === "disabled") {
    finishAdminStandaloneAuthV62(false);
    loginError.textContent = "비활성화된 계정입니다. 관리자에게 문의하세요.";
    return;
  }
  if (!user.emailVerified) {
    finishAdminStandaloneAuthV62(false);
    loginError.textContent = "이메일 인증 후 로그인할 수 있습니다.";
    return;
  }
  clearLoginFailureFallbackV85(loginFailureFallbackTimerV85);
  completeLoginV34(user);
}

async function loginWithGoogleV34() {
  if (!window.PMFirebaseRuntime?.hasConfig?.()) {
    loginError.textContent = "Firebase 설정이 필요합니다. Vite dev 서버에서 실행하거나 Firebase 설정을 먼저 연결하세요.";
    return;
  }
  try {
    beginAdminStandaloneAuthV62();
    const firebaseUser = await window.PMAuthService.firebaseLoginWithGoogle();
    const user = syncFirebaseUserToLocalAuthV33(firebaseUser, firebaseUser.displayName || firebaseUser.email, "pending");
    authStateV31 = window.PMAuthService.loadAuthState();
    completeLoginV34(user);
  } catch (error) {
    finishAdminStandaloneAuthV62(false);
    loginError.textContent = firebaseErrorMessageV35(error, "Google 로그인에 실패했습니다.");
  }
}

async function registerLocalUserV33() {
  try {
    const emailValue = document.getElementById("regEmailV33").value;
    const passwordValue = document.getElementById("regPasswordV33").value;
    const nameValue = document.getElementById("regNameV33").value;
    let user;
    if (window.PMFirebaseRuntime?.hasConfig?.()) {
      const firebaseUser = await window.PMAuthService.firebaseRegisterWithEmail(emailValue, passwordValue, nameValue);
      user = syncFirebaseUserToLocalAuthV33(firebaseUser, nameValue, "pending");
    } else {
      user = await window.PMAuthService.createLocalEmailUser(authStateV31, {
        email: emailValue,
        password: passwordValue,
        displayName: nameValue,
        role: "pending",
        status: "pending"
      });
    }
    authStateV31 = window.PMAuthService.loadAuthState();
    loginError.textContent = `${user.email} 가입 신청 계정을 만들었습니다. 이메일 인증 후 로그인하고 초대코드 또는 관리자 신청을 진행하세요.`;
  } catch (error) {
    loginError.textContent = error.message || String(error);
  }
}

async function registerWithInviteCodeV38() {
  try {
    const codeValue = document.getElementById("inviteSignupCodeV38").value.trim();
    const emailValue = document.getElementById("inviteSignupEmailV38").value.trim();
    const passwordValue = document.getElementById("inviteSignupPasswordV38").value;
    const nameValue = document.getElementById("inviteSignupNameV38").value.trim();
    if (!codeValue) throw new Error("초대코드를 입력하세요.");
    if (!emailValue || !passwordValue) throw new Error("이메일과 비밀번호를 입력하세요.");

    let user;
    if (window.PMFirebaseRuntime?.hasConfig?.()) {
      let firebaseUser;
      let usedExistingAccount = false;
      try {
        firebaseUser = await window.PMAuthService.firebaseRegisterWithEmail(emailValue, passwordValue, nameValue);
      } catch (error) {
        if (error?.code !== "auth/email-already-in-use") throw error;
        usedExistingAccount = true;
        firebaseUser = await window.PMAuthService.firebaseSignInWithEmailOnly(emailValue, passwordValue);
        const membership = await window.PMAuthService.firebaseEnsureUserStructure(firebaseUser, nameValue || emailValue, "pending");
        firebaseUser.pmWorkspaceId = membership.workspaceId;
        firebaseUser.pmRole = membership.role;
        firebaseUser.pmStatus = membership.status;
      }
      firebaseUser.displayName = firebaseUser.displayName || nameValue || emailValue;
      user = syncFirebaseUserToLocalAuthV33(firebaseUser, nameValue || emailValue, "pending");
      await window.PMSystemAdminService.submitJoinRequest({ user, code: codeValue });
      user.status = "waiting_approval";
      loginError.textContent = usedExistingAccount
        ? "기존 계정으로 초대코드 승인 요청을 보냈습니다. 관리자 승인 후 이용할 수 있습니다."
        : "초대코드가 확인되었습니다. 이메일 인증과 관리자 승인 후 이용할 수 있습니다.";
    } else {
      user = await window.PMAuthService.createLocalEmailUser(authStateV31, {
        email: emailValue,
        password: passwordValue,
        displayName: nameValue,
        role: "pending",
        status: "waiting_approval"
      });
      loginError.textContent = "로컬 개발 모드에서는 승인 대기 구조만 생성했습니다.";
    }
    authStateV31 = window.PMAuthService.loadAuthState();
    saveAuthStateV31();
  } catch (error) {
    loginError.textContent = inviteSignupErrorMessageV38(error);
  }
}

async function restoreFirebaseSessionV34() {
  if (!window.PMFirebaseRuntime?.hasConfig?.()) return;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    if (!runtime) return;
    runtime.sdk.auth.onAuthStateChanged(runtime.auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (currentUser?.provider === "firebase") logout();
        return;
      }
      if (currentUser) return;
      const membership = await window.PMAuthService.firebaseEnsureUserStructure(firebaseUser, firebaseUser.displayName || firebaseUser.email, "pending");
      firebaseUser.pmWorkspaceId = membership.workspaceId;
      firebaseUser.pmRole = membership.role;
      firebaseUser.pmStatus = membership.status;
      firebaseUser.pmPendingWorkspaceId = membership.pendingWorkspaceId;
      await window.PMAuthService.firebaseRegisterDevice(firebaseUser);
      const user = syncFirebaseUserToLocalAuthV33(firebaseUser, firebaseUser.displayName || firebaseUser.email, "pending");
      authStateV31 = window.PMAuthService.loadAuthState();
      completeLoginV34(user);
    });
  } catch (error) {
    console.warn("Firebase session restore failed", error);
  }
}

async function startCurrentUserRealtimeV50() {
  const uid = currentUser?.uid || currentUser?.id || "";
  if (!uid || !window.PMFirebaseRuntime?.hasConfig?.() || !isFirebaseBackedSessionV45()) return;
  if (currentUserDocUidV50 === uid && currentUserUnsubscribeV50) return;
  stopCurrentUserRealtimeV50();
  currentUserDocUidV50 = uid;
  currentUserUnsubscribeV50 = window.PMSystemAdminService.subscribeCurrentUser(uid, async (data) => {
    if (!data || !currentUser || (currentUser.uid || currentUser.id) !== uid) return;
    const previousGate = isApprovalGateUserV54(currentUser);
    const previousWorkspace = userWorkspaceIdV54(currentUser);
    const previousRole = currentUser.role;
    const previousGlobalOwner = currentUser.role === "system_owner" || currentUser.currentRole === "system_owner" || currentUser.globalRole === "system_owner";
    let ownerByRegistry = currentUserSystemOwnerCacheV61[uid] === true;
    if (!ownerByRegistry && window.PMSystemAdminService?.isSystemOwner) {
      try {
        ownerByRegistry = await window.PMSystemAdminService.isSystemOwner(uid);
        currentUserSystemOwnerCacheV61[uid] = ownerByRegistry;
      } catch (error) {
        console.warn("[PM system owner menu check] skipped", error?.code || "", error?.message || String(error));
      }
    }
    if (!currentUser || (currentUser.uid || currentUser.id) !== uid) return;
    currentUser.workspace_id = data.workspaceId || data.currentWorkspaceId || "";
    currentUser.workspaceId = currentUser.workspace_id;
    currentUser.currentWorkspaceId = currentUser.workspace_id;
    const keepSystemOwner = ownerByRegistry || previousGlobalOwner || data.role === "system_owner" || data.currentRole === "system_owner" || data.globalRole === "system_owner";
    currentUser.role = keepSystemOwner ? "system_owner" : data.currentRole || data.role || currentUser.role || "pending";
    currentUser.currentRole = currentUser.role;
    currentUser.globalRole = keepSystemOwner ? "system_owner" : data.globalRole || currentUser.globalRole || "user";
    currentUser.workspaceRole = data.workspaceRole || currentUser.workspaceRole || (keepSystemOwner ? "super_manager" : currentUser.role);
    currentUser.status = data.status || (currentUser.workspace_id ? "active" : "pending");
    currentUser.pendingWorkspaceId = data.pendingWorkspaceId || "";
    currentUser.disabled = data.disabled === true || currentUser.status === "disabled";
    currentUser.active = !currentUser.disabled;
    currentUser.emailVerified = data.emailVerified !== false;
    const localUser = authStateV31.users.find((user) => user.uid === uid || user.id === uid);
    if (localUser) Object.assign(localUser, {
      workspace_id: currentUser.workspace_id,
      workspaceId: currentUser.workspaceId,
      currentWorkspaceId: currentUser.currentWorkspaceId,
      role: currentUser.role,
      currentRole: currentUser.currentRole,
      globalRole: currentUser.globalRole,
      workspaceRole: currentUser.workspaceRole,
      status: currentUser.status,
      pendingWorkspaceId: currentUser.pendingWorkspaceId,
      disabled: currentUser.disabled,
      active: currentUser.active
    });
    saveAuthStateV31();
    const nextGate = isApprovalGateUserV54(currentUser);
    if (nextGate) {
      renderApprovalGateV54(currentUser);
      return;
    }
    if (previousGate || previousWorkspace !== userWorkspaceIdV54(currentUser)) {
      setApprovalGateModeV54(false);
      activateWorkspaceForUserV36(currentUser);
      buildNav();
      startSystemNoticeRealtimeV54(userWorkspaceIdV54(currentUser));
      renderPage(isAdminSurfaceV60() ? "systemOwner" : currentUser.role === "system_owner" ? (userWorkspaceIdV54(currentUser) ? "dashboard" : "systemOwner") : currentUser.role === "print_account" ? "print" : "dashboard");
    } else if (previousRole !== currentUser.role) {
      buildNav();
      renderPage(currentPage || "dashboard");
    } else {
      updateGreeting();
    }
  }, (error) => {
    console.error(`[PM user profile sync] listener failed uid=${uid} code=${error?.code || ""} message=${error?.message || String(error)}`);
  });
  console.info(`[PM user profile sync] realtime listener started uid=${uid}`);
}

function startSystemNoticeRealtimeV54(workspaceId) {
  if (!window.PMFirebaseRuntime?.hasConfig?.() || !workspaceId || !currentUser || !isFirebaseBackedSessionV45() || isApprovalGateUserV54(currentUser)) return;
  if (typeof systemNoticeUnsubscribeV54 === "function") {
    try { systemNoticeUnsubscribeV54(); } catch {}
  }
  systemNoticeUnsubscribeV54 = window.PMSystemAdminService.subscribeSystemNotices(workspaceId, (items) => {
    systemNoticesV54 = items || [];
    if (["dashboard", "system"].includes(currentPage)) renderPage(currentPage);
  });
}

function renderSystemNoticesPanelV54() {
  const box = panel("시스템 공지");
  box.classList.add("dashboard-system-box", "global-system-notices");
  if (!store.settings.systemNoticeEnabled) {
    box.append(el("p", "muted", "홈페이지 관리에서 시스템 공지 표시가 비활성화되어 있습니다."));
    return box;
  }
  if (!systemNoticesV54.length) {
    box.append(el("p", "muted", "등록된 전역 시스템 공지가 없습니다."));
    return box;
  }
  systemNoticesV54.forEach((notice) => {
    const item = el("article", `system-notice-item priority-${notice.priority || "normal"}`);
    item.append(
      el("strong", "", `${notice.pinned ? "[고정] " : ""}${notice.title || "시스템 공지"}`),
      el("p", "", notice.content || ""),
      el("small", "muted", `${notice.priority || "normal"} · ${formatSystemTimeV54(notice.createdAt)} · ${notice.createdByEmail || ""}`)
    );
    box.append(item);
  });
  return box;
}

function renderDashboardV8() {
  renderDashboardV6();
  content.querySelectorAll(".system-notice").forEach((node) => node.remove());
  const existing = [...content.querySelectorAll(".panel-head h3")].find((node) => node.textContent === "시스템 공지")?.closest(".panel");
  if (existing) existing.remove();
  const systemBox = renderSystemNoticesPanelV54();
  const grid = content.querySelector(".dashboard-grid");
  if (grid) content.insertBefore(systemBox, grid);
  else content.append(systemBox);
}

function renderPage(key) {
  ensureAppV29();
  ensureSystemOwnerPatchV54();
  if (currentUser && isApprovalGateUserV54(currentUser)) {
    renderApprovalGateV54(currentUser);
    return;
  }
  if (currentUser?.role === "system_owner" && key !== "systemOwner" && !userWorkspaceIdV54(currentUser)) key = "systemOwner";
  if (currentUser && isAdminSurfaceV60() && key !== "systemOwner") key = "systemOwner";
  if (currentUser?.role === "print" && !["print", "examSchedules"].includes(key)) key = "print";
  if (["people", "friendAwards", "site", "admin", "budget", "system"].includes(key) && !isAdmin()) key = "dashboard";
  currentPage = key;
  if (content) content.dataset.page = key;
  document.body.dataset.pmPage = key;
  setApprovalGateModeV54(false);
  if (nav && !nav.children.length) buildNav();
  updateGreeting();
  ensureFloatingButtons();
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === key && !btn.dataset.programId));
  document.querySelector(".sidebar")?.classList.remove("open");
  pageTitle.textContent = pageLabel(key);
  updateRequestBadgeV6();
  if (key === "systemOwner") renderSystemOwnerConsoleV54();
  else if (key === "academic") renderAcademicV17();
  else if (key === "site") renderSiteV20();
  else if (key === "schoolNotices") renderSchoolNoticesV19();
  else if (key === "homeLetters") renderHomeLettersV18();
  else if (key === "dashboard") renderDashboardV8();
  else if (key === "personal") renderPersonalV8();
  else if (key === "schedules") renderSchedulesV10();
  else if (key === "lessons") renderLessonsV10();
  else if (key === "projects") renderProjectsV12();
  else if (key === "mealApplications") renderMealApplicationsV16();
  else if (key === "afterschool") renderProgramListV26("afterschool");
  else if (key === "specialLectures") renderProgramListV26("specialLectures");
  else if (key === "clubs") renderProgramListV26("clubs");
  else if (key === "system") renderSystemV12();
  else if (key === "attendance") renderCollectionV7("attendance");
  else if (key === "examSchedules") renderCollectionV7("examSchedules");
  else if (key === "records") renderCollectionV7("records");
  else if (key === "accounts") renderAccountsV17();
  else if (key === "materials" || key === "portfolios") renderCollectionV8(key);
  else if (key === "meals") renderCollectionV7("meals");
  else if (key === "budget") renderCollectionV7("budget");
  else if (key === "notices") renderCollectionV7("notices");
  else if (key === "penalties") renderPenaltiesV29();
  else if (key === "timetable") renderTimetableV29();
  else if (key === "print") renderPrintV8();
  else if (key === "admin") renderAdminV12();
  else if (key === "exams") renderExamsV6();
  else renderCollectionV7(key);
  if (key === "requests") appendSystemReportBoxV28();
  if (key !== "print") appendVersionInfoV16();
}

function applySystemOwnerWorkspaceV57(result) {
  const workspaceId = result?.workspaceId || "";
  if (!workspaceId || !currentUser) return;
  currentUser.workspace_id = workspaceId;
  currentUser.workspaceId = workspaceId;
  currentUser.currentWorkspaceId = workspaceId;
  currentUser.status = "active";
  currentUser.active = true;
  currentUser.disabled = false;
  const localUser = authStateV31.users.find((user) => user.uid === currentUser.uid || user.id === currentUser.id || user.email === currentUser.email);
  if (localUser) {
    localUser.workspace_id = workspaceId;
    localUser.workspaceId = workspaceId;
    localUser.currentWorkspaceId = workspaceId;
    localUser.role = "system_owner";
    localUser.currentRole = "system_owner";
    localUser.workspaceRole = "super_manager";
    localUser.status = "active";
    localUser.active = true;
    localUser.disabled = false;
  }
  authStateV31.workspaces = authStateV31.workspaces || [];
  const existingWorkspace = authStateV31.workspaces.find((workspace) => workspace.workspaceId === workspaceId);
  if (existingWorkspace) {
    existingWorkspace.name = result.workspaceName || existingWorkspace.name;
    existingWorkspace.ownerUid = currentUser.uid || currentUser.id;
    existingWorkspace.updatedAt = new Date().toISOString();
  } else {
    authStateV31.workspaces.unshift({
      workspaceId,
      name: result.workspaceName || `${currentUser.name || currentUser.email} workspace`,
      ownerUid: currentUser.uid || currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  authStateV31.workspace_members = authStateV31.workspace_members || [];
  const memberId = `${workspaceId}_${currentUser.uid || currentUser.id}`;
  const existingMember = authStateV31.workspace_members.find((member) => member.id === memberId || (member.workspaceId === workspaceId && member.uid === (currentUser.uid || currentUser.id)));
  const memberPayload = {
    id: memberId,
    workspaceId,
    uid: currentUser.uid || currentUser.id,
    email: currentUser.email,
    displayName: currentUser.displayName || currentUser.name || currentUser.email,
    role: "super_manager",
    status: "active",
    joinedAt: new Date().toISOString(),
    invitedBy: null
  };
  if (existingMember) Object.assign(existingMember, memberPayload);
  else authStateV31.workspace_members.unshift(memberPayload);
  saveAuthStateV31();
  activateWorkspaceForUserV36(currentUser);
}

function renderSystemOwnerWorkspacePanelV57() {
  if (isStandaloneAdminSiteV60()) {
    const box = panel("관리자 단독 사이트");
    box.append(el("p", "muted", "이 배포본은 전체 시스템 관리 전용입니다. 워크스페이스 이동 버튼은 표시하지 않습니다."));
    return box;
  }
  const box = panel("내 workspace 운영");
  const workspaceId = userWorkspaceIdV54(currentUser);
  const grid = el("div", "form-grid");
  const nameInput = document.createElement("input");
  nameInput.placeholder = "내 workspace 이름";
  nameInput.value = `${currentUser?.displayName || currentUser?.name || currentUser?.email || "내"} workspace`;
  const current = el("p", "muted", workspaceId
    ? `현재 연결된 workspace: ${workspaceId}. 시스템 오너 권한은 유지되고, 이 workspace에서는 최고관리자처럼 운영할 수 있습니다.`
    : "아직 오너 계정에 연결된 workspace가 없습니다. 아래 버튼으로 내 workspace를 만들면 대시보드와 모든 관리 메뉴를 사용할 수 있습니다.");
  const create = button(workspaceId ? "내 워크스페이스로 이동" : "내 workspace 만들기", "small");
  create.addEventListener("click", async () => {
    try {
      create.disabled = true;
      if (workspaceId) {
        goToMyWorkspaceV60();
        return;
      }
      const result = await window.PMSystemAdminService.ensureSystemOwnerWorkspace({ name: nameInput.value.trim() });
      applySystemOwnerWorkspaceV57(result);
      buildNav();
      showMessage("workspace 생성 완료", "오너 계정에 개인 workspace를 연결했습니다. 이제 대시보드에서 직접 운영할 수 있습니다.");
      goToMyWorkspaceV60();
    } catch (error) {
      showMessage("workspace 생성 실패", error.message || String(error));
    } finally {
      create.disabled = false;
    }
  });
  grid.append(makeField("workspace 이름", "systemOwnerWorkspaceNameV57", nameInput), create);
  box.append(current, grid);
  return box;
}

function renderSystemOwnerConsoleV54() {
  content.replaceChildren();
  if (currentUser?.role !== "system_owner") {
    content.append(el("div", "restricted", "system_owner만 접근할 수 있습니다."));
    return;
  }
  startSystemOwnerRealtimeV54();
  const header = el("div", "system-owner-hero");
  header.append(
    el("div", "", ""),
    el("p", "eyebrow", "System Owner Console"),
    el("h2", "", isStandaloneAdminSiteV60() ? "관리자 단독 사이트" : "통합 관리자 화면"),
    el("p", "muted", "가입 승인, 회원 권한, 시스템 공지, 워크스페이스 공지, API 연동과 감사 로그를 같은 Firebase 기준으로 실시간 관리합니다.")
  );
  const tabs = el("div", "system-owner-tabs");
  [
    ["join", "가입 신청"],
    ["admin", "관리자 신청"],
    ["users", "모든 회원"],
    ["notices", "시스템 공지"],
    ["workspaceNotices", "워크스페이스 공지"],
    ["integrations", "API 연동"],
    ["repair", "권한 점검/복구"],
    ["logs", "감사 로그"]
  ].forEach(([id, label]) => {
    const btn = button(label, "ghost");
    btn.dataset.systemOwnerTab = id;
    btn.classList.toggle("active", (sessionStorage.getItem("systemOwnerTabV54") || "join") === id);
    btn.addEventListener("click", () => {
      sessionStorage.setItem("systemOwnerTabV54", id);
      renderSystemOwnerConsoleV54();
    });
    tabs.append(btn);
  });
  content.append(header, renderSystemOwnerWorkspacePanelV57(), tabs);
  const tab = sessionStorage.getItem("systemOwnerTabV54") || "join";
  if (tab === "join") content.append(renderJoinRequestsAdminV54());
  else if (tab === "admin") content.append(renderAdminApplicationsV54());
  else if (tab === "users") content.append(renderAllUsersAdminV54());
  else if (tab === "notices") content.append(renderSystemNoticeAdminV54());
  else if (tab === "workspaceNotices") content.append(renderWorkspaceNoticeAdminV60());
  else if (tab === "integrations") content.append(renderSystemIntegrationAdminV60());
  else if (tab === "repair") content.append(renderPermissionRepairAdminV60());
  else content.append(renderAdminLogsV54());
}

function restartWorkspaceNoticeRealtimeV60(rerender) {
  if (typeof workspaceNoticeUnsubscribeV60 === "function") {
    try { workspaceNoticeUnsubscribeV60(); } catch {}
  }
  workspaceNoticeUnsubscribeV60 = null;
  const workspaceIds = (systemOwnerStateV54.workspaces || []).map((workspace) => workspace.id || workspace.workspaceId).filter(Boolean);
  if (!workspaceIds.length || !window.PMSystemAdminService?.subscribeWorkspaceNotices) {
    systemOwnerStateV54.workspaceNotices = [];
    rerender?.();
    return;
  }
  workspaceNoticeUnsubscribeV60 = window.PMSystemAdminService.subscribeWorkspaceNotices(workspaceIds, (rows) => {
    systemOwnerStateV54.workspaceNotices = rows || [];
    rerender?.();
  });
}

function startSystemOwnerRealtimeV54() {
  if (systemOwnerStateV54.unsubscribers.length) return;
  const rerender = () => {
    if (currentPage === "systemOwner") {
      clearTimeout(systemOwnerStateV54.timer);
      systemOwnerStateV54.timer = setTimeout(renderSystemOwnerConsoleV54, 120);
    }
  };
  systemOwnerStateV54.unsubscribers.push(
    window.PMSystemAdminService.subscribeJoinRequests((rows) => { systemOwnerStateV54.joinRequests = rows; rerender(); }),
    window.PMSystemAdminService.subscribeAdminApplications((rows) => { systemOwnerStateV54.adminApplications = rows; rerender(); }),
    window.PMSystemAdminService.subscribeUsers((rows) => { systemOwnerStateV54.users = rows; rerender(); }),
    window.PMSystemAdminService.subscribeWorkspaces((rows) => {
      systemOwnerStateV54.workspaces = (rows || []).sort((a, b) => workspaceNameV60(a).localeCompare(workspaceNameV60(b)));
      restartWorkspaceNoticeRealtimeV60(rerender);
      rerender();
    }),
    window.PMSystemAdminService.subscribeWorkspaceMembers((rows) => { systemOwnerStateV54.workspaceMembers = rows || []; rerender(); }),
    window.PMSystemAdminService.subscribeSystemNoticeAdmin((rows) => { systemOwnerStateV54.systemNotices = rows; rerender(); }),
    window.PMSystemAdminService.subscribeSystemIntegrations((rows) => { systemOwnerStateV54.systemIntegrations = rows || []; rerender(); }),
    window.PMSystemAdminService.subscribeSystemIntegrationLogs((rows) => { systemOwnerStateV54.systemIntegrationLogs = rows || []; rerender(); }),
    window.PMSystemAdminService.subscribeAdminLogs((rows) => { systemOwnerStateV54.adminLogs = rows; rerender(); })
  );
}

function renderJoinRequestsAdminV54() {
  const box = panel("가입 신청 목록");
  const rows = systemOwnerStateV54.joinRequests.filter((row) => (row.status || "pending") === "pending");
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>이름</th><th>이메일</th><th>uid</th><th>workspaceId</th><th>초대코드</th><th>신청일</th><th>상태</th><th>처리</th></tr></thead>";
  const body = document.createElement("tbody");
  rows.forEach((request) => {
    const role = document.createElement("select");
    ["normal", "teacher", "manager", "viewer", "print_account", "super_manager"].forEach((key) => role.append(option(key, roleName(key))));
    role.value = request.requestedRole || "normal";
    const view = button("뷰어", "ghost small");
    view.addEventListener("click", () => showMessage("가입 신청서", JSON.stringify(request, null, 2)));
    const approve = button("승인", "small");
    approve.addEventListener("click", async () => {
      await window.PMSystemAdminService.approveJoinRequest(request, role.value);
      showMessage("승인 완료", `${request.email || request.uid} 계정을 승인했습니다.`);
    });
    const reject = button("거절", "ghost small danger");
    reject.addEventListener("click", async () => {
      await window.PMSystemAdminService.rejectJoinRequest(request);
      showMessage("거절 완료", `${request.email || request.uid} 신청을 거절했습니다.`);
    });
    const actions = el("div", "row-actions");
    actions.append(role, view, approve, reject);
    const tr = document.createElement("tr");
    tr.append(
      el("td", "", request.displayName || "-"),
      el("td", "", request.email || "-"),
      el("td", "", request.uid || "-"),
      el("td", "", request.workspaceId || "-"),
      el("td", "", request.inviteCode || request.inviteCodeId || "-"),
      el("td", "", formatSystemTimeV54(request.createdAt)),
      el("td", "", request.status || "pending"),
      tableCellNodeV31(actions)
    );
    body.append(tr);
  });
  if (!rows.length) appendEmptyRowV54(body, 8, "대기 중인 가입 신청이 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(wrap);
  return box;
}

function renderAdminApplicationsV54() {
  const box = panel("관리자 신청 목록");
  const rows = systemOwnerStateV54.adminApplications.filter((row) => (row.status || "pending") === "pending");
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>이름</th><th>이메일</th><th>연락처</th><th>소속</th><th>신청 사유</th><th>신청일</th><th>처리</th></tr></thead>";
  const body = document.createElement("tbody");
  rows.forEach((application) => {
    const mode = document.createElement("select");
    mode.append(option("new", "새 workspace 생성"), option("existing", "기존 workspace 연결"));
    const workspaceId = document.createElement("input");
    workspaceId.placeholder = "기존 workspaceId 또는 새 이름";
    workspaceId.value = application.requestedWorkspaceName || "";
    const role = document.createElement("select");
    ["normal", "teacher", "manager", "super_manager", "viewer", "print_account"].forEach((key) => role.append(option(key, roleName(key))));
    role.value = "super_manager";
    const view = button("뷰어", "ghost small");
    view.addEventListener("click", () => showMessage("관리자 신청서", JSON.stringify(application, null, 2)));
    const approve = button("승인", "small");
    approve.addEventListener("click", async () => {
      await window.PMSystemAdminService.approveAdminApplication(application, {
        workspaceMode: mode.value,
        workspaceId: mode.value === "existing" ? workspaceId.value.trim() : "",
        workspaceName: workspaceId.value.trim() || application.requestedWorkspaceName,
        role: role.value
      });
      showMessage("승인 완료", `${application.email || application.uid} 관리자 신청을 승인했습니다.`);
    });
    const reject = button("거절", "ghost small danger");
    reject.addEventListener("click", async () => {
      await window.PMSystemAdminService.rejectAdminApplication(application);
      showMessage("거절 완료", `${application.email || application.uid} 관리자 신청을 거절했습니다.`);
    });
    const actions = el("div", "row-actions stacked-actions");
    actions.append(mode, workspaceId, role, view, approve, reject);
    const tr = document.createElement("tr");
    tr.append(
      el("td", "", application.displayName || "-"),
      el("td", "", application.email || "-"),
      el("td", "", application.phone || "-"),
      el("td", "", application.organization || "-"),
      el("td", "", application.reason || "-"),
      el("td", "", formatSystemTimeV54(application.createdAt)),
      tableCellNodeV31(actions)
    );
    body.append(tr);
  });
  if (!rows.length) appendEmptyRowV54(body, 7, "대기 중인 관리자 신청이 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(wrap);
  return box;
}

function renderAllUsersAdminV54() {
  const box = panel("모든 회원 보기");
  const filters = el("div", "form-grid system-owner-filters");
  const status = document.createElement("select");
  ["", "pending", "waiting_approval", "active", "rejected", "disabled"].forEach((key) => status.append(option(key, key || "전체 상태")));
  const role = document.createElement("select");
  ["", "pending", "normal", "teacher", "manager", "viewer", "print_account", "super_manager", "system_owner"].forEach((key) => role.append(option(key, key ? roleName(key) : "전체 역할")));
  const workspace = document.createElement("input");
  workspace.placeholder = "workspaceId";
  const search = document.createElement("input");
  search.placeholder = "이메일/이름 검색";
  [status, role, workspace, search].forEach((input) => {
    const key = `systemOwnerUserFilter:${input === status ? "status" : input === role ? "role" : input === workspace ? "workspace" : "search"}`;
    input.value = sessionStorage.getItem(key) || "";
  });
  const apply = button("필터 적용", "ghost");
  apply.addEventListener("click", () => {
    [
      [status, "status"],
      [role, "role"],
      [workspace, "workspace"],
      [search, "search"]
    ].forEach(([input, key]) => sessionStorage.setItem(`systemOwnerUserFilter:${key}`, input.value));
    renderSystemOwnerConsoleV54();
  });
  filters.append(makeField("상태", "ownerUserStatusV54", status), makeField("역할", "ownerUserRoleV54", role), makeField("workspaceId", "ownerUserWorkspaceV54", workspace), makeField("검색", "ownerUserSearchV54", search), apply);
  const rows = systemOwnerStateV54.users
    .filter((user) => !status.value || (user.status || (user.workspaceId ? "active" : "pending")) === status.value)
    .filter((user) => !role.value || (user.role || "pending") === role.value)
    .filter((user) => !workspace.value || String(user.workspaceId || user.currentWorkspaceId || "").includes(workspace.value))
    .filter((user) => {
      const q = search.value.trim().toLowerCase();
      return !q || `${user.email || ""} ${user.displayName || ""} ${user.name || ""}`.toLowerCase().includes(q);
    })
    .sort((a, b) => formatSortTimeV54(b.updatedAt || b.createdAt) - formatSortTimeV54(a.updatedAt || a.createdAt));
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>이름</th><th>이메일</th><th>uid</th><th>status</th><th>role</th><th>workspaceId</th><th>pendingWorkspaceId</th><th>createdAt</th><th>updatedAt</th></tr></thead>";
  const body = document.createElement("tbody");
  rows.forEach((user) => {
    const tr = document.createElement("tr");
    tr.append(
      el("td", "", user.displayName || user.name || "-"),
      el("td", "", user.email || "-"),
      el("td", "", user.uid || user.id || "-"),
      el("td", "", user.status || (user.workspaceId ? "active" : "pending")),
      el("td", "", roleName(user.role || "pending")),
      el("td", "", user.workspaceId || user.currentWorkspaceId || "-"),
      el("td", "", user.pendingWorkspaceId || "-"),
      el("td", "", formatSystemTimeV54(user.createdAt)),
      el("td", "", formatSystemTimeV54(user.updatedAt))
    );
    body.append(tr);
  });
  if (!rows.length) appendEmptyRowV54(body, 9, "조건에 맞는 회원이 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(filters, wrap);
  return box;
}

function renderSystemNoticeAdminV54() {
  const box = panel("시스템 공지 관리");
  const grid = el("div", "form-grid");
  const title = document.createElement("input");
  const contentInput = document.createElement("textarea");
  const priority = document.createElement("select");
  ["low", "normal", "high", "critical"].forEach((key) => priority.append(option(key, key)));
  priority.value = "normal";
  const pinned = document.createElement("input");
  pinned.type = "checkbox";
  const save = button("시스템 공지 저장");
  save.addEventListener("click", async () => {
    await window.PMSystemAdminService.saveSystemNotice({
      id: systemNoticeEditingIdV54,
      title: title.value,
      content: contentInput.value,
      priority: priority.value,
      pinned: pinned.checked,
      target: "all_workspaces",
      targetWorkspaceIds: []
    });
    showMessage("저장 완료", "전역 시스템 공지를 저장했습니다.");
    title.value = "";
    contentInput.value = "";
    pinned.checked = false;
    systemNoticeEditingIdV54 = "";
    save.textContent = "시스템 공지 저장";
  });
  grid.append(
    makeField("제목", "systemNoticeTitleV54", title),
    makeField("우선순위", "systemNoticePriorityV54", priority),
    makeField("상단 고정", "systemNoticePinnedV54", pinned),
    makeField("내용", "systemNoticeContentV54", contentInput),
    save
  );
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>제목</th><th>상태</th><th>우선순위</th><th>고정</th><th>대상</th><th>작성일</th><th>관리</th></tr></thead>";
  const body = document.createElement("tbody");
  systemOwnerStateV54.systemNotices
    .sort((a, b) => formatSortTimeV54(b.createdAt) - formatSortTimeV54(a.createdAt))
    .forEach((notice) => {
      const edit = button("수정", "ghost small");
      edit.addEventListener("click", () => {
        systemNoticeEditingIdV54 = notice.id;
        title.value = notice.title || "";
        contentInput.value = notice.content || "";
        priority.value = notice.priority || "normal";
        pinned.checked = !!notice.pinned;
        save.textContent = "수정 저장";
      });
      const archive = button("보관", "ghost small danger");
      archive.addEventListener("click", async () => {
        await window.PMSystemAdminService.archiveSystemNotice(notice.id);
        showMessage("보관 완료", "시스템 공지를 보관했습니다.");
      });
      const actions = el("div", "row-actions");
      actions.append(edit, archive);
      const tr = document.createElement("tr");
      tr.append(
        el("td", "", notice.title || "-"),
        el("td", "", notice.status || "active"),
        el("td", "", notice.priority || "normal"),
        el("td", "", notice.pinned ? "고정" : "-"),
        el("td", "", notice.target || "all_workspaces"),
        el("td", "", formatSystemTimeV54(notice.createdAt)),
        tableCellNodeV31(actions)
      );
      body.append(tr);
    });
  if (!systemOwnerStateV54.systemNotices.length) appendEmptyRowV54(body, 7, "등록된 시스템 공지가 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(grid, wrap);
  return box;
}

function renderWorkspaceNoticeAdminV60() {
  const box = panel("워크스페이스 공지 작성");
  box.append(el("p", "muted", "workspaceId 직접 입력 대신 Firestore workspaces 목록에서 선택합니다. 전체 워크스페이스 공지는 각 workspace의 일반 공지함에 같은 공지를 복사 등록합니다."));
  const workspaces = systemOwnerStateV54.workspaces || [];
  const grid = el("div", "form-grid workspace-notice-admin");
  const mode = document.createElement("select");
  mode.append(option("single", "특정 워크스페이스"), option("multiple", "여러 워크스페이스 선택"), option("all", "전체 워크스페이스 공지로 등록"));
  mode.value = sessionStorage.getItem("workspaceNoticeModeV60") || "single";
  const workspaceSelect = document.createElement("select");
  workspaceSelect.append(option("", "워크스페이스를 선택하세요"));
  workspaces.forEach((workspace) => workspaceSelect.append(option(workspace.id || workspace.workspaceId, workspaceNameV60(workspace))));
  workspaceSelect.value = sessionStorage.getItem("workspaceNoticeSingleV60") || "";
  const workspaceChecks = el("div", "workspace-check-grid");
  workspaces.forEach((workspace) => {
    const id = workspace.id || workspace.workspaceId;
    const check = document.createElement("input");
    check.type = "checkbox";
    check.value = id;
    check.dataset.workspaceNoticeTarget = id;
    const saved = splitLines(sessionStorage.getItem("workspaceNoticeMultipleV60") || "");
    check.checked = saved.includes(id);
    const label = document.createElement("label");
    label.append(check, document.createTextNode(` ${workspaceNameV60(workspace)}`));
    workspaceChecks.append(label);
  });
  const title = document.createElement("input");
  title.placeholder = "공지 제목";
  const contentInput = document.createElement("textarea");
  contentInput.placeholder = "공지 내용";
  const pinned = document.createElement("input");
  pinned.type = "checkbox";
  const priority = document.createElement("select");
  ["low", "normal", "high", "critical"].forEach((key) => priority.append(option(key, key)));
  priority.value = "normal";
  const status = document.createElement("select");
  ["active", "archived"].forEach((key) => status.append(option(key, key)));
  const warning = el("p", "muted wide", "전체 서비스 공지는 “시스템 공지”를 권장합니다. 이 기능은 각 워크스페이스의 일반 공지함에 같은 공지를 복사합니다.");
  const save = button("워크스페이스 공지 등록");

  const syncMode = () => {
    sessionStorage.setItem("workspaceNoticeModeV60", mode.value);
    workspaceSelect.closest("label").style.display = mode.value === "single" ? "" : "none";
    workspaceChecks.closest("label").style.display = mode.value === "multiple" ? "" : "none";
    warning.style.display = mode.value === "all" ? "" : "none";
  };
  mode.addEventListener("change", syncMode);
  workspaceSelect.addEventListener("change", () => sessionStorage.setItem("workspaceNoticeSingleV60", workspaceSelect.value));
  workspaceChecks.addEventListener("change", () => {
    const values = [...workspaceChecks.querySelectorAll("[data-workspace-notice-target]:checked")].map((input) => input.value);
    sessionStorage.setItem("workspaceNoticeMultipleV60", values.join("\n"));
  });
  save.addEventListener("click", async () => {
    const checkedWorkspaceIds = [...workspaceChecks.querySelectorAll("[data-workspace-notice-target]:checked")].map((input) => input.value);
    const workspaceIds = mode.value === "single" ? [workspaceSelect.value].filter(Boolean) : checkedWorkspaceIds;
    try {
      save.disabled = true;
      const result = await window.PMSystemAdminService.createWorkspaceNotice({
        targetMode: mode.value,
        workspaceIds,
        allWorkspaceIds: workspaces.map((workspace) => workspace.id || workspace.workspaceId).filter(Boolean),
        title: title.value,
        content: contentInput.value,
        pinned: pinned.checked,
        priority: priority.value,
        status: status.value
      });
      showMessage("등록 완료", `${result.targetWorkspaceIds.length}개 워크스페이스 공지함에 등록했습니다.`);
      title.value = "";
      contentInput.value = "";
      pinned.checked = false;
    } catch (error) {
      showMessage("등록 실패", error.message || String(error));
    } finally {
      save.disabled = false;
    }
  });

  grid.append(
    makeField("공지 대상 선택", "workspaceNoticeModeV60", mode),
    makeField("워크스페이스 선택", "workspaceNoticeSingleSelectV60", workspaceSelect),
    makeField("여러 워크스페이스 선택", "workspaceNoticeMultiChecksV60", workspaceChecks),
    makeField("공지 제목", "workspaceNoticeTitleV60", title),
    makeField("우선순위", "workspaceNoticePriorityV60", priority),
    makeField("상단 고정 여부", "workspaceNoticePinnedV60", pinned),
    makeField("상태", "workspaceNoticeStatusV60", status),
    makeField("공지 내용", "workspaceNoticeContentV60", contentInput),
    warning,
    save
  );
  box.append(grid);
  syncMode();

  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>workspace</th><th>제목</th><th>상태</th><th>우선순위</th><th>고정</th><th>작성자</th><th>작성일</th></tr></thead>";
  const body = document.createElement("tbody");
  (systemOwnerStateV54.workspaceNotices || [])
    .sort((a, b) => formatSortTimeV54(b.createdAt) - formatSortTimeV54(a.createdAt))
    .slice(0, 80)
    .forEach((notice) => {
      const workspace = workspaces.find((item) => (item.id || item.workspaceId) === notice.workspaceId);
      const tr = document.createElement("tr");
      tr.append(
        el("td", "", workspaceNameV60(workspace) || notice.workspaceId || "-"),
        el("td", "", notice.title || "-"),
        el("td", "", notice.status || "active"),
        el("td", "", notice.priority || "normal"),
        el("td", "", notice.pinned ? "고정" : "-"),
        el("td", "", notice.authorEmail || notice.authorUid || "-"),
        el("td", "", formatSystemTimeV54(notice.createdAt))
      );
      body.append(tr);
    });
  if (!body.children.length) appendEmptyRowV54(body, 7, "워크스페이스 공지가 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(wrap);
  return box;
}

function renderSystemIntegrationAdminV60() {
  const box = panel("시스템 API 연동 관리");
  box.append(el("p", "muted", "API Key 원문은 Firestore에 저장하지 않습니다. Netlify Environment Variables 또는 Netlify Functions에서만 사용하도록 메타데이터만 관리합니다."));
  const neis = (systemOwnerStateV54.systemIntegrations || []).find((item) => item.id === "neis" || item.provider === "neis") || {};
  const grid = el("div", "form-grid");
  const displayName = document.createElement("input");
  displayName.value = neis.displayName || "나이스 API";
  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.checked = neis.enabled === true;
  const status = document.createElement("select");
  ["not_configured", "disabled", "ready", "error"].forEach((key) => status.append(option(key, key)));
  status.value = neis.status || "not_configured";
  const envKey = document.createElement("input");
  envKey.value = neis.envKeyName || "NEIS_API_KEY";
  envKey.readOnly = true;
  const save = button("연동 설정 저장");
  const test = button("API 테스트", "ghost");
  save.addEventListener("click", async () => {
    try {
      await window.PMSystemAdminService.saveSystemIntegration("neis", {
        displayName: displayName.value,
        enabled: enabled.checked,
        status: status.value,
        envKeyName: envKey.value
      });
      showMessage("저장 완료", "나이스 API 연동 메타데이터를 저장했습니다.");
    } catch (error) {
      showMessage("저장 실패", error.message || String(error));
    }
  });
  test.addEventListener("click", async () => {
    try {
      const result = await window.PMSystemAdminService.testSystemIntegration("neis");
      showMessage("테스트 결과", result.message || JSON.stringify(result, null, 2));
    } catch (error) {
      showMessage("테스트 실패", error.message || String(error));
    }
  });
  grid.append(
    makeField("연동명", "integrationDisplayNameV60", displayName),
    makeField("활성화", "integrationEnabledV60", enabled),
    makeField("상태", "integrationStatusV60", status),
    makeField("Netlify 환경변수명", "integrationEnvKeyV60", envKey),
    save,
    test
  );
  box.append(grid);
  const result = neis.lastTestResult ? JSON.stringify(neis.lastTestResult, null, 2) : "테스트 기록 없음";
  box.append(el("pre", "admin-code-block", `마지막 테스트: ${formatSystemTimeV54(neis.lastTestedAt)}\n${result}`));
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>provider</th><th>작업</th><th>결과</th><th>시간</th></tr></thead>";
  const body = document.createElement("tbody");
  (systemOwnerStateV54.systemIntegrationLogs || [])
    .sort((a, b) => formatSortTimeV54(b.createdAt) - formatSortTimeV54(a.createdAt))
    .slice(0, 30)
    .forEach((log) => {
      const tr = document.createElement("tr");
      tr.append(
        el("td", "", log.provider || "-"),
        el("td", "", log.action || "-"),
        el("td", "", log.result?.message || JSON.stringify(log.result || {})),
        el("td", "", formatSystemTimeV54(log.createdAt))
      );
      body.append(tr);
    });
  if (!body.children.length) appendEmptyRowV54(body, 4, "API 연동 로그가 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(wrap);
  return box;
}

function repairWorkspaceIdV61(user = {}) {
  return user.workspaceId || user.currentWorkspaceId || user.workspace_id || user.pendingWorkspaceId || "";
}

function repairMemberForUserV61(user = {}) {
  const uid = user.uid || user.id || "";
  const workspaceId = repairWorkspaceIdV61(user);
  if (!uid || !workspaceId) return null;
  return (systemOwnerStateV54.workspaceMembers || []).find((item) => {
    const itemWorkspaceId = item.workspaceId || item.currentWorkspaceId || item.workspace_id || "";
    const itemUid = item.uid || item.id || "";
    return itemUid === uid && (
      itemWorkspaceId === workspaceId
      || item.id === `${workspaceId}_${uid}`
    );
  }) || null;
}

function applyPermissionRepairResultV61(user = {}, result = {}) {
  const uid = result.uid || user.uid || user.id || "";
  const workspaceId = result.workspaceId || repairWorkspaceIdV61(user);
  if (!uid || !workspaceId) return;
  const role = result.role || user.workspaceRole || user.currentRole || user.role || "normal";
  const status = result.status || user.status || "active";
  const member = {
    id: `${workspaceId}_${uid}`,
    uid,
    email: user.email || result.email || "",
    displayName: user.displayName || user.name || result.displayName || user.email || uid,
    role,
    status,
    workspaceId,
    workspace_id: workspaceId,
    rootMemberExists: result.rootMemberExists !== false,
    nestedMemberExists: result.nestedMemberExists !== false,
    repairedAt: new Date().toISOString()
  };
  systemOwnerStateV54.workspaceMembers = (systemOwnerStateV54.workspaceMembers || [])
    .filter((item) => {
      const itemUid = item.uid || item.id || "";
      const itemWorkspaceId = item.workspaceId || item.currentWorkspaceId || item.workspace_id || "";
      return !(itemUid === uid && (itemWorkspaceId === workspaceId || item.id === `${workspaceId}_${uid}`));
    });
  systemOwnerStateV54.workspaceMembers.unshift(member);
  const localUser = (systemOwnerStateV54.users || []).find((item) => (item.uid || item.id) === uid);
  if (localUser) {
    localUser.workspaceId = workspaceId;
    localUser.currentWorkspaceId = workspaceId;
    localUser.workspace_id = workspaceId;
    localUser.role = role;
    localUser.currentRole = role;
    localUser.workspaceRole = role;
    localUser.status = status;
  }
}

async function refreshPermissionRepairMembersV62() {
  if (!window.PMSystemAdminService?.listWorkspaceMembers) return false;
  const rows = await window.PMSystemAdminService.listWorkspaceMembers();
  systemOwnerStateV54.workspaceMembers = rows || [];
  return true;
}

function renderPermissionRepairAdminV60() {
  const box = panel("권한 꼬임 점검/복구");
  box.append(el("p", "muted", "users 문서의 role/workspaceId와 workspaces/{workspaceId}/members/{uid} 문서를 비교하고 누락된 멤버 문서를 복구합니다."));
  const rows = (systemOwnerStateV54.users || []).filter((user) => user.role !== "system_owner");
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>이메일</th><th>users.role</th><th>workspaceId</th><th>members.role</th><th>상태</th><th>복구</th></tr></thead>";
  const body = document.createElement("tbody");
  rows.forEach((user) => {
    const uid = user.uid || user.id || "";
    const workspaceId = repairWorkspaceIdV61(user);
    const member = repairMemberForUserV61(user);
    const userRole = user.workspaceRole || user.currentRole || user.role || "";
    const memberRole = member?.role || "";
    const issue = !workspaceId
      ? "workspace 없음"
      : !member
        ? "members 누락"
        : memberRole !== userRole
          ? "role 불일치"
          : "정상";
    const syncState = member && issue === "정상"
      ? `정상${member.rootMemberExists === false ? " · root 미확인" : ""}${member.nestedMemberExists === false ? " · nested 미확인" : ""}`
      : issue;
    const repair = button("점검/복구", "ghost small");
    repair.disabled = !workspaceId;
    repair.addEventListener("click", async () => {
      try {
        const result = await window.PMSystemAdminService.repairUserPermission({ ...user, workspaceId });
        applyPermissionRepairResultV61(user, result);
        await refreshPermissionRepairMembersV62();
        showMessage("복구 완료", `${user.email || uid} 권한 문서를 동기화했습니다. root=${result.rootMemberExists ? "확인" : "미확인"}, nested=${result.nestedMemberExists ? "확인" : "미확인"}`);
        renderSystemOwnerConsoleV54();
      } catch (error) {
        showMessage("복구 실패", error.message || String(error));
      }
    });
    const tr = document.createElement("tr");
    tr.append(
      el("td", "", user.email || uid || "-"),
      el("td", "", roleName(userRole || "pending")),
      el("td", "", workspaceId || "-"),
      el("td", "", member ? roleName(memberRole || "pending") : "-"),
      el("td", issue === "정상" && !syncState.includes("미확인") ? "ok" : "warn", syncState),
      tableCellNodeV31(repair)
    );
    body.append(tr);
  });
  if (!rows.length) appendEmptyRowV54(body, 6, "점검할 일반 회원이 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(wrap);
  return box;
}

function renderAdminLogsV54() {
  const box = panel("감사 로그");
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>작업</th><th>owner</th><th>대상</th><th>workspace</th><th>시간</th></tr></thead>";
  const body = document.createElement("tbody");
  systemOwnerStateV54.adminLogs
    .sort((a, b) => formatSortTimeV54(b.createdAt) - formatSortTimeV54(a.createdAt))
    .forEach((log) => {
      const tr = document.createElement("tr");
      tr.append(
        el("td", "", log.action || "-"),
        el("td", "", log.ownerEmail || log.ownerUid || "-"),
        el("td", "", log.targetUid || log.noticeId || "-"),
        el("td", "", log.workspaceId || "-"),
        el("td", "", formatSystemTimeV54(log.createdAt))
      );
      body.append(tr);
    });
  if (!systemOwnerStateV54.adminLogs.length) appendEmptyRowV54(body, 5, "감사 로그가 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(wrap);
  return box;
}

function appendEmptyRowV54(body, colSpan, text) {
  const tr = document.createElement("tr");
  const td = el("td", "empty", text);
  td.colSpan = colSpan;
  tr.append(td);
  body.append(tr);
}

function formatSortTimeV54(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatSystemTimeV54(value) {
  const time = formatSortTimeV54(value);
  return time ? new Date(time).toLocaleString() : "-";
}

function removeFloatingToolsV56() {
  document.getElementById("floatingTools")?.remove();
  document.getElementById("quickPopup")?.remove();
}

function shouldShowFloatingToolsV56() {
  if (!currentUser) return false;
  if (!app || app.classList.contains("hidden") || app.classList.contains("auth-gated")) return false;
  if (loginScreen && !loginScreen.classList.contains("hidden")) return false;
  if (currentPage === "print" || document.body.classList.contains("print-mode-active")) return false;
  if (typeof isApprovalGateUserV54 === "function" && isApprovalGateUserV54(currentUser)) return false;
  return true;
}

function ensureFloatingButtons() {
  if (!shouldShowFloatingToolsV56()) {
    removeFloatingToolsV56();
    return;
  }
  let tools = document.getElementById("floatingTools");
  if (!tools) {
    tools = el("div", "floating-tools");
    tools.id = "floatingTools";
    document.body.append(tools);
  }
  tools.replaceChildren();
  const meal = button("", "float-btn meal-float");
  meal.title = "급식 빠른 보기";
  meal.setAttribute("aria-label", "급식 빠른 보기");
  meal.innerHTML = '<span class="float-icon fork-icon">🍽</span>';
  meal.addEventListener("click", () => showQuickPopup("meals"));
  const time = button("", "float-btn time-float");
  time.title = "시간표 빠른 보기";
  time.setAttribute("aria-label", "시간표 빠른 보기");
  time.innerHTML = '<span class="float-icon clock-icon">◷</span>';
  time.addEventListener("click", () => showQuickPopup("timetable"));
  tools.append(meal, time);
}

function renderAllUsersAdminV54() {
  const box = panel("모든 회원 보기");
  box.append(el("p", "muted", "회원 비활성화/Firestore 기록 삭제는 앱 데이터 접근을 막거나 계정 기록을 정리합니다. Firebase Authentication 계정 자체 삭제는 로컬 Admin SDK 스크립트를 사용하세요."));
  const filters = el("div", "form-grid system-owner-filters");
  const status = document.createElement("select");
  ["", "pending", "waiting_approval", "active", "rejected", "disabled"].forEach((key) => status.append(option(key, key || "전체 상태")));
  const role = document.createElement("select");
  ["", "pending", "normal", "teacher", "manager", "viewer", "print_account", "super_manager", "system_owner"].forEach((key) => role.append(option(key, key ? roleName(key) : "전체 역할")));
  const workspace = document.createElement("input");
  workspace.placeholder = "workspaceId";
  const search = document.createElement("input");
  search.placeholder = "이메일/이름 검색";
  [status, role, workspace, search].forEach((input) => {
    const key = `systemOwnerUserFilter:${input === status ? "status" : input === role ? "role" : input === workspace ? "workspace" : "search"}`;
    input.value = sessionStorage.getItem(key) || "";
  });
  const apply = button("필터 적용", "ghost");
  apply.addEventListener("click", () => {
    [
      [status, "status"],
      [role, "role"],
      [workspace, "workspace"],
      [search, "search"]
    ].forEach(([input, key]) => sessionStorage.setItem(`systemOwnerUserFilter:${key}`, input.value));
    renderSystemOwnerConsoleV54();
  });
  filters.append(
    makeField("상태", "ownerUserStatusV56", status),
    makeField("역할", "ownerUserRoleV56", role),
    makeField("workspaceId", "ownerUserWorkspaceV56", workspace),
    makeField("검색", "ownerUserSearchV56", search),
    apply
  );
  const rows = systemOwnerStateV54.users
    .filter((user) => !status.value || (user.status || (user.workspaceId ? "active" : "pending")) === status.value)
    .filter((user) => !role.value || (user.role || "pending") === role.value)
    .filter((user) => !workspace.value || String(user.workspaceId || user.currentWorkspaceId || "").includes(workspace.value))
    .filter((user) => {
      const q = search.value.trim().toLowerCase();
      return !q || `${user.email || ""} ${user.displayName || ""} ${user.name || ""}`.toLowerCase().includes(q);
    })
    .sort((a, b) => formatSortTimeV54(b.updatedAt || b.createdAt) - formatSortTimeV54(a.updatedAt || a.createdAt));
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>이름</th><th>이메일</th><th>uid</th><th>status</th><th>role</th><th>workspaceId</th><th>pendingWorkspaceId</th><th>createdAt</th><th>updatedAt</th><th>관리</th></tr></thead>";
  const body = document.createElement("tbody");
  rows.forEach((user) => {
    const uid = user.uid || user.id || "";
    const protectedUser = !uid || uid === (currentUser?.uid || currentUser?.id) || (user.role || user.currentRole) === "system_owner";
    const userStatus = user.status || (user.workspaceId ? "active" : "pending");
    const userRole = user.role || user.currentRole || "pending";
    const userWorkspace = user.workspaceId || user.currentWorkspaceId || "";
    const statusSelect = document.createElement("select");
    ["pending", "waiting_approval", "active", "rejected", "disabled"].forEach((key) => statusSelect.append(option(key, key)));
    statusSelect.value = userStatus;
    statusSelect.disabled = protectedUser;
    const roleSelect = document.createElement("select");
    const editableRoles = ["pending", "normal", "teacher", "manager", "viewer", "print_account", "super_manager"];
    if (!editableRoles.includes(userRole)) roleSelect.append(option(userRole, roleName(userRole)));
    editableRoles.forEach((key) => roleSelect.append(option(key, roleName(key))));
    roleSelect.value = userRole;
    roleSelect.disabled = protectedUser;
    const workspaceSelect = document.createElement("select");
    workspaceSelect.append(option("", "workspace 없음"));
    (systemOwnerStateV54.workspaces || []).forEach((workspaceRow) => {
      const id = workspaceRow.id || workspaceRow.workspaceId;
      workspaceSelect.append(option(id, workspaceNameV60(workspaceRow)));
    });
    if (userWorkspace && ![...workspaceSelect.options].some((item) => item.value === userWorkspace)) {
      workspaceSelect.append(option(userWorkspace, userWorkspace));
    }
    workspaceSelect.value = userWorkspace;
    workspaceSelect.disabled = protectedUser;
    const save = button("권한 저장", "small");
    save.disabled = protectedUser;
    save.addEventListener("click", async () => {
      try {
        await window.PMSystemAdminService.updateUserAdminFields({
          user,
          status: statusSelect.value,
          role: roleSelect.value,
          workspaceId: workspaceSelect.value
        });
        showMessage("저장 완료", "회원 status/role/workspace 연결을 저장했습니다.");
      } catch (error) {
        showMessage("저장 실패", error.message || String(error));
      }
    });
    const repair = button("복구", "ghost small");
    repair.disabled = !userWorkspace;
    repair.addEventListener("click", async () => {
      try {
        await window.PMSystemAdminService.repairUserPermission(user);
        showMessage("복구 완료", "회원 권한 문서를 동기화했습니다.");
      } catch (error) {
        showMessage("복구 실패", error.message || String(error));
      }
    });
    const disable = button("비활성화", "ghost small");
    disable.disabled = protectedUser || user.status === "disabled" || user.disabled === true;
    disable.addEventListener("click", async () => {
      if (!confirm(`${user.email || uid} 계정을 비활성화할까요?\n로그인은 차단되고 workspace 접근도 비활성 상태로 바뀝니다.`)) return;
      try {
        await window.PMSystemAdminService.disableUserAccount(user);
        showMessage("처리 완료", "회원 계정을 비활성화했습니다.");
      } catch (error) {
        showMessage("처리 실패", error.message || String(error));
      }
    });
    const remove = button("Firestore 삭제", "ghost small danger");
    remove.disabled = protectedUser;
    remove.title = "Firebase Authentication 계정은 삭제하지 않고 Firestore 사용자/멤버 기록만 삭제합니다.";
    remove.addEventListener("click", async () => {
      if (!confirm(`${user.email || uid} 계정의 Firestore 사용자/멤버 기록을 삭제할까요?\nFirebase Authentication 계정 삭제는 별도 스크립트가 필요합니다.`)) return;
      try {
        await window.PMSystemAdminService.deleteUserFirestoreProfile(user);
        showMessage("삭제 완료", "Firestore 사용자/멤버 기록을 삭제했습니다.");
      } catch (error) {
        showMessage("삭제 실패", error.message || String(error));
      }
    });
    const actions = el("div", "row-actions");
    actions.append(save, repair, disable, remove);
    const tr = document.createElement("tr");
    tr.append(
      el("td", "", user.displayName || user.name || "-"),
      el("td", "", user.email || "-"),
      el("td", "", uid || "-"),
      tableCellNodeV31(statusSelect),
      tableCellNodeV31(roleSelect),
      tableCellNodeV31(workspaceSelect),
      el("td", "", user.pendingWorkspaceId || "-"),
      el("td", "", formatSystemTimeV54(user.createdAt)),
      el("td", "", formatSystemTimeV54(user.updatedAt)),
      tableCellNodeV31(actions)
    );
    body.append(tr);
  });
  if (!rows.length) appendEmptyRowV54(body, 10, "조건에 맞는 회원이 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(filters, wrap);
  return box;
}

function authCurrentUserV31() {
  const currentId = currentUser?.uid || currentUser?.id || authStateV31.auth.currentUserId || "";
  const local = (authStateV31.users || []).find((user) => user.id === currentId || user.uid === currentId);
  if (!currentUser) return local || null;
  if (!local) return currentUser;
  return {
    ...local,
    ...currentUser,
    role: currentUser.role || local.role,
    currentRole: currentUser.currentRole || currentUser.role || local.currentRole || local.role,
    workspaceRole: currentUser.workspaceRole || local.workspaceRole || (currentUser.role === "system_owner" ? "super_manager" : currentUser.role || local.role),
    workspace_id: currentUser.workspace_id || local.workspace_id || local.workspaceId || local.currentWorkspaceId || "",
    workspaceId: currentUser.workspaceId || currentUser.workspace_id || local.workspaceId || local.workspace_id || "",
    currentWorkspaceId: currentUser.currentWorkspaceId || currentUser.workspace_id || local.currentWorkspaceId || local.workspaceId || "",
    active: currentUser.active !== false && currentUser.disabled !== true && local.disabled !== true,
    disabled: currentUser.disabled === true || local.disabled === true
  };
}

function syncSystemOwnerReturnButtonV58() {
  const topActions = document.getElementById("topActions") || document.querySelector(".top-actions");
  if (!topActions) return;
  let btn = document.getElementById("systemOwnerReturnBtnV58");
  const shouldShow = currentUser?.role === "system_owner" && userWorkspaceIdV54(currentUser) && currentPage !== "systemOwner";
  if (!shouldShow) {
    btn?.remove();
    return;
  }
  if (!btn) {
    btn = button("시스템 관리자", "ghost");
    btn.id = "systemOwnerReturnBtnV58";
    btn.addEventListener("click", () => renderPage("systemOwner"));
    const logout = document.getElementById("logoutBtn");
    topActions.insertBefore(btn, logout && logout.parentElement === topActions ? logout : topActions.firstChild);
  }
}

function effectiveMenuRoleV59(user = authCurrentUserV31()) {
  if (!user) return "";
  if (user.role === "system_owner" || user.currentRole === "system_owner" || user.globalRole === "system_owner") return "system_owner";
  const workspaceId = userWorkspaceIdV54(user);
  const uid = user.uid || user.id || "";
  const member = (authStateV31.workspace_members || []).find((item) => item.uid === uid && item.workspaceId === workspaceId && ["active", "accepted"].includes(item.status || "active"));
  const workspaceRole = user.workspaceRole || member?.role || "";
  if ((!user.role || user.role === "pending") && workspaceRole && workspaceRole !== "pending") return workspaceRole;
  return user.role || workspaceRole || "pending";
}

function authMenuKeysV31(user = authCurrentUserV31()) {
  const target = user || currentUser;
  if (!target) return [];
  if (target.active === false || target.disabled === true) return [];
  const workspaceId = userWorkspaceIdV54(target);
  const role = effectiveMenuRoleV59(target);
  if (isStandaloneAdminSiteV60()) return ["systemOwner"];
  if (role === "system_owner" && !workspaceId) return ["systemOwner"];
  if (!workspaceId && role !== "system_owner") return [];
  if (["pending", "waiting_approval", "rejected", "disabled"].includes(target.status || "") && !workspaceId) return [];
  if (Array.isArray(target.menuOverrides) && target.menuOverrides.length) return target.menuOverrides;
  return defaultRoleMenusV31()[role] || [];
}

function can(action, key) {
  const user = authCurrentUserV31() || currentUser;
  if (!user || user.active === false || user.disabled === true) return false;
  const role = effectiveMenuRoleV59(user);
  if (!role || role === "pending") return false;
  if (role === "system_owner") return key === "systemOwner" || !!userWorkspaceIdV54(user);
  if (key === "notices" && action === "create") return ["super_manager", "manager", "teacher", "normal"].includes(role);
  if (!authMenuKeysV31(user).includes(key) && action === "view") return false;
  const perm = authStateV31.permissions[key] || {};
  if (action === "view") return (perm.view || []).includes(role) || authMenuKeysV31(user).includes(key);
  if (user.extraPermissions?.[`${key}:${action}`] === true) return true;
  return (perm[action] || []).includes(role);
}

function buildNav() {
  ensureSystemOwnerPatchV54();
  if (!nav) return;
  store.settings ??= {};
  store.settings.navGroupCollapsed ??= {};
  store.settings.programNavCollapsed ??= {};
  nav.replaceChildren();
  const viewer = authCurrentUserV31() || currentUser;
  if (viewer && !isApprovalGateUserV54(viewer)) app?.classList.remove("auth-gated");
  const groups = navGroupsV28();
  if (!groups.length) {
    const role = effectiveMenuRoleV59(viewer);
    const workspaceId = userWorkspaceIdV54(viewer);
    const message = viewer
      ? `메뉴 권한을 불러오는 중입니다. role=${role || "-"} workspace=${workspaceId || "-"}`
      : "로그인이 필요합니다.";
    nav.append(el("div", "nav-status", message));
    if (viewer?.role === "system_owner" || viewer?.currentRole === "system_owner") {
      const ownerBtn = button("시스템 관리자 열기", "nav-btn");
      ownerBtn.dataset.page = "systemOwner";
      ownerBtn.addEventListener("click", () => renderPage("systemOwner"));
      nav.append(ownerBtn);
    }
    return;
  }
  groups.forEach((group) => {
    const collapsed = !!store.settings.navGroupCollapsed[group.id];
    const header = document.createElement("button");
    header.type = "button";
    header.className = "nav-group-toggle";
    header.dataset.group = group.id;
    header.innerHTML = `<span>${escapeHtml(group.label)}</span><b>${collapsed ? "+" : "-"}</b>`;
    header.addEventListener("click", () => {
      store.settings.navGroupCollapsed[group.id] = !collapsed;
      saveStore();
      buildNav();
    });
    nav.append(header);
    if (!collapsed) group.keys.forEach((key) => appendNavButtonV28(key));
  });
}

function onLogin(event) {
  return onLoginV33(event);
}

function restoreSession() {
  ensureSystemOwnerPatchV54();
  if (!canRestoreAdminStandaloneAuthV62()) {
    showLoggedOutScreenV62();
    return;
  }
  const saved = sessionStorage.getItem("pm-current-user") || authStateV31.auth.currentUserId;
  if (!saved) return;
  const user = authStateV31.users.find((item) => item.id === saved || item.uid === saved || item.email === saved);
  if (!user || user.active === false || user.disabled === true || !user.emailVerified) return;
  completeLoginV34(user);
}

function bootAuthV31Safe() {
  try {
    ensureSystemOwnerPatchV54();
    authStateV31 = loadAuthStateV31();
    authStateV31 = ensureDefaultSuperAccountV38(authStateV31);
    saveAuthStateV31();
    syncLegacyAccountsV31();
    setupAuthUiV31();
    renderInviteFromUrlV31();
    if (currentUser) return;
    if (!canRestoreAdminStandaloneAuthV62()) {
      showLoggedOutScreenV62();
      return;
    }
    const saved = sessionStorage.getItem("pm-current-user") || authStateV31.auth.currentUserId;
    const user = authStateV31.users.find((item) => item.id === saved || item.uid === saved || item.email === saved);
    if (!user || user.active === false || user.disabled === true || !user.emailVerified) return;
    completeLoginV34(user);
  } catch (error) {
    window.__pmBootErrors = window.__pmBootErrors || [];
    window.__pmBootErrors.push(String(error?.message || error));
  }
}

ensureSystemOwnerPatchV54();

// Final V63: richer print center, report downloads, and clean print output.
function renderPrintV8() {
  content.replaceChildren();
  removeFloatingToolsV56();

  const section = panel("프린트 센터");
  section.classList.add("print-config-v63");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const selectAll = button("전체 선택", "ghost");
  const clearAll = button("선택 해제", "ghost");
  actions.append(selectAll, clearAll);
  head.append(actions);

  const controls = el("div", "form-grid print-controls-v63");
  const title = document.createElement("input");
  title.value = `${store.settings.siteName || "개인 관리 프로그램"} 보고서`;
  const format = document.createElement("select");
  ["보고서 HTML", "표 HTML", "CSV", "PDF/프린트"].forEach((value) => format.append(option(value, value)));
  controls.append(makeField("제목", "printTitleV63", title), makeField("출력 형식", "printFormatV63", format));

  const lists = el("div", "print-lists print-lists-v63");
  printCatalogV63().forEach((item) => {
    const rows = printRowsForKeyV63(item.key);
    const box = el("section", "print-list print-list-v63");
    const boxHead = el("div", "print-list-head-v63");
    const groupCheck = document.createElement("input");
    groupCheck.type = "checkbox";
    groupCheck.checked = rows.length > 0;
    groupCheck.dataset.printGroup = item.key;
    boxHead.append(groupCheck, el("h3", "", `${item.label} (${rows.length})`));
    box.append(boxHead);
    if (!rows.length) {
      box.append(el("div", "empty", "출력할 항목이 없습니다."));
    } else {
      rows.forEach((row) => {
        const lab = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.dataset.printKey = item.key;
        input.dataset.rowId = String(row.__printId ?? row.id ?? "");
        input.checked = true;
        lab.append(input, document.createTextNode(` ${printSummaryV63(row)}`));
        box.append(lab);
      });
    }
    groupCheck.addEventListener("change", () => {
      box.querySelectorAll("[data-print-key]").forEach((input) => { input.checked = groupCheck.checked; });
    });
    lists.append(box);
  });

  const preview = el("section", "panel print-area premium-report print-preview-v63");
  preview.append(el("div", "empty", "항목을 선택하고 미리보기 또는 다운로드를 누르세요."));
  const previewBtn = button("보고서 미리보기", "ghost");
  const downloadBtn = button("선택 항목 다운로드");
  const printBtn = button("프린트", "ghost");
  const examScheduleBtn = button("시험일정표 다운로드", "ghost");

  previewBtn.addEventListener("click", () => {
    preview.innerHTML = buildReportBodyV63(selectedPrintGroupedV63(lists), title.value);
  });
  downloadBtn.addEventListener("click", () => runPrintExportV63(format.value, selectedPrintGroupedV63(lists), title.value, false, preview));
  printBtn.addEventListener("click", () => runPrintExportV63("PDF/프린트", selectedPrintGroupedV63(lists), title.value, true, preview));
  examScheduleBtn.addEventListener("click", () => downloadExamScheduleV7(store.examSchedules || []));
  selectAll.addEventListener("click", () => {
    lists.querySelectorAll("input[type='checkbox']").forEach((input) => { input.checked = true; });
  });
  clearAll.addEventListener("click", () => {
    lists.querySelectorAll("input[type='checkbox']").forEach((input) => { input.checked = false; });
  });

  const footer = el("div", "row-actions print-actions-v63");
  footer.append(previewBtn, downloadBtn, printBtn, examScheduleBtn);
  section.append(controls, lists, footer);
  content.append(section, preview);
}

function printCatalogV63() {
  const base = [
    ["schedules", "일정"],
    ["academicSchedules", "학사일정"],
    ["notices", "공지"],
    ["schoolNotices", "학교공지"],
    ["homeLetters", "가정통신문"],
    ["systemNotices", "시스템공지"],
    ["meals", "급식"],
    ["mealApplications", "급식 신청"],
    ["timetable", "시간표"],
    ["lessons", "수업 기록"],
    ["materials", "수업 자료"],
    ["assignments", "과제"],
    ["examSchedules", "시험일정"],
    ["exams", "시험/성적"],
    ["records", "세특"],
    ["projects", "프로젝트"],
    ["portfolios", "포트폴리오"],
    ["penalties", "벌점"],
    ["afterschoolPrograms", "방과후"],
    ["afterschoolSchedules", "방과후 시간표"],
    ["specialLecturePrograms", "특강"],
    ["specialLectureSchedules", "특강 시간표"],
    ["clubPrograms", "동아리"],
    ["clubSchedules", "동아리 시간표"],
    ["attendance", "출결"]
  ];
  if (isAdmin()) base.push(["people", "친구/인물"], ["friendAwards", "친구 상벌점"], ["budget", "예산"]);
  return base.map(([key, fallback]) => ({ key, label: pageLabel(key) === key ? fallback : pageLabel(key) }));
}

function printRowsForKeyV63(key) {
  if (key === "systemNotices") {
    const rows = Array.isArray(systemNoticesV54) ? systemNoticesV54 : [];
    const local = store.settings.systemNotice
      ? [{ id: "local-system-notice", title: "홈페이지 시스템 공지", content: store.settings.systemNotice, priority: store.settings.systemNoticeEnabled === false ? "비활성" : "normal", createdAt: today, createdByEmail: "홈페이지 관리" }]
      : [];
    return [...rows, ...local].map((row, index) => ({ ...row, __printId: row.id || `system-${index}` }));
  }
  const rows = key === "notices" ? visibleNotices() : (store[key] || []);
  return rows.map((row, index) => ({ ...row, __printId: row.id ?? `${key}-${index}` }));
}

function selectedPrintGroupedV63(root) {
  const grouped = {};
  root.querySelectorAll("[data-print-key]:checked").forEach((input) => {
    const key = input.dataset.printKey;
    const rows = printRowsForKeyV63(key);
    const row = rows.find((item) => String(item.__printId ?? item.id ?? "") === input.dataset.rowId);
    if (!row) return;
    grouped[key] ??= [];
    grouped[key].push(row);
  });
  return grouped;
}

function printSummaryV63(row) {
  return summaryTextV5(row) || [row.title, row.name, row.date, row.subject, row.menu, row.content].filter(Boolean).join(" · ") || "항목";
}

function printColumnsForKeyV63(key, rows = []) {
  const map = {
    academicSchedules: ["date", "title", "content", "source", "link"],
    schoolNotices: ["date", "title", "source", "link", "memo"],
    homeLetters: ["date", "title", "source", "link", "memo"],
    systemNotices: ["title", "priority", "content", "createdAt", "createdByEmail"],
    mealApplications: ["year", "month", "type", "date", "unitPrice", "selectedCount", "totalAmount", "memo"],
    afterschoolPrograms: ["name", "teacher", "location", "notice", "memo"],
    specialLecturePrograms: ["name", "teacher", "location", "notice", "memo"],
    clubPrograms: ["name", "teacher", "location", "notice", "memo"],
    afterschoolSchedules: ["day", "period", "time", "subject", "teacher", "room", "memo"],
    specialLectureSchedules: ["day", "period", "time", "subject", "teacher", "room", "memo"],
    clubSchedules: ["day", "period", "time", "subject", "teacher", "room", "memo"]
  };
  if (map[key]) return map[key];
  if (typeof columnsForV12 === "function") {
    const cols = columnsForV12(key);
    if (Array.isArray(cols) && cols.length) return cols;
  }
  return Object.keys(rows[0] || {}).filter((field) => !field.startsWith("__"));
}

function buildReportBodyV63(grouped, title) {
  const entries = Object.entries(grouped);
  return `<div class="report-cover"><h1>${escapeHtml(title || `${store.settings.siteName || "개인 관리 프로그램"} 보고서`)}</h1><p>생성일: ${today}</p><p>선택 섹션: ${entries.length}개</p></div>${entries.length ? entries.map(([key, rows]) => printRowsSectionV63(key, rows)).join("") : `<section class="report-section"><p>선택된 항목이 없습니다.</p></section>`}`;
}

function printRowsSectionV63(key, rows) {
  const label = printCatalogV63().find((item) => item.key === key)?.label || pageLabel(key);
  const cols = printColumnsForKeyV63(key, rows);
  if (!rows.length) return `<section class="report-section"><h2>${escapeHtml(label)}</h2><p>선택 항목 없음</p></section>`;
  return `<section class="report-section"><h2>${escapeHtml(label)}</h2><table><thead><tr>${cols.map((col) => `<th>${escapeHtml(printLabelForV63(col))}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${cols.map((col) => `<td>${escapeHtml(printValueV63(row[col]))}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
}

function printValueV63(value) {
  if (value == null) return "";
  if (typeof value?.toDate === "function") return value.toDate().toLocaleString();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000).toLocaleString();
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function printLabelForV63(field) {
  return {
    createdAt: "등록일",
    createdByEmail: "작성자",
    priority: "우선순위",
    year: "연도",
    month: "월",
    unitPrice: "단가",
    selectedCount: "선택일수",
    totalAmount: "합계",
    source: "출처",
    link: "링크",
    notice: "안내",
    content: "내용",
    room: "장소",
    day: "요일",
    period: "교시",
    time: "시간",
    meal: "급식",
    menu: "메뉴"
  }[field] || labelFor(field);
}

function rowsToCsvV63(rows, cols) {
  const head = cols.map((col) => printLabelForV63(col)).join(",");
  const body = rows.map((row) => cols.map((col) => `"${printValueV63(row[col]).replaceAll('"', '""')}"`).join(",")).join("\n");
  return `${head}\n${body}`;
}

function buildReportHtmlV63(grouped, title, mode = "report") {
  const css = `${reportCssV5()}.report-cover{border:2px solid #111827;border-radius:12px;padding:28px;margin-bottom:28px;background:#f8fbff}.report-cover h1{font-size:28px}.report-section{break-inside:avoid;margin-top:26px}.report-section h2{text-align:left}.report-section table{font-size:12px}.report-section td{white-space:pre-wrap}.report-footer{margin-top:32px;text-align:center;color:#64748b;font-size:12px}@media print{.report-cover{border-color:#111827}}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(title || "보고서")}</title><style>${css}</style></head><body class="${mode === "table" ? "table-report" : "premium-report"}">${buildReportBodyV63(grouped, title)}<footer class="report-footer">${escapeHtml(store.settings.siteName || "개인 관리 프로그램")}</footer></body></html>`;
}

function runPrintExportV63(format, grouped, title, forcePrint, preview) {
  const safeTitle = (title || "보고서").replace(/[\\/:*?"<>|]/g, "_");
  if (!Object.keys(grouped).length) {
    showMessage("출력 항목 없음", "다운로드하거나 프린트할 항목을 선택하세요.");
    return;
  }
  if (format === "CSV") {
    const text = Object.entries(grouped).map(([key, rows]) => `[${printCatalogV63().find((item) => item.key === key)?.label || pageLabel(key)}]\n${rowsToCsvV63(rows, printColumnsForKeyV63(key, rows))}`).join("\n\n");
    downloadTextFileV63(`${safeTitle}_${today}.csv`, text, "text/csv;charset=utf-8");
    return;
  }
  const html = buildReportHtmlV63(grouped, title, format === "표 HTML" ? "table" : "report");
  if (format === "PDF/프린트" || forcePrint) {
    preview.innerHTML = buildReportBodyV63(grouped, title);
    printCleanV63();
    return;
  }
  downloadTextFileV63(`${safeTitle}_${format === "표 HTML" ? "표" : "보고서"}_${today}.html`, html, "text/html;charset=utf-8");
}

function downloadTextFileV63(filename, text, type) {
  const blob = new Blob(["\ufeff" + text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function printCleanV63() {
  document.body.classList.add("print-mode-active");
  removeFloatingToolsV56();
  const cleanup = () => {
    document.body.classList.remove("print-mode-active");
    window.removeEventListener("afterprint", cleanup);
    ensureFloatingButtons();
  };
  window.addEventListener("afterprint", cleanup);
  requestAnimationFrame(() => {
    window.print();
    setTimeout(cleanup, 1200);
  });
}

// Final V64: NEIS meal/school schedule and Dong-A homepage auto sync.
const SCHOOL_SYNC_TARGETS_V64 = ["meals", "academic", "schoolNotices", "homeLetters"];
let schoolSyncRunningV64 = false;

function ensureSchoolIntegrationV64() {
  ensureAppV29();
  store.meals ??= [];
  store.academicSchedules ??= [];
  store.schoolNotices ??= [];
  store.homeLetters ??= [];
  store.settings ??= {};
  store.settings.schoolName ??= "동아고등학교";
  store.settings.schoolHomepageUrl ??= "https://school.busanedu.net/dong-a-h/main.do";
  store.settings.neisMealOfficeCode ||= store.settings.neisOfficeCode || "C10";
  store.settings.neisOfficeCode ||= store.settings.neisMealOfficeCode || "C10";
  store.settings.neisMealSchoolCode ||= store.settings.neisSchoolCode || "";
  store.settings.neisSchoolCode ||= store.settings.neisMealSchoolCode || "";
  store.settings.neisApiKey ||= window.PMSchoolIntegrationService?.publicNeisKey?.() || "";
  store.settings.schoolNoticeUrl ??= "https://school.busanedu.net/dong-a-h/na/ntt/selectNttList.do?bbsId=1013416&mi=622560";
  store.settings.homeLetterUrl ??= "https://school.busanedu.net/dong-a-h/na/ntt/selectNttList.do?bbsId=1013419&mi=622563";
  store.settings.academicCalendarUrl ??= "https://school.busanedu.net/dong-a-h/sv/schdulView/schdulCalendarView.do?mi=1051003";
  store.settings.academicAnnualUrl ??= "https://school.busanedu.net/dong-a-h/cm/cntnts/cntntsView.do?cntntsId=14887&mi=622567";
  store.settings.schoolAutoSyncEnabled ??= true;
  store.settings.schoolAutoSyncHours ??= 12;
  store.settings.schoolSyncLastAtIso ??= "";
  store.settings.appVersion = "v64.0 - 2026-06-19";
}

function schoolConfigV64() {
  ensureSchoolIntegrationV64();
  const apiKey = document.getElementById("schoolNeisApiKeyV64")?.value.trim() || store.settings.neisApiKey || window.PMSchoolIntegrationService?.publicNeisKey?.() || "";
  const officeCode = document.getElementById("schoolOfficeCodeV64")?.value.trim() || store.settings.neisOfficeCode || store.settings.neisMealOfficeCode || "C10";
  const schoolCode = document.getElementById("schoolCodeV64")?.value.trim() || store.settings.neisSchoolCode || store.settings.neisMealSchoolCode || "";
  return {
    apiKey,
    officeCode,
    schoolCode,
    schoolName: document.getElementById("schoolNameV64")?.value.trim() || store.settings.schoolName || "동아고등학교"
  };
}

function persistSchoolConfigV64(config = schoolConfigV64()) {
  store.settings.schoolName = config.schoolName || "동아고등학교";
  store.settings.neisOfficeCode = config.officeCode || "C10";
  store.settings.neisMealOfficeCode = config.officeCode || "C10";
  store.settings.neisSchoolCode = config.schoolCode || "";
  store.settings.neisMealSchoolCode = config.schoolCode || "";
  store.settings.neisApiKey = config.apiKey || "";
  saveStore();
}

async function resolveNeisSchoolV64() {
  const config = schoolConfigV64();
  if (config.officeCode && config.schoolCode) {
    persistSchoolConfigV64(config);
    return config;
  }
  if (!window.PMSchoolIntegrationService?.findSchool) throw new Error("학교 검색 서비스를 사용할 수 없습니다.");
  const candidates = await window.PMSchoolIntegrationService.findSchool(config);
  const selected = candidates.find((row) => row.schoolName === config.schoolName) || candidates[0];
  if (!selected) throw new Error("NEIS 학교 검색 결과가 없습니다.");
  const next = {
    ...config,
    officeCode: selected.officeCode || config.officeCode,
    schoolCode: selected.schoolCode || config.schoolCode,
    schoolName: selected.schoolName || config.schoolName
  };
  persistSchoolConfigV64(next);
  return next;
}

function selectedSchoolMonthV64() {
  const now = new Date();
  const year = Number(document.getElementById("schoolSyncYearV64")?.value || sessionStorage.getItem("mealApplyYear") || now.getFullYear());
  const month = Number(document.getElementById("schoolSyncMonthV64")?.value || sessionStorage.getItem("mealApplyMonth") || now.getMonth() + 1);
  return { year, month };
}

function schoolSyncPanelV64(context = "all") {
  ensureSchoolIntegrationV64();
  const box = panel("학교/NEIS 자동 연동");
  box.classList.add("school-sync-panel-v64");
  const head = box.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const openHome = button("홈페이지 바로가기", "ghost");
  openHome.addEventListener("click", () => openSchoolUrlV64(store.settings.schoolHomepageUrl));
  const openTarget = button("현재 자료실 열기", "ghost");
  openTarget.addEventListener("click", () => openSchoolUrlV64(urlForSchoolContextV64(context)));
  const syncTarget = button(context === "all" ? "전체 동기화" : "이 탭 동기화");
  syncTarget.addEventListener("click", () => runSchoolSyncV64(context === "all" ? SCHOOL_SYNC_TARGETS_V64 : [context], { manual: true }));
  actions.append(openHome, openTarget, syncTarget);
  head.append(actions);

  const { year, month } = selectedSchoolMonthV64();
  const grid = el("div", "form-grid");
  const syncYear = document.createElement("input");
  syncYear.type = "number";
  syncYear.min = "2020";
  syncYear.max = "2100";
  syncYear.id = "schoolSyncYearV64";
  syncYear.value = year;
  const syncMonth = document.createElement("select");
  syncMonth.id = "schoolSyncMonthV64";
  Array.from({ length: 12 }, (_, index) => index + 1).forEach((value) => {
    const item = option(String(value), `${value}월`);
    item.selected = String(value) === String(month);
    syncMonth.append(item);
  });
  const auto = document.createElement("input");
  auto.type = "checkbox";
  auto.checked = store.settings.schoolAutoSyncEnabled !== false;
  auto.addEventListener("change", () => {
    store.settings.schoolAutoSyncEnabled = auto.checked;
    saveStore();
  });
  grid.append(
    makeTextField("학교명", "schoolNameV64", store.settings.schoolName || "동아고등학교"),
    makeTextField("교육청 코드", "schoolOfficeCodeV64", store.settings.neisOfficeCode || store.settings.neisMealOfficeCode || "C10"),
    makeTextField("학교 코드", "schoolCodeV64", store.settings.neisSchoolCode || store.settings.neisMealSchoolCode || ""),
    makeTextField("NEIS API Key", "schoolNeisApiKeyV64", store.settings.neisApiKey || window.PMSchoolIntegrationService?.publicNeisKey?.() || ""),
    makeField("동기화 연도", "schoolSyncYearWrapV64", syncYear),
    makeField("동기화 월", "schoolSyncMonthWrapV64", syncMonth),
    makeField("자동 동기화", "schoolAutoSyncWrapV64", auto)
  );
  const footer = el("div", "row-actions");
  const saveConfig = button("연동 설정 저장", "ghost");
  saveConfig.addEventListener("click", () => {
    persistSchoolConfigV64();
    showMessage("저장 완료", "학교/NEIS 연동 설정을 저장했습니다.");
  });
  const findSchool = button("학교코드 검색", "ghost");
  findSchool.addEventListener("click", async () => {
    try {
      const result = await resolveNeisSchoolV64();
      showMessage("학교코드 확인", `${result.schoolName}\n교육청 ${result.officeCode}\n학교 ${result.schoolCode}`);
      renderPage(currentPage || "dashboard");
    } catch (error) {
      showMessage("학교코드 검색 실패", error.message || String(error));
    }
  });
  footer.append(saveConfig, findSchool);
  box.append(grid, footer, schoolSyncStatusV64());
  return box;
}

function schoolSyncStatusV64() {
  const last = store.settings.schoolSyncLastAt || "기록 없음";
  const result = store.settings.schoolSyncLastResult || "";
  return el("p", "muted school-sync-status-v64", `최근 동기화: ${last}${result ? ` · ${result}` : ""}`);
}

function urlForSchoolContextV64(context) {
  if (context === "schoolNotices") return store.settings.schoolNoticeUrl;
  if (context === "homeLetters") return store.settings.homeLetterUrl;
  if (context === "academic") return store.settings.academicCalendarUrl;
  if (context === "meals") return store.settings.schoolHomepageUrl || "https://school.busanedu.net/dong-a-h/main.do";
  return store.settings.schoolHomepageUrl;
}

function openSchoolUrlV64(url) {
  const target = url || store.settings.schoolHomepageUrl || "https://school.busanedu.net/dong-a-h/main.do";
  if (window.PMShared?.navigation?.openExternalSite) window.PMShared.navigation.openExternalSite(target);
  else window.open(target, "_blank", "noopener,noreferrer");
}

function insertSchoolPanelV64(context) {
  if (!content || content.querySelector(".school-sync-panel-v64")) return;
  content.prepend(schoolSyncPanelV64(context));
}

function enhanceMealsV64() {
  insertSchoolPanelV64("meals");
  const manual = schoolManualMealPanelV64();
  const first = content.querySelector(".school-sync-panel-v64");
  if (first && !content.querySelector("#manualMealPanelV64")) first.after(manual);
}

function enhanceAcademicV64() {
  insertSchoolPanelV64("academic");
}

function enhanceBoardV64(context) {
  insertSchoolPanelV64(context);
  const manual = schoolManualBoardPanelV64(context);
  const first = content.querySelector(".school-sync-panel-v64");
  if (first && !content.querySelector(`#${context}ManualPanelV64`)) first.after(manual);
}

function schoolManualMealPanelV64() {
  const box = panel("급식 수동 작성");
  box.id = "manualMealPanelV64";
  box.classList.add("sub-panel");
  const grid = el("div", "form-grid");
  const date = document.createElement("input");
  date.type = "date";
  date.value = today;
  const meal = document.createElement("select");
  ["아침", "점심", "저녁", "간식"].forEach((value) => meal.append(option(value, value)));
  const menu = document.createElement("textarea");
  const calories = document.createElement("input");
  const memo = document.createElement("textarea");
  grid.append(makeField("날짜", "manualMealDateV64", date), makeField("구분", "manualMealTypeV64", meal), makeField("메뉴", "manualMealMenuV64", menu), makeField("열량", "manualMealCaloriesV64", calories), makeField("메모", "manualMealMemoV64", memo));
  const add = button("급식 수동 저장");
  add.addEventListener("click", () => {
    if (!menu.value.trim()) return showMessage("저장 실패", "급식 메뉴를 입력하세요.");
    mergeSchoolRowsV64("meals", [{ id: `manual-meal-${Date.now()}`, date: date.value || today, meal: meal.value, menu: menu.value, calories: calories.value, memo: memo.value, source: "직접 입력", link: "" }]);
    saveStore();
    renderPage("meals");
  });
  box.append(grid, add);
  return box;
}

function schoolManualBoardPanelV64(context) {
  const label = context === "homeLetters" ? "가정통신문" : "학교공지";
  const box = panel(`${label} 수동 작성`);
  box.id = `${context}ManualPanelV64`;
  box.classList.add("sub-panel");
  const grid = el("div", "form-grid");
  const title = document.createElement("input");
  const date = document.createElement("input");
  date.type = "date";
  date.value = today;
  const link = document.createElement("input");
  const memo = document.createElement("textarea");
  grid.append(makeField("제목", `${context}ManualTitleV64`, title), makeField("날짜", `${context}ManualDateV64`, date), makeField("링크", `${context}ManualLinkV64`, link), makeField("메모", `${context}ManualMemoV64`, memo));
  const add = button(`${label} 수동 저장`);
  add.addEventListener("click", () => {
    if (!title.value.trim()) return showMessage("저장 실패", "제목을 입력하세요.");
    mergeSchoolRowsV64(context, [{ id: `manual-${context}-${Date.now()}`, title: title.value, date: date.value || today, link: link.value, memo: memo.value, source: "직접 입력" }]);
    saveStore();
    renderPage(context);
  });
  box.append(grid, add);
  return box;
}

async function runSchoolSyncV64(targets = SCHOOL_SYNC_TARGETS_V64, options = {}) {
  if (schoolSyncRunningV64) return;
  if (!window.PMSchoolIntegrationService) {
    showMessage("동기화 실패", "학교 연동 서비스가 로드되지 않았습니다.");
    return;
  }
  schoolSyncRunningV64 = true;
  const summary = [];
  try {
    const { year, month } = selectedSchoolMonthV64();
    const monthRange = window.PMSchoolIntegrationService.monthRange(year, month);
    let config = schoolConfigV64();
    const needsNeis = targets.includes("meals") || targets.includes("academic");
    if (needsNeis) {
      try {
        config = await resolveNeisSchoolV64();
      } catch (error) {
        summary.push(`NEIS 설정 필요: ${error.message || String(error)}`);
      }
    }
    if (targets.includes("meals") && config.officeCode && config.schoolCode) {
      const rows = await window.PMSchoolIntegrationService.fetchMeals({ ...config, start: monthRange.start, end: monthRange.end });
      const added = mergeSchoolRowsV64("meals", rows);
      summary.push(`급식 ${added}/${rows.length}`);
    }
    if (targets.includes("academic")) {
      let academicCount = 0;
      if (config.officeCode && config.schoolCode) {
        const rows = await window.PMSchoolIntegrationService.fetchAcademicSchedules({ ...config, start: `${year}-01-01`, end: `${year}-12-31` });
        academicCount += mergeSchoolRowsV64("academicSchedules", rows);
      }
      academicCount += await syncAcademicHomepageV64();
      summary.push(`학사일정 ${academicCount}`);
    }
    if (targets.includes("schoolNotices")) {
      const rows = await window.PMSchoolIntegrationService.fetchBoard(store.settings.schoolNoticeUrl, "동아고 공지");
      const added = mergeSchoolRowsV64("schoolNotices", rows);
      summary.push(`학교공지 ${added}/${rows.length}`);
    }
    if (targets.includes("homeLetters")) {
      const rows = await window.PMSchoolIntegrationService.fetchBoard(store.settings.homeLetterUrl, "동아고 가정통신문");
      const added = mergeSchoolRowsV64("homeLetters", rows);
      summary.push(`가정통신문 ${added}/${rows.length}`);
    }
    const finishedAt = new Date();
    store.settings.schoolSyncLastAt = finishedAt.toLocaleString("ko-KR");
    store.settings.schoolSyncLastAtIso = finishedAt.toISOString();
    store.settings.schoolSyncLastResult = summary.join(" · ") || "동기화 항목 없음";
    saveStore();
    if (!options.silent) showMessage("동기화 완료", store.settings.schoolSyncLastResult);
    renderPage(currentPage || "dashboard");
  } catch (error) {
    const message = error.message || String(error);
    const failedAt = new Date();
    store.settings.schoolSyncLastAt = failedAt.toLocaleString("ko-KR");
    store.settings.schoolSyncLastAtIso = failedAt.toISOString();
    store.settings.schoolSyncLastResult = `실패: ${message}`;
    saveStore();
    if (!options.silent) showMessage("동기화 실패", `${message}\n브라우저 보안/CORS가 원인이면 홈페이지 바로가기 후 수동 작성 또는 붙여넣기를 사용하세요.`);
  } finally {
    schoolSyncRunningV64 = false;
  }
}

async function syncAcademicHomepageV64() {
  const urls = [store.settings.academicCalendarUrl, store.settings.academicAnnualUrl].filter(Boolean);
  let added = 0;
  for (const url of urls) {
    try {
      const html = await window.PMSchoolIntegrationService.fetchHtml(url);
      const docText = new DOMParser().parseFromString(html, "text/html").body?.innerText || "";
      const rows = parseAcademicTextV20(docText).map((row) => ({ ...row, source: "동아고 홈페이지", link: url }));
      added += mergeSchoolRowsV64("academicSchedules", rows);
    } catch (error) {
      console.info("[school-sync:academic-homepage]", { url, message: error?.message || String(error) });
    }
  }
  return added;
}

function mergeSchoolRowsV64(key, rows = []) {
  const targetKey = key === "academic" ? "academicSchedules" : key;
  store[targetKey] ??= [];
  const uniqueKey = (row) => {
    if (targetKey === "meals") return `${row.date || ""}|${row.meal || ""}|${row.menu || ""}`;
    return `${row.date || ""}|${row.title || row.name || ""}|${row.link || ""}`;
  };
  const seen = new Set(store[targetKey].map(uniqueKey));
  let added = 0;
  rows.forEach((row) => {
    if (!row) return;
    const keyValue = uniqueKey(row);
    if (!keyValue.trim() || seen.has(keyValue)) return;
    store[targetKey].unshift({ ...row, id: row.id || `${targetKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
    seen.add(keyValue);
    added += 1;
  });
  return added;
}

function maybeRunSchoolAutoSyncV64() {
  ensureSchoolIntegrationV64();
  if (!currentUser || app?.classList.contains("hidden")) return;
  if (store.settings.schoolAutoSyncEnabled === false) return;
  if (schoolSyncRunningV64) return;
  const workspaceId = store.workspace_id || currentUser.workspace_id || "local";
  const hours = Math.max(1, Number(store.settings.schoolAutoSyncHours || 12));
  const last = Date.parse(store.settings.schoolSyncLastAtIso || store.settings.schoolSyncLastAt || "");
  if (Number.isFinite(last) && Date.now() - last < hours * 60 * 60 * 1000) return;
  const sessionKey = `school-auto-sync:${workspaceId}:${new Date().toISOString().slice(0, 13)}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");
  setTimeout(() => runSchoolSyncV64(SCHOOL_SYNC_TARGETS_V64, { silent: true, auto: true }), 1200);
}

function renderSiteSchoolIntegrationV64() {
  if (document.getElementById("schoolIntegrationSiteBoxV64")) return;
  const box = schoolSyncPanelV64("all");
  box.id = "schoolIntegrationSiteBoxV64";
  const urlGrid = el("div", "form-grid");
  urlGrid.append(
    makeTextField("학교 홈페이지", "schoolHomepageUrlV64", store.settings.schoolHomepageUrl || ""),
    makeTextField("공지사항 URL", "schoolNoticeUrlV64", store.settings.schoolNoticeUrl || ""),
    makeTextField("가정통신문 URL", "homeLetterUrlV64", store.settings.homeLetterUrl || ""),
    makeTextField("학사일정 URL", "academicCalendarUrlV64", store.settings.academicCalendarUrl || ""),
    makeTextField("연간 학사 URL", "academicAnnualUrlV64", store.settings.academicAnnualUrl || "")
  );
  const saveUrls = button("학교 URL 저장", "ghost");
  saveUrls.addEventListener("click", () => {
    store.settings.schoolHomepageUrl = document.getElementById("schoolHomepageUrlV64").value.trim();
    store.settings.schoolNoticeUrl = document.getElementById("schoolNoticeUrlV64").value.trim();
    store.settings.homeLetterUrl = document.getElementById("homeLetterUrlV64").value.trim();
    store.settings.academicCalendarUrl = document.getElementById("academicCalendarUrlV64").value.trim();
    store.settings.academicAnnualUrl = document.getElementById("academicAnnualUrlV64").value.trim();
    saveStore();
    showMessage("저장 완료", "학교 홈페이지 연동 URL을 저장했습니다.");
  });
  box.append(urlGrid, saveUrls);
  content.append(box);
}

const renderPageBeforeSchoolV64 = renderPage;
renderPage = function renderPageV64(key) {
  ensureSchoolIntegrationV64();
  renderPageBeforeSchoolV64(key);
  const page = currentPage || key;
  if (page === "meals") enhanceMealsV64();
  if (page === "academic") enhanceAcademicV64();
  if (page === "schoolNotices") enhanceBoardV64("schoolNotices");
  if (page === "homeLetters") enhanceBoardV64("homeLetters");
  if (page === "site") renderSiteSchoolIntegrationV64();
  maybeRunSchoolAutoSyncV64();
};

ensureSchoolIntegrationV64();

// Final V78: unified password approval for edit/save/delete flows.
function currentAuthUserV78() {
  const uid = currentUser?.uid || currentUser?.id || "";
  const email = String(currentUser?.email || "").toLowerCase();
  try {
    const latest = window.PMAuthService?.loadAuthState?.();
    if (latest?.users) authStateV31 = { ...authStateV31, ...latest };
  } catch (error) {
    console.info("[password approval auth refresh skipped]", error?.message || String(error));
  }
  return (authStateV31?.users || []).find((user) => {
    const userUid = user.uid || user.id || "";
    const userEmail = String(user.email || "").toLowerCase();
    return (!!uid && userUid === uid) || (!!email && userEmail === email);
  }) || null;
}

function passwordApprovalMessageV78() {
  return "비밀번호가 올바르지 않습니다. 이메일/비밀번호 계정은 현재 로그인 비밀번호를 입력하세요. Google 계정은 확인 버튼을 누르면 Google 재인증 팝업으로 승인합니다.";
}

async function googleReauthForPasswordApprovalV79() {
  try {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    const firebaseUser = runtime?.auth?.currentUser;
    const currentUid = currentUser?.uid || currentUser?.id || "";
    if (!runtime || !firebaseUser || !currentUid || firebaseUser.uid !== currentUid) return false;
    const providers = (firebaseUser.providerData || []).map((provider) => provider?.providerId).filter(Boolean);
    if (!providers.includes("google.com")) return false;
    const Provider = runtime.sdk?.auth?.GoogleAuthProvider || window.firebase?.auth?.GoogleAuthProvider;
    if (!Provider) return false;
    const provider = new Provider();
    provider.setCustomParameters?.({ prompt: "select_account" });
    const credential = typeof firebaseUser.reauthenticateWithPopup === "function"
      ? await firebaseUser.reauthenticateWithPopup(provider)
      : await runtime.auth.signInWithPopup(provider);
    return !!credential?.user?.uid && credential.user.uid === firebaseUser.uid;
  } catch (error) {
    console.info("[password approval google reauth failed]", error?.code || "", error?.message || String(error));
    return false;
  }
}

async function verifyCurrentPasswordV78(passwordValue) {
  const value = String(passwordValue || "");
  if (!value || !currentUser) return false;
  if (currentUser.password && value === currentUser.password) return true;

  const authUser = currentAuthUserV78();
  if (window.PMAuthService?.verifyLocalPassword && authUser) {
    try {
      if (await window.PMAuthService.verifyLocalPassword(authUser, value)) {
        currentUser.password = value;
        return true;
      }
    } catch (error) {
      console.info("[password approval local check skipped]", error?.message || String(error));
    }
  }

  if (window.PMAuthService?.firebaseSignInWithEmailOnly && currentUser?.email) {
    try {
      const firebaseUser = await window.PMAuthService.firebaseSignInWithEmailOnly(currentUser.email, value);
      if (currentUser.uid && firebaseUser?.uid && firebaseUser.uid !== currentUser.uid) return false;
      currentUser.password = value;
      return true;
    } catch (error) {
      console.info("[password approval firebase check failed]", error?.code || "", error?.message || String(error));
    }
  }

  return googleReauthForPasswordApprovalV79();
}

requirePassword = function requirePasswordV78(action) {
  pendingPasswordAction = action;
  const input = document.getElementById("confirmPasswordInput");
  const error = document.getElementById("passwordError");
  const dialog = document.getElementById("passwordDialog");
  if (input) input.value = "";
  if (error) error.textContent = "";
  if (input) input.placeholder = "이메일 계정: 현재 비밀번호 / Google 계정: 아무 값 입력 후 확인";
  if (dialog?.showModal) dialog.showModal();
};

confirmPassword = async function confirmPasswordV78(event) {
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();
  const input = document.getElementById("confirmPasswordInput");
  const error = document.getElementById("passwordError");
  if (error) error.textContent = "";
  const ok = await verifyCurrentPasswordV78(input?.value || "");
  if (!ok) {
    if (error) error.textContent = passwordApprovalMessageV78();
    return;
  }
  document.getElementById("passwordDialog")?.close?.();
  const action = pendingPasswordAction;
  pendingPasswordAction = null;
  try {
    await action?.();
  } catch (error) {
    console.error("[password approval action failed]", error);
    showMessage("작업 실패", error?.message || String(error));
  }
};

async function saveEditorWithPasswordV78(event) {
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();
  if (!editing) return;
  const payload = Object.fromEntries(new FormData(editorForm).entries());
  if (editing.id && !(await verifyCurrentPasswordV78(payload._confirm_password))) {
    editorError.textContent = passwordApprovalMessageV78();
    return;
  }
  delete payload._confirm_password;
  const origin = editing.origin;
  const rows = store[editing.key] || (store[editing.key] = []);
  let savedRow = null;
  if (editing.id) {
    const index = rows.findIndex((row) => row.id === editing.id);
    if (index < 0) return;
    rows[index] = editing.key === "notices"
      ? decorateNoticeRowV52({ ...payload, id: editing.id }, rows[index])
      : { ...rows[index], ...payload };
    savedRow = rows[index];
  } else if (Object.values(payload).some((value) => String(value || "").trim())) {
    const id = Date.now();
    const row = editing.key === "notices"
      ? decorateNoticeRowV52({ id, ...payload })
      : { id, ...payload, created_by: currentUser.email };
    rows.unshift(row);
    savedRow = row;
  }
  saveStore();
  if (editing.key === "notices" && savedRow) saveNoticeDirectToFirestoreV52(savedRow);
  closeEditor();
  renderPage(origin || currentPage);
}

async function saveProfileWithPasswordV78() {
  const error = document.getElementById("profileError") || content?.querySelector(".panel .error");
  if (error) error.textContent = "";
  const ok = await verifyCurrentPasswordV78(document.getElementById("profilePassword")?.value || "");
  if (!ok) {
    if (error) error.textContent = passwordApprovalMessageV78();
    return;
  }
  store.profile = {
    name: document.getElementById("profileName")?.value || "",
    phone: document.getElementById("profilePhone")?.value || "",
    email: document.getElementById("profileEmail")?.value || currentUser.email || "",
    school: document.getElementById("profileSchool")?.value || "",
    memo: document.getElementById("profileMemo")?.value || ""
  };
  currentUser.name = store.profile.name || currentUser.name;
  saveStore();
  if (typeof updateGreeting === "function") updateGreeting();
  else if (roleLabel) roleLabel.textContent = `${currentUser.name} · ${roleName(currentUser.role)}`;
  showMessage("저장 완료", "내정보가 저장되었습니다.");
}

sitePasswordOkV70 = verifyCurrentPasswordV78;

function installPasswordApprovalPatchV78() {
  const passwordFormEl = document.getElementById("passwordForm");
  if (passwordFormEl && passwordFormEl.dataset.passwordPatchV78 !== "true") {
    passwordFormEl.dataset.passwordPatchV78 = "true";
    passwordFormEl.addEventListener("submit", confirmPassword, true);
  }

  const editorFormEl = document.getElementById("editorForm");
  if (editorFormEl && editorFormEl.dataset.passwordPatchV78 !== "true") {
    editorFormEl.dataset.passwordPatchV78 = "true";
    editorFormEl.addEventListener("submit", saveEditorWithPasswordV78, true);
  }

  if (document.body?.dataset.passwordClickPatchV78 === "true") return;
  document.body.dataset.passwordClickPatchV78 = "true";
  document.addEventListener("click", async (event) => {
    const target = event.target?.closest?.("#saveProfile");
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    await saveProfileWithPasswordV78();
  }, true);
}

installPasswordApprovalPatchV78();
setTimeout(installPasswordApprovalPatchV78, 0);

// Final V68: lock meal date navigation to local dates and add monthly academic views.
function localDateStringV68(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateV68(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function selectedMealDateV68() {
  const value = sessionStorage.getItem("mealViewDateV66") || localDateStringV68();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localDateStringV68();
}

selectedMealDateV66 = selectedMealDateV68;

setMealDateV66 = function setMealDateV68(value) {
  const nextValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : localDateStringV68();
  sessionStorage.setItem("mealViewDateV66", nextValue);
  renderMealsV66();
};

moveMealDateV66 = function moveMealDateV68(delta) {
  const date = parseLocalDateV68(selectedMealDateV66());
  date.setDate(date.getDate() + delta);
  setMealDateV66(localDateStringV68(date));
};

renderMealsV66 = function renderMealsV68() {
  ensureSchoolIntegrationV64();
  content.replaceChildren();
  const section = panel("급식 관리");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const open = button("학교 식단 열기", "ghost");
  open.addEventListener("click", () => openSchoolUrlV64("meals"));
  const importBtn = button("급식 가져오기", "primary");
  importBtn.addEventListener("click", openMealImportV66);
  const manual = button("직접 작성", "ghost");
  manual.addEventListener("click", openMealManualV66);
  actions.append(open, importBtn, manual);
  head.append(actions);

  const selected = selectedMealDateV66();
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = selected;
  dateInput.addEventListener("change", () => setMealDateV66(dateInput.value));
  const prev = button("이전날", "ghost");
  prev.addEventListener("click", () => moveMealDateV66(-1));
  const todayBtn = button("오늘", "ghost");
  todayBtn.addEventListener("click", () => setMealDateV66(localDateStringV68()));
  const next = button("다음날", "ghost");
  next.addEventListener("click", () => moveMealDateV66(1));
  const toolbar = el("div", "toolbar school-clean-toolbar-v66 meal-date-actions-v68");
  toolbar.append(makeField("날짜 선택", "mealDateInputV66", dateInput), prev, todayBtn, next);

  const month = selected.slice(0, 7);
  const dayRows = (store.meals || []).filter((row) => row.date === selected);
  const monthRows = sortedByDateV66(store.meals || []).filter((row) => String(row.date || "").startsWith(month));
  section.append(
    el("p", "muted", "날짜를 선택하면 해당 날짜 급식을 바로 확인할 수 있습니다. 급식 URL/NEIS 코드는 홈페이지 관리에서 수정합니다."),
    toolbar,
    mealDayCardsV66(dayRows, selected),
    el("h3", "subsection-title-v66", `${month} 전체 급식`),
    mealTableV66(monthRows)
  );
  content.append(section);
};

function selectedAcademicMonthV68() {
  const stored = sessionStorage.getItem("academicMonthV68");
  const fallback = localDateStringV68().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(stored || "") ? stored : fallback;
}

function setAcademicMonthV68(value) {
  const nextValue = /^\d{4}-\d{2}$/.test(String(value || "")) ? value : localDateStringV68().slice(0, 7);
  sessionStorage.setItem("academicMonthV68", nextValue);
}

function moveAcademicMonthV68(delta) {
  const [year, month] = selectedAcademicMonthV68().split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  setAcademicMonthV68(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  renderAcademicV17();
}

academicYearV66 = function academicYearV68() {
  return Number(selectedAcademicMonthV68().slice(0, 4));
};

function academicCalendarV68(rows, year, month) {
  const byDate = new Map();
  rows.forEach((row) => {
    const date = String(row.date || "");
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(row);
  });

  const wrap = el("div", "academic-calendar-v68");
  ["일", "월", "화", "수", "목", "금", "토"].forEach((day) => wrap.append(el("div", "academic-calendar-head-v68", day)));
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  for (let i = 0; i < firstDay.getDay(); i += 1) {
    wrap.append(el("div", "academic-calendar-cell-v68 academic-calendar-empty-v68", ""));
  }
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = localDateStringV68(new Date(year, month - 1, day));
    const cell = el("div", "academic-calendar-cell-v68");
    cell.append(el("strong", "", String(day)));
    const items = byDate.get(date) || [];
    if (!items.length) {
      cell.append(el("span", "muted", "-"));
    } else {
      items.slice(0, 4).forEach((row) => {
        const item = el("p", "", row.title || row.memo || "일정");
        item.title = [row.title, row.memo].filter(Boolean).join("\n");
        cell.append(item);
      });
      if (items.length > 4) cell.append(el("small", "muted", `+${items.length - 4}개`));
    }
    wrap.append(cell);
  }
  return wrap;
}

renderAcademicV17 = function renderAcademicV68() {
  ensureSchoolIntegrationV64();
  content.replaceChildren();
  const section = panel("학사일정");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const open = button("학사일정 열기", "ghost");
  open.addEventListener("click", () => openSchoolUrlV64("academic"));
  const importBtn = button("학사일정 가져오기", "primary");
  importBtn.addEventListener("click", openAcademicImportV66);
  const manual = button("직접 작성", "ghost");
  manual.addEventListener("click", openAcademicManualV66);
  actions.append(open, importBtn, manual);
  head.append(actions);

  const selectedMonth = selectedAcademicMonthV68();
  const monthInput = document.createElement("input");
  monthInput.type = "month";
  monthInput.value = selectedMonth;
  monthInput.addEventListener("change", () => {
    setAcademicMonthV68(monthInput.value);
    renderAcademicV17();
  });

  const mode = document.createElement("select");
  mode.append(option("list", "리스트"), option("calendar", "달력"));
  mode.value = sessionStorage.getItem("academicViewModeV68") || "list";
  mode.addEventListener("change", () => {
    sessionStorage.setItem("academicViewModeV68", mode.value);
    renderAcademicV17();
  });

  const query = document.createElement("input");
  query.type = "search";
  query.placeholder = "제목, 메모, 출처 검색";
  query.value = sessionStorage.getItem("academicSearchV66") || "";
  query.addEventListener("input", () => {
    sessionStorage.setItem("academicSearchV66", query.value);
    renderAcademicV17();
  });

  const prev = button("이전월", "ghost");
  prev.addEventListener("click", () => moveAcademicMonthV68(-1));
  const now = button("이번달", "ghost");
  now.addEventListener("click", () => {
    setAcademicMonthV68(localDateStringV68().slice(0, 7));
    renderAcademicV17();
  });
  const next = button("다음월", "ghost");
  next.addEventListener("click", () => moveAcademicMonthV68(1));

  const toolbar = el("div", "toolbar school-clean-toolbar-v66 academic-toolbar-v68");
  toolbar.append(makeField("월 선택", "academicMonthV68", monthInput), makeField("보기", "academicViewModeV68", mode), makeField("검색", "academicSearchV66", query), prev, now, next);

  const year = Number(selectedMonth.slice(0, 4));
  const month = Number(selectedMonth.slice(5, 7));
  const term = query.value.trim().toLowerCase();
  const rows = sortedByDateV66(store.academicSchedules || [])
    .filter((row) => String(row.date || "").startsWith(selectedMonth))
    .filter((row) => !term || [row.title, row.memo, row.source].some((value) => String(value || "").toLowerCase().includes(term)));

  section.append(
    el("p", "muted", "월별로 학사일정을 확인합니다. 너무 긴 연간 목록은 월을 선택해서 좁히고, 리스트/달력 보기 중 필요한 방식으로 전환하세요."),
    toolbar,
    el("h3", "subsection-title-v66", `${selectedMonth} 학사일정 ${rows.length}건`),
    mode.value === "calendar" ? academicCalendarV68(rows, year, month) : academicTableV66(rows)
  );
  content.append(section);
};

var ensureSchoolIntegrationBeforeV68 = ensureSchoolIntegrationV64;
ensureSchoolIntegrationV64 = function ensureSchoolIntegrationV68() {
  ensureSchoolIntegrationBeforeV68();
  store.settings.appVersion = "v68.0 - 2026-06-19";
};

ensureSchoolIntegrationV64();

// Final V67: fix meal date navigation and add monthly academic list/calendar views.
function localDateStringV67(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateV67(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function selectedMealDateV66() {
  const value = sessionStorage.getItem("mealViewDateV66") || localDateStringV67();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localDateStringV67();
}

function setMealDateV66(value) {
  sessionStorage.setItem("mealViewDateV66", /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : localDateStringV67());
  renderMealsV66();
}

function moveMealDateV66(delta) {
  const date = parseLocalDateV67(selectedMealDateV66());
  date.setDate(date.getDate() + delta);
  setMealDateV66(localDateStringV67(date));
}

function academicYearV66() {
  return Number(sessionStorage.getItem("academicYearV66") || new Date().getFullYear());
}

function academicMonthV67() {
  return Number(sessionStorage.getItem("academicMonthV67") || (new Date().getMonth() + 1));
}

function academicViewModeV67() {
  return sessionStorage.getItem("academicViewModeV67") || "list";
}

renderAcademicV17 = function renderAcademicV67() {
  ensureSchoolIntegrationV64();
  content.replaceChildren();
  const section = panel("학사일정");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const openCalendar = button("행사 및 일정 열기", "ghost");
  openCalendar.addEventListener("click", () => openSchoolUrlV64("academic"));
  const openAnnual = button("연간 학사 열기", "ghost");
  openAnnual.addEventListener("click", () => openSchoolUrlV64(store.settings.academicAnnualUrl));
  const importBtn = button("학사일정 가져오기", "primary");
  importBtn.addEventListener("click", openAcademicImportV66);
  const manual = button("직접 작성", "ghost");
  manual.addEventListener("click", openAcademicManualV66);
  actions.append(openCalendar, openAnnual, importBtn, manual);
  head.append(actions);

  const year = document.createElement("input");
  year.type = "number";
  year.min = "2020";
  year.max = "2100";
  year.value = academicYearV66();
  year.addEventListener("change", () => {
    sessionStorage.setItem("academicYearV66", year.value || String(new Date().getFullYear()));
    renderAcademicV17();
  });

  const month = document.createElement("select");
  for (let i = 1; i <= 12; i += 1) month.append(option(String(i), `${i}월`));
  month.value = String(academicMonthV67());
  month.addEventListener("change", () => {
    sessionStorage.setItem("academicMonthV67", month.value);
    renderAcademicV17();
  });

  const mode = document.createElement("select");
  mode.append(option("list", "리스트 보기"), option("calendar", "달력 보기"));
  mode.value = academicViewModeV67();
  mode.addEventListener("change", () => {
    sessionStorage.setItem("academicViewModeV67", mode.value);
    renderAcademicV17();
  });

  const search = document.createElement("input");
  search.placeholder = "일정명/내용 검색";
  search.value = sessionStorage.getItem("academicSearchV66") || "";
  search.addEventListener("input", () => {
    sessionStorage.setItem("academicSearchV66", search.value);
    renderAcademicV17();
  });

  const prev = button("이전월", "ghost");
  prev.addEventListener("click", () => moveAcademicMonthV67(-1));
  const thisMonth = button("이번달", "ghost");
  thisMonth.addEventListener("click", () => {
    const now = new Date();
    sessionStorage.setItem("academicYearV66", String(now.getFullYear()));
    sessionStorage.setItem("academicMonthV67", String(now.getMonth() + 1));
    renderAcademicV17();
  });
  const next = button("다음월", "ghost");
  next.addEventListener("click", () => moveAcademicMonthV67(1));

  const toolbar = el("div", "toolbar school-clean-toolbar-v66");
  toolbar.append(
    makeField("연도", "academicYearInputV67", year),
    makeField("월", "academicMonthInputV67", month),
    makeField("보기", "academicViewModeInputV67", mode),
    makeField("검색", "academicSearchInputV67", search),
    prev,
    thisMonth,
    next
  );

  const ym = `${String(year.value).padStart(4, "0")}-${String(month.value).padStart(2, "0")}`;
  const q = search.value.trim().toLowerCase();
  const rows = sortedByDateV66(store.academicSchedules || [])
    .filter((row) => String(row.date || "").startsWith(ym))
    .filter((row) => !q || `${row.title || ""} ${row.content || ""} ${row.source || ""}`.toLowerCase().includes(q));
  section.append(
    el("p", "muted", "월별로 학사일정을 확인합니다. 리스트/달력 보기를 전환할 수 있고, 전체 자료는 가져오기 버튼으로 갱신합니다."),
    toolbar,
    mode.value === "calendar" ? academicCalendarV67(rows, Number(year.value), Number(month.value)) : academicTableV66(rows)
  );
  content.append(section);
};

function moveAcademicMonthV67(delta) {
  let year = academicYearV66();
  let month = academicMonthV67() + delta;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  if (month > 12) {
    month = 1;
    year += 1;
  }
  sessionStorage.setItem("academicYearV66", String(year));
  sessionStorage.setItem("academicMonthV67", String(month));
  renderAcademicV17();
}

function academicCalendarV67(rows, year, month) {
  const byDate = new Map();
  rows.forEach((row) => {
    byDate.set(row.date, [...(byDate.get(row.date) || []), row]);
  });
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const wrap = el("div", "academic-calendar-v67");
  ["일", "월", "화", "수", "목", "금", "토"].forEach((day) => wrap.append(el("div", "academic-calendar-head-v67", day)));
  for (let i = 0; i < first.getDay(); i += 1) wrap.append(el("div", "academic-calendar-cell-v67 muted", ""));
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = localDateStringV67(new Date(year, month - 1, day));
    const cell = el("div", "academic-calendar-cell-v67");
    cell.append(el("strong", "", String(day)));
    const items = byDate.get(date) || [];
    if (!items.length) cell.append(el("span", "muted", "-"));
    items.slice(0, 4).forEach((row) => cell.append(el("p", "", row.title || "일정")));
    if (items.length > 4) cell.append(el("small", "muted", `+${items.length - 4}개`));
    wrap.append(cell);
  }
  return wrap;
}

const ensureSchoolIntegrationBeforeV67 = ensureSchoolIntegrationV64;
ensureSchoolIntegrationV64 = function ensureSchoolIntegrationV67() {
  ensureSchoolIntegrationBeforeV67();
  store.settings.appVersion = "v67.0 - 2026-06-19";
};

// Final V66: clean school tabs, import popups, verified Dong-A NEIS defaults.
const DONGA_OFFICE_CODE_V66 = "C10";
const DONGA_SCHOOL_CODE_V66 = "7150133";
const DONGA_SCHOOL_NAME_V66 = "동아고등학교";

ensureSchoolIntegrationV64 = function ensureSchoolIntegrationV66() {
  ensureAppV29();
  store.meals ??= [];
  store.academicSchedules ??= [];
  store.schoolNotices ??= [];
  store.homeLetters ??= [];
  store.settings ??= {};
  if (!store.settings.schoolName || isBrokenSchoolTextV65(store.settings.schoolName)) store.settings.schoolName = DONGA_SCHOOL_NAME_V66;
  store.settings.schoolHomepageUrl ??= "https://school.busanedu.net/dong-a-h/main.do";
  store.settings.neisMealOfficeCode ||= store.settings.neisOfficeCode || DONGA_OFFICE_CODE_V66;
  store.settings.neisOfficeCode ||= store.settings.neisMealOfficeCode || DONGA_OFFICE_CODE_V66;
  if (store.settings.schoolName === DONGA_SCHOOL_NAME_V66 && (!store.settings.neisSchoolCode || store.settings.neisSchoolCode === "7150048")) {
    store.settings.neisSchoolCode = DONGA_SCHOOL_CODE_V66;
  }
  if (store.settings.schoolName === DONGA_SCHOOL_NAME_V66 && (!store.settings.neisMealSchoolCode || store.settings.neisMealSchoolCode === "7150048")) {
    store.settings.neisMealSchoolCode = DONGA_SCHOOL_CODE_V66;
  }
  store.settings.neisMealSchoolCode ||= store.settings.neisSchoolCode || "";
  store.settings.neisSchoolCode ||= store.settings.neisMealSchoolCode || "";
  store.settings.neisApiKey ||= window.PMSchoolIntegrationService?.publicNeisKey?.() || "";
  store.settings.schoolNoticeUrl ??= "https://school.busanedu.net/dong-a-h/na/ntt/selectNttList.do?bbsId=1013416&mi=622560";
  store.settings.homeLetterUrl ??= "https://school.busanedu.net/dong-a-h/na/ntt/selectNttList.do?bbsId=1013419&mi=622563";
  store.settings.academicCalendarUrl ??= "https://school.busanedu.net/dong-a-h/sv/schdulView/schdulCalendarView.do?mi=1051003";
  store.settings.academicAnnualUrl ??= "https://school.busanedu.net/dong-a-h/cm/cntnts/cntntsView.do?cntntsId=14887&mi=622567";
  store.settings.schoolAutoSyncEnabled ??= true;
  store.settings.schoolAutoSyncHours ??= 12;
  store.settings.schoolSyncLastAtIso ??= "";
  store.settings.appVersion = "v66.1 - 2026-06-19";
};

resolveNeisSchoolV64 = async function resolveNeisSchoolV66() {
  const config = schoolConfigV64();
  if (config.schoolName === DONGA_SCHOOL_NAME_V66 && (!config.schoolCode || config.schoolCode === "7150048")) {
    const next = { ...config, officeCode: DONGA_OFFICE_CODE_V66, schoolCode: DONGA_SCHOOL_CODE_V66 };
    persistSchoolConfigV64(next);
    return next;
  }
  if (config.officeCode && config.schoolCode) {
    persistSchoolConfigV64(config);
    return config;
  }
  if (!window.PMSchoolIntegrationService?.findSchool) throw new Error("학교 검색 서비스를 사용할 수 없습니다.");
  const candidates = await window.PMSchoolIntegrationService.findSchool(config);
  const selected = candidates.find((row) => row.schoolName === config.schoolName) || candidates[0];
  if (!selected) throw new Error("NEIS 학교 검색 결과가 없습니다.");
  const next = {
    ...config,
    officeCode: selected.officeCode || config.officeCode,
    schoolCode: selected.schoolCode || config.schoolCode,
    schoolName: selected.schoolName || config.schoolName
  };
  persistSchoolConfigV64(next);
  return next;
};

selectedSchoolMonthV64 = function selectedSchoolMonthV66() {
  const mealDate = sessionStorage.getItem("mealViewDateV66") || today;
  const date = new Date(`${mealDate}T00:00:00`);
  const now = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = Number(document.getElementById("schoolSyncYearV64")?.value || sessionStorage.getItem("schoolSyncYearV66") || now.getFullYear());
  const month = Number(document.getElementById("schoolSyncMonthV64")?.value || sessionStorage.getItem("schoolSyncMonthV66") || now.getMonth() + 1);
  return { year, month };
};

enhanceMealsV64 = function enhanceMealsV66() {};
enhanceAcademicV64 = function enhanceAcademicV66() {};
enhanceBoardV64 = function enhanceBoardV66() {};

function sortedByDateV66(rows = []) {
  return [...rows].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}

function schoolBoardLabelV66(context) {
  return context === "homeLetters" ? "가정통신문" : "학교공지";
}

function schoolBoardUrlV66(context) {
  return context === "homeLetters" ? store.settings.homeLetterUrl : store.settings.schoolNoticeUrl;
}

function schoolBoardRowsV66(context) {
  return context === "homeLetters" ? (store.homeLetters || []) : (store.schoolNotices || []);
}

function renderSchoolBoardV66(context) {
  ensureSchoolIntegrationV64();
  content.replaceChildren();
  const label = schoolBoardLabelV66(context);
  const key = context === "homeLetters" ? "homeLetters" : "schoolNotices";
  const section = panel(label);
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const open = button(`${label} 원문 열기`, "ghost");
  open.addEventListener("click", () => openSchoolUrlV64(context));
  const importBtn = button(`${label} 가져오기`, "primary");
  importBtn.addEventListener("click", () => openSchoolBoardImportV66(context));
  const manual = button("직접 작성", "ghost");
  manual.addEventListener("click", () => openSchoolManualBoardV66(context));
  actions.append(open, importBtn, manual);
  head.append(actions);

  const search = document.createElement("input");
  search.placeholder = `${label} 제목/메모 검색`;
  search.value = sessionStorage.getItem(`${key}:search:v66`) || "";
  const clear = button("초기화", "ghost");
  clear.addEventListener("click", () => {
    sessionStorage.removeItem(`${key}:search:v66`);
    renderSchoolBoardV66(context);
  });
  search.addEventListener("input", () => {
    sessionStorage.setItem(`${key}:search:v66`, search.value);
    renderSchoolBoardV66(context);
  });
  const toolbar = el("div", "toolbar school-clean-toolbar-v66");
  toolbar.append(makeField("검색", `${key}SearchV66`, search), clear);

  const q = search.value.trim().toLowerCase();
  const rows = sortedByDateV66(schoolBoardRowsV66(context)).filter((row) => !q || `${row.title || ""} ${row.memo || ""} ${row.source || ""}`.toLowerCase().includes(q));
  section.append(
    el("p", "muted", `${label} URL은 홈페이지 관리에서만 수정합니다. 이 화면에서는 목록 확인, 원문 이동, 가져오기, 직접 작성만 합니다.`),
    toolbar,
    schoolBoardTableV66(rows, label)
  );
  content.append(section);
}

function schoolBoardTableV66(rows, label) {
  if (!rows.length) return el("div", "empty", `아직 등록된 ${label}이 없습니다. 가져오기를 눌러 자동 수집하거나 직접 작성하세요.`);
  const wrap = el("div", "table-wrap school-board-table-v66");
  const table = document.createElement("table");
  table.innerHTML = `<thead><tr><th>날짜</th><th>제목</th><th>출처</th><th>메모</th><th>원문</th></tr></thead>`;
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const linkTd = el("td", "");
    if (row.link) {
      const a = document.createElement("a");
      a.href = row.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "열기";
      linkTd.append(a);
    } else {
      linkTd.textContent = "-";
    }
    tr.append(
      el("td", "", row.date || "-"),
      el("td", "", row.title || "-"),
      el("td", "", row.source || "-"),
      el("td", "", row.memo || ""),
      linkTd
    );
    tbody.append(tr);
  });
  table.append(tbody);
  wrap.append(table);
  return wrap;
}

function openSchoolImportDialogV66({ title, placeholder, autoLabel = "자동 가져오기", onAuto, onPaste, onFile }) {
  document.querySelector(".school-import-overlay-v66")?.remove();
  const overlay = el("div", "school-import-overlay-v66");
  const modal = el("section", "school-import-modal-v66");
  const head = el("div", "school-import-head-v66");
  const close = button("닫기", "ghost");
  close.addEventListener("click", () => overlay.remove());
  head.append(el("h3", "", title), close);
  const textarea = document.createElement("textarea");
  textarea.placeholder = placeholder;
  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".txt,.html,.htm,.csv,.json";
  file.hidden = true;
  file.addEventListener("change", async () => {
    const picked = file.files?.[0];
    if (!picked) return;
    try {
      const text = await picked.text();
      await onFile(text, picked);
      overlay.remove();
    } catch (error) {
      showMessage("파일 가져오기 실패", error.message || String(error));
    }
  });
  const auto = button(autoLabel, "primary");
  auto.addEventListener("click", async () => {
    auto.disabled = true;
    try {
      await onAuto();
      overlay.remove();
    } catch (error) {
      showMessage("자동 가져오기 실패", error.message || String(error));
    } finally {
      auto.disabled = false;
    }
  });
  const paste = button("붙여넣은 내용 가져오기", "ghost");
  paste.addEventListener("click", async () => {
    try {
      await onPaste(textarea.value);
      overlay.remove();
    } catch (error) {
      showMessage("붙여넣기 실패", error.message || String(error));
    }
  });
  const upload = button("파일 업로드", "ghost");
  upload.addEventListener("click", () => file.click());
  const actions = el("div", "row-actions");
  actions.append(auto, paste, upload);
  modal.append(head, el("p", "muted", "자동 수집이 막히면 원문 페이지를 열어 목록을 복사하거나 txt/html 파일을 업로드하세요."), textarea, file, actions);
  overlay.append(modal);
  document.body.append(overlay);
}

function openSchoolBoardImportV66(context) {
  const label = schoolBoardLabelV66(context);
  openSchoolImportDialogV66({
    title: `${label} 가져오기`,
    placeholder: `${label} 게시판 목록을 복사해 붙여넣으세요. 날짜와 제목을 자동 추출합니다.`,
    autoLabel: "학교 홈페이지에서 가져오기",
    onAuto: () => fetchSchoolBoardV66(context),
    onPaste: (text) => importSchoolBoardTextV66(context, text),
    onFile: (text, file) => importSchoolBoardTextV66(context, text, file.name)
  });
}

async function fetchSchoolBoardV66(context) {
  const key = context === "homeLetters" ? "homeLetters" : "schoolNotices";
  const label = schoolBoardLabelV66(context);
  const rows = await window.PMSchoolIntegrationService.fetchBoard(schoolBoardUrlV66(context), `동아고 ${label}`);
  const added = mergeSchoolRowsV64(key, rows);
  saveStore();
  showMessage("가져오기 완료", `${label} ${rows.length}개 확인, 새 항목 ${added}개 저장`);
  renderSchoolBoardV66(context);
}

function importSchoolBoardTextV66(context, text, fileName = "") {
  const key = context === "homeLetters" ? "homeLetters" : "schoolNotices";
  const label = schoolBoardLabelV66(context);
  let rows = [];
  if (/<html|<table|<a\s/i.test(String(text || ""))) {
    rows = window.PMSchoolIntegrationService.parseBoardHtml(text, schoolBoardUrlV66(context), fileName || `동아고 ${label}`);
  } else {
    rows = String(text || "").split(/\n+/).map((line) => {
      const clean = line.replace(/\s+/g, " ").trim();
      if (!clean) return null;
      const date = (clean.match(/20\d{2}[.\-]\d{2}[.\-]\d{2}/) || [""])[0].replaceAll(".", "-");
      const title = clean.replace(/^공지\s*/, "").replace(/^\d+\s+/, "").replace(/20\d{2}[.\-]\d{2}[.\-]\d{2}.*/, "").trim();
      return title && title.length >= 4 ? { id: `${key}-paste-${Date.now()}-${Math.random()}`, title, date, link: "", source: fileName || "붙여넣기", memo: "" } : null;
    }).filter(Boolean);
  }
  const added = mergeSchoolRowsV64(key, rows);
  saveStore();
  showMessage("가져오기 완료", `${label} ${rows.length}개 확인, 새 항목 ${added}개 저장`);
  renderSchoolBoardV66(context);
}

function openSchoolManualBoardV66(context) {
  const label = schoolBoardLabelV66(context);
  const key = context === "homeLetters" ? "homeLetters" : "schoolNotices";
  document.querySelector(".school-import-overlay-v66")?.remove();
  const overlay = el("div", "school-import-overlay-v66");
  const modal = el("section", "school-import-modal-v66");
  const head = el("div", "school-import-head-v66");
  const close = button("닫기", "ghost");
  close.addEventListener("click", () => overlay.remove());
  head.append(el("h3", "", `${label} 직접 작성`), close);
  const date = document.createElement("input");
  date.type = "date";
  date.value = today;
  const title = document.createElement("input");
  title.placeholder = "제목";
  const memo = document.createElement("textarea");
  memo.placeholder = "내용/메모";
  const link = document.createElement("input");
  link.placeholder = "원문 링크";
  const save = button("게시글 저장", "primary");
  save.addEventListener("click", () => {
    if (!title.value.trim()) return showMessage("입력 필요", "제목을 입력해주세요.");
    store[key] ??= [];
    store[key].unshift({ id: `${key}-manual-${Date.now()}`, date: date.value, title: title.value.trim(), memo: memo.value.trim(), link: link.value.trim(), source: "직접 작성" });
    saveStore();
    overlay.remove();
    renderSchoolBoardV66(context);
  });
  modal.append(head, makeField("날짜", `${key}ManualDateV66`, date), makeField("제목", `${key}ManualTitleV66`, title), makeField("내용", `${key}ManualMemoV66`, memo), makeField("원문 링크", `${key}ManualLinkV66`, link), save);
  overlay.append(modal);
  document.body.append(overlay);
}

renderSchoolNoticesV19 = function renderSchoolNoticesV66() {
  renderSchoolBoardV66("schoolNotices");
};

renderHomeLettersV18 = function renderHomeLettersV66() {
  renderSchoolBoardV66("homeLetters");
};

function academicYearV66() {
  return Number(sessionStorage.getItem("academicYearV66") || new Date().getFullYear());
}

renderAcademicV17 = function renderAcademicV66() {
  ensureSchoolIntegrationV64();
  content.replaceChildren();
  const section = panel("학사일정");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const openCalendar = button("행사 및 일정 열기", "ghost");
  openCalendar.addEventListener("click", () => openSchoolUrlV64("academic"));
  const openAnnual = button("연간 학사 열기", "ghost");
  openAnnual.addEventListener("click", () => openSchoolUrlV64(store.settings.academicAnnualUrl));
  const importBtn = button("학사일정 가져오기", "primary");
  importBtn.addEventListener("click", openAcademicImportV66);
  const manual = button("직접 작성", "ghost");
  manual.addEventListener("click", openAcademicManualV66);
  actions.append(openCalendar, openAnnual, importBtn, manual);
  head.append(actions);

  const year = document.createElement("input");
  year.type = "number";
  year.min = "2020";
  year.max = "2100";
  year.value = academicYearV66();
  year.addEventListener("change", () => {
    sessionStorage.setItem("academicYearV66", year.value);
    renderAcademicV17();
  });
  const search = document.createElement("input");
  search.placeholder = "일정명/내용 검색";
  search.value = sessionStorage.getItem("academicSearchV66") || "";
  search.addEventListener("input", () => {
    sessionStorage.setItem("academicSearchV66", search.value);
    renderAcademicV17();
  });
  const toolbar = el("div", "toolbar school-clean-toolbar-v66");
  toolbar.append(makeField("연도", "academicYearInputV66", year), makeField("검색", "academicSearchInputV66", search));
  const q = search.value.trim().toLowerCase();
  const rows = sortedByDateV66(store.academicSchedules || [])
    .filter((row) => !row.date || String(row.date).startsWith(String(year.value)))
    .filter((row) => !q || `${row.title || ""} ${row.content || ""} ${row.source || ""}`.toLowerCase().includes(q));
  section.append(
    el("p", "muted", "학사일정 URL은 홈페이지 관리에서만 수정합니다. NEIS 기준 전체 연도 일정을 가져오며, 필요하면 직접 작성도 가능합니다."),
    toolbar,
    academicTableV66(rows)
  );
  content.append(section);
};

function academicTableV66(rows) {
  if (!rows.length) return el("div", "empty", "아직 등록된 학사일정이 없습니다. 가져오기를 눌러 NEIS/학교 홈페이지 자료를 불러오세요.");
  return simpleRowsTableV16(["date", "title", "content", "source", "link"], rows);
}

function openAcademicImportV66() {
  openSchoolImportDialogV66({
    title: "학사일정 가져오기",
    placeholder: "학교 학사일정 페이지 또는 연간 학사표 내용을 복사해 붙여넣으세요.",
    autoLabel: "NEIS/학교 홈페이지에서 가져오기",
    onAuto: fetchAcademicSchedulesV66,
    onPaste: (text) => importAcademicTextV66(text, "붙여넣기"),
    onFile: (text, file) => importAcademicTextV66(text, file.name)
  });
}

async function fetchAcademicSchedulesV66() {
  const config = await resolveNeisSchoolV64();
  const year = academicYearV66();
  const rows = await window.PMSchoolIntegrationService.fetchAcademicSchedules({ ...config, start: `${year}-01-01`, end: `${year}-12-31` });
  const added = mergeSchoolRowsV64("academicSchedules", rows);
  const homepageAdded = await syncAcademicHomepageV64();
  saveStore();
  showMessage("가져오기 완료", `NEIS ${rows.length}개 확인, 새 항목 ${added + homepageAdded}개 저장`);
  renderAcademicV17();
}

function importAcademicTextV66(text, source = "붙여넣기") {
  const rows = parseAcademicTextV20(text).map((row) => ({ ...row, source, link: "" }));
  const added = mergeSchoolRowsV64("academicSchedules", rows);
  saveStore();
  showMessage("가져오기 완료", `학사일정 ${rows.length}개 확인, 새 항목 ${added}개 저장`);
  renderAcademicV17();
}

function openAcademicManualV66() {
  document.querySelector(".school-import-overlay-v66")?.remove();
  const overlay = el("div", "school-import-overlay-v66");
  const modal = el("section", "school-import-modal-v66");
  const head = el("div", "school-import-head-v66");
  const close = button("닫기", "ghost");
  close.addEventListener("click", () => overlay.remove());
  head.append(el("h3", "", "학사일정 직접 작성"), close);
  const date = document.createElement("input");
  date.type = "date";
  date.value = today;
  const title = document.createElement("input");
  title.placeholder = "일정명";
  const contentInput = document.createElement("textarea");
  contentInput.placeholder = "내용";
  const save = button("일정 저장", "primary");
  save.addEventListener("click", () => {
    if (!title.value.trim()) return showMessage("입력 필요", "일정명을 입력해주세요.");
    store.academicSchedules.unshift({ id: `academic-manual-${Date.now()}`, date: date.value, title: title.value.trim(), content: contentInput.value.trim(), source: "직접 작성", link: "" });
    saveStore();
    overlay.remove();
    renderAcademicV17();
  });
  modal.append(head, makeField("날짜", "academicManualDateV66", date), makeField("일정명", "academicManualTitleV66", title), makeField("내용", "academicManualContentV66", contentInput), save);
  overlay.append(modal);
  document.body.append(overlay);
}

const renderCollectionV7BeforeMealsV66 = renderCollectionV7;
renderCollectionV7 = function renderCollectionV7MealsV66(key) {
  if (key === "meals") return renderMealsV66();
  return renderCollectionV7BeforeMealsV66(key);
};

function selectedMealDateV66() {
  const value = sessionStorage.getItem("mealViewDateV66") || today;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today;
}

function setMealDateV66(value) {
  sessionStorage.setItem("mealViewDateV66", value || today);
  renderMealsV66();
}

function moveMealDateV66(delta) {
  const date = new Date(`${selectedMealDateV66()}T00:00:00`);
  date.setDate(date.getDate() + delta);
  setMealDateV66(date.toISOString().slice(0, 10));
}

function renderMealsV66() {
  ensureSchoolIntegrationV64();
  content.replaceChildren();
  const section = panel("급식 관리");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const open = button("학교 식단 열기", "ghost");
  open.addEventListener("click", () => openSchoolUrlV64("meals"));
  const importBtn = button("급식 가져오기", "primary");
  importBtn.addEventListener("click", openMealImportV66);
  const manual = button("직접 작성", "ghost");
  manual.addEventListener("click", openMealManualV66);
  actions.append(open, importBtn, manual);
  head.append(actions);

  const selected = selectedMealDateV66();
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = selected;
  dateInput.addEventListener("change", () => setMealDateV66(dateInput.value));
  const prev = button("이전날", "ghost");
  prev.addEventListener("click", () => moveMealDateV66(-1));
  const todayBtn = button("오늘", "ghost");
  todayBtn.addEventListener("click", () => setMealDateV66(today));
  const next = button("다음날", "ghost");
  next.addEventListener("click", () => moveMealDateV66(1));
  const toolbar = el("div", "toolbar school-clean-toolbar-v66");
  toolbar.append(makeField("날짜 선택", "mealDateInputV66", dateInput), prev, todayBtn, next);

  const month = selected.slice(0, 7);
  const dayRows = (store.meals || []).filter((row) => row.date === selected);
  const monthRows = sortedByDateV66(store.meals || []).filter((row) => String(row.date || "").startsWith(month));
  section.append(
    el("p", "muted", "날짜를 선택하면 해당 날짜 급식을 바로 확인할 수 있습니다. 급식 URL/NEIS 코드는 홈페이지 관리에서 수정합니다."),
    toolbar,
    mealDayCardsV66(dayRows, selected),
    el("h3", "subsection-title-v66", `${month} 전체 급식`),
    mealTableV66(monthRows)
  );
  content.append(section);
}

function mealDayCardsV66(rows, date) {
  const wrap = el("div", "meal-day-grid-v66");
  if (!rows.length) {
    wrap.append(el("div", "empty", `${date} 급식 정보가 없습니다. 급식 가져오기를 눌러 해당 월 자료를 불러오세요.`));
    return wrap;
  }
  rows.forEach((row) => {
    const card = el("article", "meal-card-v66");
    card.append(el("strong", "", row.meal || "급식"), el("p", "", row.menu || ""), el("span", "muted", [row.calories, row.source].filter(Boolean).join(" · ")));
    if (row.memo) card.append(el("small", "", row.memo));
    wrap.append(card);
  });
  return wrap;
}

function mealTableV66(rows) {
  if (!rows.length) return el("div", "empty", "이 달에 등록된 급식이 없습니다.");
  return simpleRowsTableV16(["date", "meal", "menu", "calories", "source", "memo"], rows);
}

function openMealImportV66() {
  openSchoolImportDialogV66({
    title: "급식 가져오기",
    placeholder: "급식표 내용을 붙여넣으면 날짜, 식사, 메뉴를 추출합니다. 자동 가져오기는 선택 날짜가 속한 월 전체를 불러옵니다.",
    autoLabel: "NEIS에서 선택 월 가져오기",
    onAuto: fetchMealsForSelectedMonthV66,
    onPaste: (text) => importMealTextV66(text, "붙여넣기"),
    onFile: (text, file) => importMealTextV66(text, file.name)
  });
}

async function fetchMealsForSelectedMonthV66() {
  const date = selectedMealDateV66();
  sessionStorage.setItem("schoolSyncYearV66", date.slice(0, 4));
  sessionStorage.setItem("schoolSyncMonthV66", String(Number(date.slice(5, 7))));
  const config = await resolveNeisSchoolV64();
  const range = window.PMSchoolIntegrationService.monthRange(Number(date.slice(0, 4)), Number(date.slice(5, 7)));
  const rows = await window.PMSchoolIntegrationService.fetchMeals({ ...config, start: range.start, end: range.end });
  const added = mergeSchoolRowsV64("meals", rows);
  saveStore();
  showMessage("가져오기 완료", `급식 ${rows.length}개 확인, 새 항목 ${added}개 저장`);
  renderMealsV66();
}

function importMealTextV66(text, source = "붙여넣기") {
  const rows = [];
  let currentDate = "";
  String(text || "").split(/\n+/).forEach((line) => {
    const clean = line.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const dateMatch = clean.match(/20\d{2}[.\-]\d{1,2}[.\-]\d{1,2}/);
    if (dateMatch) currentDate = dateMatch[0].replaceAll(".", "-").replace(/-(\d)(?=-|$)/g, "-0$1");
    const mealMatch = clean.match(/(조식|중식|석식|아침|점심|저녁)/);
    if (!mealMatch || !currentDate) return;
    const menu = clean.replace(dateMatch?.[0] || "", "").replace(mealMatch[0], "").trim();
    if (menu) rows.push({ id: `meal-paste-${Date.now()}-${Math.random()}`, date: currentDate, meal: mealMatch[0], menu, calories: "", memo: "", source, link: "" });
  });
  const added = mergeSchoolRowsV64("meals", rows);
  saveStore();
  showMessage("가져오기 완료", `급식 ${rows.length}개 확인, 새 항목 ${added}개 저장`);
  renderMealsV66();
}

function openMealManualV66() {
  document.querySelector(".school-import-overlay-v66")?.remove();
  const overlay = el("div", "school-import-overlay-v66");
  const modal = el("section", "school-import-modal-v66");
  const head = el("div", "school-import-head-v66");
  const close = button("닫기", "ghost");
  close.addEventListener("click", () => overlay.remove());
  head.append(el("h3", "", "급식 직접 작성"), close);
  const date = document.createElement("input");
  date.type = "date";
  date.value = selectedMealDateV66();
  const meal = document.createElement("select");
  ["조식", "중식", "석식", "토요일 자습 중식", "간식"].forEach((value) => meal.append(option(value, value)));
  const menu = document.createElement("textarea");
  menu.placeholder = "메뉴";
  const memo = document.createElement("textarea");
  memo.placeholder = "메모/영양/원산지";
  const save = button("급식 저장", "primary");
  save.addEventListener("click", () => {
    if (!date.value || !menu.value.trim()) return showMessage("입력 필요", "날짜와 메뉴를 입력해주세요.");
    store.meals.unshift({ id: `meal-manual-${Date.now()}`, date: date.value, meal: meal.value, menu: menu.value.trim(), calories: "", memo: memo.value.trim(), source: "직접 작성", link: "" });
    saveStore();
    overlay.remove();
    setMealDateV66(date.value);
  });
  modal.append(head, makeField("날짜", "mealManualDateV66", date), makeField("식사", "mealManualTypeV66", meal), makeField("메뉴", "mealManualMenuV66", menu), makeField("메모", "mealManualMemoV66", memo), save);
  overlay.append(modal);
  document.body.append(overlay);
}

ensureSchoolIntegrationV64();

// Final V65: clean UTF-8 school integration UI/messages over the V64 data flow.
function isBrokenSchoolTextV65(value) {
  return typeof value === "string" && (value.includes("怨") || value.includes("숈") || value.includes("�"));
}

function ensureSchoolIntegrationV64() {
  ensureAppV29();
  store.meals ??= [];
  store.academicSchedules ??= [];
  store.schoolNotices ??= [];
  store.homeLetters ??= [];
  store.settings ??= {};
  if (!store.settings.schoolName || isBrokenSchoolTextV65(store.settings.schoolName)) store.settings.schoolName = "동아고등학교";
  store.settings.schoolHomepageUrl ??= "https://school.busanedu.net/dong-a-h/main.do";
  store.settings.neisMealOfficeCode ||= store.settings.neisOfficeCode || "C10";
  store.settings.neisOfficeCode ||= store.settings.neisMealOfficeCode || "C10";
  store.settings.neisMealSchoolCode ||= store.settings.neisSchoolCode || "";
  store.settings.neisSchoolCode ||= store.settings.neisMealSchoolCode || "";
  store.settings.neisApiKey ||= window.PMSchoolIntegrationService?.publicNeisKey?.() || "";
  store.settings.schoolNoticeUrl ??= "https://school.busanedu.net/dong-a-h/na/ntt/selectNttList.do?bbsId=1013416&mi=622560";
  store.settings.homeLetterUrl ??= "https://school.busanedu.net/dong-a-h/na/ntt/selectNttList.do?bbsId=1013419&mi=622563";
  store.settings.academicCalendarUrl ??= "https://school.busanedu.net/dong-a-h/sv/schdulView/schdulCalendarView.do?mi=1051003";
  store.settings.academicAnnualUrl ??= "https://school.busanedu.net/dong-a-h/cm/cntnts/cntntsView.do?cntntsId=14887&mi=622567";
  store.settings.schoolAutoSyncEnabled ??= true;
  store.settings.schoolAutoSyncHours ??= 12;
  store.settings.schoolSyncLastAtIso ??= "";
  store.settings.appVersion = "v65.0 - 2026-06-19";
}

function schoolConfigV64() {
  ensureSchoolIntegrationV64();
  const apiKey = document.getElementById("schoolNeisApiKeyV64")?.value.trim() || store.settings.neisApiKey || window.PMSchoolIntegrationService?.publicNeisKey?.() || "";
  const officeCode = document.getElementById("schoolOfficeCodeV64")?.value.trim() || store.settings.neisOfficeCode || store.settings.neisMealOfficeCode || "C10";
  const schoolCode = document.getElementById("schoolCodeV64")?.value.trim() || store.settings.neisSchoolCode || store.settings.neisMealSchoolCode || "";
  return {
    apiKey,
    officeCode,
    schoolCode,
    schoolName: document.getElementById("schoolNameV64")?.value.trim() || store.settings.schoolName || "동아고등학교"
  };
}

function persistSchoolConfigV64(config = schoolConfigV64()) {
  store.settings.schoolName = config.schoolName || "동아고등학교";
  store.settings.neisOfficeCode = config.officeCode || "C10";
  store.settings.neisMealOfficeCode = config.officeCode || "C10";
  store.settings.neisSchoolCode = config.schoolCode || "";
  store.settings.neisMealSchoolCode = config.schoolCode || "";
  store.settings.neisApiKey = config.apiKey || "";
  saveStore();
}

async function resolveNeisSchoolV64() {
  const config = schoolConfigV64();
  if (config.officeCode && config.schoolCode) {
    persistSchoolConfigV64(config);
    showMessage("학교 코드 저장", `${config.officeCode} / ${config.schoolCode}`);
    return config;
  }
  try {
    const results = await window.PMSchoolIntegrationService.findSchool(config);
    const selected = results.find((row) => row.schoolName === config.schoolName) || results[0];
    if (!selected) throw new Error("검색 결과가 없습니다.");
    const nextConfig = {
      ...config,
      officeCode: selected.officeCode || config.officeCode,
      schoolCode: selected.schoolCode,
      schoolName: selected.schoolName || config.schoolName
    };
    persistSchoolConfigV64(nextConfig);
    showMessage("학교 코드 확인", `${nextConfig.schoolName} · ${nextConfig.officeCode} / ${nextConfig.schoolCode}`);
    return nextConfig;
  } catch (error) {
    showMessage("학교 코드 검색 실패", error.message || String(error));
    throw error;
  }
}

function schoolSyncStatusV64() {
  const box = el("div", "school-sync-status-v64");
  const last = store.settings.schoolSyncLastAt || "기록 없음";
  const result = store.settings.schoolSyncLastResult || "아직 동기화하지 않았습니다.";
  box.innerHTML = `<strong>최근 동기화</strong><span>${last}</span><p>${result}</p>`;
  return box;
}

function urlForSchoolContextV64(context = "home") {
  if (context === "schoolNotices") return store.settings.schoolNoticeUrl || store.settings.schoolHomepageUrl;
  if (context === "homeLetters") return store.settings.homeLetterUrl || store.settings.schoolHomepageUrl;
  if (context === "academic") return store.settings.academicCalendarUrl || store.settings.academicAnnualUrl || store.settings.schoolHomepageUrl;
  if (context === "meals") return store.settings.schoolHomepageUrl || window.PMSchoolIntegrationService?.defaultHomepageUrl;
  return store.settings.schoolHomepageUrl || window.PMSchoolIntegrationService?.defaultHomepageUrl || "https://school.busanedu.net/dong-a-h/main.do";
}

function openSchoolUrlV64(context = "home") {
  const target = /^https?:\/\//.test(String(context)) ? context : urlForSchoolContextV64(context);
  if (window.PMShared?.navigation?.openExternalSite) window.PMShared.navigation.openExternalSite(target);
  else window.open(target, "_blank", "noopener,noreferrer");
}

function schoolSyncPanelV64(context = "all") {
  ensureSchoolIntegrationV64();
  const box = el("section", "panel school-sync-panel-v64");
  const titleMap = {
    all: "학교/NEIS 자동 연동",
    meals: "급식 자동 동기화",
    academic: "학사일정 자동 동기화",
    schoolNotices: "학교공지 자동 동기화",
    homeLetters: "가정통신문 자동 동기화"
  };
  const heading = el("div", "section-title");
  heading.innerHTML = `<h3>${titleMap[context] || titleMap.all}</h3><p>NEIS 공개 API와 학교 홈페이지 자료를 현재 워크스페이스에 저장합니다. 직접 작성도 함께 사용할 수 있습니다.</p>`;
  const actions = el("div", "action-row");
  const openHome = button("학교 홈페이지 바로가기", "ghost");
  openHome.addEventListener("click", () => openSchoolUrlV64("home"));
  const openCurrent = button("현재 자료실 열기", "ghost");
  openCurrent.addEventListener("click", () => openSchoolUrlV64(context));
  const syncTarget = button(context === "all" ? "전체 동기화" : "이 탭 동기화", "primary");
  syncTarget.addEventListener("click", () => runSchoolSyncV64(context === "all" ? SCHOOL_SYNC_TARGETS_V64 : [context], { manual: true }));
  actions.append(openHome, openCurrent, syncTarget);

  const range = selectedSchoolMonthV64();
  const grid = el("div", "form-grid");
  grid.append(
    makeTextField("학교명", "schoolNameV64", store.settings.schoolName || "동아고등학교"),
    makeTextField("교육청 코드", "schoolOfficeCodeV64", store.settings.neisOfficeCode || "C10"),
    makeTextField("학교 코드", "schoolCodeV64", store.settings.neisSchoolCode || ""),
    makeTextField("NEIS API Key", "schoolNeisApiKeyV64", store.settings.neisApiKey || window.PMSchoolIntegrationService?.publicNeisKey?.() || ""),
    makeField("동기화 연도/월", `<div class="inline-row"><input id="schoolSyncYearV64" type="number" min="2020" max="2100" value="${range.year}" /><input id="schoolSyncMonthV64" type="number" min="1" max="12" value="${range.month}" /></div>`),
    makeField("자동 동기화", `<label class="inline-check"><input id="schoolAutoSyncEnabledV64" type="checkbox" ${store.settings.schoolAutoSyncEnabled !== false ? "checked" : ""} /> 12시간마다 자동 동기화</label>`)
  );
  const saveButton = button("연동 설정 저장", "ghost");
  saveButton.addEventListener("click", () => {
    const config = schoolConfigV64();
    config.schoolName = document.getElementById("schoolNameV64").value.trim() || "동아고등학교";
    persistSchoolConfigV64(config);
    store.settings.schoolAutoSyncEnabled = document.getElementById("schoolAutoSyncEnabledV64")?.checked !== false;
    saveStore();
    showMessage("저장 완료", "학교 연동 설정을 저장했습니다.");
  });
  const findButton = button("학교 코드 검색", "ghost");
  findButton.addEventListener("click", () => resolveNeisSchoolV64());
  const configActions = el("div", "action-row");
  configActions.append(saveButton, findButton);
  box.append(heading, actions, schoolSyncStatusV64(), grid, configActions);
  return box;
}

function insertSchoolPanelV64(context, panels = [schoolSyncPanelV64(context)]) {
  if (!content || content.querySelector(".school-sync-panel-v64")) return;
  content.prepend(...panels);
}

function schoolManualMealPanelV64() {
  const box = el("section", "panel school-manual-panel-v64");
  box.innerHTML = `<div class="section-title"><h3>급식 수동 작성</h3><p>NEIS에서 누락되거나 별도 안내가 필요한 급식은 직접 작성할 수 있습니다.</p></div>`;
  const grid = el("div", "form-grid");
  grid.append(
    makeTextField("날짜", "manualMealDateV64", new Date().toISOString().slice(0, 10)),
    makeSelect("식사", "manualMealTypeV64", ["조식", "중식", "석식", "토요일 자습 중식"], "중식"),
    makeTextarea("메뉴", "manualMealMenuV64", ""),
    makeTextField("칼로리/메모", "manualMealMemoV64", "")
  );
  const save = button("수동 급식 저장", "primary");
  save.addEventListener("click", () => {
    const date = document.getElementById("manualMealDateV64").value.trim();
    const meal = document.getElementById("manualMealTypeV64").value;
    const menu = document.getElementById("manualMealMenuV64").value.trim();
    if (!date || !menu) return showMessage("입력 필요", "날짜와 메뉴를 입력해주세요.");
    store.meals ??= [];
    store.meals.unshift({
      id: `manual-meal-${Date.now()}`,
      date,
      meal,
      menu,
      calories: "",
      memo: document.getElementById("manualMealMemoV64").value.trim(),
      source: "수동 작성",
      link: store.settings.schoolHomepageUrl || ""
    });
    saveStore();
    showMessage("저장 완료", "급식을 수동으로 등록했습니다.");
    renderPage("meals");
  });
  box.append(grid, save);
  return box;
}

function schoolManualBoardPanelV64(context) {
  const isLetter = context === "homeLetters";
  const title = isLetter ? "가정통신문 수동 작성" : "학교공지 수동 작성";
  const key = isLetter ? "homeLetters" : "schoolNotices";
  const box = el("section", "panel school-manual-panel-v64");
  box.innerHTML = `<div class="section-title"><h3>${title}</h3><p>홈페이지 자동 수집이 막히거나 직접 보관할 글은 여기에서 작성합니다.</p></div>`;
  const grid = el("div", "form-grid");
  grid.append(
    makeTextField("날짜", `${key}ManualDateV64`, new Date().toISOString().slice(0, 10)),
    makeTextField("제목", `${key}ManualTitleV64`, ""),
    makeTextarea("내용/메모", `${key}ManualMemoV64`, ""),
    makeTextField("원문 링크", `${key}ManualLinkV64`, "")
  );
  const save = button("수동 글 저장", "primary");
  save.addEventListener("click", () => {
    const titleValue = document.getElementById(`${key}ManualTitleV64`).value.trim();
    if (!titleValue) return showMessage("입력 필요", "제목을 입력해주세요.");
    store[key] ??= [];
    store[key].unshift({
      id: `${key}-manual-${Date.now()}`,
      date: document.getElementById(`${key}ManualDateV64`).value.trim(),
      title: titleValue,
      memo: document.getElementById(`${key}ManualMemoV64`).value.trim(),
      link: document.getElementById(`${key}ManualLinkV64`).value.trim(),
      source: "수동 작성"
    });
    saveStore();
    showMessage("저장 완료", "글을 수동으로 등록했습니다.");
    renderPage(context);
  });
  box.append(grid, save);
  return box;
}

function enhanceMealsV64() {
  insertSchoolPanelV64("meals", [schoolSyncPanelV64("meals"), schoolManualMealPanelV64()]);
}

function enhanceAcademicV64() {
  insertSchoolPanelV64("academic", [schoolSyncPanelV64("academic")]);
}

function enhanceBoardV64(context) {
  insertSchoolPanelV64(context, [schoolSyncPanelV64(context), schoolManualBoardPanelV64(context)]);
}

async function runSchoolSyncV64(targets = SCHOOL_SYNC_TARGETS_V64, options = {}) {
  if (schoolSyncRunningV64) return;
  if (!window.PMSchoolIntegrationService) return showMessage("연동 모듈 없음", "학교 연동 서비스 파일을 불러오지 못했습니다.");
  schoolSyncRunningV64 = true;
  const summary = [];
  try {
    const config = await resolveNeisSchoolV64();
    const range = selectedSchoolMonthV64();
    const monthRange = window.PMSchoolIntegrationService.monthRange(range.year, range.month);
    if (targets.includes("meals")) {
      const rows = await window.PMSchoolIntegrationService.fetchMeals({ ...config, start: monthRange.start, end: monthRange.end });
      const added = mergeSchoolRowsV64("meals", rows);
      summary.push(`급식 ${added}/${rows.length}`);
    }
    if (targets.includes("academic")) {
      const yearRange = { start: `${range.year}-01-01`, end: `${range.year}-12-31` };
      const rows = await window.PMSchoolIntegrationService.fetchAcademicSchedules({ ...config, start: yearRange.start, end: yearRange.end });
      const added = mergeSchoolRowsV64("academicSchedules", rows);
      const homepageAdded = await syncAcademicHomepageV64();
      summary.push(`학사일정 ${added + homepageAdded}/${rows.length + homepageAdded}`);
    }
    if (targets.includes("schoolNotices")) {
      const rows = await window.PMSchoolIntegrationService.fetchBoard(store.settings.schoolNoticeUrl, "동아고 공지");
      const added = mergeSchoolRowsV64("schoolNotices", rows);
      summary.push(`학교공지 ${added}/${rows.length}`);
    }
    if (targets.includes("homeLetters")) {
      const rows = await window.PMSchoolIntegrationService.fetchBoard(store.settings.homeLetterUrl, "동아고 가정통신문");
      const added = mergeSchoolRowsV64("homeLetters", rows);
      summary.push(`가정통신문 ${added}/${rows.length}`);
    }
    const finishedAt = new Date();
    store.settings.schoolSyncLastAt = finishedAt.toLocaleString("ko-KR");
    store.settings.schoolSyncLastAtIso = finishedAt.toISOString();
    store.settings.schoolSyncLastResult = summary.join(" · ") || "동기화할 항목 없음";
    saveStore();
    if (!options.silent) showMessage("동기화 완료", store.settings.schoolSyncLastResult);
    renderPage(currentPage || "dashboard");
  } catch (error) {
    const message = error.message || String(error);
    const failedAt = new Date();
    store.settings.schoolSyncLastAt = failedAt.toLocaleString("ko-KR");
    store.settings.schoolSyncLastAtIso = failedAt.toISOString();
    store.settings.schoolSyncLastResult = `실패: ${message}`;
    saveStore();
    if (!options.silent) showMessage("동기화 실패", `${message}\n브라우저 보안/CORS가 원인이라면 홈페이지 바로가기, 수동 작성 또는 붙여넣기를 사용해주세요.`);
  } finally {
    schoolSyncRunningV64 = false;
  }
}

async function syncAcademicHomepageV64() {
  const urls = [store.settings.academicCalendarUrl, store.settings.academicAnnualUrl].filter(Boolean);
  let added = 0;
  for (const url of urls) {
    try {
      const html = await window.PMSchoolIntegrationService.fetchHtml(url);
      const docText = new DOMParser().parseFromString(html, "text/html").body?.innerText || "";
      const rows = parseAcademicTextV20(docText).map((row) => ({ ...row, source: "동아고 홈페이지", link: url }));
      added += mergeSchoolRowsV64("academicSchedules", rows);
    } catch (error) {
      console.info("[school-sync:academic-homepage]", { url, message: error?.message || String(error) });
    }
  }
  return added;
}

function renderSiteSchoolIntegrationV64() {
  if (document.getElementById("schoolIntegrationSiteBoxV64")) return;
  const box = schoolSyncPanelV64("all");
  box.id = "schoolIntegrationSiteBoxV64";
  const urlGrid = el("div", "form-grid");
  urlGrid.append(
    makeTextField("학교 홈페이지", "schoolHomepageUrlV64", store.settings.schoolHomepageUrl || ""),
    makeTextField("공지사항 URL", "schoolNoticeUrlV64", store.settings.schoolNoticeUrl || ""),
    makeTextField("가정통신문 URL", "homeLetterUrlV64", store.settings.homeLetterUrl || ""),
    makeTextField("월간 학사 URL", "academicCalendarUrlV64", store.settings.academicCalendarUrl || ""),
    makeTextField("연간 학사 URL", "academicAnnualUrlV64", store.settings.academicAnnualUrl || "")
  );
  const saveUrls = button("학교 URL 저장", "ghost");
  saveUrls.addEventListener("click", () => {
    store.settings.schoolHomepageUrl = document.getElementById("schoolHomepageUrlV64").value.trim();
    store.settings.schoolNoticeUrl = document.getElementById("schoolNoticeUrlV64").value.trim();
    store.settings.homeLetterUrl = document.getElementById("homeLetterUrlV64").value.trim();
    store.settings.academicCalendarUrl = document.getElementById("academicCalendarUrlV64").value.trim();
    store.settings.academicAnnualUrl = document.getElementById("academicAnnualUrlV64").value.trim();
    saveStore();
    showMessage("저장 완료", "학교 홈페이지 연동 URL을 저장했습니다.");
  });
  box.append(urlGrid, saveUrls);
  content.append(box);
}

ensureSchoolIntegrationV64();

// Final V69: this block intentionally runs after every school integration patch.
function localDateStringV69(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateV69(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

selectedMealDateV66 = function selectedMealDateV69() {
  const value = sessionStorage.getItem("mealViewDateV66") || localDateStringV69();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localDateStringV69();
};

setMealDateV66 = function setMealDateV69(value) {
  const nextValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : localDateStringV69();
  sessionStorage.setItem("mealViewDateV66", nextValue);
  renderMealsV66();
};

moveMealDateV66 = function moveMealDateV69(delta) {
  const date = parseLocalDateV69(selectedMealDateV66());
  date.setDate(date.getDate() + delta);
  setMealDateV66(localDateStringV69(date));
};

renderMealsV66 = function renderMealsV69() {
  ensureSchoolIntegrationV64();
  content.replaceChildren();
  const section = panel("급식 관리");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const open = button("학교 식단 열기", "ghost");
  open.addEventListener("click", () => openSchoolUrlV64("meals"));
  const importBtn = button("급식 가져오기", "primary");
  importBtn.addEventListener("click", openMealImportV66);
  const manual = button("직접 작성", "ghost");
  manual.addEventListener("click", openMealManualV66);
  actions.append(open, importBtn, manual);
  head.append(actions);

  const selected = selectedMealDateV66();
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = selected;
  dateInput.addEventListener("change", () => setMealDateV66(dateInput.value));
  const prev = button("이전날", "ghost");
  prev.addEventListener("click", () => moveMealDateV66(-1));
  const todayBtn = button("오늘", "ghost");
  todayBtn.addEventListener("click", () => setMealDateV66(localDateStringV69()));
  const next = button("다음날", "ghost");
  next.addEventListener("click", () => moveMealDateV66(1));
  const toolbar = el("div", "toolbar school-clean-toolbar-v66 meal-date-actions-v69");
  toolbar.append(makeField("날짜 선택", "mealDateInputV66", dateInput), prev, todayBtn, next);

  const month = selected.slice(0, 7);
  const dayRows = (store.meals || []).filter((row) => row.date === selected);
  const monthRows = sortedByDateV66(store.meals || []).filter((row) => String(row.date || "").startsWith(month));
  section.append(
    el("p", "muted", "날짜를 선택하면 해당 날짜 급식을 바로 확인할 수 있습니다. 급식 URL/NEIS 코드는 홈페이지 관리에서 수정합니다."),
    toolbar,
    mealDayCardsV66(dayRows, selected),
    el("h3", "subsection-title-v66", `${month} 전체 급식`),
    mealTableV66(monthRows)
  );
  content.append(section);
};

function selectedAcademicMonthV69() {
  const stored = sessionStorage.getItem("academicMonthV69") || sessionStorage.getItem("academicMonthV68");
  const fallback = localDateStringV69().slice(0, 7);
  return /^\d{4}-\d{2}$/.test(stored || "") ? stored : fallback;
}

function setAcademicMonthV69(value) {
  const nextValue = /^\d{4}-\d{2}$/.test(String(value || "")) ? value : localDateStringV69().slice(0, 7);
  sessionStorage.setItem("academicMonthV69", nextValue);
}

function moveAcademicMonthV69(delta) {
  const [year, month] = selectedAcademicMonthV69().split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  setAcademicMonthV69(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  renderAcademicV17();
}

academicYearV66 = function academicYearV69() {
  return Number(selectedAcademicMonthV69().slice(0, 4));
};

function academicCalendarV69(rows, year, month) {
  const byDate = new Map();
  rows.forEach((row) => {
    const date = String(row.date || "");
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(row);
  });
  const wrap = el("div", "academic-calendar-v69");
  ["일", "월", "화", "수", "목", "금", "토"].forEach((day) => wrap.append(el("div", "academic-calendar-head-v69", day)));
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  for (let i = 0; i < firstDay.getDay(); i += 1) wrap.append(el("div", "academic-calendar-cell-v69 academic-calendar-empty-v69", ""));
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = localDateStringV69(new Date(year, month - 1, day));
    const cell = el("div", "academic-calendar-cell-v69");
    cell.append(el("strong", "", String(day)));
    const items = byDate.get(date) || [];
    if (!items.length) {
      cell.append(el("span", "muted", "-"));
    } else {
      items.slice(0, 4).forEach((row) => {
        const item = el("p", "", row.title || row.memo || "일정");
        item.title = [row.title, row.memo].filter(Boolean).join("\n");
        cell.append(item);
      });
      if (items.length > 4) cell.append(el("small", "muted", `+${items.length - 4}개`));
    }
    wrap.append(cell);
  }
  return wrap;
}

renderAcademicV17 = function renderAcademicV69() {
  ensureSchoolIntegrationV64();
  content.replaceChildren();
  const section = panel("학사일정");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const open = button("학사일정 열기", "ghost");
  open.addEventListener("click", () => openSchoolUrlV64("academic"));
  const importBtn = button("학사일정 가져오기", "primary");
  importBtn.addEventListener("click", openAcademicImportV66);
  const manual = button("직접 작성", "ghost");
  manual.addEventListener("click", openAcademicManualV66);
  actions.append(open, importBtn, manual);
  head.append(actions);

  const selectedMonth = selectedAcademicMonthV69();
  const monthInput = document.createElement("input");
  monthInput.type = "month";
  monthInput.value = selectedMonth;
  monthInput.addEventListener("change", () => {
    setAcademicMonthV69(monthInput.value);
    renderAcademicV17();
  });

  const mode = document.createElement("select");
  mode.append(option("list", "리스트"), option("calendar", "달력"));
  mode.value = sessionStorage.getItem("academicViewModeV69") || sessionStorage.getItem("academicViewModeV68") || "list";
  mode.addEventListener("change", () => {
    sessionStorage.setItem("academicViewModeV69", mode.value);
    renderAcademicV17();
  });

  const query = document.createElement("input");
  query.type = "search";
  query.placeholder = "제목, 메모, 출처 검색";
  query.value = sessionStorage.getItem("academicSearchV66") || "";
  query.addEventListener("input", () => {
    sessionStorage.setItem("academicSearchV66", query.value);
    renderAcademicV17();
  });

  const prev = button("이전월", "ghost");
  prev.addEventListener("click", () => moveAcademicMonthV69(-1));
  const now = button("이번달", "ghost");
  now.addEventListener("click", () => {
    setAcademicMonthV69(localDateStringV69().slice(0, 7));
    renderAcademicV17();
  });
  const next = button("다음월", "ghost");
  next.addEventListener("click", () => moveAcademicMonthV69(1));

  const toolbar = el("div", "toolbar school-clean-toolbar-v66 academic-toolbar-v69");
  toolbar.append(makeField("월 선택", "academicMonthV69", monthInput), makeField("보기", "academicViewModeV69", mode), makeField("검색", "academicSearchV66", query), prev, now, next);

  const year = Number(selectedMonth.slice(0, 4));
  const month = Number(selectedMonth.slice(5, 7));
  const term = query.value.trim().toLowerCase();
  const rows = sortedByDateV66(store.academicSchedules || [])
    .filter((row) => String(row.date || "").startsWith(selectedMonth))
    .filter((row) => !term || [row.title, row.memo, row.source].some((value) => String(value || "").toLowerCase().includes(term)));

  section.append(
    el("p", "muted", "월별로 학사일정을 확인합니다. 너무 긴 연간 목록은 월을 선택해서 좁히고, 리스트/달력 보기 중 필요한 방식으로 전환하세요."),
    toolbar,
    el("h3", "subsection-title-v66", `${selectedMonth} 학사일정 ${rows.length}건`),
    mode.value === "calendar" ? academicCalendarV69(rows, year, month) : academicTableV66(rows)
  );
  content.append(section);
};

var ensureSchoolIntegrationBeforeV69 = ensureSchoolIntegrationV64;
ensureSchoolIntegrationV64 = function ensureSchoolIntegrationV69() {
  ensureSchoolIntegrationBeforeV69();
  store.settings.appVersion = "v69.0 - 2026-06-19";
};

ensureSchoolIntegrationV64();

// Final V70: meal quick-view date selector and reliable homepage dashboard settings save.
const DASHBOARD_CARD_KEYS_V70 = [
  "attendance",
  "schedules",
  "academic",
  "notices",
  "schoolNotices",
  "homeLetters",
  "meals",
  "assignments",
  "exams",
  "portfolios",
  "penalties",
  "timetable"
];

function localDateStringV70(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function selectedQuickMealDateV70() {
  const value = sessionStorage.getItem("quickMealDateV70") || localDateStringV70();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localDateStringV70();
}

function setQuickMealDateV70(value) {
  const next = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : localDateStringV70();
  sessionStorage.setItem("quickMealDateV70", next);
  showQuickPopup("meals");
}

function dashboardCardKeysV70() {
  const selected = Array.isArray(store.settings?.dashboardCards) ? store.settings.dashboardCards : DASHBOARD_CARD_KEYS_V70;
  return selected.filter((key) => DASHBOARD_CARD_KEYS_V70.includes(key));
}

function dashboardRowsV70(key) {
  if (key === "academic") return store.academicSchedules || [];
  if (key === "schoolNotices") return store.schoolNotices || [];
  if (key === "homeLetters") return store.homeLetters || [];
  if (key === "notices") return typeof visibleNotices === "function" ? visibleNotices() : (store.notices || []);
  return store[key] || [];
}

function quickMealKindV70(row) {
  const text = String(row?.meal || "");
  if (/석식|저녁|dinner/i.test(text)) return "dinner";
  if (/중식|점심|lunch|토요일.*중식/i.test(text)) return "lunch";
  return "";
}

function quickMealCardV70(title, rows, date) {
  const card = el("article", "quick-meal-card-v70");
  card.append(el("strong", "", title));
  if (!rows.length) {
    card.append(el("p", "muted", `${date} 등록된 ${title} 정보가 없습니다.`));
    return card;
  }
  rows.forEach((row) => {
    const item = el("div", "quick-meal-item-v70");
    item.append(el("p", "", row.menu || "메뉴 없음"));
    const meta = [row.calories, row.source, row.memo].filter(Boolean).join(" · ");
    if (meta) item.append(el("small", "muted", meta));
    card.append(item);
  });
  return card;
}

function quickMealViewV70(wrap) {
  const date = selectedQuickMealDateV70();
  const controls = el("div", "quick-meal-controls-v70");
  const input = document.createElement("input");
  input.type = "date";
  input.value = date;
  input.addEventListener("change", () => setQuickMealDateV70(input.value));
  const prev = button("이전날", "ghost small");
  prev.addEventListener("click", () => {
    const d = new Date(`${selectedQuickMealDateV70()}T00:00:00`);
    d.setDate(d.getDate() - 1);
    setQuickMealDateV70(localDateStringV70(d));
  });
  const todayBtn = button("오늘", "ghost small");
  todayBtn.addEventListener("click", () => setQuickMealDateV70(localDateStringV70()));
  const next = button("다음날", "ghost small");
  next.addEventListener("click", () => {
    const d = new Date(`${selectedQuickMealDateV70()}T00:00:00`);
    d.setDate(d.getDate() + 1);
    setQuickMealDateV70(localDateStringV70(d));
  });
  controls.append(makeField("날짜 선택", "quickMealDateInputV70", input), prev, todayBtn, next);
  wrap.append(controls);

  const dayRows = (store.meals || []).filter((row) => row.date === date);
  const lunch = dayRows.filter((row) => quickMealKindV70(row) === "lunch");
  const dinner = dayRows.filter((row) => quickMealKindV70(row) === "dinner");
  const others = dayRows.filter((row) => !quickMealKindV70(row));
  const grid = el("div", "quick-meal-grid-v70");
  grid.append(quickMealCardV70("중식", lunch.length ? lunch : others, date), quickMealCardV70("석식", dinner, date));
  wrap.append(grid);
}

function quickTimetableViewV70(wrap) {
  if (typeof quickTimetableControlsV9 === "function") wrap.append(quickTimetableControlsV9());
  const rows = typeof quickTimetableRowsV9 === "function"
    ? quickTimetableRowsV9()
    : typeof quickTimetableRowsV5 === "function"
      ? quickTimetableRowsV5()
      : (store.timetable || []);
  if (!rows.length) {
    wrap.append(el("div", "empty", "표시할 시간표가 없습니다."));
    return;
  }
  rows.forEach((row) => {
    const item = el("div", "quick-tt-row");
    item.append(
      el("strong", "", `${row.period || ""} ${row.time || ""}`.trim()),
      el("span", "", `${row.day || ""} · ${row.subject || ""}`),
      el("small", "", [row.teacher, row.room].filter(Boolean).join(" / "))
    );
    wrap.append(item);
  });
}

showQuickPopup = function showQuickPopupV70(type) {
  const old = document.getElementById("quickPopup");
  if (old) old.remove();
  const wrap = el("div", "quick-popup quick-popup-v70");
  wrap.id = "quickPopup";
  const head = el("div", "panel-head");
  head.append(el("h3", "", type === "meals" ? "급식 빠른 보기" : "시간표 빠른 보기"));
  const close = button("×", "icon-button");
  close.addEventListener("click", () => wrap.remove());
  head.append(close);
  wrap.append(head);
  if (type === "meals") quickMealViewV70(wrap);
  else quickTimetableViewV70(wrap);
  document.body.append(wrap);
};

function openQuickCreateV70(key) {
  if (!can("create", key)) return;
  if (typeof openEditorV7 === "function") return openEditorV7(key);
  if (typeof openEditorV6 === "function") return openEditorV6(key);
  if (typeof openEditorV5 === "function") return openEditorV5(key);
  if (typeof openEditor === "function") return openEditor(key, null, "dashboard");
}

renderDashboardV8 = function renderDashboardV70() {
  store.settings.dashboardCards ??= [...DASHBOARD_CARD_KEYS_V70];
  content.replaceChildren();
  if (typeof renderSystemNoticesPanelV54 === "function") {
    content.append(renderSystemNoticesPanelV54());
  } else if (store.settings.systemNoticeEnabled !== false) {
    const notice = el("div", "system-notice");
    notice.append(el("strong", "", "시스템 공지"), el("span", "", store.settings.systemNotice || ""));
    content.append(notice);
  }

  const quick = panel("빠른 등록");
  const actions = el("div", "quick-actions");
  (store.settings.quickButtons || []).forEach((key) => {
    const btn = button(`${pageLabel(key)} 추가`);
    btn.disabled = !can("create", key);
    btn.addEventListener("click", () => openQuickCreateV70(key));
    actions.append(btn);
  });
  if (!actions.children.length) actions.append(el("p", "muted", "홈페이지 관리에서 빠른등록 항목을 선택하세요."));
  quick.append(actions);
  content.append(quick);

  const grid = el("div", "dashboard-grid");
  dashboardCardKeysV70().forEach((key) => {
    if (typeof dashboardBoxV5 === "function") grid.append(dashboardBoxV5(key, pageLabel(key), dashboardRowsV70(key)));
  });
  if (!grid.children.length) grid.append(el("div", "empty", "홈페이지 관리에서 메인 대시보드 표시 항목을 선택하세요."));
  content.append(grid);
};

function appendDashboardCardSettingsV70() {
  const grid = content.querySelector(".form-grid");
  if (!grid || document.getElementById("dashboardCardsBoxV70")) return;
  store.settings.dashboardCards ??= [...DASHBOARD_CARD_KEYS_V70];
  grid.append(makeCheckboxGroupV7("메인 대시보드 표시 항목", "dashboardCardsBoxV70", DASHBOARD_CARD_KEYS_V70.map((key) => [key, pageLabel(key)]), dashboardCardKeysV70()));
}

const renderSiteV20BeforeV70 = renderSiteV20;
renderSiteV20 = function renderSiteV70() {
  renderSiteV20BeforeV70();
  appendDashboardCardSettingsV70();
  const save = document.getElementById("saveSite");
  if (save) {
    const clone = save.cloneNode(true);
    clone.addEventListener("click", () => saveSiteSettingsV2());
    save.replaceWith(clone);
  }
};

async function sitePasswordOkV70(passwordValue) {
  if (!passwordValue) return false;
  if (currentUser?.password) return passwordValue === currentUser.password;
  const authUser = authStateV31?.users?.find?.((user) => user.uid === currentUser?.uid || user.id === currentUser?.id || user.email === currentUser?.email);
  if (window.PMAuthService?.verifyLocalPassword && authUser) {
    try {
      if (await window.PMAuthService.verifyLocalPassword(authUser, passwordValue)) return true;
    } catch (error) {
      console.info("[site password local check skipped]", error?.message || String(error));
    }
  }
  if (window.PMAuthService?.firebaseSignInWithEmailOnly && currentUser?.email) {
    try {
      const user = await window.PMAuthService.firebaseSignInWithEmailOnly(currentUser.email, passwordValue);
      return !!user;
    } catch (error) {
      console.info("[site password firebase check failed]", error?.code || "", error?.message || String(error));
    }
  }
  return false;
}

saveSiteSettingsV2 = async function saveSiteSettingsV70() {
  const errorField = document.getElementById("siteError");
  const passwordField = document.getElementById("sitePasswordInput");
  if (errorField) errorField.textContent = "";
  try {
    const ok = await sitePasswordOkV70(passwordField?.value || "");
    if (!ok) {
      if (errorField) errorField.textContent = "비밀번호가 올바르지 않습니다. Firebase 이메일/비밀번호 계정은 현재 비밀번호로 다시 확인합니다.";
      return;
    }

    const value = (id) => document.getElementById(id)?.value ?? "";
    if (document.getElementById("siteNameInput")) store.settings.siteName = value("siteNameInput");
    if (document.getElementById("logoTextInput")) store.settings.logoText = value("logoTextInput");
    if (document.getElementById("systemNoticeInput")) store.settings.systemNotice = value("systemNoticeInput");
    if (document.getElementById("systemNoticeInputV30")) store.settings.systemNotice = value("systemNoticeInputV30");
    if (document.getElementById("editModeInput")) store.settings.editMode = value("editModeInput") === "on";

    const quickBox = document.getElementById("quickEnabledBox");
    if (quickBox) store.settings.quickButtons = [...quickBox.querySelectorAll("input:checked")].map((input) => input.value);

    const dashboardBox = document.getElementById("dashboardCardsBoxV70");
    if (dashboardBox) store.settings.dashboardCards = [...dashboardBox.querySelectorAll("input:checked")].map((input) => input.value);

    const subjectBox = document.getElementById("subjectEnabledBox");
    if (subjectBox) store.settings.subjects = [...subjectBox.querySelectorAll("input:checked")].map((input) => input.value);
    const textbookBox = document.getElementById("textbookEnabledBox");
    if (textbookBox) store.settings.textbooks = [...textbookBox.querySelectorAll("input:checked")].map((input) => input.value);
    const publisherBox = document.getElementById("publisherEnabledBox");
    if (publisherBox) store.settings.publishers = [...publisherBox.querySelectorAll("input:checked")].map((input) => input.value);

    const sys = document.getElementById("systemNoticeToggle");
    if (sys) store.settings.systemNoticeEnabled = sys.value === "on";
    store.settings.appVersion = "v70.0 - 2026-06-19";

    saveStore();
    applySettings();
    buildNav();
    renderSiteV20();
    showMessage("저장 완료", "홈페이지 관리 설정이 저장되었습니다. 메인 대시보드 표시 항목도 즉시 반영됩니다.");
  } catch (error) {
    console.error("[site settings save]", error);
    if (errorField) errorField.textContent = `저장 중 오류가 발생했습니다: ${error?.message || String(error)}`;
  }
};

var ensureSchoolIntegrationBeforeV70 = ensureSchoolIntegrationV64;
ensureSchoolIntegrationV64 = function ensureSchoolIntegrationV70() {
  ensureSchoolIntegrationBeforeV70();
  store.settings.appVersion = "v70.0 - 2026-06-19";
};

ensureSchoolIntegrationV64();
sitePasswordOkV70 = verifyCurrentPasswordV78;
installPasswordApprovalPatchV78();

// Final V80: explicit browser-session login, safe dashboard viewer, and timetable bulk delete.
const BROWSER_AUTH_SESSION_KEY_V80 = "pm-auth-browser-session-v80";
const BROWSER_AUTH_ATTEMPT_KEY_V80 = "pm-auth-browser-attempt-v80";

function authSessionUserIdV80(user = currentUser) {
  return user?.uid || user?.id || user?.email || "";
}

function beginBrowserAuthAttemptV80() {
  sessionStorage.setItem(BROWSER_AUTH_ATTEMPT_KEY_V80, "1");
}

function clearBrowserAuthAttemptV80() {
  sessionStorage.removeItem(BROWSER_AUTH_ATTEMPT_KEY_V80);
}

function clearBrowserAuthSessionV80() {
  sessionStorage.removeItem(BROWSER_AUTH_SESSION_KEY_V80);
  sessionStorage.removeItem(BROWSER_AUTH_ATTEMPT_KEY_V80);
  sessionStorage.removeItem("pm-current-user");
}

function markBrowserAuthSessionV80(user) {
  const id = authSessionUserIdV80(user);
  if (!id) return;
  sessionStorage.setItem(BROWSER_AUTH_SESSION_KEY_V80, "1");
  sessionStorage.setItem("pm-current-user", id);
  clearBrowserAuthAttemptV80();
}

function canUseBrowserAuthSessionV80() {
  return sessionStorage.getItem(BROWSER_AUTH_SESSION_KEY_V80) === "1"
    && !!sessionStorage.getItem("pm-current-user");
}

function hasPendingExplicitAuthV80() {
  return sessionStorage.getItem(BROWSER_AUTH_ATTEMPT_KEY_V80) === "1"
    || sessionStorage.getItem(ADMIN_STANDALONE_AUTH_ATTEMPT_KEY_V62) === "1";
}

function clearPersistedCurrentUserV80() {
  try {
    authStateV31.auth.currentUserId = null;
    authStateV31.auth.sessionStartedAt = null;
    saveAuthStateV31();
  } catch (error) {
    console.info("[auth session clear skipped]", error?.message || String(error));
  }
}

function showLoginOnlyV80() {
  clearPersistedCurrentUserV80();
  clearSessionStateV36();
  clearBrowserAuthSessionV80();
  app?.classList.add("hidden");
  loginScreen?.classList.remove("hidden");
}

const completeLoginBeforeV80 = completeLoginV34;
completeLoginV34 = function completeLoginV80(user) {
  const explicitSession = canUseBrowserAuthSessionV80() || hasPendingExplicitAuthV80();
  if (!explicitSession) {
    showLoginOnlyV80();
    return;
  }
  markBrowserAuthSessionV80(user);
  return completeLoginBeforeV80(user);
};

const logoutBeforeV80 = logout;
logout = async function logoutV80() {
  clearBrowserAuthSessionV80();
  await logoutBeforeV80();
  clearBrowserAuthSessionV80();
  clearPersistedCurrentUserV80();
};

restoreSession = function restoreSessionV80() {
  ensureSystemOwnerPatchV54();
  if (!canRestoreAdminStandaloneAuthV62() || !canUseBrowserAuthSessionV80()) {
    showLoginOnlyV80();
    return;
  }
  const saved = sessionStorage.getItem("pm-current-user");
  const user = authStateV31.users.find((item) => item.id === saved || item.uid === saved || item.email === saved);
  if (!user || user.active === false || user.disabled === true || !user.emailVerified) return;
  completeLoginV34(user);
};

bootAuthV31Safe = function bootAuthV80Safe() {
  try {
    ensureSystemOwnerPatchV54();
    authStateV31 = loadAuthStateV31();
    authStateV31 = ensureDefaultSuperAccountV38(authStateV31);
    saveAuthStateV31();
    syncLegacyAccountsV31();
    setupAuthUiV31();
    renderInviteFromUrlV31();
    if (currentUser) return;
    if (!canRestoreAdminStandaloneAuthV62() || !canUseBrowserAuthSessionV80()) {
      showLoginOnlyV80();
      return;
    }
    const saved = sessionStorage.getItem("pm-current-user");
    const user = authStateV31.users.find((item) => item.id === saved || item.uid === saved || item.email === saved);
    if (!user || user.active === false || user.disabled === true || !user.emailVerified) return;
    completeLoginV34(user);
  } catch (error) {
    window.__pmBootErrors = window.__pmBootErrors || [];
    window.__pmBootErrors.push(String(error?.message || error));
  }
};

restoreFirebaseSessionV34 = async function restoreFirebaseSessionV80() {
  if (!window.PMFirebaseRuntime?.hasConfig?.()) return;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    if (!runtime) return;
    runtime.sdk.auth.onAuthStateChanged(runtime.auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (currentUser?.provider === "firebase") logout();
        return;
      }
      if (!canUseBrowserAuthSessionV80() && !hasPendingExplicitAuthV80()) {
        await runtime.sdk.auth.signOut(runtime.auth);
        showLoginOnlyV80();
        return;
      }
      if (currentUser) return;
      const membership = await window.PMAuthService.firebaseEnsureUserStructure(firebaseUser, firebaseUser.displayName || firebaseUser.email, "pending");
      firebaseUser.pmWorkspaceId = membership.workspaceId;
      firebaseUser.pmRole = membership.role;
      firebaseUser.pmStatus = membership.status;
      firebaseUser.pmPendingWorkspaceId = membership.pendingWorkspaceId;
      await window.PMAuthService.firebaseRegisterDevice(firebaseUser);
      const user = syncFirebaseUserToLocalAuthV33(firebaseUser, firebaseUser.displayName || firebaseUser.email, "pending");
      authStateV31 = window.PMAuthService.loadAuthState();
      completeLoginV34(user);
    });
  } catch (error) {
    console.warn("Firebase session restore failed", error);
  }
};

function installExplicitLoginGuardsV80() {
  loginForm?.addEventListener("submit", beginBrowserAuthAttemptV80, true);
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.(".google-login-btn")) beginBrowserAuthAttemptV80();
  }, true);
}

function technicalViewerFieldV80(key) {
  const normalized = String(key || "").toLowerCase();
  return normalized === "id"
    || normalized === "uid"
    || normalized === "workspaceid"
    || normalized === "workspace_id"
    || normalized === "currentworkspaceid"
    || normalized === "pendingworkspaceid"
    || normalized === "invitecodeid"
    || normalized === "invitedby"
    || normalized === "createdby"
    || normalized === "created_by"
    || normalized === "updatedat"
    || normalized === "createdat"
    || normalized === "deletedat"
    || normalized === "syncedat"
    || normalized === "sourcepath"
    || normalized === "docid"
    || normalized.startsWith("__");
}

function formatViewerValueV80(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate().toLocaleString("ko-KR");
    return "";
  }
  return String(value);
}

showViewerV5 = function showViewerV80(title, row) {
  messageTitle.textContent = title;
  messageBody.replaceChildren();
  const box = el("div", "detail-grid");
  Object.entries(row || {})
    .filter(([key, value]) => !technicalViewerFieldV80(key) && formatViewerValueV80(value).trim())
    .forEach(([key, value]) => {
      const item = el("div", "info-box");
      item.append(el("span", "", labelFor(key)), el("strong", "", formatViewerValueV80(value)));
      box.append(item);
    });
  if (!box.children.length) box.append(el("div", "empty", "표시할 상세 정보가 없습니다."));
  messageBody.append(box);
  messageDialog.showModal();
};

const renderTimetableBeforeV80 = renderTimetableV29;
renderTimetableV29 = function renderTimetableV80() {
  renderTimetableBeforeV80();
  const actions = content.querySelector(".panel .panel-head .row-actions");
  if (!actions || document.getElementById("deleteAllTimetablesV80")) return;
  const bulkDelete = button("전체 시간표 일괄 삭제", "danger");
  bulkDelete.id = "deleteAllTimetablesV80";
  bulkDelete.addEventListener("click", () => requirePassword(() => {
    if (!confirm("등록된 모든 시간표 내용을 삭제할까요? 시간표 이름/선택값은 유지하고 안의 수업 배정만 비웁니다.")) return;
    markWorkspaceDeletedRows("timetable", store.timetable || []);
    store.timetable = [];
    saveStore();
    renderTimetableV29();
  }));
  actions.append(bulkDelete);
};

installExplicitLoginGuardsV80();
if (!canUseBrowserAuthSessionV80() && !hasPendingExplicitAuthV80()) showLoginOnlyV80();

// Final V81: stabilize notices, meal applications, timetable periods, programs, print reports, and owner/admin surfaces.
const APP_PATCH_VERSION_V81 = "v81.0 - 2026-06-19";
const PROGRAM_TYPES_V81 = ["afterschool", "specialLectures", "clubs"];
const SYSTEM_NOTICE_VALUES_V81 = new Set(["시스템", "system", "시스템공지", "시스템 공지"]);

function installStyleV81() {
  if (document.getElementById("pm-v81-style")) return;
  const style = document.createElement("style");
  style.id = "pm-v81-style";
  style.textContent = `
    .notice-split-grid-v81{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
    .notice-split-panel-v81{border:1px solid #d9e4f4;border-radius:14px;background:#fff;padding:16px;min-width:0}
    .notice-split-panel-v81 h3{margin:0 0 12px;font-size:18px}
    .notice-card-list-v81{display:grid;gap:10px}
    .notice-card-v81{border:1px solid #dbe6f5;border-radius:12px;padding:12px;background:#f8fbff}
    .notice-card-v81 strong{display:block;margin-bottom:6px}
    .notice-card-v81 .row-actions{margin-top:10px}
    .meal-app-actions-v81{display:flex;gap:8px;flex-wrap:wrap;align-items:end}
    .meal-app-grid-v81{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:16px}
    .meal-app-card-v81{border:1px solid #d9e4f4;border-radius:14px;background:#fff;padding:16px}
    .meal-date-grid-v81{display:grid;grid-template-columns:repeat(7,minmax(42px,1fr));gap:6px;margin:12px 0}
    .meal-date-button-v81{min-height:44px;border:1px solid #d7e2f1;background:#f8fbff;border-radius:10px;color:#10213f}
    .meal-date-button-v81.selected{background:#1d5cff;color:#fff;border-color:#1d5cff}
    .meal-date-button-v81.saturday{border-color:#92b8ff}
    .meal-date-button-v81.sunday{border-color:#ffb4b4}
    .period-editor-head-v81{display:flex;justify-content:space-between;gap:12px;align-items:center}
    .period-editor-head-v81 .row-actions{flex-wrap:wrap}
    .program-sticky-actions{position:sticky;bottom:10px;z-index:3;display:flex;justify-content:flex-end;gap:8px;padding:10px 0;background:linear-gradient(180deg,rgba(255,255,255,0),#fff 35%)}
    .exam-layout{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(360px,1.2fr) minmax(280px,.9fr);gap:16px;align-items:start}
    .exam-layout .panel,.exam-form{min-width:0}
    .exam-form{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:12px}
    .exam-form label,.exam-form .wide{min-width:0}
    .print-area table,.premium-report table{table-layout:fixed;width:100%}
    .print-area th,.print-area td,.premium-report th,.premium-report td{word-break:break-word;overflow-wrap:anywhere;max-width:220px}
    .print-area td a,.premium-report td a{word-break:break-all}
    body.system-owner-dedicated-v81 .sidebar{display:none!important}
    body.system-owner-dedicated-v81 .app{grid-template-columns:1fr!important}
    body.system-owner-dedicated-v81 .main{grid-column:1/-1!important}
    @media(max-width:900px){.notice-split-grid-v81,.meal-app-grid-v81,.exam-layout{grid-template-columns:1fr}.meal-date-grid-v81{grid-template-columns:repeat(4,1fr)}}
  `;
  document.head.append(style);
}

function isSystemNoticeV81(row) {
  const source = String(row?.source || row?.type || row?.category || row?.noticeType || "").trim();
  return row?.isSystem === true || row?.system === true || SYSTEM_NOTICE_VALUES_V81.has(source);
}

function renderNoticeCardsV81(key, rows) {
  const wrap = el("div", "notice-card-list-v81");
  if (!rows.length) {
    wrap.append(el("div", "empty", "표시할 공지가 없습니다."));
    return wrap;
  }
  rows.forEach((row) => {
    const card = el("article", "notice-card-v81");
    card.append(
      el("strong", "", row.title || row.name || "제목 없음"),
      el("p", "muted", [row.date, row.subject, row.source || row.category].filter(Boolean).join(" · ")),
      el("p", "", row.content || row.memo || row.description || "")
    );
    const actions = el("div", "row-actions");
    const view = button("보기", "ghost");
    view.addEventListener("click", () => showViewerV5(pageLabel(key), row));
    actions.append(view);
    const edit = button(can("edit", key) ? "수정" : "수정 요청", "ghost");
    edit.addEventListener("click", () => can("edit", key) ? openEditorV7(key, row.id) : requestEdit(key, row.id));
    actions.append(edit);
    if (can("del", key)) {
      const del = button("삭제", "danger");
      del.addEventListener("click", () => requirePassword(() => deleteRow(key, row.id)));
      actions.append(del);
    }
    card.append(actions);
    wrap.append(card);
  });
  return wrap;
}

function renderNoticesSplitV81() {
  content.replaceChildren();
  const rows = filteredRowsV7("notices");
  const section = panel("공지 관리");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "row-actions");
  const download = button("보고서 다운로드", "ghost");
  download.addEventListener("click", () => downloadReportV5("notices", rows));
  const add = button("공지 추가");
  add.disabled = !can("create", "notices");
  add.addEventListener("click", () => openEditorV7("notices", null, "notices"));
  actions.append(download, add);
  head.append(actions);
  const split = el("div", "notice-split-grid-v81");
  const general = el("section", "notice-split-panel-v81");
  general.append(el("h3", "", "일반 공지"), renderNoticeCardsV81("notices", rows.filter((row) => !isSystemNoticeV81(row))));
  const system = el("section", "notice-split-panel-v81");
  system.append(el("h3", "", "시스템 공지"), renderNoticeCardsV81("notices", rows.filter(isSystemNoticeV81)));
  split.append(general, system);
  section.append(filterBarV7("notices"), split);
  content.append(section);
}

const renderCollectionBeforeV81 = renderCollectionV7;
renderCollectionV7 = function renderCollectionV81(key) {
  if (key === "notices") return renderNoticesSplitV81();
  return renderCollectionBeforeV81(key);
};

function currentMealUserV81() {
  return currentUser?.uid || currentUser?.id || currentUser?.email || "local";
}

function mealApplicationStoredRowV81(year, month, type) {
  store.mealApplications ??= [];
  const user = currentUser?.email || currentMealUserV81();
  return store.mealApplications.find((item) => String(item.year) === String(year) && Number(item.month) === Number(month) && (item.user === user || item.user === currentUser?.email) && item.type === type);
}

function mealDraftKeyV81(year, month, type) {
  return `meal-app-draft-v81:${currentMealUserV81()}:${year}:${month}:${type}`;
}

function readMealDraftV81(year, month, type) {
  const key = mealDraftKeyV81(year, month, type);
  const raw = sessionStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch { sessionStorage.removeItem(key); }
  }
  const stored = mealApplicationStoredRowV81(year, month, type) || {};
  return {
    selectedDates: Array.isArray(stored.selectedDates) ? [...stored.selectedDates] : [],
    unitPrice: Number(stored.unitPrice ?? (type === "dinner" ? store.settings.mealDinnerPrice : store.settings.mealSaturdayLunchPrice) ?? 0),
    note: stored.note || ""
  };
}

function writeMealDraftV81(year, month, type, draft) {
  sessionStorage.setItem(mealDraftKeyV81(year, month, type), JSON.stringify(draft));
}

function clearMealDraftV81(year, month, type) {
  sessionStorage.removeItem(mealDraftKeyV81(year, month, type));
}

function mealAppSummaryTextV81(draft) {
  const count = (draft.selectedDates || []).length;
  const total = count * Number(draft.unitPrice || 0);
  return `${count}일 선택 · ${Number(total || 0).toLocaleString("ko-KR")}원`;
}

function mealAppCardV81({ year, month, type, title, onlySaturday }) {
  const draft = readMealDraftV81(year, month, type);
  const card = el("article", "meal-app-card-v81");
  const price = document.createElement("input");
  price.type = "number";
  price.min = "0";
  price.step = "10";
  price.value = draft.unitPrice || 0;
  price.addEventListener("input", () => {
    draft.unitPrice = Number(price.value || 0);
    writeMealDraftV81(year, month, type, draft);
    summary.textContent = mealAppSummaryTextV81(draft);
  });
  const summary = el("p", "meal-total-line", mealAppSummaryTextV81(draft));
  const grid = el("div", "meal-date-grid-v81");
  daysInMonthV21(year, month).forEach((date) => {
    const day = new Date(`${date}T00:00:00`);
    if (onlySaturday && day.getDay() !== 6) return;
    const btn = button("", "meal-date-button-v81");
    btn.type = "button";
    btn.classList.toggle("selected", draft.selectedDates.includes(date));
    btn.classList.toggle("saturday", day.getDay() === 6);
    btn.classList.toggle("sunday", day.getDay() === 0);
    btn.innerHTML = `<strong>${day.getDate()}</strong><span>${weekdayKoV21(day.getDay())}</span>`;
    btn.addEventListener("click", () => {
      const set = new Set(draft.selectedDates || []);
      if (set.has(date)) set.delete(date);
      else set.add(date);
      draft.selectedDates = [...set].sort();
      writeMealDraftV81(year, month, type, draft);
      btn.classList.toggle("selected", set.has(date));
      summary.textContent = mealAppSummaryTextV81(draft);
    });
    grid.append(btn);
  });
  const note = document.createElement("textarea");
  note.placeholder = "메모";
  note.value = draft.note || "";
  note.addEventListener("input", () => {
    draft.note = note.value;
    writeMealDraftV81(year, month, type, draft);
  });
  card.append(el("h3", "", title), makeField("단가", `${type}UnitPriceV81`, price), summary, grid, makeField("메모", `${type}MemoV81`, note));
  return card;
}

function mealApplicationDraftSummaryV81(year, month) {
  const box = panel("월별 신청 요약");
  box.classList.add("sub-panel");
  const rows = [
    ["dinner", "석식"],
    ["saturdayLunch", "토요일 자습 중식"]
  ].map(([type, name]) => {
    const draft = readMealDraftV81(year, month, type);
    const count = (draft.selectedDates || []).length;
    const unit = Number(draft.unitPrice || 0);
    return {
      name,
      count: `${count}일`,
      unit: `${unit.toLocaleString("ko-KR")}원`,
      total: `${(count * unit).toLocaleString("ko-KR")}원`,
      dates: (draft.selectedDates || []).join(", ") || "-"
    };
  });
  const total = rows.reduce((sum, row) => sum + Number(String(row.total).replace(/[^\d]/g, "") || 0), 0);
  box.append(
    simpleRowsTableV16(["name", "count", "unit", "total", "dates"], rows),
    el("div", "meal-grand-total", `${year}년 ${month}월 임시 선택 합계 ${total.toLocaleString("ko-KR")}원`)
  );
  return box;
}

function saveMealApplicationsV81(year, month) {
  const types = ["dinner", "saturdayLunch"];
  store.mealApplications ??= [];
  types.forEach((type) => {
    const draft = readMealDraftV81(year, month, type);
    let row = mealApplicationStoredRowV81(year, month, type);
    if (!row) {
      row = { id: Date.now() + Math.random(), year: String(year), month: Number(month), user: currentUser?.email || currentMealUserV81(), type };
      store.mealApplications.push(row);
    }
    row.selectedDates = [...(draft.selectedDates || [])].sort();
    row.unitPrice = Number(draft.unitPrice || 0);
    row.note = draft.note || "";
    row.updatedAt = new Date().toISOString();
    if (type === "dinner") store.settings.mealDinnerPrice = row.unitPrice;
    if (type === "saturdayLunch") store.settings.mealSaturdayLunchPrice = row.unitPrice;
    clearMealDraftV81(year, month, type);
  });
  saveStore();
  showMessage("급식 신청 저장 완료", `${year}년 ${month}월 석식/토요일 중식 신청을 저장했습니다.`);
  renderMealApplicationsV16();
}

renderMealApplicationsV16 = function renderMealApplicationsV81() {
  ensureAppV21();
  content.replaceChildren();
  const now = new Date();
  const selectedYear = Number(sessionStorage.getItem("mealApplyYear") || now.getFullYear());
  const selectedMonth = Number(sessionStorage.getItem("mealApplyMonth") || now.getMonth() + 1);
  const section = panel("급식 신청");
  const head = section.querySelector(".panel-head");
  const actions = el("div", "meal-app-actions-v81");
  const yearInput = document.createElement("input");
  yearInput.type = "number";
  yearInput.min = "2020";
  yearInput.max = "2100";
  yearInput.value = selectedYear;
  yearInput.addEventListener("change", () => {
    sessionStorage.setItem("mealApplyYear", yearInput.value || String(now.getFullYear()));
    renderMealApplicationsV16();
  });
  const monthSelect = document.createElement("select");
  Array.from({ length: 12 }, (_, index) => index + 1).forEach((month) => {
    const item = option(String(month), `${month}월`);
    item.selected = month === selectedMonth;
    monthSelect.append(item);
  });
  monthSelect.addEventListener("change", () => {
    sessionStorage.setItem("mealApplyMonth", monthSelect.value);
    renderMealApplicationsV16();
  });
  const prev = button("이전달", "ghost");
  prev.addEventListener("click", () => moveMealApplicationMonthV21(-1));
  const next = button("다음달", "ghost");
  next.addEventListener("click", () => moveMealApplicationMonthV21(1));
  const save = button("저장");
  save.addEventListener("click", () => requirePassword(() => saveMealApplicationsV81(selectedYear, selectedMonth)));
  actions.append(makeField("연도", "mealApplyYearV81", yearInput), makeField("월", "mealApplyMonthV81", monthSelect), prev, next, save);
  head.append(actions);
  const planner = el("div", "meal-app-grid-v81");
  planner.append(
    mealAppCardV81({ year: selectedYear, month: selectedMonth, type: "dinner", title: "석식", onlySaturday: false }),
    mealAppCardV81({ year: selectedYear, month: selectedMonth, type: "saturdayLunch", title: "토요일 자습 중식", onlySaturday: true })
  );
  section.append(el("p", "muted", "날짜와 단가는 먼저 임시 선택됩니다. 저장 버튼을 누르고 비밀번호를 확인해야 실제 데이터에 반영됩니다."), planner, mealApplicationDraftSummaryV81(selectedYear, selectedMonth));
  content.append(section);
};

function normalizePeriodRowsV81(rows) {
  return (rows || []).map((row, index) => {
    const time = row.time || [row.start, row.end].filter(Boolean).join("-");
    const [start = "", end = ""] = String(time || "").split("-");
    return {
      period: row.period || `${index + 1}교시`,
      start: row.start || start.trim(),
      end: row.end || end.trim(),
      time: row.time || [row.start || start.trim(), row.end || end.trim()].filter(Boolean).join("-")
    };
  });
}

const timetablePeriodsBeforeV81 = timetablePeriodsV29;
timetablePeriodsV29 = function timetablePeriodsV81() {
  store.settings ??= {};
  if (store.settings.periodTimesConfiguredV81 === true) {
    return normalizePeriodRowsV81(Array.isArray(store.periodTimes) ? store.periodTimes : []);
  }
  const saved = Array.isArray(store.periodTimes) ? store.periodTimes : [];
  const base = saved.length ? saved : timetablePeriodsBeforeV81();
  return normalizePeriodRowsV81(base);
};

function persistPeriodRowsV81(rows) {
  store.settings.periodTimesConfiguredV81 = true;
  store.periodTimes = normalizePeriodRowsV81(rows);
  saveStore();
}

function periodCardV81(row, index) {
  const card = el("article", "period-card");
  const top = el("div", "period-card-top");
  top.append(el("strong", "", `${index + 1}교시 설정`));
  const del = button("삭제", "ghost small");
  del.addEventListener("click", () => {
    const next = timetablePeriodsV29().filter((_, rowIndex) => rowIndex !== index);
    persistPeriodRowsV81(next);
    renderTimetableV29();
  });
  top.append(del);
  const start = document.createElement("input");
  start.type = "time";
  start.value = row.start || "";
  const end = document.createElement("input");
  end.type = "time";
  end.value = row.end || "";
  const persist = () => {
    const next = timetablePeriodsV29();
    const period = row.period || `${index + 1}교시`;
    next[index] = { period, start: start.value, end: end.value, time: `${start.value}-${end.value}` };
    (store.timetable || []).filter((item) => item.period === period).forEach((item) => { item.time = `${start.value}-${end.value}`; });
    persistPeriodRowsV81(next);
  };
  start.addEventListener("change", persist);
  end.addEventListener("change", persist);
  card.append(top, makeField("시작", `periodStartV81-${index}`, start), makeField("종료", `periodEndV81-${index}`, end));
  return card;
}

periodEditorV29 = function periodEditorV81() {
  const box = el("section", "modern-period-editor");
  const head = el("div", "period-editor-head-v81");
  const actions = el("div", "row-actions");
  const add = button("+ 신규 교시 추가", "ghost");
  add.addEventListener("click", () => {
    const periods = timetablePeriodsV29();
    periods.push({ period: `${periods.length + 1}교시`, start: "", end: "", time: "" });
    persistPeriodRowsV81(periods);
    renderTimetableV29();
  });
  const clear = button("교시 전체 삭제", "danger");
  clear.addEventListener("click", () => requirePassword(() => {
    if (!confirm("등록된 교시 시간을 모두 삭제할까요? 시간표 배정 내용은 유지되지만 교시 시간표시는 비워집니다.")) return;
    persistPeriodRowsV81([]);
    renderTimetableV29();
  }));
  actions.append(add, clear);
  head.append(el("h3", "", "정기 수강 교시 및 시간 설정"), actions);
  const grid = el("div", "period-card-grid");
  timetablePeriodsV29().forEach((row, index) => grid.append(periodCardV81(row, index)));
  if (!grid.children.length) grid.append(el("div", "empty", "등록된 교시가 없습니다. 신규 교시 추가를 눌러 만드세요."));
  box.append(head, el("p", "muted", "교시 수정 중 중복 교시가 자동 생성되지 않도록 저장 기준을 고정했습니다."), grid);
  return box;
};

function markProgramDefaultDisabledV81(type, disabled) {
  store.settings ??= {};
  store.settings.programDefaultDisabledV81 ??= {};
  store.settings.programDefaultDisabledV81[type] = disabled;
}

const ensureAppV26BeforeV81 = ensureAppV26;
ensureAppV26 = function ensureAppV81() {
  const wasEmpty = {};
  PROGRAM_TYPES_V81.forEach((type) => {
    const cfg = programConfigV26(type);
    wasEmpty[type] = !Array.isArray(store[cfg.programs]) || store[cfg.programs].length === 0;
  });
  ensureAppV26BeforeV81();
  PROGRAM_TYPES_V81.forEach((type) => {
    const cfg = programConfigV26(type);
    if (store.settings?.programDefaultDisabledV81?.[type] && wasEmpty[type]) {
      store[cfg.programs] = [];
    }
  });
  store.settings.appVersion = APP_PATCH_VERSION_V81;
};

const programCardBeforeV81 = programCardV26;
programCardV26 = function programCardV81(type, program) {
  const card = programCardBeforeV81(type, program);
  card.querySelector(".program-delete-link")?.addEventListener("click", () => {
    markProgramDefaultDisabledV81(type, true);
  }, true);
  return card;
};

const addProgramBeforeV81 = addProgramV26;
addProgramV26 = function addProgramV81(type) {
  const cfg = programConfigV26(type);
  const before = (store[cfg.programs] || []).length;
  addProgramBeforeV81(type);
  const after = (store[cfg.programs] || []).length;
  if (after > before) {
    markProgramDefaultDisabledV81(type, false);
    saveStore();
  }
};

const programScheduleBeforeV81 = programScheduleV26;
programScheduleV26 = function programScheduleV81(type, program) {
  const wrap = programScheduleBeforeV81(type, program);
  const buttons = [...wrap.querySelectorAll("button")];
  const add = buttons[buttons.length - 1];
  add?.addEventListener("click", () => {
    setTimeout(() => {
      if (currentPage === type) renderProgramPageV26(type, program.id, "schedule");
    }, 80);
  });
  return wrap;
};

const programAttendanceBeforeV81 = programAttendanceV26;
programAttendanceV26 = function programAttendanceV81(type, program) {
  const wrap = programAttendanceBeforeV81(type, program);
  if (!wrap.querySelector(".program-sticky-actions button")) {
    const save = button("출결 저장");
    save.addEventListener("click", () => {
      saveStore();
      showMessage("출결 저장", "현재 출결 정보를 저장했습니다.");
    });
    wrap.append(el("div", "program-sticky-actions", save));
  }
  return wrap;
};

const fieldsForV7BeforeV81 = fieldsForV7;
fieldsForV7 = function fieldsForV81(key) {
  if (key === "examSchedules") {
    const year = new Date().getFullYear();
    const years = Array.from({ length: 9 }, (_, index) => String(year - 3 + index));
    return [["year", "시험년도", "select", years], ["grade", "학년", "text"], ["date", "시작날짜", "date"], ["end_date", "마지막날짜", "date"], ["title", "시험명", "text", true], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["scope", "시험범위", "textarea"], ["place", "장소", "text"], ["memo", "메모", "textarea"]];
  }
  if (key === "exams") {
    return [["title", "시험명", "text", true], ["date", "시험일자", "date"], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["scope", "시험범위", "textarea"], ["base_score", "기본점수", "number"], ["raw_score", "원점수", "number"], ["score", "점수", "number"], ["average", "평균", "number"], ["high_score", "최고점", "number"], ["rank", "석차", "number"], ["student_count", "응시인원", "number"], ["percentile", "백분위", "number"], ["grade_level", "등급", "text"], ["memo", "메모", "textarea"]];
  }
  return fieldsForV7BeforeV81(key);
};

const openQuickCreateBeforeV81 = openQuickCreateV70;
openQuickCreateV70 = function openQuickCreateV81(key) {
  if (!can("create", key)) return;
  if (typeof openEditorV7 === "function") return openEditorV7(key, null, "dashboard");
  return openQuickCreateBeforeV81(key);
};

function timestampForFilenameV81() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
}

function uniqueDownloadNameV81(filename) {
  const match = String(filename || "download").match(/^(.*?)(\.[^.]+)?$/);
  const base = (match?.[1] || "download").replace(/_\d{8}_\d{6}$/g, "");
  const ext = match?.[2] || "";
  return `${base}_${timestampForFilenameV81()}${ext}`;
}

const downloadTextFileBeforeV81 = downloadTextFileV63;
downloadTextFileV63 = function downloadTextFileV81(filename, text, type) {
  return downloadTextFileBeforeV81(uniqueDownloadNameV81(filename), text, type);
};

const exportCsvBeforeV81 = exportCsv;
exportCsv = function exportCsvV81(filename, text) {
  return exportCsvBeforeV81(uniqueDownloadNameV81(filename), text);
};

const publishersListBeforeV81 = publishersList;
publishersList = function publishersListV81() {
  if (Array.isArray(store.settings?.publishers) && (store.settings.publishers.length || store.settings.publisherOptionsTouchedV81)) {
    return [...new Set(store.settings.publishers.filter(Boolean))];
  }
  return publishersListBeforeV81();
};

const saveSiteSettingsBeforeV81 = saveSiteSettingsV2;
saveSiteSettingsV2 = async function saveSiteSettingsV81(...args) {
  if (document.getElementById("publisherEnabledBox")) {
    store.settings ??= {};
    store.settings.publisherOptionsTouchedV81 = true;
  }
  const result = await saveSiteSettingsBeforeV81(...args);
  store.settings.appVersion = APP_PATCH_VERSION_V81;
  saveStore();
  return result;
};

const inviteCodeRegisterBeforeV81 = inviteCodeRegisterV37;
inviteCodeRegisterV37 = function inviteCodeRegisterV81() {
  if (["system_owner", "super_manager", "manager"].includes(currentUser?.role)) {
    return el("span", "hidden", "");
  }
  return inviteCodeRegisterBeforeV81();
};

function applySystemOwnerDedicatedShellV81() {
  const standalone = typeof isStandaloneAdminSiteV60 === "function" && isStandaloneAdminSiteV60();
  const owner = currentUser?.role === "system_owner" || currentUser?.currentRole === "system_owner" || currentUser?.globalRole === "system_owner";
  document.body.classList.toggle("system-owner-dedicated-v81", !!standalone && !!owner);
}

const buildNavBeforeV81 = buildNav;
buildNav = function buildNavV81() {
  buildNavBeforeV81();
  applySystemOwnerDedicatedShellV81();
};

const renderPageBeforeV81 = renderPage;
renderPage = function renderPageV81(key) {
  renderPageBeforeV81(key);
  installStyleV81();
  applySystemOwnerDedicatedShellV81();
};

const completeLoginBeforeV81 = completeLoginV34;
completeLoginV34 = function completeLoginV81(user) {
  const result = completeLoginBeforeV81(user);
  setTimeout(() => {
    installStyleV81();
    applySystemOwnerDedicatedShellV81();
  }, 0);
  return result;
};

installStyleV81();
ensureAppV26();

// Final V82: system-owner sync fixes, per-tab auth isolation, notice management, and period bulk delete.
const APP_PATCH_VERSION_V82 = "v82.0 - 2026-06-19";
const AUTH_TAB_ID_V82 = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const AUTH_TAB_SESSION_KEY_V82 = "pm-auth-tab-id-v82";
const SYSTEM_NOTICE_BUMP_KEY_V82 = "pm-system-notice-bump-v82";
let workspaceNoticeEditingV82 = null;
let systemNoticeRefreshTimerV82 = null;
let systemNoticeRefreshRunningV82 = false;

const markBrowserAuthSessionBeforeV82 = markBrowserAuthSessionV80;
markBrowserAuthSessionV80 = function markBrowserAuthSessionV82(user) {
  markBrowserAuthSessionBeforeV82(user);
  sessionStorage.setItem(AUTH_TAB_SESSION_KEY_V82, AUTH_TAB_ID_V82);
};

const canUseBrowserAuthSessionBeforeV82 = canUseBrowserAuthSessionV80;
canUseBrowserAuthSessionV80 = function canUseBrowserAuthSessionV82() {
  return canUseBrowserAuthSessionBeforeV82()
    && sessionStorage.getItem(AUTH_TAB_SESSION_KEY_V82) === AUTH_TAB_ID_V82;
};

const clearBrowserAuthSessionBeforeV82 = clearBrowserAuthSessionV80;
clearBrowserAuthSessionV80 = function clearBrowserAuthSessionV82() {
  clearBrowserAuthSessionBeforeV82();
  sessionStorage.removeItem(AUTH_TAB_SESSION_KEY_V82);
};

function userIdV82(user = {}) {
  return user.uid || user.id || "";
}

function workspaceIdV82(row = {}) {
  return row.workspaceId || row.currentWorkspaceId || row.workspace_id || "";
}

function memberForUserV82(user = {}) {
  const uid = userIdV82(user);
  const workspaceId = workspaceIdV82(user);
  const members = systemOwnerStateV54.workspaceMembers || [];
  return members.find((member) => {
    const memberUid = member.uid || "";
    const memberWorkspace = workspaceIdV82(member);
    return memberUid === uid && (memberWorkspace === workspaceId || !workspaceId);
  }) || members.find((member) => member.uid === uid) || null;
}

function mergedSystemOwnerUsersV82() {
  const map = new Map();
  (systemOwnerStateV54.users || []).forEach((user) => {
    const uid = userIdV82(user);
    if (!uid) return;
    map.set(uid, { ...user });
  });
  (systemOwnerStateV54.workspaceMembers || []).forEach((member) => {
    const uid = userIdV82(member);
    if (!uid) return;
    const user = map.get(uid) || {};
    const memberWorkspace = workspaceIdV82(member);
    const userWorkspace = workspaceIdV82(user);
    const memberStatus = member.status || (member.disabled ? "disabled" : "");
    const userStatus = user.status || (user.disabled ? "disabled" : "");
    const role = member.role || user.workspaceRole || user.currentRole || user.role || "pending";
    const status = user.disabled || member.disabled || userStatus === "disabled" || memberStatus === "disabled"
      ? "disabled"
      : memberStatus || userStatus || (memberWorkspace || userWorkspace ? "active" : "pending");
    const workspaceId = memberWorkspace || userWorkspace || user.pendingWorkspaceId || "";
    map.set(uid, {
      ...member,
      ...user,
      uid,
      id: user.id || uid,
      role,
      currentRole: role,
      workspaceRole: role,
      status,
      disabled: status === "disabled",
      active: status !== "disabled",
      workspaceId,
      currentWorkspaceId: workspaceId,
      workspace_id: workspaceId,
      rootMemberExists: member.rootMemberExists === true,
      nestedMemberExists: member.nestedMemberExists === true,
      syncMismatchV82: !!user.role && !!member.role && user.role !== member.role
        || !!userStatus && !!memberStatus && userStatus !== memberStatus
        || !!userWorkspace && !!memberWorkspace && userWorkspace !== memberWorkspace
    });
  });
  return [...map.values()];
}

function renderAllUsersAdminV54() {
  const box = panel("모든 회원 보기");
  box.append(el("p", "muted", "통합/전용 관리자창 모두 users 문서와 workspace_members 문서를 병합해서 표시합니다. 비활성화는 status를 disabled로 저장하고, 활성화는 status를 active로 되돌립니다. 상태 선택 후 '권한 저장'을 눌러도 되고, 빠른 버튼으로 '비활성화/활성화'를 눌러도 됩니다."));
  const filters = el("div", "form-grid system-owner-filters");
  const status = document.createElement("select");
  ["", "pending", "waiting_approval", "active", "rejected", "disabled", "moved"].forEach((key) => status.append(option(key, key || "전체 상태")));
  const role = document.createElement("select");
  ["", "pending", "normal", "teacher", "manager", "viewer", "print_account", "super_manager", "system_owner"].forEach((key) => role.append(option(key, key ? roleName(key) : "전체 권한")));
  const workspace = document.createElement("input");
  workspace.placeholder = "workspaceId";
  const search = document.createElement("input");
  search.placeholder = "이메일/이름 검색";
  [status, role, workspace, search].forEach((input) => {
    const key = `systemOwnerUserFilter:${input === status ? "status" : input === role ? "role" : input === workspace ? "workspace" : "search"}`;
    input.value = sessionStorage.getItem(key) || "";
  });
  const apply = button("필터 적용", "ghost");
  apply.addEventListener("click", () => {
    [[status, "status"], [role, "role"], [workspace, "workspace"], [search, "search"]]
      .forEach(([input, key]) => sessionStorage.setItem(`systemOwnerUserFilter:${key}`, input.value));
    renderSystemOwnerConsoleV54();
  });
  filters.append(
    makeField("상태", "ownerUserStatusV82", status),
    makeField("권한", "ownerUserRoleV82", role),
    makeField("workspaceId", "ownerUserWorkspaceV82", workspace),
    makeField("검색", "ownerUserSearchV82", search),
    apply
  );
  const rows = mergedSystemOwnerUsersV82()
    .filter((user) => !status.value || (user.status || (workspaceIdV82(user) ? "active" : "pending")) === status.value)
    .filter((user) => !role.value || (user.role || user.currentRole || "pending") === role.value)
    .filter((user) => !workspace.value || String(workspaceIdV82(user)).includes(workspace.value))
    .filter((user) => {
      const q = search.value.trim().toLowerCase();
      return !q || `${user.email || ""} ${user.displayName || ""} ${user.name || ""}`.toLowerCase().includes(q);
    })
    .sort((a, b) => formatSortTimeV54(b.updatedAt || b.createdAt) - formatSortTimeV54(a.updatedAt || a.createdAt));
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>이름</th><th>이메일</th><th>uid</th><th>상태</th><th>권한</th><th>workspace</th><th>동기화</th><th>updatedAt</th><th>관리</th></tr></thead>";
  const body = document.createElement("tbody");
  rows.forEach((user) => {
    const uid = userIdV82(user);
    const protectedUser = !uid || uid === (currentUser?.uid || currentUser?.id) || (user.role || user.currentRole) === "system_owner";
    const userStatus = user.status || (workspaceIdV82(user) ? "active" : "pending");
    const userRole = user.role || user.currentRole || user.workspaceRole || "pending";
    const userWorkspace = workspaceIdV82(user);
    const statusSelect = document.createElement("select");
    ["pending", "waiting_approval", "active", "rejected", "disabled", "moved"].forEach((key) => statusSelect.append(option(key, key)));
    statusSelect.value = userStatus;
    statusSelect.disabled = protectedUser;
    const roleSelect = document.createElement("select");
    const editableRoles = ["pending", "normal", "teacher", "manager", "viewer", "print_account", "super_manager"];
    if (!editableRoles.includes(userRole)) roleSelect.append(option(userRole, roleName(userRole)));
    editableRoles.forEach((key) => roleSelect.append(option(key, roleName(key))));
    roleSelect.value = userRole;
    roleSelect.disabled = protectedUser;
    const workspaceSelect = document.createElement("select");
    workspaceSelect.append(option("", "workspace 없음"));
    (systemOwnerStateV54.workspaces || []).forEach((workspaceRow) => {
      const id = workspaceRow.id || workspaceRow.workspaceId;
      workspaceSelect.append(option(id, workspaceNameV60(workspaceRow)));
    });
    if (userWorkspace && ![...workspaceSelect.options].some((item) => item.value === userWorkspace)) workspaceSelect.append(option(userWorkspace, userWorkspace));
    workspaceSelect.value = userWorkspace;
    workspaceSelect.disabled = protectedUser;

    const save = button("권한 저장", "small");
    save.disabled = protectedUser;
    save.addEventListener("click", async () => {
      try {
        await window.PMSystemAdminService.updateUserAdminFields({ user, status: statusSelect.value, role: roleSelect.value, workspaceId: workspaceSelect.value });
        showMessage("저장 완료", "회원 상태/권한/workspace를 users와 members에 함께 저장했습니다.");
      } catch (error) {
        showMessage("저장 실패", error.message || String(error));
      }
    });
    const repair = button("점검/복구", "ghost small");
    repair.disabled = !userWorkspace;
    repair.addEventListener("click", async () => {
      try {
        await window.PMSystemAdminService.repairUserPermission({ ...user, role: roleSelect.value, currentRole: roleSelect.value, workspaceRole: roleSelect.value, status: statusSelect.value, workspaceId: workspaceSelect.value });
        showMessage("복구 완료", "users 기준 권한으로 멤버 문서를 동기화했습니다.");
      } catch (error) {
        showMessage("복구 실패", error.message || String(error));
      }
    });
    const disable = button("비활성화", "ghost small");
    disable.disabled = protectedUser || userStatus === "disabled" || user.disabled === true;
    disable.addEventListener("click", async () => {
      if (!confirm(`${user.email || uid} 계정을 비활성화할까요?`)) return;
      try {
        await window.PMSystemAdminService.disableUserAccount(user);
        showMessage("비활성화 완료", "계정 로그인을 차단하고 상태를 disabled로 표시합니다.");
      } catch (error) {
        showMessage("비활성화 실패", error.message || String(error));
      }
    });
    const enable = button("활성화", "ghost small");
    enable.disabled = protectedUser || (userStatus !== "disabled" && user.disabled !== true);
    enable.addEventListener("click", async () => {
      try {
        await window.PMSystemAdminService.enableUserAccount({ ...user, role: roleSelect.value, currentRole: roleSelect.value, workspaceRole: roleSelect.value, workspaceId: workspaceSelect.value });
        showMessage("활성화 완료", "계정 상태를 active로 되돌렸습니다.");
      } catch (error) {
        showMessage("활성화 실패", error.message || String(error));
      }
    });
    const remove = button("Firestore 삭제", "ghost small danger");
    remove.disabled = protectedUser;
    remove.addEventListener("click", async () => {
      if (!confirm(`${user.email || uid} 계정의 Firestore 프로필과 멤버 문서를 삭제할까요? Firebase Auth 계정은 별도 삭제가 필요합니다.`)) return;
      try {
        await window.PMSystemAdminService.deleteUserFirestoreProfile(user);
        showMessage("삭제 완료", "Firestore 사용자/멤버 문서를 삭제했습니다.");
      } catch (error) {
        showMessage("삭제 실패", error.message || String(error));
      }
    });
    const actions = el("div", "row-actions");
    actions.append(save, repair, disable, enable, remove);
    const tr = document.createElement("tr");
    if (userStatus === "disabled") tr.classList.add("disabled-row");
    tr.append(
      el("td", "", user.displayName || user.name || "-"),
      el("td", "", user.email || "-"),
      el("td", "", uid || "-"),
      tableCellNodeV31(statusSelect),
      tableCellNodeV31(roleSelect),
      tableCellNodeV31(workspaceSelect),
      el("td", "", user.syncMismatchV82 ? "점검 필요" : "정상"),
      el("td", "", formatSystemTimeV54(user.updatedAt)),
      tableCellNodeV31(actions)
    );
    body.append(tr);
  });
  if (!rows.length) appendEmptyRowV54(body, 9, "조건에 맞는 회원이 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(filters, wrap);
  return box;
}

function notifySystemNoticeChangedV82() {
  try {
    localStorage.setItem(SYSTEM_NOTICE_BUMP_KEY_V82, String(Date.now()));
  } catch {}
  refreshSystemNoticesV82(true);
}

async function refreshSystemNoticesV82(force = false) {
  const workspaceId = userWorkspaceIdV54(currentUser);
  if (!workspaceId || !window.PMFirebaseRuntime?.hasConfig?.()) return;
  if (systemNoticeRefreshRunningV82) return;
  if (!force && Date.now() - Number(sessionStorage.getItem("systemNoticeRefreshAtV82") || 0) < 10000) return;
  systemNoticeRefreshRunningV82 = true;
  try {
    const runtime = await window.PMFirebaseRuntime.init();
    const snap = await runtime.db.collection("systemNotices").where("status", "==", "active").get();
    const rows = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
    systemNoticesV54 = window.PMSystemAdminService?.sortSystemNotices
      ? window.PMSystemAdminService.sortSystemNotices(rows, workspaceId)
      : rows;
    sessionStorage.setItem("systemNoticeRefreshAtV82", String(Date.now()));
    if (currentPage === "dashboard" || currentPage === "system") {
      clearTimeout(systemNoticeRefreshTimerV82);
      systemNoticeRefreshTimerV82 = setTimeout(() => renderPage(currentPage), 60);
    }
  } catch (error) {
    console.warn("[system notice refresh]", error?.code || "", error?.message || String(error));
  } finally {
    systemNoticeRefreshRunningV82 = false;
  }
}

const startSystemNoticeRealtimeBeforeV82 = startSystemNoticeRealtimeV54;
startSystemNoticeRealtimeV54 = function startSystemNoticeRealtimeV82(workspaceId) {
  startSystemNoticeRealtimeBeforeV82(workspaceId);
  setTimeout(() => refreshSystemNoticesV82(true), 250);
};

window.addEventListener("storage", (event) => {
  if (event.key === SYSTEM_NOTICE_BUMP_KEY_V82) refreshSystemNoticesV82(true);
});

function renderSystemNoticeAdminV54() {
  const box = panel("시스템 공지 관리");
  const grid = el("div", "form-grid");
  const title = document.createElement("input");
  const contentInput = document.createElement("textarea");
  const priority = document.createElement("select");
  ["low", "normal", "high", "critical"].forEach((key) => priority.append(option(key, key)));
  priority.value = "normal";
  const status = document.createElement("select");
  ["active", "archived"].forEach((key) => status.append(option(key, key)));
  const pinned = document.createElement("input");
  pinned.type = "checkbox";
  const save = button("시스템 공지 저장");
  const reset = button("새 공지", "ghost");
  const resetForm = () => {
    systemNoticeEditingIdV54 = "";
    title.value = "";
    contentInput.value = "";
    priority.value = "normal";
    status.value = "active";
    pinned.checked = false;
    save.textContent = "시스템 공지 저장";
  };
  save.addEventListener("click", async () => {
    await window.PMSystemAdminService.saveSystemNotice({
      id: systemNoticeEditingIdV54,
      title: title.value,
      content: contentInput.value,
      priority: priority.value,
      status: status.value,
      pinned: pinned.checked,
      target: "all_workspaces",
      targetWorkspaceIds: []
    });
    showMessage("저장 완료", "시스템 공지를 저장했습니다.");
    resetForm();
    notifySystemNoticeChangedV82();
  });
  reset.addEventListener("click", resetForm);
  grid.append(
    makeField("제목", "systemNoticeTitleV82", title),
    makeField("우선순위", "systemNoticePriorityV82", priority),
    makeField("상태", "systemNoticeStatusV82", status),
    makeField("상단 고정", "systemNoticePinnedV82", pinned),
    makeField("내용", "systemNoticeContentV82", contentInput),
    save,
    reset
  );
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>제목</th><th>상태</th><th>우선순위</th><th>고정</th><th>작성일</th><th>관리</th></tr></thead>";
  const body = document.createElement("tbody");
  (systemOwnerStateV54.systemNotices || [])
    .sort((a, b) => formatSortTimeV54(b.createdAt) - formatSortTimeV54(a.createdAt))
    .forEach((notice) => {
      const edit = button("수정", "ghost small");
      edit.addEventListener("click", () => {
        systemNoticeEditingIdV54 = notice.id;
        title.value = notice.title || "";
        contentInput.value = notice.content || "";
        priority.value = notice.priority || "normal";
        status.value = notice.status || "active";
        pinned.checked = !!notice.pinned;
        save.textContent = "수정 저장";
      });
      const toggle = button((notice.status || "active") === "active" ? "보관" : "복원", "ghost small");
      toggle.addEventListener("click", async () => {
        if ((notice.status || "active") === "active") await window.PMSystemAdminService.archiveSystemNotice(notice.id);
        else await window.PMSystemAdminService.restoreSystemNotice(notice.id);
        notifySystemNoticeChangedV82();
      });
      const del = button("삭제", "ghost small danger");
      del.addEventListener("click", async () => {
        if (!confirm("이 시스템 공지를 완전히 삭제할까요?")) return;
        await window.PMSystemAdminService.deleteSystemNotice(notice.id);
        notifySystemNoticeChangedV82();
      });
      const actions = el("div", "row-actions");
      actions.append(edit, toggle, del);
      const tr = document.createElement("tr");
      tr.append(
        el("td", "", notice.title || "-"),
        el("td", "", notice.status || "active"),
        el("td", "", notice.priority || "normal"),
        el("td", "", notice.pinned ? "고정" : "-"),
        el("td", "", formatSystemTimeV54(notice.createdAt)),
        tableCellNodeV31(actions)
      );
      body.append(tr);
    });
  if (!body.children.length) appendEmptyRowV54(body, 6, "등록된 시스템 공지가 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(grid, wrap);
  return box;
}

function renderWorkspaceNoticeAdminV60() {
  const box = panel("워크스페이스 공지 작성");
  box.append(el("p", "muted", "워크스페이스 공지는 선택한 workspace의 일반 공지 목록에 저장됩니다. 아래 목록에서 수정/삭제할 수 있습니다."));
  const workspaces = systemOwnerStateV54.workspaces || [];
  const grid = el("div", "form-grid workspace-notice-admin");
  const mode = document.createElement("select");
  mode.append(option("single", "특정 워크스페이스"), option("multiple", "여러 워크스페이스"), option("all", "전체 워크스페이스"));
  const workspaceSelect = document.createElement("select");
  workspaceSelect.append(option("", "워크스페이스 선택"));
  workspaces.forEach((workspace) => workspaceSelect.append(option(workspace.id || workspace.workspaceId, workspaceNameV60(workspace))));
  const workspaceChecks = el("div", "workspace-check-grid");
  workspaces.forEach((workspace) => {
    const id = workspace.id || workspace.workspaceId;
    const check = document.createElement("input");
    check.type = "checkbox";
    check.value = id;
    check.dataset.workspaceNoticeTarget = id;
    const label = document.createElement("label");
    label.append(check, document.createTextNode(` ${workspaceNameV60(workspace)}`));
    workspaceChecks.append(label);
  });
  const title = document.createElement("input");
  const contentInput = document.createElement("textarea");
  const pinned = document.createElement("input");
  pinned.type = "checkbox";
  const priority = document.createElement("select");
  ["low", "normal", "high", "critical"].forEach((key) => priority.append(option(key, key)));
  priority.value = "normal";
  const status = document.createElement("select");
  ["active", "archived"].forEach((key) => status.append(option(key, key)));
  const save = button("워크스페이스 공지 등록");
  const reset = button("새 공지", "ghost");
  const syncMode = () => {
    workspaceSelect.closest("label").style.display = mode.value === "single" ? "" : "none";
    workspaceChecks.closest("label").style.display = mode.value === "multiple" ? "" : "none";
  };
  const resetForm = () => {
    workspaceNoticeEditingV82 = null;
    title.value = "";
    contentInput.value = "";
    pinned.checked = false;
    priority.value = "normal";
    status.value = "active";
    save.textContent = "워크스페이스 공지 등록";
    mode.disabled = false;
    workspaceSelect.disabled = false;
    workspaceChecks.querySelectorAll("input").forEach((input) => { input.disabled = false; input.checked = false; });
  };
  mode.addEventListener("change", syncMode);
  save.addEventListener("click", async () => {
    try {
      if (workspaceNoticeEditingV82) {
        await window.PMSystemAdminService.updateWorkspaceNotice({
          ...workspaceNoticeEditingV82,
          title: title.value,
          content: contentInput.value,
          pinned: pinned.checked,
          priority: priority.value,
          status: status.value
        });
      } else {
        const checkedWorkspaceIds = [...workspaceChecks.querySelectorAll("[data-workspace-notice-target]:checked")].map((input) => input.value);
        const workspaceIds = mode.value === "single" ? [workspaceSelect.value].filter(Boolean) : checkedWorkspaceIds;
        await window.PMSystemAdminService.createWorkspaceNotice({
          targetMode: mode.value,
          workspaceIds,
          allWorkspaceIds: workspaces.map((workspace) => workspace.id || workspace.workspaceId).filter(Boolean),
          title: title.value,
          content: contentInput.value,
          pinned: pinned.checked,
          priority: priority.value,
          status: status.value
        });
      }
      showMessage("저장 완료", "워크스페이스 공지를 저장했습니다.");
      resetForm();
    } catch (error) {
      showMessage("저장 실패", error.message || String(error));
    }
  });
  reset.addEventListener("click", resetForm);
  grid.append(
    makeField("공지 대상", "workspaceNoticeModeV82", mode),
    makeField("워크스페이스 선택", "workspaceNoticeSingleSelectV82", workspaceSelect),
    makeField("여러 워크스페이스 선택", "workspaceNoticeMultiChecksV82", workspaceChecks),
    makeField("공지 제목", "workspaceNoticeTitleV82", title),
    makeField("우선순위", "workspaceNoticePriorityV82", priority),
    makeField("상단 고정", "workspaceNoticePinnedV82", pinned),
    makeField("상태", "workspaceNoticeStatusV82", status),
    makeField("공지 내용", "workspaceNoticeContentV82", contentInput),
    save,
    reset
  );
  box.append(grid);
  syncMode();
  const wrap = el("div", "table-wrap");
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>workspace</th><th>제목</th><th>상태</th><th>우선순위</th><th>고정</th><th>작성자</th><th>작성일</th><th>관리</th></tr></thead>";
  const body = document.createElement("tbody");
  (systemOwnerStateV54.workspaceNotices || [])
    .sort((a, b) => formatSortTimeV54(b.createdAt) - formatSortTimeV54(a.createdAt))
    .slice(0, 100)
    .forEach((notice) => {
      const workspace = workspaces.find((item) => (item.id || item.workspaceId) === notice.workspaceId);
      const edit = button("수정", "ghost small");
      edit.addEventListener("click", () => {
        workspaceNoticeEditingV82 = { workspaceId: notice.workspaceId, id: notice.id };
        title.value = notice.title || "";
        contentInput.value = notice.content || "";
        pinned.checked = !!notice.pinned;
        priority.value = notice.priority || "normal";
        status.value = notice.status || "active";
        workspaceSelect.value = notice.workspaceId || "";
        mode.value = "single";
        mode.disabled = true;
        workspaceSelect.disabled = true;
        workspaceChecks.querySelectorAll("input").forEach((input) => { input.disabled = true; });
        save.textContent = "수정 저장";
        syncMode();
      });
      const del = button("삭제", "ghost small danger");
      del.addEventListener("click", async () => {
        if (!confirm("이 워크스페이스 공지를 삭제할까요?")) return;
        await window.PMSystemAdminService.deleteWorkspaceNotice(notice.workspaceId, notice.id);
        showMessage("삭제 완료", "워크스페이스 공지를 삭제했습니다.");
      });
      const actions = el("div", "row-actions");
      actions.append(edit, del);
      const tr = document.createElement("tr");
      tr.append(
        el("td", "", workspaceNameV60(workspace) || notice.workspaceId || "-"),
        el("td", "", notice.title || "-"),
        el("td", "", notice.status || "active"),
        el("td", "", notice.priority || "normal"),
        el("td", "", notice.pinned ? "고정" : "-"),
        el("td", "", notice.authorEmail || notice.authorUid || "-"),
        el("td", "", formatSystemTimeV54(notice.createdAt)),
        tableCellNodeV31(actions)
      );
      body.append(tr);
    });
  if (!body.children.length) appendEmptyRowV54(body, 8, "워크스페이스 공지가 없습니다.");
  table.append(body);
  wrap.append(table);
  box.append(wrap);
  return box;
}

const renderDashboardBeforeV82 = renderDashboardV8;
renderDashboardV8 = function renderDashboardV82() {
  renderDashboardBeforeV82();
  refreshSystemNoticesV82(false);
};

const renderTimetableBeforeV82 = renderTimetableV29;
renderTimetableV29 = function renderTimetableV82() {
  renderTimetableBeforeV82();
  const actions = content.querySelector(".panel .panel-head .row-actions");
  if (!actions || document.getElementById("clearAllPeriodsV82")) return;
  const clearPeriods = button("교시 일괄삭제", "danger");
  clearPeriods.id = "clearAllPeriodsV82";
  clearPeriods.addEventListener("click", () => requirePassword(() => {
    if (!confirm("교시 시간 설정을 모두 삭제할까요?")) return;
    persistPeriodRowsV81([]);
    renderTimetableV29();
  }));
  actions.append(clearPeriods);
};

store.settings.appVersion = APP_PATCH_VERSION_V82;

// Final V83: keep auth sessions in the current page execution only, so refresh/new tabs show login.
let liveAuthSessionV83 = false;

const markBrowserAuthSessionBeforeV83 = markBrowserAuthSessionV80;
markBrowserAuthSessionV80 = function markBrowserAuthSessionV83(user) {
  liveAuthSessionV83 = true;
  markBrowserAuthSessionBeforeV83(user);
};

const canUseBrowserAuthSessionBeforeV83 = canUseBrowserAuthSessionV80;
canUseBrowserAuthSessionV80 = function canUseBrowserAuthSessionV83() {
  return liveAuthSessionV83 && canUseBrowserAuthSessionBeforeV83();
};

const clearBrowserAuthSessionBeforeV83 = clearBrowserAuthSessionV80;
clearBrowserAuthSessionV80 = function clearBrowserAuthSessionV83() {
  liveAuthSessionV83 = false;
  clearBrowserAuthSessionBeforeV83();
};

// Final V84: dashboard viewer cleanup, timetable period fixes, program detail persistence,
// exam management refresh, and stable site option settings.
const APP_PATCH_VERSION_V84 = "v84.0 - 2026-06-19";

function uniqueV84(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function currentYearV84() {
  return new Date().getFullYear();
}

function yearOptionsV84(range = 7) {
  const base = currentYearV84();
  return Array.from({ length: range }, (_, index) => String(base - 3 + index));
}

function normalizePeriodLabelV84(value, index = 0) {
  const match = String(value || "").match(/\d+/);
  return `${match ? Number(match[0]) : index + 1}교시`;
}

function normalizeTimetableRowsV84() {
  (store.timetable || []).forEach((row, index) => {
    row.period = normalizePeriodLabelV84(row.period, index);
  });
  ["afterschool", "specialLectures", "clubs"].forEach((type) => {
    if (typeof programConfigV26 !== "function") return;
    const cfg = programConfigV26(type);
    (store[cfg.schedules] || []).forEach((row, index) => {
      row.period = normalizePeriodLabelV84(row.period, index);
    });
  });
}

const technicalViewerFieldBeforeV84 = typeof technicalViewerFieldV80 === "function" ? technicalViewerFieldV80 : null;
technicalViewerFieldV80 = function technicalViewerFieldV84(key) {
  const normalized = String(key || "").toLowerCase().replace(/[-_\s]/g, "");
  if (technicalViewerFieldBeforeV84?.(key)) return true;
  return normalized === "url"
    || normalized === "link"
    || normalized === "href"
    || normalized === "source"
    || normalized === "sourceurl"
    || normalized === "pageurl"
    || normalized === "homepageurl"
    || normalized === "downloadurl"
    || normalized === "fileurl"
    || normalized === "attachmenturl"
    || normalized.endsWith("url")
    || normalized.includes("workspace")
    || normalized.includes("firebase")
    || normalized.includes("path");
};

const timetablePeriodsBeforeV84 = timetablePeriodsV29;
timetablePeriodsV29 = function timetablePeriodsV84() {
  if (store.settings?.periodTimesConfiguredV81 === true) {
    return (Array.isArray(store.periodTimes) ? store.periodTimes : []).map((row, index) => {
      const time = row.time || [row.start, row.end].filter(Boolean).join("-");
      const [start = "", end = ""] = String(time || "").split("-");
      return {
        period: normalizePeriodLabelV84(row.period, index),
        start: row.start || start.trim(),
        end: row.end || end.trim(),
        time: time || ""
      };
    });
  }
  return timetablePeriodsBeforeV84().map((row, index) => ({
    ...row,
    period: normalizePeriodLabelV84(row.period, index)
  }));
};

function persistPeriodRowsV84(rows) {
  store.settings ??= {};
  store.settings.periodTimesConfiguredV81 = true;
  const normalized = (rows || []).map((row, index) => {
    const start = row.start || "";
    const end = row.end || "";
    return {
      period: normalizePeriodLabelV84(row.period, index),
      start,
      end,
      time: row.time || [start, end].filter(Boolean).join("-")
    };
  });
  store.periodTimes = normalized;
  store.settings.timetablePeriods = normalized.length;
  normalizeTimetableRowsV84();
  saveStore();
}

function periodCardV84(row, index) {
  const card = el("article", "period-card");
  const top = el("div", "period-card-top");
  top.append(el("strong", "", `${index + 1}교시 설정`));
  const del = button("삭제", "ghost small");
  del.addEventListener("click", () => {
    const next = timetablePeriodsV29().filter((_, rowIndex) => rowIndex !== index);
    persistPeriodRowsV84(next);
    renderTimetableV29();
  });
  top.append(del);
  const start = document.createElement("input");
  start.type = "time";
  start.value = row.start || "";
  const end = document.createElement("input");
  end.type = "time";
  end.value = row.end || "";
  const persist = () => {
    const next = timetablePeriodsV29();
    next[index] = { period: normalizePeriodLabelV84(row.period, index), start: start.value, end: end.value, time: `${start.value}-${end.value}` };
    (store.timetable || []).filter((item) => normalizePeriodLabelV84(item.period, index) === next[index].period).forEach((item) => {
      item.period = next[index].period;
      item.time = next[index].time;
    });
    persistPeriodRowsV84(next);
  };
  start.addEventListener("change", persist);
  end.addEventListener("change", persist);
  card.append(top, makeField("시작", `periodStartV84-${index}`, start), makeField("종료", `periodEndV84-${index}`, end));
  return card;
}

periodEditorV29 = function periodEditorV84() {
  const box = el("section", "modern-period-editor");
  const head = el("div", "period-editor-head-v81");
  const actions = el("div", "row-actions");
  const add = button("+ 신규 교시 추가", "ghost");
  add.addEventListener("click", () => {
    const periods = timetablePeriodsV29();
    periods.push({ period: `${periods.length + 1}교시`, start: "", end: "", time: "" });
    persistPeriodRowsV84(periods);
    renderTimetableV29();
  });
  const clear = button("교시 전체 삭제", "danger");
  clear.addEventListener("click", () => requirePassword(() => {
    if (!confirm("등록된 교시 시간을 모두 삭제할까요? 시간표 배정 내용은 유지되지만 교시 시간 표시는 비워집니다.")) return;
    persistPeriodRowsV84([]);
    renderTimetableV29();
  }));
  actions.append(add, clear);
  head.append(el("h3", "", "정규 수강 교시 및 시간 설정"), actions);
  const grid = el("div", "period-card-grid");
  timetablePeriodsV29().forEach((row, index) => grid.append(periodCardV84(row, index)));
  if (!grid.children.length) grid.append(el("div", "empty", "등록된 교시가 없습니다. 신규 교시 추가를 눌러 다시 만들 수 있습니다."));
  box.append(head, el("p", "muted", "교시 삭제 후 자동으로 기본 교시가 다시 생성되지 않도록 현재 설정 상태를 저장합니다."), grid);
  return box;
};

const renderTimetableBeforeV84 = renderTimetableV29;
renderTimetableV29 = function renderTimetableV84() {
  normalizeTimetableRowsV84();
  renderTimetableBeforeV84();
  const actions = content.querySelector(".panel .panel-head .row-actions");
  if (!actions || document.getElementById("clearPeriodsV84")) return;
  const clearPeriods = button("교시 일괄삭제", "danger");
  clearPeriods.id = "clearPeriodsV84";
  clearPeriods.addEventListener("click", () => requirePassword(() => {
    if (!confirm("모든 교시 시간 설정을 삭제할까요?")) return;
    persistPeriodRowsV84([]);
    renderTimetableV29();
  }));
  actions.append(clearPeriods);
};

let programDetailLockV84 = null;
function setProgramDetailLockV84(type, programId, mode) {
  if (!["afterschool", "specialLectures", "clubs"].includes(type) || !programId) return;
  programDetailLockV84 = { type, programId, mode: mode || "attendance", until: Date.now() + 5000 };
}

const renderProgramPageBeforeV84 = renderProgramPageV26;
renderProgramPageV26 = function renderProgramPageV84(type, programId, mode = "attendance") {
  setProgramDetailLockV84(type, programId, mode);
  return renderProgramPageBeforeV84(type, programId, mode);
};

const renderProgramListBeforeV84 = renderProgramListV26;
renderProgramListV26 = function renderProgramListV84(type) {
  if (programDetailLockV84?.type === type) programDetailLockV84 = null;
  return renderProgramListBeforeV84(type);
};

const addProgramScheduleSlotBeforeV84 = addProgramScheduleSlotV26;
addProgramScheduleSlotV26 = function addProgramScheduleSlotV84(type, program, day, period, room) {
  setProgramDetailLockV84(type, program?.id, "schedule");
  const result = addProgramScheduleSlotBeforeV84(type, program, day, normalizePeriodLabelV84(period), room);
  setTimeout(() => {
    if (currentPage === type) renderProgramPageV26(type, program.id, "schedule");
  }, 120);
  return result;
};

function saveProgramAttendanceFromDomV84(type, program, wrap) {
  const cfg = programConfigV26(type);
  const date = wrap.querySelector('input[type="date"]')?.value || today;
  store[cfg.attendance] ??= [];
  const oldRows = (store[cfg.attendance] || []).filter((row) => row.programId === program.id && row.date === date);
  markWorkspaceDeletedRows(cfg.attendance, oldRows);
  store[cfg.attendance] = (store[cfg.attendance] || []).filter((row) => !(row.programId === program.id && row.date === date));
  wrap.querySelectorAll(".attendance-segment").forEach((group) => {
    const active = group.querySelector(".active");
    if (!active) return;
    const student = active.dataset.student || "";
    const memoInput = [...wrap.querySelectorAll("[data-student-memo]")].find((input) => input.dataset.studentMemo === student);
    store[cfg.attendance].push({
      id: Date.now() + Math.random(),
      programId: program.id,
      date,
      name: student,
      state: active.dataset.state || "출석",
      memo: memoInput?.value || ""
    });
  });
  setProgramDetailLockV84(type, program.id, "attendance");
  saveStore();
  showMessage("출결 저장 완료", `${program.name || "강좌"} ${date} 출결을 저장했습니다.`);
  renderProgramPageV26(type, program.id, "attendance");
}

const programAttendanceBeforeV84 = programAttendanceV26;
programAttendanceV26 = function programAttendanceV84(type, program) {
  const wrap = programAttendanceBeforeV84(type, program);
  const save = button("출결 저장", "program-v84-save");
  save.addEventListener("click", () => saveProgramAttendanceFromDomV84(type, program, wrap));
  wrap.append(el("div", "program-sticky-actions program-v84-actions", save));
  return wrap;
};

const programScheduleBeforeV84 = programScheduleV26;
programScheduleV26 = function programScheduleV84(type, program) {
  setProgramDetailLockV84(type, program?.id, "schedule");
  const wrap = programScheduleBeforeV84(type, program);
  wrap.addEventListener("click", () => setProgramDetailLockV84(type, program?.id, "schedule"), true);
  return wrap;
};

function examYearValueV84(row) {
  return String(row?.year || (row?.date ? String(row.date).slice(0, 4) : currentYearV84()));
}

function examFiltersV84() {
  return {
    year: sessionStorage.getItem("examYearV84") || "",
    start: sessionStorage.getItem("examStartV84") || "",
    end: sessionStorage.getItem("examEndV84") || "",
    subject: sessionStorage.getItem("examSubjectV84") || "",
    teacher: sessionStorage.getItem("examTeacherV84") || "",
    grade: sessionStorage.getItem("examGradeV84") || "",
    title: sessionStorage.getItem("examTitleV84") || "",
    min: sessionStorage.getItem("examMinScoreV84") || "",
    max: sessionStorage.getItem("examMaxScoreV84") || ""
  };
}

function filteredExamsV84() {
  const filter = examFiltersV84();
  return (store.exams || []).filter((row) => {
    const year = examYearValueV84(row);
    const score = Number(row.score || row.raw_score || 0);
    if (filter.year && year !== filter.year) return false;
    if (filter.start && String(row.date || "") < filter.start) return false;
    if (filter.end && String(row.date || "") > filter.end) return false;
    if (filter.subject && row.subject !== filter.subject) return false;
    if (filter.teacher && row.teacher !== filter.teacher) return false;
    if (filter.grade && String(row.grade || "") !== filter.grade) return false;
    if (filter.title && !String(row.title || "").includes(filter.title)) return false;
    if (filter.min && score < Number(filter.min)) return false;
    if (filter.max && score > Number(filter.max)) return false;
    return true;
  });
}

function selectedExamV84() {
  const id = sessionStorage.getItem("selectedExamV84") || sessionStorage.getItem("selectedExamV6") || "";
  return (store.exams || []).find((row) => String(row.id) === String(id)) || filteredExamsV84()[0] || null;
}

function selectV84(values, selected = "", placeholder = "") {
  const select = document.createElement("select");
  if (placeholder) select.append(option("", placeholder));
  values.forEach((value) => select.append(option(value, value)));
  select.value = selected || "";
  return select;
}

function saveExamFilterV84(inputMap) {
  Object.entries(inputMap).forEach(([key, input]) => sessionStorage.setItem(key, input.value || ""));
  renderExamsV6();
}

function makeExamFilterPanelV84() {
  const filters = panel("시험 조회");
  filters.classList.add("exam-v84-filter");
  const f = examFiltersV84();
  const grid = el("div", "exam-filter exam-filter-v84");
  const year = selectV84(yearOptionsV84(11), f.year, "전체");
  const start = document.createElement("input");
  start.type = "date";
  start.value = f.start;
  const end = document.createElement("input");
  end.type = "date";
  end.value = f.end;
  const subject = selectV84(subjectsList(), f.subject, "전체");
  const teacher = selectV84(teachersList(), f.teacher, "전체");
  const grade = selectV84(["1", "2", "3"], f.grade, "전체");
  const title = document.createElement("input");
  title.placeholder = "시험명";
  title.value = f.title;
  const min = document.createElement("input");
  min.type = "number";
  min.placeholder = "최소";
  min.value = f.min;
  const max = document.createElement("input");
  max.type = "number";
  max.placeholder = "최대";
  max.value = f.max;
  const inputs = {
    examYearV84: year,
    examStartV84: start,
    examEndV84: end,
    examSubjectV84: subject,
    examTeacherV84: teacher,
    examGradeV84: grade,
    examTitleV84: title,
    examMinScoreV84: min,
    examMaxScoreV84: max
  };
  Object.values(inputs).forEach((input) => input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveExamFilterV84(inputs);
  }));
  const search = button("검색");
  search.addEventListener("click", () => saveExamFilterV84(inputs));
  const reset = button("초기화", "ghost");
  reset.addEventListener("click", () => {
    Object.keys(inputs).forEach((key) => sessionStorage.removeItem(key));
    renderExamsV6();
  });
  const add = button("시험 추가", "ghost");
  add.disabled = !can("create", "exams");
  add.addEventListener("click", () => {
    const next = normalizeExamV84({
      id: Date.now(),
      year: year.value || String(currentYearV84()),
      grade: grade.value || "",
      date: start.value || today,
      title: "새 시험",
      subject: subject.value || subjectsList()[0] || "",
      teacher: teacher.value || teachersList()[0] || "",
      base_score: 100,
      score: "",
      raw_score: "",
      createdBy: currentUser?.uid || currentUser?.id || currentUser?.email || "",
      draftV84: true
    });
    store.exams ??= [];
    store.exams.unshift(next);
    saveStore();
    sessionStorage.setItem("selectedExamV84", String(next.id));
    renderExamsV6();
  });
  const omr = button("OMR 카드 DOWN", "ghost");
  omr.addEventListener("click", downloadOmrCard);
  grid.append(
    makeField("시험년도", "examYearV84", year),
    makeField("시작일", "examStartV84", start),
    makeField("마지막일", "examEndV84", end),
    makeField("과목", "examSubjectV84", subject),
    makeField("선생님", "examTeacherV84", teacher),
    makeField("학년", "examGradeV84", grade),
    makeField("시험명", "examTitleV84", title),
    makeField("최소점수", "examMinScoreV84", min),
    makeField("최대점수", "examMaxScoreV84", max),
    search,
    reset,
    add,
    omr
  );
  filters.append(grid);
  return filters;
}

function examGroupedListV84() {
  const wrap = el("div", "exam-groups exam-groups-v84");
  const groups = {};
  filteredExamsV84().forEach((row) => {
    const key = row.date || "날짜 없음";
    groups[key] ??= [];
    groups[key].push(row);
  });
  if (!Object.keys(groups).length) {
    wrap.append(el("div", "empty", "조건에 맞는 시험이 없습니다."));
    return wrap;
  }
  Object.entries(groups).sort(([a], [b]) => String(b).localeCompare(String(a))).forEach(([date, rows]) => {
    const details = document.createElement("details");
    details.open = true;
    details.append(el("summary", "", `${date} (${rows.length})`));
    rows.forEach((row) => {
      const line = el("label", "exam-line exam-line-v84");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = (store.settings.examSelectedIds || []).includes(row.id);
      check.addEventListener("change", () => {
        const set = new Set(store.settings.examSelectedIds || []);
        check.checked ? set.add(row.id) : set.delete(row.id);
        store.settings.examSelectedIds = [...set];
        saveStore();
        renderExamsV6();
      });
      const btn = button(`${row.subject || "과목"} · ${row.title || "시험"} · ${examYearValueV84(row)}`, "ghost");
      btn.addEventListener("click", () => {
        sessionStorage.setItem("selectedExamV84", String(row.id));
        renderExamsV6();
      });
      line.append(check, btn);
      details.append(line);
    });
    wrap.append(details);
  });
  return wrap;
}

function normalizeExamV84(row) {
  row.year = examYearValueV84(row);
  row.base_score ??= 100;
  row.raw_score = row.raw_score ?? row.score ?? "";
  row.score = row.score ?? row.raw_score ?? "";
  return row;
}

function computeExamAutoFieldsV84() {
  const score = Number(document.getElementById("examV84-score")?.value || document.getElementById("examV84-raw_score")?.value || 0);
  const rank = Number(document.getElementById("examV84-rank")?.value || 0);
  const count = Number(document.getElementById("examV84-student_count")?.value || 0);
  const percentile = count && rank ? Math.round(((count - rank + 1) / count) * 1000) / 10 : "";
  const grade = score >= 90 ? "1등급" : score >= 80 ? "2등급" : score >= 70 ? "3등급" : score >= 60 ? "4등급" : score ? "5등급 이하" : "";
  const subject = document.getElementById("examV84-subject")?.value || "";
  const rows = (store.exams || []).filter((row) => !subject || row.subject === subject);
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || row.raw_score || 0), 0) / rows.length) : "";
  const high = rows.length ? Math.max(...rows.map((row) => Number(row.score || row.raw_score || 0))) : "";
  const p = document.getElementById("examV84-percentile");
  const g = document.getElementById("examV84-grade_level");
  const a = document.getElementById("examV84-average");
  const h = document.getElementById("examV84-high_score");
  if (p) p.value = percentile;
  if (g) g.value = grade;
  if (a) a.value = average;
  if (h) h.value = high;
}

function examDetailV84(row) {
  const form = el("div", "exam-form exam-form-v84");
  if (!row) {
    form.append(el("div", "empty", "왼쪽 시험 목록에서 시험을 선택하거나 시험 추가를 눌러주세요."));
    return form;
  }
  normalizeExamV84(row);
  const editable = can("edit", "exams") || (can("create", "exams") && row.draftV84 && row.createdBy === (currentUser?.uid || currentUser?.id || currentUser?.email || ""));
  const fields = [
    ["year", "시험년도", "year"],
    ["grade", "학년", "grade"],
    ["title", "시험명", "text"],
    ["date", "시험일자", "date"],
    ["subject", "과목", "subject"],
    ["teacher", "선생님", "teacher"],
    ["scope", "시험범위", "textarea"],
    ["base_score", "기본점수", "number"],
    ["raw_score", "원점수", "number"],
    ["score", "점수", "number"],
    ["rank", "석차", "number"],
    ["student_count", "응시인원", "number"],
    ["percentile", "백분위", "number"],
    ["grade_level", "등급", "text"],
    ["average", "평균", "number"],
    ["high_score", "최고점", "number"],
    ["memo", "메모", "textarea"]
  ];
  fields.forEach(([name, label, type]) => {
    let input;
    if (type === "year") input = selectV84(yearOptionsV84(11), row[name] || String(currentYearV84()));
    else if (type === "grade") input = selectV84(["1", "2", "3"], row[name] || "", "선택");
    else if (type === "subject") input = selectV84(subjectsList(), row[name] || "", "선택");
    else if (type === "teacher") input = selectV84(teachersList(), row[name] || "", "선택");
    else if (type === "textarea") input = document.createElement("textarea");
    else {
      input = document.createElement("input");
      input.type = type || "text";
    }
    input.id = `examV84-${name}`;
    input.value = row[name] || "";
    input.disabled = !editable || ["percentile", "grade_level", "average", "high_score"].includes(name);
    if (["score", "raw_score", "rank", "student_count"].includes(name)) input.addEventListener("input", computeExamAutoFieldsV84);
    if (name === "subject") input.addEventListener("change", computeExamAutoFieldsV84);
    form.append(makeField(label, input.id, input));
  });
  const paper = document.createElement("input");
  paper.type = "file";
  paper.accept = ".pdf,image/*";
  paper.disabled = !editable;
  const answer = document.createElement("input");
  answer.type = "file";
  answer.accept = ".pdf,image/*";
  answer.disabled = !editable;
  form.append(makeField("시험지 업로드", "examV84Paper", paper), makeField("정답/내답 업로드", "examV84Answer", answer));
  if (editable) {
    const save = button("시험 정보 저장");
    save.addEventListener("click", () => {
      fields.forEach(([name]) => {
        row[name] = document.getElementById(`examV84-${name}`)?.value || "";
      });
      row.examPaperPdf = paper.files[0]?.name || row.examPaperPdf || "";
      row.answerPdf = answer.files[0]?.name || row.answerPdf || "";
      normalizeExamV84(row);
      computeExamAutoFieldsV84();
      row.percentile = document.getElementById("examV84-percentile")?.value || row.percentile || "";
      row.grade_level = document.getElementById("examV84-grade_level")?.value || row.grade_level || "";
      row.average = document.getElementById("examV84-average")?.value || row.average || "";
      row.high_score = document.getElementById("examV84-high_score")?.value || row.high_score || "";
      row.draftV84 = false;
      saveStore();
      renderExamsV6();
    });
    form.append(save);
  } else {
    form.append(el("p", "muted wide", "일반 계정은 시험 등록은 가능하지만 기존 시험 정보 수정은 관리자에게 요청해야 합니다."));
  }
  setTimeout(computeExamAutoFieldsV84, 0);
  return form;
}

function examAnalysisV84() {
  const rows = (store.exams || []).filter((row) => (store.settings.examSelectedIds || []).includes(row.id));
  const wrap = el("div", "exam-analysis-v84");
  const target = rows.length ? rows : filteredExamsV84();
  const bySubject = {};
  target.forEach((row) => {
    const key = row.subject || "과목 없음";
    bySubject[key] ??= [];
    bySubject[key].push(Number(row.score || row.raw_score || 0));
  });
  Object.entries(bySubject).forEach(([subject, scores]) => {
    const avg = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
    const card = el("div", "mini-report-card");
    card.append(el("strong", "", subject), el("span", "", `평균 ${avg}점 · 최고 ${Math.max(...scores, 0)}점 · ${scores.length}건`));
    wrap.append(card);
  });
  if (!wrap.children.length) wrap.append(el("div", "empty", "분석할 시험이 없습니다."));
  return wrap;
}

function renderExamsV84() {
  content.replaceChildren();
  installStyleV84();
  const filters = makeExamFilterPanelV84();
  const layout = el("div", "exam-layout exam-layout-v84");
  const left = panel("시험 목록");
  left.append(examGroupedListV84());
  const center = panel("시험 정보");
  center.append(examDetailV84(selectedExamV84()));
  const right = panel("성적 분석");
  right.append(examAnalysisV84());
  layout.append(left, center, right);
  content.append(filters, layout);
}

renderExamsV6 = renderExamsV84;

const fieldsForV7BeforeV84 = fieldsForV7;
fieldsForV7 = function fieldsForV84(key) {
  if (key === "examSchedules") {
    return [["year", "시험년도", "select", yearOptionsV84(11)], ["grade", "학년", "select", ["1", "2", "3"]], ["date", "시작날짜", "date"], ["end_date", "마지막날짜", "date"], ["title", "시험명", "text", true], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["scope", "시험범위", "textarea"], ["place", "장소", "text"], ["memo", "메모", "textarea"]];
  }
  if (key === "exams") {
    return [["year", "시험년도", "select", yearOptionsV84(11)], ["grade", "학년", "select", ["1", "2", "3"]], ["title", "시험명", "text", true], ["date", "시험일자", "date"], ["subject", "과목", "select", subjectsList()], ["teacher", "선생님", "select", teachersList()], ["scope", "시험범위", "textarea"], ["base_score", "기본점수", "number"], ["raw_score", "원점수", "number"], ["score", "점수", "number"], ["rank", "석차", "number"], ["student_count", "응시인원", "number"], ["memo", "메모", "textarea"]];
  }
  return fieldsForV7BeforeV84(key);
};

function masterTextbooksV84() {
  return uniqueV84([...(defaults.textbooks || []), ...(store.settings.textbookMasterOptionsV84 || []), ...(store.settings.textbooks || []), ...(store.subjects || []).map((item) => item.textbook)]);
}

function masterPublishersV84() {
  return uniqueV84([...(defaults.publishers || []), ...(store.settings.publisherMasterOptionsV84 || []), ...(store.settings.publishers || []), ...(store.subjects || []).map((item) => item.publisher)]);
}

const textbooksListBeforeV84 = textbooksList;
textbooksList = function textbooksListV84() {
  const active = uniqueV84(store.settings?.textbooks || []);
  if (store.settings?.textbookOptionsTouchedV84) return active;
  return uniqueV84([...textbooksListBeforeV84(), ...masterTextbooksV84()]);
};

const publishersListBeforeV84 = publishersList;
publishersList = function publishersListV84() {
  const active = uniqueV84(store.settings?.publishers || []);
  if (store.settings?.publisherOptionsTouchedV81) return active;
  return uniqueV84([...publishersListBeforeV84(), ...masterPublishersV84()]);
};

function replaceOptionBoxV84(id, title, options, selected) {
  const old = document.getElementById(id);
  if (!old) return;
  old.replaceWith(makeCheckboxGroupV7(title, id, options.map((name) => [name, name]), selected));
}

const renderSiteBeforeV84 = renderSiteV20;
renderSiteV20 = function renderSiteV84() {
  renderSiteBeforeV84();
  replaceOptionBoxV84("textbookEnabledBox", "교과서 선택값", masterTextbooksV84(), uniqueV84(store.settings.textbooks || masterTextbooksV84()));
  replaceOptionBoxV84("publisherEnabledBox", "출판사 선택값", masterPublishersV84(), uniqueV84(store.settings.publishers || masterPublishersV84()));
  const save = document.getElementById("saveSite");
  if (save) {
    const clone = save.cloneNode(true);
    clone.addEventListener("click", () => saveSiteSettingsV2());
    save.replaceWith(clone);
  }
};

const saveSiteSettingsBeforeV84 = saveSiteSettingsV2;
saveSiteSettingsV2 = async function saveSiteSettingsV84(...args) {
  store.settings ??= {};
  store.settings.textbookMasterOptionsV84 = masterTextbooksV84();
  store.settings.publisherMasterOptionsV84 = masterPublishersV84();
  const textbookBox = document.getElementById("textbookEnabledBox");
  const publisherBox = document.getElementById("publisherEnabledBox");
  if (textbookBox) store.settings.textbookOptionsTouchedV84 = true;
  if (publisherBox) store.settings.publisherOptionsTouchedV81 = true;
  const result = await saveSiteSettingsBeforeV84(...args);
  store.settings.textbookMasterOptionsV84 = masterTextbooksV84();
  store.settings.publisherMasterOptionsV84 = masterPublishersV84();
  store.settings.appVersion = APP_PATCH_VERSION_V84;
  saveStore();
  return result;
};

const renderPageBeforeV84 = renderPage;
renderPage = function renderPageV84(key) {
  if (programDetailLockV84 && programDetailLockV84.until > Date.now() && key === programDetailLockV84.type) {
    const cfg = programConfigV26(key);
    const exists = (store[cfg.programs] || []).some((program) => program.id === programDetailLockV84.programId);
    if (exists) {
      return renderProgramPageV26(key, programDetailLockV84.programId, programDetailLockV84.mode);
    }
  }
  const result = renderPageBeforeV84(key);
  installStyleV84();
  return result;
};

function installStyleV84() {
  if (document.getElementById("style-v84")) return;
  const style = document.createElement("style");
  style.id = "style-v84";
  style.textContent = `
    .exam-layout-v84{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(360px,1.35fr) minmax(260px,.8fr);gap:16px;align-items:start}
    .exam-filter-v84{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end}
    .exam-form-v84{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .exam-form-v84 .wide,.exam-form-v84 textarea{grid-column:1/-1}
    .exam-form-v84 button,.exam-form-v84 p{grid-column:1/-1}
    .exam-line-v84{display:flex;gap:8px;align-items:center;margin:6px 0}
    .exam-line-v84 button{flex:1;justify-content:flex-start;text-align:left}
    .mini-report-card{border:1px solid #d7e3f6;border-radius:10px;padding:12px;margin-bottom:10px;background:#f8fbff;display:flex;flex-direction:column;gap:6px}
    .program-v84-actions{justify-content:flex-end;margin-top:16px}
    @media (max-width: 980px){.exam-layout-v84{grid-template-columns:1fr}.exam-form-v84{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V84;

// Final V85: repair program action buttons, clear over-generated periods, and pin exams to a full-width layout.
const APP_PATCH_VERSION_V85 = "v85.0 - 2026-06-19";

function actionBoxV85(className, ...nodes) {
  const box = el("div", className || "program-sticky-actions");
  nodes.filter(Boolean).forEach((node) => box.append(node));
  return box;
}

function removeObjectButtonTextV85(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    if (String(walker.currentNode.nodeValue || "").includes("[object HTMLButtonElement]")) targets.push(walker.currentNode);
  }
  targets.forEach((node) => node.remove());
}

const programAttendanceBeforeV85 = programAttendanceV26;
programAttendanceV26 = function programAttendanceV85(type, program) {
  const wrap = programAttendanceBeforeV85(type, program);
  removeObjectButtonTextV85(wrap);
  if (!wrap.querySelector(".program-v85-save-attendance")) {
    const save = button("출결 저장", "program-v85-save-attendance");
    save.addEventListener("click", () => saveProgramAttendanceFromDomV84(type, program, wrap));
    wrap.append(actionBoxV85("program-sticky-actions program-v85-actions", save));
  }
  return wrap;
};

const programNoticeBeforeV85 = programNoticeV26;
programNoticeV26 = function programNoticeV85(type, program) {
  const wrap = programNoticeBeforeV85(type, program);
  removeObjectButtonTextV85(wrap);
  if (!wrap.querySelector(".program-v85-save-notice")) {
    const save = button("안내 저장", "program-v85-save-notice");
    save.addEventListener("click", () => {
      program.name = document.getElementById("programNameV26")?.value || program.name || "";
      program.teacher = document.getElementById("programTeacherV26")?.value || "";
      program.location = document.getElementById("programLocationV26")?.value || "";
      program.regular = document.getElementById("programRegularV26")?.value || "";
      program.notice = document.getElementById("programNoticeV26")?.value || "";
      program.memo = document.getElementById("programMemoV26")?.value || "";
      setProgramDetailLockV84(type, program.id, "notice");
      saveStore();
      buildNav();
      showMessage("안내 저장 완료", `${program.name || "강좌"} 안내 정보를 저장했습니다.`);
      renderProgramPageV26(type, program.id, "notice");
    });
    wrap.append(actionBoxV85("program-sticky-actions program-v85-actions", save));
  }
  return wrap;
};

function shouldClearOverGeneratedPeriodsV85() {
  const rows = Array.isArray(store.periodTimes) ? store.periodTimes : [];
  const configured = Number(store.settings?.timetablePeriods || 0);
  const count = Math.max(rows.length, configured);
  if (count <= 16) return false;
  const uniqueTimes = new Set(rows.map((row) => `${row.start || ""}-${row.end || ""}-${row.time || ""}`));
  const hasBlankRows = rows.some((row) => !row.start && !row.end && !row.time);
  return count > 20 || uniqueTimes.size < rows.length || hasBlankRows;
}

function clearOverGeneratedPeriodsV85() {
  if (!shouldClearOverGeneratedPeriodsV85()) return false;
  store.settings ??= {};
  store.settings.periodAutoClearedAtV85 = new Date().toISOString();
  persistPeriodRowsV84([]);
  console.info("[PM timetable] over-generated period rows cleared");
  return true;
}

const renderTimetableBeforeV85 = renderTimetableV29;
renderTimetableV29 = function renderTimetableV85() {
  clearOverGeneratedPeriodsV85();
  return renderTimetableBeforeV85();
};

const renderExamsBeforeV85 = renderExamsV6;
renderExamsV6 = function renderExamsV85() {
  const result = renderExamsBeforeV85();
  installStyleV85();
  return result;
};

const renderPageBeforeV85 = renderPage;
renderPage = function renderPageV85(key) {
  const result = renderPageBeforeV85(key);
  installStyleV85();
  return result;
};

function installStyleV85() {
  if (document.getElementById("style-v85")) return;
  const style = document.createElement("style");
  style.id = "style-v85";
  style.textContent = `
    .content[data-page="exams"]{grid-template-columns:minmax(0,1fr)!important}
    .content[data-page="exams"]>.panel,
    .content[data-page="exams"]>.exam-layout-v84{grid-column:1/-1;min-width:0;width:100%}
    .content[data-page="exams"] .panel{overflow:hidden}
    .exam-layout-v84{grid-template-columns:minmax(250px,.74fr) minmax(440px,1.14fr) minmax(260px,.8fr)!important;width:100%;max-width:100%}
    .exam-filter-v84{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(132px,1fr))!important;width:100%}
    .exam-filter-v84 label{display:grid!important;grid-template-columns:1fr!important;align-items:stretch!important;gap:6px!important}
    .exam-filter-v84 input,.exam-filter-v84 select{width:100%!important;min-width:0!important}
    .exam-form-v84{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    .exam-form-v84 label{min-width:0}
    .program-v85-actions{justify-content:flex-end;margin-top:16px}
    @media (max-width:1200px){.exam-layout-v84{grid-template-columns:minmax(240px,.9fr) minmax(420px,1.1fr)!important}.exam-layout-v84>.panel:last-child{grid-column:1/-1}}
    @media (max-width:900px){.exam-layout-v84{grid-template-columns:1fr!important}.exam-form-v84{grid-template-columns:1fr!important}}
  `;
  document.head.append(style);
}

store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V85;

// Final V86: date shortcuts for program attendance, no auto-login for admin standalone,
// and a single reliable homepage settings save path.
const APP_PATCH_VERSION_V86 = "v86.0 - 2026-06-19";

function localTodayV86() {
  if (typeof localDateStringV70 === "function") return localDateStringV70();
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function shiftDateV86(value, delta) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : localTodayV86();
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() + delta);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

const programAttendanceBeforeV86 = programAttendanceV26;
programAttendanceV26 = function programAttendanceV86(type, program) {
  const wrap = programAttendanceBeforeV86(type, program);
  const date = wrap.querySelector('input[type="date"]');
  const bar = wrap.querySelector(".attendance-date-bar") || date?.closest("div");
  if (date && bar && !wrap.querySelector(".program-date-shortcuts-v86")) {
    const shortcuts = el("div", "program-date-shortcuts-v86 row-actions");
    [
      ["어제", -1],
      ["오늘", 0],
      ["다음날", 1]
    ].forEach(([label, delta]) => {
      const btn = button(label, "ghost small");
      btn.addEventListener("click", () => {
        date.value = delta === 0 ? localTodayV86() : shiftDateV86(date.value, delta);
        sessionStorage.setItem(`program-date-${program.id}`, date.value);
        renderProgramPageV26(type, program.id, "attendance");
      });
      shortcuts.append(btn);
    });
    bar.append(shortcuts);
  }
  return wrap;
};

const canRestoreAdminStandaloneBeforeV86 = canRestoreAdminStandaloneAuthV62;
canRestoreAdminStandaloneAuthV62 = function canRestoreAdminStandaloneAuthV86() {
  if (isStandaloneAdminSiteV60()) return typeof hasPendingExplicitAuthV80 === "function" && hasPendingExplicitAuthV80();
  return canRestoreAdminStandaloneBeforeV86();
};

function forceAdminStandaloneLoginOnFreshLoadV86() {
  if (!isStandaloneAdminSiteV60()) return;
  if (typeof hasPendingExplicitAuthV80 === "function" && hasPendingExplicitAuthV80()) return;
  try { liveAuthSessionV83 = false; } catch {}
  try { clearAdminStandaloneAuthV62(); } catch {}
  try { clearBrowserAuthSessionV80(); } catch {}
  try { clearPersistedCurrentUserV80(); } catch {}
  try { showLoginOnlyV80(); } catch { showLoggedOutScreenV62(); }
  if (window.PMFirebaseRuntime?.hasConfig?.()) {
    window.PMFirebaseRuntime.init()
      .then((runtime) => runtime?.sdk?.auth?.signOut?.(runtime.auth))
      .catch((error) => console.info("[admin standalone signout skipped]", error?.message || String(error)));
  }
}

function masterSubjectsV86() {
  return uniqueV84([...(defaults.subjects || []), ...(store.settings.subjectMasterOptionsV86 || []), ...(store.settings.subjects || []), ...(store.subjects || []).map((item) => item.name)]);
}

const subjectsListBeforeV86 = subjectsList;
subjectsList = function subjectsListV86() {
  const active = uniqueV84(store.settings?.subjects || []);
  if (store.settings?.subjectOptionsTouchedV86) return active;
  return uniqueV84([...subjectsListBeforeV86(), ...masterSubjectsV86()]);
};

function checkedValuesV86(id) {
  const box = document.getElementById(id);
  return box ? [...box.querySelectorAll("input:checked")].map((input) => input.value) : null;
}

function ensureSitePasswordInputV86() {
  const input = document.getElementById("sitePasswordInput");
  if (!input) return null;
  input.disabled = false;
  input.readOnly = false;
  input.style.pointerEvents = "auto";
  input.autocomplete = "current-password";
  input.addEventListener("keydown", (event) => event.stopPropagation());
  return input;
}

function ensureSiteErrorV86() {
  let error = document.getElementById("siteError");
  if (error) return error;
  const password = document.getElementById("sitePasswordInput");
  error = el("p", "error");
  error.id = "siteError";
  password?.closest("label")?.after(error);
  return error;
}

async function saveSiteSettingsV86Impl() {
  const errorField = ensureSiteErrorV86();
  const passwordField = ensureSitePasswordInputV86();
  if (errorField) errorField.textContent = "";
  if (!passwordField?.value) {
    if (errorField) errorField.textContent = "현재 계정 비밀번호를 입력한 뒤 저장해주세요.";
    showMessage("비밀번호 필요", "홈페이지 관리 설정을 저장하려면 현재 계정 비밀번호를 입력해야 합니다.");
    return false;
  }
  try {
    const verify = typeof sitePasswordOkV70 === "function" ? sitePasswordOkV70 : verifyCurrentPasswordV78;
    const ok = await verify(passwordField.value);
    if (!ok) {
      if (errorField) errorField.textContent = "비밀번호가 올바르지 않습니다. 현재 로그인 계정의 비밀번호를 입력해주세요.";
      showMessage("비밀번호 확인 실패", "비밀번호가 맞지 않아 홈페이지 설정을 저장하지 않았습니다.");
      return false;
    }

    const value = (id) => document.getElementById(id)?.value ?? "";
    if (document.getElementById("siteNameInput")) store.settings.siteName = value("siteNameInput");
    if (document.getElementById("logoTextInput")) store.settings.logoText = value("logoTextInput");
    if (document.getElementById("systemNoticeInput")) store.settings.systemNotice = value("systemNoticeInput");
    if (document.getElementById("systemNoticeInputV30")) store.settings.systemNotice = value("systemNoticeInputV30");
    if (document.getElementById("editModeInput")) store.settings.editMode = value("editModeInput") === "on";

    const quick = checkedValuesV86("quickEnabledBox");
    if (quick) store.settings.quickButtons = quick;
    const dashboard = checkedValuesV86("dashboardCardsBoxV70");
    if (dashboard) store.settings.dashboardCards = dashboard;
    const subjects = checkedValuesV86("subjectEnabledBox");
    if (subjects) {
      store.settings.subjectOptionsTouchedV86 = true;
      store.settings.subjectMasterOptionsV86 = masterSubjectsV86();
      store.settings.subjects = subjects;
    }
    const textbooks = checkedValuesV86("textbookEnabledBox");
    if (textbooks) {
      store.settings.textbookOptionsTouchedV84 = true;
      store.settings.textbookMasterOptionsV84 = masterTextbooksV84();
      store.settings.textbooks = textbooks;
    }
    const publishers = checkedValuesV86("publisherEnabledBox");
    if (publishers) {
      store.settings.publisherOptionsTouchedV81 = true;
      store.settings.publisherMasterOptionsV84 = masterPublishersV84();
      store.settings.publishers = publishers;
    }
    const systemToggle = document.getElementById("systemNoticeToggle");
    if (systemToggle) store.settings.systemNoticeEnabled = systemToggle.value === "on";
    store.settings.appVersion = APP_PATCH_VERSION_V86;

    saveStore();
    applySettings();
    buildNav();
    showMessage("저장 완료", "홈페이지 관리 설정을 저장했습니다.");
    renderSiteV20();
    return true;
  } catch (error) {
    console.error("[site settings save v86]", error);
    if (errorField) errorField.textContent = `저장 중 오류가 발생했습니다: ${error?.message || String(error)}`;
    showMessage("저장 오류", error?.message || String(error));
    return false;
  }
}

saveSiteSettingsV2 = saveSiteSettingsV86Impl;

const renderSiteBeforeV86 = renderSiteV20;
renderSiteV20 = function renderSiteV86() {
  renderSiteBeforeV86();
  replaceOptionBoxV84("subjectEnabledBox", "과목 선택 활성", masterSubjectsV86(), uniqueV84(store.settings.subjects || masterSubjectsV86()));
  replaceOptionBoxV84("textbookEnabledBox", "교과서 선택값", masterTextbooksV84(), uniqueV84(store.settings.textbooks || masterTextbooksV84()));
  replaceOptionBoxV84("publisherEnabledBox", "출판사 선택값", masterPublishersV84(), uniqueV84(store.settings.publishers || masterPublishersV84()));
  ensureSitePasswordInputV86();
  ensureSiteErrorV86();
  const save = document.getElementById("saveSite");
  if (save) {
    const clone = save.cloneNode(true);
    clone.id = "saveSite";
    clone.type = "button";
    clone.addEventListener("click", saveSiteSettingsV86Impl);
    save.replaceWith(clone);
  }
};

const renderPageBeforeV86 = renderPage;
renderPage = function renderPageV86(key) {
  const result = renderPageBeforeV86(key);
  installStyleV86();
  return result;
};

function installStyleV86() {
  if (document.getElementById("style-v86")) return;
  const style = document.createElement("style");
  style.id = "style-v86";
  style.textContent = `
    .program-date-shortcuts-v86{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .program-date-shortcuts-v86 .small{min-height:34px;padding:0 12px}
    #sitePasswordInput{pointer-events:auto!important;user-select:auto!important}
    #siteError{grid-column:1/-1;margin:0;color:#d92d20;font-weight:700}
    .site-auto-grid .check-grid,.site-auto-grid .option-checks{position:relative;z-index:1}
    @media (max-width:700px){.attendance-date-bar{display:grid!important}.program-date-shortcuts-v86{margin-left:0}}
  `;
  document.head.append(style);
}

forceAdminStandaloneLoginOnFreshLoadV86();
store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V86;

// Final V87: require admin standalone login after browser history restore as well.
const APP_PATCH_VERSION_V87 = "v87.0 - 2026-06-19";

function requireAdminStandaloneLoginV87(reason = "navigation") {
  if (!isStandaloneAdminSiteV60()) return;
  if (typeof hasPendingExplicitAuthV80 === "function" && hasPendingExplicitAuthV80()) return;
  try { liveAuthSessionV83 = false; } catch {}
  try { clearAdminStandaloneAuthV62(); } catch {}
  try { clearBrowserAuthSessionV80(); } catch {}
  try { clearPersistedCurrentUserV80(); } catch {}
  try {
    clearSessionStateV36();
    app?.classList.add("hidden");
    loginScreen?.classList.remove("hidden");
    if (loginError) loginError.textContent = reason === "history" ? "관리자 전용창은 뒤로/앞으로 이동 후 다시 로그인해야 합니다." : "";
  } catch (error) {
    console.info("[admin standalone login guard]", error?.message || String(error));
  }
}

window.addEventListener("pageshow", (event) => {
  if (!isStandaloneAdminSiteV60()) return;
  if (event.persisted || performance.getEntriesByType?.("navigation")?.[0]?.type === "back_forward") {
    requireAdminStandaloneLoginV87("history");
  }
});

window.addEventListener("popstate", () => {
  requireAdminStandaloneLoginV87("history");
});

store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V87;

// Final V88: stricter password confirmation, cleaner program attendance,
// select-based management filters, academic calendar viewer clicks,
// school board date filtering, and timetable action deduplication.
const APP_PATCH_VERSION_V88 = "v88.0 - 2026-06-19";

function localDateStringV88(date = new Date()) {
  if (typeof localDateStringV70 === "function") return localDateStringV70(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function verifyCurrentPasswordStrictV88(passwordValue) {
  const value = String(passwordValue || "");
  if (!value || !currentUser) return false;
  if (currentUser.password && value === currentUser.password) return true;

  const authUser = typeof currentAuthUserV78 === "function" ? currentAuthUserV78() : null;
  if (window.PMAuthService?.verifyLocalPassword && authUser) {
    try {
      if (await window.PMAuthService.verifyLocalPassword(authUser, value)) {
        currentUser.password = value;
        return true;
      }
    } catch (error) {
      console.info("[password strict local check skipped]", error?.message || String(error));
    }
  }

  if (window.PMAuthService?.firebaseSignInWithEmailOnly && currentUser?.email) {
    try {
      const firebaseUser = await window.PMAuthService.firebaseSignInWithEmailOnly(currentUser.email, value);
      if (currentUser.uid && firebaseUser?.uid && firebaseUser.uid !== currentUser.uid) return false;
      currentUser.password = value;
      return true;
    } catch (error) {
      console.info("[password strict firebase check failed]", error?.code || "", error?.message || String(error));
    }
  }

  return false;
}

verifyCurrentPasswordV78 = verifyCurrentPasswordStrictV88;
sitePasswordOkV70 = verifyCurrentPasswordStrictV88;
passwordApprovalMessageV78 = function passwordApprovalMessageV88() {
  return "비밀번호가 올바르지 않습니다. 이메일/비밀번호 계정은 현재 로그인 비밀번호를 입력하세요. Google 전용 계정은 Firebase에서 비밀번호 로그인을 연결하거나 비밀번호 재설정 후 사용해야 합니다.";
};

function uniqueOptionsV88(values = [], fallback = []) {
  return [...new Set([...fallback, ...values].map((value) => String(value || "").trim()).filter(Boolean))];
}

function valuesFromRowsV88(rows, field, fallback = []) {
  return uniqueOptionsV88((rows || []).map((row) => row?.[field]), fallback);
}

function datesFromRowsV88(rows, field, includeToday = true) {
  return valuesFromRowsV88(rows, field, includeToday ? [localDateStringV88()] : []);
}

function selectNodeV88(options, value = "", placeholder = "전체") {
  const select = document.createElement("select");
  select.append(option("", placeholder));
  uniqueOptionsV88(options).forEach((item) => select.append(option(item, item)));
  select.value = value || "";
  return select;
}

function filterOptionsV88(key, field) {
  const rows = key === "notices" ? (typeof visibleNotices === "function" ? visibleNotices() : store.notices || []) : (store[key] || []);
  if (field === "date") return datesFromRowsV88(rows, "date");
  if (field === "notice_date") return datesFromRowsV88(rows, "notice_date");
  if (field === "deadline_date") return datesFromRowsV88(rows, "deadline_date", false);
  if (field === "type" && key === "schedules") return uniqueOptionsV88(valuesFromRowsV88(rows, field), defaults.scheduleTypes || []);
  if (field === "status") return valuesFromRowsV88(rows, field, ["예정", "진행 중", "진행중", "완료", "보류", "취소"]);
  if (field === "subject") return uniqueOptionsV88(valuesFromRowsV88(rows, field), ["공통", ...subjectsList()]);
  if (field === "category" && key === "projects") return valuesFromRowsV88(rows, field, ["개인 프로젝트", "팀 프로젝트", "학교 프로젝트", "동아리 프로젝트", "특강 프로젝트", "공모전", "연구/탐구", "봉사/행사", "기타"]);
  if (field === "area" && key === "projects") return valuesFromRowsV88(rows, field, ["개발", "문서/보고서", "발표", "디자인", "영상", "3D/메이커", "데이터", "학습", "운영"]);
  if (field === "priority" && key === "projects") return valuesFromRowsV88(rows, field, ["낮음", "보통", "높음", "긴급"]);
  if (field === "progress" && key === "projects") return valuesFromRowsV88(rows, field, ["구상", "진행중", "검토중", "완료", "보류"]);
  return null;
}

const filterFieldsForV7BeforeV88 = filterFieldsForV7;
filterFieldsForV7 = function filterFieldsForV88(key) {
  if (key === "schedules") return ["date", "type", "status"];
  if (key === "notices") return ["subject", "notice_date", "deadline_date"];
  if (key === "people") return ["name", "relationship", "address"];
  return filterFieldsForV7BeforeV88(key).filter((field) => !(key === "people" && field === "teacher"));
};

const fieldsForV7BeforeV88 = fieldsForV7;
fieldsForV7 = function fieldsForV88(key) {
  if (key === "schedules") {
    return [
      ["title", "제목", "text", true],
      ["date", "날짜", "date"],
      ["start_time", "시작", "time"],
      ["end_time", "종료", "time"],
      ["type", "유형", "select", defaults.scheduleTypes || []],
      ["importance", "중요도", "select", ["낮음", "보통", "높음", "매우 높음"]],
      ["status", "상태", "select", ["예정", "진행 중", "완료", "보류", "취소"]],
      ["memo", "메모", "textarea"]
    ];
  }
  if (key === "notices") {
    return [
      ["title", "제목", "text", true],
      ["source", "출처", "select", ["카카오톡", "학교", "학원", "선생님", "시스템", "기타"]],
      ["subject", "과목", "select", ["공통", ...subjectsList()]],
      ["importance", "중요도", "select", ["낮음", "보통", "높음", "매우 높음"]],
      ["notice_date", "공지일", "date"],
      ["deadline_required", "마감일 여부", "select", ["불필요", "필요"]],
      ["deadline_date", "마감일", "date"],
      ["content", "내용", "textarea"],
      ["memo", "메모", "textarea"],
      ["visibility", "공개", "select", ["일반 공개", "관리자 전용"]]
    ];
  }
  if (key === "people") return fieldsForV7BeforeV88(key).filter(([name]) => name !== "teacher");
  return fieldsForV7BeforeV88(key);
};

const fieldsForV12BeforeV88 = fieldsForV12;
fieldsForV12 = function fieldsForV12V88(key) {
  if (key === "projects") {
    return [
      ["title", "프로젝트명", "text", true],
      ["category", "카테고리", "select", ["개인 프로젝트", "팀 프로젝트", "학교 프로젝트", "동아리 프로젝트", "특강 프로젝트", "공모전", "연구/탐구", "봉사/행사", "기타"]],
      ["area", "영역", "select", ["개발", "문서/보고서", "발표", "디자인", "영상", "3D/메이커", "데이터", "학습", "운영"]],
      ["owner", "담당자", "text"],
      ["members", "팀원", "textarea"],
      ["start_date", "시작일", "date"],
      ["end_date", "마지막 날짜", "date"],
      ["priority", "우선순위", "select", ["낮음", "보통", "높음", "긴급"]],
      ["progress", "진행상태", "select", ["구상", "진행중", "검토중", "완료", "보류"]],
      ["percent", "진행률(%)", "number"],
      ["goal", "목표", "textarea"],
      ["summary", "요약", "textarea"],
      ["next_action", "다음 할 일", "textarea"],
      ["links", "자료/링크", "textarea"],
      ["memo", "메모", "textarea"]
    ];
  }
  return fieldsForV12BeforeV88(key);
};

const filterFieldsForV12BeforeV88 = filterFieldsForV12;
filterFieldsForV12 = function filterFieldsForV12V88(key) {
  if (key === "projects") return ["progress", "priority", "area", "category", "owner"];
  return filterFieldsForV12BeforeV88(key);
};

function filterControlV88(key, field) {
  const value = sessionStorage.getItem(`filter:${key}:${field}`) || "";
  const options = filterOptionsV88(key, field);
  const control = options ? selectNodeV88(options, value, `${labelFor(field)} 전체`) : document.createElement("input");
  if (!options) {
    control.placeholder = `${labelFor(field)} 검색`;
    control.value = value;
  }
  control.dataset.filter = field;
  const apply = () => sessionStorage.setItem(`filter:${key}:${field}`, control.value);
  control.addEventListener(options ? "change" : "input", apply);
  control.addEventListener("keydown", (event) => { if (event.key === "Enter") renderPage(key); });
  return makeField(labelFor(field), `${key}-${field}-filter-v88`, control);
}

filterBarV7 = function filterBarV7V88(key) {
  const bar = el("div", "toolbar compact-filter filter-bar-v88");
  filterFieldsForV7(key).forEach((field) => bar.append(filterControlV88(key, field)));
  const apply = button("검색", "ghost");
  apply.addEventListener("click", () => renderPage(key));
  const reset = button("필터 초기화", "ghost");
  reset.addEventListener("click", () => {
    filterFieldsForV7(key).forEach((field) => sessionStorage.removeItem(`filter:${key}:${field}`));
    if (globalSearch) globalSearch.value = "";
    renderPage(key);
  });
  bar.append(apply, reset);
  return bar;
};

filterBarV12 = function filterBarV12V88(key) {
  const bar = el("div", "toolbar compact-filter filter-bar-v88");
  filterFieldsForV12(key).forEach((field) => bar.append(filterControlV88(key, field)));
  const apply = button("검색", "ghost");
  apply.addEventListener("click", () => renderPage(key));
  const reset = button("필터 초기화", "ghost");
  reset.addEventListener("click", () => {
    filterFieldsForV12(key).forEach((field) => sessionStorage.removeItem(`filter:${key}:${field}`));
    if (globalSearch) globalSearch.value = "";
    renderPage(key);
  });
  bar.append(apply, reset);
  return bar;
};

const labelForBeforeV88 = labelFor;
labelFor = function labelForV88(field) {
  return {
    notice_date: "공지일",
    deadline_date: "마감일",
    deadline_required: "마감일 여부",
    progress: "진행상태",
    priority: "우선순위",
    area: "영역",
    category: "카테고리",
    date: "날짜",
    type: "유형",
    status: "상태",
    subject: "과목",
    relationship: "관계",
    address: "주소"
  }[field] || labelForBeforeV88(field);
};

function removeObjectElementTextV88(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const text = String(walker.currentNode.nodeValue || "");
    if (/\[object HTML(Button|Label)Element\]/.test(text)) targets.push(walker.currentNode);
  }
  targets.forEach((node) => node.remove());
}

function installProgramRosterEditorV88(type, program, wrap) {
  wrap.querySelectorAll(".program-roster-box,.program-roster-box-v88").forEach((node) => node.remove());
  const tableWrap = wrap.querySelector(".program-attendance-table");
  if (!tableWrap) return;
  const box = el("section", "program-roster-box-v88");
  const textarea = document.createElement("textarea");
  textarea.value = program.students || programStudentsV26(program).join("\n");
  textarea.placeholder = "학생 이름을 한 줄에 한 명씩 입력하세요.";
  const save = button("학생 명단 저장", "ghost");
  save.addEventListener("click", () => {
    program.students = textarea.value;
    setProgramDetailLockV84(type, program.id, "attendance");
    saveStore();
    showMessage("학생 명단 저장", "학생 이름을 저장했습니다.");
    renderProgramPageV26(type, program.id, "attendance");
  });
  const actions = el("div", "row-actions");
  actions.append(save);
  box.append(el("h3", "", "수강생 이름 관리"), el("p", "muted", "방과후, 동아리, 특강별 출결에 표시할 학생 이름을 수정합니다."), textarea, actions);
  tableWrap.after(box);
}

const programAttendanceBeforeV88 = programAttendanceV26;
programAttendanceV26 = function programAttendanceV88(type, program) {
  const wrap = programAttendanceBeforeV88(type, program);
  removeObjectElementTextV88(wrap);
  installProgramRosterEditorV88(type, program, wrap);
  const shortcutButtons = wrap.querySelectorAll(".program-date-shortcuts-v86 button");
  ["어제", "오늘", "다음날"].forEach((label, index) => {
    if (shortcutButtons[index]) shortcutButtons[index].textContent = label;
  });
  return wrap;
};

function showAcademicRowV88(row) {
  if (typeof showViewerV5 === "function") return showViewerV5("학사일정", row);
  showMessage(row.title || "학사일정", row.content || row.memo || row.source || "");
}

if (typeof academicCalendarV69 === "function") {
  academicCalendarV69 = function academicCalendarV88(rows, year, month) {
    const byDate = new Map();
    rows.forEach((row) => {
      const date = String(row.date || "");
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(row);
    });
    const wrap = el("div", "academic-calendar-v69 academic-calendar-v88");
    ["일", "월", "화", "수", "목", "금", "토"].forEach((day) => wrap.append(el("div", "academic-calendar-head-v69", day)));
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    for (let i = 0; i < firstDay.getDay(); i += 1) wrap.append(el("div", "academic-calendar-cell-v69 academic-calendar-empty-v69", ""));
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = localDateStringV88(new Date(year, month - 1, day));
      const cell = el("div", "academic-calendar-cell-v69");
      cell.append(el("strong", "", String(day)));
      const items = byDate.get(date) || [];
      if (!items.length) {
        cell.append(el("span", "muted", "-"));
      } else {
        items.slice(0, 4).forEach((row) => {
          const item = button(row.title || row.memo || "일정", "academic-calendar-event-v88");
          item.title = [row.title, row.content, row.memo, row.source].filter(Boolean).join("\n");
          item.addEventListener("click", () => showAcademicRowV88(row));
          cell.append(item);
        });
        if (items.length > 4) cell.append(el("small", "muted", `+${items.length - 4}개`));
      }
      wrap.append(cell);
    }
    return wrap;
  };
}

function schoolBoardDateFilterStateV88(key) {
  return {
    mode: sessionStorage.getItem(`${key}:dateMode:v88`) || "all",
    date: sessionStorage.getItem(`${key}:date:v88`) || localDateStringV88(),
    month: sessionStorage.getItem(`${key}:month:v88`) || localDateStringV88().slice(0, 7)
  };
}

function rowMatchesSchoolDateV88(rowDate, state) {
  if (state.mode === "today") return rowDate === localDateStringV88();
  if (state.mode === "date") return rowDate === state.date;
  if (state.mode === "month") return String(rowDate || "").startsWith(state.month);
  return true;
}

function enhanceSchoolBoardDateFilterV88(context) {
  const key = context === "homeLetters" ? "homeLetters" : "schoolNotices";
  const table = content.querySelector(".school-board-table-v66 table");
  if (!table || content.querySelector(".school-date-filter-v88")) return;
  const state = schoolBoardDateFilterStateV88(key);
  const toolbar = el("div", "toolbar school-date-filter-v88");
  const mode = selectNodeV88(["전체", "오늘", "날짜", "월"], "", "날짜 필터");
  mode.value = ({ all: "전체", today: "오늘", date: "날짜", month: "월" }[state.mode] || "전체");
  const date = document.createElement("input");
  date.type = "date";
  date.value = state.date;
  const month = document.createElement("input");
  month.type = "month";
  month.value = state.month;
  const saveAndRender = () => {
    const modeMap = { "전체": "all", "오늘": "today", "날짜": "date", "월": "month" };
    sessionStorage.setItem(`${key}:dateMode:v88`, modeMap[mode.value] || "all");
    sessionStorage.setItem(`${key}:date:v88`, date.value || localDateStringV88());
    sessionStorage.setItem(`${key}:month:v88`, month.value || localDateStringV88().slice(0, 7));
    renderSchoolBoardV66(context);
  };
  mode.addEventListener("change", saveAndRender);
  date.addEventListener("change", saveAndRender);
  month.addEventListener("change", saveAndRender);
  const reset = button("날짜 필터 초기화", "ghost");
  reset.addEventListener("click", () => {
    sessionStorage.removeItem(`${key}:dateMode:v88`);
    sessionStorage.removeItem(`${key}:date:v88`);
    sessionStorage.removeItem(`${key}:month:v88`);
    renderSchoolBoardV66(context);
  });
  toolbar.append(makeField("필터", `${key}DateModeV88`, mode), makeField("날짜", `${key}DateV88`, date), makeField("월", `${key}MonthV88`, month), reset);
  table.closest(".school-board-table-v66")?.before(toolbar);
  const nextState = schoolBoardDateFilterStateV88(key);
  table.querySelectorAll("tbody tr").forEach((tr) => {
    const rowDate = tr.children[0]?.textContent?.trim() || "";
    tr.style.display = rowMatchesSchoolDateV88(rowDate, nextState) ? "" : "none";
  });
}

const renderSchoolBoardBeforeV88 = renderSchoolBoardV66;
renderSchoolBoardV66 = function renderSchoolBoardV88(context) {
  renderSchoolBoardBeforeV88(context);
  enhanceSchoolBoardDateFilterV88(context);
};

function cleanupTimetableButtonsV88() {
  const actions = content.querySelector('.content[data-page="timetable"] .panel > .panel-head .row-actions');
  if (actions) {
    const seen = new Set();
    [...actions.querySelectorAll("button")].forEach((btn) => {
      const text = btn.textContent.replace(/\s+/g, " ").trim();
      if (/신규\s*교시|교시\s*일괄|교시\s*전체/.test(text) || seen.has(text)) {
        btn.remove();
        return;
      }
      seen.add(text);
    });
  }
  content.querySelectorAll(".modern-period-editor .row-actions").forEach((group) => {
    const seen = new Set();
    [...group.querySelectorAll("button")].forEach((btn) => {
      const text = btn.textContent.replace(/\s+/g, " ").trim();
      if (seen.has(text)) btn.remove();
      else seen.add(text);
    });
  });
}

const renderTimetableBeforeV88 = renderTimetableV29;
renderTimetableV29 = function renderTimetableV88() {
  const result = renderTimetableBeforeV88();
  cleanupTimetableButtonsV88();
  installStyleV88();
  return result;
};

function installStyleV88() {
  if (document.getElementById("style-v88")) return;
  const style = document.createElement("style");
  style.id = "style-v88";
  style.textContent = `
    .filter-bar-v88 label{min-width:150px}
    .filter-bar-v88 select,.filter-bar-v88 input{width:100%;min-width:0}
    .program-roster-box-v88{margin-top:16px;border:1px solid #d9e4f4;border-radius:14px;background:#f8fbff;padding:16px;display:grid;gap:10px}
    .program-roster-box-v88 h3{margin:0;font-size:16px}
    .program-roster-box-v88 textarea{min-height:120px}
    .academic-calendar-event-v88{display:block;width:100%;min-height:28px;margin-top:4px;padding:4px 6px;border:1px solid #d9e4f4;border-radius:8px;background:#fff;color:#10213f;text-align:left;font-size:12px;box-shadow:none}
    .academic-calendar-event-v88:hover{border-color:#1d5cff;color:#1d5cff}
    .school-date-filter-v88{margin:12px 0}
    .school-date-filter-v88 label{min-width:140px}
    @media (max-width:720px){.filter-bar-v88,.school-date-filter-v88{grid-template-columns:1fr!important}.filter-bar-v88 label,.school-date-filter-v88 label{min-width:0}}
  `;
  document.head.append(style);
}

const renderPageBeforeV88 = renderPage;
renderPage = function renderPageV88(key) {
  const result = renderPageBeforeV88(key);
  installStyleV88();
  if (key === "timetable") cleanupTimetableButtonsV88();
  return result;
};

installStyleV88();
store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V88;

// Final V89: split Google re-auth from site-settings password saves,
// remove teacher as a people relationship, and refresh school boards without cache.
const APP_PATCH_VERSION_V89 = "v89.0 - 2026-06-20";

async function currentFirebaseProviderIdsV89() {
  try {
    const runtime = await window.PMFirebaseRuntime?.init?.();
    const firebaseUser = runtime?.auth?.currentUser;
    const currentUid = currentUser?.uid || currentUser?.id || "";
    if (!firebaseUser || !currentUid || firebaseUser.uid !== currentUid) return [];
    return (firebaseUser.providerData || []).map((provider) => provider?.providerId).filter(Boolean);
  } catch {
    return [];
  }
}

async function canUseGoogleReauthV89() {
  const providers = await currentFirebaseProviderIdsV89();
  return providers.includes("google.com");
}

async function verifyCurrentPasswordForEditV89(passwordValue) {
  if (await verifyCurrentPasswordStrictV88(passwordValue)) return true;
  if (await canUseGoogleReauthV89()) return googleReauthForPasswordApprovalV79();
  return false;
}

verifyCurrentPasswordV78 = verifyCurrentPasswordForEditV89;
sitePasswordOkV70 = verifyCurrentPasswordStrictV88;
passwordApprovalMessageV78 = function passwordApprovalMessageV89() {
  return "비밀번호가 올바르지 않습니다. 이메일/비밀번호 계정은 현재 로그인 비밀번호를 입력하세요. Google 계정은 비밀번호를 앱에서 직접 확인할 수 없어 Google 재인증 창으로 확인합니다.";
};

const requirePasswordBeforeV89 = requirePassword;
requirePassword = function requirePasswordV89(action) {
  requirePasswordBeforeV89(action);
  const input = document.getElementById("confirmPasswordInput");
  const error = document.getElementById("passwordError");
  if (input) {
    input.required = false;
    input.placeholder = "이메일 계정: 현재 비밀번호 / Google 계정: 확인 시 Google 재인증";
  }
  if (error) error.textContent = "";
};

function ensureEditorAllowsGoogleReauthV89() {
  if (editorForm) editorForm.noValidate = true;
  editorFields?.querySelectorAll('[name="_confirm_password"]').forEach((input) => {
    input.required = false;
    input.placeholder = "이메일 계정: 현재 비밀번호 / Google 계정: Google 재인증";
  });
}

const openEditorV7BeforeV89 = openEditorV7;
openEditorV7 = function openEditorV7V89(...args) {
  const result = openEditorV7BeforeV89(...args);
  ensureEditorAllowsGoogleReauthV89();
  return result;
};

const openEditorV12BeforeV89 = openEditorV12;
openEditorV12 = function openEditorV12V89(...args) {
  const result = openEditorV12BeforeV89(...args);
  ensureEditorAllowsGoogleReauthV89();
  return result;
};

function peopleRelationshipOptionsV89() {
  return ["친구", "가족", "지인", "동아리", "학교", "학원", "기타"];
}

const fieldsForV7BeforeV89 = fieldsForV7;
fieldsForV7 = function fieldsForV89(key) {
  if (key === "people") {
    return [
      ["name", "이름", "text", true],
      ["birthday", "생일", "date"],
      ["phone", "연락처", "text"],
      ["email", "이메일", "email"],
      ["address", "주소", "text"],
      ["organization", "학교/반/소속", "text"],
      ["relationship", "관계", "select", peopleRelationshipOptionsV89()],
      ["memo", "메모", "textarea"],
      ["private_memo", "비공개 메모", "textarea"]
    ];
  }
  return fieldsForV7BeforeV89(key);
};

const filterFieldsForV7BeforeV89 = filterFieldsForV7;
filterFieldsForV7 = function filterFieldsForV89(key) {
  if (key === "people") return ["name", "relationship", "address", "organization"];
  return filterFieldsForV7BeforeV89(key);
};

const filterOptionsV88BeforeV89 = filterOptionsV88;
filterOptionsV88 = function filterOptionsV89(key, field) {
  if (key === "people" && field === "relationship") {
    return uniqueOptionsV88((store.people || []).map((row) => row.relationship).filter((value) => value !== "선생님"), peopleRelationshipOptionsV89());
  }
  if (key === "people" && ["name", "address", "organization"].includes(field)) {
    return valuesFromRowsV88(store.people || [], field);
  }
  return filterOptionsV88BeforeV89(key, field);
};

function normalizePeopleRelationshipsV89() {
  (store.people || []).forEach((row) => {
    if (row.relationship === "선생님") row.relationship = "지인";
  });
}

async function refreshSchoolBoardNowV89(context, { silent = false } = {}) {
  const key = context === "homeLetters" ? "homeLetters" : "schoolNotices";
  const label = context === "homeLetters" ? "가정통신문" : "학교공지";
  try {
    const rows = await window.PMSchoolIntegrationService.fetchBoard(schoolBoardUrlV66(context), `동아고 ${label}`);
    const added = mergeSchoolRowsV64(key, rows);
    store.settings ??= {};
    store.settings[`${key}LastSyncAtV89`] = new Date().toISOString();
    saveStore();
    if (!silent) showMessage("가져오기 완료", `${label} ${rows.length}개 확인, 새 항목 ${added}개 저장`);
    if (added && currentPage === context) renderSchoolBoardV66(context);
    return { rows, added };
  } catch (error) {
    console.info(`[school-board-refresh-v89:${context}]`, error?.message || String(error));
    if (!silent) showMessage("가져오기 실패", error?.message || String(error));
    return { rows: [], added: 0, error };
  }
}

fetchSchoolBoardV66 = function fetchSchoolBoardV89(context) {
  return refreshSchoolBoardNowV89(context, { silent: false });
};

function maybeAutoRefreshSchoolBoardV89(context) {
  if (!window.PMSchoolIntegrationService?.fetchBoard) return;
  const key = context === "homeLetters" ? "homeLetters" : "schoolNotices";
  const sessionKey = `school-board-auto-v89:${key}`;
  const last = Number(sessionStorage.getItem(sessionKey) || 0);
  if (Date.now() - last < 60 * 1000) return;
  sessionStorage.setItem(sessionKey, String(Date.now()));
  setTimeout(() => {
    if (currentPage === context) refreshSchoolBoardNowV89(context, { silent: true });
  }, 250);
}

const renderSchoolBoardBeforeV89 = renderSchoolBoardV66;
renderSchoolBoardV66 = function renderSchoolBoardV89(context) {
  normalizePeopleRelationshipsV89();
  renderSchoolBoardBeforeV89(context);
  maybeAutoRefreshSchoolBoardV89(context);
};

const renderPageBeforeV89 = renderPage;
renderPage = function renderPageV89(key) {
  normalizePeopleRelationshipsV89();
  const result = renderPageBeforeV89(key);
  if (key === "people") saveStore();
  return result;
};

normalizePeopleRelationshipsV89();
store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V89;

// Final V90: current-day defaults, Google-aware site settings approval,
// and friend-only choices for friend award records.
const APP_PATCH_VERSION_V90 = "v90.0 - 2026-06-20";

function appTodayValueV90(date = new Date()) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 10);
}

const defaultValueBeforeV90 = defaultValue;
defaultValue = function defaultValueV90(name, type) {
  const fieldName = String(name || "").toLowerCase();
  if (type === "date" || fieldName.includes("date") || fieldName.includes("day")) return appTodayValueV90();
  return defaultValueBeforeV90(name, type);
};

const inputNodeV4BeforeV90 = inputNodeV4;
inputNodeV4 = function inputNodeV4V90(name, label, type, requiredOrOptions, value) {
  const field = inputNodeV4BeforeV90(name, label, type, requiredOrOptions, value);
  if (!value && type === "date") {
    const input = field.querySelector?.(`input[name="${name}"]`);
    if (input) input.value = appTodayValueV90();
  }
  return field;
};

async function verifySiteSettingsApprovalV90(passwordValue) {
  if (await verifyCurrentPasswordStrictV88(passwordValue)) return true;
  if (await canUseGoogleReauthV89()) return googleReauthForPasswordApprovalV79();
  return false;
}

sitePasswordOkV70 = verifySiteSettingsApprovalV90;

const ensureSitePasswordInputBeforeV90 = ensureSitePasswordInputV86;
ensureSitePasswordInputV86 = function ensureSitePasswordInputV90() {
  const input = ensureSitePasswordInputBeforeV90();
  if (input) {
    input.required = false;
    input.placeholder = "이메일 계정: 현재 비밀번호 / Google 계정: Google 재인증";
  }
  return input;
};

const saveSiteSettingsBeforeV90 = saveSiteSettingsV86Impl;
saveSiteSettingsV86Impl = async function saveSiteSettingsV90() {
  const input = document.getElementById("sitePasswordInput");
  if (input) {
    input.required = false;
    input.placeholder = "이메일 계정: 현재 비밀번호 / Google 계정: Google 재인증";
    if (!input.value && await canUseGoogleReauthV89()) input.value = "__google_reauth__";
  }
  return saveSiteSettingsBeforeV90();
};
saveSiteSettingsV2 = saveSiteSettingsV86Impl;

function friendPeopleNamesV90() {
  return [...new Set((store.people || [])
    .filter((person) => person?.relationship === "친구")
    .map((person) => person.name)
    .filter(Boolean))];
}

const fieldsForV7BeforeV90 = fieldsForV7;
fieldsForV7 = function fieldsForV90(key) {
  if (key === "friendAwards") {
    return [
      ["person", "친구", "select", ["", ...friendPeopleNamesV90()]],
      ["date", "날짜", "date"],
      ["type", "유형", "select", ["상점", "벌점", "칭찬", "주의", "기타"]],
      ["points", "점수", "select", ["1", "2", "3", "4", "5", "10"]],
      ["reason", "사유", "textarea"],
      ["memo", "관리자 메모", "textarea"]
    ];
  }
  return fieldsForV7BeforeV90(key);
};

function normalizeFriendAwardsV90() {
  const friendSet = new Set(friendPeopleNamesV90());
  (store.friendAwards || []).forEach((row) => {
    if (row?.person && !friendSet.has(row.person)) row._relationshipWarning = "친구 관계가 아닌 인물입니다.";
  });
}

const renderPageBeforeV90 = renderPage;
renderPage = function renderPageV90(key) {
  normalizeFriendAwardsV90();
  const result = renderPageBeforeV90(key);
  if (key === "site") ensureSitePasswordInputV86();
  return result;
};

store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V90;

// Final V91: keep friend-award data intact, but only show records for people
// currently classified as friends.
const APP_PATCH_VERSION_V91 = "v91.0 - 2026-06-20";

function visibleFriendAwardsV91() {
  const friendSet = new Set(friendPeopleNamesV90());
  return (store.friendAwards || []).filter((row) => !row?.person || friendSet.has(row.person));
}

const renderPageBeforeV91 = renderPage;
renderPage = function renderPageV91(key) {
  if (key !== "friendAwards") return renderPageBeforeV91(key);
  const originalRows = store.friendAwards || [];
  store.friendAwards = visibleFriendAwardsV91();
  try {
    return renderPageBeforeV91(key);
  } finally {
    store.friendAwards = originalRows;
  }
};

store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V91;

// Final V92: Firestore-backed administrator inquiry/chat system and runtime error logging.
const APP_PATCH_VERSION_V92 = "v92.0 - 2026-07-07";
let chatThreadsV92 = [];
let chatMessagesV92 = [];
let chatSelectedThreadIdV92 = "";
let chatThreadsUnsubscribeV92 = null;
let chatMessagesUnsubscribeV92 = null;
let chatRenderTimerV92 = null;
let chatLastErrorV92 = "";

function isChatManagerV92(user = currentUser) {
  return window.PMChatService?.canManage?.(user) || ["system_owner", "super_manager", "manager"].includes(effectiveMenuRoleV59(user));
}

function chatRoleV92(user = currentUser) {
  return window.PMChatService?.roleOf?.(user) || effectiveMenuRoleV59(user) || user?.role || "normal";
}

function chatWorkspaceIdV92(user = currentUser) {
  return window.PMChatService?.workspaceIdOf?.(user) || userWorkspaceIdV54(user);
}

function chatCanUseV92(user = currentUser) {
  return !!window.PMChatService?.canUseChat?.(user);
}

function chatStatusLabelV92(status) {
  return { new: "새 문의", in_progress: "처리 중", completed: "완료" }[status || "new"] || status || "새 문의";
}

function chatTypeLabelV92(type) {
  return type === "admin" ? "관리자 간 대화" : "사용자 문의/지원 티켓";
}

function chatTimeV92(value) {
  const millis = typeof value?.toMillis === "function" ? value.toMillis() : value?.seconds ? value.seconds * 1000 : Date.parse(value || "");
  return Number.isFinite(millis) ? new Date(millis).toLocaleString() : "";
}

function latestRuntimeLogV92() {
  return window.PMChatService?.latestErrorLog?.() || null;
}

function scheduleChatRenderV92() {
  clearTimeout(chatRenderTimerV92);
  chatRenderTimerV92 = setTimeout(() => {
    if (currentPage === "chat") renderChatConsoleV92();
  }, 40);
}

function resetChatSubscriptionsV92() {
  chatThreadsUnsubscribeV92?.();
  chatMessagesUnsubscribeV92?.();
  chatThreadsUnsubscribeV92 = null;
  chatMessagesUnsubscribeV92 = null;
}

function ensureChatThreadSubscriptionV92() {
  if (!currentUser || chatThreadsUnsubscribeV92 || !window.PMChatService) return;
  chatThreadsUnsubscribeV92 = window.PMChatService.subscribeThreads(currentUser, (rows) => {
    chatThreadsV92 = rows || [];
    if (!chatSelectedThreadIdV92 && chatThreadsV92.length) chatSelectedThreadIdV92 = chatThreadsV92[0].id || chatThreadsV92[0].threadId;
    if (chatSelectedThreadIdV92) ensureChatMessageSubscriptionV92(chatSelectedThreadIdV92);
    chatLastErrorV92 = "";
    scheduleChatRenderV92();
  }, (error) => {
    chatLastErrorV92 = "정상적으로 연결되지 않았습니다";
    window.PMChatService?.saveErrorLog?.(error, { source: "chat:thread-ui" }, currentUser);
    scheduleChatRenderV92();
  });
}

function ensureChatMessageSubscriptionV92(threadId) {
  if (!threadId || chatMessagesUnsubscribeV92?.threadId === threadId || !window.PMChatService) return;
  chatMessagesUnsubscribeV92?.();
  const unsubscribe = window.PMChatService.subscribeMessages(threadId, currentUser, (rows) => {
    chatMessagesV92 = rows || [];
    chatLastErrorV92 = "";
    scheduleChatRenderV92();
    window.PMChatService?.markRead?.(threadId, currentUser).catch((error) => {
      window.PMChatService?.saveErrorLog?.(error, { source: "chat:markRead", threadId }, currentUser);
    });
  }, (error) => {
    chatLastErrorV92 = "정상적으로 연결되지 않았습니다";
    window.PMChatService?.saveErrorLog?.(error, { source: "chat:message-ui", threadId }, currentUser);
    scheduleChatRenderV92();
  });
  unsubscribe.threadId = threadId;
  chatMessagesUnsubscribeV92 = unsubscribe;
}

function chatThreadUnreadV92(thread) {
  const uid = window.PMChatService?.uidOf?.(currentUser) || currentUser?.uid || currentUser?.id || "";
  const readAt = thread?.readBy?.[uid];
  const lastAuthor = thread?.lastMessageAuthorUid || "";
  if (lastAuthor && lastAuthor === uid) return false;
  if (!readAt && thread?.lastMessageText) return true;
  const readMs = typeof readAt?.toMillis === "function" ? readAt.toMillis() : readAt?.seconds ? readAt.seconds * 1000 : Date.parse(readAt || "");
  const lastMs = typeof thread?.lastMessageAt?.toMillis === "function" ? thread.lastMessageAt.toMillis() : thread?.lastMessageAt?.seconds ? thread.lastMessageAt.seconds * 1000 : Date.parse(thread?.lastMessageAt || thread?.updatedAt || "");
  return Number.isFinite(lastMs) && (!Number.isFinite(readMs) || lastMs > readMs);
}

function chatThreadButtonV92(thread) {
  const id = thread.id || thread.threadId;
  const btn = button("", `chat-thread-item-v92 ${id === chatSelectedThreadIdV92 ? "active" : ""}`);
  btn.dataset.threadId = id;
  btn.innerHTML = `
    <span><b>${escapeHtml(thread.title || chatTypeLabelV92(thread.type))}</b><small>${escapeHtml(chatTypeLabelV92(thread.type))}</small></span>
    <span class="chat-status-v92 ${escapeHtml(thread.status || "new")}">${escapeHtml(chatStatusLabelV92(thread.status))}</span>
    <small>${escapeHtml(thread.lastMessageText || "아직 메시지가 없습니다.")}</small>
    <em>${chatThreadUnreadV92(thread) ? "안읽음" : "읽음"}</em>
  `;
  btn.addEventListener("click", () => {
    chatSelectedThreadIdV92 = id;
    chatMessagesV92 = [];
    window.history.pushState({}, "", `/chat/thread/${encodeURIComponent(id)}?source=${encodeURIComponent(chatSourceV92())}`);
    ensureChatMessageSubscriptionV92(id);
    renderChatConsoleV92();
  });
  return btn;
}

function chatMessageNodeV92(message) {
  const mine = (message.authorUid || "") === (window.PMChatService?.uidOf?.(currentUser) || currentUser?.uid || currentUser?.id || "");
  const item = el("article", `chat-message-v92 ${mine ? "mine" : ""}`, "");
  const meta = [
    message.authorRole || "",
    message.authorUid || "",
    chatTimeV92(message.createdAt),
    message.logId ? `logId: ${message.logId}` : ""
  ].filter(Boolean).join(" · ");
  item.innerHTML = `<p>${escapeHtml(message.text || "")}</p><small>${escapeHtml(meta)}</small>`;
  return item;
}

async function createChatThreadFromFormV92(type, title, text, attachLatestLog) {
  try {
    const latestLog = attachLatestLog ? latestRuntimeLogV92() : null;
    const context = typeof chatContextV92 === "function" ? chatContextV92() : {};
    const threadId = await window.PMChatService.createThread(currentUser, {
      type,
      title: title || (type === "admin" ? "관리자 간 대화" : "관리자에게 문의"),
      initialMessage: text || (latestLog ? `오류 로그를 첨부합니다: ${latestLog.message}` : "문의합니다."),
      logId: latestLog?.logId || context.relatedLogId || null,
      source: context.source || "main",
      context,
      attachments: latestLog?.logId ? [{ type: "log", logId: latestLog.logId }] : []
    });
    chatSelectedThreadIdV92 = threadId;
    window.history.pushState({}, "", `/chat/thread/${encodeURIComponent(threadId)}?source=${encodeURIComponent(context.source || "main")}`);
    showMessage("문의 등록", "채팅이 등록되었습니다.");
    renderChatConsoleV92();
  } catch (error) {
    chatLastErrorV92 = "정상적으로 연결되지 않았습니다";
    await window.PMChatService?.saveErrorLog?.(error, { source: "chat:createThread" }, currentUser);
    showMessage("정상적으로 연결되지 않았습니다", error?.message || String(error));
    renderChatConsoleV92();
  }
}

async function sendChatMessageV92(threadId, text, attachLatestLog) {
  try {
    const latestLog = attachLatestLog ? latestRuntimeLogV92() : null;
    const context = typeof chatContextV92 === "function" ? chatContextV92() : {};
    await window.PMChatService.sendMessage(threadId, currentUser, text, {
      logId: latestLog?.logId || context.relatedLogId || null,
      source: context.source || "main",
      attachments: latestLog?.logId ? [{ type: "log", logId: latestLog.logId }] : []
    });
    const replyInput = document.getElementById("chatReplyInputV92");
    if (replyInput) replyInput.value = "";
  } catch (error) {
    chatLastErrorV92 = "정상적으로 연결되지 않았습니다";
    await window.PMChatService?.saveErrorLog?.(error, { source: "chat:sendMessage", threadId }, currentUser);
    showMessage("정상적으로 연결되지 않았습니다", error?.message || String(error));
    renderChatConsoleV92();
  }
}

function renderChatComposerV92() {
  const box = el("section", "panel chat-compose-v92", "");
  const isManager = isChatManagerV92();
  box.innerHTML = `
    <div class="panel-head"><div><h3>${isManager ? "새 대화 만들기" : "관리자에게 문의"}</h3><p class="muted">${escapeHtml(chatWorkspaceIdV92())} · ${escapeHtml(chatRoleV92())}</p></div></div>
    <div class="form-grid">
      <label>유형<select id="chatTypeInputV92">${isManager ? `<option value="admin">관리자 간 대화</option>` : ""}<option value="support">사용자 문의/지원 티켓</option></select></label>
      <label>제목<input id="chatTitleInputV92" placeholder="문의 제목" /></label>
      <label class="wide">내용<textarea id="chatBodyInputV92" rows="3" placeholder="문의 내용을 입력하세요."></textarea></label>
      <label class="checkbox-row-v92"><input id="chatAttachLogInputV92" type="checkbox" /> 최근 오류 로그 첨부</label>
    </div>
    <div class="toolbar"><button id="chatCreateBtnV92" type="button">등록</button></div>
  `;
  box.querySelector("#chatCreateBtnV92").addEventListener("click", () => {
    createChatThreadFromFormV92(
      box.querySelector("#chatTypeInputV92").value,
      box.querySelector("#chatTitleInputV92").value.trim(),
      box.querySelector("#chatBodyInputV92").value.trim(),
      box.querySelector("#chatAttachLogInputV92").checked
    );
  });
  return box;
}

function renderChatConsoleV92() {
  if (!content) return;
  if (!window.PMChatService) {
    content.replaceChildren(el("div", "restricted", "채팅 서비스가 로드되지 않았습니다."));
    return;
  }
  if (!chatCanUseV92()) {
    content.replaceChildren(el("div", "restricted", "문의/채팅 권한 또는 workspace 연결이 필요합니다."));
    return;
  }
  ensureChatThreadSubscriptionV92();
  const routeThreadId = typeof chatRouteThreadIdV92 === "function" ? chatRouteThreadIdV92() : "";
  if (routeThreadId && chatSelectedThreadIdV92 !== routeThreadId) {
    chatSelectedThreadIdV92 = routeThreadId;
    chatMessagesV92 = [];
  }
  const selected = chatThreadsV92.find((thread) => (thread.id || thread.threadId) === chatSelectedThreadIdV92) || chatThreadsV92[0] || null;
  if (selected) {
    chatSelectedThreadIdV92 = selected.id || selected.threadId;
    ensureChatMessageSubscriptionV92(chatSelectedThreadIdV92);
  }
  const shell = el("div", "chat-shell-v92", "");
  const list = el("section", "panel chat-list-v92", "");
  list.innerHTML = `<div class="panel-head"><div><h3>문의/채팅 목록</h3><p class="muted">새 문의, 처리 중, 완료 상태와 읽음 여부를 확인합니다.</p></div></div>`;
  const listBody = el("div", "chat-thread-list-v92", "");
  if (chatThreadsV92.length) chatThreadsV92.forEach((thread) => listBody.append(chatThreadButtonV92(thread)));
  else listBody.append(el("p", "muted", "아직 표시할 대화가 없습니다."));
  list.append(listBody);

  const detail = el("section", "panel chat-detail-v92", "");
  if (selected) {
    const threadId = selected.id || selected.threadId;
    detail.innerHTML = `
      <div class="panel-head">
        <div><h3>${escapeHtml(selected.title || chatTypeLabelV92(selected.type))}</h3><p class="muted">${escapeHtml(chatTypeLabelV92(selected.type))} · ${escapeHtml(chatStatusLabelV92(selected.status))} · ${escapeHtml(selected.workspaceId || "")}</p></div>
      </div>
      ${chatLastErrorV92 ? `<p class="error">${escapeHtml(chatLastErrorV92)}</p>` : ""}
    `;
    if (isChatManagerV92()) {
      const status = el("div", "toolbar chat-status-toolbar-v92", "");
      ["new", "processing", "answered", "closed", "hold"].forEach((value) => {
        const btn = button(chatStatusLabelV92(value), selected.status === value ? "" : "ghost");
        btn.addEventListener("click", async () => {
          try { await window.PMChatService.updateStatus(threadId, currentUser, value); }
          catch (error) { showMessage("상태 변경 실패", error?.message || String(error)); }
        });
        status.append(btn);
      });
      detail.append(status);
    }
    const messages = el("div", "chat-messages-v92", "");
    if (chatMessagesV92.length) chatMessagesV92.forEach((message) => messages.append(chatMessageNodeV92(message)));
    else messages.append(el("p", "muted", "메시지를 불러오는 중이거나 아직 메시지가 없습니다."));
    const reply = el("div", "chat-reply-v92", "");
    reply.innerHTML = `
      <textarea id="chatReplyInputV92" rows="3" placeholder="답변 또는 추가 문의를 입력하세요."></textarea>
      <label class="checkbox-row-v92"><input id="chatReplyAttachLogV92" type="checkbox" /> 최근 오류 로그 첨부</label>
      <button id="chatReplyBtnV92" type="button">전송</button>
    `;
    reply.querySelector("#chatReplyBtnV92").addEventListener("click", () => {
      sendChatMessageV92(threadId, reply.querySelector("#chatReplyInputV92").value, reply.querySelector("#chatReplyAttachLogV92").checked);
    });
    detail.append(messages, reply);
  } else {
    detail.append(el("div", "empty-state", "왼쪽에서 대화를 선택하거나 새 문의를 등록하세요."));
  }
  shell.append(list, detail);
  content.replaceChildren(renderChatComposerV92(), shell);
}

function syncSupportButtonV92() {
  const topActions = document.getElementById("topActions") || document.querySelector(".top-actions");
  let btn = document.getElementById("supportContactBtnV92");
  if (!topActions || !currentUser) {
    btn?.remove();
    return;
  }
  const shouldShow = chatCanUseV92(currentUser) && !isChatManagerV92(currentUser);
  if (!shouldShow) {
    btn?.remove();
    return;
  }
  if (!btn) {
    btn = button("관리자에게 문의", "ghost");
    btn.id = "supportContactBtnV92";
    btn.addEventListener("click", () => navigateChatV92("/chat/new?source=main"));
    const logout = document.getElementById("logoutBtn");
    topActions.insertBefore(btn, logout && logout.parentElement === topActions ? logout : topActions.firstChild);
  }
}

const ensureSystemOwnerPatchBeforeV92 = ensureSystemOwnerPatchV54;
ensureSystemOwnerPatchV54 = function ensureSystemOwnerPatchV92() {
  ensureSystemOwnerPatchBeforeV92();
  pageMeta.chat = ["💬", "문의/채팅 관리"];
  authStateV31.permissions.chat = {
    view: ["system_owner", "super_manager", "manager", "normal", "viewer", "print_account", "teacher"],
    create: ["system_owner", "super_manager", "manager", "normal", "viewer", "print_account", "teacher"],
    edit: ["system_owner", "super_manager", "manager", "normal", "viewer", "print_account", "teacher"],
    del: ["system_owner"]
  };
};

const defaultRoleMenusBeforeV92 = defaultRoleMenusV31;
defaultRoleMenusV31 = function defaultRoleMenusV92() {
  const menus = defaultRoleMenusBeforeV92();
  ["system_owner", "super_manager", "manager", "normal", "viewer", "print_account", "teacher"].forEach((role) => {
    menus[role] = [...new Set([...(menus[role] || []), "chat"])];
  });
  return menus;
};

const navGroupsBeforeV92 = navGroupsV28;
navGroupsV28 = function navGroupsV92() {
  const groups = navGroupsBeforeV92();
  const available = new Set(navKeys());
  if (!available.has("chat")) return groups;
  const adminGroup = groups.find((group) => group.id === "admin");
  if (adminGroup && isChatManagerV92()) {
    adminGroup.keys = [...new Set(["chat", ...adminGroup.keys])];
    return groups;
  }
  return [{ id: "support", label: "문의", keys: ["chat"] }, ...groups];
};

const renderPageBeforeV92 = renderPage;
renderPage = function renderPageV92(key) {
  ensureSystemOwnerPatchV54();
  if (key === "chat") {
    currentPage = "chat";
    if (content) content.dataset.page = "chat";
    document.body.dataset.pmPage = "chat";
    if (nav && !nav.children.length) buildNav();
    updateGreeting();
    syncSupportButtonV92();
    document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === "chat"));
    document.querySelector(".sidebar")?.classList.remove("open");
    pageTitle.textContent = pageLabel("chat");
    renderChatConsoleV92();
    appendVersionInfoV16();
    return;
  }
  const result = renderPageBeforeV92(key);
  syncSupportButtonV92();
  return result;
};

const completeLoginBeforeV92 = completeLoginV34;
completeLoginV34 = function completeLoginV92(user) {
  resetChatSubscriptionsV92();
  chatThreadsV92 = [];
  chatMessagesV92 = [];
  chatSelectedThreadIdV92 = "";
  const result = completeLoginBeforeV92(user);
  setTimeout(() => {
    syncSupportButtonV92();
    if (window.location.pathname.startsWith("/chat")) renderPage("chat");
  }, 0);
  return result;
};

const logoutBeforeV92 = logout;
logout = function logoutV92() {
  resetChatSubscriptionsV92();
  return logoutBeforeV92();
};

chatStatusLabelV92 = function chatStatusLabelV92Common(status) {
  return { new: "새 문의", processing: "처리 중", answered: "답변 완료", closed: "종료", hold: "보류" }[status || "new"] || status || "새 문의";
};

function chatSourceV92() {
  return new URLSearchParams(window.location.search).get("source") || "main";
}

function chatRouteThreadIdV92() {
  const match = window.location.pathname.match(/\/chat\/thread\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function chatRouteModeV92() {
  if (window.location.pathname === "/chat/new") return "new";
  if (chatRouteThreadIdV92()) return "thread";
  return "list";
}

function chatContextV92() {
  const latestLog = latestRuntimeLogV92();
  return {
    source: chatSourceV92(),
    currentPage: currentPage || "",
    route: window.location.pathname + window.location.search,
    role: chatRoleV92(),
    workspaceId: chatWorkspaceIdV92(),
    relatedLogId: latestLog?.logId || "",
    uid: window.PMChatService?.uidOf?.(currentUser) || currentUser?.uid || currentUser?.id || ""
  };
}

function navigateChatV92(path = "/chat?source=main") {
  window.history.pushState({}, "", path);
  renderPage("chat");
}

function installRuntimeLoggingV92() {
  if (window.__pmRuntimeLoggingV92) return;
  window.__pmRuntimeLoggingV92 = true;
  window.addEventListener("popstate", () => {
    if (window.location.pathname.startsWith("/chat") && currentUser) renderPage("chat");
  });
  window.addEventListener("pageshow", () => {
    if (window.location.pathname.startsWith("/chat") && currentUser) renderPage("chat");
  });
  window.addEventListener("error", (event) => {
    window.PMChatService?.saveErrorLog?.(event.error || event.message, {
      source: "window:error",
      filename: event.filename || "",
      lineno: event.lineno || 0,
      colno: event.colno || 0
    }, currentUser);
  });
  window.addEventListener("unhandledrejection", (event) => {
    window.PMChatService?.saveErrorLog?.(event.reason || "Unhandled promise rejection", { source: "window:unhandledrejection" }, currentUser);
  });
  if (window.PMFirebaseRuntime?.init && !window.PMFirebaseRuntime.__chatWrappedV92) {
    const initBefore = window.PMFirebaseRuntime.init;
    window.PMFirebaseRuntime.init = async function initWithChatLogV92(...args) {
      try {
        const runtime = await initBefore.apply(this, args);
        if (!runtime) throw new Error("정상적으로 연결되지 않았습니다");
        return runtime;
      } catch (error) {
        window.PMChatService?.saveErrorLog?.(error, { source: "firebase:init" }, currentUser);
        if (typeof showMessage === "function") showMessage("정상적으로 연결되지 않았습니다", "Firebase 연결을 확인해주세요.");
        throw error;
      }
    };
    window.PMFirebaseRuntime.__chatWrappedV92 = true;
  }
}

installRuntimeLoggingV92();
ensureSystemOwnerPatchV54();
store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V92;

// Final V93: production Firebase auth/session enforcement.
const APP_PATCH_VERSION_V93 = "v93.0 - 2026-07-07";

if (typeof canUseBrowserAuthSessionV80 === "function") {
  canUseBrowserAuthSessionV80 = function canUseBrowserAuthSessionV93() {
    return true;
  };
}

if (typeof restoreFirebaseSessionV34 === "function") {
  restoreFirebaseSessionV34 = async function restoreFirebaseSessionV93() {
    if (!window.PMFirebaseRuntime?.hasConfig?.()) return;
    try {
      const runtime = await window.PMFirebaseRuntime.init();
      if (!runtime) return;
      runtime.sdk.auth.onAuthStateChanged(runtime.auth, async (firebaseUser) => {
        if (!firebaseUser) {
          if (currentUser?.provider === "firebase") logout();
          return;
        }
        if (currentUser) return;
        const membership = await window.PMAuthService.firebaseEnsureUserStructure(firebaseUser, firebaseUser.displayName || firebaseUser.email, "pending");
        firebaseUser.pmWorkspaceId = membership.workspaceId;
        firebaseUser.pmRole = membership.role;
        firebaseUser.pmStatus = membership.status;
        firebaseUser.pmPendingWorkspaceId = membership.pendingWorkspaceId;
        await window.PMAuthService.firebaseRegisterDevice(firebaseUser);
        const user = syncFirebaseUserToLocalAuthV33(firebaseUser, firebaseUser.displayName || firebaseUser.email, "pending");
        authStateV31 = window.PMAuthService.loadAuthState();
        completeLoginV34(user);
      });
    } catch (error) {
      console.warn("Firebase session restore failed", error);
    }
  };
}

store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V93;

// Final V94: guard topbar action buttons during login/logout transitions.
const APP_PATCH_VERSION_V94 = "v94.0 - 2026-07-07";

function topActionsElementV94() {
  return document.getElementById("topActions") || document.querySelector(".top-actions");
}

function logoutButtonElementV94() {
  return document.getElementById("logoutBtn");
}

function insertTopActionButtonV94(buttonNode) {
  const actions = topActionsElementV94();
  if (!actions || !buttonNode) return false;
  const logout = logoutButtonElementV94();
  const before = logout && logout.parentElement === actions ? logout : actions.firstChild;
  actions.insertBefore(buttonNode, before || null);
  return true;
}

if (typeof syncSystemOwnerReturnButtonV58 === "function") {
  syncSystemOwnerReturnButtonV58 = function syncSystemOwnerReturnButtonV94() {
    const actions = topActionsElementV94();
    let btn = document.getElementById("systemOwnerReturnBtnV58");
    const shouldShow = !!actions && !!currentUser && currentUser.role === "system_owner" && userWorkspaceIdV54(currentUser) && currentPage !== "systemOwner";
    if (!shouldShow) {
      btn?.remove();
      return;
    }
    if (!btn) {
      btn = button("시스템 관리자", "ghost");
      btn.id = "systemOwnerReturnBtnV58";
      btn.addEventListener("click", () => renderPage("systemOwner"));
      insertTopActionButtonV94(btn);
    } else if (btn.parentElement !== actions) {
      insertTopActionButtonV94(btn);
    }
  };
}

if (typeof syncSupportButtonV92 === "function") {
  syncSupportButtonV92 = function syncSupportButtonV94() {
    const actions = topActionsElementV94();
    let btn = document.getElementById("supportContactBtnV92");
    const shouldShow = !!actions && !!currentUser && chatCanUseV92(currentUser) && !isChatManagerV92(currentUser);
    if (!shouldShow) {
      btn?.remove();
      return;
    }
    if (!btn) {
      btn = button("관리자에게 문의", "ghost");
      btn.id = "supportContactBtnV92";
      btn.addEventListener("click", () => navigateChatV92("/chat/new?source=main"));
      insertTopActionButtonV94(btn);
    } else if (btn.parentElement !== actions) {
      insertTopActionButtonV94(btn);
    }
  };
}

store.settings ??= {};
store.settings.appVersion = APP_PATCH_VERSION_V94;
