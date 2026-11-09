# 世界之窗

同一個 Endless Sea repository 的獨立靜態頁面，公開路徑 `/window/`。根目錄海洋、`/forest/` 與原版比較頁維持各自入口；海洋指南新增世界之窗連結。

依使用者提供的 [handoff](reference/HANDOFF.md) 發展照片窗景：柔和深度控制微幅視差、簡化 NOAA 太陽仰角控制光色。第一版聚焦世界之窗，沒有把示意車窗、假城市或隨機發光窗格當作實景發布。

## 素材與授權

- Poly Haven 的 Venice Sunset、Blouberg Sunrise 2、Spruit Sunrise 全景照片，皆依官方照片資產 **CC0 1.0** 授權，可使用、修改、散布與商用。
- 原檔取自 Three.js 官方 GitHub examples 的既有副本；已鎖定 commit、SHA-256 與來源頁，見 [sources.json](assets/sources.json)。授權依 Poly Haven 的素材政策，不是憑 Three.js 程式碼 MIT 推定照片授權。
- 官方素材政策核對自 Poly Haven 網站倉庫 `b1a6aa13afc03ae00860f6ac5fe6d5daf8e95356/public/locales/en/license.json`。它明載所有 HDRI 資產 CC0，允許商用與重新散布。其網站程式碼 AGPL 與照片資產授權不同，本頁未複製該網站程式碼。
- 三張來源均為 **1024×512** HDR 全景。轉成 WebP、進行色調映射；R/G 深度圖為手工近似距離場，並非 Depth Anything 輸出或實測深度。原環境禁止連線 Hugging Face，因此沒有宣稱完成模型推論。沒有辨識真窗戶或假造夜間窗燈。
- 網頁內有簡短照片授權視窗與 [完整來源頁](credits.html)。照片與深度共約 330 KB，全數隨站部署，訪客無須連到圖片網站、外部字型或下載 AI 模型。
- 位置為地區近似座標。草地以約翰尼斯堡區域估計日照，並非確認的拍攝 GPS；海灘使用 Blouberg 地區。照片自帶原始太陽與雲，日夜是氛圍色調模擬，並非即時攝影或氣象。

## 執行與驗證

```sh
npm run dev:window # http://localhost:5182
npm run test:window
node dlc/world-window/tests/browser.mjs
# 完整 Pages 組裝仍使用根目錄 npm run build:site
```

沒有新增 runtime 套件。單一 WebGL draw call，最多 130 萬內部像素、動態最多 30 FPS；靜止時每秒更新光色，分頁隱藏時不渲染。尊重 reduced motion，提供靜態照片 fallback、context loss 處理、場景切換競態保護、載入失敗重試。此策略是降低負擔，不保證所有真機都達 30 FPS。

窗外使用球面全景到透視投影，避免將 360° 照片直接鋪平；目前 1K 全景裁切後細節有限，並未以放大冒充高解析。室內採凹入式窗框、窗台、窗把與薄窗簾。微雨使用隨機大小的兩層雨珠、沿玻璃滑落的水滴、折射和濕玻璃柔化；不是室外雨粒子模擬。近似深度仍限制物體邊緣的視差正確性，微幅移動不能代替幾何重建。

功能：三個實景、當地時間與 ±12 小時、原景、96 秒一天快轉、微幅視差、玻璃微雨、暫停、全螢幕、手機直橫向，以及只在本機處理的照片匯入。暫停凍結動畫；當地時鐘繼續走。圖片 Blob URL 在換景後釋放，不上傳、不寫入持久儲存。

瀏覽器回歸涵蓋以上操作、快速換景、reduced motion、沒有 WebGL、context loss、照片載入失敗與重試，逐像素檢查雨滴暫停與恢復，以及確認執行過程零外部網路請求。雲端 SwiftShader 只驗證功能，不當作真機 FPS 測量。

重製圖片（開發者才需要 Python Pillow/numpy 與根目錄 Three.js）：

```sh
node dlc/world-window/tools/prepare-assets.mjs /tmp/world-window-assets
```

工具以官方副本的固定 commit 下載，驗證 SHA-256 後轉圖。建置／部署直接使用已提交圖片，不執行下載或依賴 Python 圖像套件。未來可換同來源更高解析度照片與經檢查的模型深度圖，無需變更頁面路徑。
