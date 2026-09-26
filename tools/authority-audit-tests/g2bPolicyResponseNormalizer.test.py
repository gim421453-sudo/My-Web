import importlib.util
import json
import contextlib
import io
import os
import sys
import unittest
from collections.abc import Mapping
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / "authority-audit" / "g2b_explicit_set_iam_policy_transport.py"
SPEC = importlib.util.spec_from_file_location("g2b_transport", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FakeRequest:
    def __init__(self, resource, options_requestedPolicyVersion):
        self.resource = resource
        self.options_requestedPolicyVersion = options_requestedPolicyVersion


class FakeMessages:
    IamProjectsServiceAccountsGetIamPolicyRequest = FakeRequest


def request_context():
    def to_dict(value):
        return {"resource": value.resource, "options": {"requestedPolicyVersion": value.options_requestedPolicyVersion}}
    request, body = MODULE.build_get_iam_policy_request(FakeMessages, to_dict)
    return request, MODULE.request_metadata(MODULE.RESOURCE, request.resource, body)


class PolicyResponseNormalizerTests(unittest.TestCase):
    def test_preserves_exact_provider_version_and_policy_fields(self):
        for version in (0, 1, 3):
            source = {"version": version, "etag": f"etag-{version}", "bindings": []}
            result = MODULE.canonical_provider_policy(source, lambda response: dict(response))
            self.assertEqual(result, source)

    def test_official_policy_shapes_have_no_resource_requirement(self):
        for version in (0, 1, 3):
            source = {"version": version, "etag": f"etag-{version}", "bindings": []}
            result = MODULE.canonical_provider_policy(source, lambda response: dict(response))
            self.assertEqual(result, source)

    def test_arbitrary_response_resource_is_not_request_identity(self):
        source = {"version": 3, "etag": "etag", "bindings": [], "resource": "untrusted-response-value"}
        result = MODULE.canonical_provider_policy(source, lambda response: dict(response))
        self.assertEqual(result, {"version": 3, "etag": "etag", "bindings": []})

    def test_request_identity_is_bound_before_dispatch(self):
        request, metadata = request_context()
        self.assertTrue(metadata["resourceValidatedBeforeDispatch"])
        self.assertTrue(metadata["requestPathValidatedBeforeDispatch"])
        self.assertEqual(request.options_requestedPolicyVersion, 3)
        self.assertEqual(metadata["requestedPolicyVersion"], 3)
        self.assertTrue(metadata["requestBodyOptionsVersionValidated"])
        self.assertEqual(metadata["approvedResourceFingerprint"], metadata["requestResourceFingerprint"])
        self.assertIsNone(MODULE.request_metadata(MODULE.RESOURCE, "projects/other/serviceAccounts/other"))

    def test_does_not_infer_missing_version(self):
        source = {"etag": "etag", "bindings": []}
        result = MODULE.canonical_provider_policy_result(source, lambda response: dict(response))
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "PROVIDER_POLICY_VERSION_MISSING")

    def test_rejects_invalid_version_types_and_values(self):
        cases = [
            (2, "INTEGER_NOT_ALLOWED"), (-1, "INTEGER_NOT_ALLOWED"),
            ("0", "STRING_COERCION_NOT_ALLOWED"), ("1", "STRING_COERCION_NOT_ALLOWED"),
            ("3", "STRING_COERCION_NOT_ALLOWED"), (True, "BOOLEAN_NOT_INTEGER"),
            (1.0, "FLOAT_NOT_INTEGER"), (None, "NULL"),
        ]
        for version, reason in cases:
            source = {"version": version, "etag": "etag", "bindings": []}
            result = MODULE.canonical_provider_policy_result(source, lambda response: dict(response))
            self.assertFalse(result["ok"])
            self.assertEqual(result["versionDiagnostic"]["versionNormalizationResult"], "INVALID")
            self.assertEqual(result["versionDiagnostic"]["versionNormalizationFailureReason"], reason)
            self.assertEqual(result["versionDiagnostic"]["versionAllowedSet"], [0, 1, 3])
            self.assertNotIn("private", json.dumps(result))

    def test_rejects_non_policy_shape_and_conversion_failure(self):
        self.assertIsNone(MODULE.canonical_provider_policy(None, lambda _response: None))
        self.assertIsNone(MODULE.canonical_provider_policy({}, lambda _response: (_ for _ in ()).throw(ValueError())))

    def test_version_etag_bindings_condition_and_audit_configs_round_trip(self):
        for version in (0, 1, 3):
            source = {"version": version, "etag": f"etag-{version}", "bindings": [
                {"role": "roles/viewer", "members": ["user:a@example.invalid"]},
                *([{"role": "roles/editor", "members": ["user:b@example.invalid"],
                    "condition": {"title": "limited", "expression": "request.time < timestamp('2030-01-01T00:00:00Z')"}}] if version == 3 else []),
            ], "auditConfigs": [{"service": "allServices", "auditLogConfigs": [
                {"logType": "DATA_READ", "exemptedMembers": ["user:c@example.invalid"]}
            ]}]}
            result = MODULE.canonical_provider_policy_result(source, lambda response: dict(response))
            self.assertTrue(result["ok"], result)
            self.assertEqual(json.loads(json.dumps(result["policy"])), source)
        empty = MODULE.canonical_provider_policy_result({"version": 3, "etag": "e", "bindings": []}, dict)
        self.assertEqual(empty["policy"]["bindings"], [])

    def test_mapping_subclass_and_message_like_conversion(self):
        class PolicyMapping(Mapping):
            def __init__(self, values):
                self.values = values
            def __getitem__(self, key): return self.values[key]
            def __iter__(self): return iter(self.values)
            def __len__(self): return len(self.values)

        source = {"version": 3, "etag": "opaque", "bindings": []}
        mapped = MODULE.canonical_provider_policy_result(PolicyMapping(source), None)
        self.assertTrue(mapped["ok"])
        class Message:
            DESCRIPTOR = object()
            def __init__(self, values): self.values = values
        converted = MODULE.canonical_provider_policy_result(Message(source), lambda obj: obj.values)
        self.assertTrue(converted["ok"])
        self.assertEqual(converted["policyObjectType"], "MESSAGE")
        self.assertEqual(converted["policy"], source)

    def test_response_extraction_is_direct_or_explicit_one_level_only(self):
        policy = {"version": 3, "etag": "safe-etag", "bindings": []}
        direct = MODULE.canonical_provider_policy_result(policy, dict)
        self.assertTrue(direct["ok"])
        self.assertEqual(direct["policyExtractionPath"], "DIRECT_POLICY_MAPPING")
        known = MODULE.canonical_provider_policy_result({"response": policy}, dict, wrapper_contract="response")
        self.assertTrue(known["ok"])
        self.assertEqual(known["policyExtractionPath"], "KNOWN_PROVIDER_WRAPPER_POLICY")
        unknown = MODULE.canonical_provider_policy_result({"payload": policy}, dict)
        self.assertFalse(unknown["ok"])
        self.assertEqual(unknown["policyExtractionPath"], "UNKNOWN_WRAPPER_OR_NON_POLICY_MAPPING")
        self.assertEqual(unknown["providerResponseShape"]["providerResponseObjectType"], "MAPPING")
        wrong_layer = MODULE.canonical_provider_policy_result({"response": policy}, dict, wrapper_contract="data")
        self.assertFalse(wrong_layer["ok"])

    def test_version_and_etag_failures_keep_safe_shape_diagnostics(self):
        for source, reason in [
            ({"etag": "e", "bindings": []}, "MISSING"),
            ({"version": True, "etag": "e", "bindings": []}, "BOOLEAN_NOT_INTEGER"),
            ({"version": 2, "etag": "e", "bindings": []}, "INTEGER_NOT_ALLOWED"),
        ]:
            failed = MODULE.canonical_provider_policy_result(source, dict)
            self.assertFalse(failed["ok"])
            self.assertEqual(failed["versionDiagnostic"]["versionNormalizationFailureReason"], reason)
            self.assertIn("policyExtractionPath", failed)
            self.assertIn("providerResponseObjectType", failed["providerResponseShape"])
        no_etag = MODULE.canonical_provider_policy_result({"version": 3, "bindings": []}, dict)
        self.assertEqual(no_etag["code"], "PROVIDER_POLICY_ETAG_INVALID")

    def test_unknown_response_values_are_not_persisted_in_shape_metadata(self):
        private = "private-response-value"
        result = MODULE.canonical_provider_policy_result({"payload": {"version": 3, "etag": private, "bindings": []}}, dict)
        serialized = json.dumps(result)
        self.assertNotIn(private, serialized)
        self.assertIn("unknownKeyCount", serialized)

    def test_message_default_zero_is_not_confused_with_missing(self):
        class Message:
            DESCRIPTOR = object()
            def __init__(self, include_version):
                if include_version:
                    self.version = 0
                self.etag = "message-etag"
                self.bindings = []

        converter = lambda _obj: {"etag": "message-etag", "bindings": []}
        zero = MODULE.canonical_provider_policy_result(Message(True), converter)
        self.assertTrue(zero["ok"], zero)
        self.assertEqual(zero["policy"]["version"], 0)
        self.assertEqual(zero["versionDiagnostic"]["versionSource"], "MESSAGE_ATTRIBUTE")
        missing = MODULE.canonical_provider_policy_result(Message(False), converter)
        self.assertFalse(missing["ok"])
        self.assertFalse(missing["versionDiagnostic"]["versionFieldPresent"])
        self.assertEqual(missing["versionDiagnostic"]["versionRawType"], "MISSING")

    def test_actual_installed_cloud_sdk_policy_version_state_matrix(self):
        candidates = [Path(os.environ["CLOUDSDK_ROOT_DIR"])] if os.environ.get("CLOUDSDK_ROOT_DIR") else []
        candidates.extend([Path.home() / "AppData/Local/Google/Cloud SDK/google-cloud-sdk",
                          Path("C:/Users/USER/AppData/Local/Google/Cloud SDK/google-cloud-sdk")])
        sdk_root = next((path for path in candidates if (path / "lib").is_dir()), None)
        if sdk_root is None:
            self.skipTest("installed Cloud SDK IAM message classes are unavailable")
        for path in (sdk_root / "lib", sdk_root / "lib/third_party"):
            if str(path) not in sys.path:
                sys.path.insert(0, str(path))
        from googlecloudsdk.generated_clients.apis.iam.v1 import iam_v1_messages
        from apitools.base.py import encoding_helper

        for version, state in ((None, "UNSET"), (0, "EXPLICIT"), (1, "EXPLICIT"), (3, "EXPLICIT")):
            policy = iam_v1_messages.Policy(etag=b"sdk-etag", bindings=[])
            if version is not None:
                policy.version = version
            normalized = MODULE.canonical_provider_policy_result(policy, encoding_helper.MessageToDict)
            self.assertTrue(normalized["ok"], normalized)
            self.assertEqual(normalized["returnedPolicyVersionState"], state)
            self.assertEqual(normalized["returnedPolicyVersionValue"], version)
            self.assertEqual(normalized["policy"]["version"], version)
            fields = normalized["responseFieldDiagnostic"]
            self.assertEqual(fields["apitoolsDirectVersionValue"], version)
            self.assertEqual(fields["messageToDictVersionPresent"], version is not None)
            self.assertEqual(fields["conditionCount"], 0)
            self.assertEqual(fields["withcondMarkerCount"], 0)
            self.assertTrue(fields["etagPresent"])

        condition = iam_v1_messages.Expr(expression="true")
        conditional_binding = iam_v1_messages.Binding(role="roles/viewer",
            members=["user:a@example.invalid"], condition=condition)
        for version in (None, 0, 1):
            policy = iam_v1_messages.Policy(etag=b"conditional-etag", bindings=[conditional_binding])
            if version is not None:
                policy.version = version
            rejected = MODULE.canonical_provider_policy_result(policy, encoding_helper.MessageToDict)
            self.assertFalse(rejected["ok"])
            self.assertEqual(rejected["code"], "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY")
        conditional_v3 = iam_v1_messages.Policy(etag=b"conditional-etag", version=3,
            bindings=[conditional_binding])
        accepted = MODULE.canonical_provider_policy_result(conditional_v3, encoding_helper.MessageToDict)
        self.assertTrue(accepted["ok"], accepted)
        self.assertEqual(accepted["policy"]["bindings"][0]["condition"]["expression"], "true")

        marked = iam_v1_messages.Policy(etag=b"marker-etag", version=3,
            bindings=[iam_v1_messages.Binding(role="roles/viewer_withcond_marker", members=["user:a@example.invalid"])])
        self.assertEqual(MODULE.canonical_provider_policy_result(marked, encoding_helper.MessageToDict)["code"],
                         "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY")

    def test_unset_message_conditions_fail_closed_and_request_version_is_independent(self):
        class Message:
            version = None
            etag = "etag"
            bindings = [{"role": "roles/viewer", "members": ["user:a@example.invalid"],
                         "condition": {"expression": "true"}}]
        field = type("Field", (), {"type": "INT32"})()
        Message.DESCRIPTOR = type("Descriptor", (), {"fields_by_name": {"version": field}})()
        result = MODULE.canonical_provider_policy_result(Message(), lambda _value: {"etag": "etag", "bindings": Message.bindings})
        self.assertFalse(result["ok"])
        self.assertEqual(result["code"], "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY")
        self.assertEqual(request_context()[1]["requestedPolicyVersion"], 3)

    def test_conversion_failures_are_specific_and_safe(self):
        class ProtoMessage:
            DESCRIPTOR = object()
        result = MODULE.canonical_provider_policy_result(ProtoMessage(), lambda _obj: (_ for _ in ()).throw(ValueError("private detail")))
        self.assertEqual(result["code"], "PROVIDER_POLICY_PROTOBUF_CONVERSION_FAILED")
        self.assertEqual(result["canonicalizationStage"], "MESSAGE_TO_DICT")
        self.assertNotIn("private detail", json.dumps(result))
        class PlainObject:
            pass
        result = MODULE.canonical_provider_policy_result(PlainObject(), lambda _obj: (_ for _ in ()).throw(ValueError("private detail")))
        self.assertEqual(result["code"], "PROVIDER_POLICY_DICT_CONVERSION_FAILED")

    def test_allowlisted_attribute_objects_are_projected_without_stringification(self):
        class Condition:
            title = "scope"
            expression = "true"
        class Binding:
            role = "roles/viewer"
            members = ("user:a@example.invalid",)
            condition = Condition()
        class Policy:
            version = 3
            etag = b"exact-etag"
            bindings = (Binding(),)
        result = MODULE.canonical_provider_policy_result(Policy(), lambda _obj: None)
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["policy"]["etag"], "exact-etag")
        self.assertEqual(result["policy"]["bindings"][0]["condition"], {"expression": "true", "title": "scope"})

    def test_bytes_etag_requires_valid_utf8(self):
        good = MODULE.canonical_provider_policy_result({"version": 3, "etag": bytearray(b"etag"), "bindings": []}, dict)
        self.assertFalse(good["ok"])
        self.assertEqual(good["code"], "PROVIDER_POLICY_ETAG_INVALID")
        bad = MODULE.canonical_provider_policy_result({"version": 3, "etag": b"\xff", "bindings": []}, dict)
        self.assertEqual(bad["code"], "PROVIDER_POLICY_ETAG_INVALID")
        utf8 = MODULE.canonical_provider_policy_result({"version": 3, "etag": "etag".encode(), "bindings": []}, dict)
        self.assertTrue(utf8["ok"])
        self.assertEqual(utf8["policy"]["etag"], "etag")

    def test_failure_taxonomy_unknown_fields_and_cycles_fail_closed(self):
        cases = [
            ({"version": 3, "etag": "e", "bindings": "bad"}, "PROVIDER_POLICY_BINDINGS_INVALID"),
            ({"version": 3, "etag": "e", "bindings": [], "futurePolicyField": True}, "PROVIDER_POLICY_UNSUPPORTED_VALUE"),
            ({"version": "3", "etag": "e", "bindings": []}, "PROVIDER_POLICY_VERSION_TYPE_INVALID"),
            ({"version": 3, "etag": "", "bindings": []}, "PROVIDER_POLICY_ETAG_INVALID"),
        ]
        for policy, code in cases:
            self.assertEqual(MODULE.canonical_provider_policy_result(policy, dict)["code"], code)
        cyclic = {"version": 3, "etag": "e", "bindings": []}
        cyclic["extra"] = cyclic
        self.assertEqual(MODULE.canonical_provider_policy_result(cyclic, dict)["code"], "PROVIDER_POLICY_UNSUPPORTED_VALUE")

    def test_python_success_envelope_json_stdout_round_trip(self):
        for version in (0, 1, 3):
            normalized = MODULE.canonical_provider_policy_result({"version": version, "etag": b"etag", "bindings": []}, dict)
            _request, identity = request_context()
            envelope = MODULE.build_policy_success_envelope(normalized["policy"], identity, normalized)
            stdout = json.dumps(envelope, separators=(",", ":"), sort_keys=True)
            parsed = json.loads(stdout)
            self.assertEqual(parsed["policy"]["etag"], "etag")
            self.assertEqual(parsed["policy"]["version"], version)
            self.assertEqual(parsed["returnedPolicyVersion"], version)
            self.assertEqual(parsed["requestedPolicyVersion"], 3)
            self.assertEqual(parsed["versionDiagnostic"]["versionRawPrimitiveValue"], version)
            self.assertTrue(parsed["requestMetadata"]["resourceValidatedBeforeDispatch"])
            MODULE._phase = "PHASE_08_HELPER_SERIALIZATION"
            MODULE._provider_request_prepared = True
            MODULE._provider_request_started = True
            MODULE._provider_response_received = True
            MODULE._http_status = 200
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                with self.assertRaises(SystemExit) as exit_result:
                    MODULE.emit(envelope)
            self.assertEqual(exit_result.exception.code, 0)
            stdout_value = json.loads(output.getvalue())
            self.assertEqual(stdout_value["policy"], normalized["policy"])
            self.assertEqual(stdout_value["transportLifecycle"]["httpStatus"], 200)

    def test_service_account_read_version_and_condition_matrix(self):
        base = {"etag": b"safe-etag", "bindings": []}
        for version in (0, 1, 3):
            result = MODULE.normalize_provider_read({**base, "version": version}, None, dict)
            self.assertTrue(result["ok"], result)
            self.assertEqual(result["policy"]["version"], version)
            self.assertEqual(result["versionDiagnostic"]["versionAllowedSet"], [0, 1, 3])
            self.assertTrue(result["responseFieldDiagnostic"]["etagPresent"])
        conditioned = {"role": "roles/viewer", "members": ["user:test@example.invalid"],
                       "condition": {"title": "scope", "expression": "true"}}
        self.assertTrue(MODULE.normalize_provider_read(
            {**base, "version": 3, "bindings": [conditioned]}, None, dict)["ok"])
        for policy, code in [
            ({**base, "version": 0, "bindings": [conditioned]}, "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY"),
            ({**base, "version": 0, "bindings": [{"role": "roles/viewer_withcond_x", "members": []}]},
             "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY"),
            ({**base, "version": 1, "bindings": [conditioned]}, "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY"),
            ({**base, "version": 1, "bindings": [{"role": "roles/viewer_withcond_x", "members": []}]},
             "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY"),
            ({**base, "version": 2}, "PROVIDER_POLICY_VERSION_UNSUPPORTED"),
            (base, "PROVIDER_POLICY_VERSION_MISSING"),
            ({**base, "version": "1"}, "PROVIDER_POLICY_VERSION_TYPE_INVALID"),
            ({**base, "version": "3"}, "PROVIDER_POLICY_VERSION_TYPE_INVALID"),
        ]:
            result = MODULE.normalize_provider_read(policy, None, dict)
            self.assertFalse(result["ok"])
            self.assertEqual(result["code"], code)
            self.assertTrue(result["responseFieldDiagnostic"]["etagPresent"])

    def test_message_and_converted_version_diagnostics_are_independent(self):
        class Message:
            DESCRIPTOR = object()
            version = 1
            etag = b"safe-etag"
            bindings = []
        result = MODULE.normalize_provider_read(Message(), None,
            lambda _message: {"version": 1, "etag": "safe-etag", "bindings": []})
        self.assertTrue(result["ok"], result)
        fields = result["responseFieldDiagnostic"]
        self.assertEqual((fields["protobufVersionFieldPresent"], fields["protobufVersionValue"]), (True, 1))
        self.assertEqual((fields["messageToDictVersionPresent"], fields["messageToDictVersionValue"]), (True, 1))
        self.assertEqual(fields["bindingsCount"], 0)

    def test_implicit_presence_default_zero_uses_direct_scalar(self):
        class Field:
            type = 5
            has_presence = False
            default_value = 0
        field = Field()
        class Descriptor:
            fields_by_name = {"version": field}
        class ProtoPolicy:
            DESCRIPTOR = Descriptor()
            def __init__(self, version):
                self.version = version
                self.etag = "safe-etag"
                self.bindings = []
            def ListFields(self):
                return [] if self.version == 0 else [(field, self.version)]
        for version in (0, 1, 3):
            message = ProtoPolicy(version)
            calls = []
            def to_dict(value, **kwargs):
                calls.append(kwargs)
                include_defaults = bool(kwargs)
                return {"etag": value.etag, "bindings": [], **({"version": value.version} if value.version or include_defaults else {})}
            result = MODULE.normalize_provider_read(message, None, to_dict)
            self.assertTrue(result["ok"], result)
            self.assertEqual(result["policy"]["version"], version)
            diagnostic = result["responseFieldDiagnostic"]
            self.assertEqual(diagnostic["protobufVersionValue"], version)
            self.assertEqual(diagnostic["versionDirectPresent"], True)
            self.assertEqual(diagnostic["versionDirectType"], "INTEGER")
            self.assertEqual(diagnostic["versionDirectValue"], version)
            self.assertEqual(diagnostic["versionDescriptorType"], 5)
            self.assertFalse(diagnostic["versionHasPresence"])
            self.assertEqual(diagnostic["versionDefaultValue"], 0)
            self.assertEqual(diagnostic["versionListedInListFields"], version != 0)
            self.assertTrue(diagnostic["messageToDictDefaultsVersionPresent"])
            self.assertEqual(diagnostic["messageToDictDefaultsVersionValue"], version)
            self.assertTrue(calls[-1].get("always_print_fields_with_no_presence"))


