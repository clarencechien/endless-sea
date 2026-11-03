# Pinned, unmodified upstream library

Source: https://github.com/VictorZakharov/threejs-nanites
Commit: 500113d7b651d2eb96392ce87c96330bdec25e15 (main)
Snapshot: src/nanite-lib/ → vendor/nanite-lib/
License: MIT, Victor Zakharov; see LICENSE.nanite.

No library code has been modified. This increment uses dag/build.ts and dag/cut.ts at asset-build time. GPU renderer source is retained for a subsequent measured integration; its mere presence is not a claim that the DLC is running GPU cluster culling.

Upstream npm ci, typecheck, build, and harness --help were reproduced in the cloud with Node 24. Its untouched application is built separately for /forest/upstream/. Its AGENTS.md workflow belongs to its author and is not copied as this project's operational policy.
