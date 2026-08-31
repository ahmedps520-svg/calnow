import { useEffect, useState } from 'react';
import { IconMeal } from '../components/Icons';
import { fmtTime, num } from '../lib/format';
import { SLOT_KEY } from '../lib/labels';
import { photoUrl } from '../lib/photos';
import { useStore } from '../lib/store';
import type { MealEntry } from '../lib/types';

export function MealRow({
  meal, score, onClick,
}: {
  meal: MealEntry;
  score?: number;
  onClick?: () => void;
}) {
  const { t, lang } = useStore();
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let alive = true;
    if (meal.photoId) photoUrl(meal.photoId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [meal.photoId]);

  const tone = score === undefined ? '' : score >= 75 ? 'good' : score >= 50 ? 'warn' : 'bad';

  return (
    <button className="item" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {url ? (
        <img className="item-photo" src={url} alt="" loading="lazy" />
      ) : (
        <span className="item-icon"><IconMeal size={18} /></span>
      )}
      <span className="item-main">
        <span className="item-title">{meal.name}</span>
        <span className="item-sub">
          {t(SLOT_KEY[meal.slot])} · {fmtTime(meal.ts, lang)}
          {meal.carbs ? ` · ${num(meal.carbs, lang)}${t('gramsShort')} ${t('carbs')}` : ''}
        </span>
      </span>
      <span className="col" style={{ alignItems: 'flex-end', gap: 3 }}>
        <span className="item-value">{num(meal.calories, lang)}</span>
        {score !== undefined && <span className={`tag tag-${tone} tiny`}>{num(score, lang)}</span>}
      </span>
    </button>
  );
}
