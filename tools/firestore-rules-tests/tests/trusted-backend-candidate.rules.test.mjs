import { beforeEach, describe, test } from "node:test";
import {
  MANAGER_UID,
  NORMAL_UID,
  OTHER_UID,
  OTHER_WORKSPACE_ID,
  OWNER_UID,
  PRINT_UID,
  PROFILE,
  SUPER_MANAGER_UID,
  TARGET_UID,
  TEACHER_UID,
  VIEWER_UID,
  WORKSPACE_ID,
  assertFails,
  assertSucceeds,
  baseUser,
  canonicalApplication,
  canonicalMembership,
  canonicalOwner,
  collection,
  dbFor,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  legacyInvite,
  legacyMembership,
  noAuthDb,
  now,
  resetCandidateFirestore,
  seed,
  seedCanonicalActors,
  setDoc,
  updateDoc,
} from "./trusted-backend-candidate.helpers.mjs";

const isCandidate = PROFILE === "transition" || PROFILE === "strict";
const authorityInvite = {
  schemaVersion: 1,
  invitationId: "authority-invite",
  workspaceId: WORKSPACE_ID,
  role: "normal",
  status: "active",
};

async function candidateBase() {
  await seedCanonicalActors();
  await seed([
    [`users/${OWNER_UID}`, baseUser(OWNER_UID)],
    [`users/${SUPER_MANAGER_UID}`, baseUser(SUPER_MANAGER_UID)],
    [`users/${MANAGER_UID}`, baseUser(MANAGER_UID)],
    [`users/${TEACHER_UID}`, baseUser(TEACHER_UID)],
    [`users/${NORMAL_UID}`, baseUser(NORMAL_UID)],
    [`users/${VIEWER_UID}`, baseUser(VIEWER_UID)],
    [`users/${PRINT_UID}`, baseUser(PRINT_UID)],
    [`users/${TARGET_UID}`, baseUser(TARGET_UID)],
  ]);
}

