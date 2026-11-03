# 林間 · Bird Forest DLC

同一個 `clarencechien/endless-sea` Git repository 的獨立子專案。海洋仍在 `/`；鳥的森林在 `/forest/`；固定上游版本的比較頁在 `/forest/upstream/`。**這是可操作的 Phase 0 試作；實機跨裝置驗收和 60 FPS 目標尚未驗證。**

- 遊玩：https://clarencechien.github.io/endless-sea/forest/
- 原本海洋：https://clarencechien.github.io/endless-sea/
- 上游比較：https://clarencechien.github.io/endless-sea/forest/upstream/?scene=forest&trees=2000&bushes=0.5&statues=0&plaza=0&music=0&auto=0&pr=1&outpr=1&shadows=0&grass=0&relief=0
- 需求原文：[HANDOFF.md](docs/HANDOFF.md)
- 驗收狀態：[Phase 0 device matrix](reports/phase0-device-matrix.md)

## 開發與部署

Node 24+。兩個應用有獨立的依賴與 lockfile，森林使用 Three.js 0.186.1，避免更動海洋的 Three.js 版本。

```sh
# repository root
npm ci
npm --prefix dlc/bird-forest ci
npm run dev:forest                    # http://localhost:5180/
npm run test:forest
npm --prefix dlc/bird-forest run build
npm --prefix dlc/bird-forest run preview  # http://localhost:5181/

# Build both applications and the untouched pinned comparison; requires GitHub/npm access.
npm run build:site
npm run preview -- --port 5174         # /, /forest/, /forest/upstream/
```

`build:site` 的 baseline 工具在被忽略的 `test-results/upstream-source` 抓取固定 SHA、執行原版 `npm ci`、typecheck、build、harness help，再組裝 Pages。可用 `BIRD_UPSTREAM_DIR=/path/to/verified/clone` 指定已有原版 checkout；`BIRD_UPSTREAM_PREBUILT=1` 只用於已完成上述檢查的本機快取。工具驗證 SHA 與 tracked source 未修改，CI 不使用 prebuilt 略過。GitHub Actions 建置並檢查三個 HTTPS 路徑及其 HTML 引用的資產。

## 操作

- WASD／方向鍵：轉向、升降；Space 上升；Ctrl 下降；Shift 加速；R 回入口；Esc 暫停／設定。
- 手機：左搖桿轉向與升降，右側大按鈕上升／下降；右半畫面拖曳環顧。支援同時兩指操作、pointer cancellation、旋轉與 safe area。
- 設定：Auto、Battery-Saver、Low、Medium、High 即時切換。後端切換會重載，`?backend=webgl2` 可強制降級。
- 固定約 420 m 的森林測試區；高度為地表上 1.4–35 m。樹幹有固定碰撞代理；枝葉與小石頭是裝飾。飛行限制在測試區內，並非無限地圖。
- 不含音樂、帳號、任務或外部追蹤。

## 使用的上游技術與範圍

