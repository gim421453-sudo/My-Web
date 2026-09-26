# G2B V2 Local Client Setup Root Cause

The consumed V2 approval is not replayable. Its invocation ended before an
HTTP request, so it did not establish a permission state.

Current local inspection proves the bundled Cloud SDK helper can resolve its
runtime and imports when its bundled `lib/third_party` path is registered.
The local credential record is readable but is not fresh without refresh.
Refresh remains intentionally blocked; this task did not refresh a credential,
create a token, or make a remote call.

The minimum source repair adds the bundled third-party import path and records
only a bounded `localSetupSubstage`. A local `READY_TO_SEND` probe is also
available, but currently fails closed because a refresh-free credential is not
fresh. No V3 remote approval packet is generated.
