// ===== Reels Board + Reel Modal (add + edit) =====
(() => {
const Jr = window.JT;
const { CAT_BY_ID: CBI, CATEGORIES: CATS, colorFor: cFor } = Jr;
const { CategoryTag: CategoryTagR } = window.JTComponents;

function ReelCard({ reel, onDelete, onEdit }) {
  const c = CBI[reel.category] || CBI.sight;
  const handleDragStart = (e) => {
    e.dataTransfer.setData("reel/id", reel.id);
    e.dataTransfer.setData("text/plain", reel.id);
    e.dataTransfer.effectAllowed = "copyMove";
  };
  const rot = ((reel.id.charCodeAt(reel.id.length - 1) || 0) % 5) - 2;
  return (
    <div
      className={"reel-card" + (reel.placedDay ? " placed" : "")}
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => {
        // ignore clicks on action buttons
        if (e.target.closest(".actions")) return;
        onEdit(reel.id);
      }}
      style={{ transform: `rotate(${rot * 0.4}deg)` }}
    >
      <div className="actions" onClick={e => e.stopPropagation()}>
        <button className="icon-btn" title="Edit"
                onClick={(e) => { e.stopPropagation(); onEdit(reel.id); }}>✎</button>
        <button className="icon-btn" title="Open on Instagram"
                onClick={(e) => { e.stopPropagation(); window.open(reel.url, "_blank"); }}>↗</button>
        <button className="icon-btn" title="Remove"
                onClick={(e) => { e.stopPropagation(); onDelete(reel.id); }}>×</button>
      </div>
      <div className="reel-thumb" style={{ background: c.bg }}>
        <span className="pin" />
        {c.icon}
        <div className="play">▶</div>
      </div>
      <CategoryTagR catId={reel.category} />
      <div className="reel-title">{reel.title}</div>
      {reel.note && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", lineHeight: 1.3 }}>
          “{reel.note}”
        </div>
      )}
      <div className="reel-meta">
        <span className="author">
          <span className="author-dot" style={{ background: cFor(reel.addedBy) }} />
          {reel.addedBy}
        </span>
        <span>{(() => { try { return new URL(reel.url).hostname.replace("www.",""); } catch { return ""; } })()}</span>
      </div>
    </div>
  );
}

// Add OR edit mode. If reel is provided → edit. Else → add.
function ReelModal({ open, reel, onClose, onSubmit, onDelete }) {
  const isEdit = !!reel;
  const [url, setUrl] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");
  const [cat, setCat] = React.useState("food");

  React.useEffect(() => {
    if (!open) return;
    if (reel) {
      setUrl(reel.url || "");
      setTitle(reel.title || "");
      setNote(reel.note || "");
      setCat(reel.category || "food");
    } else {
      setUrl(""); setTitle(""); setNote(""); setCat("food");
    }
  }, [open, reel]);

  if (!open) return null;

  const valid = url.trim() && title.trim();
  const submit = () => {
    if (!valid) return;
    onSubmit({ url: url.trim(), title: title.trim(), note: note.trim(), category: cat });
  };

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{isEdit ? "Edit reel" : "Add a reel"}</h2>
        <p className="modal-sub">
          {isEdit ? "Update the title, category, or note." : "Paste an Instagram (or any) link, label it, tag it."}
        </p>

        <div className="field">
          <label>Instagram link</label>
          <input type="text"
            placeholder="https://instagram.com/reel/…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            autoFocus={!isEdit} />
        </div>

        <div className="field">
          <label>Title / what is it?</label>
          <input type="text"
            placeholder="e.g. Tiny ramen counter in Shinjuku"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus={isEdit} />
        </div>

        <div className="field">
          <label>Category</label>
          <div className="tag-picker">
            {CATS.map(c => (
              <button key={c.id}
                className={"tag-pick" + (cat === c.id ? " active" : "")}
                style={{ background: c.bg, color: c.ink }}
                onClick={() => setCat(c.id)}>
                <span style={{ marginRight: 6 }}>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Note / description</label>
          <textarea
            placeholder="e.g. open midnight only, cash only…"
            value={note}
            onChange={e => setNote(e.target.value)} />
        </div>

        <div className="modal-actions">
          {isEdit && (
            <button className="btn-danger" onClick={() => onDelete(reel.id)}>Delete reel</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!valid}>
            {isEdit ? "Save changes" : "Add to board"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReelsBoard({ reels, onDelete, onEdit, openUpload }) {
  const [filter, setFilter] = React.useState("all");
  const [showPlaced, setShowPlaced] = React.useState(true);

  const filtered = reels.filter(r => {
    if (filter !== "all" && r.category !== filter) return false;
    if (!showPlaced && r.placedDay) return false;
    return true;
  });

  const byCat = CATS.map(c => ({ ...c, n: reels.filter(r => r.category === c.id).length }));
  const unplaced = reels.filter(r => !r.placedDay).length;

  return (
    <div className="reels-body">
      <div className="reels-head">
        <div>
          <h2>The Reel Wall</h2>
          <div className="sub" style={{ marginTop: 4 }}>
            {reels.length} reel{reels.length === 1 ? "" : "s"} on the board · {unplaced} still loose ·
            shared with {new Set(reels.map(r => r.addedBy)).size} planner{new Set(reels.map(r => r.addedBy)).size === 1 ? "" : "s"}
            <span style={{ marginLeft: 8, color: "var(--ink-faint)" }}>· click any reel to edit</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="upload-btn" onClick={openUpload}>＋ Add reel</button>
      </div>

      <div className="filter-row">
        <button className={"filter-chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>
          All <span style={{ opacity: 0.6 }}>{reels.length}</span>
        </button>
        {byCat.map(c => (
          <button key={c.id}
            className={"filter-chip" + (filter === c.id ? " active" : "")}
            onClick={() => setFilter(filter === c.id ? "all" : c.id)}>
            <span className="dot" style={{ background: c.bg }} />
            {c.label} <span style={{ opacity: 0.6 }}>{c.n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)", fontWeight: 700 }}>
          <input type="checkbox" checked={showPlaced} onChange={e => setShowPlaced(e.target.checked)} />
          Show scheduled
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-board">
          <h3>Nothing pinned up yet ✿</h3>
          <p>Tap <b>＋ Add reel</b> at the top to drop in your first link.</p>
        </div>
      ) : (
        <div className="reels-grid">
          {filtered.map(r => (
            <ReelCard key={r.id} reel={r} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

window.JTReels = { ReelsBoard, ReelModal };
})();
