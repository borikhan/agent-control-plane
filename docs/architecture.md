# Architecture and trust boundaries

The control plane separates planning from authority. A caller may propose a workflow, but only allowlisted server-side handlers can execute. Any workflow containing a high-risk step remains pending until a distinct approval action. The engine records the transition before exposing the resulting state.

## Production evolution

Persist workflows and append-only audit events in PostgreSQL. Use optimistic version checks on transitions, signed identities for approvers, and an outbox for asynchronous execution. Workers claim steps using leases, attach idempotency keys to side effects, and apply time/cost budgets. Store tool credentials in a secret manager and inject only the credential needed for that step.

This sample models authorization mechanics; it does not claim that risk labels supplied by an untrusted planner are sufficient. Production policy classifies tools server-side and enforces tenant scopes.

## Twelve-factor mapping

| Factor | Implementation |
|---|---|
| Codebase | One control-plane repository |
| Dependencies | Exact npm lockfile and strict TypeScript build |
| Config | Port and external service credentials come from environment |
| Backing services | Database, queue, and tool APIs are attached resources |
| Build, release, run | Compile/test, package image, then inject release config |
| Processes | API and workers are stateless once workflow state is externalized |
| Port binding | HTTP server exports the service directly |
| Concurrency | Independently scale API and leased worker processes |
| Disposability | Idempotent transitions and leased work support restarts |
| Dev/prod parity | Same compiled artifact; only resource endpoints differ |
| Logs | Audit and operational events are structured streams |
| Admin processes | Policy migration and replay tools run from the same release |
