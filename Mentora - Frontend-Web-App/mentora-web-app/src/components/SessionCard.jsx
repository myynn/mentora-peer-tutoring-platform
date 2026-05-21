
import "../styles/sessionCards.css";

const safeText = (v) => (v === null || v === undefined ? "" : String(v));

const SessionCard = ({
  dateLabel,
  timeRange,
  rightLabel,
  rightName,
  status,
  pillText,
  lines = [], 
  footerLeftButtons = [], 
  footerRightButtons = [],
}) => {
  return (
    <div className="sessItem">
      <div className="sessDate">{dateLabel}</div>

      <div className="sessCard">
        <div className="sessTopRow">
          <div className="sessTopLeft">{timeRange}</div>

          <div className="sessTopRight">
            <span className="sessWhoLabel">{rightLabel}</span>
            <span className="sessWhoName">{rightName}</span>

            {(pillText || status) ? (
              <span className="sessStatusPill">
                {pillText ? pillText : `Status: ${status}`}
              </span>
            ) : null}
          </div>
        </div>

        <div className="sessBody">
          {lines.map((x, idx) => {
            if (x?.type === "hint") {
              return (
                <div className="sessHintWrap" key={idx}>
                  <div className="sessHintBox">{safeText(x.value)}</div>
                </div>
              );
            }

            return (
              <div className="sessLine" key={idx}>
                <div className="sessLineLabel">{x.label}</div>
                <div className="sessLineValue">{safeText(x.value) || "—"}</div>
              </div>
            );
          })}
        </div>

        <div className="sessFooter">
          <div className="sessFooterLeft">
            {footerLeftButtons
              .filter((b) => b.show !== false)
              .map((b, i) => (
                <button
                  key={i}
                  type="button"
                  className="sessBtn secondary"
                  onClick={b.onClick}
                >
                  {b.label}
                </button>
              ))}
          </div>

          <div className="sessFooterRight">
            {footerRightButtons
              .filter((b) => b.show !== false)
              .map((b, i) => (
                <button
                  key={i}
                  type="button"
                  className="sessBtn primary"
                  onClick={b.onClick}
                >
                  {b.label}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCard;