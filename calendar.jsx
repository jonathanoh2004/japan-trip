// ===== Calendar Week View =====
(() => {
const J = window.JT;
const {
  startOfWeek, addDays, sameDay, isoDay, fmtTime, parseIsoDay,
  MONTHS, MONTHS_SHORT, DOW,
  CAT_BY_ID, CATEGORIES
} = J;

function MiniCal({ anchor, tripStart, tripEnd, onJump, onEditTrip }) {
  const today = new Date();
  const m = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(m);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const monthLabel = `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  return (
    <div className="minical">
      <div className="minical-head">
        <h3>{monthLabel}</h3>
        <button className="edit-trip-btn" onClick={onEditTrip} title="Edit trip dates">✎ Trip dates</button>
      </div>
      <div className="minical-grid">
        {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} className="minical-dow">{d}</div>)}
        {days.map((d, i) => {
          const muted = d.getMonth() !== anchor.getMonth();
          const isToday = sameDay(d, today);
          const inTrip = d >= tripStart && d <= tripEnd;
          const cn = [
            "minical-day",
            muted ? "muted" : "",
            isToday ? "today" : "",
            inTrip ? "in-trip" : "",
          ].filter(Boolean).join(" ");
          return (
            <div key={i} className={cn} onClick={() => onJump(d)}>{d.getDate()}</div>
          );
        })}
      </div>
    </div>
  );
}

function eventBox(ev) {
  const [sh, sm] = ev.start.split(":").map(Number);
  const [eh, em] = ev.end.split(":").map(Number);
  const startMin = sh*60 + sm;
  const endMin = eh*60 + em;
  const dayStartMin = 7 * 60; // grid starts 7am
  const px = (m) => ((m - dayStartMin) / 60) * 56;
  return { top: px(startMin), height: Math.max(28, px(endMin) - px(startMin)) };
}

function CalEvent({ ev, onEdit }) {
  const c = CAT_BY_ID[ev.category] || CAT_BY_ID.sight;
  const box = eventBox(ev);
  const handleDragStart = (e) => {
    e.dataTransfer.setData("event/id", ev.id);
    e.dataTransfer.setData("text/plain", ev.id);
    e.dataTransfer.effectAllowed = "move";
    // grab offset so the event drops where the cursor is, not where its top was
    const rect = e.currentTarget.getBoundingClientRect();
    e.dataTransfer.setData("event/grabY", String(e.clientY - rect.top));
  };
  return (
    <div className="event"
      draggable
      onDragStart={handleDragStart}
      style={{
        top: box.top, height: box.height,
        background: c.bg, borderLeftColor: c.deep,
      }}
      onClick={(e) => { e.stopPropagation(); onEdit(ev.id); }}
      title="Click to edit — drag to move">
      <div className="ev-time">{fmtTime(ev.start)} – {fmtTime(ev.end)}</div>
      <div className="ev-title">{ev.title}</div>
      <div className="ev-author">added by {ev.addedBy}</div>
    </div>
  );
}

function ReelBubble({ reel, index, onEdit, onReorderHover, onReorderDrop, isDragging, dropIndicator }) {
  const c = CAT_BY_ID[reel.category] || CAT_BY_ID.sight;
  const handleDragStart = (e) => {
    e.dataTransfer.setData("reel/id", reel.id);
    e.dataTransfer.setData("text/plain", reel.id);
    e.dataTransfer.effectAllowed = "copyMove";
  };
  const handleDragOver = (e) => {
    // Only handle reorder if a reel is being dragged (not an event)
    if (!e.dataTransfer.types.includes("reel/id") && !e.dataTransfer.types.includes("text/plain")) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    onReorderHover(index, before);
  };
  const handleDrop = (e) => {
    if (!e.dataTransfer.types.includes("reel/id") && !e.dataTransfer.types.includes("text/plain")) return;
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("reel/id") || e.dataTransfer.getData("text/plain");
    if (!draggedId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    onReorderDrop(draggedId, index, before);
  };
  return (
    <>
      {dropIndicator === "before" && <div className="reel-drop-line" />}
      <div
        className={"reel-bubble" + (isDragging ? " dragging" : "")}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => onEdit && onEdit(reel.id)}
        style={{ background: c.bg, color: c.ink, borderColor: c.deep }}
        title={`${reel.title} — drag to reorder, drag onto day to schedule, click to edit`}
      >
        <span className="reel-bubble-icon">{c.icon}</span>
        <span className="reel-bubble-title">{reel.title}</span>
        <span className="reel-bubble-grip">⋮⋮</span>
      </div>
      {dropIndicator === "after" && <div className="reel-drop-line" />}
    </>
  );
}

function Calendar({ anchor, setAnchor, events, reels, tripStart, tripEnd, onDropReel, onMoveEvent, onReorderReels, onEditEvent, onEditReel, onEditTrip }) {
  const today = new Date();
  const weekStart = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7am — 10pm
  const [dragOver, setDragOver] = React.useState(null);
  const [reelFilter, setReelFilter] = React.useState("all");
  const [reorderHint, setReorderHint] = React.useState(null); // { index, before }

  const unplacedReels = (reels || []).filter(r => !r.placedDay);
  const visibleReels = reelFilter === "all" ? unplacedReels : unplacedReels.filter(r => r.category === reelFilter);

  const handleDragOver = (e, dayIso) => {
    const t = e.dataTransfer.types;
    if (t.includes("reel/id") || t.includes("event/id") || t.includes("text/plain")) {
      e.preventDefault();
      if (dragOver !== dayIso) setDragOver(dayIso);
    }
  };

  // Convert mouse-Y (relative to day-col) into a snapped HH:MM string.
  // Grid starts 7am, each hour = 56px. Snap to nearest 30 min.
  const yToTime = (y) => {
    const hoursFromStart = y / 56;
    let snapped = Math.round(hoursFromStart * 2) / 2;
    let h = 7 + snapped;
    if (h < 7) h = 7;
    if (h > 21.5) h = 21.5;
    const hh = Math.floor(h);
    const mm = (h - hh) === 0.5 ? 30 : 0;
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
  };

  const handleDrop = (e, dayIso) => {
    e.preventDefault();
    setDragOver(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const eventId = e.dataTransfer.getData("event/id");
    if (eventId) {
      // Move existing event — preserve duration, account for grab offset
      const grabY = parseFloat(e.dataTransfer.getData("event/grabY") || "0");
      const y = e.clientY - rect.top - grabY;
      const start = yToTime(Math.max(0, y));
      onMoveEvent(eventId, dayIso, start);
      return;
    }
    const reelId = e.dataTransfer.getData("reel/id") || e.dataTransfer.getData("text/plain");
    if (reelId) {
      const y = e.clientY - rect.top;
      const start = yToTime(y);
      onDropReel(reelId, dayIso, start);
    }
  };

  return (
    <div className="cal-body">
      <aside className="cal-side">
        <MiniCal anchor={anchor} tripStart={tripStart} tripEnd={tripEnd} onJump={d => setAnchor(d)} onEditTrip={onEditTrip} />

        <div className="side-section">
          <h4>Trip overview</h4>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            <b style={{ color: "var(--ink)" }}>{MONTHS_SHORT[tripStart.getMonth()]} {tripStart.getDate()}</b> →{" "}
            <b style={{ color: "var(--ink)" }}>{MONTHS_SHORT[tripEnd.getMonth()]} {tripEnd.getDate()}</b>
            <div style={{ marginTop: 4 }}>
              {Math.round((tripEnd - tripStart) / 86400000) + 1} days · {events.length} planned
            </div>
          </div>
        </div>

        <div className="side-section">
          <div className="side-head-row">
            <h4>Reels to schedule</h4>
            <span className="side-count">{unplacedReels.length}</span>
          </div>
          <div className="reel-filters">
            <button
              className={"reel-filter" + (reelFilter === "all" ? " active" : "")}
              onClick={() => setReelFilter("all")}
            >All</button>
            {CATEGORIES.map(c => {
              const n = unplacedReels.filter(r => r.category === c.id).length;
              if (n === 0) return null;
              return (
                <button
                  key={c.id}
                  className={"reel-filter" + (reelFilter === c.id ? " active" : "")}
                  onClick={() => setReelFilter(reelFilter === c.id ? "all" : c.id)}
                  style={{ background: reelFilter === c.id ? c.bg : undefined }}
                  title={c.label}
                >
                  <span>{c.icon}</span>
                  <span>{n}</span>
                </button>
              );
            })}
          </div>
          <div
            className="reel-bubble-list"
            onDragLeave={(e) => {
              // Clear hint only when leaving the list container, not crossing children
              if (!e.currentTarget.contains(e.relatedTarget)) setReorderHint(null);
            }}
          >
            {visibleReels.length === 0 ? (
              <div className="reel-empty">
                {unplacedReels.length === 0
                  ? "All reels scheduled ✓"
                  : "None in this category"}
              </div>
            ) : (
              visibleReels.map((r, i) => (
                <ReelBubble
                  key={r.id}
                  reel={r}
                  index={i}
                  onEdit={onEditReel}
                  onReorderHover={(idx, before) => {
                    setReorderHint(prev => (prev && prev.index === idx && prev.before === before) ? prev : { index: idx, before });
                  }}
                  onReorderDrop={(draggedId, idx, before) => {
                    setReorderHint(null);
                    if (draggedId === r.id) return; // dropped on self
                    // Find target reel id (in full reels array) and call reorder
                    onReorderReels(draggedId, visibleReels[idx].id, before);
                  }}
                  dropIndicator={
                    reorderHint && reorderHint.index === i
                      ? (reorderHint.before ? "before" : "after")
                      : null
                  }
                />
              ))
            )}
          </div>
          <p className="side-hint">drag a bubble onto a day →</p>
        </div>

        <div className="side-section">
          <h4>Categories scheduled</h4>
          <div className="cat-list">
            {CATEGORIES.map(c => {
              const n = events.filter(e => e.category === c.id).length;
              return (
                <div key={c.id} className="cat-item">
                  <span className="cat-dot" style={{ background: c.bg }} />
                  <span>{c.label}</span>
                  <span className="cat-count">{n || ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="cal-main">
        <div className="week-head" style={{ "--day-count": 7 }}>
          <div className="gmt">JST</div>
          {days.map((d, i) => {
            const isToday = sameDay(d, today);
            return (
              <div key={i} className={"day-head" + (isToday ? " today" : "")}>
                <div className="dow">{DOW[d.getDay()]}</div>
                <div className="dnum">{d.getDate()}</div>
                <div className="date-label">{MONTHS_SHORT[d.getMonth()]}</div>
              </div>
            );
          })}
        </div>

        <div className="week-grid" style={{ "--day-count": 7, "--hours": 16 }}>
          <div className="time-col">
            {hours.map(h => (
              <div key={h} className="time-label">{((h + 11) % 12) + 1} {h >= 12 ? "PM" : "AM"}</div>
            ))}
          </div>
          {days.map((d, i) => {
            const iso = isoDay(d);
            const dayEvents = events.filter(e => e.day === iso);
            const isOver = dragOver === iso;
            return (
              <div
                key={i}
                className={"day-col" + (isOver ? " drag-over" : "")}
                onDragOver={e => handleDragOver(e, iso)}
                onDragLeave={() => setDragOver(prev => prev === iso ? null : prev)}
                onDrop={e => handleDrop(e, iso)}
              >
                {dayEvents.map(ev => <CalEvent key={ev.id} ev={ev} onEdit={onEditEvent} />)}
                {isOver && <div className="drop-hint">drop to add ✿</div>}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

window.JTCalendar = Calendar;
})();
