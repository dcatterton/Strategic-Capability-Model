import { useState, useRef } from 'react';
import {
  ForgeDialog,
  ForgeToolbar,
  ForgeIconButton,
  ForgeIcon,
  ForgeBadge,
  ForgeTextField,
  ForgeSelect,
  ForgeOption,
  ForgeButtonToggleGroup,
  ForgeButtonToggle,
  ForgeButton,
  ForgeCard,
  ForgePageState,
} from '@tylertech/forge-react';
import { RESPONSIBILITIES } from '../data';

// ─── helpers ────────────────────────────────────────────────────────────────
function toCol(year, quarter) { return (year - 1) * 4 + quarter; } // 1–8
function fromCol(col) {
  const year = Math.ceil(col / 4);
  return { year, quarter: col - (year - 1) * 4 };
}
function normalize(item) {
  if (item.startYear !== undefined) return item;
  return { ...item, startYear: item.year||1, startQuarter: item.quarter||1, endYear: item.year||1, endQuarter: item.quarter||1 };
}
// Greedy lane-packing: no two items in same lane overlap
function assignLanes(items) {
  const sorted = [...items].sort((a,b) => toCol(a.startYear,a.startQuarter) - toCol(b.startYear,b.startQuarter));
  const laneEnds = [];
  return sorted.map(item => {
    const s = toCol(item.startYear, item.startQuarter);
    const e = toCol(item.endYear,   item.endQuarter);
    let lane = laneEnds.findIndex(end => end < s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); }
    else laneEnds[lane] = e;
    return { item, lane };
  });
}

// ─── constants ───────────────────────────────────────────────────────────────
const PRIORITY_META = {
  High:   { dot: 'bg-forge-error' },
  Medium: { dot: 'bg-forge-warning' },
  Low:    { dot: 'bg-forge-success' },
};
const PRIORITY_CARD_COLORS = {
  Low: 'var(--forge-theme-success)',
  Medium: 'var(--forge-theme-secondary)',
  High: 'var(--forge-theme-error)',
};

function getPriorityCardColor(priority) {
  return PRIORITY_CARD_COLORS[priority] || PRIORITY_CARD_COLORS.Medium;
}
const COLS = [
  {col:1,year:1,q:1},{col:2,year:1,q:2},{col:3,year:1,q:3},{col:4,year:1,q:4},
  {col:5,year:2,q:1},{col:6,year:2,q:2},{col:7,year:2,q:3},{col:8,year:2,q:4},
];

