import { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import LineChart from '../components/LineChart';

export default function ProgressPage() {
  const [exercises, setExercises] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState(null);
  const [allPbs, setAllPbs] = useState([]);

  useEffect(() => {
    fetch('/api/exercises').then((r) => r.json()).then(setExercises);
    fetch('/api/pbs').then((r) => r.json()).then(setAllPbs);
  }, []);

  useEffect(() => {
    if (!selectedId) return setData(null);
    fetch(`/api/progress/${selectedId}`).then((r) => r.json()).then(setData);
  }, [selectedId]);

  return (
    <div className="page">
      <h1 className="title">Progress</h1>

      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ marginBottom: 16 }}>
        <option value="">Choose an exercise…</option>
        {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
      </select>

      {data && (
        <div className="card">
          <div className="row-workout-name" style={{ marginBottom: 10 }}>{data.exercise.name}</div>

          {data.exercise.type === 'STRENGTH' ? (
            <>
              <div className="row">
                <div><span className="field-label">Best weight</span><span className="pb-value">{data.pbs.pbWeight} kg</span></div>
                <div><span className="field-label">Best reps</span><span className="pb-value">{data.pbs.pbReps}</span></div>
                <div><span className="field-label">Best volume</span><span className="pb-value">{Math.round(data.pbs.pbVolume)} kg</span></div>
              </div>

              {data.history.length > 0 && (
                <>
                  <div className="section-title" style={{ fontSize: 15, marginTop: 18 }}>Best weight by week</div>
                  <LineChart
                    points={data.history.map((h) => ({ label: `W${h.weekNumber}`, value: h.maxWeight }))}
                    unit="kg"
                  />

                  <div className="section-title" style={{ fontSize: 15, marginTop: 18 }}>Volume by week</div>
                  <LineChart
                    points={data.history.map((h) => ({ label: `W${h.weekNumber}`, value: Math.round(h.volume) }))}
                  />
                </>
              )}

              <div className="section-title" style={{ fontSize: 15 }}>History</div>
              {data.history.slice().reverse().map((h) => {
                const isBest = h.maxWeight === data.pbs.pbWeight || h.volume === data.pbs.pbVolume;
                return (
                  <div className={`row history-row ${isBest ? 'pb' : ''}`} key={h.weekNumber} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div>Week {h.weekNumber}</div>
                    <div>{h.maxWeight}kg × {h.maxReps} · vol {Math.round(h.volume)}</div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div className="row">
                <div><span className="field-label">Longest time</span><span className="pb-value">{Math.round(data.pbs.pbDuration / 60)} min</span></div>
                <div><span className="field-label">Longest distance</span><span className="pb-value">{data.pbs.pbDistance} km</span></div>
                <div><span className="field-label">Top level</span><span className="pb-value">{data.pbs.pbLevel}</span></div>
              </div>

              {data.history.length > 0 && (
                <>
                  <div className="section-title" style={{ fontSize: 15, marginTop: 18 }}>Distance by week</div>
                  <LineChart
                    points={data.history.map((h) => ({ label: `W${h.weekNumber}`, value: h.actualSets?.distanceKm || 0 }))}
                    unit="km"
                  />
                </>
              )}

              <div className="section-title" style={{ fontSize: 15 }}>History</div>
              {data.history.slice().reverse().map((h) => {
                const c = h.actualSets || {};
                const isBest = c.timeSec === data.pbs.pbDuration || c.distanceKm === data.pbs.pbDistance;
                return (
                  <div className={`row history-row ${isBest ? 'pb' : ''}`} key={h.weekNumber} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div>Week {h.weekNumber}</div>
                    <div>{c.timeSec ? Math.round(c.timeSec / 60) + ' min' : ''} {c.distanceKm ? '· ' + c.distanceKm + ' km' : ''}</div>
                  </div>
                );
              })}
            </>
          )}

          {data.history.length === 0 && <p className="empty-state">No completed sessions for this exercise yet.</p>}
        </div>
      )}

      <div className="section-title">Personal Bests</div>
      {allPbs.length === 0 && <p className="empty-state">Complete some workouts to start tracking PBs.</p>}
      {allPbs.map((p) => (
        <div className="card" key={p.exerciseId}>
          <div className="row-workout-name">{p.name}</div>
          {p.type === 'STRENGTH' ? (
            <div className="row" style={{ marginTop: 6 }}>
              <span className="pill pb">{p.pbs.pbWeight} kg</span>
              <span className="pill pb">{p.pbs.pbReps} reps</span>
              <span className="pill pb">{Math.round(p.pbs.pbVolume)} vol</span>
            </div>
          ) : (
            <div className="row" style={{ marginTop: 6 }}>
              <span className="pill pb">{Math.round(p.pbs.pbDuration / 60)} min</span>
              <span className="pill pb">{p.pbs.pbDistance} km</span>
              <span className="pill pb">Lvl {p.pbs.pbLevel}</span>
            </div>
          )}
        </div>
      ))}

      <NavBar />
    </div>
  );
}
