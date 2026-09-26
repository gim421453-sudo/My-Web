"""Direct, bounded service-account IAM policy transport with no refresh.

The complete prestate Policy may cross the local Node/Python process boundary
only through stdin, remains transient, and is never logged or persisted. This
helper is inert until a future explicit approval binds it.
"""

import datetime
import hashlib
import json
import os
import re
import sys
from collections.abc import Mapping

RESOURCE = "projects/my-management-app-8a933/serviceAccounts/myweb-class-mig-writer-g2@my-management-app-8a933.iam.gserviceaccount.com"
ROLE = "roles/iam.serviceAccountTokenCreator"
EXACT_PERMISSION = "iam.serviceAccounts.setIamPolicy"
SCHEMA = "myweb.g2b.explicit-set-iam-policy-transport.v2"
OVERRIDE_ENV = (
    "CLOUDSDK_AUTH_ACCESS_TOKEN",
    "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
    "CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT",
)
MEMBER = re.compile(r"^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$")
ACCOUNT = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHASES = (
    "PHASE_01_INPUT_VALIDATION", "PHASE_02_CHILD_SPAWN_ATTEMPT", "PHASE_03_CHILD_STARTED",
    "PHASE_04_HELPER_INPUT_ACCEPTED", "PHASE_05_PROVIDER_REQUEST_PREPARED",
    "PHASE_06_PROVIDER_REQUEST_STARTED", "PHASE_07_PROVIDER_RESPONSE_RECEIVED",
    "PHASE_08_HELPER_SERIALIZATION", "PHASE_09_NODE_STDOUT_PARSE",
    "PHASE_10_SCHEMA_VALIDATION", "PHASE_11_CAS_CAPTURE",
)
_phase = PHASES[0]
_provider_request_prepared = False
_provider_request_started = False
_provider_response_received = False
_http_status = None
_request_metadata = None
_policy_object_type = "UNKNOWN"
_canonicalization_stage = "NOT_STARTED"
_serialization_stage = "NOT_STARTED"
_failed_phase = None
_input_contract_diagnostic = None
_request_body_diagnostic = None


class PolicyNormalizationError(Exception):
    def __init__(self, code, stage):
        super().__init__(code)
        self.code = code
        self.stage = stage


def set_phase(value):
    global _phase
    if value in PHASES and _failed_phase is None and PHASES.index(value) >= PHASES.index(_phase):
        _phase = value


def lifecycle_is_consistent(lifecycle):
    if not isinstance(lifecycle, dict):
        return False
    completed = lifecycle.get("lastCompletedPhase")
    failed = lifecycle.get("failedPhase")
    if (completed not in PHASES and not (completed is None and failed == PHASES[0])) \
            or (failed is not None and failed not in PHASES):
        return False
    if failed is not None and completed is not None and PHASES.index(completed) >= PHASES.index(failed):
        return False
    started = lifecycle.get("providerRequestStarted")
    received = lifecycle.get("providerResponseReceived")
    known = lifecycle.get("httpStatusKnown")
    if received and not started or known and not received:
        return False
    if known != isinstance(lifecycle.get("httpStatus"), int):
        return False
    return True


def helper_failure_code(code, status):
    explicit_codes = {
        "ARG_PARSE_FAILURE": "HELPER_ARG_PARSE_FAILED",
        "STDIN_EMPTY": "HELPER_STDIN_EMPTY",
        "STDIN_READ_FAILURE": "HELPER_STDIN_READ_FAILED",
        "INPUT_JSON_PARSE_FAILURE": "HELPER_INPUT_JSON_PARSE_FAILED",
        "INPUT_SCHEMA_FAILURE": "HELPER_INPUT_SCHEMA_FAILED",
        "REQUIRED_FIELD_MISSING": "HELPER_REQUIRED_FIELD_MISSING",
        "FIELD_TYPE_INVALID": "HELPER_FIELD_TYPE_INVALID",
        "ENVIRONMENT_CONTRACT_FAILURE": "HELPER_ENVIRONMENT_CONTRACT_FAILED",
        "REQUEST_BUILD_FAILED": "HELPER_REQUEST_BUILD_FAILED",
        "REQUEST_POLICY_VERSION_MISSING": "HELPER_REQUEST_NORMALIZATION_FAILED",
        "REQUEST_POLICY_VERSION_TYPE_INVALID": "HELPER_REQUEST_NORMALIZATION_FAILED",
        "REQUEST_POLICY_VERSION_CONFLICT": "HELPER_REQUEST_NORMALIZATION_FAILED",
        "REQUEST_POLICY_VERSION_UNSUPPORTED": "HELPER_REQUEST_NORMALIZATION_FAILED",
        "REQUEST_SERIALIZATION_UNSUPPORTED_SHAPE": "HELPER_REQUEST_NORMALIZATION_FAILED",
        "LOCAL_CLIENT_SETUP_FAILURE": "HELPER_LOCAL_CLIENT_SETUP_FAILED",
        "ENTRYPOINT_EXCEPTION": "HELPER_ENTRYPOINT_EXCEPTION",
        "DIAGNOSTIC_STATE_INCONSISTENT": "HELPER_DIAGNOSTIC_STATE_INCONSISTENT",
        "PROVIDER_POLICY_RESPONSE_INVALID": "HELPER_PROVIDER_RESPONSE_INVALID",
    }
    if code in explicit_codes:
        return explicit_codes[code]
    if code in ("LOCAL_REQUEST_INVALID", "LOCAL_PRIVACY_GUARD"):
        return "HELPER_INPUT_INVALID"
    if code in ("REQUEST_RESOURCE_MISMATCH", "RESOURCE_VALIDATION_FAILED"):
        return "HELPER_RESOURCE_MISMATCH"
    if code in ("PROVIDER_POLICY_VERSION_MISSING", "PROVIDER_POLICY_ETAG_MISSING", "PROVIDER_POLICY_SCHEMA_INVALID"):
        return {"PROVIDER_POLICY_VERSION_MISSING": "HELPER_POLICY_VERSION_MISSING",
                "PROVIDER_POLICY_ETAG_MISSING": "HELPER_ETAG_MISSING",
                "PROVIDER_POLICY_SCHEMA_INVALID": "HELPER_POLICY_SCHEMA_INVALID"}[code]
    if status == 401:
        return "HELPER_PROVIDER_AUTH_FAILED"
    if status == 403:
        return "HELPER_PROVIDER_PERMISSION_DENIED"
    if status == 429:
        return "HELPER_PROVIDER_RATE_LIMIT"
    if status in (500, 502, 503, 504):
        return "HELPER_PROVIDER_SERVER_ERROR"
    if code == "PROVIDER_TIMEOUT":
        return "HELPER_PROVIDER_TIMEOUT"
    if code == "PROVIDER_NETWORK_ERROR":
        return "HELPER_PROVIDER_NETWORK_ERROR"
    if code == "PRESTATE_READ_FAILURE":
        return "HELPER_PROVIDER_TIMEOUT" if status is None else "HELPER_PROVIDER_NETWORK_ERROR"
    if code in ("LOCAL_CLIENT_SETUP_FAILURE", "LOCAL_REQUEST_INVALID"):
        return "HELPER_REQUEST_BUILD_FAILED"
    if code == "PYTHON_UNHANDLED_EXCEPTION":
        return "HELPER_UNHANDLED_EXCEPTION"
    policy_failures = {
        "PROVIDER_POLICY_NOT_MAPPING": "HELPER_POLICY_CANONICALIZATION_FAILED",
        "PROVIDER_POLICY_PROTOBUF_CONVERSION_FAILED": "HELPER_POLICY_CANONICALIZATION_FAILED",
        "PROVIDER_POLICY_DICT_CONVERSION_FAILED": "HELPER_POLICY_CANONICALIZATION_FAILED",
        "PROVIDER_POLICY_BINDINGS_INVALID": "HELPER_POLICY_BINDING_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_VERSION_INVALID": "HELPER_POLICY_VERSION_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_VERSION_MISSING": "HELPER_POLICY_VERSION_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_VERSION_TYPE_INVALID": "HELPER_POLICY_VERSION_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_VERSION_UNSUPPORTED": "HELPER_POLICY_VERSION_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY": "HELPER_POLICY_VERSION_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_VERSION_CONFLICT": "HELPER_POLICY_VERSION_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_ETAG_INVALID": "HELPER_POLICY_ETAG_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_CONDITION_INVALID": "HELPER_POLICY_BINDING_NORMALIZATION_FAILED",
        "PROVIDER_POLICY_UNSUPPORTED_VALUE": "HELPER_POLICY_CANONICALIZATION_FAILED",
        "PROVIDER_POLICY_JSON_SERIALIZATION_FAILED": "HELPER_JSON_SERIALIZATION_FAILED",
        "PROVIDER_POLICY_CANONICALIZATION_BUG": "HELPER_POLICY_CANONICALIZATION_FAILED",
        "POLICY_SERIALIZATION_FAILED": "HELPER_POLICY_CANONICALIZATION_FAILED",
        "PROVIDER_POLICY_NORMALIZATION_FAILED": "HELPER_POLICY_CANONICALIZATION_FAILED",
    }
    if code in policy_failures:
        return policy_failures[code]
    return "HELPER_UNKNOWN"


