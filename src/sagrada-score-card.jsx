import { useState, useCallback } from "react";

const COLORS = {
  red: "#D93025",
  yellow: "#F4B400",
  green: "#0F9D58",
  blue: "#4285F4",
  purple: "#9C27B0",
};

const COLOR_KEYS = Object.keys(COLORS);
const VALUES = [1, 2, 3, 4, 5, 6];

const PUBLIC_OBJECTIVES = [
  { id: "row_color", name: "Row Color Variety", desc: "Rows with no repeated colors", points: 6 },
  { id: "col_color", name: "Column Color Variety", desc: "Columns with no repeated colors", points: 5 },
  { id: "row_shade", name: "Row Shade Variety", desc: "Rows with no repeated values", points: 5 },
  { id: "col_shade", name: "Column Shade Variety", desc: "Columns with no repeated values", points: 4 },
  { id: "light", name: "Light Shades", desc: "Sets of 1 & 2 values", points: 2 },
  { id: "medium", name: "Medium Shades", desc: "Sets of 3 & 4 values", points: 2 },
  { id: "deep", name: "Deep Shades", desc: "Sets of 5 & 6 values", points: 2 },
  { id: "shade_variety", name: "Shade Variety", desc: "Sets of one of each value (1-6)", points: 5 },
  { id: "color_variety", name: "Color Variety", desc: "Sets of one of each color", points: 4 },
  { id: "diagonals", name: "Color Diagonals", desc: "Count of diagonally adjacent same-color dice", points: 1 },
];

function emptyGrid() {
  return Array.from({ length: 4 }, () => Array.from({ length: 5 }, () => ({ color: null, value: null })));
}

function scorePublic(grid, obj) {
  const rows = 4, cols = 5;
  switch (obj.id) {
    case "row_color": {
      let count = 0;
      for (let r = 0; r < rows; r++) {
        const colors = grid[r].map(c => c.color).filter(Boolean);
        if (colors.length === cols && new Set(colors).size === cols) count++;
      }
      return count * obj.points;
    }
    case "col_color": {
      let count = 0;
      for (let c = 0; c < cols; c++) {
        const colors = [];
        for (let r = 0; r < rows; r++) if (grid[r][c].color) colors.push(grid[r][c].color);
        if (colors.length === rows && new Set(colors).size === rows) count++;
      }
      return count * obj.points;
    }
    case "row_shade": {
      let count = 0;
      for (let r = 0; r < rows; r++) {
        const vals = grid[r].map(c => c.value).filter(Boolean);
        if (vals.length === cols && new Set(vals).size === cols) count++;
      }
      return count * obj.points;
    }
    case "col_shade": {
      let count = 0;
      for (let c = 0; c < cols; c++) {
        const vals = [];
        for (let r = 0; r < rows; r++) if (grid[r][c].value) vals.push(grid[r][c].value);
        if (vals.length === rows && new Set(vals).size === rows) count++;
      }
      return count * obj.points;
    }
    case "light": {
      let ones = 0, twos = 0;
      grid.flat().forEach(c => { if (c.value === 1) ones++; if (c.value === 2) twos++; });
      return Math.min(ones, twos) * obj.points;
    }
    case "medium": {
      let threes = 0, fours = 0;
      grid.flat().forEach(c => { if (c.value === 3) threes++; if (c.value === 4) fours++; });
      return Math.min(threes, fours) * obj.points;
    }
    case "deep": {
      let fives = 0, sixes = 0;
      grid.flat().forEach(c => { if (c.value === 5) fives++; if (c.value === 6) sixes++; });
      return Math.min(fives, sixes) * obj.points;
    }
    case "shade_variety": {
      const counts = [0, 0, 0, 0, 0, 0];
      grid.flat().forEach(c => { if (c.value) counts[c.value - 1]++; });
      return Math.min(...counts) * obj.points;
    }
    case "color_variety": {
      const counts = { red: 0, yellow: 0, green: 0, blue: 0, purple: 0 };
      grid.flat().forEach(c => { if (c.color) counts[c.color]++; });
      return Math.min(...Object.values(counts)) * obj.points;
    }
    case "diagonals": {
      const visited = new Set();
      let count = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!grid[r][c].color) continue;
          const key = `${r},${c}`;
          const diags = [[-1,-1],[-1,1],[1,-1],[1,1]];
          let hasDiag = false;
          for (const [dr, dc] of diags) {
            const nr = r+dr, nc = c+dc;
            if (nr>=0 && nr<rows && nc>=0 && nc<cols && grid[nr][nc].color === grid[r][c].color) {
              hasDiag = true;
              break;
            }
          }
          if (hasDiag && !visited.has(key)) {
            count++;
            visited.add(key);
          }
        }
      }
      return count * obj.points;
    }
    default: return 0;
  }
}

