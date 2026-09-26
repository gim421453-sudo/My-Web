# M3L3 RF1 Local Result Assembly Fix

## Root Cause

- Bug class: `RESULT_ASSEMBLY_VARIABLE_NAME_MISMATCH`
- Declared local: `projectIamReadsAfterPrestate`
- Faulting shorthand: `projectIamReadsUsedAfterPrestate`
- Failure point: after `await runM3Dormant(...)` returned, while constructing the privacy-safe output object.
- Completion proof: the persisted live evidence records `runtimeAwaitCompleted=true` and `safeResultEmitted=false`; the focused synthetic regression reproduces the same post-await `ReferenceError` ordering.

The locked runtime did not throw this error. It came from the one-session inline projection that followed the runtime call.

## Fix

`m3l3SafeResultAssembler.mjs` now performs an explicit input-to-output mapping and validates every bounded counter. Known and unknown outcomes serialize without shorthand references. Unknown counters remain structured ranges and cannot become success claims.

The assembler rejects extra input fields, nonzero forbidden-operation counters, invalid result enums, and counter values above the locked budget. It imports neither the runtime nor a process/network API.

## Authority Impact

- Locked runtime changed: no
- Command graph changed: no
- Identity contract changed: no
- Mutation semantics changed: no
- G4R3H-R2 supersession required: no
- G4R3R1 supersession required: no
- G4R3R2 supersession required: no
- Evidence-tool attestation: `a6adbddc5cfc112b070d0392d7dd6ef2680b3e1d16111bf82f10dbfc1bace7a9`
- Read-only recovery plan: `0e5156bdc9040f541c36e22892621ae1a48c9019fc1d060cd6ae2dbcdd0cc501`

## Remote State

`UNKNOWN_AFTER_CONSUMED_M3L3_SESSION`

No remote recovery call was made. A new read-only approval is required before exact state confirmation. A second M3 mutation remains unauthorized.

## Verdict

`P1_5_C2H2E3D_W1C_M3L3_RF1_LOCAL_RESULT_ASSEMBLY_FIX_PASS`
