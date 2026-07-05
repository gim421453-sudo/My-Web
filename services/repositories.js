// Repository facade. Future screens or APIs should use this instead of storage directly.
(function () {
  const storeRepository = {
    getWorkspaceId() {
      return window.PMDataService?.currentWorkspaceId?.() || "personal-local";
    },
    setWorkspaceId(workspaceId) {
      return window.PMDataService?.setWorkspaceId?.(workspaceId);
    },
    load(workspaceId) {
      return window.PMDataService?.loadStore?.(workspaceId) || null;
    },
    save(store, workspaceId) {
      return window.PMDataService?.saveStore?.(store, workspaceId);
    },
    clearCurrentWorkspace(workspaceId) {
      if (workspaceId) return window.PMDataService?.clearWorkspaceCache?.(workspaceId);
      return window.PMDataService?.removeCurrentWorkspaceStore?.();
    }
  };

  const authRepository = {
    load() {
      return window.PMAuthService?.loadAuthState?.() || null;
    },
    save(state) {
      return window.PMAuthService?.saveAuthState?.(state);
    },
    clearSession() {
      return window.PMAuthService?.clearSession?.();
    }
  };

  window.PMRepositories = { storeRepository, authRepository };
})();
