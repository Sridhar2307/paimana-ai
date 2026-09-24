import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Compass,
  AlertTriangle,
  Layers,
  Search,
  ArrowUpDown,
  Download,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { useDataSource } from '../context/DataSourceContext';
import { crore, pct, cell, shortenMinistry, NOT_AVAILABLE } from '../utils/format';

export default function AnalyticsPage({ onNavigateToProjects }) {
  const [ministries, setMinistries] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [regions, setRegions] = useState([]);
  const [benchmarks, setBenchmarks] = useState(null);
  const [delayTaxonomy, setDelayTaxonomy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View modes: 'ministries' | 'sectors' | 'regions' | 'taxonomy' | 'correlation'
  const [viewMode, setViewMode] = useState('ministries');

  // Search & Sorting for tables
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('avg_risk_score');
  const [sortAsc, setSortAsc] = useState(false);

  const { version } = useDataSource();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getMinistryAnalytics().catch((e) => {
        console.warn('Ministry analytics fallback:', e);
        return [];
      }),
      api.getSectorAnalytics().catch((e) => {
        console.warn('Sector analytics fallback:', e);
        return [];
      }),
      api.getRegionAnalytics().catch((e) => {
        console.warn('Region analytics fallback:', e);
        return [];
      }),
      api.getBenchmarks().catch((e) => {
        console.warn('Benchmarks fallback:', e);
        return null;
      }),
      api.getDelayTaxonomy().catch((e) => {
        console.warn('Delay taxonomy fallback:', e);
        return null;
      }),
    ])
      .then(([min, sec, reg, bench, tax]) => {
        if (!isMounted) return;
        setMinistries(Array.isArray(min) ? min : min?.value || []);
        setSectors(Array.isArray(sec) ? sec : sec?.value || []);
        setRegions(Array.isArray(reg) ? reg : reg?.value || []);
        setBenchmarks(bench || {});
        setDelayTaxonomy(tax || { taxonomy: [] });
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load analytics:', err);
        setError(err.message || 'Failed to aggregate portfolio risk benchmarks');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [version]);

  // Derived current dataset based on viewMode
  const activeDataset = useMemo(() => {
    let list = [];
    if (viewMode === 'ministries') list = ministries;
    else if (viewMode === 'sectors') list = sectors;
    else if (viewMode === 'regions') list = regions;
    else return [];

    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = list.filter((item) => {
        const name = (item.ministry || item.sector || item.region || '').toLowerCase();
        return name.includes(q);
      });
    }

    return [...filtered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle names
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      // Handle numbers
      valA = Number(valA ?? -999999);
      valB = Number(valB ?? -999999);
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [viewMode, ministries, sectors, regions, searchQuery, sortField, sortAsc]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for risk/budgets
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let rows = [];
    let filename = `paimana_${viewMode}_risk_analytics.csv`;

    if (viewMode === 'taxonomy') {
      rows.push(['Delay Category', 'Projects Affected', 'Share (%)', 'Cost Escalation (Cr)', 'Avg Delay (Months)']);
      (delayTaxonomy?.taxonomy || []).forEach((r) => {
        rows.push([
          `"${r.category}"`,
          r.count,
          r.percentage,
          r.cost_escalation_total,
          r.avg_delay_months,
        ]);
      });
    } else {
      const nameHeader = viewMode === 'ministries' ? 'Ministry' : viewMode === 'sectors' ? 'Sector' : 'Region';
      rows.push([nameHeader, 'Projects', 'Total Budget (Cr)', 'Avg Risk Score', 'Avg Cost Escalation (%)', 'Avg Schedule Delay (Mo)', 'Critical Projects']);
      activeDataset.forEach((item) => {
        const name = item.ministry || item.sector || item.region || '';
        rows.push([
          `"${name}"`,
          item.count,
          item.total_budget_cr ?? item.total_cost_cr ?? 0,
          item.avg_risk_score ?? '',
          item.avg_cost_variance_pct ?? '',
          item.avg_schedule_delay_months ?? '',
          item.critical_projects ?? 0,
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-indigo-500/20" />
        <div className="text-center">
          <p className="text-sm font-semibold text-white">Aggregating Cross-Ministry & Sector Benchmarks...</p>
          <p className="text-xs text-slate-500 mt-1">Analyzing statutory delay taxonomy, cost escalations, and ministerial risk indexes</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/30 border border-rose-800 text-rose-200 space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
          <h3 className="text-lg font-bold">Analytics Engine Offline</h3>
        </div>
        <p className="text-xs text-rose-300/80">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
        >
          Retry Analytics Sync
        </button>
      </div>
    );
  }

  const global = benchmarks?.global_benchmarks || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Risk Analytics & Comparative Benchmarking
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cross-portfolio intelligence, ministerial systemic vulnerability, and statutory bottleneck diagnosis
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner overflow-x-auto max-w-full">
            <button
              onClick={() => setViewMode('ministries')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'ministries'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              By Ministry ({ministries.length})
            </button>
            <button
              onClick={() => setViewMode('sectors')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'sectors'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              By Sector ({sectors.length})
            </button>
            <button
              onClick={() => setViewMode('regions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'regions'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              By Region ({regions.length})
            </button>
            <button
              onClick={() => setViewMode('taxonomy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'taxonomy'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              MoSPI Bottlenecks
            </button>
            <button
              onClick={() => setViewMode('correlation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'correlation'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-400 hover:text-purple-200 hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Scatter Matrix
            </button>
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer shadow-sm"
            title="Download CSV extract of current view"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Global Benchmarks KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl border border-slate-700/60 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors pointer-events-none" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            National Mean Risk Score
          </span>
          <div className="text-2xl font-black font-mono text-white mt-1 flex items-baseline gap-1">
            <span>{global.average_risk_score ?? 'Pending'}</span>
            {global.average_risk_score !== null && global.average_risk_score !== undefined && (
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Baseline threshold across active projects
          </span>
        </div>

        <div className="glass-panel rounded-2xl border border-slate-700/60 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Mean Cost Escalation
          </span>
          <div className="text-2xl font-black font-mono text-amber-400 mt-1">
            {global.average_cost_variance_pct !== null && global.average_cost_variance_pct !== undefined
              ? `+${global.average_cost_variance_pct}%`
              : 'Pending'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Weighted budget overrun over original sanction
          </span>
        </div>

        <div className="glass-panel rounded-2xl border border-slate-700/60 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors pointer-events-none" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Mean Schedule Slippage
          </span>
          <div className="text-2xl font-black font-mono text-purple-400 mt-1">
            {global.average_schedule_delay_months !== null && global.average_schedule_delay_months !== undefined
              ? `${global.average_schedule_delay_months} Mo`
              : 'Pending'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Timeline extension beyond original COD
          </span>
        </div>

        <div className="glass-panel rounded-2xl border border-slate-700/60 p-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {viewMode === 'taxonomy'
              ? 'Delayed Projects'
              : viewMode === 'regions'
              ? 'Geographic Zones'
              : 'Monitored Portfolios'}
          </span>
          <div className="text-2xl font-black font-mono text-blue-400 mt-1">
            {viewMode === 'taxonomy'
              ? `${delayTaxonomy?.total_delayed_projects || 0} Projects`
              : viewMode === 'regions'
              ? `${regions.length} Regions`
              : viewMode === 'sectors'
              ? `${sectors.length} Sectors`
              : `${ministries.length} Ministries`}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            {viewMode === 'taxonomy'
              ? 'Statutory IPMD delay classifications'
              : 'Active tracking under Central Ministries'}
          </span>
        </div>
      </div>

      {/* VIEW: MoSPI Statutory 8-Factor Bottlenecks */}
      {viewMode === 'taxonomy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl border border-slate-700/60 p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Delayed Projects by MoSPI Statutory Delay Factor
              </h3>
              <p className="text-xs text-slate-400 mb-4">Official 8-factor classification reported to MoSPI IPMD</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={delayTaxonomy?.taxonomy || []}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 130, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={10}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Projects Affected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-slate-700/60 p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Cumulative Cost Escalation by Root Cause (₹ Cr)
              </h3>
              <p className="text-xs text-slate-400 mb-4">Aggregated budget overrun attributable to specific delay factor</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={delayTaxonomy?.taxonomy || []}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 130, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${v}`} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={10}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(val) => [`₹${Number(val).toLocaleString()} Cr`, 'Cost Escalation']}
                    />
                    <Bar dataKey="cost_escalation_total" fill="#ef4444" radius={[0, 4, 4, 0]} name="Cost Escalation (₹ Cr)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* MoSPI Statutory Matrix Table */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60">
            <div className="p-4.5 border-b border-slate-700/60 bg-slate-900/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  MoSPI 8-Factor Statutory Bottleneck Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Comprehensive breakdown of delays, cost penalties, and sector concentration</p>
              </div>
              <span className="text-xs font-mono text-amber-400/90 bg-amber-950/40 border border-amber-800/50 px-2.5 py-1 rounded-lg">
                IPMD Flash Report Standards
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Statutory Delay Cause</th>
                    <th className="p-3.5 text-center">Share of Delayed Projects</th>
                    <th className="p-3.5 text-center">Projects Affected</th>
                    <th className="p-3.5 text-right">Cost Overrun (₹ Cr)</th>
                    <th className="p-3.5 text-center">Avg Delay</th>
                    <th className="p-3.5">Primary Affected Sectors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(delayTaxonomy?.taxonomy || []).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {row.category}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2 max-w-[140px] mx-auto">
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-2 rounded-full"
                              style={{ width: `${Math.min(100, row.percentage)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-300 w-10 text-right">
                            {row.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-amber-300">
                        {row.count}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-300">
                        {crore(row.cost_escalation_total)}
                      </td>
                      <td className="p-3.5 text-center font-mono text-purple-300">
                        {row.avg_delay_months} mo
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(row.sectors || []).slice(0, 3).map((sec, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300"
                            >
                              {sec.sector}: <strong className="text-white">{sec.count}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Scatter / Correlation Matrix */}
      {viewMode === 'correlation' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl border border-slate-700/60 p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Systemic Risk Correlation: Schedule Slippage vs Cost Escalation
                </h3>
                <p className="text-xs text-slate-400">
                  Each bubble represents an infrastructure sector sized by budget and colored by systemic risk score
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> High Risk (≥50)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium (35-49)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low (&lt;35)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    type="number"
                    dataKey="avg_schedule_delay_months"
                    name="Schedule Delay"
                    unit=" mo"
                    stroke="#64748b"
                    fontSize={11}
                  />
                  <YAxis
                    type="number"
                    dataKey="avg_cost_variance_pct"
                    name="Cost Escalation"
                    unit="%"
                    stroke="#64748b"
                    fontSize={11}
                  />
                  <ZAxis type="number" dataKey="total_budget_cr" range={[60, 400]} name="Total Budget" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    formatter={(value, name) => {
                      if (name === 'Cost Escalation') return [`+${value}%`, name];
                      if (name === 'Schedule Delay') return [`${value} months`, name];
                      if (name === 'Total Budget') return [`₹${Number(value).toLocaleString()} Cr`, name];
                      return [value, name];
                    }}
                  />
                  <ReferenceLine x={8} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Delay Threshold (8mo)', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Cost Overrun Warning (12%)', fill: '#f59e0b', fontSize: 10 }} />
                  <Scatter name="Sectors" data={sectors}>
                    {sectors.map((entry, index) => {
                      const color =
                        entry.avg_risk_score >= 50
                          ? '#ef4444'
                          : entry.avg_risk_score >= 35
                          ? '#f59e0b'
                          : '#10b981';
                      return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} stroke="#fff" strokeWidth={1} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Critical Danger Zone (Top-Right)</span>
                <p className="text-xs text-slate-300 mt-1">
                  Sectors with simultaneous delays &gt;8 months and cost escalations &gt;12% require Cabinet-level project reviews.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Schedule-Driven Slippage</span>
                <p className="text-xs text-slate-300 mt-1">
                  Linear projects (Railways, Expressways) experience prolonged timeline slippage before cost overruns materialize.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Resilient Portfolios</span>
                <p className="text-xs text-slate-300 mt-1">
                  Energy & Renewable clusters maintain low variance through standardized EPC contracts and fast-tracked clearances.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Ministries, Sectors, or Regions */}
      {(viewMode === 'ministries' || viewMode === 'sectors' || viewMode === 'regions') && (
        <div className="space-y-6">
          {/* Dual Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Average Risk Score */}
            <div className="glass-panel rounded-2xl border border-slate-700/60 p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Average Risk Score by {viewMode === 'ministries' ? 'Ministry' : viewMode === 'sectors' ? 'Sector' : 'Region'}
              </h3>
              <p className="text-xs text-slate-400 mb-4">Ranked from highest systemic vulnerability (0-100 scale)</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activeDataset.slice(0, 10)}
                    margin={{ top: 10, right: 10, left: -20, bottom: 35 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey={viewMode === 'ministries' ? 'ministry' : viewMode === 'sectors' ? 'sector' : 'region'}
                      stroke="#64748b"
                      fontSize={10}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      tickFormatter={(val) => (val || '').replace('Ministry of ', '').slice(0, 14)}
                    />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Bar dataKey="avg_risk_score" fill="#ef4444" radius={[4, 4, 0, 0]} name="Avg Risk Score (0-100)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Cost Escalation vs Schedule Delay */}
            <div className="glass-panel rounded-2xl border border-slate-700/60 p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Cost Escalation (%) vs Schedule Delay (Months)
              </h3>
              <p className="text-xs text-slate-400 mb-4">Dual metric impact comparison across monitored entities</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activeDataset.slice(0, 10)}
                    margin={{ top: 10, right: 10, left: -20, bottom: 35 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey={viewMode === 'ministries' ? 'ministry' : viewMode === 'sectors' ? 'sector' : 'region'}
                      stroke="#64748b"
                      fontSize={10}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      tickFormatter={(val) => (val || '').replace('Ministry of ', '').slice(0, 14)}
                    />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Legend verticalAlign="top" height={32} />
                    <Bar dataKey="avg_cost_variance_pct" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cost Escalation (%)" />
                    <Bar dataKey="avg_schedule_delay_months" fill="#a855f7" radius={[4, 4, 0, 0]} name="Delay (Months)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Comprehensive League Table with Search and Sorting */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60">
            <div className="p-4 border-b border-slate-700/60 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-400" />
                  {viewMode === 'ministries'
                    ? 'Ministries League Table'
                    : viewMode === 'sectors'
                    ? 'Sectors League Table'
                    : 'Regional Portfolio League Table'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click column headers to sort • {activeDataset.length} portfolios displayed
                </p>
              </div>

              {/* Search Filter Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${viewMode}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <th
                      className="p-3.5 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort(viewMode === 'ministries' ? 'ministry' : viewMode === 'sectors' ? 'sector' : 'region')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Portfolio Name</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('count')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Projects</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 text-right cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('total_budget_cr')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Outlay (₹ Cr)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('avg_risk_score')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Avg Risk Score</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('avg_cost_variance_pct')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Avg Cost Escalation</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('avg_schedule_delay_months')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Avg Delay</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th
                      className="p-3.5 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('critical_projects')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Critical</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activeDataset.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                        No portfolios match "{searchQuery}"
                      </td>
                    </tr>
                  ) : (
                    activeDataset.map((item, idx) => {
                      const entityName = item.ministry || item.sector || item.region || NOT_AVAILABLE;
                      const displayName = item.ministry ? shortenMinistry(item.ministry) : entityName;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-semibold text-slate-200">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  item.avg_risk_score >= 50
                                    ? 'bg-rose-500'
                                    : item.avg_risk_score >= 35
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <span title={entityName}>{displayName}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-white">
                            {item.count}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-200">
                            {crore(item.total_budget_cr ?? item.total_cost_cr, { fallback: '--' })}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                                item.avg_risk_score >= 50
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : item.avg_risk_score >= 35
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {item.avg_risk_score ?? 'Pending'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono text-amber-400">
                            {pct(item.avg_cost_variance_pct, { fallback: '--', sign: true })}
                          </td>
                          <td className="p-3.5 text-center font-mono text-purple-400">
                            {cell(item.avg_schedule_delay_months, (v) => `${v} mo`)}
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            <span className={item.critical_projects > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                              {item.critical_projects}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {onNavigateToProjects ? (
                              <button
                                onClick={() => onNavigateToProjects(displayName)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors text-[10px] font-semibold cursor-pointer inline-flex items-center gap-1"
                                title={`Inspect projects under ${displayName}`}
                              >
                                <span>Inspect</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <span className="text-slate-600">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
