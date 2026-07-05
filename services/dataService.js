// Local data service adapter. Swap this adapter later for Supabase/Firebase/API.
(function () {
  const LEGACY_STORE_KEY = "pm-store-v3";
  const WORKSPACE_ID_KEY = "pm:workspace:current";
  const DEFAULT_WORKSPACE_ID = "personal-local";

  function normalizeWorkspaceId(workspaceId) {
    return String(workspaceId || DEFAULT_WORKSPACE_ID).trim() || DEFAULT_WORKSPACE_ID;
  }

  function currentWorkspaceId() {
    return localStorage.getItem(WORKSPACE_ID_KEY) || DEFAULT_WORKSPACE_ID;
  }

  function setWorkspaceId(workspaceId) {
    const next = normalizeWorkspaceId(workspaceId);
    localStorage.setItem(WORKSPACE_ID_KEY, next);
    return next;
  }

  function getWorkspaceKey(workspaceId, key) {
    return `app:${normalizeWorkspaceId(workspaceId)}:${key}`;
  }

  function scopedKey(type, workspaceId) {
    return getWorkspaceKey(workspaceId || currentWorkspaceId(), type);
  }

  function readJson(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function removeJson(key) {
    localStorage.removeItem(key);
  }

  function withWorkspaceMeta(value, workspaceId) {
    if (!value || typeof value !== "object") return value;
    value.workspace_id = normalizeWorkspaceId(workspaceId);
    value.schema_version = value.schema_version || 1;
    value.updated_at = new Date().toISOString();
    return value;
  }

  function getData(workspaceId, key) {
    return readJson(getWorkspaceKey(workspaceId, key));
  }

  function setData(workspaceId, key, value) {
    writeJson(getWorkspaceKey(workspaceId, key), value);
    return value;
  }

  function loadStore(workspaceId) {
    return getData(workspaceId || currentWorkspaceId(), "store");
  }

  function saveStore(store, workspaceId) {
    const targetWorkspaceId = normalizeWorkspaceId(workspaceId || store?.workspace_id || currentWorkspaceId());
    const next = withWorkspaceMeta(store, targetWorkspaceId);
    setData(targetWorkspaceId, "store", next);
    return next;
  }

  function clearWorkspaceCache(workspaceId) {
    removeJson(getWorkspaceKey(workspaceId || currentWorkspaceId(), "store"));
  }

  function removeCurrentWorkspaceStore() {
    clearWorkspaceCache(currentWorkspaceId());
  }

  function loadLegacyStore() {
    return readJson(LEGACY_STORE_KEY);
  }

  function importLegacyStoreToWorkspace() {
    // TODO: Build an explicit review/import flow. Never auto-import legacy browser data.
    return { ok: false, reason: "legacy-import-todo" };
  }

  window.PMDataService = {
    mode: "local",
    legacyStoreKey: LEGACY_STORE_KEY,
    currentWorkspaceId,
    setWorkspaceId,
    getWorkspaceKey,
    scopedKey,
    getData,
    setData,
    loadStore,
    saveStore,
    clearWorkspaceCache,
    removeCurrentWorkspaceStore,
    loadLegacyStore,
    importLegacyStoreToWorkspace
  };
})();
