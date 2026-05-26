import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ForgeScaffold,
  ForgeAppBar,
  ForgeTabBar,
  ForgeTab,
  ForgeBadge,
  ForgeIcon,
} from '@tylertech/forge-react';
import { supabase } from './supabase';
import { readStoredView, writeStoredView, clearAssessmentSession } from './sessionPersistence';
import Dashboard from './components/Dashboard';
import AssessmentTool from './components/AssessmentTool';
import GanttChart from './components/GanttChart';

const WORKSPACE_ID = 'default';
const ASSESSMENT_META_KEY = '__scm_meta';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'dashboard' },
  { id: 'assessment', label: 'Assessment', icon: 'assignment' },
  { id: 'planning',   label: 'Planning',   icon: 'calendar_month' },
];

const VIEW_TO_INDEX = { dashboard: 0, assessment: 1, planning: 2 };
const INDEX_TO_VIEW = ['dashboard', 'assessment', 'planning'];

function withAssessmentMeta(scores, metaPatch = {}) {
  const base = scores && typeof scores === 'object' ? { ...scores } : {};
  const prevMeta = base[ASSESSMENT_META_KEY] && typeof base[ASSESSMENT_META_KEY] === 'object'
    ? base[ASSESSMENT_META_KEY]
    : {};
  base[ASSESSMENT_META_KEY] = { ...prevMeta, ...metaPatch };
  return base;
}

function getAssessmentMeta(scores) {
  if (!scores || typeof scores !== 'object') return {};
  const meta = scores[ASSESSMENT_META_KEY];
  return meta && typeof meta === 'object' ? meta : {};
}

