# Bird Forest Web3D — Agent Handoff

> Version: 0.1 | Date: 2026-11-03 | Status: planning / Phase 0 not implemented
> Audience: Codex, Claude Code, human developers
> Language: Traditional Chinese (technical terms in English)

## 0. One-line mission

以 [VictorZakharov/threejs-nanites](https://github.com/VictorZakharov/threejs-nanites) 為技術基礎，建立一個「鳥從第三人稱視角在森林中飛行」的 Web3D 遊戲。**Phase 0 必須交付真正能在手機與一般筆電開啟及操作的 HTTPS demo**，配備跨裝置降級、效能 telemetry 與可重現的 benchmark；**60 FPS 是主要效能目標，不是未經測試就保證的結果**。

## 1. User context and constraints

- 參考 repo：`https://github.com/VictorZakharov/threejs-nanites`
- 原 Demo：`https://victorzakharov.github.io/threejs-nanites/`
- 已知真實基準：使用者在 **12th Gen Intel U-series Chromebook** 上開啟上游 Demo，**約 30 FPS**。未知實際 CPU SKU、GPU、瀏覽器版本、是否 WebGPU、解析度、GPU time、是否 30Hz/省電限制；**不可推論原因**。
- 目標設備：Android / iPhone 手機 + Chromebook + 文書型 Windows/Mac 筆電；桌機作為高階參照。
- 目標品質：肉眼看起來是茂密、有縱深的森林；穿梭、轉彎、接近樹木不能突然消失或大幅跳 LOD。
- 優先順序：**可啟動 > 可操作 > 可量測 > 無明顯掉幀 > 視覺密度 > 地圖規模**。
- 避免高昂 GPU 需求；靜態資產可在開發端/CI 預處理，客戶端不可要求 Blender 或本機模型生成。
- 不要求 Phase 0 實際擺放 100 萬棵樹，不以名義三角面數量作 KPI。

## 2. Upstream verified facts (check again at implementation time)

- `src/nanite-lib/` 是與場景分離的 Nanite-style renderer；GPU-driven cluster DAG LOD、HZB occlusion、impostors、software rasterizer。
- 上游具備 WebGPU 主路徑與 **WebGL 2 降級模式**（不等於所有手機一定可跑）；上游 README 列 Chrome/Edge desktop/Android、Safari 26 macOS/iOS 作為 WebGPU 支援路徑。
- 有 auto quality、FPS/1% low/GPU time 面板、GPU profile、headless harness (`npm run harness`)。
- 上游 `package.json` 需 Node `>=24`；核心命令：`npm install`, `npm run dev`, `npm run typecheck`, `npm run build`, `npm run harness`。
- 上游在 README 記載 4070 Ti 1920×1080 144fps 的特定展示條件；不得外推為手機/內顯效能。
- MIT 授權：保留 LICENSE、作者 attribution；確認第三方資產/聲音授權，不要假定所有模型都可任意再散布。
- 上游 `AGENTS.md` 詳述 renderer、worker、benchmark 機制；**先閱讀再修改**。不要照搬其特定作者/PR 流程、硬碟路徑約束到自己的 fork。

References:
- https://github.com/VictorZakharov/threejs-nanites
- https://raw.githubusercontent.com/VictorZakharov/threejs-nanites/main/AGENTS.md
- https://raw.githubusercontent.com/VictorZakharov/threejs-nanites/main/package.json

## 3. Product vision (Phase 1+; NOT Phase 0 gate)

第三人稱視角跟隨一隻鳥，穿越樹枝、樹冠、林間空隙。可逐步增加飛行慣性、風、障礙、收集點、競速、路線與排行榜。Phase 0 只建立極簡飛行 vertical slice，無需多人、帳號、音樂、任務、內容系統。

### Camera / world assumptions to test

- 預設林下/林冠近距離飛行，先限制高度約 1–35m，視角 65–80 度（可調）。
- 初始 active visual range 80–160m，使用霧、LOD/impostor 控制遠景；**這是實驗參數而非已證實最適值**。
- 初始採可重現 seed 的固定森林測試區，選擇兼具開闊與高密度障礙的路徑。
- 物理碰撞與視覺網格分離；Phase 0 可只做樹幹 proxy collider 或安全通道，但不可讓鳥直接穿越所有樹而未告知。
- Bird mesh 首版使用簡易低面數自製 placeholder / 程式生成模型，避免外部資產授權與下載負擔。

## 4. Phase 0 — Required deliverable: playable multi-device benchmark

**Definition**: 一個 URL 可在真機手機與筆電載入，有 bird + forest + flight camera + keyboard/touch controls + performance panel + quality settings + diagnostics export；有可重現測試報告。

### P0-A. Establish unmodified upstream baseline

1. Fork/clone upstream；記錄 upstream commit SHA、branch、license、依賴版本及 browser requirements。
2. `npm ci`; `npm run typecheck`; `npm run build`; `npm run harness -- --help`。
3. 保留 upstream demo 原本路徑供 A/B (`/upstream/` 或獨立部署，避免混淆測試結果)。
4. 確認兩條 rendering backend 的功能與限制，不要假設 WebGL fallback 等效於 WebGPU。
5. 檢查 `?scene=forest`, `trees`, `bushes`, `tau`, `auto`, `budget`, `pr`, `outpr`, `shadows`, `grass`, `relief`, `occ`, `sw`, `imppx` 是否仍有效；如程式碼變更，以實際 README 和 parser 為準。

### P0-B. Device-aware startup (mandatory)

- 首屏**先出現可互動 UI**：開始 / 裝置資訊 / 品質設定，不得讓原始 100 萬棵樹預處理阻塞使用者。
- Detect capabilities: WebGPU available and adapter creation success, WebGL2 available, renderer/adapter metadata (where permitted), screen size, DPR, refresh rate estimate, memory hint where permitted, touch/pointer, hardwareConcurrency, browser version. **不得靠 UA 判斷 GPU 性能**。
- Default to `Auto` profile; prefer WebGPU on compatible devices, on init failure retry WebGL2 (restart/cleanup old contexts), on WebGL2 failure render friendly unsupported UI with diagnostics; never blank screen.
- Settings: `Auto / Battery-Saver / Low / Medium / High`; show current backend and internal render scale. Distinguish output canvas resolution from internal render resolution.
- On mobile, device orientation and safe areas supported, disable inadvertent selection/scroll on game controls, touch controls not obstructing FPS panel.
- Handle tab background/foreground, device orientation change, resize, WebGPU device lost / WebGL context lost, degraded battery or throttling. Pause safely and reinit when possible.
- HTTPS deploy is mandatory for remote phone testing (`localhost` exception is not mobile remote access). Recommend GitHub Pages or equivalent static hosting with correct `base` path.

### P0-C. Minimal playable vertical slice (mandatory)

- One bird with simple wing-flap animation; camera behind and slightly above bird; visible heading and horizon.
- Keyboard: WASD / arrows direction; Space up; Ctrl or alternative down; Shift boost (optional); Esc pause/settings.
- Touch: left thumb 2D steering + right area camera or simplified single-stick steering, large dedicated climb/dive buttons; no hover-only controls; test one-hand/two-hand ergonomics.
- Speed cap and smoothing; deterministic simulation on fixed tick, animation/render decoupled; clamp delta time on resume.
- Procedural forest with deterministic seed; avoid 1M-tree default, start with a few scalable density profiles and visually dense corridor.
- Fast-turn test route and repeated low-altitude fly-through; record camera path automatically for reproducible perf.
- Bird and obstacles remain recognizable at Low; avoid visibly broken tree silhouette in nearby area.

### P0-D. Rendering adaptation (mandatory)

- Quality controller driven by *measured* frame timing, GPU timing when available, warm-up and hysteresis, not a one-frame FPS reading.
- 60Hz frame budget = 16.67 ms inclusive (CPU + GPU + browser/compositing, partially overlapping); tune GPU budget separately to leave CPU and display headroom.
- Gradual adaptation knobs (in this order, test rather than hardcode): internal render scale; shadows; relief/grass; cluster screen-space error tau; impostor threshold; far visual range; foliage density. Avoid changing gameplay collider/physics per profile.
- Use smoothing + cooldown to prevent oscillation. Keep near-field silhouettes and visible collision objects highest priority. Dynamic resolution min/max should be explicit in config and HUD.
- If WebGPU proves slower/unavailable on a given device, support WebGL2 simplified path: instancing + fixed LOD + impostors, bounded draw calls, reduced effects. WebGL2 must remain *usable*, not merely show a warning.
- Include optional switches to A/B HZB, software rasterizer, TAA/upscaling; fast-moving foliage can reveal TAA ghosting or stale occlusion. Do not assume every optimization speeds up all devices.
- Forest placement/streaming/preprocessing should use workers/offline artifacts where possible; no blocking asset processing during flight. Record initial load time and peak memory where accessible.

### P0-E. Benchmark / telemetry (mandatory)

HUD (toggleable, unobtrusive on mobile):
- FPS rolling 15s average; 1% low (well-defined sample window); median/p95 frame time; CPU JS main thread time if measurable; GPU time if supported; render backend; quality profile; render scale; DPR; viewport; visible instances / hardware triangles / impostors where instrumented; device memory if available (otherwise `N/A`, **never fabricated**).
- Show `GPU: N/A` if timestamp queries unsupported rather than misleading 0 ms.
- Export JSON via Copy and Download buttons (clipboard fallback for mobile) with timestamp, user agent, capabilities, settings, device category, path ID, warm-up, run length, frame samples summary, dropped frames, error messages, git SHA.
- A/B benchmark fixed scripted camera paths: `ground`, `dense`, `turn`, `canopy`, `speed`, `pause-resume`; preserve seed and exact route across devices.
- Auto benchmarking is useful on desktop via upstream harness, but **cannot replace real mobile browser measurements**.
- Keep screenshots/short screen-recording evidence for visual regressions, especially branch/leaf popping and touch layout.

### P0-F. Default test presets (experiment, adjust after profiling)

These are *starting hypotheses*, not proven device compatibility or expected FPS.

| Profile | Initial internal render scale | Trees in test area | Shadows | Grass / Relief | Notes |
|---|---:|---:|---|---|---|
| Battery-Saver | 0.55–0.65 | low | off | off | steady frame pacing over detail |
| Low | 0.65–0.75 | low/medium | off | off | default fallback for basic phones/Intel UHD |
| Medium | 0.75–0.9 | medium | low | low/off | initial mobile/chromebook candidate |
| High | 1.0 | medium/high | on | on | powerful GPU reference |
| Auto | adaptive | adapt density at load boundaries | adaptive | adaptive | never mutate colliders while flying |

Avoid hardcoded raw tree counts until mapping density, placement, RAM and loading behavior is measured. Do not switch 1M -> 10k and falsely claim equivalent visual complexity.

## 5. Acceptance criteria and honest reporting

### Functional gates (must pass for Phase 0 completion)

- [ ] HTTPS live demo works on **at least one physical Android or iPhone** and **at least one real low-power laptop/Chromebook**; report model, OS/browser version and date. Testing only desktop emulation is NOT sufficient.
- [ ] Shows a playable bird + forest in both tested device classes; user can fly, turn, ascend and descend with appropriate input.
- [ ] WebGPU works where supported; WebGL2 fallback was tested on a device/browser without WebGPU (or controlled disable) and is usable; unsupported devices show a clear diagnostic, not blank UI.
- [ ] Quality can be changed at runtime; Auto responds without rapid oscillation; low-end mode retains near-field navigation visibility.
- [ ] FPS / frame time visible; JSON results can be exported on phone and laptop; GPU N/A handled correctly.
- [ ] Fixed-path, repeatable performance capture; initial-load timings captured; no console uncaught exceptions in smoke tests.
- [ ] Device rotation, pause/resume, repeated reload, and basic touch usability pass.
- [ ] README includes public URL, install, troubleshooting, device matrix, known issues, licensing.

### Performance goal (stretch/optimization gate, not a false functional claim)

- **Target**: 60fps on the user's 12th Gen U Chromebook and a representative midrange phone in Low/Auto mode, at a documented viewport/output resolution, browser, backend and path.
- Recommended measurable target: median frame ≤16.67 ms, p95 ideally ≤20 ms and 1% low ≥50fps on a 60Hz display, after warm-up, repeated in at least 3 runs of 60 seconds per relevant path. **Average FPS alone is insufficient**.
- Heavy density / thermal steady-state: 5–10-minute flythrough on mobile; capture throttling trends; do not use a 10-second peak FPS as evidence.
- If 60fps fails: **Phase 0 can still deliver a functional cross-device prototype, but the performance gate must be marked `FAIL / NOT VERIFIED`** with exact data, cause hypothesis and prioritized next steps. Never claim Phase 0 60fps success without device traces.
- If Chromebook remains at exactly ~30fps across radically different loads: check 30Hz display/OS settings, power saving, vsync frame cadence, browser GPU acceleration/backend, DevTools overhead before declaring GPU-limited.

## 6. Test matrix

| Device | Browser/backend | Priority | Verification |
|---|---|---|---|
| User Chromebook Intel 12th Gen U | ChromeOS Chrome, WebGPU or WebGL2 | P0 | real 60s scripted routes, 60fps target |
| Physical midrange Android (model to be recorded) | Chrome Android, WebGPU, WebGL2 fallback as applicable | P0 | real touch + thermal run |
| Physical iPhone (model to be recorded) | Safari / OS version, backend as supported | P0/P1 depending access | real touch + orientation |
| General Windows Intel iGPU laptop | Edge/Chrome | P1 | smoke + FPS |
| Apple Silicon laptop | Safari/Chrome | P1 | smoke + FPS |
| Discrete GPU desktop | Chrome/Edge | Reference | high quality regression |

**No access to a device:** report `NOT TESTED`; do not fabricate results. Need at least one real phone to claim mobile validated. Android + iPhone both passing is the eventual cross-ecosystem target, not something inferred from one device.

## 7. Suggested project layout (adapt to upstream to avoid needless churn)

```text
/
  AGENTS.md                      # project-specific instructions, link upstream guidance
  HANDOFF.md                     # copy of this file
  README.md                      # play + test instructions
  src/
    nanite-lib/                 # keep upstream boundaries, minimum edits
    bird/                       # bird placeholder, controls, flight simulation, camera
    world/                      # seeds, corridor, chunks, collisions
    app/                        # startup, capability probing, backend selection
    quality/                    # profiles, adaptive quality, hysteresis
    telemetry/                  # FPS, run sampling, JSON export
    ui/                         # touch controls, settings, benchmark HUD
  tools/
    ...                         # reuse upstream harness and fixed paths
  public/
  reports/
    phase0-device-matrix.md
    phase0-results/*.json
```

## 8. Agent execution order / tickets

- **P0-01 Bootstrap**: fork clone, pin SHA, license, npm ci/build/harness, baseline screenshots, document unknowns.
- **P0-02 Capability probe & startup**: support WebGPU/WebGL2/unsupported, responsive boot screen, recovery from errors.
- **P0-03 Bird vertical slice**: bird model, follow-camera, deterministic physics, keyboard + mobile touch, small reproducible forest.
- **P0-04 Quality profiles**: Low/Medium/High/Auto, resolution scale, impostor/LOD thresholds and shadow controls.
- **P0-05 Telemetry**: overlays, device metadata, 1% low/p95, JSON export and fixed scripted paths.
- **P0-06 Deploy**: HTTPS URL, GitHub Pages/Vite base checks, no broken assets, cache busting, mobile network smoke.
- **P0-07 Real-device QA**: user Chromebook + actual phone, table of measured FPS/frametime, 3 runs each, orientation, heat.
- **P0-08 Optimize**: prioritize largest measured bottleneck, rerun before/after, keep visuals and collisions correct.

Every ticket must include: exact reproduction steps, expected result, acceptance tests, before/after measurement when applicable, changed files, known limitations. Prefer one runnable increment per PR; do not spend the entire first iteration building an abstract framework.

## 9. Diagnostics / common traps

1. **30fps does not always mean GPU bottleneck**: ChromeOS panel refresh, battery saving, half-vsync, driver/backend and main-thread stalls must be checked.
2. **WebGPU != universally available**: browser/OS versions differ; secure context required for deployment; failure may occur after capability detection.
3. **WebGL fallback isn't Nanite parity**: different paths require their own benchmarks, quality settings and visual QA.
4. **Mobile DPR**: CSS pixels != drawing pixels; high DPR can multiply fragment cost. Track internal and output pixel ratios separately.
5. **Heat**: mobile fast for 30 seconds but slower after minutes; capture sustained measurements.
6. **TAA / HZB**: fast bird turns create ghosting, delayed occlusion, temporary missing foliage; inspect motion, not only static screenshots.
7. **Streaming stutters**: shader compilation, tree generation, impostor baking, upload and GC can hurt p95 even when average FPS is high.
8. **Alpha foliage**: transparency/alpha testing can dominate fill rate; triangles alone do not predict performance.
9. **Touch**: scrolling, selecting text, viewport resize from mobile browser UI, safe areas, input latency.
10. **False measurements**: dev mode, background throttling, DevTools, screen capture, warm-up, clock differences and GPU timestamp query unavailability.
11. **Vite base path**: GitHub Pages project site requires correct subpath and assets; avoid hardcoded root-relative URLs.
12. **Physics mismatch**: visual LOD must not change the actual collision layout; prevent camera tunneling through trees with simple proxies / sweep tests.

## 10. Phase 0 report template

```md
# Phase 0 Device Results
Build SHA: ...
Test date: ...
Deployment: https://...
Forest seed: ...
Benchmark path: dense / turn / speed
Duration: 60s x3, warm-up 15s, plus mobile thermal run

| Device / OS / Browser | Backend | Viewport / DPR / render scale | Avg FPS | 1% low | Median / p95 ms | GPU ms | Load s | Result |
|---|---|---|---:|---:|---|---:|---:|---|
| Chromebook 12th Gen U | TBD | TBD | TBD | TBD | TBD | TBD/N/A | TBD | NOT TESTED |
| Real mobile device | TBD | TBD | TBD | TBD | TBD | TBD/N/A | TBD | NOT TESTED |

Functional gates: PASS/FAIL with evidence
Performance target: PASS/FAIL/NOT VERIFIED
Regressions / bugs:
Top bottleneck hypotheses ranked by supporting measurements:
Next recommended experiment:
```

## 11. Immediate agent instruction (copy/paste)

> Read `HANDOFF.md`, upstream README, upstream AGENTS.md, and package.json. Build a new independently deployable Bird Forest Phase 0 without claiming unverified 60fps. First pin upstream SHA and reproduce base tests; implement a minimal bird flythrough with phone touch and laptop keyboard, WebGPU primary + WebGL2 fallback, adaptive profiles, HUD and JSON benchmark capture; deploy HTTPS preview; perform local harness tests, then request real device evidence for Chromebook and a physical phone. Keep modifications to `nanite-lib` minimal; if unavoidable explain why. Report every functional/performance gate with PASS/FAIL/NOT TESTED, include screenshots and exact reproduction commands. Prioritize a visible runnable artifact over speculative optimization. Do not push to a repo without explicit repository/permission instruction.

## 12. Out of scope Phase 0

Full planet / 1M trees, detailed realistic bird assets, multiplayer, netcode, leaderboards, procedural infinite terrain, music licensing, analytics services, backend login, cloud GPU rendering, photo-real foliage under every condition, guaranteed 60fps on every phone, background processing beyond the app's own active runtime.