def emit(value, exit_code=0):
    if isinstance(value, dict):
        phase_index = PHASES.index(_phase) if _phase in PHASES else 0
        value.setdefault("transportLifecycle", {
            "lastCompletedPhase": _phase if value.get("ok") is True else (PHASES[phase_index - 1] if phase_index > 0 else None),
            "failedPhase": None if value.get("ok") is True else _phase,
            "providerRequestPrepared": _provider_request_prepared,
            "providerRequestStarted": _provider_request_started,
            "providerResponseReceived": _provider_response_received,
            "httpStatusKnown": isinstance(_http_status, int),
            "httpStatus": _http_status if isinstance(_http_status, int) else None,
        })
        if not lifecycle_is_consistent(value.get("transportLifecycle")):
            value = {
                "schema": SCHEMA, "ok": False, "code": "DIAGNOSTIC_STATE_INCONSISTENT",
                "failure": {"code": helper_failure_code("DIAGNOSTIC_STATE_INCONSISTENT", None), "helperCode": "DIAGNOSTIC_STATE_INCONSISTENT",
                            "phase": _phase, "providerRequestStarted": _provider_request_started,
                            "providerResponseReceived": _provider_response_received,
                            "httpStatus": _http_status if isinstance(_http_status, int) else None},
                "transportLifecycle": {
                    "lastCompletedPhase": PHASES[PHASES.index(_phase) - 1] if PHASES.index(_phase) > 0 else None,
                    "failedPhase": _phase, "providerRequestPrepared": _provider_request_prepared,
                    "providerRequestStarted": _provider_request_started,
                    "providerResponseReceived": _provider_response_received,
                    "httpStatusKnown": isinstance(_http_status, int),
                    "httpStatus": _http_status if isinstance(_http_status, int) else None,
                },
                "requestStarted": _provider_request_started, "remoteRequestStarted": _provider_request_started,
                "prestateReadCompleted": _provider_response_received, "setAttempted": False,
            }
            exit_code = 2
        lifecycle = value["transportLifecycle"]
        failure = value.get("failure") if isinstance(value.get("failure"), dict) else {}
        raw_failure_code = failure.get("helperCode") or value.get("code")
        failure_code = raw_failure_code if isinstance(raw_failure_code, str) and re.fullmatch(r"[A-Z0-9_-]{1,96}", raw_failure_code) else "HELPER_UNKNOWN"
        safe_input = _request_body_diagnostic if isinstance(_request_body_diagnostic, dict) else {}
        safe_diagnostics = {key: safe_input[key] for key in (
            "requestBuildState", "serializationShape", "requestedPolicyVersionPresent",
            "requestedPolicyVersionType", "requestedPolicyVersionValue", "resourcePresent",
            "resourceMatch", "exceptionCategory") if key in safe_input
            and (safe_input[key] is None or isinstance(safe_input[key], (str, bool, int)))}
        value["helperExecution"] = {
            "schemaVersion": "myweb.g2b.helper-execution.v1",
            "success": value.get("ok") is True,
            "lastCompletedPhase": lifecycle.get("lastCompletedPhase"),
            "failedPhase": lifecycle.get("failedPhase"),
            "failureCode": None if value.get("ok") is True else failure_code,
            "requestBuilt": _provider_request_prepared,
            "providerRequestPrepared": _provider_request_prepared,
            "providerRequestStarted": _provider_request_started,
            "providerResponseReceived": _provider_response_received,
            "policyExtracted": value.get("ok") is True and isinstance(value.get("policy"), dict),
            "requestMetadataAvailable": isinstance(value.get("requestMetadata") or _request_metadata, dict),
            "safeDiagnostics": safe_diagnostics,
        }
    try:
        serialized = json.dumps(value, separators=(",", ":"), sort_keys=True, allow_nan=False)
    except (TypeError, ValueError, RecursionError):
        global _serialization_stage
        _serialization_stage = "ENVELOPE_JSON_ENCODING"
        serialized = json.dumps({
            "schema": SCHEMA, "ok": False, "code": "PROVIDER_POLICY_JSON_SERIALIZATION_FAILED",
            "failure": {"code": "HELPER_JSON_SERIALIZATION_FAILED",
                        "helperCode": "PROVIDER_POLICY_JSON_SERIALIZATION_FAILED",
                        "phase": _phase, "providerRequestStarted": _provider_request_started,
                        "providerResponseReceived": _provider_response_received,
                        "httpStatus": _http_status if isinstance(_http_status, int) else None},
            "transportLifecycle": {"lastCompletedPhase": ("PHASE_07_PROVIDER_RESPONSE_RECEIVED" if _provider_response_received
                                    else PHASES[PHASES.index(_phase) - 1] if PHASES.index(_phase) > 0 else None),
                                   "failedPhase": _phase, "providerRequestPrepared": _provider_request_prepared,
                                   "providerRequestStarted": _provider_request_started,
                                   "providerResponseReceived": _provider_response_received,
                                   "httpStatusKnown": isinstance(_http_status, int),
                                   "httpStatus": _http_status if isinstance(_http_status, int) else None},
            "requestStarted": _provider_request_started, "remoteRequestStarted": _provider_request_started,
            "prestateReadCompleted": _provider_response_received, "setAttempted": False,
            "failureMetadata": {"failureStage": "AFTER_HTTP_RESPONSE" if _provider_response_received else "BEFORE_HTTP_SEND",
                                "httpStatusClass": "2XX" if _http_status == 200 else "UNKNOWN",
                                "httpStatusCodeSafe": _http_status if isinstance(_http_status, int) else "NOT_OBSERVED",
                                "safeProviderErrorIdentifier": f"HTTP_{_http_status}" if isinstance(_http_status, int) else "NOT_AVAILABLE",
                                "transportExceptionClassSafe": "RESPONSE_PARSE_FAILURE"},
            "serializationMetadata": {"serializationStage": "ENVELOPE_JSON_ENCODING",
                                      "policyObjectType": _policy_object_type,
                                      "canonicalizationStage": _canonicalization_stage},
        }, separators=(",", ":"), sort_keys=True)
        exit_code = 2
    sys.stdout.write(serialized)
    raise SystemExit(exit_code)


def safe_status(status):
    if status in (200, 400, 401, 403, 404, 409, 412, 429, 500, 502, 503, 504):
        return status, f"{status // 100}XX", f"HTTP_{status}"
    return "NOT_OBSERVED", "UNKNOWN", "NOT_AVAILABLE"


def fail(code, stage="BEFORE_HTTP_SEND", exception_class="NONE", status=None,
         request_started=False, prestate_complete=False, set_attempted=False,
         request_metadata=None, policy_object_type=None, canonicalization_stage=None,
         serialization_stage=None, version_diagnostic=None, response_field_diagnostic=None, response_shape=None,
         extraction_path=None):
    global _provider_request_started, _provider_response_received, _http_status, _request_metadata, _failed_phase
    _provider_request_started = _provider_request_started or request_started
    _provider_response_received = _provider_response_received or (status is not None and request_started)
    _http_status = status if isinstance(status, int) else _http_status
    _request_metadata = request_metadata or _request_metadata
    if stage == "AFTER_HTTP_RESPONSE" or (status is not None and request_started):
        set_phase("PHASE_08_HELPER_SERIALIZATION")
    elif stage == "DURING_HTTP_SEND":
        set_phase("PHASE_06_PROVIDER_REQUEST_STARTED")
    elif stage == "BEFORE_HTTP_SEND" and _provider_request_prepared:
        set_phase("PHASE_05_PROVIDER_REQUEST_PREPARED")
    if _failed_phase is None:
        _failed_phase = _phase
    status_code, status_class, provider_identifier = safe_status(status)
    mapped_code = helper_failure_code(code, status)
    safe_exception = exception_class if exception_class in (
        "NONE", "LOCAL_CREDENTIAL_FAILURE", "LOCAL_CLIENT_SETUP_FAILURE",
        "REMOTE_REQUEST_EXCEPTION", "RESPONSE_PARSE_FAILURE", "PRIVACY_GUARD_FAILURE") else "LOCAL_CLIENT_SETUP_FAILURE"
    lifecycle = {
        "lastCompletedPhase": ("PHASE_07_PROVIDER_RESPONSE_RECEIVED" if _provider_response_received
                               else "PHASE_05_PROVIDER_REQUEST_PREPARED" if _provider_request_prepared
                               else PHASES[PHASES.index(_phase) - 1] if PHASES.index(_phase) > 0 else None),
        "failedPhase": _phase,
        "providerRequestPrepared": _provider_request_prepared,
        "providerRequestStarted": _provider_request_started,
        "providerResponseReceived": _provider_response_received,
        "httpStatusKnown": isinstance(_http_status, int),
        "httpStatus": _http_status if isinstance(_http_status, int) else None,
    }
    emit({
        "schema": SCHEMA,
        "ok": False,
        "code": code,
        "failure": {"code": mapped_code, "helperCode": code, "phase": _phase,
                    "providerRequestStarted": _provider_request_started,
                    "providerResponseReceived": _provider_response_received,
                    "httpStatus": _http_status if isinstance(_http_status, int) else None,
                    "exceptionType": safe_exception if safe_exception != "NONE" else None},
        "transportLifecycle": lifecycle,
        "requestStarted": request_started,
        "remoteRequestStarted": request_started,
        "prestateReadCompleted": prestate_complete,
        "setAttempted": set_attempted,
         **({"requestMetadata": request_metadata or _request_metadata} if request_metadata is not None or _request_metadata is not None else {}),
        "failureMetadata": {
            "failureStage": stage,
            "httpStatusClass": status_class,
            "httpStatusCodeSafe": status_code,
            "safeProviderErrorIdentifier": provider_identifier,
            "transportExceptionClassSafe": safe_exception,
            "policyObjectType": policy_object_type or _policy_object_type,
            "canonicalizationStage": canonicalization_stage or _canonicalization_stage,
            "serializationStage": serialization_stage or _serialization_stage,
            **({"versionDiagnostic": version_diagnostic} if isinstance(version_diagnostic, dict) else {}),
            **({"responseFieldDiagnostic": response_field_diagnostic} if isinstance(response_field_diagnostic, dict) else {}),
            **({"policyExtractionPath": extraction_path} if isinstance(extraction_path, str) else {}),
            **({"providerResponseShape": response_shape} if isinstance(response_shape, dict) else {}),
            **({"inputContract": _input_contract_diagnostic}
               if isinstance(_input_contract_diagnostic, dict) else {}),
        },
    }, 2)


def fresh(credential):
    token = getattr(credential, "token", None) or getattr(credential, "access_token", None)
    expiry = getattr(credential, "expiry", None) or getattr(credential, "token_expiry", None)
    if not isinstance(token, str) or not token or expiry is None:
        return False
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=datetime.timezone.utc)
    return expiry > datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=2)


def readiness(credential):
    """Return only bounded local readiness metadata; never refresh or send HTTP."""
    token = getattr(credential, "token", None) or getattr(credential, "access_token", None)
    expiry = getattr(credential, "expiry", None) or getattr(credential, "token_expiry", None)
    token_present = isinstance(token, str) and bool(token)
    if expiry is None:
        return token_present, False, False, "UNKNOWN", "CACHED_CREDENTIAL_METADATA_INVALID"
    if not isinstance(expiry, datetime.datetime):
        return token_present, True, False, "UNKNOWN", "CACHED_CREDENTIAL_METADATA_INVALID"
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=datetime.timezone.utc)
    now = datetime.datetime.now(datetime.timezone.utc)
    if expiry <= now:
        return token_present, True, True, "EXPIRED", "CACHED_CREDENTIAL_EXPIRED_CONFIRMED"
    if expiry <= now + datetime.timedelta(minutes=2):
        return token_present, True, True, "TOO_CLOSE_TO_EXPIRY", "CACHED_CREDENTIAL_TOO_CLOSE_TO_EXPIRY"
    if not token_present:
        return False, True, True, "FRESH", "CACHED_CREDENTIAL_MISSING"
    return True, True, True, "FRESH", "CACHED_CREDENTIAL_READY_CONFIRMED"


def refresh_ready(credential, refresh_function):
    required = ("_refresh_token", "_token_uri", "_client_id", "_client_secret")
    return callable(getattr(credential, "refresh", None)) and callable(refresh_function) and all(
        isinstance(getattr(credential, field, None), str) and getattr(credential, field, None)
        for field in required)


