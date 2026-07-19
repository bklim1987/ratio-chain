import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Arena 早期消息缓冲：React 挂载前先攒 arena:* 消息，ArenaGame 挂载后补发。
(window as Window & { __arenaBuf?: MessageEvent[] }).__arenaBuf = [];
window.addEventListener("message", (e) => {
  if ((window as Window & { __arenaLive?: boolean }).__arenaLive) return;
  const t = e.data && (e.data as { type?: string }).type;
  if (t && String(t).indexOf("arena:") === 0) {
    (window as Window & { __arenaBuf?: MessageEvent[] }).__arenaBuf!.push(e);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
