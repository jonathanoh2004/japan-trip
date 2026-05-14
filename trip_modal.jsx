// ===== Trip Date Edit Modal =====
(() => {
const J = window.JT;

function TripDatesModal({ open, start, end, onClose, onSave }) {
  const [s, setS] = React.useState(start || "2026-05-10");
  const [e, setE] = React.useState(end || "2026-05-23");
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setS(start);
    setE(end);
    setErr("");
  }, [open, start, end]);

  if (!open) return null;

  const submit = () => {
    if (!s || !e) { setErr("Pick both dates."); return; }
    if (e < s)    { setErr("End date must be on or after start date."); return; }
    onSave(s, e);
  };

  // simple computed length
  let days = 0;
  if (s && e && e >= s) {
    days = Math.round((J.parseIsoDay(e) - J.parseIsoDay(s)) / 86400000) + 1;
  }

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={evt => evt.stopPropagation()} style={{ maxWidth: 460 }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Trip dates</h2>
        <p className="modal-sub">When are you in Japan? Pick the first and last day.</p>

        <div className="field-row">
          <div className="field" style={{ flex: 1 }}>
            <label>Start date</label>
            <input type="date" className="date-input"
              value={s} onChange={ev => setS(ev.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>End date</label>
            <input type="date" className="date-input"
              value={e} min={s} onChange={ev => setE(ev.target.value)} />
          </div>
        </div>

        {days > 0 && (
          <div style={{
            background: "var(--c-onsen)", color: "#6b4a1c",
            padding: "10px 14px", borderRadius: 12, fontWeight: 700, fontSize: 13,
            marginTop: 4, marginBottom: 4
          }}>
            {days} day{days === 1 ? "" : "s"} in Japan ✿
          </div>
        )}

        {err && (
          <div style={{ color: "#b35454", fontSize: 13, fontWeight: 600, marginTop: 8 }}>{err}</div>
        )}

        <div className="modal-actions">
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit}>Save trip dates</button>
        </div>
      </div>
    </div>
  );
}

window.JTTripModal = TripDatesModal;
})();
