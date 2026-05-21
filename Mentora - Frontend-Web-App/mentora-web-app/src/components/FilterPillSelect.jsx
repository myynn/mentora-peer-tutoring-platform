import { useEffect, useRef, useState } from "react";

const FilterPillSelect = ({ label, icon, value, onChange, options = [] }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const currentLabel =
    options.find((o) => String(o.value) === String(value))?.label || "";

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="ttFilterPill ttFilterPillClickable" ref={wrapRef}>
      <button
        type="button"
        className="ttFilterBtn"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ttFilterIcon">{icon}</span>
        <span className="ttFilterLabel">{label}</span>
        <span className="ttFilterChevron">▾</span>
      </button>

      {open ? (
        <div className="ttFilterMenu" role="listbox" aria-label={label}>
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <button
                key={`${label}-${opt.value}`}
                type="button"
                className={`ttFilterMenuItem ${active ? "active" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="ttFilterMenuItemText">{opt.label}</span>
                {active ? <span className="ttFilterMenuTick">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default FilterPillSelect;