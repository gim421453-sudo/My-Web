"""One-shot IAM TestIamPermissions transport using only cached gcloud credentials."""

import base64
import datetime
import json
import os
import sys

EXPECTED_RESOURCE = (
    "projects/my-management-app-8a933/serviceAccounts/"
    "myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com"
)
EXPECTED_PERMISSION = "iam.serviceAccounts.setIamPolicy"
SCHEMA = "myweb.g2b.exact-permission-transport.v3"
OVERRIDE_ENV = (
    "CLOUDSDK_AUTH_ACCESS_TOKEN",
    "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
    "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT",
)


def emit(value, exit_code=0):
    sys.stdout.write(json.dumps(value, separators=(",", ":"), sort_keys=True))
    raise SystemExit(exit_code)


def safe_status(status):
    if status in (400, 401, 403, 404, 429, 500, 502, 503, 504):
        return status, f"{status // 100}XX", f"HTTP_{status}"
    return "NOT_OBSERVED", "UNKNOWN", "NOT_AVAILABLE"


def fail(code, stage="BEFORE_HTTP_SEND", exception_class="NONE", status=None, timeout=False,
         local_setup_substage="NOT_APPLICABLE"):
    status_code, status_class, provider_identifier = safe_status(status)
    emit({
        "schema": SCHEMA,
        "ok": False,
        "code": code,
        "failureMetadata": {
            "failureStage": stage,
            "httpStatusClass": status_class,
            "httpStatusCodeSafe": status_code,
            "transportExceptionClassSafe": exception_class,
            "safeProviderErrorIdentifier": provider_identifier,
            "timeout": timeout,
            "localSetupSubstage": local_setup_substage,
        },
    }, 2)


def valid_request(value):
    return (
        isinstance(value, dict)
        and set(value.keys()) == {"resource", "permissions"}
        and value.get("resource") == EXPECTED_RESOURCE
        and value.get("permissions") == [EXPECTED_PERMISSION]
    )


def credential_is_fresh(credential):
    token = getattr(credential, "token", None) or getattr(credential, "access_token", None)
    expiry = getattr(credential, "expiry", None) or getattr(credential, "token_expiry", None)
    if not isinstance(token, str) or not token or expiry is None:
        return False
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=datetime.timezone.utc)
    return expiry > datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=2)


