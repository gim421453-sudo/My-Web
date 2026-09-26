import contextlib
import importlib.util
import io
import json
import os
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.dont_write_bytecode = True
helper_path = Path(__file__).parents[1] / "authority-audit" / "g2b_explicit_set_iam_policy_transport.py"
spec = importlib.util.spec_from_file_location("g2b_main_fixture", helper_path)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def module(name, **values):
    result = types.ModuleType(name)
    for key, value in values.items():
        setattr(result, key, value)
    sys.modules[name] = result
    return result


def package(name, **values):
    result = module(name, **values)
    result.__path__ = []
    return result


class FakeCredential:
    token = "fixture-token-never-used"
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)

    def refresh(self, _request):
        raise AssertionError("local fixture must never refresh credentials")


class FakeRequest:
    def __init__(self, resource, options_requestedPolicyVersion):
        self.resource = resource
        self.options_requestedPolicyVersion = options_requestedPolicyVersion


class FakeService:
    calls = 0
    request = None

    def GetIamPolicy(self, request):
        self.calls += 1
        self.request = request
        return {"etag": "fixture-etag", "version": 3, "bindings": []}


def message_to_dict(value):
    if isinstance(value, FakeRequest):
        if os.environ.get("G2B_TEST_REQUEST_SHAPE") == "FLAT":
            return {"resource": value.resource, "options.requestedPolicyVersion": value.options_requestedPolicyVersion}
        if os.environ.get("G2B_TEST_REQUEST_SHAPE") == "CONFLICT":
            return {"resource": value.resource, "options": {"requestedPolicyVersion": 3},
                    "options.requestedPolicyVersion": 1}
        return {"resource": value.resource, "options": {"requestedPolicyVersion": value.options_requestedPolicyVersion}}
    if isinstance(value, dict):
        return dict(value)
    raise TypeError("fixture conversion unsupported")


def install_fake_sdk():
    package("apitools")
    package("apitools.base")
    apitools_py = package("apitools.base.py")
    apitools_py.encoding_helper = types.SimpleNamespace(MessageToDict=message_to_dict, DictToMessage=lambda data, _kind: data)
    package("google")
    package("google.auth")
    package("google.auth.transport")
    module("google.auth.transport.requests", Request=lambda: object())
    package("googlecloudsdk")
    package("googlecloudsdk.core")
    account_property = types.SimpleNamespace(Get=lambda: os.environ.get("G2B_TEST_FAKE_ACCOUNT", "fixture@example.invalid"))
    absent_property = types.SimpleNamespace(Get=lambda: None)
    properties = module("googlecloudsdk.core.properties", VALUES=types.SimpleNamespace(
        core=types.SimpleNamespace(account=account_property),
        auth=types.SimpleNamespace(access_token_file=absent_property,
                                   credential_file_override=absent_property,
                                   impersonate_service_account=absent_property)))
    core_requests = module("googlecloudsdk.core.requests", GetSession=lambda: object(), GetApitoolsRequests=lambda value: value)
    package("googlecloudsdk.core.credentials")
    credential_requests = module("googlecloudsdk.core.credentials.requests")
    credential_requests.RequestWrapper = lambda: types.SimpleNamespace(WrapCredentials=lambda *_args, credentials, **_kwargs: credentials)
    google_auth_credentials = module("googlecloudsdk.core.credentials.google_auth_credentials",
                                     _TokenEndpointRequestWithRetry=object())
    store = module("googlecloudsdk.core.credentials.store", Load=lambda **_kwargs: FakeCredential(),
                   Store=lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("credential store write forbidden")))
    package("googlecloudsdk.generated_clients")
    package("googlecloudsdk.generated_clients.apis")
    package("googlecloudsdk.generated_clients.apis.iam")
    package("googlecloudsdk.generated_clients.apis.iam.v1")
    messages = module("googlecloudsdk.generated_clients.apis.iam.v1.iam_v1_messages",
                      IamProjectsServiceAccountsGetIamPolicyRequest=FakeRequest)
    service = FakeService()
    client = module("googlecloudsdk.generated_clients.apis.iam.v1.iam_v1_client",
                    IamV1=lambda **_kwargs: types.SimpleNamespace(projects_serviceAccounts=service, num_retries=0))
    return service, messages


def invoke(argv, stdin_text, sdk_root):
    helper._phase = helper.PHASES[0]
    helper._provider_request_prepared = False
    helper._provider_request_started = False
    helper._provider_response_received = False
    helper._http_status = None
    helper._request_metadata = None
    helper._failed_phase = None
    old_argv, old_stdin = sys.argv, sys.stdin
    old_env = {key: os.environ.pop(key, None) for key in helper.OVERRIDE_ENV}
    output = io.StringIO()
    try:
        sys.argv = argv
        sys.stdin = io.StringIO(stdin_text)
        with contextlib.redirect_stdout(output):
            try:
                helper.run_entrypoint()
            except SystemExit as error:
                assert error.code in (0, 2)
        return json.loads(output.getvalue())
    finally:
        sys.argv, sys.stdin = old_argv, old_stdin
        for key, value in old_env.items():
            if value is not None:
                os.environ[key] = value


