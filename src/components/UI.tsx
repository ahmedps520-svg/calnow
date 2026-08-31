import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { IconClose } from './Icons';

/* ------------------------------ Sheet ---------------------------------- */
export function Sheet({
  open, onClose, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 className="sheet-title display">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={19} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>
  );
}

/* ------------------------------ Ring ----------------------------------- */
export function Ring({
  value, max, size = 150, stroke = 13, color, children, danger = false,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
  danger?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1.35, value / max) : 0;
  const shown = Math.min(1, pct);
  const over = pct > 1;
  const strokeColor = color ?? (over || danger ? 'var(--warn)' : 'var(--accent)');
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

/* ------------------------------ Bar ------------------------------------ */
export function Bar({ value, max, tone }: { value: number; max: number; tone?: 'good' | 'warn' | 'bad' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`bar${tone ? ` bar-${tone}` : ''}`}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ------------------------------ Segmented ------------------------------ */
export function Segmented<T extends string>({
  value, options, onChange, size = 'md',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="chips" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          className={`chip${size === 'sm' ? ' chip-sm' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Toggle --------------------------------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  );
}

/* ------------------------------ Field ---------------------------------- */
export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="tiny faint">{hint}</span>}
    </label>
  );
}

/* ------------------------------ Toast ---------------------------------- */
const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 2600);
  }, []);
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {msg && (
        <div className="toast" role="status" aria-live="polite">
          <div>{msg}</div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ------------------------------ Confirm -------------------------------- */
export function Confirm({
  open, title, body, confirmLabel, cancelLabel, danger, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button className="btn btn-ghost grow" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn grow ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {body && <p className="muted">{body}</p>}
    </Sheet>
  );
}

/* ------------------------------ Empty ---------------------------------- */
export function Empty({ icon, title, body }: { icon: ReactNode; title: string; body?: string }) {
  return (
    <div className="empty">
      <div className="empty-mark">{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{title}</div>
      {body && <div className="small">{body}</div>}
    </div>
  );
}
