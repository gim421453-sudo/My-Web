import contextlib
import importlib.util
import io
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
helper_path = Path(__file__).parents[1] / "authority-audit" / "g2b_explicit_set_iam_policy_transport.py"
spec = importlib.util.spec_from_file_location("g2b_transport_helper", helper_path)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def capture_failure(code, *, stage="BEFORE_HTTP_SEND", status=None, request_started=False):
    helper._phase = helper.PHASES[0]
    helper._provider_request_prepared = False
    helper._provider_request_started = False
    helper._provider_response_received = False
    helper._http_status = None
    helper._request_metadata = None
    helper._failed_phase = None
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        try:
            helper.fail(code, stage=stage, status=status, request_started=request_started)
        except SystemExit as error:
            assert error.code == 2
    return json.loads(output.getvalue())


local = capture_failure("LOCAL_REQUEST_INVALID")
assert local["failure"]["code"] == "HELPER_INPUT_INVALID"
assert local["failure"]["phase"] == "PHASE_01_INPUT_VALIDATION"
assert local["failure"]["providerRequestStarted"] is False
assert local["transportLifecycle"]["failedPhase"] == "PHASE_01_INPUT_VALIDATION"
assert local["requestStarted"] is False

provider = capture_failure("PROVIDER_PERMISSION_DENIED", stage="DURING_HTTP_SEND",
                            status=403, request_started=True)
assert provider["failure"]["code"] == "HELPER_PROVIDER_PERMISSION_DENIED"
assert provider["failure"]["phase"] == "PHASE_08_HELPER_SERIALIZATION"
assert provider["failure"]["providerRequestStarted"] is True
assert provider["failure"]["providerResponseReceived"] is True
assert provider["failure"]["httpStatus"] == 403
assert provider["failureMetadata"]["safeProviderErrorIdentifier"] == "HTTP_403"
assert provider["transportLifecycle"]["failedPhase"] == provider["failure"]["phase"]
completed_index = helper.PHASES.index(provider["transportLifecycle"]["lastCompletedPhase"])
failed_index = helper.PHASES.index(provider["transportLifecycle"]["failedPhase"])
assert completed_index < failed_index
helper.set_phase("PHASE_10_SCHEMA_VALIDATION")
assert helper._phase == "PHASE_08_HELPER_SERIALIZATION"

serialized = json.dumps(provider)
for forbidden in ("token", "credential", "stdout", "stderr", "serviceAccount:", "@"):
    assert forbidden not in serialized

print("G2B Python helper failure envelope passed; local fixtures only; remote operations=0")
