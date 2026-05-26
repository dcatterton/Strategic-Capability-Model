import { useState, useMemo, useEffect } from 'react';
import { Scatter } from 'react-chartjs-2';
import {
  ForgeCard,
  ForgeButton,
  ForgeIcon,
  ForgeToolbar,
  ForgeButtonArea,
  ForgeAvatar,
  ForgeMeter,
  ForgeIconButton,
  ForgePaginator,
  ForgeSkeleton,
} from '@tylertech/forge-react';
import { OUTCOMES, OUTCOME_COLORS, OUTCOME_ICONS, RESPONSIBILITIES, MEASURES, getAssessmentSummary, MATURITY_LEVELS } from '../data';
import { supabase } from '../supabase';
import DetailPanel from './DetailPanel';

const ASSESSMENT_META_KEY = '__scm_meta';

const FAKE_CLIENTS = [
  'Redwood County, TX',
'Pinecrest County, TX',
'Silverlake County, AZ',
'Stonebridge County, GA',
'Cedar Valley County, WA',
'Golden Ridge County, CA',
'Prairie View County, IL',
'Bluebonnet County, TX',
'Silverlake County, AZ',
'Sunset Hills County, CA',
'Oceanview County, CA',
'Palm Shore County, FL',
'Lone Star County, TX',
'Desert Springs County, NV',
'Ironwood County, TX',
'Alamo Ridge County, TX',
'Coral Bay County, FL',
'Motor City County, MI',
'Silicon Valley County, CA',
'Bayfront County, CA',
'Colonial Heights County, MA',
'Riverbend County, CA',
'High Desert County, CA',
'Buckeye County, OH',
'North Star County, MN',
'Volunteer County, TN',
'Stonebridge County, GA',
'Queen City County, NC',
'Empire Coast County, NY',
'Harbor Point County, NY',
'Steel Valley County, PA',
'Capital Ridge County, MD',
'Liberty Falls County, VA',
'Wasatch Valley County, UT',
];

function fetchAssessments() {
  if (!supabase) return Promise.resolve([]);
  return supabase
    .from('assessments')
    .select('id, created_at, scores, client_name')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => (error ? [] : data || []));
}

