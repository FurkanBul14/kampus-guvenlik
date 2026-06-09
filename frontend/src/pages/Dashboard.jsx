import React, { useState, useEffect, useCallback } from 'react';
import { socket, connectSocket } from '../services/socket';
import { devicesAPI, alarmsAPI } from '../services/api';
import LiveChart from '../components/LiveChart';
import AlarmCard from '../components/AlarmCard';
import DeviceCard from '../components/DeviceCard';

const MAX_CHART_POINTS = 60;

function StatCard({ icon, label, value, sub, color = 'text-blue-400' }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`text-3xl ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-sm text-slate-400">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({ activeDevices: 0, alarmsToday: 0, highRisk: 0, avgRisk: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [devRes, alarmRes, statsRes] = await Promise.all([
        devicesAPI.getAll(),
        alarmsAPI.getAll({ limit: 10, resolved: false }),
        alarmsAPI.getStats()
      ]);

      const devList = devRes.data.data;
      const alarmList = alarmRes.data.data;
      const alarmStats = statsRes.data.data;

      setDevices(devList);
      setAlarms(alarmList);

      const active = devList.filter((d) => d.status === 'active').length;
      setStats({
        activeDevices: active,
        alarmsToday: alarmStats.todayCount || 0,
        highRisk: devList.filter((d) => d.riskScore >= 75).length,
        avgRisk: 0
      });
    } catch (_err) {
      // silently handle - user sees stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    connectSocket();
    loadData();

    const onSensorUpdate = (data) => {
      setChartData((prev) => {
        const point = {
          time: new Date(data.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          audioLevel: data.sensors?.audioLevel ?? 0,
          riskScore: data.riskScore ?? 0
        };
        return [...prev.slice(-MAX_CHART_POINTS + 1), point];
      });
    };

    const onAlarmNew = (alarm) => {
      setAlarms((prev) => [alarm, ...prev.slice(0, 9)]);
      setStats((prev) => ({ ...prev, alarmsToday: prev.alarmsToday + 1 }));
    };

    const onDeviceStatus = ({ deviceId, status }) => {
      setDevices((prev) =>
        prev.map((d) => (d._id === deviceId ? { ...d, status } : d))
      );
      if (status === 'active') {
        setStats((prev) => ({ ...prev, activeDevices: prev.activeDevices + 1 }));
      }
    };

    socket.on('sensor:update', onSensorUpdate);
    socket.on('alarm:new', onAlarmNew);
    socket.on('device:status', onDeviceStatus);

    const refreshInterval = setInterval(loadData, 30000);

    return () => {
      socket.off('sensor:update', onSensorUpdate);
      socket.off('alarm:new', onAlarmNew);
      socket.off('device:status', onDeviceStatus);
      clearInterval(refreshInterval);
    };
  }, [loadData]);

  async function resolveAlarm(id) {
    try {
      await alarmsAPI.resolve(id);
      setAlarms((prev) => prev.filter((a) => a._id !== id));
    } catch (_err) {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  const onlineDevices = devices.filter((d) => d.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <span className="text-xs text-slate-500">
          Auto-refreshes every 30s · Real-time via Socket.io
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📱" label="Active Devices" value={stats.activeDevices} color="text-green-400" />
        <StatCard icon="🔔" label="Alarms Today" value={stats.alarmsToday} color="text-yellow-400" />
        <StatCard icon="🚨" label="Unresolved Alarms" value={alarms.length} color="text-red-400" />
        <StatCard icon="📊" label="Total Devices" value={devices.length} color="text-blue-400" />
      </div>

      {/* Chart + Alarms */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <LiveChart data={chartData} title="Live Sensor Feed (last 60 readings)" />
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-200 mb-3">
            Active Alarms
            {alarms.length > 0 && (
              <span className="ml-2 bg-red-900 text-red-300 text-xs px-1.5 py-0.5 rounded">
                {alarms.length}
              </span>
            )}
          </h3>
          {alarms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <span className="text-3xl mb-2">✅</span>
              <p className="text-sm">No active alarms</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {alarms.map((alarm) => (
                <AlarmCard key={alarm._id} alarm={alarm} onResolve={resolveAlarm} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Device grid */}
      <div>
        <h3 className="font-semibold text-slate-200 mb-3">
          Device Status
          <span className="ml-2 text-xs text-slate-500 font-normal">
            {onlineDevices.length} / {devices.length} online
          </span>
        </h3>
        {devices.length === 0 ? (
          <div className="card text-center text-slate-500 py-8">
            No devices registered. Register a device to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devices.map((device) => (
              <DeviceCard key={device._id} device={device} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
