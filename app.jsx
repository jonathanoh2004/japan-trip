// ===== Root App =====
(() => {
const { useState: useS, useEffect: useE } = React;
const A = window.JT;
const { Login: LoginScreen, Toast: ToastC, Avatar: AvatarA } = window.JTComponents;
const CalendarScreen = window.JTCalendar;
const { ReelsBoard: ReelsScreen, ReelModal: ReelModalC } = window.JTReels;
const EventModalC = window.JTEventModal;
const TripModalC = window.JTTripModal;

function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}
const toMin = (t) => { const [h,m] = t.split(":").map(Number); return h*60 + m; };
const fromMin = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
};

function App() {
  const [state, setState] = useS(() => {
    const loaded = A.loadState();
    const base = A.seed();
    // Merge so old saved states without tripStart/End still work.
    return loaded ? { ...base, ...loaded, tripStart: loaded.tripStart || base.tripStart, tripEnd: loaded.tripEnd || base.tripEnd } : base;
  });
  const [view, setView] = useS("calendar");
  const tripStartDate = A.parseIsoDay(state.tripStart);
  const tripEndDate   = A.parseIsoDay(state.tripEnd);
  const [anchor, setAnchor] = useS(tripStartDate);
  const [reelModal, setReelModal] = useS({ open: false, id: null });
  const [eventModal, setEventModal] = useS({ open: false, id: null });
  const [tripModalOpen, setTripModalOpen] = useS(false);
  const [toast, setToast] = useS(null);

  useE(() => { A.saveState(state); }, [state]);
  const showToast = (m) => setToast(m);

  const signIn = (name) => {
    setState(s => {
      const roster = s.roster.includes(name) ? s.roster : [...s.roster, name];
      return { ...s, user: name, roster };
    });
  };
  const signOut = () => setState(s => ({ ...s, user: null }));

  // --- Reels ---
  const addReel = ({ url, title, note, category }) => {
    setState(s => ({
      ...s,
      reels: [
        ...s.reels,
        { id: uid("r"), url, title, note, category, addedBy: s.user || "Anon", placedDay: null }
      ]
    }));
    showToast("Reel pinned to the wall ✿");
  };

  const updateReel = (id, patch) => {
    setState(s => ({
      ...s,
      reels: s.reels.map(r => r.id === id ? { ...r, ...patch } : r),
      // also sync title/category on any scheduled event from this reel
      events: s.events.map(e => e.fromReel === id
        ? { ...e, title: patch.title ?? e.title, category: patch.category ?? e.category }
        : e),
    }));
    showToast("Reel updated ✎");
  };

  const deleteReel = (id) => {
    setState(s => ({
      ...s,
      reels: s.reels.filter(r => r.id !== id),
      events: s.events.filter(e => e.fromReel !== id),
    }));
    showToast("Reel deleted");
  };

  // --- Events ---
  const dropReelOnDay = (reelId, dayIso, startTime) => {
    setState(s => {
      const reel = s.reels.find(r => r.id === reelId);
      if (!reel) return s;
      const start = startTime || "10:00";
      const end = fromMin(toMin(start) + 60); // default 1 hour
      const newEv = {
        id: uid("e"),
        title: reel.title,
        note: reel.note || "",
        day: dayIso,
        start, end,
        category: reel.category,
        addedBy: s.user || "Anon",
        fromReel: reel.id,
      };
      return {
        ...s,
        events: [...s.events, newEv],
        reels: s.reels.map(r => r.id === reel.id ? { ...r, placedDay: dayIso } : r),
      };
    });
    showToast("Added to itinerary ✓");
  };

  const saveEvent = (updated) => {
    setState(s => ({
      ...s,
      events: s.events.map(e => e.id === updated.id ? updated : e),
    }));
    showToast("Activity updated ✎");
  };

  const moveEvent = (eventId, dayIso, startTime) => {
    setState(s => {
      const ev = s.events.find(e => e.id === eventId);
      if (!ev) return s;
      const durMin = toMin(ev.end) - toMin(ev.start);
      const newStart = startTime || ev.start;
      const newEnd = fromMin(toMin(newStart) + durMin);
      return {
        ...s,
        events: s.events.map(e => e.id === eventId
          ? { ...e, day: dayIso, start: newStart, end: newEnd }
          : e),
        // keep reel.placedDay in sync if this event originated from a reel
        reels: ev.fromReel
          ? s.reels.map(r => r.id === ev.fromReel ? { ...r, placedDay: dayIso } : r)
          : s.reels,
      };
    });
  };

  const reorderReels = (draggedId, targetId, before) => {
    if (draggedId === targetId) return;
    setState(s => {
      const reels = [...s.reels];
      const fromIdx = reels.findIndex(r => r.id === draggedId);
      if (fromIdx < 0) return s;
      const [dragged] = reels.splice(fromIdx, 1);
      let toIdx = reels.findIndex(r => r.id === targetId);
      if (toIdx < 0) {
        reels.splice(fromIdx, 0, dragged);
        return { ...s, reels };
      }
      if (!before) toIdx += 1;
      reels.splice(toIdx, 0, dragged);
      return { ...s, reels };
    });
  };

  const saveTripDates = (newStart, newEnd) => {
    setState(s => ({ ...s, tripStart: newStart, tripEnd: newEnd }));
    setAnchor(A.parseIsoDay(newStart));
    setTripModalOpen(false);
    showToast("Trip dates updated ✎");
  };

  const removeEvent = (eventId) => {
    setState(s => {
      const ev = s.events.find(e => e.id === eventId);
      const reels = ev?.fromReel
        ? s.reels.map(r => r.id === ev.fromReel ? { ...r, placedDay: null } : r)
        : s.reels;
      return { ...s, events: s.events.filter(e => e.id !== eventId), reels };
    });
    showToast("Removed from itinerary");
  };

  // ---- Render ----
  if (!state.user) {
    return <LoginScreen roster={state.roster} onSignIn={signIn} />;
  }

  const weekStart = A.startOfWeek(anchor);
  const weekEnd = A.addDays(weekStart, 6);
  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${A.MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
      : `${A.MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${A.MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const currentReel = reelModal.id ? state.reels.find(r => r.id === reelModal.id) : null;
  const currentEvent = eventModal.id ? state.events.find(e => e.id === eventModal.id) : null;

  const openAddReel = () => setReelModal({ open: true, id: null });
  const openEditReel = (id) => setReelModal({ open: true, id });
  const closeReelModal = () => setReelModal({ open: false, id: null });

  const openEditEvent = (id) => setEventModal({ open: true, id });
  const closeEventModal = () => setEventModal({ open: false, id: null });

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">日</div>
          <span>Japan Trip</span>
        </div>

        {view === "calendar" && (
          <>
            <button className="today-btn" onClick={() => setAnchor(tripStartDate)}>Trip start</button>
            <div className="nav-arrows">
              <button className="nav-arrow" onClick={() => setAnchor(d => A.addDays(d, -7))} aria-label="Previous week">‹</button>
              <button className="nav-arrow" onClick={() => setAnchor(d => A.addDays(d, 7))} aria-label="Next week">›</button>
            </div>
            <div className="range-label">{rangeLabel}</div>
          </>
        )}

        <div className="spacer" />

        <div className="seg" role="tablist">
          <button className={"seg-btn" + (view === "calendar" ? " active" : "")}
                  onClick={() => setView("calendar")}>📅 Calendar</button>
          <button className={"seg-btn" + (view === "reels" ? " active" : "")}
                  onClick={() => setView("reels")}>
            ✿ Reels
            {state.reels.filter(r => !r.placedDay).length > 0 && (
              <span style={{
                marginLeft: 4, background: "var(--c-food)", color: "#5b2e26",
                padding: "1px 6px", borderRadius: 999, fontSize: 10, fontWeight: 800,
              }}>{state.reels.filter(r => !r.placedDay).length}</span>
            )}
          </button>
        </div>

        <button className="upload-btn" onClick={openAddReel}>＋ Add reel</button>

        <div className="user-pill" title="Sign out">
          <AvatarA name={state.user} />
          <span className="name">{state.user}</span>
          <button className="signout" onClick={signOut}>switch</button>
        </div>
      </div>

      {view === "calendar" ? (
        <CalendarScreen
          anchor={anchor}
          setAnchor={setAnchor}
          events={state.events}
          reels={state.reels}
          tripStart={tripStartDate}
          tripEnd={tripEndDate}
          onDropReel={dropReelOnDay}
          onMoveEvent={moveEvent}
          onReorderReels={reorderReels}
          onEditEvent={openEditEvent}
          onEditReel={openEditReel}
          onEditTrip={() => setTripModalOpen(true)}
        />
      ) : (
        <ReelsScreen
          reels={state.reels}
          onDelete={deleteReel}
          onEdit={openEditReel}
          openUpload={openAddReel}
        />
      )}

      <ReelModalC
        open={reelModal.open}
        reel={currentReel}
        onClose={closeReelModal}
        onSubmit={(data) => {
          if (currentReel) updateReel(currentReel.id, data);
          else addReel(data);
          closeReelModal();
        }}
        onDelete={(id) => { deleteReel(id); closeReelModal(); }}
      />

      <EventModalC
        open={eventModal.open}
        event={currentEvent}
        onClose={closeEventModal}
        onSave={(updated) => { saveEvent(updated); closeEventModal(); }}
        onDelete={(id) => { removeEvent(id); closeEventModal(); }}
      />

      <TripModalC
        open={tripModalOpen}
        start={state.tripStart}
        end={state.tripEnd}
        onClose={() => setTripModalOpen(false)}
        onSave={saveTripDates}
      />

      {toast && <ToastC msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
