const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function Calendar({ month, onMonthChange, hasEntry, onSelectDate }) {
  const cells = buildMonthGrid(month);
  const today = new Date();
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  function shiftMonth(delta) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    onMonthChange(next);
  }

  return (
    <div className="card">
      <div className="week-switcher" style={{ marginBottom: 10 }}>
        <button className="btn-icon" onClick={() => shiftMonth(-1)}>‹</button>
        <div className="week-label">{monthLabel}</div>
        <button className="btn-icon" onClick={() => shiftMonth(1)}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {DOW.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const has = hasEntry(date);
          const isToday = sameDay(date, today);
          return (
            <button
              key={i}
              onClick={() => has && onSelectDate(date)}
              style={{
                aspectRatio: '1',
                borderRadius: '50%',
                border: isToday ? '2px solid var(--blue)' : 'none',
                background: has ? 'var(--lime)' : 'transparent',
                color: has ? 'var(--lime-ink)' : 'var(--ink)',
                fontWeight: has ? 800 : 500,
                fontSize: 13,
                cursor: has ? 'pointer' : 'default',
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
