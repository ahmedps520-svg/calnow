import { useStore } from '../lib/store';

const toLocalInput = (ts: number) => {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

export function TimePicker({ ts, onChange }: { ts: number; onChange: (ts: number) => void }) {
  const { t } = useStore();
  const quick = [
    { label: t('now'), delta: 0 },
    { label: '−30m', delta: -30 },
    { label: '−1h', delta: -60 },
    { label: '−2h', delta: -120 },
  ];
  return (
    <div className="field">
      <span className="label">{t('when')}</span>
      <div className="chips">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            className="chip chip-sm"
            onClick={() => onChange(Date.now() + q.delta * 60000)}
          >
            {q.label}
          </button>
        ))}
      </div>
      <input
        className="input"
        type="datetime-local"
        value={toLocalInput(ts)}
        onChange={(e) => {
          const v = e.target.value ? new Date(e.target.value).getTime() : Date.now();
          if (!Number.isNaN(v)) onChange(v);
        }}
      />
    </div>
  );
}