if __name__ == "__main__" and ("--emit-installed-sdk-unset-envelope" in sys.argv
        or any(item.startswith("--emit-installed-sdk-policy-envelope") for item in sys.argv)):
    roots = [Path(os.environ["CLOUDSDK_ROOT_DIR"])] if os.environ.get("CLOUDSDK_ROOT_DIR") else []
    roots.extend([Path.home() / "AppData/Local/Google/Cloud SDK/google-cloud-sdk",
                  Path("C:/Users/USER/AppData/Local/Google/Cloud SDK/google-cloud-sdk")])
    sdk_root = next((path for path in roots if (path / "lib").is_dir()), None)
    if sdk_root is None:
        raise SystemExit("installed Cloud SDK is required for this integration fixture")
    sys.path[:0] = [str(sdk_root / "lib"), str(sdk_root / "lib/third_party")]
    from googlecloudsdk.generated_clients.apis.iam.v1 import iam_v1_messages
    from apitools.base.py import encoding_helper
    version_argument = next((item.split("=", 1)[1] for item in sys.argv if item.startswith("--version=")), "unset")
    bindings = [] if version_argument == "unset" else [iam_v1_messages.Binding(
        role="roles/viewer", members=["user:fixture@example.invalid"])]
    if version_argument == "3":
        bindings.append(iam_v1_messages.Binding(role="roles/editor", members=["user:condition@example.invalid"],
            condition=iam_v1_messages.Expr(title="fixture", description="fixture condition", expression="true")))
    policy_kwargs = {"etag": b"installed-sdk-unset-etag" if version_argument == "unset"
                     else b"installed-sdk-policy-etag", "bindings": bindings}
    if version_argument != "unset":
        policy_kwargs["version"] = int(version_argument)
    policy_result = MODULE.canonical_provider_policy_result(
        iam_v1_messages.Policy(**policy_kwargs), encoding_helper.MessageToDict)
    expected_state = "UNSET" if version_argument == "unset" else "EXPLICIT"
    expected_value = None if version_argument == "unset" else int(version_argument)
    if not policy_result["ok"] or policy_result["returnedPolicyVersionState"] != expected_state \
            or policy_result["returnedPolicyVersionValue"] != expected_value:
        raise SystemExit("installed SDK Policy normalization failed")
    _request, identity = request_context()
    MODULE._phase = "PHASE_08_HELPER_SERIALIZATION"
    MODULE._provider_request_prepared = True
    MODULE._provider_request_started = True
    MODULE._provider_response_received = True
    MODULE._http_status = 200
    MODULE.emit(MODULE.build_policy_success_envelope(policy_result["policy"], identity, policy_result))
elif __name__ == "__main__" and "--emit-success-envelope" in sys.argv:
    version_argument = next((item.split("=", 1)[1] for item in sys.argv if item.startswith("--version=")), "3")
    fixture_version = int(version_argument)
    policy_result = MODULE.canonical_provider_policy_result(
        {"version": fixture_version, "etag": b"cross-runtime-etag", "bindings": [
            {"role": "roles/viewer", "members": ["user:fixture@example.invalid"], **({"condition": {"title": "fixture", "expression": "true"}} if fixture_version == 3 else {})}
        ]}, dict)
    _request, identity = request_context()
    envelope = MODULE.build_policy_success_envelope(policy_result["policy"], identity, policy_result)
    MODULE._phase = "PHASE_08_HELPER_SERIALIZATION"
    MODULE._provider_request_prepared = True
    MODULE._provider_request_started = True
    MODULE._provider_response_received = True
    MODULE._http_status = 200
    MODULE.emit(envelope)
elif __name__ == "__main__":
    unittest.main()
