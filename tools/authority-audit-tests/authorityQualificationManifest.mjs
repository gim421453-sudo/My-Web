const TEST_PATHS = `
tools/authority-audit-tests/authorityInventory.integration.mjs
tools/authority-audit-tests/authorityInventory.test.mjs
tools/authority-audit-tests/c1a3ExactClassStateReadCaller.test.mjs
tools/authority-audit-tests/c1a6H-R1HostSafeTransport.test.mjs
tools/authority-audit-tests/collectionIdSetFingerprint.test.mjs
tools/authority-audit-tests/exactClassStateRead.test.mjs
tools/authority-audit-tests/f4WriterPolicyStructureDiagnostic.test.mjs
tools/authority-audit-tests/g2bCasEvidenceCapture.test.mjs
tools/authority-audit-tests/g2bCleanGenerationBootstrap.test.mjs
tools/authority-audit-tests/g2bCleanGenerationBootstrapDryRun.integration.mjs
tools/authority-audit-tests/g2bCleanGenerationCasEvidenceCapture.integration.test.mjs
tools/authority-audit-tests/g2bCleanGenerationCasEvidenceCapture.test.mjs
tools/authority-audit-tests/g2bCredentialRefreshPacket.test.mjs
tools/authority-audit-tests/g2bCredentialRefreshTransport.test.mjs
tools/authority-audit-tests/g2bCurrentRunExecutionIntent.test.mjs
tools/authority-audit-tests/g2bDirectCachedCredentialReadiness.test.mjs
tools/authority-audit-tests/g2bDirectContextPermissionDiagnostic.test.mjs
tools/authority-audit-tests/g2bDirectContextPermissionDiagnosticPacket.test.mjs
tools/authority-audit-tests/g2bDirectCredentialRefresh.test.mjs
tools/authority-audit-tests/g2bDirectCredentialRefreshContinuation.test.mjs
tools/authority-audit-tests/g2bDirectCredentialRefreshPacket.test.mjs
tools/authority-audit-tests/g2bExactPermissionDiagnosticExecutor.test.mjs
tools/authority-audit-tests/g2bExactPermissionDiagnosticPacket.test.mjs
tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs
tools/authority-audit-tests/g2bExplicitSetIamPolicySdkContract.test.mjs
tools/authority-audit-tests/g2bExplicitSetIamPolicyTransport.test.mjs
tools/authority-audit-tests/g2bInstalledApitoolsPolicyResponse.test.py
tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecovery.test.mjs
tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV2.test.mjs
tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3.test.mjs
tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3R1.test.mjs
tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3R2.test.mjs
tools/authority-audit-tests/g2bHostAnchorAttestation.test.mjs
tools/authority-audit-tests/g2bHostAnchorAttestationHost.integration.mjs
tools/authority-audit-tests/g2bLocalPinnedIdentityResolver.test.mjs
tools/authority-audit-tests/g2bM3AnchorReadOnlyRecoveryEvidence.test.mjs
tools/authority-audit-tests/g2bM3AnchorReadOnlyRecoveryExecutor.test.mjs
tools/authority-audit-tests/g2bM3AuthorityReattestation.test.mjs
tools/authority-audit-tests/g2bM3CurrentLiveAttestation.test.mjs
tools/authority-audit-tests/g2bM3CurrentLiveExecutor.test.mjs
tools/authority-audit-tests/g2bM3CurrentReadOnlyRecoveryApprovalPacket.test.mjs
tools/authority-audit-tests/g2bM3IndeterminateRecoveryApprovalPacket.test.mjs
tools/authority-audit-tests/g2bM3IndeterminateRecoveryApprovalPacketV2.test.mjs
tools/authority-audit-tests/g2bM3LiveApprovalPacket.test.mjs
tools/authority-audit-tests/g2bM3NewGenerationAnchorRecoveryPreparation.test.mjs
tools/authority-audit-tests/g2bM3NewGenerationAuthorityPreparation.test.mjs
tools/authority-audit-tests/g2bM3NewGenerationIsolation.test.mjs
tools/authority-audit-tests/g2bM3NewGenerationPersistedArtifacts.test.mjs
tools/authority-audit-tests/g2bM3NewOperationApprovalPacket.test.mjs
tools/authority-audit-tests/g2bM3PostAccountingReattestation.test.mjs
tools/authority-audit-tests/g2bM3ProspectiveSafetyAdjudication.test.mjs
tools/authority-audit-tests/g2bM3ProspectiveSafetyReview.test.mjs
tools/authority-audit-tests/g2bM3ProviderProcessDiagnosticPacketV2.test.mjs
tools/authority-audit-tests/g2bM3RecoveryAnchorRuntime.test.mjs
tools/authority-audit-tests/g2bM3RemoteCapabilityAccountingRepair.test.mjs
tools/authority-audit-tests/g2bM3ResolvedStoreFixedApprovalPacket.test.mjs
tools/authority-audit-tests/g2bM3ResolvedStoreFixedLiveEvidence.test.mjs
tools/authority-audit-tests/g2bM3RootCauseFixedApprovalPacket.test.mjs
tools/authority-audit-tests/g2bM3SourceLockedRecoveryApproval.test.mjs
tools/authority-audit-tests/g2bM3SourceLockedRecoveryResult.test.mjs
tools/authority-audit-tests/g2bNodePythonFakeProviderCas.integration.test.mjs
tools/authority-audit-tests/g2bPolicyResponseNormalizer.test.py
tools/authority-audit-tests/g2bRecoveryAnchor.test.mjs
tools/authority-audit-tests/g2bRecoveryAnchorFailureMatrix.test.mjs
tools/authority-audit-tests/g2bRecoveryPathCredentialRefresh.test.mjs
tools/authority-audit-tests/g2bRecoveryPathCredentialRefreshV2.test.mjs
tools/authority-audit-tests/g2bRecoveryPostExecutionEvidence.test.mjs
tools/authority-audit-tests/g2bRecoveryV2CredentialRefreshPreparation.test.mjs
tools/authority-audit-tests/g2bRecoveryV2NextCredentialRefreshPreparation.test.mjs
tools/authority-audit-tests/g2bRecoveryV3R1CredentialRefreshPreparation.test.mjs
tools/authority-audit-tests/g2bRecoveryV3R2CredentialRefreshPreparation.test.mjs
tools/authority-audit-tests/g2bRecoveryV3R2RefreshReadBridge.test.mjs
tools/authority-audit-tests/g2bRepairedM3AuthorityPreparation.test.mjs
tools/authority-audit-tests/g2bRepairedM3AuthorityPreparationV2.test.mjs
tools/authority-audit-tests/g2bRepairedM3DpapiRecoveryReattestation.test.mjs
tools/authority-audit-tests/g2bRepairedM3ProspectiveSafetyReattestation.test.mjs
tools/authority-audit-tests/g2bTransportHelperEnvelope.test.py
tools/authority-audit-tests/g2bV3DiagnosticContinuityAttestation.test.mjs
tools/authority-audit-tests/g2bV3ExactPermissionPacket.test.mjs
tools/authority-audit-tests/g2bV3ExactPermissionResultEvidence.test.mjs
tools/authority-audit-tests/g2bV3R2SourceLockValidator.test.mjs
tools/authority-audit-tests/g4FailClosedOutcomeClassifierAttestation.test.mjs
tools/authority-audit-tests/g4r1PostG4RuntimeCapabilityAttestation.test.mjs
tools/authority-audit-tests/g4r2PostG4FinalM3ExecutionComposite.test.mjs
tools/authority-audit-tests/g4r3dExactCallerTargetMemberIdentityContract.test.mjs
tools/authority-audit-tests/g4r3fPinnedAccountCredentialFallback.test.mjs
tools/authority-audit-tests/g4r3hExactEffectiveCallerIdentity.test.mjs
tools/authority-audit-tests/g4r3hExactEffectiveCallerIdentityAttestation.test.mjs
tools/authority-audit-tests/g4r3hF1AttestationIntegrityDriftForensic.test.mjs
tools/authority-audit-tests/g4r3hR2CurrentStateExactIdentityImplementation.test.mjs
tools/authority-audit-tests/g4r3r1PostIdentityPatchRuntimeCapabilityAttestationV2.test.mjs
tools/authority-audit-tests/g4r3r2PostIdentityPatchFinalM3ExecutionComposite.test.mjs
tools/authority-audit-tests/g4r3sEffectiveCallerPinningSemantics.test.mjs
tools/authority-audit-tests/gcloudInstalledIamCommandContract.test.mjs
tools/authority-audit-tests/gcloudStderrDiagnosticAnalyzer.test.mjs
tools/authority-audit-tests/gcloudTokenOutputClassifier.test.mjs
tools/authority-audit-tests/historicalAuthorityClassification.test.mjs
tools/authority-audit-tests/m3l3B1BudgetGraphReconciliation.test.mjs
tools/authority-audit-tests/m3l3CorrectedBudgetLiveExecutionEvidence.test.mjs
tools/authority-audit-tests/m3l3M3R2ApprovalPacketVerifier.test.mjs
tools/authority-audit-tests/m3l3M3R3CanonicalRuntimeRelock.test.mjs
tools/authority-audit-tests/m3l3M3R3LiveApprovalPacket.test.mjs
tools/authority-audit-tests/m3l3M3R3LivePacketV2Verifier.test.mjs
tools/authority-audit-tests/m3l3M3R3PostIndeterminateRecoveryStrategy.test.mjs
tools/authority-audit-tests/m3l3PostFailureRecoveryExecutor.test.mjs
tools/authority-audit-tests/m3l3PostFailureRecoveryPlan.test.mjs
tools/authority-audit-tests/m3l3PostIdentityPatchLiveExecutionEvidence.test.mjs
tools/authority-audit-tests/m3l3R1RecoveryEvidence.test.mjs
tools/authority-audit-tests/m3l3R2ApprovalPacketVerifier.test.mjs
tools/authority-audit-tests/m3l3R2RecoveryEvidence.test.mjs
tools/authority-audit-tests/m3l3R3ApprovalPacketVerifier.test.mjs
tools/authority-audit-tests/m3l3R3CanonicalPolicyParser.test.mjs
tools/authority-audit-tests/m3l3R3CanonicalPolicyParserAttestation.test.mjs
tools/authority-audit-tests/m3l3R3CanonicalPolicyRecoveryExecutor.test.mjs
tools/authority-audit-tests/m3l3R3CanonicalPolicyRecoveryPlan.test.mjs
tools/authority-audit-tests/m3l3R3RecoveryEvidence.test.mjs
tools/authority-audit-tests/m3l3ReadFailureDiagnosticExecutor.test.mjs
tools/authority-audit-tests/m3l3Rf1ResultAssemblyFixAttestation.test.mjs
tools/authority-audit-tests/m3l3SafeResultAssembler.test.mjs
tools/authority-audit-tests/m3MutationOutcomeClassifierG4.test.mjs
tools/authority-audit-tests/m3RuntimeCommandGraph.test.mjs
tools/authority-audit-tests/oldWriterContainmentEvidence.test.mjs
tools/authority-audit-tests/r1b3hHelperV2Attestation.test.mjs
tools/authority-audit-tests/r1b4RecoveryEvidence.test.mjs
tools/authority-audit-tests/r1c1RecoveryCompositeAttestation.test.mjs
tools/authority-audit-tests/replacementWriterCreate.test.mjs
tools/authority-audit-tests/replacementWriterCreateFailureEvidence.test.mjs
tools/authority-audit-tests/replacementWriterG2BCreate.test.mjs
tools/authority-audit-tests/replacementWriterG2BCreateExecutionEvidence.test.mjs
tools/authority-audit-tests/replacementWriterG2BPreflight.test.mjs
tools/authority-audit-tests/replacementWriterG2BPreflightExecutionEvidence.test.mjs
tools/authority-audit-tests/replacementWriterIdentityRedesign.test.mjs
tools/authority-audit-tests/replacementWriterPreflight.test.mjs
tools/authority-audit-tests/runAuthorityQualification.test.mjs
tools/authority-audit-tests/windowsDpapiSecretProvider.test.mjs
tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs
tools/authority-audit-tests/windowsProcessSynthetic.test.mjs
tools/authority-audit-tests/writerPolicyTargetRoleAbsenceDiagnostic.test.mjs
tools/authority-audit-tests/writerPolicyTargetRoleAbsenceDiagnosticV2.test.mjs
tools/authority-audit-tests/writerRotationAuthority.test.mjs
`.trim().split(/\s+/);