上游：Victor Zakharov / [threejs-nanites](https://github.com/VictorZakharov/threejs-nanites)，`main`，固定 SHA `500113d7b651d2eb96392ce87c96330bdec25e15`。已閱讀上游 README、AGENTS 與 harness guide；其作者 PR 流程和 Windows 磁碟規則不套用到本專案。

`vendor/nanite-lib/` 是該 SHA 的未修改快照。開發端 `tools/build-trees.mjs` 用其 **128-triangle cluster DAG 建構與 dagCut**，將兩種自製樹木做成三層固定切片。共用頂點資料寫成附內容雜湊的二進位資產，約 600 KB 原始大小；瀏覽器不建 DAG，也不需要 Blender 或 ez-tree。worker 解碼並以 seed 73129 建立 2,919 棵樹的固定測試區；這是這份 seed/間距實驗的結果，並非跨裝置最佳數量或千萬面的 KPI。

WebGPU 和 WebGL2 目前共用 **instancing + 固定 DAG LOD + 啟動時烘焙的單角度遠景 impostor**。CPU 做視錐／距離剔除，近場保留完整樹幹，LOD 帶以互補的固定螢幕抖點交接，遠景在霧中淡出。近鏡枝葉另以抖點淡出，避免相機進入樹冠時被整片葉卡遮住。鳥、地形、樹幹碰撞與 seed 不隨畫質改變。固定 60 Hz 物理與繪製分開，恢復分頁時清除積欠時間。

**DLC 尚未接入上游完整的 GPU-driven cluster selection、HZB、software rasterizer、TAA／temporal upscaling、草與 relief。** 設定與 JSON 明確標示不可用，沒有假的 A/B 開關；原版比較頁保留這些功能供獨立測試。DLC 的 WebGPU 路徑不是完整 Nanite 管線。未修改的 renderer 保留於 vendor，方便後續在量測證明有收益時接入。

Auto 以 2 秒前景幀間隔視窗、8 秒暖機、4 秒調整冷卻與持續乾淨視窗恢復：先以 0.05 步距調整內部比例（0.55–1.0），到下限才調遠距離與 LOD。輸出像素 DPR 上限 1.5，內部 target 另乘 render scale，以單次 spatial bilinear pass 放大；沒有宣稱重建原生解析度。High 可開啟 512² 陰影，其餘初始關閉；第一次切換可能編譯新 shader。

## 量測與重播

```sh
cd dlc/bird-forest
node tools/harness.mjs --help
# 本機已啟動 production preview；需 Chromium，可由 CHROMIUM_PATH 指定。
node tools/harness.mjs --backend=webgl2 --path=ground --warmup=15 --duration=60
node tools/harness.mjs --backend=auto --path=turn --warmup=15 --duration=60
node tools/harness.mjs --backend=webgl2 --mobile --path=dense --warmup=15 --duration=60
node tests/browser.mjs
# 根目錄組裝完成、5174 preview 啟動後：
node tests/site.mjs
```

harness 預設使用 Chromium + SwiftShader，**是功能檢查，無法代表手機／內顯的性能**；匯出會附此註記。真機請使用 HTTPS 版設定 →「飛行測試與報告」，選 ground / dense / turn / canopy / speed / pause-resume，暖機 15 秒＋記錄 60 秒，下載或複製 JSON。每條相關路線至少 3 次，再用手機連續飛 5–10 分鐘觀察熱衰退；提供型號、OS／瀏覽器與是否省電模式。

- FPS / 1% low / median / p95：前景最近 15 秒；1% low = `1000 / 最慢 ceil(N×1%) 幀間隔的平均值`。
- GPU：可用 backend timestamp queries 的 render 時間；不支援回傳 `null`、HUD 顯示 N/A。JS 時間為同步模擬、剔除和提交時間，不包含 GPU 非同步工作。
- droppedFrames 是相對 60 Hz 幀間隔估算的 missed intervals，不是 compositor 計數。
- refresh rate 是首屏 RAF 間隔估計，不是螢幕硬體規格；記憶體只報可取得的 hint／JS heap／renderer resource 統計，不假裝知道完整顯存。
- 開場時間分開記錄 navigation→start 和 start→first-render-submit；後者不是 GPU 完成或畫面呈現的延遲。
- 固定路線以明確時間函式控制相機／鳥的位置；林道盡頭會原地轉向折返，不瞬移到起點，記錄路徑採樣與原始幀資料。`pause-resume` 路線在第 25 秒停姿態 2 秒，獨立功能測試另驗證分頁 pause/resume。
- 分頁切到背景或使用者暫停會中止本次 benchmark 並標記原因，不把背景等待計入有效測試。
- JSON 含 build SHA、dirty flag、上游 SHA、seed、backend、裝置提示、內外解析度、profile、warm-up、duration、原始樣本、路徑、錯誤。停止或中止的紀錄與 completed 有明確區分。

## 已知限制與故障處理

- **實機手機／低功耗筆電尚未測試；60 FPS = NOT VERIFIED。** 雲端的 software WebGPU 是否能完成工作，與瀏覽器是否暴露 navigator.gpu 是兩件事。
- 偵測 adapter 後先提交極小 GPU 工作確認可用性；初始化失敗會釋放 renderer/context 再嘗試 WebGL2。執行中 context/device lost 會暫停並顯示診斷及重新啟動；不顯示空白畫面。
- 若無法啟動：使用 `?backend=webgl2`，確認硬體加速，下載診斷。`?backend=unsupported` 是受控錯誤 UI 測試。
- 單角度 impostor 從樹冠上方看仍可能有形狀差異；近距離 alpha foliage、LOD 交接與地面材質需真機動態驗收。遠處畫質會在低比例時變軟。
- 上游完整 demo 的操作、場景與工作量不同；不要直接把它與 DLC 的 FPS 比值當純演算法收益。

## 授權

DLC 的鳥、樹、葉片／樹皮圖案與地形為自製程序資產。Nanite library 保留 [MIT 原文](vendor/LICENSE.nanite) 與作者歸屬。Three.js、meshoptimizer 各自依 MIT 發布。

`/forest/upstream/` 是獨立比較的上游原版建置，保留其 LICENSE、README 和 `models/README.md`。其中 Stanford Lucy 模型另有**僅研究／非商業用途**等條款，並非上游程式碼 MIT 的一部分；鳥的 DLC 不引用或載入這些模型、上游音效或樹木貼圖。商業發布前應移除比較頁或另行確認其全部資產授權。
