import { useState, useRef, useEffect } from "react";
import { lookupCode, CATEGORY_COLORS } from "../utils/reasonCodes";

function CodePopover({ code, info, onClose, anchorRect, onViewClaims }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRect || !ref.current) return;
    const popover = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;

    // Flip up if not enough room below
    if (top + popover.height > vh - 20) {
      top = anchorRect.top - popover.height - 8;
    }
    // Keep within viewport horizontally
    if (left + popover.width > vw - 20) {
      left = vw - popover.width - 20;
    }
    if (left < 10) left = 10;

    setPos({ top, left });
  }, [anchorRect]);

  const catColor = CATEGORY_COLORS[info.category] || "#8b95a8";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 998,
          background: "transparent",
        }}
      />
      {/* Popover */}
      <div
        ref={ref}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 999,
          width: 360,
          background: "#2a2620",
          border: "1px solid #342f28",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.15s ease",
        }}
      >
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                fontWeight: 700,
                color: "#e8dfd0",
              }}
            >
              {code}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                background: catColor + "20",
                color: catColor,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              {info.category}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#7a7060",
              cursor: "pointer",
              fontSize: 16,
              padding: "2px 6px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 12,
            color: "#bfb5a3",
            lineHeight: 1.6,
            marginBottom: 14,
            padding: 12,
            background: "#221f1b",
            borderRadius: 8,
            borderLeft: `3px solid ${catColor}`,
          }}
        >
          {info.description}
        </div>

        {/* Fix */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#8aad72",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
            }}
          >
            How to Fix
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#bfb5a3",
              lineHeight: 1.6,
            }}
          >
            {info.fix}
          </div>
        </div>

        {/* View Claims button */}
        {onViewClaims && (
          <button
            onClick={() => {
              onViewClaims(code);
              onClose();
            }}
            style={{
              marginTop: 14,
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "rgba(59, 130, 246, 0.1)",
              color: "#c2703e",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
            }}
          >
            View Claims with {code} →
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Renders a string of reason/remark codes as clickable badges.
 * Clicking a code shows a popover with description and fix.
 *
 * @param {string} codes - Space-separated codes, e.g. "CO-45 PR-2 N781"
 * @param {object} style - Optional container style overrides
 */
export default function ReasonCodeBadges({ codes, style, onViewClaims }) {
  const [active, setActive] = useState(null); // { code, info, rect }

  if (!codes) return null;

  const codeList = codes
    .split(/[\s,;]+/)
    .filter(Boolean)
    .filter((c, i, arr) => arr.indexOf(c) === i); // dedupe

  const handleClick = (e, code) => {
    e.stopPropagation();
    const info = lookupCode(code);
    if (info) {
      const rect = e.currentTarget.getBoundingClientRect();
      setActive({ code, info, rect });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        ...style,
      }}
    >
      {codeList.map((code) => {
        const info = lookupCode(code);
        const known = !!info;
        const catColor = known
          ? CATEGORY_COLORS[info.category] || "#8b95a8"
          : "#7a7060";

        return (
          <span
            key={code}
            onClick={known ? (e) => handleClick(e, code) : undefined}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 6,
              background: known ? catColor + "18" : "#342f28",
              color: known ? catColor : "#7a7060",
              cursor: known ? "pointer" : "default",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
              border: `1px solid ${known ? catColor + "30" : "transparent"}`,
            }}
            onMouseEnter={(e) => {
              if (known) e.currentTarget.style.background = catColor + "30";
            }}
            onMouseLeave={(e) => {
              if (known)
                e.currentTarget.style.background = catColor + "18";
            }}
            title={known ? "Click for details" : code}
          >
            {code}
          </span>
        );
      })}

      {active && (
        <CodePopover
          code={active.code}
          info={active.info}
          anchorRect={active.rect}
          onClose={() => setActive(null)}
          onViewClaims={onViewClaims}
        />
      )}
    </div>
  );
}