def valid_policy(policy):
    if not isinstance(policy, dict) or set(policy) - {"bindings", "etag", "version", "auditConfigs"}:
        return False
    if not isinstance(policy.get("bindings"), list) or not isinstance(policy.get("etag"), str) or not policy["etag"]:
        return False
    if "version" in policy and policy["version"] is not None and (type(policy["version"]) is not int or policy["version"] not in (0, 1, 3)):
        return False
    if "auditConfigs" in policy and not isinstance(policy["auditConfigs"], list):
        return False
    for binding in policy["bindings"]:
        if not isinstance(binding, dict) or set(binding) - {"role", "members", "condition"}:
            return False
    if policy.get("version") is None and any(
            "condition" in binding or "_withcond_" in binding.get("role", "").lower()
            for binding in policy["bindings"]):
        return False
        if not isinstance(binding.get("role"), str) or not isinstance(binding.get("members"), list):
            return False
        if not all(isinstance(item, str) and item for item in binding["members"]):
            return False
        if "condition" in binding and (not isinstance(binding["condition"], dict)
                                      or set(binding["condition"]) - {"expression", "title", "description", "location"}
                                      or not all(isinstance(value, str) for value in binding["condition"].values())):
            return False
    for audit_config in policy.get("auditConfigs", []):
        if (not isinstance(audit_config, dict) or set(audit_config) - {"service", "auditLogConfigs"}
                or not isinstance(audit_config.get("service"), str)
                or not isinstance(audit_config.get("auditLogConfigs"), list)):
            return False
        for log_config in audit_config["auditLogConfigs"]:
            if (not isinstance(log_config, dict) or set(log_config) - {"logType", "exemptedMembers"}
                    or not isinstance(log_config.get("logType"), str)
                    or ("exemptedMembers" in log_config
                        and (not isinstance(log_config["exemptedMembers"], list)
                             or not all(isinstance(item, str) and item for item in log_config["exemptedMembers"])))):
                return False
    return True


def build_set_iam_policy_request(messages, dict_to_message, resource, policy, version_state):
    """Build the actual Apitools request without inferring or materializing a version."""
    if not valid_policy(policy):
        raise ValueError("set-policy-shape-invalid")
    version = policy.get("version")
    if version_state == "UNSET":
        if "version" not in policy or version is not None or any("condition" in binding
                                      or "_withcond_" in binding.get("role", "").lower()
                                      for binding in policy["bindings"]):
            raise ValueError("unset-version-condition-contract-invalid")
        policy_payload = dict(policy)
        policy_payload.pop("version", None)
    elif version_state == "EXPLICIT" and type(version) is int and version in (0, 1, 3):
        policy_payload = dict(policy)
    else:
        raise ValueError("set-policy-version-state-invalid")
    policy_message = dict_to_message(policy_payload, messages.Policy)
    request = messages.IamProjectsServiceAccountsSetIamPolicyRequest(
        resource=resource,
        setIamPolicyRequest=messages.SetIamPolicyRequest(policy=policy_message))
    return request, policy_message


def _object_category(value):
    if isinstance(value, dict):
        return "DICT"
    if isinstance(value, Mapping):
        return "MAPPING"
    if value is None:
        return "NONE"
    value_type = type(value)
    module = getattr(value_type, "__module__", "")
    name = getattr(value_type, "__name__", "")
    return "MESSAGE" if (hasattr(value, "_pb") or hasattr(value, "DESCRIPTOR")
                          or (module.startswith(("apitools.", "google.", "googlecloudsdk.generated_clients."))
                              and ("Message" in name or "Policy" in name))) else "OBJECT"


def _attribute_mapping(value, fields):
    result = {}
    aliases = {"auditConfigs": "audit_configs", "auditLogConfigs": "audit_log_configs",
               "exemptedMembers": "exempted_members", "logType": "log_type"}
    for field in fields:
        alias = aliases.get(field)
        if hasattr(value, field):
            result[field] = getattr(value, field)
        elif alias and hasattr(value, alias):
            result[field] = getattr(value, alias)
    return result


def _shape_mapping(value, fields, stage):
    if isinstance(value, Mapping):
        shaped = dict(value)
        aliases = {"audit_configs": "auditConfigs", "audit_log_configs": "auditLogConfigs",
                   "log_type": "logType", "exempted_members": "exemptedMembers"}
        for source, target in aliases.items():
            if source in shaped and target not in shaped:
                shaped[target] = shaped.pop(source)
        return shaped
    extracted = _attribute_mapping(value, fields)
    if extracted:
        return extracted
    raise PolicyNormalizationError("PROVIDER_POLICY_UNSUPPORTED_VALUE", stage)


def _plain_json_value(value, *, seen=None, path="policy"):
    seen = seen if seen is not None else set()
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if not (value == value and abs(value) != float("inf")):
            raise PolicyNormalizationError("PROVIDER_POLICY_UNSUPPORTED_VALUE", path)
        return value
    if isinstance(value, bytes):
        raise PolicyNormalizationError("PROVIDER_POLICY_UNSUPPORTED_VALUE", path)
    if isinstance(value, (Mapping, list, tuple)):
        identity = id(value)
        if identity in seen:
            raise PolicyNormalizationError("PROVIDER_POLICY_UNSUPPORTED_VALUE", "CIRCULAR_VALUE")
        seen.add(identity)
        try:
            if isinstance(value, Mapping):
                if not all(isinstance(key, str) for key in value):
                    raise PolicyNormalizationError("PROVIDER_POLICY_UNSUPPORTED_VALUE", path)
                return {key: _plain_json_value(item, seen=seen, path=path) for key, item in value.items()}
            return [_plain_json_value(item, seen=seen, path=path) for item in value]
        finally:
            seen.remove(identity)
    raise PolicyNormalizationError("PROVIDER_POLICY_UNSUPPORTED_VALUE", path)


def _policy_mapping(response, message_to_dict):
    if isinstance(response, Mapping):
        return dict(response), "MAPPING_KEY"
    if callable(message_to_dict):
        try:
            converted = message_to_dict(response)
        except Exception as error:
            code = "PROVIDER_POLICY_PROTOBUF_CONVERSION_FAILED" if _object_category(response) == "MESSAGE" else "PROVIDER_POLICY_DICT_CONVERSION_FAILED"
            raise PolicyNormalizationError(code, "MESSAGE_TO_DICT") from error
        if isinstance(converted, Mapping):
            result = dict(converted)
            source = "MESSAGE_TO_DICT"
            if _object_category(response) == "MESSAGE":
                try:
                    direct_version = getattr(response, "version")
                except (AttributeError, ValueError, TypeError):
                    pass
                else:
                    if "version" in result and (type(result["version"]) is not type(direct_version)
                                               or result["version"] != direct_version):
                        raise PolicyNormalizationError("PROVIDER_POLICY_VERSION_CONFLICT", "VERSION_SOURCE_CONFLICT")
                    result["version"] = direct_version
                    source = "MESSAGE_ATTRIBUTE"
                for field in ("etag", "bindings", "auditConfigs"):
                    if field not in result and hasattr(response, field):
                        result[field] = getattr(response, field)
            return result, source
        if converted is not None:
            raise PolicyNormalizationError("PROVIDER_POLICY_DICT_CONVERSION_FAILED", "MESSAGE_TO_DICT_RESULT")
    extracted = _attribute_mapping(response, ("version", "etag", "bindings", "auditConfigs", "resource"))
    if extracted:
        return extracted, "MESSAGE_ATTRIBUTE" if "version" in extracted else "MISSING"
    raise PolicyNormalizationError("PROVIDER_POLICY_NOT_MAPPING", "TOP_LEVEL_SHAPE")


SAFE_PROVIDER_KEYS = frozenset(("version", "etag", "bindings", "auditConfigs", "audit_configs", "policy", "response", "result", "data", "error"))
POLICY_KEYS = frozenset(("version", "etag", "bindings", "auditConfigs", "audit_configs"))


def _safe_primitive_type(value):
    if value is None:
        return "NULL", None
    if type(value) is bool:
        return "BOOLEAN", value
    if type(value) is int:
        return "INTEGER", value if abs(value) <= 1000 else None
    if type(value) is float:
        return "FLOAT", value if abs(value) <= 1000 else None
    if isinstance(value, str):
        return "STRING", value if len(value) <= 8 and value.isascii() and value.isdigit() else None
    return "OTHER", None


def _response_object_type(value):
    if isinstance(value, Mapping):
        return "MAPPING"
    if _object_category(value) == "MESSAGE":
        return "MESSAGE"
    if value is None or isinstance(value, (str, int, float, bool, list, tuple)):
        return type(value).__name__.upper()
    return "OBJECT"


def _is_installed_apitools_iam_policy(value):
    module_name = "googlecloudsdk.generated_clients.apis.iam.v1.iam_v1_messages"
    messages = sys.modules.get(module_name)
    policy_class = getattr(messages, "Policy", None) if messages is not None else None
    return (policy_class is not None and type(value) is policy_class
            and type(value).__module__ == module_name)


def _apitools_bindings_state(response, policy):
    if not _is_installed_apitools_iam_policy(response):
        return "NOT_APITOOLS_POLICY"
    try:
        bindings = getattr(response, "bindings")
    except (AttributeError, TypeError, ValueError):
        return "MISSING"
    if bindings is None:
        return "UNSET"
    try:
        count = len(bindings)
    except (TypeError, ValueError):
        return "INVALID"
    return "UNSET" if count == 0 else "PRESENT"


def _safe_response_shape(response, extraction_path, extraction_result, policy=None):
    root = response if isinstance(response, Mapping) else {}
    keys = set(key for key in root if isinstance(key, str))
    root_version_type, root_version_value = _safe_primitive_type(root.get("version")) if "version" in root else ("MISSING", None)
    nested = root.get("policy") if isinstance(root.get("policy"), Mapping) else None
    nested_version_present = nested is not None and "version" in nested
    nested_version_type = _safe_primitive_type(nested.get("version"))[0] if nested_version_present else "MISSING"
    return {
        "providerResponseObjectType": _response_object_type(response),
        "providerResponseObjectModule": type(response).__module__ if isinstance(type(response).__module__, str) else "UNKNOWN",
        "providerResponseObjectClass": type(response).__name__ if isinstance(type(response).__name__, str) else "UNKNOWN",
        "providerResponseWrapperType": {
            "DIRECT_POLICY_MAPPING": "DIRECT_POLICY",
            "KNOWN_PROVIDER_WRAPPER_POLICY": "KNOWN_PROVIDER_WRAPPER",
            "SDK_POLICY_MESSAGE": "SDK_POLICY_MESSAGE",
        }.get(extraction_path, "UNKNOWN"),
        "providerResponseIsMapping": isinstance(response, Mapping),
        "providerResponseIsMessageLike": getattr(response, "DESCRIPTOR", None) is not None,
        "providerResponseTopLevelKeyCount": len(keys),
        "providerResponseSafeTopLevelKeys": sorted(keys & SAFE_PROVIDER_KEYS),
        "unknownKeyCount": len(keys - SAFE_PROVIDER_KEYS),
        "hasRootVersion": "version" in root,
        "hasRootEtag": "etag" in root,
        "hasRootBindings": "bindings" in root,
        "hasRootPolicy": "policy" in root,
        "hasRootResponse": "response" in root,
        "hasRootResult": "result" in root,
        "hasRootData": "data" in root,
        "rootVersionType": root_version_type,
        "rootVersionPrimitiveValue": root_version_value,
        "nestedPolicyPresent": nested is not None,
        "nestedPolicyVersionPresent": nested_version_present,
        "nestedPolicyVersionType": nested_version_type,
        "policyExtractionPath": extraction_path,
        "policyExtractionResult": extraction_result,
        "extractedPolicyObjectType": _response_object_type(policy) if policy is not None else "UNKNOWN",
    }


