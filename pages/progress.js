import { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';

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

  const maxVolume = data ? Math.max(1, ...data.history.map((h) => h.volume || 0)) : 1;

  return (
    <div className="page">
      <h1 className="title">Progress</h1>

      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ marginBottom: 16 }}>
        <option value="">Choose an exercise…</option>
        {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
      </select>

      {data && (
        <>
          <div className="card">
            <div className="row-workout-name" style={{ marginBottom: 10 }}>{data.exercise.name}</div>

            {data.exercise.type === 'STRENGTH' ? (
              <>
                <div className="row">
                  <div><span className="field-label">Best weight</span>{data.pbs.pbWeight} kg</div>
                  <div><span className="field-label">Best reps</span>{data.pbs.pbReps}</div>
                  <div><span className="field-label">Best volume</span>{Math.round(data.pbs.pbVolume)} kg</div>
                </div>

                <div className="section-title" style={{ fontSize: 15, marginTop: 18 }}>Volume by week</div>
                <div className="chart-row">
                  {data.history.map((h) => (
                    <div className="chart-bar-wrap" key={h.weekNumber}>
                      <div
                        className={`chart-bar ${h.volume >= data.pbs.pbVolume ? 'pb' : ''}`}
                        style={{ height: `${Math.max(4, (h.volume / maxVolume) * 100)}%` }}
                      />
                      <div className="chart-label">W{h.weekNumber}</div>
                    </div>
                  ))}
                </div>

                <div className="section-title" style={{ fontSize: 15 }}>History</div>
                {data.history.slice().reverse().map((h) => (
                  <div className="row" key={h.weekNumber} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div>Week {h.weekNumber}</div>
                    <div>{h.maxWeight}kg × {h.maxReps} · vol {Math.round(h.volume)}</div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="row">
                  <div><span className="field-label">Longest time</span>{Math.round(data.pbs.pbDuration / 60)} min</div>
                  <div><span className="field-label">Longest distance</span>{data.pbs.pbDistance} km</div>
                  <div><span className="field-label">Top level</span>{data.pbs.pbLevel}</div>
                </div>
                <div className="section-title" style={{ fontSize: 15 }}>History</div>
                {data.history.slice().reverse().map((h) => (
                  <div className="row" key={h.weekNumber} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div>Week {h.weekNumber}</div>
                    <div>{h.actualSets?.timeSec ? Math.round(h.actualSets.timeSec / 60) + ' min' : ''} {h.actualSets?.distanceKm ? '· ' + h.actualSets.distanceKm + ' km' : ''}</div>
                  </div>
                ))}
              </>
            )}

            {data.history.length === 0 && <p className="empty-state">No completed sessions for this exercise yet.</p>}
          </div>
        </>
      )}

      <div className="section-title">Personal Bests</div>
      {allPbs.length === 0 && <p className="empty-state">Complete some workouts to start tracking PBs.</p>}
      {allPbs.map((p) => (
        <div className="card" key={p.exerciseId}>
          <div className="row-workout-name">{p.name}</div>
          {p.type === 'STRENGTH' ? (
            <div className="row" style={{ marginTop: 6 }}>
              <span className="pill">{p.pbs.pbWeight} kg</span>
              <span className="pill">{p.pbs.pbReps} reps</span>
              <span className="pill">{Math.round(p.pbs.pbVolume)} vol</span>
            </div>
          ) : (
            <div className="row" style={{ marginTop: 6 }}>
              <span className="pill">{Math.round(p.pbs.pbDuration / 60)} min</span>
              <span className="pill">{p.pbs.pbDistance} km</span>
              <span className="pill">Lvl {p.pbs.pbLevel}</span>
            </div>
          )}
        </div>
      ))}

      <NavBar />
    </div>
  );
}