def run_child_fixture(argv):
    if len(argv) != 3:
        return 64
    fake_service, _messages = install_fake_sdk()
    helper_path, sdk_root, _operation = argv
    sys.argv = argv
    try:
        try:
            helper.run_entrypoint()
        except SystemExit as error:
            exit_code = error.code if isinstance(error.code, int) else 0
        else:
            exit_code = 0
    finally:
        probe = {
            "providerCalls": fake_service.calls,
            "requestResourceMatches": fake_service.request.resource == helper.RESOURCE if fake_service.request else False,
            "requestedPolicyVersion": fake_service.request.options_requestedPolicyVersion if fake_service.request else None,
            "credentialRefreshCalls": 0,
            "networkCalls": 0,
        }
        sys.stderr.write("G2B_TEST_PROVIDER_PROBE=" + json.dumps(probe, sort_keys=True) + "\n")
    return exit_code


if len(sys.argv) >= 2 and sys.argv[1] == "--child":
    raise SystemExit(run_child_fixture(sys.argv[2:]))


sdk_root = Path(__file__).parents[2].resolve()
original_isfile = helper.os.path.isfile
helper.os.path.isfile = lambda path: str(path).replace("\\", "/").endswith("/googlecloudsdk/core/credentials/store.py") or original_isfile(path)
try:
    fake_service, _messages = install_fake_sdk()
    for body, expected_shape in [
        ({"resource": helper.RESOURCE, "options": {"requestedPolicyVersion": 3}}, "SHAPE_A_NESTED"),
        ({"resource": helper.RESOURCE, "options.requestedPolicyVersion": 3}, "SHAPE_B_EXPLICIT_FLAT"),
        ({"resource": helper.RESOURCE, "options": {"requestedPolicyVersion": 3},
          "options.requestedPolicyVersion": 3}, "BOTH_EQUIVALENT"),
    ]:
        normalized = helper.normalize_get_iam_policy_request_body(body)
        assert normalized["normalizedRequestedPolicyVersion"] == 3
        assert normalized["normalizedTargetResource"] == helper.RESOURCE
        assert normalized["shape"] == expected_shape
    for body, code in [
        ({"resource": helper.RESOURCE, "options": {"requestedPolicyVersion": 3},
          "options.requestedPolicyVersion": 1}, "REQUEST_POLICY_VERSION_CONFLICT"),
        ({"resource": helper.RESOURCE, "options.requestedPolicyVersion": "3"}, "REQUEST_POLICY_VERSION_TYPE_INVALID"),
        ({"resource": helper.RESOURCE, "options.requestedPolicyVersion": True}, "REQUEST_POLICY_VERSION_TYPE_INVALID"),
        ({"resource": helper.RESOURCE, "options.requestedPolicyVersion": 3.0}, "REQUEST_POLICY_VERSION_TYPE_INVALID"),
        ({"resource": helper.RESOURCE, "options": {"requestedPolicyVersion": None}}, "REQUEST_POLICY_VERSION_TYPE_INVALID"),
        ({"resource": helper.RESOURCE}, "REQUEST_POLICY_VERSION_MISSING"),
        ({"resource": helper.RESOURCE, "options.requestedPolicyVersion": 1}, "REQUEST_POLICY_VERSION_UNSUPPORTED"),
        ({"resource": helper.RESOURCE, "options.requestedPolicyVersion": 3, "other": 3},
         "REQUEST_SERIALIZATION_UNSUPPORTED_SHAPE"),
        ({"resource": "wrong", "options.requestedPolicyVersion": 3}, "REQUEST_RESOURCE_MISMATCH"),
    ]:
        try:
            helper.normalize_get_iam_policy_request_body(body)
            raise AssertionError("invalid request shape was accepted")
        except helper.PolicyNormalizationError as error:
            assert error.code == code
    os.environ["G2B_TEST_REQUEST_SHAPE"] = "FLAT"
    try:
        actual_flat_request, actual_flat_diagnostic = helper.build_get_iam_policy_request(
            _messages, message_to_dict)
        assert actual_flat_request.resource == helper.RESOURCE
        assert actual_flat_diagnostic["serializationShape"] == "SHAPE_B_EXPLICIT_FLAT"
    finally:
        os.environ.pop("G2B_TEST_REQUEST_SHAPE", None)
    input_value = {"resource": helper.RESOURCE, "member": "serviceAccount:fixture@example.invalid",
                   "account": "fixture@example.invalid"}
    result = invoke([str(helper_path), str(sdk_root), "READ_GENERATION_BOUND_RECOVERY_POLICY"],
                    json.dumps(input_value), sdk_root)
    assert result["ok"] is True, result
    assert result["requestMetadata"]["requestedPolicyVersion"] == 3
    assert result["requestedPolicyVersion"] == 3
    assert result["helperExecution"]["schemaVersion"] == "myweb.g2b.helper-execution.v1"
    assert result["helperExecution"]["success"] is True
    assert result["helperExecution"]["requestBuilt"] is True
    assert result["helperExecution"]["providerRequestStarted"] is True
    assert result["helperExecution"]["providerResponseReceived"] is True
    assert result["helperExecution"]["policyExtracted"] is True
    assert result["helperExecution"]["requestMetadataAvailable"] is True
    assert result["helperExecution"]["safeDiagnostics"]["serializationShape"] == "SHAPE_A_NESTED"
    assert result["policy"]["etag"] == "fixture-etag"
    assert fake_service.calls == 1
    assert fake_service.request.options_requestedPolicyVersion == 3
    os.environ["G2B_TEST_REQUEST_SHAPE"] = "CONFLICT"
    try:
        conflict = invoke([str(helper_path), str(sdk_root), "READ_GENERATION_BOUND_RECOVERY_POLICY"],
                          json.dumps(input_value), sdk_root)
    finally:
        os.environ.pop("G2B_TEST_REQUEST_SHAPE", None)
    assert conflict["ok"] is False
    assert conflict["helperExecution"]["success"] is False
    assert conflict["helperExecution"]["failureCode"] == "REQUEST_POLICY_VERSION_CONFLICT"
    assert conflict["helperExecution"]["requestBuilt"] is False
    assert conflict["helperExecution"]["providerRequestStarted"] is False
    assert conflict["helperExecution"]["providerResponseReceived"] is False
    assert conflict["helperExecution"]["requestMetadataAvailable"] is False
    assert conflict["helperExecution"]["safeDiagnostics"]["serializationShape"] == "BOTH_PRESENT"
    assert fake_service.calls == 1
    assert result["setAttempted"] is False

    missing = invoke([str(helper_path), str(sdk_root), "READ_GENERATION_BOUND_RECOVERY_POLICY"],
                     json.dumps({"resource": helper.RESOURCE}), sdk_root)
    assert missing["failure"]["code"] == "HELPER_REQUIRED_FIELD_MISSING"
    assert missing["failureMetadata"]["inputContract"]["missingRequiredFields"] == ["account", "member"]
    assert fake_service.calls == 1

    for payload, expected in [("", "HELPER_STDIN_EMPTY"), ("{", "HELPER_INPUT_JSON_PARSE_FAILED"),
                              (json.dumps({"resource": helper.RESOURCE, "member": 7,
                                           "account": "fixture@example.invalid"}), "HELPER_FIELD_TYPE_INVALID")]:
        invalid = invoke([str(helper_path), str(sdk_root), "READ_GENERATION_BOUND_RECOVERY_POLICY"], payload, sdk_root)
        assert invalid["failure"]["code"] == expected, invalid
    bad_argv = invoke([str(helper_path), str(sdk_root), "UNRECOGNIZED_OPERATION"], json.dumps(input_value), sdk_root)
    assert bad_argv["failure"]["code"] == "HELPER_ARG_PARSE_FAILED"

    original_builder = helper.build_get_iam_policy_request
    helper.build_get_iam_policy_request = lambda *_args: (_ for _ in ()).throw(RuntimeError("private detail"))
    try:
        build_failure = invoke([str(helper_path), str(sdk_root), "READ_GENERATION_BOUND_RECOVERY_POLICY"],
                               json.dumps(input_value), sdk_root)
    finally:
        helper.build_get_iam_policy_request = original_builder
    assert build_failure["failure"]["code"] == "HELPER_REQUEST_BUILD_FAILED"
    assert fake_service.calls == 1

    original_main = helper.main
    helper.main = lambda: (_ for _ in ()).throw(RuntimeError("secret-bearing exception text"))
    try:
        entrypoint_failure = invoke([str(helper_path), str(sdk_root), "READ_GENERATION_BOUND_RECOVERY_POLICY"],
                                    json.dumps(input_value), sdk_root)
    finally:
        helper.main = original_main
    assert entrypoint_failure["failure"]["code"] == "HELPER_ENTRYPOINT_EXCEPTION"
    assert "secret-bearing" not in json.dumps(entrypoint_failure)

    print("G2B production Python entrypoint local fake-provider path passed; provider network=0; credential refresh=0")
finally:
    helper.os.path.isfile = original_isfile
