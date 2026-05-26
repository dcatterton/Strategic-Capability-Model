import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import {
  ForgeCard,
  ForgeButton,
  ForgeIcon,
  ForgeBadge,
  ForgeCheckbox,
  ForgeTextField,
  ForgeButtonToggleGroup,
  ForgeButtonToggle,
  ForgeStepper,
  ForgeStep,
  ForgeToolbar,
  ForgeExpansionPanel,
  ForgeSelect,
  ForgeOption,
  ForgeLinearProgress,
  ForgeInlineMessage,
  ForgeDialog,
  ForgeIconButton,
} from '@tylertech/forge-react';
import OverallScoreGauge from './OverallScoreGauge';
import GanttChart from './GanttChart';
import {
  OUTCOMES, OUTCOME_COLORS, OUTCOME_ICONS, RESPONSIBILITIES, MEASURES, STEPS, MATURITY_LEVELS,
} from '../data';
import {
  readAssessmentSession,
  writeAssessmentSession,
  clearAssessmentSession,
} from '../sessionPersistence';

/**
 * Matches Forge step-core icon states: when true, the step manages its own forge-icon
 * (check, mode_edit, warning, block). When false, we show the responsibility glyph from the registry.
 */
function assessStepUsesBuiltInGlyph(stepHost) {
  const error = stepHost.hasAttribute('error');
  const completed = stepHost.hasAttribute('completed');
  const editable = stepHost.hasAttribute('editable');
  const selected = stepHost.hasAttribute('selected');
  const disabled = stepHost.hasAttribute('disabled');
  if (error) return true;
  if (completed && editable) return true;
  if (completed && !editable) return true;
  if (editable && selected && !disabled) return true;
  if (disabled) return true;
  return false;
}

/** Forge badge theme per outcome (aligns with design system / Alcrem colors) */
const OUTCOME_BADGE_THEMES = {
  Efficiency: 'primary',
  Accuracy:    'success',
  Access:     'warning',
  Security:    'error',
};

function scoreBg(s) {
  if (!s) return 'var(--forge-theme-outline-medium)';
  if (s >= 4) return 'var(--forge-theme-success-container-low)';
  if (s >= 3) return 'var(--forge-theme-primary-container-low)';
  if (s >= 2) return 'var(--forge-theme-warning-container-low)';
  return 'var(--forge-theme-error-container-low )';
}

function scoreBgHex(s) {
  if (!s) return '#9e9e9e';
  if (s >= 4) return '#2e7d32';
  if (s >= 3) return '#3f51b5';
  if (s >= 2) return '#d14900';
  return '#b00020';
}

function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const clean = String(hex).trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
  if (full.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}



/* ─── Intro (landing) ───────────────────────────────────────────── */
const LANDING_STEPS = [
  { n: 1, title: 'Rate each responsibility', desc: 'Score 1-5 across all four strategic outcomes per responsibility area.' },
  { n: 2, title: 'Review your results', desc: 'See data, charts, scorecards, and capability gaps at a glance.' },
  { n: 3, title: 'Build your plan', desc: 'Add recommended next steps to a Gantt chart organised by quarter.' },
];

const CORE_OUTCOMES = [
  { title: 'Efficiency', desc: 'How quickly and smoothly work can be done with minimal effort.', icon: 'bolt' },
  { title: 'Accuracy', desc: 'How correct, complete, and reliable the work is.', icon: 'target' },
  { title: 'Access', desc: 'How easily parties can obtain, understand, and use the work results.', icon: 'lock_open' },
  { title: 'Security', desc: 'How well the work protects sensitive information and resists misuse.', icon: 'security' },
];