function getAvatarText(clientName) {
  const cleaned = (clientName || '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim();
  const parts = cleaned ? cleaned.split(/\s+/).filter(Boolean) : [];
  return parts.slice(0, 2).map(p => (p[0] || '').toUpperCase()).join('');
}

function scoreToTheme(overall) {
  if (overall >= 4) return 'success';
  if (overall >= 3) return 'primary';
  if (overall >= 2) return 'warning';
  return 'error';
}

function scoreToAvatarBackground(overall) {
  if (overall >= 4) return 'var(--forge-theme-success)';
  if (overall >= 3) return 'var(--forge-theme-primary)';
  if (overall >= 2) return 'var(--forge-theme-warning)';
  return 'var(--forge-theme-error)';
}

function scoreToHeatCellColor(score) {
  // Bucket scores so ~3.7 stays "blue" rather than turning green.
  const s = Number(score) || 0;
  const level = s >= 4.5 ? 5 : s >= 4 ? 4 : s >= 3 ? 3 : s >= 2 ? 2 : 1;
  return MATURITY_LEVELS.find(l => l.level === level)?.color ?? 'var(--forge-theme-outline)';
}

function withAlpha(color, alpha) {
  // Expects hex colors like #RRGGBB for maturity level colors.
  if (typeof color !== 'string') return color;
  const hex = color.trim();
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return color;
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  const a = Math.max(0, Math.min(1, Number(alpha)));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function Dashboard({ onStartAssessment, onOpenCompletedAssessment }) {
  const [selectedResp, setSelectedResp] = useState(null);
  const [completedAssessments, setCompletedAssessments] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [chartPageIndex, setChartPageIndex] = useState(0);
  const [chartPageSize, setChartPageSize] = useState(10);

  useEffect(() => {
    let isMounted = true;
    setIsHistoryLoading(true);
    fetchAssessments()
      .then((rows) => {
        if (!isMounted) return;
        setCompletedAssessments(rows);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsHistoryLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const latestAssessmentsByClient = useMemo(() => {
    const out = [];
    const seen = new Set();
    // fetchAssessments already orders by created_at desc, so "first per client" is latest.
    for (const a of completedAssessments) {
      const key = (a.client_name || '').trim() || '—';
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
    return out;
  }, [completedAssessments]);

  const clientOutcomeRows = useMemo(() => {
    return latestAssessmentsByClient.map((a) => {
      const scores = a.scores || {};

      const outcomeAvgs = Object.fromEntries(
        OUTCOMES.map((o) => {
          const ratedValues = RESPONSIBILITIES
            .map((r) => Number(scores[`${r.id}-${o}`]) || 0)
            .filter(Boolean);
          const avg = ratedValues.length
            ? parseFloat((ratedValues.reduce((acc, v) => acc + v, 0) / ratedValues.length).toFixed(1))
            : null;
          return [o, avg];
        }),
      );

      const { overall } = getAssessmentSummary(scores);
      const ratedResponsibilityCount = RESPONSIBILITIES.filter((r) =>
        OUTCOMES.every((o) => Boolean(scores[`${r.id}-${o}`]))
      ).length;
      const dateStr = a.created_at
        ? new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

      return {
        id: a.id,
        assessment: a,
        clientName: a.client_name || '—',
        dateStr,
        overall,
        outcomeAvgs,
        ratedResponsibilityCount,
        isDraft: a?.scores?.[ASSESSMENT_META_KEY]?.isDraft === true,
      };
    });
  }, [latestAssessmentsByClient]);

  const totalHistoryPages = useMemo(() => {
    if (historyPageSize <= 0) return 1;
    return Math.max(1, Math.ceil(clientOutcomeRows.length / historyPageSize));
  }, [clientOutcomeRows.length, historyPageSize]);

  useEffect(() => {
    setHistoryPageIndex((prev) => Math.min(prev, totalHistoryPages - 1));
  }, [totalHistoryPages]);

  const pagedClientOutcomeRows = useMemo(() => {
    if (historyPageSize <= 0) return clientOutcomeRows;
    const start = historyPageIndex * historyPageSize;
    return clientOutcomeRows.slice(start, start + historyPageSize);
  }, [clientOutcomeRows, historyPageIndex, historyPageSize]);

  const totalChartPages = useMemo(() => {
    if (chartPageSize <= 0) return 1;
    return Math.max(1, Math.ceil(clientOutcomeRows.length / chartPageSize));
  }, [clientOutcomeRows.length, chartPageSize]);

  useEffect(() => {
    setChartPageIndex((prev) => Math.min(prev, totalChartPages - 1));
  }, [totalChartPages]);

  const pagedChartRows = useMemo(() => {
    if (chartPageSize <= 0) return clientOutcomeRows;
    const start = chartPageIndex * chartPageSize;
    return clientOutcomeRows.slice(start, start + chartPageSize);
  }, [clientOutcomeRows, chartPageIndex, chartPageSize]);

  function handleHistoryPageChange(event) {
    const detail = event?.detail || {};
    if (typeof detail.pageSize === 'number' && Number.isFinite(detail.pageSize) && detail.pageSize > 0) {
      setHistoryPageSize(detail.pageSize);
    }
    if (typeof detail.pageIndex === 'number' && Number.isFinite(detail.pageIndex) && detail.pageIndex >= 0) {
      setHistoryPageIndex(detail.pageIndex);
    }
  }

  function handleChartPageChange(event) {
    const detail = event?.detail || {};
    if (typeof detail.pageSize === 'number' && Number.isFinite(detail.pageSize) && detail.pageSize > 0) {
      setChartPageSize(detail.pageSize);
    }
    if (typeof detail.pageIndex === 'number' && Number.isFinite(detail.pageIndex) && detail.pageIndex >= 0) {
      setChartPageIndex(detail.pageIndex);
    }
  }

  function handleDeleteAssessment(id) {
    if (!supabase) return;
    const ok = window.confirm('Delete this assessment? This cannot be undone.');
    if (!ok) return;
    supabase
      .from('assessments')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) return;
        setCompletedAssessments(prev => prev.filter(x => x.id !== id));
      });
  }

  function buildFakeScores() {
    // Flat score map: `${responsibilityId}-${outcome}` -> decimal score.
    // Distribution target is based on OVERALL score buckets.
    const drawTargetOverall = () => {
      const r = Math.random();
      // 10% chance for <2 overall, 10% for <3, 20% for <4, 60% for <5
      if (r < 0.10) return 1 + Math.random() * 0.99; // [1.00, 1.99]
      if (r < 0.20) return 2 + Math.random() * 0.99; // [2.00, 2.99]
      if (r < 0.40) return 3 + Math.random() * 0.99; // [3.00, 3.99]
      return 4 + Math.random() * 0.99;               // [4.00, 4.99]
    };

    const clamp = (n) => Math.max(1, Math.min(4.9, n));
    const targetOverall = drawTargetOverall();
    const outcomeBias = Object.fromEntries(OUTCOMES.map((o) => [o, (Math.random() * 0.8) - 0.4]));
    const respBias = Object.fromEntries(RESPONSIBILITIES.map((r) => [r.id, (Math.random() * 0.8) - 0.4]));

    const rawScores = RESPONSIBILITIES.reduce((acc, r) => {
      OUTCOMES.forEach((o) => {
        const noise = (Math.random() * 0.9) - 0.45;
        acc[`${r.id}-${o}`] = clamp(targetOverall + outcomeBias[o] + respBias[r.id] + noise);
      });
      return acc;
    }, {});

    const currentOverall = getAssessmentSummary(rawScores).overall || targetOverall;
    const delta = targetOverall - currentOverall;

    return RESPONSIBILITIES.reduce((acc, r) => {
      OUTCOMES.forEach((o) => {
        const key = `${r.id}-${o}`;
        acc[key] = parseFloat(clamp(rawScores[key] + delta).toFixed(1));
      });
      return acc;
    }, {});
  }

  async function handleGenerateFakeResult() {
    const used = new Set(completedAssessments.map(a => (a.client_name || '').trim()).filter(Boolean));
    const available = FAKE_CLIENTS.filter(n => !used.has(n));
    const fallbackName = `Demo Client ${completedAssessments.length + 1}`;
    const clientName = available[Math.floor(Math.random() * available.length)] || fallbackName;
    const createdAt = new Date().toISOString();
    const scores = buildFakeScores();

    if (supabase) {
      const { data, error } = await supabase
        .from('assessments')
        .insert({ client_name: clientName, scores })
        .select('id, created_at, scores, client_name')
        .single();
      if (!error && data) {
        setCompletedAssessments(prev => [data, ...prev]);
        return;
      }
    }

    // Fallback local-only record if Supabase write fails.
    setCompletedAssessments(prev => [
      {
        id: `fake-${Date.now()}`,
        created_at: createdAt,
        scores,
        client_name: clientName,
      },
      ...prev,
    ]);
  }

  const chartData = useMemo(() => {
    const connectorPoints = [];
    const pointDataByOutcome = Object.fromEntries(OUTCOMES.map((o) => [o, []]));

    pagedChartRows.forEach((row) => {
      const ratedOutcomes = OUTCOMES
        .map((outcome) => ({ outcome, score: row.outcomeAvgs[outcome] }))
        .filter(({ score }) => typeof score === 'number');

      if (!ratedOutcomes.length) return;

      const minScore = Math.min(...ratedOutcomes.map(({ score }) => score));
      const maxScore = Math.max(...ratedOutcomes.map(({ score }) => score));

      connectorPoints.push(
        { x: minScore, y: row.clientName },
        { x: maxScore, y: row.clientName },
        { x: null, y: null },
      );

      ratedOutcomes.forEach(({ outcome, score }) => {
        pointDataByOutcome[outcome].push({ x: score, y: row.clientName });
      });
    });

    return {
      datasets: [
        {
          type: 'line',
          label: 'Range',
          data: connectorPoints,
          showLine: true,
          borderColor: 'rgba(96, 125, 139, 0.55)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          order: 0,
        },
        ...OUTCOMES.map((outcome) => ({
          type: 'scatter',
          label: outcome,
          data: pointDataByOutcome[outcome],
          backgroundColor: OUTCOME_COLORS[outcome],
          borderColor: OUTCOME_COLORS[outcome],
          pointRadius: 4,
          pointHoverRadius: 5,
          pointHitRadius: 8,
          order: 1,
        })),
      ],
    };
  }, [pagedChartRows]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
      tooltip: {
        mode: 'nearest',
        intersect: true,
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset?.label === 'Range') return null;
            const score = typeof ctx.parsed?.x === 'number' ? ctx.parsed.x.toFixed(1) : '0.0';
            return `${ctx.dataset.label}: ${score}`;
          },
        },
      },
    },
    interaction: {
      mode: 'index',
      axis: 'y',
      intersect: true,
    },
    scales: {
      x: {
        min: 1,
        max: 5,
        title: { display: true, text: 'Outcome score' },
        grid: { color: 'rgba(0,0,0,0.08)' },
        ticks: { stepSize: 0.5 },
      },
      y: {
        type: 'category',
        offset: true,
        grid: { display: true },
      },
    },
  }), []);

  const chartHeight = useMemo(
    () => Math.max(240, pagedChartRows.length * 32),
    [pagedChartRows.length]
  );

  return (
    <div className="dashboard-body">
      <div className="dashboard-content">
        {/* Hero */}
      <ForgeCard raised>
        <div className="hero-card">
          <div>
          <h1 className="forge-typography--heading4" style={{ marginBottom: '0.5rem', marginTop: '0rem' }}>Court Technology Capabilities</h1>
          <p className="m-0 forge-typography--body2 text-forge-text-medium leading-relaxed max-w-2xl mb-5">
            Explore the strategic capability model mapping court responsibilities to key outcomes.
            Select a responsibility to view detailed measures and implementation steps.
          </p>
          
          <ForgeButton variant="filled" onClick={onStartAssessment}>
            <ForgeIcon name="assignment" slot="start" external/>
            Start Assessment
          </ForgeButton>
          </div>
          <div className="hero-card__graphic">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 92" width="100%" height="100%">
            <defs><style>{`.cls-1{fill:none;}.cls-2{fill:#d0dbf4;fill-rule:evenodd;}.cls-3{fill:#fff;}.cls-3,.cls-4{stroke-linecap:round;stroke-linejoin:round;}.cls-3,.cls-4,.cls-5{stroke:#586ab1;stroke-width:2px;}.cls-4{fill:#d1d1d1;}.cls-5{fill:#5cc5cd;stroke-miterlimit:10;}`}</style></defs>
            <rect className="cls-1" y=".05" width="92" height="92"/>
            <path className="cls-2" d="M46,82.05c19.88,0,36-16.12,36-36S65.88,10.05,46,10.05,10,26.16,10,46.05s16.12,36,36,36Z"/>
            <rect className="cls-4" x="16.54" y="36.53" width="58.85" height="38.62"/>
            <rect className="cls-3" x="11.17" y="72.99" width="69.65" height="5.14"/>
            <polygon className="cls-3" points="46 13.96 9.7 39.51 82.3 39.51 46 13.96"/>
            <path className="cls-5" d="M40.92,72.99v-15.63s-.09-5.42,5.1-5.42c0,0,5.01.13,4.95,5.84l.12,15.21h-10.17Z"/>
            <rect className="cls-3" x="15.55" y="39.82" width="5.99" height="29.79"/>
            <rect className="cls-3" x="14.05" y="39.51" width="8.99" height="3.38"/>
            <rect className="cls-3" x="14.05" y="69.61" width="8.99" height="3.38"/>
            <rect className="cls-3" x="29.59" y="39.82" width="5.99" height="29.79"/>
            <rect className="cls-3" x="28.08" y="39.51" width="8.99" height="3.38"/>
            <rect className="cls-3" x="28.08" y="69.61" width="8.99" height="3.38"/>
            <rect className="cls-3" x="56.32" y="39.82" width="5.99" height="29.79"/>
            <rect className="cls-3" x="54.82" y="39.51" width="8.99" height="3.38"/>
            <rect className="cls-3" x="54.82" y="69.61" width="8.99" height="3.38"/>
            <rect className="cls-3" x="70.35" y="39.82" width="5.99" height="29.79"/>
            <rect className="cls-3" x="68.85" y="39.51" width="8.99" height="3.38"/>
            <rect className="cls-3" x="68.85" y="69.61" width="8.99" height="3.38"/>
            <circle className="cls-3" cx="45.82" cy="28.99" r="4.42"/>
          </svg>
        </div>
        </div>
        
      </ForgeCard>

     

      {/* 3×3 Responsibility grid */}
      
      <div className="resp-grid">
        {RESPONSIBILITIES.map(r => {
          const totalKPIs     = (MEASURES[r.id] || []).length;
          const isSelected    = selectedResp === r.id;
          const outcomeCounts = OUTCOMES.map(o => ({
            o,
            count: (MEASURES[r.id] || []).filter(m => m.outcome === o).length,
          }));
          const maxCount = Math.max(...outcomeCounts.map(x => x.count), 1);

          return (
            <ForgeCard
            raised
              key={r.id}
              className={`resp-card border-forge-outline rounded-forge-md ${isSelected ? 'selected' : ''}`}
            >
              <ForgeButtonArea onClick={() => setSelectedResp(isSelected ? null : r.id)}>
                <button type="button" slot="button" aria-label={`View ${r.name} details`} />
                <div className="resp-card__row">
                <ForgeIcon
                  name={r.icon}
                  className={`flex-shrink-0 transition-colors ${isSelected ? 'text-forge-primary' : 'text-forge-text-medium'}`}
                  style={{ fontSize: 28 }}
                  external
                />
                <div className="flex-1 min-w-0">
                  <p className={`forge-typography--subheading2 leading-snug m-0 mb-1 transition-colors ${isSelected ? 'text-forge-primary' : 'text-forge-text-high'}`}>
                    {r.name}
                  </p>
                  <p className="forge-typography--label2 text-forge-text-medium m-0">{totalKPIs} measures</p>
                </div>
                <ForgeIcon
                  name="chevron_right"
                  className={`flex-shrink-0 transition-colors ${isSelected ? 'text-forge-primary' : 'text-forge-text-low'}`}
                  style={{ fontSize: 24 }}
                  external
                />
              </div>
              {/* <div className="resp-card__bars">
                {outcomeCounts.map(({ o, count }) => (
                  <div key={o} className="resp-card__bar-row">
                    <ForgeIcon name={OUTCOME_ICONS[o]} className="flex-shrink-0 w-3" style={{ color: OUTCOME_COLORS[o], fontSize: 11 }} external />
                    <div className="flex-1 bg-forge-surface-min rounded-full overflow-hidden" style={{ height: 6 }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(count / maxCount) * 100}%`, background: OUTCOME_COLORS[o] }}
                      />
                    </div>
                    <span className="forge-typography--label1 text-forge-text-low w-3 text-right">{count}</span>
                  </div>
                ))}
              </div> */}
              
              </ForgeButtonArea>
            </ForgeCard>
          );
        })}
      </div>

      {/* {supabase && (
        <ForgeCard raised className="assessments-history-card">
          <div className="assessments-history-card__head">
            <h2 className="forge-typography--heading3 text-forge-text-high m-0">Client assessments</h2>
            <p className="forge-typography--label2 text-forge-text-medium m-0">
              {new Set(completedAssessments.map(a => a.client_name || '')).size} client{new Set(completedAssessments.map(a => a.client_name || '')).size === 1 ? '' : 's'} · {completedAssessments.length} assessments total
            </p>
          </div>

          {completedAssessments.length === 0 ? (
            <p className="forge-typography--body2 text-forge-text-medium m-4">
              No completed assessments yet. Complete an assessment to see it here.
            </p>
          ) : (
            <div className="assessments-history-rows">
              {completedAssessments.map((a) => {
                const { overall } = getAssessmentSummary(a.scores);
                const theme = scoreToTheme(overall);
                const avatarText = getAvatarText(a.client_name || '');
                return (
                  <div key={a.id} className="assessments-history-row">
                    <ForgeAvatar
                      text={avatarText}
                      letterCount={2}
                      className="assessments-history-avatar"
                      style={{
                        '--forge-avatar-background': scoreToAvatarBackground(overall),
                        '--forge-avatar-color': 'var(--forge-theme-on-primary)',
                      }}
                    />

                    <div className="assessments-history-main">
                      <p className="forge-typography--heading1 text-forge-text-high assessments-history-client-name">
                        {a.client_name || '—'}
                      </p>
                      <ForgeMeter
                        value={overall}
                        min={0}
                        max={5}
                        valueMode="manual"
                        theme={theme}
                        tickmarks={true}
                        className="assessments-history-meter"
                        style={{
                          '--forge-meter-height': '6px',
                        }}
                      >
                        <span slot="value">{overall.toFixed(1)} / 5</span>
                      </ForgeMeter>
                    </div>

                   

                    <div className="assessments-history-actions">
                      <ForgeButton
                        variant="outlined"
                        className="assessments-history-view-btn"
                        onClick={() => onOpenCompletedAssessment?.(a)}
                      >
                        View results
                      </ForgeButton>
                      <ForgeIconButton
                        aria-label="Delete assessment"
                        className="assessments-history-delete-btn"
                        onClick={() => handleDeleteAssessment(a.id)}
                      >
                        <ForgeIcon name="delete" external />
                      </ForgeIconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ForgeCard>
      )} */}

      {supabase && (
        <ForgeCard raised className="client-outcome-heatmap-card">
          <div className="client-outcome-heatmap-head">
            <div>
              <h2 className="forge-typography--heading4 text-forge-text-high m-0">
                Client assessment history
              </h2>
              <p className="forge-typography--label2 text-forge-text-low m-0">
                Latest assessment scores by outcome &mdash; colors indicate capability level
              </p>
            </div>
            <ForgeButton variant="text" onClick={handleGenerateFakeResult}>
              <ForgeIcon name="auto_fix_high" slot="start" external />
              Generate fake result
            </ForgeButton>
          </div>

          <div className="client-outcome-table-wrap">
            <table className="client-outcome-table">
              <thead>
                <tr>
                  <th className="client-outcome-th client-outcome-th--client">
                    <span className="client-outcome-th-inner">
                      CLIENT
                    </span>
                  </th>
                  {OUTCOMES.map((o) => (
                    <th key={o} className="client-outcome-th">
                      <span className="client-outcome-th-inner">
                        <ForgeIcon name={OUTCOME_ICONS[o]} external />
                        {o}
                      </span>
                    </th>
                  ))}
                  <th className="client-outcome-th client-outcome-th--overall">
                    <span className="client-outcome-th-inner">
                      <ForgeIcon name="gauge" external />
                      Overall
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isHistoryLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`history-skeleton-${i}`} className="client-outcome-tr">
                      <td className="client-outcome-td client-outcome-td--client">
                        <div className="client-outcome-client">
                          <ForgeSkeleton avatar></ForgeSkeleton>
                          <div className="client-outcome-name-wrap" style={{ gap: '0.15rem' }}>
                            <ForgeSkeleton text style={{ width: '140px' }}></ForgeSkeleton>
                          </div>
                        </div>
                      </td>
                      {OUTCOMES.map((o) => (
                        <td key={`history-skeleton-${i}-${o}`} className="client-outcome-td client-outcome-td--heat">
                          <ForgeSkeleton text style={{ width: '72px' }}></ForgeSkeleton>
                        </td>
                      ))}
                      <td className="client-outcome-td client-outcome-td--heat">
                        <ForgeSkeleton text style={{ width: '80px' }}></ForgeSkeleton>
                      </td>
                      <td className="client-outcome-td client-outcome-td--date">
                        <ForgeSkeleton text style={{ width: '110px' }}></ForgeSkeleton>
                      </td>
                      <td className="client-outcome-td client-outcome-td--actions">
                        <div className="client-outcome-actions">
                          <ForgeSkeleton text style={{ width: '130px' }}></ForgeSkeleton>
                          <ForgeSkeleton avatar></ForgeSkeleton>
                        </div>
                      </td>
                    </tr>
                  ))}
                {clientOutcomeRows.length === 0 && (
                  <tr>
                    <td className="client-outcome-td client-outcome-empty" colSpan={OUTCOMES.length + 4}>
                      No assessments yet. Click "Generate fake result" to create demo data.
                    </td>
                  </tr>
                )}
                {!isHistoryLoading && pagedClientOutcomeRows.map((row) => (
                  <tr key={row.id} className="client-outcome-tr">
                    <td className="client-outcome-td client-outcome-td--client">
                      <div className="client-outcome-client">
                        <ForgeAvatar
                          text={getAvatarText(row.clientName)}
                          letterCount={2}
                          className="client-outcome-avatar"
                          style={{
                            '--forge-avatar-background': scoreToHeatCellColor(row.overall),
                            '--forge-avatar-color': 'var(--forge-theme-on-primary)',
                          }}
                        />
                        <div className="client-outcome-name-wrap">
                          <span className="client-outcome-name">{row.clientName}</span>
                          
                        </div>
                      </div>
                    </td>

                    {OUTCOMES.map((o) => {
                      const outcomeScore = row.outcomeAvgs[o];
                      const c = scoreToHeatCellColor(outcomeScore);
                      const mutedBg = withAlpha(c, 0.10);
                      const isRated = typeof outcomeScore === 'number';
                      return (
                        <td key={o} className="client-outcome-td client-outcome-td--heat">
                          <div
                            className="heatmap-score-box"
                            style={{
                              background: isRated ? mutedBg : 'var(--forge-theme-surface-dim)',
                              color: isRated ? c : 'var(--forge-theme-text-low)',
                            }}
                          >
                            {isRated ? outcomeScore.toFixed(1) : '—'}
                          </div>
                        </td>
                      );
                    })}

                    <td className="client-outcome-td client-outcome-td--heat overall-score">
                      <div
                        className="heatmap-score-box heatmap-score-box--overall"
                        style={{ background: scoreToHeatCellColor(row.overall), color: '#fff' }}
                      >
                        {row.overall.toFixed(1)}
                      </div>
                    </td>

                    <td className="client-outcome-td client-outcome-td--date">{row.dateStr}</td>

                    <td className="client-outcome-td client-outcome-td--actions">
                      <div className="client-outcome-actions">
                        <ForgeButton
                          variant={row.isDraft ? 'tonal' : 'outlined'}
                          className="client-outcome-view-btn"
                          onClick={() => onOpenCompletedAssessment?.(row.assessment)}
                        >
                          {row.isDraft ? 'Continue' : (
                            <>
                              View results
                            </>
                          )}
                          {row.isDraft ? <ForgeIcon name="arrow_forward" slot="end" external /> : null}
                        </ForgeButton>
                        <ForgeIconButton
                          aria-label="Delete assessment"
                          className="client-outcome-delete-btn"
                          onClick={() => handleDeleteAssessment(row.id)}
                        >
                          <ForgeIcon name="delete" external />
                        </ForgeIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isHistoryLoading && clientOutcomeRows.length > 0 && (
            <ForgePaginator
              pageIndex={historyPageIndex}
              pageSize={historyPageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              total={clientOutcomeRows.length}
              firstLast
              on-forge-paginator-change={handleHistoryPageChange}
            />
          )}
        </ForgeCard>
      )}

      {/* Chart */}
      <ForgeCard className="chart-card" raised>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0rem' }}>
          <h2 className="forge-typography--heading4 text-forge-text-high m-0" slot="start">Client assessment comparison chart</h2>
          <p className="forge-typography--body1 text-forge-text-low mb-4 mt-2">Each line shows a client&apos;s score range, with colored points for each outcome.</p>
        </div>
        <div style={{ height: chartHeight }}>
          <Scatter data={chartData} options={chartOptions} />
        </div>
        {clientOutcomeRows.length > 0 && (
          <ForgePaginator
            pageIndex={chartPageIndex}
            pageSize={chartPageSize}
            pageSizeOptions={[5, 10, 25, 50]}
            total={clientOutcomeRows.length}
            firstLast
            on-forge-paginator-change={handleChartPageChange}
          />
        )}
      </ForgeCard>
      </div>

      {/* Drawer always mounted so it has direction="right" before first open (fixes slide animation) */}
      <div className="detail-drawer-inline">
        <DetailPanel
          responsibility={selectedResp ? RESPONSIBILITIES.find((r) => r.id === selectedResp) : null}
          onClose={() => setSelectedResp(null)}
        />
      </div>

    </div>
  );
}
