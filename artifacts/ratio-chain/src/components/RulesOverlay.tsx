import type { ReactNode } from "react";

const RULES: ReactNode[] = [
  <>
    在 <b>6×6</b> 棋盘上，沿<b>八个方向</b>（含斜向）拖动相邻数字，连成至少两对比且彼此相等的链（如
    6:9 = 8:12），至少 4 格、偶数长度，松手即消除得分
  </>,
  <>
    单次得分 = <b>全加</b>（链上所有数字之和）× <b>连比倍率</b>（段数越多越高）×{" "}
    <b>难度系数</b> × <b>连击倍率</b>
  </>,
  <>
    <b>难度系数</b>：1:1 → ×1；含 1 的比（1:n）→ ×2；m:n（两数均非 1）需链上<b>≥3 个不同数字</b>
    才 ×3（如 3:10=6:20）；只是重复同一对（如 3:10=3:10，仅 2 个数）→ ×2
  </>,
  <>
    <b>连击倍率</b>：每连续成功消除连击 +1，倍率为 ×1.16、×1.32、×1.48、×1.64…（即 1+连击×0.16），最高
    <b>×3.00</b>；数字越大、链越长，得分越高
  </>,
  <>每局盘面有 1～4 个 ? 未知数，松手后从选项里选出正整数让比例成立；一次只能解 1 个 ?，答对照常计分</>,
  <>比值不相等或 ? 选错不再扣分，但<b>连击会减半</b>——保住连击才是关键</>,
  <>消除后上方数字下落填补，顶部补新数字；盘面小数字与大数字并存，挖哪种链由你自己决定</>,
  <>可选开启「提示种子」：某条可消链的起点会微微发光，帮你找突破口</>,
];

export function RulesOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-screen" onClick={onClose}>
      <div className="overlay-card overlay-card-rules" onClick={(e) => e.stopPropagation()}>
        <h2 className="overlay-title">玩法说明</h2>
        <div className="rules-modal-scroll">
          <ol className="rules-modal-list">
            {RULES.map((rule, i) => (
              <li key={i} className="rules-modal-item">
                <span className="rules-modal-num">{i + 1}</span>
                <span className="rules-modal-text">{rule}</span>
              </li>
            ))}
          </ol>
        </div>
        <button className="menu-start-btn" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}
