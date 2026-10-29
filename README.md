# Endless Sea

一架小飛機，一片無邊的海。瀏覽器中的程序化海洋飛行體驗。

## 開發

需要 Node.js 22.12+（本環境使用 Node.js 24）。

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
```

開發伺服器預設監聽 5173。需要支援 WebGL 2 且開啟硬體加速的現代瀏覽器。沒有後端、API 金鑰或外部模型依賴。所有視覺資產皆在本地生成，字型使用系統字型，不需外部 CDN。

## 飛行

點「開始飛行」後，以 W/S 俯衝與爬升、A/D 轉向、方向鍵上下調整油門。手動操作會解除自動巡航；P 切換巡航、R 重設、H 隱藏或恢復介面。觸控裝置提供方向按鈕。右側三個圓鈕切換晨光、金色時刻、藍調時刻；設定可調整風力與渲染精細度。環境音需自行開啟。

## 畫面技術與範圍

Three.js 負責圖形管線與程序化小飛機模型；自訂 GLSL 著色器渲染無限海面。多尺度波形、解析波面法線、Fresnel 反射、GGX 太陽高光、遠距霧化與程序化雲層營造光影。此版本使用 WebGL 2 以支援更多裝置；海浪是視覺近似，並非 FFT 流體模擬。飛行採簡化運動模型，最低高度 18 公尺，無碰撞或失速模擬。首章僅含海與天空，尚未實作地形。效能取決於 GPU 與畫面解析度。

`src/ocean.js`：海天著色器；`src/plane.js`：飛機幾何；`src/flight.js`：可測試的飛行狀態；`src/main.js`：場景、相機與互動。

瀏覽器功能檢查：`npm run test:browser`。預先啟動開發伺服器，並安裝 Chromium；可用 `CHROMIUM_PATH` 指定其執行檔。測試會檢查 GPU 渲染、飛行操作、畫面設定、音效、指南與手機觸控。

## GitHub Pages

推送到 `main` 後，`.github/workflows/pages.yml` 會執行測試、建置並部署到 GitHub Pages。首次部署若無法自動啟用 Pages，請到 GitHub 專案 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**，再重新執行部署 workflow。

預期網址：https://clarencechien.github.io/endless-sea/

Vite 使用相對資源路徑，支援 Pages 的專案子目錄。產出可用 `npm run preview` 在本機檢查。
