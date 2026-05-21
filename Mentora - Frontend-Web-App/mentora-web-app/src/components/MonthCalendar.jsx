
import { useMemo } from "react";
import "../styles/monthCalendar.css";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad2 = (n) => String(n).padStart(2, "0");
export const toDateKey = (d) => {
  if (!d) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const monthLabel = (d) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const MonthCalendar = ({
  monthDate,
  selectedDate, 
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}) => {
  const grid = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const first = new Date(year, month, 1);

    const jsDay = first.getDay();
    const mondayIndex = (jsDay + 6) % 7;

    const start = new Date(year, month, 1 - mondayIndex);

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      cells.push(d);
    }

    return { cells, year, month };
  }, [monthDate]);

  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());


  return (
    <div className="mc">
      <div className="mcHeader">
        <button className="mcNavBtn" onClick={onPrevMonth} aria-label="Previous month">
          ‹
        </button>

        <div className="mcTitle">{monthLabel(monthDate)}</div>

        <button className="mcNavBtn" onClick={onNextMonth} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="mcDowRow">
        {DAY_NAMES.map((d) => (
          <div key={d} className="mcDow">
            {d}
          </div>
        ))}
      </div>

      <div className="mcGrid">
        {grid.cells.map((d) => {
          const inMonth = d.getMonth() === grid.month;
          const key = toDateKey(d);
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              className={[
                "mcCell",
                inMonth ? "inMonth" : "outMonth",
                isSelected ? "selected" : "",
                isToday ? "today" : "",
              ].join(" ")}
              onClick={() => onSelectDate(d)}
              type="button"
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCalendar;
