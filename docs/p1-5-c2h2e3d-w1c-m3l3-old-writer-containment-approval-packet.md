# Old Writer Containment Approval Packet

```text
STAGE=P1.5-C2H2E3D-W1C-M3L3-OLD-WRITER-CONTAINMENT
TYPE=OLD_WRITER_CONTAINMENT
PURPOSE=disable the frozen writer service account without modifying its IAM policy
TARGET_RESOURCE=myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
OPERATION=iam.projects.serviceAccounts.disable
PRESTATE_REMOTE_READS_MAX=1
DISABLE_MUTATION_ATTEMPTS_MAX=1
POSTSTATE_REMOTE_READS_MAX=1
PROJECT_IAM_READS_MAX=0
APPROVAL_CONSUMPTION_POINT=WHEN_OLD_WRITER_STATUS_PRESTATE_READ_BEGINS
PREEXISTING_DISABLED_POLICY=SUCCESS_EQUIVALENT_NO_DISABLE_NO_ENABLE_NO_DELETE_NO_IAM_POLICY_MUTATION
INDETERMINATE_POLICY=STOP_NO_RETRY_NO_ROLLBACK_NO_ENABLE_NO_SECOND_DISABLE_NO_M3_NO_M4
POSTSTATE_REQUIRED=yes
DISABLED_POSTSTATE_SUCCESS_SEMANTICS=EXACT_OLD_WRITER_STATUS_DISABLED_CONFIRMED
RETRIES=0
ROLLBACKS=0
SERVICE_ACCOUNT_ENABLE_MUTATIONS_MAX=0
SERVICE_ACCOUNT_DELETE_MUTATIONS_MAX=0
IAM_POLICY_MUTATIONS_MAX=0
M3_MUTATIONS=0
M4_MUTATIONS=0
FIRESTORE_ALLOWED=no
ACCESS_TOKEN_ALLOWED=no
CLOUD_LOGGING_ALLOWED=no
TEST_IAM_PERMISSIONS_ALLOWED=no
SERVICE_ACCOUNT_KEY_ALLOWED=no
```

The only success result requiring a poststate is an exact status response for
this target reporting `DISABLED`. Command/process success alone is not
containment success. An `ENABLED`, ambiguous, or unreadable poststate stops the
operation without a second disable, retry, rollback, enable, delete, IAM-policy
mutation, M3, or M4. If prestate is already `DISABLED`, containment is
success-equivalent and executes no disable, enable, delete, or IAM-policy
mutation.

This packet is local approval material only. It has not authorized or executed
any remote operation.
