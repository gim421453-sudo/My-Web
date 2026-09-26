# G2B M3 ResolvedStore-Fixed Read-Only Anchor Recovery Approval

This packet is local approval preparation only. It does not authorize execution.

STAGE=P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RESOLVEDSTORE-FIXED-READ-ONLY-ANCHOR-RECOVERY
TYPE=READ_ONLY_ANCHOR_BASED_M3_RECOVERY
M3_OPERATION_GENERATION=ac1c8343-5837-4a75-ad55-c93ac320f937
M3_EXECUTION_EVIDENCE_SHA256=ec045fd7d63b494cc6ebb05fc0a0bf2ce0a5af66781f92caf444a4ccec6a3a0e
M3_RESULT_DOCUMENT_SHA256=823053ca67a718706c8a3ea24c94f32f1770ec3076da64794b861a2cf9e04f8e
RECOVERY_APPROVAL_PACKET_SHA256=f9ce876c72fb30feafd3813f995815b4352148db24f4bd29ff9db5cec83f4f98
WRITER_IAM_POLICY_READS_MAX=1
PROJECT_IAM_READS_MAX=0
MUTATIONS_MAX=0
SAFE_TO_CONTINUE_WITHOUT_APPROVAL=no

The future recovery may use the preserved current-generation anchor and current
DPAPI secret only. It permits no new OP-A, mutation, retry, rollback, M4,
Firestore, access-token, Cloud Logging, testIamPermissions, or service-account
key operation.