export default function App() {
  const [view, setView]                 = useState(readStoredView);
  const [assessmentResults, setResults] = useState(null);
  const [ganttItems, setGanttItems]     = useState([]);
  const [assessmentScreen, setAssessmentScreen] = useState('intro');
  const [pendingHistoricalView, setPendingHistoricalView] = useState(null);
  const [activeAssessmentContext, setActiveAssessmentContext] = useState(null);
  const [readyToPersist, setReadyToPersist]     = useState(false);
  const [syncError, setSyncError]               = useState(null);
  const tabBarRef = useRef(null);

  const lockMainScroll = view === 'assessment' && assessmentScreen !== 'results';

  const activeTabIndex = VIEW_TO_INDEX[view] ?? 0;

  useEffect(() => {
    writeStoredView(view);
  }, [view]);

  // Load workspace from Supabase on mount (only persist after this has run)
  useEffect(() => {
    if (!supabase) {
      setReadyToPersist(true);
      return;
    }
    supabase
      .from('workspace')
      .select('assessment_scores, gantt_items')
      .eq('id', WORKSPACE_ID)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') {
          setSyncError(error.message);
        } else if (data) {
          setResults(data.assessment_scores ?? null);
          setGanttItems(Array.isArray(data.gantt_items) ? data.gantt_items : []);
        }
        setReadyToPersist(true);
      })
      .catch((err) => {
        setSyncError(err?.message ?? 'Load failed');
        setReadyToPersist(true);
      });
  }, []);

  // Persist workspace whenever assessment or gantt items change (after initial load)
  useEffect(() => {
    if (!readyToPersist || !supabase) return;
    setSyncError(null);
    supabase
      .from('workspace')
      .upsert(
        {
          id: WORKSPACE_ID,
          assessment_scores: assessmentResults,
          gantt_items: ganttItems,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .then(({ error }) => {
        if (error) setSyncError(error.message);
      })
      .catch((err) => setSyncError(err?.message ?? 'Save failed'));
  }, [readyToPersist, assessmentResults, ganttItems]);

  const handleTabBarChange = useCallback((e) => {
    const index = e?.detail?.selectedIndex ?? e?.detail?.index ?? 0;
    setView(INDEX_TO_VIEW[Number(index)] ?? 'dashboard');
  }, []);

  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    el.addEventListener('forge-tab-bar-change', handleTabBarChange);
    return () => el.removeEventListener('forge-tab-bar-change', handleTabBarChange);
  }, [handleTabBarChange]);

  useEffect(() => {
    if (view !== 'assessment') setPendingHistoricalView(null);
  }, [view]);

  const dismissHistoricalContext = useCallback(() => {
    setPendingHistoricalView(null);
  }, []);

  function addToGantt(items, options = {}) {
    setGanttItems(prev => {
      const ids = new Set(prev.map(x => x.id));
      return [...prev, ...items.filter(x => !ids.has(x.id))];
    });
    if (options.navigateToPlanning !== false) {
      setView('planning');
    }
  }

  function updateGanttItem(id, patch) {
    setGanttItems(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  function deleteGanttItem(id) {
    setGanttItems(prev => prev.filter(x => x.id !== id));
  }

  return (
    <ForgeScaffold viewport className="app-page">
      <div slot="header" className="app-header">
        <ForgeAppBar
          theme-mode="scoped"
          title-text="Strategic Capability Model"
        >
          <ForgeIcon name="tyler_talking_t_logo" slot="logo" external />
          {syncError && (
            <span slot="end" className="forge-typography--label1 text-forge-error" style={{ marginRight: '0.5rem' }}>
              Sync failed
            </span>
          )}
        </ForgeAppBar>
        <div
          className={`app-tab-wrap${view === 'assessment' && (assessmentScreen === 'assess' || assessmentScreen === 'results') ? ' app-tab-wrap--hidden' : ''}`}
        >
          <ForgeTabBar
            ref={tabBarRef}
            activeTab={activeTabIndex}
          >
            {TABS.map((tab) => (
              <ForgeTab key={tab.id}>
                <ForgeIcon name={tab.icon} slot="start" external />
                {tab.label}
                {tab.id === 'planning' && ganttItems.length > 0 && (
                  <ForgeBadge slot="end" theme="primary">{ganttItems.length}</ForgeBadge>
                )}
              </ForgeTab>
            ))}
          </ForgeTabBar>
        </div>
      </div>
      <main slot="body" className={`app-main ${lockMainScroll ? 'app-main--assessment' : ''}`}>
        <div className="app-content">
          {view === 'dashboard' && (
            <Dashboard
              onStartAssessment={() => {
                clearAssessmentSession();
                setAssessmentScreen('intro');
                setActiveAssessmentContext(null);
                setView('assessment');
              }}
              onOpenCompletedAssessment={(a) => {
                const meta = getAssessmentMeta(a.scores);
                const isDraft = meta?.isDraft === true;
                setPendingHistoricalView({
                  id: a.id,
                  scores: a.scores,
                  completedAt: a.created_at,
                  clientName: a.client_name || '',
                  mode: isDraft ? 'draft' : 'completed',
                  resumeIndex: Number.isFinite(Number(meta?.resumeIndex)) ? Number(meta.resumeIndex) : 0,
                });
                setActiveAssessmentContext({
                  assessmentId: a.id,
                  clientName: a.client_name || '',
                  isDraft,
                });
                setView('assessment');
              }}
            />
          )}
          {view === 'assessment' && (
            <AssessmentTool
              onBackToDashboard={() => setView('dashboard')}
              onComplete={(payload) => {
                const { scores, clientName } = payload || {};
                const existingAssessmentId = activeAssessmentContext?.assessmentId;
                const optimisticAssessmentId = existingAssessmentId || `pending-${Date.now()}`;
                const finalizedScores = withAssessmentMeta(scores, { isDraft: false, resumeIndex: 0 });
                setResults(scores);
                setActiveAssessmentContext({
                  assessmentId: optimisticAssessmentId,
                  clientName: clientName || '',
                  isDraft: false,
                });
                if (supabase) {
                  const query = activeAssessmentContext?.isDraft
                    ? supabase
                        .from('assessments')
                        .update({ scores: finalizedScores, client_name: clientName })
                        .eq('id', existingAssessmentId)
                        .select('id, client_name')
                        .single()
                    : supabase
                        .from('assessments')
                        .insert({ scores: finalizedScores, client_name: clientName })
                        .select('id, client_name')
                        .single();
                  query.then(({ data }) => {
                    if (data?.id) {
                      setGanttItems((prev) =>
                        prev.map((item) =>
                          item.assessmentId === optimisticAssessmentId
                            ? { ...item, assessmentId: data.id, clientName: data.client_name || clientName || item.clientName }
                            : item
                        )
                      );
                      setActiveAssessmentContext({
                        assessmentId: data.id,
                        clientName: data.client_name || clientName || '',
                        isDraft: false,
                      });
                    }
                  });
                }
              }}
              onSaveProgress={(payload) => {
                const { scores, clientName, idx } = payload || {};
                const existingAssessmentId = activeAssessmentContext?.assessmentId;
                const draftScores = withAssessmentMeta(scores, {
                  isDraft: true,
                  resumeIndex: Number.isFinite(Number(idx)) ? Number(idx) : 0,
                });
                const optimisticAssessmentId = existingAssessmentId || `pending-${Date.now()}`;
                setActiveAssessmentContext({
                  assessmentId: optimisticAssessmentId,
                  clientName: clientName || '',
                  isDraft: true,
                });
                if (!supabase) return;
                const query = existingAssessmentId
                  ? supabase
                      .from('assessments')
                      .update({ scores: draftScores, client_name: clientName })
                      .eq('id', existingAssessmentId)
                      .select('id, client_name')
                      .single()
                  : supabase
                      .from('assessments')
                      .insert({ scores: draftScores, client_name: clientName })
                      .select('id, client_name')
                      .single();
                query.then(({ data }) => {
                  if (data?.id) {
                    setActiveAssessmentContext({
                      assessmentId: data.id,
                      clientName: data.client_name || clientName || '',
                      isDraft: true,
                    });
                  }
                });
              }}
              onDeleteProgress={async () => {
                const existingAssessmentId = activeAssessmentContext?.assessmentId;
                setActiveAssessmentContext(null);
                if (!supabase || !existingAssessmentId) return;
                await supabase
                  .from('assessments')
                  .delete()
                  .eq('id', existingAssessmentId);
              }}
              onAddToGantt={addToGantt}
              plannerItems={ganttItems}
              onUpdatePlannerItem={updateGanttItem}
              onDeletePlannerItem={deleteGanttItem}
              onOpenPlanningTab={() => setView('planning')}
              activeAssessmentContext={activeAssessmentContext}
              onScreenChange={setAssessmentScreen}
              pendingHistoricalView={pendingHistoricalView}
              onDismissHistoricalContext={dismissHistoricalContext}
            />
          )}
          {view === 'planning' && (
            <GanttChart
              items={ganttItems}
              assessmentResults={assessmentResults}
              onAddItem={item => setGanttItems(prev => [...prev, item])}
              onUpdateItem={updateGanttItem}
              onDeleteItem={deleteGanttItem}
              variant="full"
              className="full-action-plan"
            />
          )}
        </div>
      </main>
    </ForgeScaffold>
  );
}