function scorePrivate(grid, privateColor) {
  return grid.flat().reduce((sum, c) => c.color === privateColor && c.value ? sum + c.value : sum, 0);
}

function scoreEmpty(grid) {
  return grid.flat().filter(c => !c.color || !c.value).length;
}

const fonts = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
`;

export default function SagradaScorer() {
  const [phase, setPhase] = useState("setup"); // setup | input | results
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(Array(6).fill("").map((_, i) => `Player ${i + 1}`));
  const [publicObjs, setPublicObjs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(0);
  const [paintMode, setPaintMode] = useState("color"); // color | value
  const [selectedColor, setSelectedColor] = useState("red");
  const [selectedValue, setSelectedValue] = useState(1);

  const startGame = () => {
    if (publicObjs.length !== 3) return;
    const p = Array.from({ length: playerCount }, (_, i) => ({
      name: playerNames[i],
      grid: emptyGrid(),
      privateColor: null,
      favorTokens: 0,
    }));
    setPlayers(p);
    setActivePlayer(0);
    setPhase("input");
  };

  const togglePublicObj = (id) => {
    setPublicObjs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleCellClick = (r, c) => {
    setPlayers(prev => {
      const next = prev.map((p, i) => {
        if (i !== activePlayer) return p;
        const newGrid = p.grid.map(row => row.map(cell => ({ ...cell })));
        if (paintMode === "color") {
          newGrid[r][c].color = newGrid[r][c].color === selectedColor ? null : selectedColor;
        } else {
          newGrid[r][c].value = newGrid[r][c].value === selectedValue ? null : selectedValue;
        }
        return { ...p, grid: newGrid };
      });
      return next;
    });
  };

  const clearGrid = () => {
    setPlayers(prev => prev.map((p, i) =>
      i === activePlayer ? { ...p, grid: emptyGrid() } : p
    ));
  };

  const calcResults = () => {
    const selObjs = PUBLIC_OBJECTIVES.filter(o => publicObjs.includes(o.id));
    return players.map(p => {
      const pubScores = selObjs.map(o => ({ name: o.name, score: scorePublic(p.grid, o) }));
      const privScore = p.privateColor ? scorePrivate(p.grid, p.privateColor) : 0;
      const emptyPenalty = scoreEmpty(p.grid);
      const pubTotal = pubScores.reduce((s, x) => s + x.score, 0);
      const total = pubTotal + privScore + p.favorTokens - emptyPenalty;
      return { name: p.name, pubScores, privScore, favorTokens: p.favorTokens, emptyPenalty, total };
    });
  };

  const ap = players[activePlayer];

  return (
    <div style={{
      fontFamily: "'Lato', sans-serif",
      minHeight: "100vh",
      background: "linear-gradient(145deg, #1a1117 0%, #2a1f2d 40%, #1e2a35 100%)",
      color: "#e8e0d6",
      padding: "16px",
      maxWidth: 520,
      margin: "0 auto",
    }}>
      <style>{fonts}</style>

      <h1 style={{
        fontFamily: "'Cinzel', serif",
        textAlign: "center",
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: 3,
        margin: "8px 0 4px",
        background: "linear-gradient(90deg, #D93025, #F4B400, #0F9D58, #4285F4, #9C27B0)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}>SAGRADA</h1>
      <p style={{
        textAlign: "center",
        fontFamily: "'Cinzel', serif",
        fontSize: 11,
        letterSpacing: 5,
        color: "#8a7e8e",
        margin: "0 0 20px",
        textTransform: "uppercase",
      }}>Score Calculator</p>

      {/* SETUP PHASE */}
      {phase === "setup" && (
        <div>
          <Section title="Players">
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[2,3,4,5,6].map(n => (
                <button key={n} onClick={() => setPlayerCount(n)} style={{
                  ...btnStyle,
                  background: playerCount === n ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                  border: playerCount === n ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                }}>{n}</button>
              ))}
            </div>
            {Array.from({ length: playerCount }, (_, i) => (
              <input key={i} value={playerNames[i]} onChange={e => {
                const n = [...playerNames];
                n[i] = e.target.value;
                setPlayerNames(n);
              }} style={inputStyle} placeholder={`Player ${i+1}`} />
            ))}
          </Section>

          <Section title="Public Objectives (pick 3)">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {PUBLIC_OBJECTIVES.map(o => (
                <button key={o.id} onClick={() => togglePublicObj(o.id)} style={{
                  ...btnStyle,
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: publicObjs.includes(o.id) ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                  border: publicObjs.includes(o.id) ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span>
                    <strong style={{ fontSize: 13 }}>{o.name}</strong>
                    <br/>
                    <span style={{ fontSize: 11, color: "#8a7e8e" }}>{o.desc} — {o.points}pt{o.points > 1 ? "s" : ""} each</span>
                  </span>
                  {publicObjs.includes(o.id) && <span style={{ color: "#F4B400", fontSize: 16 }}>✓</span>}
                </button>
              ))}
            </div>
          </Section>

          <button onClick={startGame} disabled={publicObjs.length !== 3} style={{
            ...primaryBtn,
            opacity: publicObjs.length !== 3 ? 0.4 : 1,
          }}>Start Scoring →</button>
        </div>
      )}

      {/* INPUT PHASE */}
      {phase === "input" && ap && (
        <div>
          {/* Player tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {players.map((p, i) => (
              <button key={i} onClick={() => setActivePlayer(i)} style={{
                ...btnStyle,
                flex: 1,
                minWidth: 60,
                fontSize: 12,
                padding: "6px 4px",
                background: i === activePlayer ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)",
                border: i === activePlayer ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}>{p.name}</button>
            ))}
          </div>

          {/* Paint mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setPaintMode("color")} style={{
              ...btnStyle, flex: 1,
              background: paintMode === "color" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
              border: paintMode === "color" ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}>🎨 Color</button>
            <button onClick={() => setPaintMode("value")} style={{
              ...btnStyle, flex: 1,
              background: paintMode === "value" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
              border: paintMode === "value" ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}>🔢 Value</button>
          </div>

          {/* Color / Value selector */}
          {paintMode === "color" ? (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
              {COLOR_KEYS.map(c => (
                <button key={c} onClick={() => setSelectedColor(c)} style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: COLORS[c],
                  border: selectedColor === c ? "3px solid #fff" : "3px solid transparent",
                  cursor: "pointer",
                  boxShadow: selectedColor === c ? `0 0 12px ${COLORS[c]}80` : "none",
                  transition: "all 0.15s",
                }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
              {VALUES.map(v => (
                <button key={v} onClick={() => setSelectedValue(v)} style={{
                  ...btnStyle,
                  width: 40, height: 40,
                  fontSize: 18, fontWeight: 700,
                  background: selectedValue === v ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.04)",
                  border: selectedValue === v ? "2px solid #fff" : "2px solid rgba(255,255,255,0.1)",
                }}>{v}</button>
              ))}
            </div>
          )}

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 4,
            marginBottom: 16,
            background: "rgba(255,255,255,0.03)",
            padding: 8,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {ap.grid.flatMap((row, r) => row.map((cell, c) => (
              <button key={`${r}-${c}`} onClick={() => handleCellClick(r, c)} style={{
                aspectRatio: "1",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.1)",
                background: cell.color ? COLORS[cell.color] + "cc" : "rgba(255,255,255,0.04)",
                color: cell.color ? "#fff" : "#666",
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "'Cinzel', serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textShadow: cell.color ? "0 1px 3px rgba(0,0,0,0.5)" : "none",
                transition: "all 0.1s",
                minHeight: 48,
              }}>
                {cell.value || ""}
              </button>
            )))}
          </div>

          <button onClick={clearGrid} style={{ ...btnStyle, width: "100%", marginBottom: 12, fontSize: 12, color: "#8a7e8e" }}>
            Clear Grid
          </button>

          {/* Private color & favor tokens */}
          <Section title="Private Objective Color">
            <div style={{ display: "flex", gap: 6 }}>
              {COLOR_KEYS.map(c => (
                <button key={c} onClick={() => {
                  setPlayers(prev => prev.map((p, i) =>
                    i === activePlayer ? { ...p, privateColor: p.privateColor === c ? null : c } : p
                  ));
                }} style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: COLORS[c],
                  border: ap.privateColor === c ? "3px solid #fff" : "3px solid transparent",
                  cursor: "pointer",
                  opacity: ap.privateColor === c ? 1 : 0.5,
                  transition: "all 0.15s",
                }} />
              ))}
            </div>
          </Section>

          <Section title="Favor Tokens">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[0,1,2,3,4,5,6].map(n => (
                <button key={n} onClick={() => {
                  setPlayers(prev => prev.map((p, i) =>
                    i === activePlayer ? { ...p, favorTokens: n } : p
                  ));
                }} style={{
                  ...btnStyle,
                  width: 34, height: 34,
                  background: ap.favorTokens === n ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.04)",
                  border: ap.favorTokens === n ? "2px solid #F4B400" : "2px solid rgba(255,255,255,0.08)",
                  color: ap.favorTokens === n ? "#F4B400" : "#8a7e8e",
                  fontWeight: 700,
                }}>{n}</button>
              ))}
            </div>
          </Section>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => setPhase("setup")} style={{ ...btnStyle, flex: 1 }}>← Setup</button>
            <button onClick={() => setPhase("results")} style={{ ...primaryBtn, flex: 2 }}>Calculate Scores →</button>
          </div>
        </div>
      )}

      {/* RESULTS PHASE */}
      {phase === "results" && (() => {
        const results = calcResults().sort((a, b) => b.total - a.total);
        return (
          <div>
            {results.map((r, i) => (
              <div key={i} style={{
                background: i === 0 ? "rgba(244,180,0,0.08)" : "rgba(255,255,255,0.03)",
                border: i === 0 ? "1px solid rgba(244,180,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: i === 0 ? "#F4B400" : "#e8e0d6",
                  }}>
                    {i === 0 ? "👑 " : ""}{r.name}
                  </span>
                  <span style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 24,
                    fontWeight: 700,
                    color: i === 0 ? "#F4B400" : "#e8e0d6",
                  }}>{r.total}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8a7e8e", lineHeight: 1.8 }}>
                  {r.pubScores.map((ps, j) => (
                    <div key={j} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{ps.name}</span><span>{ps.score}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Private Objective</span><span>{r.privScore}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Favor Tokens</span><span>{r.favorTokens}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#D93025" }}>
                    <span>Empty Spaces</span><span>−{r.emptyPenalty}</span>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setPhase("input")} style={{ ...btnStyle, flex: 1 }}>← Edit</button>
              <button onClick={() => { setPhase("setup"); setPublicObjs([]); setPlayers([]); }} style={{ ...primaryBtn, flex: 2 }}>New Game</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 12,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "#8a7e8e",
        marginBottom: 8,
      }}>{title}</h3>
      {children}
    </div>
  );
}

const btnStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e8e0d6",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "'Lato', sans-serif",
  transition: "all 0.15s",
};

const primaryBtn = {
  ...btnStyle,
  background: "linear-gradient(135deg, rgba(244,180,0,0.2), rgba(217,48,37,0.2))",
  border: "1px solid rgba(244,180,0,0.3)",
  fontFamily: "'Cinzel', serif",
  fontWeight: 700,
  letterSpacing: 1,
  fontSize: 14,
  padding: "12px 20px",
  width: "100%",
};

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#e8e0d6",
  fontSize: 14,
  fontFamily: "'Lato', sans-serif",
  marginBottom: 6,
  outline: "none",
  boxSizing: "border-box",
};
