// Current static-app session facade. Cloud Functions session revocation is TODO.
(function () {
  const SESSION_KEY = "pm-current-user";

  function currentSession() {
    return {
      userId: sessionStorage.getItem(SESSION_KEY),
      startedAt: sessionStorage.getItem("pm-session-started-at")
    };
  }

  function startSession(userId) {
    sessionStorage.setItem(SESSION_KEY, userId);
    sessionStorage.setItem("pm-session-started-at", new Date().toISOString());
  }

  function endCurrentSession() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("pm-session-started-at");
  }

  function requestLogoutDevice(deviceId) {
    return { deviceId, status: "todo_cloud_functions_required" };
  }

  function requestLogoutAllDevices(uid) {
    return { uid, status: "todo_cloud_functions_required" };
  }

  window.PMSessionService = { currentSession, startSession, endCurrentSession, requestLogoutDevice, requestLogoutAllDevices };
})();