def main():
    mode = sys.argv[3] if len(sys.argv) == 4 else None
    ready_to_send_only = mode == "--ready-to-send-only"
    local_construction_trace = mode == "--local-construction-trace"
    if len(sys.argv) not in (3, 4) or (len(sys.argv) == 4 and not (ready_to_send_only or local_construction_trace)):
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="ARGV_VALIDATION")
    if any(os.environ.get(key) for key in OVERRIDE_ENV):
        fail("PRIVACY_GUARD_FAILURE", exception_class="PRIVACY_GUARD_FAILURE",
             local_setup_substage="ENVIRONMENT_PRIVACY_GUARD")
    sdk_root = os.path.abspath(sys.argv[1])
    sdk_lib = os.path.join(sdk_root, "lib")
    if not os.path.isfile(os.path.join(sdk_lib, "googlecloudsdk", "core", "credentials", "store.py")):
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="CLOUD_SDK_LAYOUT_VALIDATION")
    try:
        request_value = json.loads(base64.b64decode(sys.argv[2], validate=True).decode("utf-8"))
    except Exception:
        fail("DIAGNOSTIC_PARSE_FAILURE", exception_class="RESPONSE_PARSE_FAILURE",
             local_setup_substage="REQUEST_DECODE")
    if not valid_request(request_value):
        fail("PRIVACY_GUARD_FAILURE", exception_class="PRIVACY_GUARD_FAILURE",
             local_setup_substage="REQUEST_VALIDATION")

    sys.path.insert(0, os.path.join(sdk_lib, "third_party"))
    sys.path.insert(0, sdk_lib)
    try:
        from googlecloudsdk.core import properties
        from googlecloudsdk.core import requests as core_requests
        from googlecloudsdk.core.credentials import requests as credential_requests
        from googlecloudsdk.core.credentials import store
        from googlecloudsdk.generated_clients.apis.iam.v1 import iam_v1_client
        from googlecloudsdk.generated_clients.apis.iam.v1 import iam_v1_messages
    except Exception:
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="SDK_IMPORTS")

    try:
        if (
            properties.VALUES.auth.access_token_file.Get()
            or properties.VALUES.auth.credential_file_override.Get()
            or properties.VALUES.auth.impersonate_service_account.Get()
        ):
            fail("PRIVACY_GUARD_FAILURE", exception_class="PRIVACY_GUARD_FAILURE",
                 local_setup_substage="ENVIRONMENT_PRIVACY_GUARD")
        account = properties.VALUES.core.account.Get()
        if not isinstance(account, str) or not account:
            fail("DIAGNOSTIC_AUTH_FAILURE", exception_class="LOCAL_CREDENTIAL_FAILURE",
                 local_setup_substage="CLOUD_SDK_CONFIGURATION")
    except SystemExit:
        raise
    except Exception:
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="CLOUD_SDK_CONFIGURATION")

    try:
        credential = store.Load(
            account=account,
            prevent_refresh=True,
            allow_account_impersonation=False,
        )
        if not credential_is_fresh(credential):
            fail("DIAGNOSTIC_AUTH_FAILURE", exception_class="LOCAL_CREDENTIAL_FAILURE",
                 local_setup_substage="CREDENTIAL_STORE_LOAD")
    except SystemExit:
        raise
    except Exception:
        fail("DIAGNOSTIC_AUTH_FAILURE", exception_class="LOCAL_CREDENTIAL_FAILURE",
             local_setup_substage="CREDENTIAL_STORE_LOAD")

    trace = {
        "credentialAdapterLoad": "PASS",
        "authObjectConstruction": "NOT_RUN",
        "httpClientConstruction": "NOT_RUN",
        "timeoutConfiguration": "NOT_RUN",
        "requestBodyConstruction": "NOT_RUN",
        "requestObjectConstruction": "NOT_RUN",
        "readyToSendSentinel": "NOT_REACHED",
    }
    try:
        def refresh_blocked(_request):
            raise RuntimeError("credential-refresh-blocked")

        credential.refresh = refresh_blocked
        trace["authObjectConstruction"] = "PASS"
    except Exception:
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="AUTH_OBJECT_CONSTRUCTION")
    try:
        base_session = core_requests.GetSession()
        authorized_session = credential_requests.RequestWrapper().WrapCredentials(
            base_session,
            allow_account_impersonation=False,
            credentials=credential,
        )
        apitools_http = core_requests.GetApitoolsRequests(authorized_session)
        client = iam_v1_client.IamV1(http=apitools_http, get_credentials=False)
        trace["httpClientConstruction"] = "PASS"
    except Exception:
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="HTTP_CLIENT_CONSTRUCTION")
    try:
        client.num_retries = 0
        trace["timeoutConfiguration"] = "PASS"
    except Exception:
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="TIMEOUT_CONFIGURATION")
    try:
        body = iam_v1_messages.TestIamPermissionsRequest(permissions=[EXPECTED_PERMISSION])
        trace["requestBodyConstruction"] = "PASS"
    except Exception:
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="REQUEST_BODY_CONSTRUCTION")
    try:
        request = iam_v1_messages.IamProjectsServiceAccountsTestIamPermissionsRequest(
            resource=EXPECTED_RESOURCE,
            testIamPermissionsRequest=body,
        )
        trace["requestObjectConstruction"] = "PASS"
    except Exception:
        fail("DIAGNOSTIC_REQUEST_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE",
             local_setup_substage="REQUEST_OBJECT_CONSTRUCTION")

    trace["readyToSendSentinel"] = "REACHED"
    if local_construction_trace:
        emit({"schema": SCHEMA, "localConstruction": trace, "readyToSend": True})
    if ready_to_send_only:
        emit({"schema": SCHEMA, "readyToSend": True})

    try:
        response = client.projects_serviceAccounts.TestIamPermissions(request)
        granted = list(getattr(response, "permissions", None) or [])
    except SystemExit:
        raise
    except Exception as error:
        status = getattr(error, "status_code", None)
        # A recognized HTTP status proves a response arrived; otherwise the
        # failure remains bounded to the send/transport phase.
        stage = "AFTER_HTTP_RESPONSE" if status in (400, 401, 403, 404, 429, 500, 502, 503, 504) else "DURING_HTTP_SEND"
        fail(
            "DIAGNOSTIC_AUTH_FAILURE" if status in (401, 403) else "DIAGNOSTIC_REQUEST_FAILURE",
            stage=stage,
            exception_class="REMOTE_REQUEST_EXCEPTION",
            status=status,
            local_setup_substage="NOT_APPLICABLE",
        )

    if any(not isinstance(item, str) or item != EXPECTED_PERMISSION for item in granted):
        fail("PRIVACY_GUARD_FAILURE", stage="RESPONSE_HANDLING", exception_class="PRIVACY_GUARD_FAILURE")
    emit({
        "schema": SCHEMA,
        "ok": True,
        "httpStatusClass": "2XX",
        "grantedPermissions": sorted(set(granted)),
    })


if __name__ == "__main__":
    main()