function categoryFor(path) {
  if (/PolicyResponseNormalizer|CanonicalPolicyParser/.test(path)) return "CURRENT_RESPONSE_PARSER";
  if (/Transport|HelperEnvelope|NodePythonFakeProviderCas/.test(path)) return "CURRENT_TRANSPORT";
  if (/CasEvidence|CleanGeneration/.test(path)) return "CURRENT_CAS";
  if (/Bootstrap|Manifest|Resolver|GenerationBound/.test(path)) return "CURRENT_BOOTSTRAP";
  return "CURRENT_SECURITY";
}

function environmentFor(path) {
  if (path.endsWith("authorityInventory.integration.mjs")) return "LOCAL_FIRESTORE_EMULATOR";
  if (path.includes("Host.integration.mjs") || path.includes("windowsDpapi")) return "TRUSTED_WINDOWS_CURRENT_USER";
  if (path.endsWith(".py")) return "TRUSTED_PYTHON";
  return "LOCAL_NODE";
}

function commandFor(path) {
  if (path.endsWith("authorityInventory.integration.mjs")) {
    return [process.execPath, "tools/authority-audit-tests/run-emulator.mjs"];
  }
  if (path.endsWith(".py")) return ["python", path];
  return [process.execPath, path];
}

const reviewedEvidence = (path, sha256, reason, replacementTestIds) => Object.freeze({
  path,
  sha256,
  currentPathIndependent: true,
  reason,
  replacementTestIds: Object.freeze(replacementTestIds),
});