if (isCandidate) {
  describe(`${PROFILE} candidate privilege-escalation attack matrix`, { concurrency: false }, () => {
    beforeEach(async () => {
      await resetCandidateFirestore();
      await candidateBase();
    });

    const deniedAttacks = [
      ["01 unauthenticated arbitrary read", async () => getDoc(doc(noAuthDb(), "arbitrary", "doc"))],
      ["02 unauthenticated arbitrary write", async () => setDoc(doc(noAuthDb(), "arbitrary", "doc"), { value: 1 })],
      ["03 users.role system_owner spoof", async () => {
        await seed([[`users/${OTHER_UID}`, baseUser(OTHER_UID, { role: "system_owner" })]]);
        return setDoc(doc(dbFor(OTHER_UID), "arbitrary", "role-spoof"), { value: 1 });
      }],
      ["04 users.globalRole system_owner spoof", async () => {
        await seed([[`users/${OTHER_UID}`, baseUser(OTHER_UID, { globalRole: "system_owner" })]]);
        return setDoc(doc(dbFor(OTHER_UID), "arbitrary", "global-role-spoof"), { value: 1 });
      }],
      ["05 self role escalation", async () => updateDoc(doc(dbFor(NORMAL_UID), "users", NORMAL_UID), { role: "manager" })],
      ["06 self status and disabled mutation", async () => updateDoc(doc(dbFor(NORMAL_UID), "users", NORMAL_UID), { status: "active", disabled: true })],
      ["07 currentWorkspaceId authority spoof", async () => updateDoc(doc(dbFor(NORMAL_UID), "users", NORMAL_UID), { currentWorkspaceId: OTHER_WORKSPACE_ID, updatedAt: now() })],
      ["08 workspace_members legacy membership spoof", async () => setDoc(doc(dbFor(NORMAL_UID), "workspace_members", `${OTHER_WORKSPACE_ID}_${NORMAL_UID}`), legacyMembership(NORMAL_UID, "super_manager", OTHER_WORKSPACE_ID))],
      ["09 workspaceMembers legacy membership spoof", async () => setDoc(doc(dbFor(NORMAL_UID), "workspaceMembers", `${OTHER_WORKSPACE_ID}_${NORMAL_UID}`), legacyMembership(NORMAL_UID, "super_manager", OTHER_WORKSPACE_ID))],
      ["10 canonical nested membership direct create", async () => setDoc(doc(dbFor(NORMAL_UID), "workspaces", OTHER_WORKSPACE_ID, "members", NORMAL_UID), canonicalMembership(NORMAL_UID, "super_manager", OTHER_WORKSPACE_ID))],
      ["11 canonical membership self role escalation", async () => updateDoc(doc(dbFor(NORMAL_UID), "workspaces", WORKSPACE_ID, "members", NORMAL_UID), { role: "super_manager" })],
      ["12 canonical membership status mutation", async () => updateDoc(doc(dbFor(NORMAL_UID), "workspaces", WORKSPACE_ID, "members", NORMAL_UID), { status: "disabled", disabled: true, active: false })],
      ["13 canonical membership delete", async () => deleteDoc(doc(dbFor(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", NORMAL_UID))],
      ["14 cross-workspace member read", async () => getDoc(doc(dbFor(NORMAL_UID), "workspaces", OTHER_WORKSPACE_ID, "members", OTHER_UID))],
      ["15 cross-workspace member list", async () => getDocs(collection(dbFor(NORMAL_UID), "workspaces", OTHER_WORKSPACE_ID, "members"))],
      ["16 client canonical adminApplication create", async () => setDoc(doc(dbFor(NORMAL_UID), "adminApplications", "application-new"), canonicalApplication())],
      ["17 client canonical adminApplication approve", async () => {
        await seed([["adminApplications/application-pending", canonicalApplication()]]);
        return updateDoc(doc(dbFor(OWNER_UID), "adminApplications", "application-pending"), { status: "approved" });
      }],
      ["18 forged applicantUid", async () => setDoc(doc(dbFor(NORMAL_UID), "adminApplications", "application-forged"), canonicalApplication(TARGET_UID))],
      ["19 canonical invitation direct create", async () => setDoc(doc(dbFor(MANAGER_UID), "authorityInvitations", "authority-new"), authorityInvite)],
      ["20 canonical invitation direct read", async () => {
        await seed([["authorityInvitations/authority-invite", authorityInvite]]);
        return getDoc(doc(dbFor(OWNER_UID), "authorityInvitations", "authority-invite"));
      }],
      ["21 canonical invitation direct revoke", async () => {
        await seed([["authorityInvitations/authority-invite", authorityInvite]]);
        return updateDoc(doc(dbFor(OWNER_UID), "authorityInvitations", "authority-invite"), { status: "revoked" });
      }],
      ["22 invitationCodeIndex read", async () => {
        await seed([["invitationCodeIndex/code-hash", { invitationId: "authority-invite" }]]);
        return getDoc(doc(dbFor(OWNER_UID), "invitationCodeIndex", "code-hash"));
      }],
      ["23 invitationCodeIndex write", async () => setDoc(doc(dbFor(OWNER_UID), "invitationCodeIndex", "code-hash"), { invitationId: "authority-invite" })],
      ["24 redemption direct create", async () => setDoc(doc(dbFor(NORMAL_UID), "authorityInvitations", "authority-invite", "redemptions", NORMAL_UID), { uid: NORMAL_UID, status: "completed" })],
      ["25 securityAuditLogs forged create", async () => setDoc(doc(dbFor(OWNER_UID), "securityAuditLogs", "forged"), { outcome: "success" })],
      ["26 securityAuditLogs edit", async () => {
        await seed([["securityAuditLogs/audit-existing", { outcome: "success" }]]);
        return updateDoc(doc(dbFor(OWNER_UID), "securityAuditLogs", "audit-existing"), { outcome: "changed" });
      }],
      ["27 securityAuditLogs delete", async () => {
        await seed([["securityAuditLogs/audit-existing", { outcome: "success" }]]);
        return deleteDoc(doc(dbFor(OWNER_UID), "securityAuditLogs", "audit-existing"));
      }],
      ["28 idempotency read", async () => {
        await seed([["trustedOperationIdempotency/scope-hash", { status: "completed" }]]);
        return getDoc(doc(dbFor(OWNER_UID), "trustedOperationIdempotency", "scope-hash"));
      }],
      ["29 idempotency write", async () => setDoc(doc(dbFor(OWNER_UID), "trustedOperationIdempotency", "scope-hash"), { status: "completed" })],
      ["30 legacy invites write", async () => setDoc(doc(dbFor(MANAGER_UID), "invites", "legacy-code"), legacyInvite())],
      ["31 legacy invitations write", async () => setDoc(doc(dbFor(MANAGER_UID), "invitations", "legacy-code"), legacyInvite())],
      ["32 nested inviteCodes write", async () => setDoc(doc(dbFor(MANAGER_UID), "workspaces", WORKSPACE_ID, "inviteCodes", "legacy-code"), legacyInvite())],
      ["33 arbitrary manager catch-all write", async () => setDoc(doc(dbFor(MANAGER_UID), "arbitrary", "manager"), { value: 1 })],
      ["34 system_owner unmatched path write", async () => setDoc(doc(dbFor(OWNER_UID), "arbitrary", "owner"), { value: 1 })],
      ["35 manager privilege escalation", async () => updateDoc(doc(dbFor(MANAGER_UID), "users", TARGET_UID), { globalRole: "system_owner" })],
      ["36 teacher privilege escalation", async () => updateDoc(doc(dbFor(TEACHER_UID), "workspaces", WORKSPACE_ID, "members", TEACHER_UID), { role: "manager" })],
      ["37 disabled membership authority", async () => {
        await seed([[`workspaces/${WORKSPACE_ID}/members/${NORMAL_UID}`, canonicalMembership(NORMAL_UID, "normal", WORKSPACE_ID, { status: "disabled", disabled: true, active: false })]]);
        return getDoc(doc(dbFor(NORMAL_UID), "workspaces", WORKSPACE_ID));
      }],
      ["38 inactive systemOwner authority", async () => {
        await seed([[`systemOwners/${OWNER_UID}`, canonicalOwner(OWNER_UID, { status: "inactive" })]]);
        return getDoc(doc(dbFor(OWNER_UID), "users", TARGET_UID));
      }],
      ["39 malformed membership role", async () => {
        await seed([[`workspaces/${WORKSPACE_ID}/members/${NORMAL_UID}`, canonicalMembership(NORMAL_UID, "root")]]);
        return getDoc(doc(dbFor(NORMAL_UID), "workspaces", WORKSPACE_ID));
      }],
      ["40 missing authority document fails closed", async () => getDoc(doc(dbFor("missing-authority-uid"), "workspaces", WORKSPACE_ID))],
    ];

    for (const [name, operation] of deniedAttacks) {
      test(name, async () => {
        await assertFails(operation());
      });
    }
  });

  describe(`${PROFILE} candidate positive reads and role matrix`, { concurrency: false }, () => {
    beforeEach(async () => {
      await resetCandidateFirestore();
      await candidateBase();
    });

    const roles = [
      ["system_owner", OWNER_UID],
      ["super_manager", SUPER_MANAGER_UID],
      ["manager", MANAGER_UID],
      ["teacher", TEACHER_UID],
      ["normal", NORMAL_UID],
      ["viewer", VIEWER_UID],
      ["print_account", PRINT_UID],
    ];

    for (const [role, uid] of roles) {
      test(`${role} keeps own profile read and safe update`, async () => {
        await assertSucceeds(getDoc(doc(dbFor(uid), "users", uid)));
        await assertSucceeds(updateDoc(doc(dbFor(uid), "users", uid), { displayName: `${role} updated`, updatedAt: now() }));
      });

      test(`${role} cannot directly mutate canonical authority`, async () => {
        await assertFails(setDoc(doc(dbFor(uid), "authorityInvitations", `${role}-invite`), authorityInvite));
        await assertFails(setDoc(doc(dbFor(uid), "securityAuditLogs", `${role}-audit`), { outcome: "success" }));
      });
    }

    for (const [role, uid] of roles.filter(([name]) => name !== "system_owner")) {
      test(`${role} active canonical member can read workspace and own membership`, async () => {
        await assertSucceeds(getDoc(doc(dbFor(uid), "workspaces", WORKSPACE_ID)));
        await assertSucceeds(getDoc(doc(dbFor(uid), "workspaces", WORKSPACE_ID, "members", uid)));
      });
    }

    test("unauthenticated role has no authority reads or writes", async () => {
      await assertFails(getDoc(doc(noAuthDb(), "users", NORMAL_UID)));
      await assertFails(getDoc(doc(noAuthDb(), "workspaces", WORKSPACE_ID)));
      await assertFails(setDoc(doc(noAuthDb(), "authorityInvitations", "no-auth"), authorityInvite));
    });

    test("canonical system owner reads users, workspaces, and application management views", async () => {
      await seed([["adminApplications/application-one", canonicalApplication()]]);
      await assertSucceeds(getDoc(doc(dbFor(OWNER_UID), "systemOwners", OWNER_UID)));
      await assertSucceeds(getDocs(collection(dbFor(OWNER_UID), "users")));
      await assertSucceeds(getDoc(doc(dbFor(OWNER_UID), "workspaces", WORKSPACE_ID)));
      await assertSucceeds(getDocs(collection(dbFor(OWNER_UID), "adminApplications")));
    });

    test("manager roles can list canonical members; lower roles cannot", async () => {
      await assertSucceeds(getDocs(collection(dbFor(SUPER_MANAGER_UID), "workspaces", WORKSPACE_ID, "members")));
      await assertSucceeds(getDocs(collection(dbFor(MANAGER_UID), "workspaces", WORKSPACE_ID, "members")));
      for (const uid of [TEACHER_UID, NORMAL_UID, VIEWER_UID, PRINT_UID]) {
        await assertFails(getDocs(collection(dbFor(uid), "workspaces", WORKSPACE_ID, "members")));
      }
    });

    test("applicant can get only canonical own admin application", async () => {
      await seed([
        ["adminApplications/application-own", canonicalApplication(NORMAL_UID)],
        ["adminApplications/application-other", canonicalApplication(TARGET_UID)],
      ]);
      await assertSucceeds(getDoc(doc(dbFor(NORMAL_UID), "adminApplications", "application-own")));
      await assertFails(getDoc(doc(dbFor(NORMAL_UID), "adminApplications", "application-other")));
    });

    test("currentWorkspaceId update requires an active canonical membership", async () => {
      await assertSucceeds(updateDoc(doc(dbFor(NORMAL_UID), "users", NORMAL_UID), {
        currentWorkspaceId: WORKSPACE_ID,
        updatedAt: now(),
      }));
      await assertFails(updateDoc(doc(dbFor(NORMAL_UID), "users", NORMAL_UID), {
        currentWorkspaceId: OTHER_WORKSPACE_ID,
        updatedAt: now(),
      }));
    });

    test(`${PROFILE} legacy compatibility contract is explicit`, async () => {
      await seed([
        [`workspace_members/${WORKSPACE_ID}_${NORMAL_UID}`, legacyMembership(NORMAL_UID)],
        ["invites/legacy-active", legacyInvite("legacy-active")],
        ["invitations/legacy-active", legacyInvite("legacy-active")],
        [`workspaces/${WORKSPACE_ID}/inviteCodes/legacy-active`, legacyInvite("legacy-active")],
      ]);
      const legacyMembershipRead = () => getDoc(doc(dbFor(NORMAL_UID), "workspace_members", `${WORKSPACE_ID}_${NORMAL_UID}`));
      const legacyInviteRead = () => getDoc(doc(dbFor(NORMAL_UID, {
        email: "target@example.invalid",
        email_verified: true,
      }), "invites", "legacy-active"));
      if (PROFILE === "transition") {
        await assertSucceeds(legacyMembershipRead());
        await assertSucceeds(legacyInviteRead());
      } else {
        await assertFails(legacyMembershipRead());
        await assertFails(legacyInviteRead());
      }
      await assertFails(getDoc(doc(dbFor(NORMAL_UID), "invitations", "legacy-active")));
      await assertFails(getDoc(doc(dbFor(NORMAL_UID), "workspaces", WORKSPACE_ID, "inviteCodes", "legacy-active")));
    });

    test("transition legacy reads do not authorize legacy writes or inactive invites", async () => {
      await seed([
        ["invites/legacy-revoked", legacyInvite("legacy-revoked", { status: "revoked" })],
        [`workspace_members/${WORKSPACE_ID}_${NORMAL_UID}`, legacyMembership(NORMAL_UID, "super_manager")],
      ]);
      await assertFails(getDoc(doc(dbFor(NORMAL_UID), "invites", "legacy-revoked")));
      await seed([["invites/legacy-email-target", legacyInvite("legacy-email-target", {
        email: "target@example.invalid",
      })]]);
      await assertFails(getDoc(doc(dbFor(NORMAL_UID, {
        email: "other@example.invalid",
        email_verified: true,
      }), "invites", "legacy-email-target")));
      await assertFails(setDoc(doc(dbFor(NORMAL_UID), "workspace_members", "new-legacy"), legacyMembership(NORMAL_UID, "super_manager")));
      await assertFails(setDoc(doc(dbFor(MANAGER_UID), "invites", "new-legacy"), legacyInvite("new-legacy")));
    });
  });
}

if (PROFILE === "live") {
  describe("LIVE exact snapshot risk regression", { concurrency: false }, () => {
    beforeEach(resetCandidateFirestore);

    test("LIVE users.role fallback grants unmatched write", async () => {
      await seed([[`users/${NORMAL_UID}`, baseUser(NORMAL_UID, { role: "system_owner" })]]);
      await assertSucceeds(setDoc(doc(dbFor(NORMAL_UID), "arbitraryAuthority", "role-fallback"), { value: 1 }));
    });

    test("LIVE system owner catch-all grants unmatched write", async () => {
      await seed([[`systemOwners/${OWNER_UID}`, { status: "active" }]]);
      await assertSucceeds(setDoc(doc(dbFor(OWNER_UID), "arbitraryAuthority", "owner-catch-all"), { value: 1 }));
    });

    test("LIVE permits a user to create a self legacy membership", async () => {
      await assertSucceeds(setDoc(
        doc(dbFor(NORMAL_UID), "workspace_members", `${WORKSPACE_ID}_${NORMAL_UID}`),
        legacyMembership(NORMAL_UID, "super_manager"),
      ));
    });
  });
}

if (PROFILE === "local") {
  describe("current LOCAL authority regression classification", { concurrency: false }, () => {
    beforeEach(resetCandidateFirestore);

    test("ALREADY_HARDENED_LOCAL users role fallback and unmatched owner write are denied", async () => {
      await seed([
        [`users/${NORMAL_UID}`, baseUser(NORMAL_UID, { role: "system_owner" })],
        [`systemOwners/${OWNER_UID}`, canonicalOwner()],
      ]);
      await assertFails(setDoc(doc(dbFor(NORMAL_UID), "arbitraryAuthority", "role-fallback"), { value: 1 }));
      await assertFails(setDoc(doc(dbFor(OWNER_UID), "arbitraryAuthority", "owner-catch-all"), { value: 1 }));
    });

    test("ALREADY_HARDENED_LOCAL current LOCAL denies canonical membership create", async () => {
      await seedCanonicalActors();
      await assertFails(setDoc(
        doc(dbFor(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID),
        canonicalMembership(TARGET_UID, "normal"),
      ));
    });

    test("NEW_P0_REQUIRED current LOCAL still allows client workspace lifecycle write", async () => {
      await seedCanonicalActors();
      await assertSucceeds(updateDoc(
        doc(dbFor(OWNER_UID), "workspaces", WORKSPACE_ID),
        { status: "disabled" },
      ));
    });

    test("NEW_P0_REQUIRED current LOCAL still allows direct adminApplication create", async () => {
      await assertSucceeds(setDoc(
        doc(dbFor(NORMAL_UID), "adminApplications", "legacy-client-create"),
        { uid: NORMAL_UID, status: "pending" },
      ));
    });

    test("COMPATIBILITY_DECISION_REQUIRED current LOCAL allows legacy invite create", async () => {
      await seedCanonicalActors();
      const code = "legacy-client-create";
      await assertSucceeds(setDoc(
        doc(dbFor(MANAGER_UID), "invites", code),
        {
          invitationId: code,
          code,
          workspaceId: WORKSPACE_ID,
          role: "normal",
          codeHash: `hash-${code}`,
          email: "target@example.invalid",
          maxUses: 1,
          usedCount: 0,
          expiresAt: 1_900_000_000_000,
          createdAt: now(),
          createdBy: MANAGER_UID,
          inviterUid: MANAGER_UID,
          inviterEmail: "manager@example.invalid",
          invitedBy: MANAGER_UID,
          status: "active",
          usedAt: "",
          usedBy: "",
          reusable: false,
          codePreview: "leg...eate",
        },
      ));
    });
  });
}
