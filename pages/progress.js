import { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import LineChart from '../components/LineChart';

export default function ProgressPage() {
  const [exercises, setExercises] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetch('/api/exercises').then((r) => r.json()).then(setExercises);
  }, []);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!e.target.closest('.exercise-card-progress')) {
        setExpandedId(null);
        setData(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function toggleExpand(ex) {
    if (expandedId === ex.id) {
      setExpandedId(null);
      setData(null);
      return;
    }
    setExpandedId(ex.id);
    setData(null);
    setLoadingData(true);
    fetch(`/api/progress/${ex.id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoadingData(false);
      });
  }

  return (
    <div className="page">
      <h1 className="title">Progress</h1>

      {exercises.length === 0 && <p className="empty-state">Add exercises to your workouts to start tracking progress.</p>}

      {exercises.map((ex) => (
        <div
          className="card exercise-card-progress"
          key={ex.id}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(ex);
          }}
        >
          <div className="row tappable">
            <div className="row-workout-name">{ex.name}</div>
            <span className="pill">{ex.type === 'STRENGTH' ? 'Strength' : 'Cardio'}</span>
          </div>

          {expandedId === ex.id && (
            <div style={{ marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
              {loadingData && <p className="empty-state">Loading…</p>}

              {data && data.history.length === 0 && (
                <p className="empty-state">No completed sessions for this exercise yet.</p>
              )}

              {data && data.history.length > 0 && data.exercise.type === 'STRENGTH' && (
                <>
                  <div className="row">
                    <div><span className="field-label">Best weight</span><span className="pb-value">{data.pbs.pbWeight} kg</span></div>
                    <div><span className="field-label">Best reps</span><span className="pb-value">{data.pbs.pbReps}</span></div>
                    <div><span className="field-label">Best volume</span><span className="pb-value">{Math.round(data.pbs.pbVolume)} kg</span></div>
                  </div>

                  <div className="section-title" style={{ fontSize: 15, marginTop: 18 }}>Best weight by week</div>
                  <LineChart points={data.history.map((h) => ({ label: `W${h.weekNumber}`, value: h.maxWeight }))} unit="kg" />

                  <div className="section-title" style={{ fontSize: 15, marginTop: 18 }}>Volume by week</div>
                  <LineChart points={data.history.map((h) => ({ label: `W${h.weekNumber}`, value: Math.round(h.volume) }))} />

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
              )}

              {data && data.history.length > 0 && data.exercise.type === 'CARDIO' && (
                <>
                  <div className="row">
                    <div><span className="field-label">Longest time</span><span className="pb-value">{Math.round(data.pbs.pbDuration / 60)} min</span></div>
                    <div><span className="field-label">Longest distance</span><span className="pb-value">{data.pbs.pbDistance} km</span></div>
                    <div><span className="field-label">Top level</span><span className="pb-value">{data.pbs.pbLevel}</span></div>
                  </div>

                  <div className="section-title" style={{ fontSize: 15, marginTop: 18 }}>Distance by week</div>
                  <LineChart points={data.history.map((h) => ({ label: `W${h.weekNumber}`, value: h.actualSets?.distanceKm || 0 }))} unit="km" />

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
            </div>
          )}
        </div>
      ))}

      <NavBar />
    </div>
  );
}