// ─── Add / Edit modal ─────────────────────────────────────────────────────────
function ItemModal({ item, defaultYear, defaultQuarter, onSave, onCancel }) {
  const isEdit = Boolean(item);
  const [form, setForm] = useState(isEdit ? {
    ...item,
    startYear: item.startYear||1, startQuarter: item.startQuarter||1,
    endYear:   item.endYear||1,   endQuarter:   item.endQuarter||1,
  } : {
    title:'', description:'',
    startYear: defaultYear||1, startQuarter: defaultQuarter||1,
    endYear:   defaultYear||1, endQuarter:   defaultQuarter||1,
    priority:'Medium', responsibilityId:'', responsibilityName:'', color: PRIORITY_CARD_COLORS.Medium, clientName: '',
  });
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  function handleStartChange(e) {
    const val = Number(e?.target?.value ?? e?.detail ?? e);
    if (Number.isNaN(val)) return;
    const {year:sy, quarter:sq} = fromCol(val);
    const ec = Math.max(val, toCol(form.endYear, form.endQuarter));
    const {year:ey, quarter:eq} = fromCol(ec);
    setForm(p => ({...p, startYear:sy, startQuarter:sq, endYear:ey, endQuarter:eq}));
  }
  function handleEndChange(e) {
    const val = Number(e?.target?.value ?? e?.detail ?? e);
    if (Number.isNaN(val)) return;
    const {year:ey, quarter:eq} = fromCol(val);
    const sc = Math.min(val, toCol(form.startYear, form.startQuarter));
    const {year:sy, quarter:sq} = fromCol(sc);
    setForm(p => ({...p, endYear:ey, endQuarter:eq, startYear:sy, startQuarter:sq}));
  }
  function handleRespChange(e) {
    const id = e?.target?.value ?? e?.detail ?? '';
    const r = RESPONSIBILITIES.find(x => x.id === id);
    set('responsibilityId', id);
    set('responsibilityName', r?.name || '');
  }
  const startCol = toCol(form.startYear, form.startQuarter);
  const endCol   = toCol(form.endYear,   form.endQuarter);
  const span     = endCol - startCol + 1;

  return (
    <ForgeDialog open className="item-modal">
      <forge-scaffold>
      <ForgeToolbar slot="header" className="bg-forge-brand">
        <h2 className="forge-typography--heading4 m-0" slot="start">{isEdit ? 'Edit Step' : 'Add New Step'}</h2>
        <ForgeIconButton aria-label="Close" onClick={onCancel} slot="end">
          <ForgeIcon name="close" external />
        </ForgeIconButton>
      </ForgeToolbar>
      <div className="item-modal-body" slot="body">
        <ForgeTextField>
          <label htmlFor="item-modal-title">Step Title *</label>
          <input id="item-modal-title" type="text" value={form.title} onChange={e=>set('title',e.target.value)}
            placeholder="e.g. Implement eFile Analytics" />
        </ForgeTextField>
        <ForgeTextField>
          <label htmlFor="item-modal-desc">Description</label>
          <textarea id="item-modal-desc" value={form.description} onChange={e=>set('description',e.target.value)} rows={2} />
        </ForgeTextField>
        <div className="item-modal-grid">
          <div>
            <label className="forge-typography--overline text-forge-text-medium mb-1.5 block">Start</label>
            <ForgeSelect value={String(startCol)} on-change={handleStartChange}>
              {COLS.map(({col,year,q}) => (
                <ForgeOption key={col} value={String(col)}>Q{q} · Year {year}</ForgeOption>
              ))}
            </ForgeSelect>
          </div>
          <div>
            <label className="forge-typography--overline text-forge-text-medium mb-1.5 block">End</label>
            <ForgeSelect value={String(endCol)} on-change={handleEndChange}>
              {COLS.map(({col,year,q}) => (
                <ForgeOption key={col} value={String(col)}>Q{q} · Year {year}</ForgeOption>
              ))}
            </ForgeSelect>
          </div>
        </div>
        {span > 1 && (
          <p className="forge-typography--label2 text-forge-primary -mt-2 flex items-center gap-1">
            <ForgeIcon name="calendar_view_week" style={{ fontSize: 14 }} external />
            Spans {span} quarter{span > 1 ? 's' : ''}
          </p>
        )}
        <div>
          <label className="forge-typography--overline text-forge-text-medium mb-2 block">Priority</label>
          <ForgeButtonToggleGroup key={isEdit ? `priority-${item?.id}` : 'priority-new'} stretch>
            {['High','Medium','Low'].map(p => (
              <ForgeButtonToggle
                key={p}
                value={p}
                selected={form.priority === p}
                on-forge-button-toggle-select={() => set('priority', p)}
              >
                {p}
              </ForgeButtonToggle>
            ))}
          </ForgeButtonToggleGroup>
        </div>
        <div>
          <label className="forge-typography--overline text-forge-text-medium mb-1.5 block">Responsibility Area</label>
          <ForgeSelect value={form.responsibilityId} on-change={handleRespChange}>
            <ForgeOption value="">— None —</ForgeOption>
            {RESPONSIBILITIES.map(r => (
              <ForgeOption key={r.id} value={r.id}>{r.name}</ForgeOption>
            ))}
          </ForgeSelect>
        </div>
        <ForgeTextField>
          <label htmlFor="item-modal-client-name">Client name</label>
          <input
            id="item-modal-client-name"
            type="text"
            value={form.clientName || ''}
            onChange={e => set('clientName', e.target.value)}
            placeholder="e.g. Redwood County, TX"
          />
        </ForgeTextField>
      </div>
      <ForgeToolbar inverted slot="footer" className="item-modal-footer">
        <ForgeButton variant="text" slot="end"onClick={onCancel} >Cancel</ForgeButton>
        <ForgeButton
          variant="filled"
          slot="end"
          className="ml-3"
          onClick={() => onSave({
            ...form,
            id:item?.id||`manual-${Date.now()}`,
            color: getPriorityCardColor(form.priority),
          })}
          disabled={!form.title.trim()}
        >
            {isEdit ? 'Save Changes' : 'Add Step'}
          </ForgeButton>
        </ForgeToolbar>
      </forge-scaffold>
    </ForgeDialog>
  );
}

