# Phase 0 驗收紀錄

日期：2026-11-03。**目前是可操作與可量測的試作；Phase 0 的實機驗收尚未完成。60 FPS：NOT VERIFIED。**

## 裝置與效能

| 裝置 | 後端 / 驗證 | 結果 |
|---|---|---|
| 雲端 Debian 13，Chromium 154.0.8037.57，SwiftShader | WebGL2；640×480、390×844 與旋轉尺寸 | 功能 PASS；軟體繪圖，不代表實機效能 |
| 同一雲端，開啟 experimental WebGPU | adapter 存在，但最小原生 clear / queue fence 即失敗 | WebGPU NOT VERIFIED；自動降級 WebGL2 PASS |
| 使用者 12th Gen U Chromebook | 真實 CPU/GPU、ChromeOS、瀏覽器版本待記錄 | NOT TESTED |
| 實體 Android 手機 | 型號、OS、Chrome 版本待記錄 | NOT TESTED |
| 實體 iPhone | 型號、iOS、Safari 版本待記錄 | NOT TESTED |
| Windows / Mac 文書筆電 | 型號、OS、瀏覽器待記錄 | NOT TESTED |

SwiftShader 的短測試只有約 1–2 FPS，是 CPU 軟體繪圖的結果；不可用來判定手機或筆電的瓶頸，也不能宣稱達到 60 FPS。原始 JSON 保留 build SHA 和 dirty=true，表示測試發生在實作提交之前；不是已發布 commit 的實機量測。

WebGPU 的本環境錯誤為 `OperationError: A valid external Instance reference no longer exists.`。在不載入 Three.js 的最小 native WebGPU clear 中也發生。DLC 先做小型提交檢查，失敗後釋放 device、換新 canvas，啟動 WebGL2。受控停用 `navigator.gpu` 的另一條降級測試同樣通過。尚未證實真正硬體 WebGPU 能完成整個森林畫面。

## 已執行的檢查

- 原版上游 `npm ci`、`typecheck`、`build`、`harness -- --help`：PASS。
- 原版固定 `main` SHA：`500113d7b651d2eb96392ce87c96330bdec25e15`。Three.js 0.186.1、meshoptimizer 1.3.0；vendored library 與原版逐檔比較無差異。
- 海洋既有測試：13 / 13 PASS；森林純邏輯測試：7 / 7 PASS。
- 森林邏輯：seed 決定性、固定 60 Hz 模擬、升降／速度／界線、樹幹碰撞、六條路線安全間隙／朝向／無瞬移、Auto 暖機／冷卻／上下限、1% low 定義、benchmark 暖機與中止。
- 瀏覽器：鍵盤轉向／上升、兩指搖桿＋上升、Esc 開關與暫停、即時畫質、固定路線捕捉、桌面／觸控 JSON 下載、背景恢復、320×568／844×390／568×320 版面、受控 context loss 復原 UI、unsupported UI。
- 故意 `WEBGL_lose_context` 的唯一預期 Three.js error 逐項比對；其他 console error / pageerror 必須為零。
- 組裝後的站點：海洋實際飛行、指南連到 `/forest/`、森林 nested-path 操作測試、固定上游 WebGL2 `renderOnce`：PASS。上游以 trees=30 / plaza=0 / pr=0.5 作載入檢查，實際產生 28 棵；這不是性能比較。
- 3 秒捕捉＋1 秒暖機只驗證捕捉機制。正式效能比較應暖機 15 秒、量測 60 秒、至少三次；沒有用短測試冒充完整效能驗收。

上游比較頁使用已核對 parser 的 scene / trees / bushes / tau / auto / budget / pr / outpr / shadows / grass / relief / occ / sw / imppx 參數。`statues=0` 只停用額外雕像，另以 `plaza=0` 停用中央雕像環。其 Google Fonts 在雲端網路政策下無法連線；測試單獨記錄此字型失敗，沒有修改上游來源或忽略其他錯誤。

## 保留的技術邊界

DLC 使用上游 **cluster DAG 離線建構 / 固定切片**、instanced trees、CPU 視錐／距離剔除、遠景 impostors、動態內部解析度。**完整 GPU-driven cluster selection / HZB / software rasterizer / TAA 尚未接入。** 上游原版獨立保留於 `/forest/upstream/`；不同場景／工作量的 FPS 不直接視為演算法收益。

DLC 的樹、鳥與貼圖為程序生成；樹幹有固定碰撞代理，葉片與石頭是裝飾。近鏡葉片淡出，LOD 交接仍需真機移動畫面驗收。單角度遠景 impostor 的俯視形狀仍有限制。

## 下一輪實機驗收

1. 在手機及 Chromebook 開啟 [HTTPS DLC](https://clarencechien.github.io/endless-sea/forest/)，確認轉向、升降、旋轉、暫停和全螢幕；記錄型號、OS、瀏覽器與電源模式。
2. 設定 → 飛行測試與報告，以 Low / Auto 跑 ground、dense、turn、canopy、speed、pause-resume；每條相關路線至少三次，下載 JSON。
3. 對照相同 viewport、輸出與內部解析度、後端、seed、路線與版本。GPU time 不可用時保留 N/A。
4. 手機連續飛行 5–10 分鐘後再記錄，檢查熱衰退及近場枝葉／LOD。
5. 目標：median ≤16.67 ms、p95 ≤20 ms、1% low ≥50 FPS。若固定約 30 FPS，先辨別刷新率／省電／VSync／硬體加速，不能直接判定 GPU 算不動。

詳細重現命令、授權與錯誤處理見 [README](../README.md)。隨附 `evidence/` 的 JSON 與截圖是軟體繪圖功能證據；不代表實體手機通過。
