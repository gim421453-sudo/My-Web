import importlib.util
import os
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).parents[2]
HELPER_PATH = ROOT / "tools" / "authority-audit" / "g2b_explicit_set_iam_policy_transport.py"
SPEC = importlib.util.spec_from_file_location("g2b_installed_sdk_transport", HELPER_PATH)
HELPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HELPER)


def installed_sdk():
    roots = [Path(os.environ["CLOUDSDK_ROOT_DIR"])] if os.environ.get("CLOUDSDK_ROOT_DIR") else []
    roots.extend([Path.home() / "AppData/Local/Google/Cloud SDK/google-cloud-sdk",
                  Path("C:/Users/USER/AppData/Local/Google/Cloud SDK/google-cloud-sdk")])
    root = next((candidate for candidate in roots if (candidate / "lib").is_dir()), None)
    if root is None:
        raise unittest.SkipTest("installed Cloud SDK IAM message classes are unavailable")
    sys.path[:0] = [str(root / "lib"), str(root / "lib/third_party")]
    from googlecloudsdk.generated_clients.apis.iam.v1 import iam_v1_client, iam_v1_messages
    from apitools.base.py import encoding_helper
    return root, iam_v1_client, iam_v1_messages, encoding_helper


class InstalledApitoolsPolicyResponseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sdk_root, cls.client_module, cls.messages, cls.encoding = installed_sdk()

    def test_get_iam_policy_metadata_declares_direct_policy_response(self):
        config = self.client_module.IamV1.ProjectsServiceAccountsService.GetIamPolicy.method_config()
        self.assertEqual(config.response_type_name, "Policy")
        self.assertIn("return self._RunMethod(",
                      (self.sdk_root / "lib/googlecloudsdk/generated_clients/apis/iam/v1/iam_v1_client.py").read_text(encoding="utf-8"))

    def test_empty_apitools_policy_unset_fields_and_recovery_eligibility(self):
        fixtures = [self.messages.Policy(), self.messages.Policy(etag=b"fixture-etag"),
                    self.messages.Policy(etag=b"fixture-etag", bindings=[])]
        for response in fixtures:
            self.assertIs(type(response), self.messages.Policy)
            self.assertTrue(hasattr(response, "bindings"))
            self.assertIsNotNone(response.bindings)
            self.assertEqual(len(response.bindings), 0)
            serialized = self.encoding.MessageToDict(response)
            self.assertNotIn("bindings", serialized)

        response = self.messages.Policy(etag=b"fixture-etag", bindings=[])
        normalized = HELPER.normalize_provider_read(response, None, self.encoding.MessageToDict)
        self.assertTrue(normalized["ok"], normalized)
        self.assertEqual(normalized["policy"]["bindings"], [])
        self.assertIsNone(normalized["policy"]["version"])
        self.assertEqual(normalized["returnedPolicyVersionState"], "UNSET")
        self.assertEqual(normalized["responseFieldDiagnostic"]["apitoolsBindingsState"], "UNSET")
        self.assertTrue(normalized["responseFieldDiagnostic"]["apitoolsPolicyClassVerified"])
        self.assertEqual(normalized["responseFieldDiagnostic"]["apitoolsDirectEtagType"], "BYTES")
        self.assertTrue(HELPER.valid_generation_bound_recovery_policy(normalized["policy"], normalized))

    def test_actual_version_binding_and_condition_matrix(self):
        for version in (0, 1, 3):
            response = self.messages.Policy(etag=b"fixture-etag", version=version, bindings=[])
            normalized = HELPER.normalize_provider_read(response, None, self.encoding.MessageToDict)
            self.assertTrue(normalized["ok"], normalized)
            self.assertEqual(normalized["returnedPolicyVersionState"], "EXPLICIT")
            self.assertEqual(normalized["returnedPolicyVersionValue"], version)
            self.assertTrue(HELPER.valid_generation_bound_recovery_policy(normalized["policy"], normalized))

        binding = self.messages.Binding(role="roles/viewer", members=["user:fixture@example.invalid"],
            condition=self.messages.Expr(expression="true"))
        conditional = self.messages.Policy(etag=b"fixture-etag", version=3, bindings=[binding])
        normalized = HELPER.normalize_provider_read(conditional, None, self.encoding.MessageToDict)
        self.assertTrue(normalized["ok"], normalized)
        self.assertEqual(normalized["responseFieldDiagnostic"]["apitoolsBindingsState"], "PRESENT")

        for version in (None, 0, 1):
            response = self.messages.Policy(etag=b"fixture-etag", bindings=[binding])
            if version is not None:
                response.version = version
            rejected = HELPER.normalize_provider_read(response, None, self.encoding.MessageToDict)
            self.assertFalse(rejected["ok"])
            self.assertEqual(rejected["code"], "PROVIDER_POLICY_VERSION_CONDITION_INCONSISTENCY")

    def test_null_bindings_are_rejected_outside_exact_sdk_contract(self):
        mapping = HELPER.normalize_provider_read({"version": 3, "etag": "fixture", "bindings": None}, None, dict)
        self.assertFalse(mapping["ok"])
        self.assertEqual(mapping["code"], "PROVIDER_POLICY_BINDINGS_INVALID")

        class UnknownPolicy:
            version = 3
            etag = "fixture"
            bindings = None

        unknown = HELPER.normalize_provider_read(UnknownPolicy(), None,
            lambda _value: {"version": 3, "etag": "fixture", "bindings": None})
        self.assertFalse(unknown["ok"])

        class MessageLike:
            DESCRIPTOR = type("Descriptor", (), {"fields_by_name": {
                "version": type("Field", (), {"type": "INT32"})()}})()
            version = None
            etag = "fixture"
            bindings = []

        fake_unset = HELPER.normalize_provider_read(MessageLike(), None,
            lambda _value: {"etag": "fixture", "bindings": []})
        self.assertTrue(fake_unset["ok"], fake_unset)
        self.assertFalse(HELPER.valid_generation_bound_recovery_policy(fake_unset["policy"], fake_unset))


if __name__ == "__main__":
    unittest.main()