function IntroScreen({ onStart, clientName, setClientName }) {
  const inputId = 'client-name-input';
  return (
    <div className="assess-intro">
      <ForgeCard raised className="assess-landing-card">
        <img
          src="/checklist-spot.svg"
          alt=""
          className="assess-landing-icon"
        />
        <h1 className="forge-typography--heading5 assess-landing-title text-forge-text-high">
          Capability assessment
        </h1>
        <p className="forge-typography--body2 assess-landing-desc leading-relaxed">
          Rate your court's current capabilities across 9 operational responsibilities.
          Your results will highlight gaps and generate a personalized improvement roadmap.
        </p>

        <ForgeTextField required className="client-name-input">
          <label htmlFor={inputId}>
            Client name
          </label>
          <input
            id={inputId}
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </ForgeTextField>

        <div className="how-it-works-sep">
          <span className="forge-typography--overline">HOW IT WORKS</span>
        </div>

        <div className="assess-steps-horizontal">
          {LANDING_STEPS.map((s) => (
            <div key={s.n} className="assess-step-column">
              <ForgeBadge className="assess-step-node" theme="primary">{s.n}</ForgeBadge>
              <div className="assess-step-content">
                <strong className="forge-typography--heading1">{s.title}</strong>
                <p className="forge-typography--body1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="assess-landing-cta">
          <ForgeButton
            variant="raised"
            onClick={onStart}
            disabled={!clientName?.trim()}
          >
            Begin assessment
            <ForgeIcon name="arrow_forward" slot="end" external />
          </ForgeButton>
        </div>
      </ForgeCard>

      <section className="core-outcomes-section" aria-labelledby="core-outcomes-heading">
        <div className="core-outcomes-sep">
          <span id="core-outcomes-heading" className="forge-typography--overline">CORE OUTCOMES</span>
        </div>
        <div className="core-outcomes-grid">
          {CORE_OUTCOMES.map((o) => (
            <ForgeCard raised key={o.title}>
              <div className="core-outcome-card">
                <div className="core-outcome-card__text">
                  <h3 className="forge-typography--heading2 core-outcome-card__title text-forge-text-high">{o.title}</h3>
                  <p className="forge-typography--body1 core-outcome-card__desc">{o.desc}</p>
                </div>
                <ForgeIcon name={o.icon} className="core-outcome-card__icon" style={{ fontSize: '2rem' }} external />
              </div>
            </ForgeCard>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Assess ────────────────────────────────────────────────────── */
function AssessScreen({
  currentIdx,
  scores,
  onScore,
  onNext,
  onSkip,
  onBack,
  onSelectStep,
  onFinishNow,
  canFinalize,
  clientName,
  onBackToDashboard,
  openPanelIndex,
  onOpenPanelChange,
}) {
  const r     = RESPONSIBILITIES[currentIdx];
  const total = RESPONSIBILITIES.length;

  const completedResponsibilityCount = useMemo(
    () => RESPONSIBILITIES.filter((resp) => OUTCOMES.every((o) => scores[`${resp.id}-${o}`])).length,
    [scores],
  );
  const notFullyRatedCount = total - completedResponsibilityCount;
  const progressValue = total > 0 ? completedResponsibilityCount / total : 0;

  function handleStepSelect(e) {
    const detail = e?.detail;
    const nextIndex =
      typeof detail === 'number'
        ? detail
        : typeof detail?.index === 'number'
          ? detail.index
          : typeof detail?.selectedIndex === 'number'
            ? detail.selectedIndex
            : -1;
    if (nextIndex < 0 || nextIndex >= total || !onSelectStep) return;
    // Avoid reacting to spurious stepper events when selection did not change (e.g. after re-render).
    if (nextIndex === currentIdx) return;
    onSelectStep(nextIndex);
  }

  const assessStepperRef = useRef(null);

  useLayoutEffect(() => {
    const stepper = assessStepperRef.current;
    if (!stepper) return;
    stepper.querySelectorAll('forge-step').forEach((stepHost, i) => {
      const resp = RESPONSIBILITIES[i];
      if (!resp) return;
      const sr = stepHost.shadowRoot;
      if (!sr) return;
      const iconEl = sr.querySelector('forge-icon.icon');
      const indexEl = sr.querySelector('.index');
      if (!iconEl || !indexEl) return;

      if (assessStepUsesBuiltInGlyph(stepHost)) return;

      indexEl.style.display = 'none';
      iconEl.style.display = 'inherit';
      iconEl.name = resp.icon;
      iconEl.external = true;
    });
  }, [scores, currentIdx]);

  const clientLabel = (clientName || '').trim() || 'Client';

  return (
    <div className="assess-flow">
      <ForgeToolbar className="assess-page-toolbar">
        <div slot="start" className="assess-page-toolbar__start">
          <ForgeIconButton aria-label="Leave assessment" onClick={onBackToDashboard}>
            <ForgeIcon name="arrow_back" external />
          </ForgeIconButton>
          <div className="assess-page-toolbar__headings">
            <p className="forge-typography--overline text-forge-text-medium m-0 assess-page-toolbar__client">
              {clientLabel}
            </p>
            <h1 className="forge-typography--heading4 text-forge-text-high m-0">Capability assessment</h1>
          </div>
        </div>
      </ForgeToolbar>

      <div className="assess-flow__container">
        <div className="assess-flow__main">
          <ForgeCard className="assess-flow-sidebar-card">
            <div className="assess-sidebar-progress">
              <div className="assess-sidebar-progress__row">
                <span className="forge-typography--label2 text-forge-text-high">Progress</span>
                <span className="forge-typography--label2 text-forge-text-medium">
                  {completedResponsibilityCount} / {total} complete
                </span>
              </div>
              <ForgeLinearProgress determinate progress={progressValue} />
            </div>

            <div className="assess-stepper-sidebar" ref={assessStepperRef}>
              <ForgeStepper
                vertical
                linear={false}
                selectedIndex={currentIdx}
                on-forge-step-select={handleStepSelect}
              >
                {RESPONSIBILITIES.map((resp) => {
                  const completed = OUTCOMES.every((o) => scores[`${resp.id}-${o}`]);
                  return (
                    <ForgeStep key={resp.id} completed={completed} editable={!completed}>
                      {resp.name}
                    </ForgeStep>
                  );
                })}
              </ForgeStepper>
            </div>

            <div className="assess-sidebar-cta">
              <ForgeButton variant="filled" className="assess-view-results-btn" onClick={onFinishNow} disabled={!canFinalize}>
                <ForgeIcon name="done_all" slot="start" external />
                Finish and view results
              </ForgeButton>
              <p className="forge-typography--label2 text-forge-text-low m-0 text-center">
                {notFullyRatedCount === 0
                  ? 'All areas rated'
                  : notFullyRatedCount === 1
                    ? '1 area not yet rated'
                    : `${notFullyRatedCount} areas not yet rated`}
              </p>
            </div>
          </ForgeCard>

          <div className="assess-flow__column">
          <div className="assess-flow__scroll">
            <ForgeCard className="assess-resp-card">
            <div className="assess-body-slot__content">
                <div className="assess-resp-header">
                <ForgeIcon name={r.icon} className="assess-resp-header__icon text-forge-primary" external />
                <div className="assess-resp-header__text">
                  <h2 className="forge-typography--heading4 text-forge-text-high m-0">{r.name}</h2>
                  <p className="forge-typography--body2 text-forge-text-medium m-0 mt-1 leading-relaxed">
                    {r.description}
                  </p>
                </div>
                </div>

              

            

              <div className="assess-outcomes">
                {OUTCOMES.flatMap((o, idx) => {
                  const current = scores[`${r.id}-${o}`];
                  const kpis    = (MEASURES[r.id] || []).filter(m => m.outcome === o);
                  const triggerId = `assess-panel-trigger-${r.id}-${o}`;
                  return [
                    <button
                      key={`trigger-${r.id}-${o}`}
                      id={triggerId}
                      type="button"
                      className="assess-panel-trigger"
                      onClick={() => onOpenPanelChange(idx)}
                    >
                      <ForgeIcon name={OUTCOME_ICONS[o]} className="assess-panel-trigger-icon" external />
                      <span className="assess-panel-trigger-title">{o}</span>
                      <ForgeBadge theme={current ? 'success' : 'error'} className="assess-panel-status-badge">
                        {current ? 'Completed' : 'Incomplete'}
                      </ForgeBadge>
                      <ForgeIcon name="expand_more" className="assess-panel-chevron" external />
                    </button>,
                    <ForgeExpansionPanel key={`panel-${r.id}-${o}`} data-outcome={o} trigger={triggerId} open={openPanelIndex === idx}>
                      <div className="assess-panel-content">
                        <p className="assess-panel-section-label">GOAL / OUTCOME</p>
                        <p className="assess-panel-goal forge-typography--body2 text-forge-text-high m-0 leading-relaxed">{r.goals[o]}</p>
                        <p className="assess-panel-section-label">MEASURES TO CONSIDER</p>
                        {kpis.length > 0 ? (
                          <ul className="assess-panel-measures m-0 p-0 list-none flex flex-col gap-1">
                            {kpis.slice(0, 3).map((m, i) => (
                              <li key={i} className="flex items-baseline gap-2 forge-typography--body1 text-forge-text-high">
                                <span className="text-forge-outline-medium flex-shrink-0">▪</span>
                                <span>{m.name}</span>
                                <span className="text-forge-text-low italic">— {m.source}</span>
                              </li>
                            ))}
                            {kpis.length > 3 && <li className="forge-typography--label1 text-forge-text-low italic pl-4">+{kpis.length - 3} more</li>}
                          </ul>
                        ) : (
                          <p className="forge-typography--body1 italic text-forge-text-low mb-5 mt-0">n/a</p>
                        )}
                        <p className="assess-panel-section-label">CAPABILITY RATING</p>
                        <div className="rating-row" data-forge-ignore>
                          {[1, 2, 3, 4, 5].map(n => {
                            const isSel = current === n;
                            return (
                              <ForgeButton
                                key={n}
                                variant={isSel ? 'filled' : 'outlined'}
                                onClick={() => onScore(r.id, o, n)}
                                className="flex-1 py-2.5"
                                title={MATURITY_LEVELS[n - 1]?.label}
                              >
                                {n}
                              </ForgeButton>
                            );
                          })}
                        </div>
                        {current && (
                          <div className="rating-hint forge-typography--label1">
                            <span className="font-semibold" style={{ color: OUTCOME_COLORS[o] }}>{MATURITY_LEVELS[current - 1]?.label}</span>
                            <span className="text-forge-text-low mx-1">—</span>
                            <span className="text-forge-text-medium">{MATURITY_LEVELS[current - 1]?.desc}</span>
                          </div>
                        )}
                      </div>
                    </ForgeExpansionPanel>,
                  ];
                })}
              </div>

              <div className="assess-nav-row">
                <div className="assess-nav-row__start">
                  {currentIdx > 0 ? (
                    <ForgeButton variant="text" onClick={onBack}>
                      <ForgeIcon name="arrow_back" slot="start" external />
                      Go back
                    </ForgeButton>
                  ) : (
                    <span />
                  )}
                </div>
                <div className="assess-nav-row__end">
                  <ForgeButton
                    variant="outlined"
                    onClick={onSkip}
                    className="assess-nav-skip-btn"
                    disabled={currentIdx === total - 1}
                  >
                    Skip
                    <ForgeIcon name="skip_next" slot="end" external />
                  </ForgeButton>
                  <ForgeButton variant="filled" onClick={onNext}>
                    Save and continue
                    <ForgeIcon name="arrow_forward" slot="end" external />
                  </ForgeButton>
                </div>
              </div>
            </div>
            </ForgeCard>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Results ───────────────────────────────────────────────────── */
function ResultsScreen({
  scores,
  onBack,
  onBackToDashboard,
  onAddToGantt,
  plannerItems,
  onUpdatePlannerItem,
  onDeletePlannerItem,
  onOpenPlanningTab,
  activeAssessmentContext,
  historicalCompletedLabel,
  completedAtLabel,
  completedClientName,
}) {
  const [addedIds, setAddedIds] = useState(new Set());
  const [addedStepIds, setAddedStepIds] = useState(new Set());
  const [selectedStepIds, setSelectedStepIds] = useState(new Set());
  const [gapFilterResp, setGapFilterResp] = useState('All');
  const [gapFilterOutcome, setGapFilterOutcome] = useState('All');
  const [gapSortOrder, setGapSortOrder] = useState('high-low');
  const [resultsTabIndex, setResultsTabIndex] = useState(0);
  const fallbackAssessmentId = useMemo(() => {
    const client = (completedClientName || 'unknown-client').trim().toLowerCase().replace(/\s+/g, '-');
    const date = (historicalCompletedLabel || completedAtLabel || 'unknown-date').trim().toLowerCase().replace(/\s+/g, '-');
    return `session-${client}-${date}`;
  }, [completedClientName, historicalCompletedLabel, completedAtLabel]);
  const effectiveAssessmentId = activeAssessmentContext?.assessmentId || fallbackAssessmentId;

  const respScores = useMemo(() =>
    RESPONSIBILITIES.map(r => {
      const byOutcome = Object.fromEntries(OUTCOMES.map(o => [o, scores[`${r.id}-${o}`] || 0]));
      const vals = OUTCOMES.map(o => byOutcome[o]).filter(Boolean);
      const avg  = vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0;
      return { ...r, avg, byOutcome, ratedCount: vals.length };
    }), [scores]);

  const ratedRespScores = useMemo(
    () => respScores.filter(r => r.ratedCount > 0),
    [respScores]
  );

  const gaps = useMemo(() =>
    ratedRespScores.flatMap(r =>
      OUTCOMES.filter(o => r.byOutcome[o] > 0 && r.byOutcome[o] < 3).map(o => ({
        id: `${r.id}-${o}`, resp: r, outcome: o, score: r.byOutcome[o], goal: r.goals[o],
      }))
    ).sort((a,b) => a.score - b.score), [ratedRespScores]);

  const recs = useMemo(
    () => [...ratedRespScores].sort((a,b) => a.avg - b.avg).slice(0,9),
    [ratedRespScores]
  );
  const gapResponsibilityOptions = useMemo(
    () => Array.from(new Map(gaps.map((g) => [g.resp.id, g.resp.name])).entries()).map(([id, name]) => ({ id, name })),
    [gaps]
  );
  const gapOutcomeOptions = useMemo(
    () => Array.from(new Set(gaps.map((g) => g.outcome))),
    [gaps]
  );
  const filteredGaps = useMemo(
    () => gaps
      .filter((g) => {
        if (gapFilterResp !== 'All' && g.resp.id !== gapFilterResp) return false;
        if (gapFilterOutcome !== 'All' && g.outcome !== gapFilterOutcome) return false;
        return true;
      })
      .sort((a, b) => (gapSortOrder === 'low-high' ? a.score - b.score : b.score - a.score)),
    [gaps, gapFilterResp, gapFilterOutcome, gapSortOrder]
  );
  const enhancementStepCount = useMemo(
    () => recs.reduce((count, r) => count + (STEPS[r.id]?.actions?.length || 0), 0),
    [recs]
  );

  const overall = useMemo(() => {
    if (!ratedRespScores.length) return 0;
    return parseFloat((ratedRespScores.reduce((s,r) => s+r.avg, 0) / ratedRespScores.length).toFixed(1));
  }, [ratedRespScores]);

  const outcomeScores = useMemo(
    () => OUTCOMES.map(o => {
      const ratedValues = ratedRespScores.map(r => r.byOutcome?.[o] || 0).filter(Boolean);
      const avg = ratedValues.length
        ? parseFloat((ratedValues.reduce((s, v) => s + v, 0) / ratedValues.length).toFixed(1))
        : null;
      return { outcome: o, avg, ratedCount: ratedValues.length };
    }),
    [ratedRespScores]
  );

  function createPlannerItem(r, action, i) {
    const assessmentId = effectiveAssessmentId;
    const clientName = activeAssessmentContext?.clientName || completedClientName || 'Unknown client';
    const q    = Math.min(Math.ceil((i + 1) / 2), 4);
    const year = i < 4 ? 1 : 2;
    return {
      id: `${assessmentId}-${r.id}-step-${i}`,
      title: action,
      description: r.goals[OUTCOMES[0]],
      startQuarter: q, endQuarter: q,
      startYear: year, endYear: year,
      priority: r.avg < 2 ? 'High' : r.avg < 3 ? 'Medium' : 'Low',
      outcomeId: null,
      responsibilityId: r.id,
      responsibilityName: r.name,
      color: OUTCOME_COLORS['Efficiency'],
      assessmentId,
      clientName,
    };
  }

  function buildItems(r) {
    const stepList = STEPS[r.id]?.actions || [];
    return stepList.map((action, i) => createPlannerItem(r, action, i));
  }

  function handleAdd(r) {
    onAddToGantt(buildItems(r), { navigateToPlanning: false });
    setAddedIds(prev => new Set([...prev, r.id]));
    const stepList = STEPS[r.id]?.actions || [];
    setAddedStepIds((prev) => {
      const next = new Set(prev);
      stepList.forEach((action, i) => next.add(createPlannerItem(r, action, i).id));
      return next;
    });
  }
  function toggleSelectedStep(plannerStepId, isAlreadyAdded) {
    if (isAlreadyAdded) return;
    setSelectedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(plannerStepId)) next.delete(plannerStepId);
      else next.add(plannerStepId);
      return next;
    });
  }

  // resultsTabIndex is driven by the button toggle group below.

  const clientPlannerItems = useMemo(() => {
    return (plannerItems || []).filter((item) => item.assessmentId === effectiveAssessmentId);
  }, [plannerItems, effectiveAssessmentId]);

  function handleClientPlannerAdd(item) {
    const assessmentId = effectiveAssessmentId;
    const clientName = activeAssessmentContext?.clientName || completedClientName || 'Unknown client';
    onAddToGantt([{ ...item, assessmentId, clientName }], { navigateToPlanning: false });
  }

  function handleClientPlannerUpdate(id, patch) {
    const assessmentId = effectiveAssessmentId;
    const clientName = activeAssessmentContext?.clientName || completedClientName || 'Unknown client';
    onUpdatePlannerItem(id, { ...patch, assessmentId, clientName });
  }

  const clientLabel = (completedClientName || '').trim() || 'Client';

  return (
    <>
      <ForgeToolbar className="assess-page-toolbar" slot="header">
        <div slot="start" className="assess-page-toolbar__start">
          <ForgeIconButton aria-label="Back to dashboard" onClick={onBackToDashboard}>
            <ForgeIcon name="arrow_back" external />
          </ForgeIconButton>
          <div className="assess-page-toolbar__headings">
            <p className="forge-typography--overline text-forge-text-medium m-0 assess-page-toolbar__client">
              {clientLabel}
            </p>
            <h1 className="forge-typography--heading4 text-forge-text-high m-0">Assessment results</h1>
          </div>
        </div>
      </ForgeToolbar>

    <div className="flex flex-col gap-5 results-container">
        <ForgeButtonToggleGroup stretch style={{ display: 'flex', '--forge-button-toggle-background': 'var(--forge-theme-surface)',  background: 'var(--forge-theme-surface)', }}>
          <ForgeButtonToggle
            value="overview"
            selected={resultsTabIndex === 0}
            on-forge-button-toggle-select={() => setResultsTabIndex(0)}
          >
            <ForgeIcon name="gauge" slot="start" external />
            Overview
          </ForgeButtonToggle>
          <ForgeButtonToggle
            value="gaps"
            selected={resultsTabIndex === 1}
            on-forge-button-toggle-select={() => setResultsTabIndex(1)}
          >
            <ForgeIcon name="tray_alert" slot="start" external />
            Capability gaps
          </ForgeButtonToggle>
          <ForgeButtonToggle
            value="steps"
            selected={resultsTabIndex === 2}
            on-forge-button-toggle-select={() => setResultsTabIndex(2)}
          >
            <ForgeIcon name="format_list_checks" slot="start" external />
            Enhancement steps
          </ForgeButtonToggle>
          <ForgeButtonToggle
            value="action"
            selected={resultsTabIndex === 3}
            on-forge-button-toggle-select={() => setResultsTabIndex(3)}
          >
            <ForgeIcon name="chart_gantt" slot="start" external />
            Action plan
          </ForgeButtonToggle>
        </ForgeButtonToggleGroup>

      {resultsTabIndex === 0 && (
      <>
      {/* Hero */}
      <ForgeCard raised>
        <div className="results-overview-summary-wrap">
          <div className="results-overview-summary">
            <h1 className="forge-typography--heading5 m-0 text-forge-text-high">
              {(completedClientName || '').trim() || 'Client'}
            </h1>
            <div className="results-overview-summary__meta">
              <ForgeIcon name="calendar_today" className="results-overview-summary__meta-icon" external />
              <p className="forge-typography--body2 m-0 text-forge-text-medium">
                {(historicalCompletedLabel || completedAtLabel || 'Not completed yet')}
              </p>
            </div>
            <div className="results-overview-summary__meta">
              <ForgeIcon name="done_all" className="results-overview-summary__meta-icon" external />
              <p className="forge-typography--body2 m-0 text-forge-text-medium">
                {ratedRespScores.length} of {RESPONSIBILITIES.length} responsibilities rated
              </p>
            </div>
          </div>
          <img
            src="/chart-spot.svg"
            alt=""
            className="results-overview-summary__illustration"
          />
        </div>
      </ForgeCard>

      {/* <div className="results-stats results-substats">
        {[
          { val: gaps.length, label: 'Gaps (<3)', style: { color: 'rgba(254,202,202,1)' } },
          { val: respScores.filter(r => r.avg >= 3).length, label: 'Areas ≥ 3', style: { color: 'rgba(186,230,253,1)' } },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className="forge-typography--display4 font-bold leading-none" style={s.style}>{s.val}</div>
            <div className="forge-typography--label1 opacity-75">{s.label}</div>
          </div>
        ))}
      </div> */}

      {/* Charts */}
      <div className="results-charts">
        <ForgeCard className="results-scorecard results-gauge-card" raised>
          <div className="results-gauge-card__inner">
            <OverallScoreGauge
              value={overall}
              max={5}
              width={350}
              height={200}
              valueFontSize={60}
              titleFontSize={14}
              labelPositionY="68%"
              labelYAdjust={0}
            />
          </div>
        </ForgeCard>

        <ForgeCard className="results-scorecard results-outcome-card" raised>
          <div className="results-outcome-card__head">
            <h2 className="forge-typography--heading3 text-forge-text-high m-0">Outcome Scores</h2>
            <p className="forge-typography--body1 text-forge-text-medium m-0">
              Average score per outcome across rated responsibilities
            </p>
          </div>

          <div className="outcome-scores-grid">
            {outcomeScores.map(({ outcome, avg, ratedCount }) => (
              <div
                key={outcome}
                className="outcome-mini-card"
                style={{ ['--outcome-color']: OUTCOME_COLORS[outcome] }}
              >
                <div className="outcome-mini-card__top">
                  <div className="outcome-mini-card__label forge-typography--label1 text-forge-text-medium">
                    {outcome.toUpperCase()}
                  </div>
                  <div className="outcome-mini-card__value forge-typography--subheading7 text-forge-text-high">
                    {ratedCount ? avg.toFixed(1) : 'Not yet rated'}
                  </div>
                </div>
                <ForgeIcon
                    name={OUTCOME_ICONS[outcome]}
                    className="outcome-mini-card__icon"
                    external
                  />
                
              </div>
            ))}
          </div>
        </ForgeCard>

        <div className="results-overview-metrics-col">
          <ForgeCard className="results-scorecard results-overview-metric-card" raised>
            <p className="forge-typography--overline text-forge-text-medium m-0">Capability gaps</p>
            <p className="forge-typography--subheading8 m-0 text-forge-text-high">{gaps.length}</p>
            <p className="forge-typography--label1 text-forge-text-low m-0">Outcomes scored below 3</p>
          </ForgeCard>
          <ForgeCard className="results-scorecard results-overview-metric-card" raised>
            <p className="forge-typography--overline text-forge-text-medium m-0">Enhancement steps</p>
            <p className="forge-typography--subheading8 m-0 text-forge-text-high">{enhancementStepCount}</p>
            <p className="forge-typography--label1 text-forge-text-low m-0">Recommended actions available</p>
          </ForgeCard>
        </div>
      </div>

      {/* Scorecard */}
      <ForgeCard className="results-scorecard" raised>
        <h2 className="forge-typography--heading3 text-forge-text-high m-0 mb-1">Detailed Scorecard</h2>
        <p className="forge-typography--label1 text-forge-text-low m-0 mb-4">1 = Initial → 5 = Optimized</p>
        <div className="table-wrap scrollbar-thin">
          <table className="score-table forge-typography--label1">
            <thead>
              <tr>
                <th className="text-left forge-typography--label2 font-semibold">Responsibility</th>
                {OUTCOMES.map(o => (
                  <th key={o} className="text-center forge-typography--label2 font-semibold">{o}</th>
                ))}
                <th className="text-center forge-typography--label2 font-semibold">Avg</th>
              </tr>
            </thead>
            <tbody>
              {ratedRespScores.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <ForgeIcon name={r.icon} className="text-forge-text-low" style={{ fontSize: 16 }} external />
                      <span className="forge-typography--label2 font-medium text-forge-text-high">{r.name}</span>
                    </div>
                  </td>
                  {OUTCOMES.map(o => (
                    <td key={o} className="text-center">
                      <span
                        className="inline-flex items-center justify-center w-9 h-8 rounded-forge-md forge-typography--heading1 font-bold"
                        style={{ background: scoreBg(r.byOutcome[o]), color: scoreBgHex(r.byOutcome[o]) }}
                      >
                        {r.byOutcome[o] || '—'}
                      </span>
                    </td>
                  ))}
                  <td className="text-center forge-typography--heading2 font-bold" style={{ color: scoreBgHex(r.avg) }}>
                    {r.avg.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ForgeCard>
      </>
      )}

      {/* Gaps */}
      {resultsTabIndex === 1 && (
        <>
        <ForgeCard raised style={{ '--forge-card-padding': '1.5rem' }}>
            <div className="results-section-trigger__content">
            <h2 className="flex items-center gap-2 forge-typography--heading3 m-0">
              <ForgeIcon name="warning" style={{ fontSize: 20 }} external theme="error" />
              Capability gaps ({filteredGaps.length})
            </h2>
            <p className="forge-typography--body1 text-forge-text-medium mb-6 mt-2">Potential gaps from your lowest scoring outcomes and associated responsibilities</p>
            </div>
          <div className="gaps-filters">
            <div className="gaps-filters__field">
              <span className="forge-typography--overline text-forge-text-low">Filter by responsibilities</span>
              <ForgeSelect value={gapFilterResp} on-change={(e) => setGapFilterResp(e?.target?.value ?? 'All')}>
                <ForgeOption value="All">All responsibilities</ForgeOption>
                {gapResponsibilityOptions.map((opt) => (
                  <ForgeOption key={opt.id} value={opt.id}>{opt.name}</ForgeOption>
                ))}
              </ForgeSelect>
            </div>
            <div className="gaps-filters__field">
              <span className="forge-typography--overline text-forge-text-low">Filter by outcomes</span>
              <ForgeSelect value={gapFilterOutcome} on-change={(e) => setGapFilterOutcome(e?.target?.value ?? 'All')}>
                <ForgeOption value="All">All outcomes</ForgeOption>
                {gapOutcomeOptions.map((outcome) => (
                  <ForgeOption key={outcome} value={outcome}>{outcome}</ForgeOption>
                ))}
              </ForgeSelect>
            </div>
            <div className="gaps-filters__field">
              <span className="forge-typography--overline text-forge-text-low">Sort scores</span>
              <ForgeButtonToggleGroup stretch style={{ display: 'flex' }}>
                <ForgeButtonToggle
                  value="high-low"
                  selected={gapSortOrder === 'high-low'}
                  on-forge-button-toggle-select={() => setGapSortOrder('high-low')}
                >
                  <ForgeIcon name="sort_descending" slot="start" external />
                  High to low
                </ForgeButtonToggle>
                <ForgeButtonToggle
                  value="low-high"
                  selected={gapSortOrder === 'low-high'}
                  on-forge-button-toggle-select={() => setGapSortOrder('low-high')}
                >
                  <ForgeIcon name="sort_ascending" slot="start" external />
                  Low to high
                </ForgeButtonToggle>
              </ForgeButtonToggleGroup>
            </div>
          </div>
        </ForgeCard>
          <div className="flex flex-col gap-3">
            {filteredGaps.length === 0 && (
              <ForgeCard className="gap-item-empty">
                <p className="forge-typography--body1 text-forge-text-medium m-0">No capability gaps match the selected filters.</p>
              </ForgeCard>
            )}
            {filteredGaps.map(g => (
              <div
                key={g.id}
                className="gap-item"
                style={{
                  ['--gap-accent-color']: scoreBgHex(g.score),
                  ['--gap-accent-bg']: hexToRgba(scoreBgHex(g.score), 0.12),
                }}
              >
                <div className="gap-item__icon">
                  <ForgeIcon name={g.resp.icon} style={{ fontSize: 22 }} external />
                </div>

                <div className="gap-item__content">
                  <div className="gap-item__titleRow">
                    <span className="forge-typography--heading1 text-forge-text-high">{g.resp.name}</span>
                    <ForgeBadge theme={OUTCOME_BADGE_THEMES[g.outcome]}>
                      <ForgeIcon name={OUTCOME_ICONS[g.outcome]} style={{ fontSize: 14 }} slot="start" external />
                      {g.outcome}
                    </ForgeBadge>
                  </div>

                  <p className="gap-item__goal forge-typography--label2 text-forge-text-medium m-0">
                    {g.goal}
                  </p>
                </div>

                <div className="gap-item__score">
                  <div className="gap-item__scoreLabel forge-typography--overline text-forge-text-medium">SCORE:</div>
                  <div className="gap-item__scoreValue" style={{ background: hexToRgba(scoreBgHex(g.score), 0.12), color: scoreBgHex(g.score) }}>
                    {Number(g.score).toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
            </div>
        </>
      )}

      {/* Recommendations */}
      {resultsTabIndex === 2 && (
      <>
        <ForgeCard raised>
          <div className="results-recs-head">
            <div>
              <h2 className="flex items-center gap-2 forge-typography--heading3 m-0 mb-1">
                <ForgeIcon name="format_list_checks" style={{ fontSize: 24 }} external theme="success" />
                Recommended next steps
              </h2>
              <p className="forge-typography--body1 text-forge-text-medium mb-0 mt-2">Based on your lowest-scoring rated areas. Add to your planning Gantt chart.</p>
            </div>
          </div>
        </ForgeCard>
        <div className="results-recs-list">
          {!recs.length && (
            <p className="forge-typography--body2 text-forge-text-medium m-0">
              No recommendations yet. Rate at least one responsibility to generate recommendations.
            </p>
          )}
          {recs.map(r => {
            const added  = addedIds.has(r.id);
            const steps  = STEPS[r.id]?.actions || [];
            const selectedForResponsibility = steps
              .map((step, i) => createPlannerItem(r, step, i))
              .filter((item) => selectedStepIds.has(item.id));
            return (
              <ForgeCard key={r.id} raised>
                <div className="rec-item flex items-center gap-3 flex-wrap">
                  <ForgeIcon name={r.icon} className="text-forge-text-medium" style={{ fontSize: 20 }} external />
                  <span className="forge-typography--heading2 font-medium text-forge-text-high">{r.name}</span>
                  <ForgeBadge theme="info-secondary" className="flex-1">
                    <ForgeIcon name="format_list_numbered" slot="start" external />
                    {steps.length} {steps.length === 1 ? 'step' : 'steps'}
                  </ForgeBadge>
                  <span className="forge-typography--overline font-medium text-forge-text-medium">SCORE:</span>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-forge-md text-white forge-typography--label1 font-bold" style={{ background: scoreBg(r.avg) }}>
                    {r.avg.toFixed(1)}
                  </span>
                  <ForgeButton
                    variant="outlined"
                    onClick={() => handleAdd(r)}
                    disabled={added}
                    className={added ? 'bg-forge-success-container-low text-forge-success border-forge-success' : ''}
                  >
                    <ForgeIcon name={added ? 'check_circle' : 'add_chart'} slot="start" style={{ fontSize: 16 }} external />
                    {added ? 'Added to Plan' : 'Add all to plan'}
                  </ForgeButton>
                  {selectedForResponsibility.length > 0 && (
                    <ForgeButton
                      variant="filled"
                      onClick={() => {
                        onAddToGantt(selectedForResponsibility, { navigateToPlanning: false });
                        setAddedStepIds((prev) => {
                          const next = new Set(prev);
                          selectedForResponsibility.forEach((item) => next.add(item.id));
                          return next;
                        });
                        setSelectedStepIds((prev) => {
                          const next = new Set(prev);
                          selectedForResponsibility.forEach((item) => next.delete(item.id));
                          return next;
                        });
                      }}
                    >
                      <ForgeIcon name="add_chart" slot="start" external />
                      Add selected steps ({selectedForResponsibility.length})
                    </ForgeButton>
                  )}
                </div>
                <ul className="rec-steps">
                  {steps.map((step, i) => {
                    const plannerStepId = createPlannerItem(r, step, i).id;
                    const stepAdded = addedStepIds.has(plannerStepId);
                    const stepSelected = selectedStepIds.has(plannerStepId);
                    return (
                    <li
                      key={i}
                      className={`rec-step forge-typography--body1 text-forge-text-medium ${stepAdded ? 'rec-step--disabled' : 'rec-step--interactive'}${stepSelected ? ' rec-step--selected' : ''}`}
                      onClick={() => toggleSelectedStep(plannerStepId, stepAdded)}
                    >
                      <ForgeCheckbox dense
                        checked={stepAdded || stepSelected}
                        disabled={stepAdded}
                        on-change={() => toggleSelectedStep(plannerStepId, stepAdded)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {'\u200B'}
                      </ForgeCheckbox>
                      <span className="flex-1">{step}</span>
                      {stepAdded ? (
                        <ForgeBadge theme="success">
                          <ForgeIcon name="check" slot="start" external />
                          Added
                        </ForgeBadge>
                      ) : null}
                    </li>
                  );
                  })}
                </ul>
              </ForgeCard>
            );
          })}
        </div>
      </>
      )}

      {resultsTabIndex === 3 && (
      <>
        <div className="client-planner-gantt">
          <GanttChart
            items={clientPlannerItems}
            onAddItem={handleClientPlannerAdd}
            onUpdateItem={handleClientPlannerUpdate}
            onDeleteItem={onDeletePlannerItem}
            variant="client"
            className="client-action-plan"
            headerTitle="Client Specific Action Plan"
            headerActions={(
              <ForgeButton variant="outlined" onClick={onOpenPlanningTab}>
                Open full action plan
                <ForgeIcon name="arrow_forward" slot="end" external />
              </ForgeButton>
            )}
          />
        </div>
      </>
      )}

      <div className="retake-wrap">
        <ForgeButton variant="outlined" onClick={onBack}>
          <ForgeIcon name="refresh" slot="start" external />
          Retake Assessment
        </ForgeButton>
      </div>
    </div>
    </>
  );
}

/* ─── Root ──────────────────────────────────────────────────────── */
function formatHistoricalDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

export default function AssessmentTool({
  onBackToDashboard,
  onComplete,
  onSaveProgress,
  onDeleteProgress,
  onAddToGantt,
  plannerItems,
  onUpdatePlannerItem,
  onDeletePlannerItem,
  onOpenPlanningTab,
  activeAssessmentContext,
  onScreenChange,
  pendingHistoricalView,
  onDismissHistoricalContext,
}) {
  const [screen, setScreen] = useState('intro');
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [historicalCompletedLabel, setHistoricalCompletedLabel] = useState(null);
  const [clientName, setClientName] = useState('');
  const [completedAtLabel, setCompletedAtLabel] = useState(null);
  const [completedClientName, setCompletedClientName] = useState('');
  /** Lifted so accordion state survives StrictMode remounts / subtree updates when scoring. */
  const [openOutcomePanelIndex, setOpenOutcomePanelIndex] = useState(0);
  const [leaveAssessDialogOpen, setLeaveAssessDialogOpen] = useState(false);
  const prevScreenRef = useRef(screen);

  const hasAnyRatings = useMemo(
    () => RESPONSIBILITIES.some((resp) => OUTCOMES.some((o) => Boolean(scores[`${resp.id}-${o}`]))),
    [scores]
  );

  const sessionHydratedRef = useRef(false);

  useLayoutEffect(() => {
    if (pendingHistoricalView?.scores) {
      setScores(pendingHistoricalView.scores);
      const isDraft = pendingHistoricalView.mode === 'draft';
      if (isDraft) {
        const maxIdx = RESPONSIBILITIES.length - 1;
        const nextIdx = Math.max(0, Math.min(maxIdx, Number(pendingHistoricalView.resumeIndex) || 0));
        setIdx(nextIdx);
        setClientName(pendingHistoricalView.clientName || '');
        setHistoricalCompletedLabel(null);
        setCompletedAtLabel(null);
        setCompletedClientName('');
        setScreen('assess');
      } else {
        setScreen('results');
        setHistoricalCompletedLabel(formatHistoricalDate(pendingHistoricalView.completedAt));
        setCompletedAtLabel(null);
        setCompletedClientName(pendingHistoricalView.clientName || '');
      }
      sessionHydratedRef.current = true;
    }
  }, [pendingHistoricalView?.id]);

  useLayoutEffect(() => {
    if (sessionHydratedRef.current) return;
    sessionHydratedRef.current = true;
    const s = readAssessmentSession();
    if (!s) return;
    const maxIdx = RESPONSIBILITIES.length - 1;
    setScreen(s.screen);
    setIdx(Math.max(0, Math.min(maxIdx, s.idx)));
    setScores(s.scores);
    setClientName(s.clientName);
    setHistoricalCompletedLabel(s.historicalCompletedLabel);
    setCompletedAtLabel(s.completedAtLabel);
    setCompletedClientName(s.completedClientName);
  }, []);

  useEffect(() => {
    onScreenChange?.(screen);
  }, [screen, onScreenChange]);

  useEffect(() => {
    if (screen !== 'assess') setLeaveAssessDialogOpen(false);
  }, [screen]);

  useEffect(() => {
    setOpenOutcomePanelIndex(0);
  }, [idx]);

  useEffect(() => {
    if (screen === 'assess' && prevScreenRef.current !== 'assess') {
      setOpenOutcomePanelIndex(0);
    }
    prevScreenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    writeAssessmentSession({
      screen,
      idx,
      scores,
      clientName,
      historicalCompletedLabel,
      completedAtLabel,
      completedClientName,
    });
  }, [screen, idx, scores, clientName, historicalCompletedLabel, completedAtLabel, completedClientName]);

  function handleScore(respId, outcome, val) {
    setScores(prev => ({ ...prev, [`${respId}-${outcome}`]: val }));
    const outcomeIdx = OUTCOMES.indexOf(outcome);
    if (outcomeIdx < 0) return;
    setOpenOutcomePanelIndex((prevOpen) => {
      if (prevOpen !== outcomeIdx) return prevOpen;
      return outcomeIdx < OUTCOMES.length - 1 ? outcomeIdx + 1 : prevOpen;
    });
  }
  function finalizeAssessment() {
    if (!Object.values(scores).some(Boolean)) return;
    onComplete({
      scores,
      clientName: clientName?.trim() || '',
    });
    // Persist the intro metadata for display on the results card.
    setCompletedAtLabel(formatHistoricalDate(new Date().toISOString()));
    setCompletedClientName(clientName?.trim() || '');
    setHistoricalCompletedLabel(null);
    setScreen('results');
  }

  function handleNext() {
    if (idx < RESPONSIBILITIES.length - 1) setIdx(i => i + 1);
    else finalizeAssessment();
  }
  function handleSkip() {
    if (idx < RESPONSIBILITIES.length - 1) setIdx(i => i + 1);
  }

  function resetAssessmentToIntro() {
    clearAssessmentSession();
    setScores({});
    setIdx(0);
    setOpenOutcomePanelIndex(0);
    setHistoricalCompletedLabel(null);
    setCompletedAtLabel(null);
    setCompletedClientName('');
    setClientName('');
    setScreen('intro');
    onDismissHistoricalContext?.();
  }

  function handleReset() {
    resetAssessmentToIntro();
  }

  function handleToolbarBackRequest() {
    setLeaveAssessDialogOpen(true);
  }

  function handleLeaveAssessSaveProgress() {
    onSaveProgress?.({
      scores,
      clientName: clientName?.trim() || '',
      idx,
    });
    setLeaveAssessDialogOpen(false);
    onBackToDashboard();
  }

  async function handleLeaveAssessDiscard() {
    setLeaveAssessDialogOpen(false);
    await onDeleteProgress?.();
    resetAssessmentToIntro();
    onBackToDashboard();
  }

  return (
    <div className="assessment-tool">
      {screen === 'intro'   && (
        <IntroScreen
          onStart={() => setScreen('assess')}
          clientName={clientName}
          setClientName={setClientName}
        />
      )}
      {screen === 'assess'  && (
          <div className="assess-flow-wrap">
            <AssessScreen
              currentIdx={idx}
              scores={scores}
              onScore={handleScore}
              onNext={handleNext}
              onSkip={handleSkip}
              onBack={() => setIdx(i => i - 1)}
              onSelectStep={setIdx}
              onFinishNow={finalizeAssessment}
              canFinalize={hasAnyRatings}
              clientName={clientName}
              onBackToDashboard={handleToolbarBackRequest}
              openPanelIndex={openOutcomePanelIndex}
              onOpenPanelChange={setOpenOutcomePanelIndex}
            />
          </div>
        )}
      {screen === 'results' && (
        <ResultsScreen
          scores={scores}
          onBack={handleReset}
          onBackToDashboard={onBackToDashboard}
          onAddToGantt={onAddToGantt}
          plannerItems={plannerItems}
          onUpdatePlannerItem={onUpdatePlannerItem}
          onDeletePlannerItem={onDeletePlannerItem}
          onOpenPlanningTab={onOpenPlanningTab}
          activeAssessmentContext={activeAssessmentContext}
          historicalCompletedLabel={historicalCompletedLabel}
          completedAtLabel={completedAtLabel}
          completedClientName={completedClientName}
        />
      )}

      <ForgeDialog
        open={leaveAssessDialogOpen}
        label="Leave assessment?"
        moveable={false}
        className="assess-leave-dialog"
        on-forge-dialog-close={() => setLeaveAssessDialogOpen(false)}
      >
        <forge-scaffold>
        <ForgeToolbar slot="header">
          <h2 className="forge-typography--heading4 m-0 text-forge-text-high" slot="start">
            Leave assessment
          </h2>
          <ForgeIconButton
            slot="end"
            aria-label="Close"
            onClick={() => setLeaveAssessDialogOpen(false)}
            external
          >
            <ForgeIcon name="close" external />
          </ForgeIconButton>
        </ForgeToolbar>
        <div className="assess-leave-dialog__body" slot="body">
          <p className="forge-typography--body2 m-0 text-forge-text-high leading-relaxed">
            Your progress is saved automatically if you exit and come back later. You can also discard
            this assessment and remove all answers—you will start fresh next time.
          </p>
        </div>
        <ForgeToolbar slot="footer" inverted>
          <ForgeButton slot="start" variant="text" onClick={() => setLeaveAssessDialogOpen(false)}>
            Cancel
          </ForgeButton>
          <div slot="end" className="assess-leave-dialog__footer-actions">
            
            <ForgeButton variant="outlined" theme="error" className="assess-leave-dialog__discard" onClick={handleLeaveAssessDiscard}>
              Delete assessment
            </ForgeButton>
            
            <ForgeButton variant="filled" onClick={handleLeaveAssessSaveProgress}>
              Save progress and exit
            </ForgeButton>
          </div>
        </ForgeToolbar>
        </forge-scaffold>
      </ForgeDialog>
    </div>
  );
}