const CLASSIFICATION_OVERRIDES = Object.freeze({
  "authorityInventory.integration": {
    expectedClassification: "ENVIRONMENT_DEPENDENT",
    productionReachability: "TEST_ONLY",
    classificationEvidence: reviewedEvidence("tools/authority-audit-tests/run-emulator.mjs", "ce14accd788a6edc0fced00621b8a2ab9de33ffd5ff7916dcf4db1b75297d0ac", "Runner binds Firestore Emulator to an OS-selected loopback port and uses a temporary Firebase config with the repository rules file; the demo project prevents access to non-emulated services.", ["authorityInventory.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERROR_AUTHORITY_AUDIT_EMULATOR_PORT_CONFLICT" },
  },
  "g2bExplicitSetIamPolicySdkContract.test": {
    expectedClassification: "STALE_TEST_FIXTURE",
    productionReachability: "SHARED_COMPATIBILITY",
    classificationEvidence: reviewedEvidence("tools/authority-audit-tests/g2bPolicyResponseNormalizer.test.py", "02c5a16d23a6bef253ad9c5f57de8e37a43c0268bf51ef45ba16590c73802aa4", "The assertion pins the obsolete source spelling policy['version']; the helper now normalizes explicit MessageToDict output through returnedPolicyVersionValue. The same installed SDK Policy object path is exercised by g2bExplicitSetIamPolicyAuthTransport.test and the response normalizer tests.", ["g2bExplicitSetIamPolicyAuthTransport.test", "g2bPolicyResponseNormalizer.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_40" },
  },
  "g2bM3AuthorityReattestation.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-anchor-implementation-attestation-v1.json", "df30ddae9faf1dc9ecbda7e93dc12df8c58780cc190a871ca8b738f95e0f21eb", "The test compares persisted v1 implementation/runtime/composite attestations byte-for-byte to builders using current source. The source drift is expected for immutable historical attestations; current clean bootstrap and host-attestation contracts have separate tests.", ["g2bCleanGenerationBootstrap.test", "g2bHostAnchorAttestation.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_15" },
  },
  "g2bM3NewOperationApprovalPacket.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-operation-approval-packet.md", "d563301f6ced263efb958588b0e6691b4ef72bb0d4660b2fcf43b474a56b3022", "The dynamic packet verifier and tamper matrix pass before comparison with the persisted old approval document; the failing field is an immutable historical digest, not current packet eligibility.", ["g2bM3NewGenerationIsolation.test", "g2bCleanGenerationBootstrap.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_28" },
  },
  "g2bM3ResolvedStoreFixedLiveEvidence.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-resolvedstore-fixed-live-approval-packet.md", "3679970d0d199c5238fd0739fc6afb4d5f9afde1721d044352a09c07969b64c4", "Runtime verification and historical evidence/result digest links pass; only the persisted approval packet digest differs from a newly built packet. The old document must remain unchanged.", ["g2bM3AnchorReadOnlyRecoveryEvidence.test", "g2bCleanGenerationBootstrap.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_65" },
  },
  "g2bM3RootCauseFixedApprovalPacket.test": {
    expectedClassification: "OBSOLETE_EXPECTED_FAILURE",
    productionReachability: "SHARED_COMPATIBILITY",
    classificationEvidence: reviewedEvidence("tools/authority-audit/g2bM3CurrentLiveExecutor.mjs", "7be2fd16eabb227d7b58578fb4b4497e189093ba3cc5115fec71b600017bc750", "The failed assertion requires a parser function name to appear textually in the executor. The current executor delegates through the direct auth transport; current parser and executor semantics are independently tested, so this old implementation-shape assertion is obsolete.", ["g2bM3CurrentLiveExecutor.test", "m3l3R3CanonicalPolicyParser.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_56" },
  },
  "g2bM3SourceLockedRecoveryApproval.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-source-locked-read-only-anchor-recovery-approval.md", "d9ada3419c1125cf9d536ee37a7121860630757fac242fbf8953f294a4399a20", "The source-lock and generated historical approval chain validate; the mismatch is at the persisted approval document's fixed attestation/packet digests. The document is retained as history.", ["g2bV3R2SourceLockValidator.test", "g2bM3AnchorReadOnlyRecoveryEvidence.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_86" },
  },
  "g2bM3SourceLockedRecoveryResult.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-source-locked-recovery-source-lock-v1.json", "451ce20bbc872d4de011c29a6b9348c16455b7d3b93294117c90325cf05a329d", "The failure compares the persisted recovery source-lock evidence with a fresh reconstruction. The recovery result is terminal history; it cannot be relabeled to match current source.", ["g2bM3AnchorReadOnlyRecoveryEvidence.test", "g2bM3RecoveryAnchorRuntime.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_34" },
  },
  "g2bRecoveryV3R2RefreshReadBridge.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-source-lock-v2.json", "079264f20acd674b4195980b409fc7e741d7cedd5a51dc8ea1d22b9f465ec75c", "The bridge builder rejects its fixed historical V3R2 parent chain with V3R2_BRIDGE_CONTEXT_BLOCKED; its policy forbids parent rebinding. It is not selected by the clean-generation CAS executor.", ["g2bGenerationBoundReadOnlyRecoveryV3R2.test", "g2bNodePythonFakeProviderCas.integration.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_31" },
  },
  "g2bRepairedM3AuthorityPreparation.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-final-execution-composite-v1.json", "759a00e4e3bf8ad25a2499e28da252a41edf415f8014495e62aee78eb4393f57", "The legacy preparation entry point fails closed with REPAIRED_M3_REATTESTATION_NOT_CURRENT because its predecessor reattestation is no longer current. It has no caller in the clean-generation production path.", ["g2bCleanGenerationBootstrap.test", "g2bHostAnchorAttestation.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_18" },
  },
  "g2bRepairedM3AuthorityPreparationV2.test": {
    expectedClassification: "OBSOLETE_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/g2b-generation-lineage-manual-review-v1.json", "8ed36e28f8c8ede6db7daaef738d01183c0e14445625896a172c49844d86b31a", "The fixture hardcodes generation 8b30e1da as a new mutation-reachable anchor. The lineage review classifies it as historical CAS-only and establishes no canonical lineage; V3_RUNTIME_CONTINUITY_NOT_ESTABLISHED is the required fail-closed result.", ["g2bM3NewGenerationIsolation.test", "g2bCleanGenerationBootstrap.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_20" },
  },
  "g2bRepairedM3DpapiRecoveryReattestation.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-final-execution-composite-v1.json", "759a00e4e3bf8ad25a2499e28da252a41edf415f8014495e62aee78eb4393f57", "The v1 DPAPI reattestation's prospective safety verifier is blocked because its historical continuity/source-lock chain no longer matches current source. Current DPAPI host binding has dedicated host integration coverage.", ["windowsDpapiSecretProvider.test", "g2bHostAnchorAttestationHost.integration"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_5" },
  },
  "g2bRepairedM3ProspectiveSafetyReattestation.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-final-execution-composite-v1.json", "a8c56aab974caf883f59ebe5c126b9bfa31228c2ad393c2d98ea7b7a3a671896", "The v1 prospective safety chain is historical and its continuity evidence is not a current trust input. Current clean bootstrap and read-only CAS security gates have separate tests.", ["g2bCleanGenerationBootstrap.test", "g2bNodePythonFakeProviderCas.integration.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_5" },
  },
  "g4r3hR2CurrentStateExactIdentityImplementation.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-r2-current-state-exact-identity-implementation-v1.json", "5b0359ec2fc2e2b324e9136e55825378c472120e6cc18fc703e32763f3246d66", "The v1 identity implementation attestation contains historical source hashes; its verifier reports source-lock drift while the signed/stored payload remains unchanged. Current identity and host binding are tested by current generation and host-attestation tests.", ["g2bLocalPinnedIdentityResolver.test", "g2bHostAnchorAttestation.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_9" },
  },
  "g4r3r1PostIdentityPatchRuntimeCapabilityAttestationV2.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3r1-post-identity-patch-runtime-capability-v2.json", "651f4bd689247580d4e7d35a5a5bcf40f56ed1c8477cfe9ee6d30115b5aea9ce", "The immutable v2 capability attestation pins a historical 33-file source set including installed SDK bytes; its source-lock verifier detects current drift. Current installed SDK request/response contracts have separate tests.", ["g2bExplicitSetIamPolicyAuthTransport.test", "g2bPolicyResponseNormalizer.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_11" },
  },
  "m3l3R3CanonicalPolicyParserAttestation.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("tools/authority-audit/m3l3R3CanonicalPolicyParserAttestation.mjs", "4a257074b52f7300d8b396b24fe51ce9d6c4f5063c7b432539f33d7c16fbdcaf", "The v1 parser attestation pins old parser/test/executor and dependency hashes; verification correctly returns R3_PARSER_SOURCE_LOCK_DRIFT. The live parser's current behavior is independently qualified.", ["m3l3R3CanonicalPolicyParser.test", "g2bPolicyResponseNormalizer.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_9" },
  },
  "m3l3R3RecoveryEvidence.test": {
    expectedClassification: "HISTORICAL_EXPECTED_FAILURE",
    productionReachability: "HISTORICAL_ONLY",
    classificationEvidence: reviewedEvidence("tools/authority-audit/m3l3R3RecoveryEvidence.mjs", "701a916ab313d632041d9886299ac76662033b49c22f0279278dc0c94b1e4e90", "The R3 recovery result is a consumed historical read record with fixed parser/executor source hashes. Its verifier returns R3_EVIDENCE_SOURCE_LOCK_DRIFT; it is not a current CAS input.", ["m3l3R3CanonicalPolicyRecoveryExecutor.test", "g2bNodePythonFakeProviderCas.integration.test"]),
    expectedFailureSignature: { exitCode: 1, failureSummary: "ERR_ASSERTION_LINE_4" },
  },
});