def extract_provider_policy(response, message_to_dict, wrapper_contract=None):
    """Extract only a direct policy or an explicitly named, one-level wrapper."""
    if isinstance(response, Mapping):
        if set(response) & POLICY_KEYS:
            return dict(response), "DIRECT_POLICY_MAPPING", "MAPPING_KEY", _safe_response_shape(response, "DIRECT_POLICY_MAPPING", "EXTRACTED", response), dict(response)
        if wrapper_contract in ("policy", "response", "result", "data") and isinstance(response.get(wrapper_contract), Mapping):
            nested = response[wrapper_contract]
            if set(nested) & POLICY_KEYS:
                return dict(nested), "KNOWN_PROVIDER_WRAPPER_POLICY", "MAPPING_KEY", _safe_response_shape(response, "KNOWN_PROVIDER_WRAPPER_POLICY", "EXTRACTED", nested), dict(nested)
        return None, "UNKNOWN_WRAPPER_OR_NON_POLICY_MAPPING", "MISSING", _safe_response_shape(response, "UNKNOWN_WRAPPER_OR_NON_POLICY_MAPPING", "BLOCKED"), None
    if callable(message_to_dict):
        try:
            converted = message_to_dict(response)
        except Exception as error:
            code = "PROVIDER_POLICY_PROTOBUF_CONVERSION_FAILED" if _response_object_type(response) == "MESSAGE" else "PROVIDER_POLICY_DICT_CONVERSION_FAILED"
            raise PolicyNormalizationError(code, "MESSAGE_TO_DICT") from error
        if isinstance(converted, Mapping) and set(converted) & POLICY_KEYS:
            policy, version_source = _policy_mapping(response, lambda _value: converted)
            return policy, "SDK_POLICY_MESSAGE", version_source, _safe_response_shape(response, "SDK_POLICY_MESSAGE", "EXTRACTED", policy), dict(converted)
    policy, version_source = _policy_mapping(response, message_to_dict)
    return policy, "SDK_POLICY_MESSAGE", version_source, _safe_response_shape(response, "SDK_POLICY_MESSAGE", "EXTRACTED", policy), None


def safe_policy_field_diagnostic(response, converted, policy, message_to_dict):
    """Record only bounded response shape metadata, never the policy or ETag."""
    proto_present = False
    proto_value = None
    direct_etag = None
    direct_etag_present = False
    descriptor_type = "MISSING"
    has_presence = None
    default_value = None
    listed_in_fields = None
    dict_defaults_present = False
    dict_defaults_value = None
    if not isinstance(response, Mapping) and _object_category(response) == "MESSAGE":
        try:
            proto_value = getattr(response, "version")
            proto_present = True
        except (AttributeError, ValueError, TypeError):
            pass
        try:
            direct_etag = getattr(response, "etag")
            direct_etag_present = True
        except (AttributeError, ValueError, TypeError):
            pass
        try:
            protobuf_message = getattr(response, "_pb", response)
            descriptor = getattr(protobuf_message, "DESCRIPTOR", None)
            if descriptor is not None:
                version_field = descriptor.fields_by_name.get("version")
                descriptor_type = getattr(version_field, "type", "OTHER") if version_field else "MISSING"
            else:
                fields = getattr(protobuf_message, "all_fields", None)
                version_field = next((field for field in fields() if getattr(field, "name", None) == "version"), None) if callable(fields) else None
                variant = getattr(version_field, "variant", None) if version_field else None
                variant_name = getattr(variant, "name", None)
                descriptor_type = variant_name if isinstance(variant_name, str) else variant if isinstance(variant, str) else getattr(variant, "__name__", "OTHER") if variant else "MISSING"
            if version_field is not None:
                has_presence = getattr(version_field, "has_presence", None)
                default_value = getattr(version_field, "default_value", None)
            list_fields = getattr(protobuf_message, "ListFields", None)
            listed_in_fields = any(field is version_field for field, _value in list_fields()) if version_field and callable(list_fields) else None
        except (AttributeError, TypeError, ValueError):
            pass
        if callable(message_to_dict):
            try:
                kwargs = {"always_print_fields_with_no_presence": True}
                protobuf_message = locals().get("protobuf_message", response)
                try:
                    defaults_converted = message_to_dict(protobuf_message, **kwargs)
                except TypeError:
                    defaults_converted = message_to_dict(protobuf_message, including_default_value_fields=True)
                if isinstance(defaults_converted, Mapping) and "version" in defaults_converted:
                    dict_defaults_present = True
                    dict_defaults_value = defaults_converted.get("version")
            except Exception:
                pass
    dict_present = isinstance(converted, Mapping) and "version" in converted
    dict_value = converted.get("version") if dict_present else None
    proto_type, proto_safe = _safe_primitive_type(proto_value) if proto_present else ("MISSING", None)
    dict_type, dict_safe = _safe_primitive_type(dict_value) if dict_present else ("MISSING", None)
    defaults_type, defaults_safe = _safe_primitive_type(dict_defaults_value) if dict_defaults_present else ("MISSING", None)
    etag = policy.get("etag") if isinstance(policy, Mapping) else None
    etag_bytes = etag.encode("utf-8") if isinstance(etag, str) else etag if isinstance(etag, bytes) else None
    bindings = policy.get("bindings") if isinstance(policy, Mapping) else None
    conditions = sum(1 for item in bindings if isinstance(item, Mapping) and item.get("condition") is not None) if isinstance(bindings, (list, tuple)) else None
    marker = any(isinstance(item, Mapping) and isinstance(item.get("role"), str)
                 and "_withcond_" in item["role"] for item in bindings) if isinstance(bindings, (list, tuple)) else False
    apitools_policy_verified = _is_installed_apitools_iam_policy(response)
    apitools_bindings_state = _apitools_bindings_state(response, policy)
    direct_etag_bytes = (direct_etag if isinstance(direct_etag, bytes) else
                         direct_etag.encode("utf-8") if isinstance(direct_etag, str) else None)
    direct_etag_type = ("MISSING" if not direct_etag_present else "NULL" if direct_etag is None else
                        "BYTES" if isinstance(direct_etag, bytes) else "STRING" if isinstance(direct_etag, str) else "OTHER")
    return {"apitoolsPolicyClassVerified": apitools_policy_verified,
            "apitoolsBindingsState": apitools_bindings_state,
            "apitoolsDirectEtagPresent": direct_etag_present,
            "apitoolsDirectEtagType": direct_etag_type,
            "apitoolsDirectEtagSha256": hashlib.sha256(direct_etag_bytes).hexdigest() if direct_etag_bytes else None,
            "protobufVersionFieldPresent": proto_present, "protobufVersionType": proto_type,
            "protobufVersionValue": proto_safe, "messageToDictVersionPresent": dict_present,
            "apitoolsDirectVersionType": proto_type,
            "apitoolsDirectVersionValue": proto_safe,
            "versionDirectPresent": proto_present, "versionDirectType": proto_type,
            "versionDirectValue": proto_safe,
            "messageToDictVersionType": dict_type, "messageToDictVersionValue": dict_safe,
            "versionDescriptorType": descriptor_type, "versionHasPresence": has_presence,
            "versionDefaultValue": default_value if type(default_value) in (int, bool, str) else None,
            "versionListedInListFields": listed_in_fields,
            "messageToDictDefaultsVersionPresent": dict_defaults_present,
            "messageToDictDefaultsVersionType": defaults_type,
            "messageToDictDefaultsVersionValue": defaults_safe,
            "etagPresent": isinstance(etag, (str, bytes)) and bool(etag),
            "etagType": "STRING" if isinstance(etag, str) else "BYTES" if isinstance(etag, bytes) else "OTHER",
            "etagSha256": hashlib.sha256(etag_bytes).hexdigest() if etag_bytes else None,
            "bindingsPresent": isinstance(bindings, (list, tuple)),
            "bindingsCount": len(bindings) if isinstance(bindings, (list, tuple)) else None,
            "conditionBindingCount": conditions, "conditionCount": conditions,
            "withcondMarkerCount": sum(1 for item in bindings if isinstance(item, Mapping)
                and isinstance(item.get("role"), str) and "_withcond_" in item["role"])
                if isinstance(bindings, (list, tuple)) else None,
            "conditionsPresent": conditions is not None and conditions > 0,
            "withcondRoleMarkerPresent": marker}


def normalize_get_iam_policy_request_body(body):
    if not isinstance(body, Mapping) or set(body) - {"resource", "options", "options.requestedPolicyVersion"}:
        raise PolicyNormalizationError("REQUEST_SERIALIZATION_UNSUPPORTED_SHAPE", "REQUEST_BODY_VALIDATION")
    if body.get("resource") != RESOURCE:
        raise PolicyNormalizationError("REQUEST_RESOURCE_MISMATCH", "REQUEST_BODY_VALIDATION")
    nested_present = "options" in body
    flat_present = "options.requestedPolicyVersion" in body
    if not nested_present and not flat_present:
        raise PolicyNormalizationError("REQUEST_POLICY_VERSION_MISSING", "REQUEST_BODY_VALIDATION")
    if nested_present:
        options = body["options"]
        if not isinstance(options, Mapping):
            raise PolicyNormalizationError("REQUEST_POLICY_VERSION_TYPE_INVALID", "REQUEST_BODY_VALIDATION")
        if set(options) != {"requestedPolicyVersion"}:
            code = "REQUEST_POLICY_VERSION_MISSING" if "requestedPolicyVersion" not in options else "REQUEST_SERIALIZATION_UNSUPPORTED_SHAPE"
            raise PolicyNormalizationError(code, "REQUEST_BODY_VALIDATION")
        nested_value = options["requestedPolicyVersion"]
        if type(nested_value) is not int:
            raise PolicyNormalizationError("REQUEST_POLICY_VERSION_TYPE_INVALID", "REQUEST_BODY_VALIDATION")
    if flat_present:
        flat_value = body["options.requestedPolicyVersion"]
        if type(flat_value) is not int:
            raise PolicyNormalizationError("REQUEST_POLICY_VERSION_TYPE_INVALID", "REQUEST_BODY_VALIDATION")
    if nested_present and flat_present and nested_value != flat_value:
        raise PolicyNormalizationError("REQUEST_POLICY_VERSION_CONFLICT", "REQUEST_BODY_VALIDATION")
    version = nested_value if nested_present else flat_value
    if version != 3:
        raise PolicyNormalizationError("REQUEST_POLICY_VERSION_UNSUPPORTED", "REQUEST_BODY_VALIDATION")
    return {"normalizedRequestedPolicyVersion": version, "normalizedTargetResource": body["resource"],
            "shape": "BOTH_EQUIVALENT" if nested_present and flat_present else "SHAPE_A_NESTED" if nested_present else "SHAPE_B_EXPLICIT_FLAT",
            "nestedKeyPresent": nested_present, "flatDottedKeyPresent": flat_present}


def _safe_request_value(value):
    if value is None or type(value) in (bool, int):
        return value
    if isinstance(value, str) and len(value) <= 16 and all(ord(char) >= 32 for char in value):
        return value
    return None


