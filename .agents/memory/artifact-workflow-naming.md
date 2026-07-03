---
name: Artifact workflow naming
description: How to correctly restart/reference an artifact's workflow after createArtifact
---

After `createArtifact` registers a service (e.g. name `"web"` in `.replit-artifact/artifact.toml`), the workflow does not exist under that bare name in `.replit`. `restart_workflow` with just the service name (e.g. `"web"`) fails with `RUN_COMMAND_NOT_FOUND`.

**Why:** The platform tracks the artifact's workflow internally under a composite name shown by `refresh_all_logs` / workflow status as `"artifacts/<slug>: <service-name>"` (e.g. `"artifacts/ratio-chain: web"`). The bare `.replit-artifact/artifact.toml` service name is not a standalone workflow identifier by itself.

**How to apply:** If `restart_workflow` fails with the plain artifact/service title, call `refresh_all_logs` (or check workflow status) to find the exact composite name, then restart using that full string. Do not manually `configureWorkflow` a duplicate workflow with the bare name — it will lack the artifact's injected env vars (`PORT`, `BASE_PATH`) and fail to start; remove any such duplicate with `removeWorkflow` if accidentally created.
