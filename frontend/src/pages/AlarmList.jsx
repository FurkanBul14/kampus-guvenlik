import React, { useState, useEffect } from 'react';
import { alarmsAPI } from '../services/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AlarmCard from '../components/AlarmCard';

const SEVERITY_OPTIONS = ['', 'low', 'medium', 'high', 'critical'];
const TYPE_OPTIONS = ['', 'NOISE_ANOMALY', 'UNUSUAL_MOVEMENT', 'CROWD_DENSITY', 'RESTRICTED_ZONE', 'DEVICE_OFFLINE'];
const TYPE_LABELS = {
  NOISE_ANOMALY: 'Noise Anomaly',
  UNUSUAL_MOVEMENT: 'Unusual Movement',
  CROWD_DENSITY: 'Crowd Density',
  RESTRICTED_ZONE: 'Restricted Zone',
  DEVICE_OFFLINE: 'Device Offline'
};

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

export default function AlarmList() {
  const [alarms, setAlarms] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity: '', type: '', resolved: '' });

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const canResolve = ['admin', 'operator'].includes(user.role);

  useEffect(() => { loadData(); }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filters.severity) params.severity = filters.severity;
      if (filters.type) params.type = filters.type;
      if (filters.resolved !== '') params.resolved = filters.resolved;

      const [alarmRes, statsRes] = await Promise.all([
        alarmsAPI.getAll(params),
        alarmsAPI.getStats()
      ]);
      setAlarms(alarmRes.data.data);
      setStats(statsRes.data.data);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAlarm(id) {
    try {
      await alarmsAPI.resolve(id);
      setAlarms((prev) => prev.map((a) => a._id === id ? { ...a, resolved: true } : a));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve');
    }
  }

  const pieData = stats?.byType?.map((item, i) => ({
    name: TYPE_LABELS[item._id] || item._id,
    value: item.count,
    color: PIE_COLORS[i % PIE_COLORS.length]
  })) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Alarm Management</h1>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Alarms', value: stats.total, color: 'text-blue-400' },
            { label: 'Today', value: stats.todayCount, color: 'text-yellow-400' },
            { label: 'Unresolved', value: stats.unresolvedCount, color: 'text-red-400' },
            { label: 'Resolved', value: (stats.total || 0) - (stats.unresolvedCount || 0), color: 'text-green-400' }
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Filters + Alarm list */}
        <div className="xl:col-span-2 space-y-4">
          {/* Filters */}
          <div className="card flex flex-wrap gap-3">
            <select
              className="input w-auto text-sm"
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            >
              <option value="">All Severities</option>
              {SEVERITY_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            <select
              className="input w-auto text-sm"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              {TYPE_OPTIONS.filter(Boolean).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>

            <select
              className="input w-auto text-sm"
              value={filters.resolved}
              onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>

            <button onClick={loadData} className="btn-ghost text-sm">Refresh</button>
          </div>

          {loading ? (
            <div className="card text-center text-slate-400 py-8 animate-pulse">Loading alarms...</div>
          ) : alarms.length === 0 ? (
            <div className="card text-center text-slate-500 py-12">
              <p className="text-3xl mb-2">✅</p>
              No alarms match current filters
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {alarms.map((alarm) => (
                <AlarmCard
                  key={alarm._id}
                  alarm={alarm}
                  onResolve={canResolve ? resolveAlarm : null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-4">Alarms by Type</h3>
          {pieData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  dataKey="value"
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Severity breakdown */}
          {stats?.bySeverity && (
            <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">By Severity</p>
              {stats.bySeverity.map((item) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className={`badge-${item._id}`}>{item._id}</span>
                  <span className="text-sm font-medium text-slate-300">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