def _request_body_summary(body):
    if not isinstance(body, Mapping):
        return {"serializationShape": "UNSUPPORTED", "resourcePresent": False, "resourceMatch": False,
                "requestedPolicyVersionPresent": False, "requestedPolicyVersionType": "MISSING",
                "requestedPolicyVersionValue": None}
    nested_present = "options" in body
    flat_present = "options.requestedPolicyVersion" in body
    nested = body.get("options")
    nested_version_present = isinstance(nested, Mapping) and "requestedPolicyVersion" in nested
    version_present = nested_version_present or flat_present
    raw = nested.get("requestedPolicyVersion") if nested_version_present else body.get("options.requestedPolicyVersion")
    value_type = ("BOOLEAN" if type(raw) is bool else "INTEGER" if type(raw) is int else "STRING" if isinstance(raw, str)
                  else "NULL" if raw is None else "FLOAT" if type(raw) is float else "OTHER") if version_present else "MISSING"
    return {"serializationShape": "BOTH_PRESENT" if nested_present and flat_present else "SHAPE_A_NESTED" if nested_present
            else "SHAPE_B_EXPLICIT_FLAT" if flat_present else "MISSING",
            "resourcePresent": "resource" in body, "resourceMatch": body.get("resource") == RESOURCE,
            "requestedPolicyVersionPresent": version_present, "requestedPolicyVersionType": value_type,
            "requestedPolicyVersionValue": _safe_request_value(raw)}


def build_get_iam_policy_request(messages, message_to_dict):
    global _request_body_diagnostic
    request = messages.IamProjectsServiceAccountsGetIamPolicyRequest(
        resource=RESOURCE, options_requestedPolicyVersion=3)
    body = message_to_dict(request)
    _request_body_diagnostic = _request_body_summary(body)
    normalized = normalize_get_iam_policy_request_body(body)
    _request_body_diagnostic.update({"requestedPolicyVersion": normalized["normalizedRequestedPolicyVersion"],
                                     "requestBodyOptionsVersionValidated": True,
                                     "serializationShape": normalized["shape"]})
    return request, _request_body_diagnostic


def version_failure_reason(diagnostic):
    kind = diagnostic.get("versionRawType")
    return {"MISSING": "MISSING", "NULL": "NULL", "BOOLEAN": "BOOLEAN_NOT_INTEGER",
            "FLOAT": "FLOAT_NOT_INTEGER", "STRING": "STRING_COERCION_NOT_ALLOWED",
            "INTEGER": "INTEGER_NOT_ALLOWED", "OTHER": "UNSUPPORTED_TYPE"}.get(kind, "MISSING")


def safe_version_diagnostic(policy, source, allowed_set=(0, 1, 3)):
    present = isinstance(policy, Mapping) and "version" in policy
    value = policy.get("version") if present else None
    if not present:
        kind = "MISSING"
    elif value is None:
        kind = "NULL"
    elif type(value) is bool:
        kind = "BOOLEAN"
    elif type(value) is int:
        kind = "INTEGER"
    elif type(value) is float:
        kind = "FLOAT"
    elif isinstance(value, str):
        kind = "STRING"
    else:
        kind = "OTHER"
    primitive = None
    if type(value) is int and abs(value) <= 1000:
        primitive = value
    elif isinstance(value, str) and len(value) <= 8 and value.isascii() and value.isdigit():
        primitive = value
    return {"versionFieldPresent": present, "versionRawType": kind,
            "versionRawPrimitiveValue": primitive,
            "versionAllowedSet": list(allowed_set),
            "versionNormalizationResult": "PENDING",
            "versionNormalizationFailureReason": "NONE",
            "versionSource": source if source in ("MAPPING_KEY", "MESSAGE_TO_DICT", "MESSAGE_ATTRIBUTE", "MISSING") else "MISSING"}


def canonical_provider_policy_result(response, message_to_dict, *, wrapper_contract=None, allow_generic_zero=True):
    """Return JSON-safe policy plus a safe, stage-specific failure category."""
    global _policy_object_type, _canonicalization_stage
    _policy_object_type = _object_category(response)
    _canonicalization_stage = "TOP_LEVEL_CONVERSION"
    try:
        policy, extraction_path, version_source, response_shape, converted = extract_provider_policy(
            response, message_to_dict, wrapper_contract=wrapper_contract)
        if policy is None:
            raise PolicyNormalizationError("PROVIDER_POLICY_NOT_MAPPING", "TOP_LEVEL_SHAPE")
        field_diag = safe_policy_field_diagnostic(response, converted, policy, message_to_dict)
        allowed_versions = (0, 1, 3)
        version_diag = safe_version_diagnostic(policy, version_source, allowed_set=allowed_versions)
        _canonicalization_stage = "FIELD_NORMALIZATION"
        if "resource" in policy:
            policy.pop("resource")
        if "audit_configs" in policy and "auditConfigs" not in policy:
            policy["auditConfigs"] = policy.pop("audit_configs")
        bindings = policy.get("bindings")
        if isinstance(bindings, (list, tuple)):
            normalized_bindings = []
            for binding in bindings:
                shaped = _shape_mapping(binding, ("role", "members", "condition"), "BINDING_SHAPE")
                if "condition" in shaped and shaped["condition"] is not None:
                    shaped["condition"] = _shape_mapping(shaped["condition"],
                        ("expression", "title", "description", "location"), "CONDITION_SHAPE")
                normalized_bindings.append(shaped)
            policy["bindings"] = normalized_bindings
        audit_configs = policy.get("auditConfigs")
        if isinstance(audit_configs, (list, tuple)):
            normalized_audits = []
            for config in audit_configs:
                shaped = _shape_mapping(config, ("service", "auditLogConfigs"), "AUDIT_CONFIG_SHAPE")
                configs = shaped.get("auditLogConfigs", shaped.get("audit_log_configs"))
                if isinstance(configs, (list, tuple)):
                    normalized_entries = []
                    for entry in configs:
                        normalized_entries.append(_shape_mapping(entry, ("logType", "exemptedMembers"), "AUDIT_LOG_CONFIG_SHAPE"))
                    shaped["auditLogConfigs"] = normalized_entries
                    shaped.pop("audit_log_configs", None)
                normalized_audits.append(shaped)
            policy["auditConfigs"] = normalized_audits
        if not version_diag["versionFieldPresent"]:
            raise PolicyNormalizationError("PROVIDER_POLICY_VERSION_MISSING", "VERSION_MISSING")
        unset_version = (version_source == "MESSAGE_ATTRIBUTE" and policy["version"] is None
                         and field_diag["versionDescriptorType"] == "INT32")
        if unset_version:
            version_state = "UNSET"
            version_value = None
        elif type(policy["version"]) is not int or policy["version"] not in allowed_versions:
            code = "PROVIDER_POLICY_VERSION_TYPE_INVALID" if type(policy["version"]) is not int else "PROVIDER_POLICY_VERSION_UNSUPPORTED"
            raise PolicyNormalizationError(code, "VERSION_VALUE")
        else:
            version_state = "EXPLICIT"
            version_value = policy["version"]
        if (field_diag["withcondRoleMarkerPresent"]
                or ((version_state == "UNSET" or version_value in (0, 1)) and field_diag["conditionsPresent"])):
            raise PolicyNormalizationError("PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY", "VERSION_CONDITIONS")
        etag = policy.get("etag")
        if isinstance(etag, bytes):
            try:
                etag = etag.decode("utf-8", errors="strict")
            except UnicodeDecodeError as error:
                raise PolicyNormalizationError("PROVIDER_POLICY_ETAG_INVALID", "ETAG_UTF8") from error
            policy["etag"] = etag
        if not isinstance(etag, str) or not etag or any(ord(char) < 0x20 or ord(char) == 0x7f for char in etag):
            raise PolicyNormalizationError("PROVIDER_POLICY_ETAG_INVALID", "ETAG_VALUE")
        policy = _plain_json_value(policy)
        if not isinstance(policy.get("bindings"), list):
            raise PolicyNormalizationError("PROVIDER_POLICY_BINDINGS_INVALID", "BINDINGS_TYPE")
        unknown_policy_fields = set(policy) - {"bindings", "etag", "version", "auditConfigs"}
        if unknown_policy_fields:
            raise PolicyNormalizationError("PROVIDER_POLICY_UNSUPPORTED_VALUE", "UNKNOWN_POLICY_FIELD")
        if not valid_policy(policy):
            code = "PROVIDER_POLICY_CONDITION_INVALID" if any(
                isinstance(binding, dict) and "condition" in binding
                and (not isinstance(binding.get("condition"), dict)
                     or set(binding["condition"]) - {"expression", "title", "description", "location"}
                     or not all(isinstance(item, str) for item in binding["condition"].values()))
                for binding in policy["bindings"]
            ) else "PROVIDER_POLICY_BINDINGS_INVALID"
            raise PolicyNormalizationError(code, "POLICY_SCHEMA")
        _canonicalization_stage = "COMPLETE"
        json.dumps(policy, allow_nan=False)
        version_diag["versionNormalizationResult"] = "VALID"
        version_diag["versionNormalizationFailureReason"] = "NONE"
        return {"ok": True, "policy": policy, "policyObjectType": _policy_object_type,
                "canonicalizationStage": _canonicalization_stage, "versionDiagnostic": version_diag,
                "returnedPolicyVersionState": version_state,
                "returnedPolicyVersionValue": version_value,
                "responseFieldDiagnostic": field_diag,
                "policyExtractionPath": extraction_path, "providerResponseShape": response_shape,
                "returnedAllowPolicyVersionValid": policy["version"] in (0, 1, 3)}
    except PolicyNormalizationError as error:
        _canonicalization_stage = error.stage
        if "version_diag" not in locals():
            version_diag = safe_version_diagnostic({}, "MISSING")
        version_diag["versionNormalizationResult"] = "MISSING" if error.stage == "VERSION_MISSING" else "INVALID"
        version_diag["versionNormalizationFailureReason"] = {
            "VERSION_MISSING": "MISSING", "VERSION_VALUE": version_failure_reason(version_diag),
        }.get(error.stage, "NOT_VERSION_FAILURE")
        return {"ok": False, "code": error.code, "policyObjectType": _policy_object_type,
                "canonicalizationStage": _canonicalization_stage, "versionDiagnostic": version_diag,
                "responseFieldDiagnostic": locals().get("field_diag"),
                "policyExtractionPath": locals().get("extraction_path", "NOT_ESTABLISHED"),
                "providerResponseShape": locals().get("response_shape", _safe_response_shape(response, "NOT_ESTABLISHED", "BLOCKED")),
                "returnedAllowPolicyVersionValid": False}
    except (TypeError, ValueError, RecursionError):
        _canonicalization_stage = "JSON_SAFETY_CHECK"
        return {"ok": False, "code": "PROVIDER_POLICY_JSON_SERIALIZATION_FAILED",
                "policyObjectType": _policy_object_type, "canonicalizationStage": _canonicalization_stage,
                "policyExtractionPath": locals().get("extraction_path", "NOT_ESTABLISHED"),
                "providerResponseShape": locals().get("response_shape", _safe_response_shape(response, "NOT_ESTABLISHED", "BLOCKED")),
                "returnedAllowPolicyVersionValid": False}


def canonical_provider_policy(response, message_to_dict):
    """Compatibility wrapper; callers that need diagnostics use the result API."""
    result = canonical_provider_policy_result(response, message_to_dict)
    return result["policy"] if result["ok"] else None


