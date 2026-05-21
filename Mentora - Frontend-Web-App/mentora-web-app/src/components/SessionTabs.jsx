
import "../styles/sessionTabs.css";


const SessionTabs = ({ tabs = [], activeKey, onChange }) => {
  return (
    <div className="sessTabsWrap">
      <div className="sessTabsPill">
        {tabs.map((t) => {
          const active = t.key === activeKey;
          return (
            <button
              key={t.key}
              type="button"
              className={`sessTabBtn ${active ? "active" : ""}`}
              onClick={() => onChange(t.key)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SessionTabs;
