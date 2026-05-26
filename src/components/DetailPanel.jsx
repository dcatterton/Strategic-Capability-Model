import { useEffect } from 'react';
import { ForgeModalDrawer, ForgeIconButton, ForgeIcon, ForgeToolbar } from '@tylertech/forge-react';
import { OUTCOMES, OUTCOME_COLORS, OUTCOME_ICONS, MEASURES, STEPS } from '../data';

const OUTCOME_LIGHT_BG = {
  Efficiency: 'var(--forge-theme-primary-container-low)',
  Accuracy:   'var(--forge-theme-success-container-low)',
  Access:     'var(--forge-theme-warning-container-low)',
  Security:   'var(--forge-theme-error-container-low)',
};

const DETAIL_TABS = [
  { id: 'outcomes', label: 'Core Outcomes', icon: 'flag' },
  { id: 'kpi', label: 'KPI Measures', icon: 'analytics' },
  { id: 'steps', label: 'Implementation Steps', icon: 'check_circle' },
];

export default function DetailPanel({ responsibility: r, onClose }) {
  useEffect(() => {
    if (!r) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, r]);

  const measures = r ? MEASURES[r.id] || [] : [];
  const steps    = r ? STEPS[r.id] : null;

  return (
    <ForgeModalDrawer
      open={!!r}
      direction="right"
      on-forge-modal-drawer-close={onClose}
      on-forge-drawer-after-close={onClose}
    >
      {r && (
        <>
          <ForgeToolbar slot="header" className="detail-header">
        <div className="detail-header__inner">
          <ForgeIcon name={r.icon} className="opacity-90 flex-shrink-0" style={{ fontSize: 24 }} external />
          <div className="min-w-0">
            <h2 className="forge-typography--heading3 m-0 mb-0.75 leading-tight truncate">{r.name}</h2>
            <p className="forge-typography--body1 m-0 opacity-75">
              {measures.length} KPI measures · {steps?.actions?.length || 0} implementation steps
            </p>
          </div>
        </div>
        <ForgeIconButton aria-label="Close panel" onClick={onClose} slot="end" className="flex-shrink-0 ml-3 text-forge-text-high">
          <ForgeIcon name="close" external />
        </ForgeIconButton>
      </ForgeToolbar>

      <div className="detail-body">
      <div className="detail-section__title">
            <ForgeIcon name="flag" style={{ fontSize: 18 }} external />
            <span className="forge-typography--overline">Core Outcomes</span>
          </div>
        <section className="detail-section">          
          <div className="detail-outcomes">
            {OUTCOMES.map(o => (
              <div
                key={o}
                className="detail-outcome-card"
                style={{ background: OUTCOME_LIGHT_BG[o], borderColor: OUTCOME_COLORS[o] }}
              >
                <div className="detail-outcome-card__head">
                  <ForgeIcon
                    name={OUTCOME_ICONS[o]}
                    style={{ color: OUTCOME_COLORS[o], fontSize: 14 }}
                    external
                  />
                  <span className="forge-typography--label2 font-semibold" style={{ color: OUTCOME_COLORS[o] }}>{o}</span>
                </div>
                <p className="m-0 forge-typography--body1 text-forge-text-high leading-relaxed">{r.goals[o]}</p>
              </div>
            ))}
          </div>
        </section>
        <div className="detail-section__title">
            <ForgeIcon name="analytics" style={{ fontSize: 18 }} external />
            <span className="forge-typography--overline ">Key Measures</span>
          </div>
        <section className="detail-section">
          
          {measures.length === 0 ? (
            <p className="forge-typography--body1 text-forge-text-low italic m-0">No KPI measures defined.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {OUTCOMES.map(o => {
                const items = measures.filter(m => m.outcome === o);
                if (!items.length) return null;
                return (
                  <div key={o}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ForgeIcon
                        name={OUTCOME_ICONS[o]}
                        style={{ color: OUTCOME_COLORS[o], fontSize: 13 }}
                        external
                      />
                      <span className="forge-typography--label2 font-semibold" style={{ color: OUTCOME_COLORS[o] }}>{o}</span>
                      <span className="forge-typography--label1 text-forge-text-low">({items.length})</span>
                    </div>
                    <ul className="detail-kpi-items">
                      {items.map((m, i) => (
                        <li key={i} className="detail-kpi-item forge-typography--body1 text-forge-text-high">
                          <span className="text-forge-outline-medium flex-shrink-0" style={{ fontSize: 16 }}>•</span>
                          <span className="flex-1">{m.name}</span>
                          <span className="forge-typography--label1 text-forge-text-medium italic flex-shrink-0">{m.source}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="detail-section__title">
            <ForgeIcon name="check_circle" style={{ fontSize: 18 }} external />
            <span className="forge-typography--overline">Implementation Steps</span>
          </div>
        <section className="detail-section">
          
          {steps ? (
            <>
              <p className="forge-typography--body1 text-forge-text-medium italic m-0 mb-3 leading-relaxed">{steps.full}</p>
              <ul className="detail-steps">
                {steps.actions.map((a, i) => (
                  <li key={i} className="detail-step">
                    <span className="detail-step-num">{i + 1}</span>
                    <span className="forge-typography--body1 text-forge-text-high leading-relaxed">{a}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="forge-typography--body2 text-forge-text-low italic m-0">No implementation steps defined.</p>
          )}
        </section>
      </div>
        </>
      )}
    </ForgeModalDrawer>
  );
}