def valid_generation_bound_recovery_policy(policy, normalization):
    if not valid_policy(policy) or not isinstance(normalization, dict):
        return False
    if policy.get("version") in (0, 1, 3):
        return True
    fields = normalization.get("responseFieldDiagnostic")
    return (policy.get("version") is None
            and normalization.get("returnedPolicyVersionState") == "UNSET"
            and normalization.get("returnedPolicyVersionValue") is None
            and isinstance(fields, dict)
            and fields.get("apitoolsPolicyClassVerified") is True
            and fields.get("apitoolsBindingsState") == "UNSET"
            and fields.get("bindingsCount") == 0
            and fields.get("conditionsPresent") is False
            and fields.get("withcondRoleMarkerPresent") is False
            and fields.get("etagPresent") is True)


def build_policy_success_envelope(policy, request_identity, normalization):
    if (not valid_policy(policy) or not isinstance(request_identity, dict)
            or normalization.get("ok") is not True
            or normalization.get("canonicalizationStage") != "COMPLETE"):
        raise PolicyNormalizationError("PROVIDER_POLICY_NORMALIZATION_FAILED", "SUCCESS_ENVELOPE_BUILD")
    return {
        "schema": SCHEMA, "ok": True, "requestStarted": True,
        "remoteRequestStarted": True, "httpStatus": 200,
        "prestateReadCompleted": True, "recoveryReadCompleted": True,
        "setAttempted": False, "requestMetadata": request_identity,
        "providerMetadata": {"responseReceived": True, "httpStatus": 200},
        "serializationMetadata": {
            "policyObjectType": normalization["policyObjectType"],
            "canonicalizationStage": normalization["canonicalizationStage"],
            "serializationStage": "JSON_ENVELOPE_READY",
            "policyExtractionPath": normalization["policyExtractionPath"],
            "providerResponseShape": normalization["providerResponseShape"],
        },
        "requestedPolicyVersion": request_identity["requestedPolicyVersion"],
        "returnedPolicyVersion": normalization["returnedPolicyVersionValue"],
        "returnedPolicyVersionState": normalization["returnedPolicyVersionState"],
        "returnedPolicyVersionValue": normalization["returnedPolicyVersionValue"],
        "versionSourceLayer": "PYTHON_MESSAGE_TO_DICT",
        "versionDiagnostic": normalization["versionDiagnostic"],
        "responseFieldDiagnostic": normalization["responseFieldDiagnostic"], "policy": policy,
    }


def request_metadata(approved_resource, request_resource, request_body_diagnostic=None):
    """Bind the generated IAM request's resource/path before dispatch."""
    if approved_resource != RESOURCE or request_resource != RESOURCE:
        return None
    path_template = "v1/{+resource}:getIamPolicy"
    request_path = path_template.replace("{+resource}", request_resource)
    expected_path = f"v1/{RESOURCE}:getIamPolicy"
    if request_path != expected_path:
        return None
    if (not isinstance(request_body_diagnostic, dict)
            or request_body_diagnostic.get("requestedPolicyVersion") != 3
            or request_body_diagnostic.get("requestBodyOptionsVersionValidated") is not True):
        return None
    return {
        "approvedResourceFingerprint": hashlib.sha256(approved_resource.encode("utf-8")).hexdigest(),
        "requestResourceFingerprint": hashlib.sha256(request_resource.encode("utf-8")).hexdigest(),
        "resourceValidatedBeforeDispatch": True,
        "requestPathFingerprint": hashlib.sha256(request_path.encode("utf-8")).hexdigest(),
        "requestPathValidatedBeforeDispatch": True,
        "requestedPolicyVersion": 3,
        "requestBodyOptionsVersionValidated": True,
    }


def call_get_iam_policy(client, request_message):
    return client.projects_serviceAccounts.GetIamPolicy(request_message)


def normalize_provider_read(response, request_identity, message_to_dict):
    return canonical_provider_policy_result(response, message_to_dict, allow_generic_zero=False)


def build_read_success_envelope(client, messages, message_to_dict, approved_resource=RESOURCE,
                                wrapper_contract=None):
    request_message, body_diagnostic = build_get_iam_policy_request(messages, message_to_dict)
    request_identity = request_metadata(approved_resource, request_message.resource, body_diagnostic)
    if request_identity is None:
        raise PolicyNormalizationError("REQUEST_RESOURCE_MISMATCH", "REQUEST_BODY_VALIDATION")
    response = call_get_iam_policy(client, request_message)
    normalization = canonical_provider_policy_result(
        response, message_to_dict, wrapper_contract=wrapper_contract, allow_generic_zero=False)
    if not normalization["ok"]:
        raise PolicyNormalizationError(normalization["code"], normalization["canonicalizationStage"])
    return build_policy_success_envelope(normalization["policy"], request_identity, normalization)


def emit_local_stub_read_e2e(fixture):
    global _phase, _provider_request_prepared, _provider_request_started
    global _provider_response_received, _http_status, _request_metadata, _failed_phase
    _phase = PHASES[0]
    _provider_request_prepared = _provider_request_started = _provider_response_received = False
    _http_status = _request_metadata = _failed_phase = None

    class Request:
        def __init__(self, resource, options_requestedPolicyVersion):
            self.resource = resource
            self.options_requestedPolicyVersion = options_requestedPolicyVersion

    class Messages:
        IamProjectsServiceAccountsGetIamPolicyRequest = Request

    def message_to_dict(value):
        if isinstance(value, Request):
            return {"resource": value.resource, "options": {"requestedPolicyVersion": value.options_requestedPolicyVersion}}
        if getattr(value, "DESCRIPTOR", None) is not None:
            return value.values
        return dict(value) if isinstance(value, Mapping) else None

    class FakeService:
        def __init__(self, response):
            self.response = response
            self.calls = 0
            self.request = None

        def GetIamPolicy(self, request):
            self.calls += 1
            self.request = request
            return self.response

    policy = fixture.get("policy")
    response_kind = fixture.get("responseKind", "DIRECT_POLICY_MAPPING")
    if response_kind == "KNOWN_PROVIDER_WRAPPER_POLICY":
        response = {"response": policy}
        wrapper_contract = "response"
    elif response_kind == "UNKNOWN_WRAPPER":
        response = {"payload": policy}
        wrapper_contract = None
    elif response_kind == "SDK_POLICY_MESSAGE":
        class Message:
            DESCRIPTOR = object()
            def __init__(self, values): self.values = values
        response = Message(policy)
        wrapper_contract = None
    else:
        response = policy
        wrapper_contract = None
    service = FakeService(response)
    class Client:
        projects_serviceAccounts = service

    request_message, body_diagnostic = build_get_iam_policy_request(Messages, message_to_dict)
    identity = request_metadata(RESOURCE, request_message.resource, body_diagnostic)
    if identity is None:
        fail("REQUEST_RESOURCE_MISMATCH")
    _provider_request_prepared = True
    set_phase("PHASE_05_PROVIDER_REQUEST_PREPARED")
    _request_metadata = identity
    _provider_request_started = True
    set_phase("PHASE_06_PROVIDER_REQUEST_STARTED")
    try:
        response_value = call_get_iam_policy(Client(), request_message)
    except Exception:
        fail("PRESTATE_READ_FAILURE", "DURING_HTTP_SEND", "REMOTE_REQUEST_EXCEPTION", request_started=True)
    _provider_response_received = True
    _http_status = 200
    set_phase("PHASE_07_PROVIDER_RESPONSE_RECEIVED")
    set_phase("PHASE_08_HELPER_SERIALIZATION")
    normalized = canonical_provider_policy_result(response_value, message_to_dict,
        wrapper_contract=wrapper_contract, allow_generic_zero=False)
    if not normalized["ok"]:
        fail(normalized["code"], "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE", status=200,
             request_started=True, prestate_complete=True, request_metadata=identity,
             version_diagnostic=normalized.get("versionDiagnostic"),
             response_field_diagnostic=normalized.get("responseFieldDiagnostic"),
             response_shape=normalized.get("providerResponseShape"),
             extraction_path=normalized.get("policyExtractionPath"))
    emit(build_policy_success_envelope(normalized["policy"], identity, normalized))


def target_member_state(policy, member):
    for binding in policy["bindings"]:
        if binding["role"] == ROLE and "condition" not in binding and member in binding["members"]:
            return "PRESENT", None
    for binding in policy["bindings"]:
        if binding["role"] == ROLE and "condition" not in binding:
            return "ABSENT", binding
    return "ABSENT", None


def provider_failure_code(error):
    status = getattr(error, "status_code", None)
    if status == 401:
        return "PROVIDER_AUTH_FAILED"
    if status == 403:
        return "PROVIDER_PERMISSION_DENIED"
    if status == 429:
        return "PROVIDER_RATE_LIMIT"
    if status in (500, 502, 503, 504):
        return "PROVIDER_SERVER_ERROR"
    error_type = type(error).__name__.lower()
    if "timeout" in error_type or "deadline" in error_type:
        return "PROVIDER_TIMEOUT"
    return "PROVIDER_NETWORK_ERROR"


