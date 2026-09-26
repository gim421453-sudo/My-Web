"""One-shot Cloud SDK user-credential refresh with an explicit no-retry boundary."""

import datetime
import json
import os
import sys

SCHEMA = "myweb.g2b.credential-refresh-transport.v1"
OVERRIDE_ENV = (
    "CLOUDSDK_AUTH_ACCESS_TOKEN",
    "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
    "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT",
)


def emit(value, exit_code=0):
    sys.stdout.write(json.dumps(value, separators=(",", ":"), sort_keys=True))
    raise SystemExit(exit_code)


def failure(code, stage, exception_class, substage, timeout=False):
    emit({
        "schema": SCHEMA,
        "ok": False,
        "code": code,
        "failureMetadata": {
            "failureStage": stage,
            "localSetupSubstage": substage,
            "httpStatusClass": "NOT_OBSERVED",
            "httpStatusCodeSafe": "NOT_OBSERVED",
            "transportExceptionClassSafe": exception_class,
            "safeProviderErrorIdentifier": "NOT_AVAILABLE",
            "timeout": timeout,
        },
    }, 2)


def main():
    if len(sys.argv) != 3 or sys.argv[2] not in ("--refresh-once", "--fake-refresh-success"):
        failure("LOCAL_SETUP_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CLIENT_SETUP_FAILURE", "ARGV_VALIDATION")
    fake_mode = sys.argv[2] == "--fake-refresh-success"
    if any(os.environ.get(key) for key in OVERRIDE_ENV):
        failure("PRIVACY_GUARD_FAILURE", "BEFORE_HTTP_SEND", "PRIVACY_GUARD_FAILURE", "ENVIRONMENT_PRIVACY_GUARD")

    sdk_root = os.path.abspath(sys.argv[1])
    sdk_lib = os.path.join(sdk_root, "lib")
    if not os.path.isfile(os.path.join(sdk_lib, "googlecloudsdk", "core", "credentials", "store.py")):
        failure("LOCAL_SETUP_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CLIENT_SETUP_FAILURE", "CLOUD_SDK_LAYOUT_VALIDATION")
    sys.path.insert(0, os.path.join(sdk_lib, "third_party"))
    sys.path.insert(0, sdk_lib)
    try:
        from google.auth.transport import requests as google_auth_requests
        from googlecloudsdk.core import properties
        from googlecloudsdk.core.credentials import google_auth_credentials
        from googlecloudsdk.core.credentials import store
    except Exception:
        failure("LOCAL_SETUP_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CLIENT_SETUP_FAILURE", "SDK_IMPORTS")

    try:
        account = properties.VALUES.core.account.Get()
        if not isinstance(account, str) or not account:
            failure("AUTH_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CREDENTIAL_FAILURE", "CLOUD_SDK_CONFIGURATION")
        credential = store.Load(account=account, prevent_refresh=True, allow_account_impersonation=False)
        if not callable(getattr(credential, "refresh", None)):
            failure("LOCAL_SETUP_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CLIENT_SETUP_FAILURE", "CREDENTIAL_STORE_LOAD")
    except SystemExit:
        raise
    except Exception:
        failure("AUTH_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CREDENTIAL_FAILURE", "CREDENTIAL_STORE_LOAD")

    endpoint_once = getattr(google_auth_credentials._TokenEndpointRequestWithRetry, "__wrapped__", None)
    if not callable(endpoint_once):
        failure("LOCAL_SETUP_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CLIENT_SETUP_FAILURE", "NO_RETRY_REFRESH_BOUNDARY")

    class FakeResponse:
        status = 200
        data = b'{"access_token":"synthetic","expires_in":3600}'

    class FakeRequest:
        def __call__(self, **_kwargs):
            return FakeResponse()

    request = FakeRequest() if fake_mode else google_auth_requests.Request()
    original = google_auth_credentials._TokenEndpointRequestWithRetry
    google_auth_credentials._TokenEndpointRequestWithRetry = endpoint_once
    try:
        credential.refresh(request)
    except Exception:
        failure("AUTH_FAILURE", "AFTER_HTTP_RESPONSE" if not fake_mode else "RESPONSE_HANDLING", "REFRESH_AUTH_FAILURE", "CREDENTIAL_REFRESH")
    finally:
        google_auth_credentials._TokenEndpointRequestWithRetry = original

    expiry = getattr(credential, "expiry", None)
    if expiry is not None and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=datetime.timezone.utc)
    fresh = expiry is not None and expiry > datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=2)
    if not fresh:
        failure("PARSE_FAILURE", "RESPONSE_HANDLING", "RESPONSE_PARSE_FAILURE", "REFRESH_RESPONSE_VALIDATION")
    if not fake_mode:
        try:
            store.Store(credential, account=account)
        except Exception:
            failure("LOCAL_SETUP_FAILURE", "RESPONSE_HANDLING", "LOCAL_CREDENTIAL_FAILURE", "CREDENTIAL_STORE_PERSIST")
    emit({
        "schema": SCHEMA,
        "ok": True,
        "refreshResult": "SUCCESS",
        "tokenFreshAfterRefresh": True,
        "tokenExpiryPresentAfterRefresh": True,
        "credentialStoreUpdated": not fake_mode,
        "fakeMode": fake_mode,
    })


if __name__ == "__main__":
    main()