export const AUTHORITY_QUALIFICATION_MANIFEST = Object.freeze({
  schemaVersion: 1,
  qualificationId: "myweb-authority-qualification-v1",
  createdAt: "2026-09-26",
  updatedAt: "2026-09-26",
  classificationPolicy: Object.freeze({
    historical: "Requires immutable artifact evidence and proof the current trust path does not consume it.",
    obsolete: "Requires explicit obsolete-contract evidence and replacement invariant coverage.",
    default: "MUST_PASS; failures are not reclassified by filename or prior totals.",
  }),
  environmentPolicy: Object.freeze({
    credentialsForwarded: false,
    remoteCallsAllowed: false,
    emulatorFixtureWritesAllowed: true,
  }),
  entries: Object.freeze(TEST_PATHS.map((path) => {
    const id = path.slice(path.lastIndexOf("/") + 1).replace(/\.(?:mjs|py)$/, "");
    const base = {
      id,
      path,
      executionCommand: Object.freeze(commandFor(path)),
      category: categoryFor(path),
      productionReachability: "TEST_ONLY",
      qualificationRequired: true,
      expectedClassification: "MUST_PASS",
      classificationEvidence: null,
      environmentRequirement: environmentFor(path),
      timeoutMs: path.endsWith("authorityInventory.integration.mjs") ? 240000
        : path.includes("Host.integration.mjs") || path.includes("DryRun.integration") ? 180000 : 120000,
    };
    const reviewed = CLASSIFICATION_OVERRIDES[id];
    return Object.freeze({ ...base, ...(reviewed || {}) });
  }).sort((a, b) => a.id.localeCompare(b.id, "en"))),
});