def main():
    global _phase, _provider_request_prepared, _provider_request_started
    global _provider_response_received, _http_status, _request_metadata, _failed_phase
    global _input_contract_diagnostic, _request_body_diagnostic
    _phase = PHASES[0]
    _provider_request_prepared = _provider_request_started = _provider_response_received = False
    _http_status = _request_metadata = _failed_phase = _request_body_diagnostic = None
    set_phase("PHASE_01_INPUT_VALIDATION")
    _input_contract_diagnostic = {
        "argvCount": max(0, len(sys.argv) - 1), "argvShapeValid": False,
        "stdinEncoding": "UTF8", "stdinByteLength": 0,
        "stdinBomPresent": False, "stdinNewlineKind": "NONE",
        "stdinJsonParseSucceeded": False, "stdinSchemaValidationSucceeded": False,
        "helperInputObjectType": "NOT_PARSED", "helperInputKeyCount": 0,
        "helperInputSafeKeys": [], "requiredFieldsPresent": False,
        "missingRequiredFields": [], "fieldTypeSummary": {},
        "environmentContractValid": False, "requestBuildState": "NOT_STARTED",
    }
    if len(sys.argv) != 3 or sys.argv[2] not in (
            "READ_PRESTATE_POLICY", "READ_GENERATION_BOUND_RECOVERY_POLICY",
            "SET_FROM_PRESTATE_POLICY", "READ_EXACT_G2B_MEMBER",
            "LOCAL_CACHED_CREDENTIAL_READINESS",
            "DIRECT_CONTEXT_CREDENTIAL_REFRESH_READY", "DIRECT_CONTEXT_CREDENTIAL_REFRESH",
            "DIRECT_CONTEXT_PERMISSION_READY", "TEST_DIRECT_CONTEXT_EXACT_PERMISSION"):
        fail("ARG_PARSE_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    _input_contract_diagnostic["argvShapeValid"] = True
    operation = sys.argv[2]
    if any(os.environ.get(key) for key in OVERRIDE_ENV):
        fail("ENVIRONMENT_CONTRACT_FAILURE", exception_class="PRIVACY_GUARD_FAILURE")
    _input_contract_diagnostic["environmentContractValid"] = True
    try:
        stdin_text = sys.stdin.read()
    except Exception:
        fail("STDIN_READ_FAILURE", exception_class="RESPONSE_PARSE_FAILURE")
    _input_contract_diagnostic["stdinByteLength"] = len(stdin_text.encode("utf-8"))
    _input_contract_diagnostic["stdinBomPresent"] = stdin_text.startswith("\ufeff")
    _input_contract_diagnostic["stdinNewlineKind"] = (
        "CRLF" if "\r\n" in stdin_text else "CR" if "\r" in stdin_text else "LF" if "\n" in stdin_text else "NONE")
    if not stdin_text.strip():
        fail("STDIN_EMPTY", exception_class="RESPONSE_PARSE_FAILURE")
    try:
        payload = json.loads(stdin_text)
    except Exception:
        fail("INPUT_JSON_PARSE_FAILURE", exception_class="RESPONSE_PARSE_FAILURE")
    _input_contract_diagnostic["stdinJsonParseSucceeded"] = True
    _input_contract_diagnostic["helperInputObjectType"] = (
        "OBJECT" if isinstance(payload, dict) else "ARRAY" if isinstance(payload, list) else type(payload).__name__.upper())
    if isinstance(payload, dict):
        safe_keys = sorted(key for key in payload if key in ("resource", "member", "account", "policy", "policyVersionState"))
        _input_contract_diagnostic["helperInputKeyCount"] = len(payload)
        _input_contract_diagnostic["helperInputSafeKeys"] = safe_keys
        field_type = lambda value: ("NULL" if value is None else "OBJECT" if isinstance(value, dict)
                                    else "ARRAY" if isinstance(value, list) else "BOOLEAN" if type(value) is bool
                                    else "INTEGER" if type(value) is int else "FLOAT" if type(value) is float
                                    else "STRING" if isinstance(value, str) else "OTHER")
        _input_contract_diagnostic["fieldTypeSummary"] = {
            key: field_type(payload.get(key))
            for key in safe_keys
        }
    local_record_operations = (
        "LOCAL_CACHED_CREDENTIAL_READINESS", "DIRECT_CONTEXT_CREDENTIAL_REFRESH_READY",
        "DIRECT_CONTEXT_CREDENTIAL_REFRESH", "DIRECT_CONTEXT_PERMISSION_READY",
        "TEST_DIRECT_CONTEXT_EXACT_PERMISSION")
    base_keys = {"resource", "member", "account"}
    if operation in local_record_operations:
        base_keys = {"resource"}
    expected_keys = base_keys | ({"policy", "policyVersionState"} if operation == "SET_FROM_PRESTATE_POLICY" else set())
    if not isinstance(payload, dict):
        fail("INPUT_SCHEMA_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    missing = sorted(expected_keys - set(payload))
    _input_contract_diagnostic["missingRequiredFields"] = missing
    if missing:
        fail("REQUIRED_FIELD_MISSING", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    if set(payload) != expected_keys:
        fail("INPUT_SCHEMA_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    if not isinstance(payload.get("resource"), str):
        fail("FIELD_TYPE_INVALID", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    if operation not in local_record_operations:
        if not isinstance(payload.get("member"), str) or not isinstance(payload.get("account"), str):
            fail("FIELD_TYPE_INVALID", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
        if not MEMBER.match(payload["member"]) or not ACCOUNT.match(payload["account"]):
            fail("INPUT_SCHEMA_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    if operation == "SET_FROM_PRESTATE_POLICY" and (not valid_policy(payload.get("policy"))
            or payload.get("policyVersionState") not in ("UNSET", "EXPLICIT")
            or payload["policyVersionState"] == "UNSET" and ("version" not in payload["policy"]
                or payload["policy"].get("version") is not None)
            or payload["policyVersionState"] == "EXPLICIT" and (type(payload["policy"].get("version")) is not int
                or payload["policy"].get("version") not in (0, 1, 3))):
        fail("FIELD_TYPE_INVALID", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    if payload.get("resource") != RESOURCE:
        fail("INPUT_SCHEMA_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    _input_contract_diagnostic["requiredFieldsPresent"] = True
    _input_contract_diagnostic["stdinSchemaValidationSucceeded"] = True
    set_phase("PHASE_04_HELPER_INPUT_ACCEPTED")

    sdk_root = os.path.abspath(sys.argv[1])
    sdk_lib = os.path.join(sdk_root, "lib")
    _input_contract_diagnostic["requestBuildState"] = "SDK_LAYOUT_CHECK"
    if not os.path.isfile(os.path.join(sdk_lib, "googlecloudsdk", "core", "credentials", "store.py")):
        _input_contract_diagnostic["requestBuildState"] = "SDK_LAYOUT_INVALID"
        fail("LOCAL_CLIENT_SETUP_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    _input_contract_diagnostic["requestBuildState"] = "SDK_IMPORT_AND_CLIENT_SETUP"
    sys.path.insert(0, os.path.join(sdk_lib, "third_party"))
    sys.path.insert(0, sdk_lib)
    try:
        from apitools.base.py import encoding_helper
        from google.auth.transport import requests as google_auth_requests
        from googlecloudsdk.core import properties
        from googlecloudsdk.core import requests as core_requests
        from googlecloudsdk.core.credentials import requests as credential_requests
        from googlecloudsdk.core.credentials import google_auth_credentials
        from googlecloudsdk.core.credentials import store
        from googlecloudsdk.generated_clients.apis.iam.v1 import iam_v1_client
        from googlecloudsdk.generated_clients.apis.iam.v1 import iam_v1_messages
        configured_account = properties.VALUES.core.account.Get()
        if (properties.VALUES.auth.access_token_file.Get()
                or properties.VALUES.auth.credential_file_override.Get()
                or properties.VALUES.auth.impersonate_service_account.Get()
                or not isinstance(configured_account, str) or not ACCOUNT.match(configured_account)
                or (operation not in local_record_operations
                    and configured_account != payload["account"])):
            fail("LOCAL_PRIVACY_GUARD", exception_class="PRIVACY_GUARD_FAILURE")
        credential = store.Load(account=configured_account, prevent_refresh=True, allow_account_impersonation=False)
        if operation == "LOCAL_CACHED_CREDENTIAL_READINESS":
            credential.refresh = lambda _request: (_ for _ in ()).throw(RuntimeError("credential-refresh-blocked"))
            token_present, expiry_present, expiry_valid, expiry_state, readiness_state = readiness(credential)
            emit({"schema": SCHEMA, "ok": True, "requestStarted": False,
                  "configuredIdentityContextResolved": True, "credentialStoreRecordResolved": True,
                  "credentialObjectLoad": "PASS", "cachedAccessTokenPresent": token_present,
                  "credentialExpiryMetadataPresent": expiry_present, "credentialExpiryParseValid": expiry_valid,
                  "currentLocalTimeAvailable": True, "credentialExpiryRelativeState": expiry_state,
                  "readinessState": readiness_state, "freshnessMarginSeconds": 120,
                  "credentialRecordMatchesConfiguredContext": True,
                  "credentialRecordMatchesDirectMutationAuthContext": True,
                  "credentialRecordMatchesDirectDiagnosticAuthContext": True,
                  "refreshMethodInvocations": 0, "networkRequests": 0,
                  "tokenEndpointCalls": 0, "metadataRequests": 0})
        refresh_once = getattr(google_auth_credentials._TokenEndpointRequestWithRetry, "__wrapped__", None)
        if operation == "DIRECT_CONTEXT_CREDENTIAL_REFRESH_READY":
            can_refresh = refresh_ready(credential, refresh_once)
            emit({"schema": SCHEMA, "ok": True, "readyToSend": can_refresh,
                  "requestStarted": False, "configuredIdentityContextResolved": True,
                  "credentialStoreRecordResolved": True, "refreshTokenLocallyAvailable": can_refresh,
                  "refreshRequestCanBeConstructedWithoutNetwork": can_refresh,
                  "tokenEndpointContractLocallyResolved": callable(refresh_once),
                  "credentialRecordMatchesConfiguredContext": True,
                  "credentialRecordMatchesDirectMutationAuthContext": True,
                  "credentialRecordMatchesDirectDiagnosticAuthContext": True,
                  "physicalCalls": 0, "automaticRetries": 0,
                  "networkRequests": 0, "tokenEndpointCalls": 0, "metadataRequests": 0})
        if operation == "DIRECT_CONTEXT_CREDENTIAL_REFRESH":
            if not refresh_ready(credential, refresh_once):
                fail("REFRESH_REQUEST_NOT_STARTED", exception_class="LOCAL_CREDENTIAL_FAILURE")

            class OneRequest:
                def __init__(self):
                    self.calls = 0
                    self.request = google_auth_requests.Request()

                def __call__(self, *args, **kwargs):
                    if self.calls != 0:
                        raise RuntimeError("second-refresh-request-blocked")
                    self.calls = 1
                    return self.request(*args, **kwargs)

            request = OneRequest()
            original = google_auth_credentials._TokenEndpointRequestWithRetry
            google_auth_credentials._TokenEndpointRequestWithRetry = refresh_once
            try:
                credential.refresh(request)
            except Exception as error:
                fail("REFRESH_INDETERMINATE" if request.calls else "REFRESH_AUTH_FAILURE",
                     "DURING_HTTP_SEND" if request.calls else "BEFORE_HTTP_SEND",
                     "REMOTE_REQUEST_EXCEPTION" if request.calls else "LOCAL_CREDENTIAL_FAILURE",
                     status=getattr(error, "status_code", None), request_started=request.calls == 1)
            finally:
                google_auth_credentials._TokenEndpointRequestWithRetry = original
            try:
                store.Store(credential, account=configured_account)
            except Exception:
                fail("REFRESH_STORE_WRITE_FAILURE", "AFTER_HTTP_RESPONSE", "LOCAL_CREDENTIAL_FAILURE",
                     request_started=True)
            emit({"schema": SCHEMA, "ok": True, "requestStarted": True, "httpStatus": 200,
                  "refreshState": "REFRESH_SUCCESS_CONFIRMED", "credentialStoreUpdated": True,
                  "physicalCalls": 1, "automaticRetries": 0})
        if not fresh(credential):
            fail("CACHED_CREDENTIAL_NOT_FRESH", exception_class="LOCAL_CREDENTIAL_FAILURE")
        credential.refresh = lambda _request: (_ for _ in ()).throw(RuntimeError("credential-refresh-blocked"))
        authorized = credential_requests.RequestWrapper().WrapCredentials(
            core_requests.GetSession(), allow_account_impersonation=False, credentials=credential)
        client = iam_v1_client.IamV1(http=core_requests.GetApitoolsRequests(authorized), get_credentials=False)
        client.num_retries = 0
    except SystemExit:
        raise
    except Exception:
        fail("LOCAL_CLIENT_SETUP_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")

    if operation in ("DIRECT_CONTEXT_PERMISSION_READY", "TEST_DIRECT_CONTEXT_EXACT_PERMISSION"):
        try:
            permission_request = iam_v1_messages.IamProjectsServiceAccountsTestIamPermissionsRequest(
                resource=RESOURCE,
                testIamPermissionsRequest=iam_v1_messages.TestIamPermissionsRequest(
                    permissions=[EXACT_PERMISSION]))
        except Exception:
            fail("DIRECT_CONTEXT_DIAGNOSTIC_SETUP_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
        if operation == "DIRECT_CONTEXT_PERMISSION_READY":
            emit({"schema": SCHEMA, "ok": True, "readyToSend": True,
                  "requestStarted": False, "permissionCountRequested": 1})
        try:
            response = client.projects_serviceAccounts.TestIamPermissions(permission_request)
            granted = list(getattr(response, "permissions", None) or [])
        except Exception as error:
            fail("DIRECT_CONTEXT_DIAGNOSTIC_REQUEST_FAILURE", "DURING_HTTP_SEND", "REMOTE_REQUEST_EXCEPTION",
                 status=getattr(error, "status_code", None), request_started=True)
        if any(not isinstance(item, str) or item != EXACT_PERMISSION for item in granted):
            fail("DIRECT_CONTEXT_DIAGNOSTIC_PARSE_FAILURE", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                 request_started=True)
        emit({"schema": SCHEMA, "ok": True, "requestStarted": True, "httpStatus": 200,
              "permissionCountRequested": 1, "permissionCountReturned": len(granted),
              "permissionState": "PRESENT" if EXACT_PERMISSION in granted else "ABSENT"})

    if operation in ("READ_PRESTATE_POLICY", "READ_GENERATION_BOUND_RECOVERY_POLICY", "READ_EXACT_G2B_MEMBER"):
        try:
            request_message, request_body_diagnostic = build_get_iam_policy_request(
                iam_v1_messages, encoding_helper.MessageToDict)
            _request_body_diagnostic = request_body_diagnostic
        except PolicyNormalizationError as error:
            fail(error.code, exception_class="LOCAL_CLIENT_SETUP_FAILURE")
        except Exception:
            fail("REQUEST_BUILD_FAILED", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
        request_identity = request_metadata(payload["resource"], request_message.resource, request_body_diagnostic)
        if request_identity is None:
            fail("REQUEST_RESOURCE_MISMATCH", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
        _input_contract_diagnostic["requestBuildState"] = "BUILT"
        _provider_request_prepared = True
        _request_metadata = request_identity
        set_phase("PHASE_05_PROVIDER_REQUEST_PREPARED")
        request_started = False
        try:
            request_started = True
            _provider_request_started = True
            set_phase("PHASE_06_PROVIDER_REQUEST_STARTED")
            response = call_get_iam_policy(client, request_message)
            _provider_response_received = True
            _http_status = 200
            set_phase("PHASE_07_PROVIDER_RESPONSE_RECEIVED")
        except Exception as error:
            status = getattr(error, "status_code", None)
            _provider_response_received = isinstance(status, int)
            _http_status = status if isinstance(status, int) else None
            fail(provider_failure_code(error), "DURING_HTTP_SEND", "REMOTE_REQUEST_EXCEPTION",
                 status=status, request_started=request_started,
                 request_metadata=request_identity)
        set_phase("PHASE_08_HELPER_SERIALIZATION")
        try:
            normalization = normalize_provider_read(response, request_identity, encoding_helper.MessageToDict)
        except Exception:
            fail("PROVIDER_POLICY_RESPONSE_INVALID", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                 status=200, request_started=True, prestate_complete=True,
                 request_metadata=request_identity)
        if not normalization["ok"]:
            fail(normalization["code"], "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                 status=200, request_started=True, prestate_complete=True,
                 request_metadata=request_identity,
                 policy_object_type=normalization["policyObjectType"],
                 canonicalization_stage=normalization["canonicalizationStage"],
                 version_diagnostic=normalization.get("versionDiagnostic"),
                 response_field_diagnostic=normalization.get("responseFieldDiagnostic"),
                 response_shape=normalization.get("providerResponseShape"),
                 extraction_path=normalization.get("policyExtractionPath"))
        policy = normalization["policy"]
        # Recovery parsing is deliberately separate from the mutation prestate
        # validator. It receives the transient policy only to run the canonical
        # generation-bound recovery parser in Node; it cannot reach SetIamPolicy.
        if operation == "READ_GENERATION_BOUND_RECOVERY_POLICY":
            if not isinstance(policy, dict):
                fail("PROVIDER_POLICY_NOT_MAPPING", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                     status=200, request_started=True, prestate_complete=True,
                     request_metadata=request_identity)
            if "version" not in policy:
                fail("PROVIDER_POLICY_VERSION_MISSING", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                     status=200, request_started=True, prestate_complete=True,
                     request_metadata=request_identity)
            if not isinstance(policy.get("etag"), str) or not policy["etag"]:
                fail("PROVIDER_POLICY_ETAG_MISSING", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                     status=200, request_started=True, prestate_complete=True,
                     request_metadata=request_identity)
            if not valid_generation_bound_recovery_policy(policy, normalization):
                fail("PROVIDER_POLICY_SCHEMA_INVALID", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                     status=200, request_started=True, prestate_complete=True,
                     request_metadata=request_identity)
            try:
                success_envelope = build_policy_success_envelope(policy, request_identity, normalization)
            except PolicyNormalizationError as error:
                fail(error.code, "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE", status=200,
                     request_started=True, prestate_complete=True, request_metadata=request_identity,
                     canonicalization_stage=error.stage)
            emit(success_envelope)
        if not valid_policy(policy):
            fail("PRESTATE_POLICY_UNSUPPORTED_OR_MALFORMED", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                 status=200, request_started=True, prestate_complete=True)
    if operation == "READ_PRESTATE_POLICY" and policy.get("version") not in (0, 1, 3, None):
        fail("PRESTATE_POLICY_VERSION_UNSUPPORTED", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
             status=200, request_started=True, prestate_complete=True)
    if operation == "READ_PRESTATE_POLICY" and policy.get("version") is None \
            and normalization.get("returnedPolicyVersionState") != "UNSET":
        fail("PRESTATE_POLICY_VERSION_STATE_MISMATCH", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
             status=200, request_started=True, prestate_complete=True)
    else:
        policy = payload["policy"]
    member_state, target_binding = target_member_state(policy, payload["member"])
    if operation == "READ_PRESTATE_POLICY":
        emit({"schema": SCHEMA, "ok": True, "requestStarted": True, "httpStatus": 200,
              "remoteRequestStarted": True,
              "prestateReadCompleted": True, "setAttempted": False,
              "memberState": "PRESENT" if member_state == "PRESENT" else "ABSENT", "policy": policy,
              "returnedPolicyVersionState": normalization["returnedPolicyVersionState"],
              "returnedPolicyVersionValue": normalization["returnedPolicyVersionValue"]})
    if operation == "READ_EXACT_G2B_MEMBER":
        emit({"schema": SCHEMA, "ok": True, "requestStarted": True, "httpStatus": 200,
              "prestateReadCompleted": True, "setAttempted": False,
              "memberState": "PRESENT" if member_state == "PRESENT" else "ABSENT"})
    if member_state == "PRESENT":
        emit({"schema": SCHEMA, "ok": True, "requestStarted": True, "httpStatus": 200,
              "prestateReadCompleted": True, "setAttempted": False,
              "memberState": "PRESENT", "mutationState": "PRESTATE_MEMBER_PRESENT_NO_SET"})
    if target_binding is None:
        policy["bindings"].append({"role": ROLE, "members": [payload["member"]]})
    else:
        target_binding["members"].append(payload["member"])
    try:
        request_message, exact_policy = build_set_iam_policy_request(
            iam_v1_messages, encoding_helper.DictToMessage, RESOURCE, policy, payload["policyVersionState"])
        response = client.projects_serviceAccounts.SetIamPolicy(request_message)
        if not valid_policy(encoding_helper.MessageToDict(response)):
            fail("SET_RESPONSE_INVALID", "AFTER_HTTP_RESPONSE", "RESPONSE_PARSE_FAILURE",
                 request_started=True, prestate_complete=True, set_attempted=True)
    except Exception as error:
        fail("SET_REQUEST_FAILURE", "DURING_HTTP_SEND", "REMOTE_REQUEST_EXCEPTION",
             status=getattr(error, "status_code", None), request_started=True,
             prestate_complete=True, set_attempted=True)
    emit({"schema": SCHEMA, "ok": True, "requestStarted": True, "httpStatus": 200,
          "prestateReadCompleted": True, "setAttempted": True,
          "responseValid": True, "mutationState": "SET_CONFIRMED_SUCCESS"})


def run_entrypoint():
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        fail("ENTRYPOINT_EXCEPTION", "AFTER_HTTP_RESPONSE" if _provider_response_received else "DURING_HTTP_SEND" if _provider_request_started else "BEFORE_HTTP_SEND",
             "LOCAL_CLIENT_SETUP_FAILURE",
             status=_http_status, request_started=_provider_request_started,
             prestate_complete=_provider_response_received, request_metadata=_request_metadata)


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--local-build-set-request":
        stage = "SDK_IMPORT"
        try:
            sdk_root = os.path.abspath(sys.argv[2])
            sys.path.insert(0, os.path.join(sdk_root, "lib", "third_party"))
            sys.path.insert(0, os.path.join(sdk_root, "lib"))
            from apitools.base.py import encoding_helper
            from googlecloudsdk.generated_clients.apis.iam.v1 import iam_v1_messages
            payload = json.loads(sys.stdin.read())
            stage = "REQUEST_BUILD"
            request, policy_message = build_set_iam_policy_request(
                iam_v1_messages, encoding_helper.DictToMessage, RESOURCE,
                payload["policy"], payload["policyVersionState"])
            rendered = encoding_helper.MessageToDict(request)
            stage = "POLICY_SERIALIZATION"
            policy_dict = encoding_helper.MessageToDict(policy_message)
            stage = "POLICY_FIELD_INSPECTION"
            listed_fields = policy_message.all_fields()
            policy_fields = set(listed_fields.keys()) if isinstance(listed_fields, dict) else set(listed_fields)
            stage = "ETAG_AND_BINDING_INSPECTION"
            etag = policy_message.etag
            result = {"ok": True, "requestClass": type(request).__name__,
                "policyClass": type(policy_message).__name__, "resource": request.resource,
                "requestPolicyVersionPresent": "version" in rendered.get("setIamPolicyRequest", {}).get("policy", {}),
                "policyVersionPresent": "version" in policy_dict,
                "policyVersionFieldListed": "version" in policy_fields,
                "etagIsBytes": isinstance(etag, bytes), "etagMatches": etag == __import__("base64").b64decode(payload["expectedEtagBytes"]),
                "targetRolePresent": any(getattr(binding, "role", None) == payload["expectedRole"]
                    and payload["expectedMember"] in list(getattr(binding, "members", []) or [])
                    for binding in (getattr(policy_message, "bindings", []) or [])),
                "requestVersionOmitted": "version" not in rendered.get("setIamPolicyRequest", {}).get("policy", {})}
            print(json.dumps(result, separators=(",", ":")))
        except Exception as error:
            print(json.dumps({"ok": False, "code": "LOCAL_SET_REQUEST_CONTRACT_FAILED",
                "errorType": type(error).__name__, "stage": stage}, separators=(",", ":")))
            raise SystemExit(2)
        raise SystemExit(0)
    if len(sys.argv) == 2 and sys.argv[1] == "--local-stub-read-e2e":
        try:
            emit_local_stub_read_e2e(json.loads(sys.stdin.read()))
        except SystemExit:
            raise
        except Exception:
            fail("LOCAL_STUB_E2E_FAILURE", exception_class="LOCAL_CLIENT_SETUP_FAILURE")
    run_entrypoint()