// ─── Gantt bar (spans N columns) ─────────────────────────────────────────────
function GanttBar({ item, onEdit, onDelete, isDragging, onDragStart }) {
  const resp = RESPONSIBILITIES.find(r => r.id === item.responsibilityId);
  const span = toCol(item.endYear, item.endQuarter) - toCol(item.startYear, item.startQuarter) + 1;
  const cardColor = getPriorityCardColor(item.priority);

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('itemId', item.id); e.dataTransfer.effectAllowed='move'; onDragStart(item.id); }}
      className={`gantt-bar shadow-forge-1 ${isDragging ? 'dragging' : ''}`}
    >
      <div className="gantt-bar__strip" style={{ background: cardColor }} />
      <div className="gantt-bar__inner">
      {resp && <span className="text-forge-text-medium forge-typography--label1 truncate">{resp.name}</span>}

        <p className="gantt-bar__title forge-typography--label2 text-forge-text-high leading-snug m-0">
          {item.title}
        </p>
        <div className="gantt-bar__meta">
          {item.clientName && (
            <ForgeBadge theme="info-secondary" className="truncate">
              <ForgeIcon name="person" slot="start" external style={{ fontSize: 12 }} />
              {item.clientName}
            </ForgeBadge>
          )}
          {/* {span > 1 && (
            <span className="text-forge-text-low bg-forge-surface-min px-1 py-0.5 rounded border border-forge-outline" style={{ fontSize: 9 }}>
              {span}Q
            </span>
          )} */}
        </div>
        {/* {item.description && span >= 2 && (
          <p className="m-0 text-forge-text-low leading-relaxed line-clamp-1" style={{ fontSize: 10 }}>{item.description}</p>
        )} */}
        <div className="gantt-bar__controls">
          <div className="gantt-bar__actions">
            <ForgeIconButton aria-label="Edit" onClick={e=>{e.stopPropagation();onEdit(item);}} className="p-0.5 text-forge-text-low">
              <ForgeIcon name="edit" style={{ fontSize: 13 }} external />
            </ForgeIconButton>
            <ForgeIconButton aria-label="Delete" onClick={e=>{e.stopPropagation();onDelete(item.id);}} className="p-0.5 text-forge-text-low">
              <ForgeIcon name="delete" style={{ fontSize: 13 }} external />
            </ForgeIconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function GanttChart({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  variant = 'full',
  className = '',
  headerTitle,
  headerSubtitle,
  headerActions = null,
}) {
  const [modal, setModal]           = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOver]  = useState(null);
  const [filterPriority, setFilterP] = useState('All');
  const [filterRespIds, setFilterRespIds] = useState([]);
  const [filterClients, setFilterClients] = useState([]);
  const ganttRef                     = useRef(null);

  const normItems = items.map(normalize);

  const clientOptions = Array.from(
    new Set(items.map((i) => (i.clientName || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  function toMultiSelectValues(event) {
    const raw = event?.target?.value ?? event?.detail?.value ?? event?.detail;
    if (Array.isArray(raw)) return raw.map((v) => String(v)).filter(Boolean);
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
        } catch {
          return [trimmed];
        }
      }
      return trimmed.includes(',')
        ? trimmed.split(',').map((v) => v.trim()).filter(Boolean)
        : [trimmed];
    }
    return [];
  }

  const filtered = normItems.filter(it => {
    if (filterPriority !== 'All' && it.priority !== filterPriority) return false;
    if (filterRespIds.length > 0 && !filterRespIds.includes(it.responsibilityId)) return false;
    if (filterClients.length > 0 && !filterClients.includes(it.clientName || 'Unknown client')) return false;
    return true;
  });
  const activeFilterCount =
    (filterPriority !== 'All' ? 1 : 0) +
    (filterRespIds.length > 0 ? 1 : 0) +
    (filterClients.length > 0 ? 1 : 0);

  const assignments = assignLanes(filtered);
  const numLanes    = assignments.length ? Math.max(...assignments.map(a=>a.lane))+1 : 1;

  function openAdd(year, quarter) { setModal({item:null, year, quarter}); }

  function handleSave(data) {
    if (modal.item) onUpdateItem(data.id, data); else onAddItem(data);
    setModal(null);
  }

  // Positional DnD — calculate target col from mouse X over the gantt body
  function handleDragOver(e) {
    e.preventDefault();
    if (!ganttRef.current || !draggingId) return;
    const rect = ganttRef.current.getBoundingClientRect();
    const col  = Math.max(1, Math.min(8, Math.floor(((e.clientX - rect.left) / rect.width) * 8) + 1));
    setDragOver(col);
  }

  function handleDrop(e) {
    e.preventDefault();
    if (!draggingId || !dragOverCol) return;
    const item = normItems.find(x => x.id === draggingId);
    if (!item) return;
    // Preserve span duration
    const dur    = toCol(item.endYear, item.endQuarter) - toCol(item.startYear, item.startQuarter);
    const newEnd = Math.min(dragOverCol + dur, 8);
    const {year:sy, quarter:sq} = fromCol(dragOverCol);
    const {year:ey, quarter:eq} = fromCol(newEnd);
    onUpdateItem(draggingId, {startYear:sy, startQuarter:sq, endYear:ey, endQuarter:eq});
    setDraggingId(null);
    setDragOver(null);
  }

  function handleDragEnd() { setDraggingId(null); setDragOver(null); }
  function clearAllFilters() {
    setFilterP('All');
    setFilterRespIds([]);
    setFilterClients([]);
  }

  const totalHigh = items.filter(i=>i.priority==='High').length;
  const totalClients = new Set(
    items
      .map((i) => (i.clientName || '').trim())
      .filter(Boolean)
  ).size;
  const resolvedHeaderTitle = headerTitle || (variant === 'client' ? 'Client specific action plan' : 'Full action plan');
  const resolvedHeaderSubtitle = headerSubtitle || 'Steps can span multiple quarters · drag to move · edit to resize';

  const rootClassName = `gantt-page ${variant === 'client' ? 'gantt-page--client' : 'gantt-page--full'} ${className}`.trim();

  if (items.length === 0 && variant !== 'client') return (
    <div className={rootClassName}>
      <ForgeCard className="gantt-header">
        <div>
          <h1 className="forge-typography--heading3 m-0 mb-1">{resolvedHeaderTitle}</h1>
          <p className="forge-typography--body2 m-0 opacity-75">{resolvedHeaderSubtitle}</p>
        </div>
        <div className="gantt-header-stats">
          <ForgeButton variant="filled" onClick={()=>openAdd(1,1)} className="bg-forge-on-primary text-forge-primary">
            <ForgeIcon name="add" slot="start" external />
            Add Step
          </ForgeButton>
          {headerActions}
        </div>
      </ForgeCard>
      <ForgePageState>
        <ForgeIcon slot="graphic" name="calendar_month" className="text-forge-outline block mb-4" style={{ fontSize: 48 }} external />
        <div slot="title" className="forge-typography--heading4 text-forge-text-medium">Your roadmap is empty</div>
        <div slot="message" className="forge-typography--body2 text-forge-text-low max-w-md mx-auto leading-relaxed">
          Run an assessment and click <strong>Add to Plan</strong> on the recommendations, or add steps manually.
        </div>
        <ForgeButton variant="filled" slot="action" onClick={()=>openAdd(1,1)}>
          <ForgeIcon name="add" slot="start" external />
          Add First Step
        </ForgeButton>
      </ForgePageState>
      {modal && <ItemModal item={modal.item} defaultYear={modal.year} defaultQuarter={modal.quarter} onSave={handleSave} onCancel={()=>setModal(null)} />}
    </div>
  );

  return (
    <div className={rootClassName}>
      {/* Header */}
      <ForgeCard raised>
        <div className="gantt-header">
        <div>
          <h1 className="forge-typography--heading3 m-0 mb-1">{resolvedHeaderTitle}</h1>
          <p className="forge-typography--body1 m-0 opacity-75">{resolvedHeaderSubtitle}</p>
        </div>
        <div className="gantt-header-stats">
          <div className="text-center"><div className="forge-typography--heading4 font-bold">{items.length}</div><div className="forge-typography--label1 opacity-75 mt-1">Total Steps</div></div>
          {variant === 'full' && (
            <>
              <div className="divider-v" />
              <div className="text-center"><div className="forge-typography--heading4 font-bold">{totalClients}</div><div className="forge-typography--label1 opacity-75 mt-1">Clients</div></div>
            </>
          )}
          <div className="divider-v" />
          <div className="text-center"><div className="forge-typography--heading4 font-bold" style={{ color: 'var(--forge-theme-error)' }}>{totalHigh}</div><div className="forge-typography--label1 opacity-75 mt-1">High Priority</div></div>
          <div className="divider-v" />
          <ForgeButton variant="filled" onClick={()=>openAdd(1,1)} className="bg-forge-on-primary text-forge-primary">
            <ForgeIcon name="add" slot="start" external />
            Add Step
          </ForgeButton>
          {headerActions}
        </div>
        </div>
      </ForgeCard>

      {/* Filters + Gantt grid */}
      <ForgeCard raised className={variant === 'client' ? 'gantt-main-card' : ''}>
        <div className="gantt-filters">
          <div className="flex items-center gap-2">
            <span className="forge-typography--overline text-forge-text-low">Priority:</span>
            <ForgeButtonToggleGroup>
              {['All','High','Medium','Low'].map((p) => (
                <ForgeButtonToggle
                  key={p}
                  value={p}
                  selected={filterPriority === p}
                  on-forge-button-toggle-select={() => setFilterP(p)}
                >
                  {p}
                </ForgeButtonToggle>
              ))}
            </ForgeButtonToggleGroup>
          </div>
          <div className="flex items-center gap-2">
            <span className="forge-typography--overline text-forge-text-low">Responsibilities:</span>
            <ForgeSelect
            placeholder="Select responsibilities"
              multiple
              showSelectAll
              value={filterRespIds}
              on-change={(e) => setFilterRespIds(toMultiSelectValues(e))}
            >
              {RESPONSIBILITIES.map(r => (
                <ForgeOption key={r.id} value={r.id}>{r.name}</ForgeOption>
              ))}
            </ForgeSelect>
          </div>
          <div className="flex items-center gap-2">
            <span className="forge-typography--overline text-forge-text-low">Client:</span>
            <ForgeSelect
              placeholder="Select clients"
              multiple
              showSelectAll
              value={filterClients}
              on-change={(e) => setFilterClients(toMultiSelectValues(e))}
            >
              {clientOptions.map((name) => (
                <ForgeOption key={name} value={name}>{name}</ForgeOption>
              ))}
            </ForgeSelect>
          </div>
          {(filtered.length < items.length || activeFilterCount > 1) && (
            <div className="gantt-filters__actions">
              {filtered.length < items.length && (
                <span className="forge-typography--label1 text-forge-text-low">Showing {filtered.length} of {items.length}</span>
              )}
              {activeFilterCount > 1 && (
                <ForgeButton variant="text" onClick={clearAllFilters}>
                  <ForgeIcon name="filter_alt_off" slot="start" external />
                  Clear all filters
                </ForgeButton>
              )}
            </div>
          )}
        </div>

        <div className="gantt-grid-wrap">
        {/* Year header */}
        <div className="gantt-year-row">
          <div className="gantt-year-cell col-span-4">
            <span className="forge-typography--body2 font-semibold">2026</span>
            <span className="forge-typography--label1 opacity-60">{normItems.filter(i=>i.startYear===1||i.endYear===1).length} steps</span>
          </div>
          <div className="gantt-year-cell col-span-4 y2" style={{ opacity: 0.85 }}>
            <span className="forge-typography--body2 font-semibold">2027</span>
            <span className="forge-typography--label1 opacity-60">{normItems.filter(i=>i.startYear===2||i.endYear===2).length} steps</span>
          </div>
        </div>

        {/* Quarter label header */}
        <div className="gantt-quarter-row">
          {COLS.map(({col,q})=>(
            <div key={col} className={`gantt-quarter-cell ${col<8?'border-r':''}`}>
              <span className="forge-typography--label1 font-semibold text-forge-text-medium">Q{q}</span>
              <span className="forge-typography--label1 text-forge-text-medium bg-forge-outline px-2 py-0.5 rounded-full">
                {normItems.filter(i=>toCol(i.startYear,i.startQuarter)<=col && toCol(i.endYear,i.endQuarter)>=col).length}
              </span>
            </div>
          ))}
        </div>

        {/* Items body — positional drag target */}
        <div
          ref={ganttRef}
          className="gantt-body"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onDragLeave={e => { if (!ganttRef.current?.contains(e.relatedTarget)) setDragOver(null); }}
        >
          {/* Column backgrounds */}
          <div className="gantt-cols-bg">
            {COLS.map(({col})=>(
              <div key={col} className={dragOverCol===col ? 'gantt-drop-active' : col%2===0 ? 'bg-forge-surface' : 'bg-forge-surface-min'} style={col<8 ? { borderRight: '1px solid var(--forge-theme-outline)' } : {}} />
            ))}
          </div>

          {/* Year 1 / Year 2 divider */}
          <div className="absolute inset-y-0 pointer-events-none z-10" style={{ left: '50%', zIndex: 5 }}>
            <div className="absolute inset-y-0 w-px" style={{ background: 'var(--forge-theme-outline-medium)' }} />
          </div>

          {/* CSS grid — item lanes */}
          <div className="gantt-lanes">
            {assignments.map(({item, lane})=>{
              const sc = toCol(item.startYear, item.startQuarter);
              const ec = toCol(item.endYear,   item.endQuarter);
              return (
                <div
                  key={item.id}
                  style={{ gridColumn:`${sc}/${ec+1}`, gridRow: lane+1 }}
                  className="min-w-0"
                  onDragStart={() => setDraggingId(item.id)}
                >
                  <GanttBar
                    item={item}
                    isDragging={draggingId===item.id}
                    onDragStart={setDraggingId}
                    onEdit={it=>setModal({item:it, year:it.startYear, quarter:it.startQuarter})}
                    onDelete={onDeleteItem}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Add row */}
        <div className="gantt-add-row">
          {COLS.map(({col,year,q}) => (
            <div key={col} className={`gantt-add-cell ${col<8?'border-r':''}`}>
              <ForgeButton variant="text" onClick={()=>openAdd(year,q)} className="w-full justify-center py-1 forge-typography--label1 border-dashed">
                <ForgeIcon name="add" style={{ fontSize: 12 }} slot="start" external />
                Add
              </ForgeButton>
            </div>
          ))}
        </div>
        </div>
      </ForgeCard>

      {/* Legend */}
      <ForgeCard raised>
        <div className="gantt-legend">
          {['High','Medium','Low'].map(p => (
            <div key={p} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${PRIORITY_META[p].dot}`} style={{ width: 10, height: 10 }} />
              <span className="forge-typography--label1 text-forge-text-medium">{p} Priority</span>
            </div>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <ForgeIcon name="drag_indicator" className="text-forge-text-low" style={{ fontSize: 14 }} external />
            <span className="forge-typography--label1 text-forge-text-medium">Drag to move (span preserved)</span>
          </div>
          <div className="flex items-center gap-2">
            <ForgeIcon name="open_with" className="text-forge-text-low" style={{ fontSize: 14 }} external />
            <span className="forge-typography--label1 text-forge-text-medium">Edit item to change start / end quarter</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="forge-typography--label1 font-medium text-forge-text-low bg-forge-surface-min px-1.5 rounded border border-forge-outline">2Q</span>
            <span className="forge-typography--label1 text-forge-text-medium">Badge shows quarters spanned</span>
          </div>
        </div>
      </ForgeCard>

      {modal && (
        <ItemModal
          item={modal.item}
          defaultYear={modal.year}
          defaultQuarter={modal.quarter}
          onSave={handleSave}
          onCancel={()=>setModal(null)}
        />
      )}
    </div>
  );
}
