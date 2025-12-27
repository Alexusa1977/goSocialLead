
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Stats } from '../types.ts';

interface DashboardProps {
  stats: Stats;
}

const COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const barData = Object.entries(stats.platforms).map(([name, value]) => ({ name, value }));
  const pieData = [
    { name: 'High Intent', value: stats.highIntentCount },
    { name: 'Regular', value: stats.totalLeads - stats.highIntentCount },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500">Real-time performance of your lead monitoring.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads Found', value: stats.totalLeads, color: 'text-blue-600', icon: '📈' },
          { label: 'Active Keywords', value: stats.activeKeywords, color: 'text-indigo-600', icon: '🔑' },
          { label: 'High Intent (AI Verified)', value: stats.highIntentCount, color: 'text-emerald-600', icon: '🎯' },
          { label: 'Avg. Intent Score', value: '72%', color: 'text-amber-600', icon: '⭐' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">24h</span>
            </div>
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</h3>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Leads by Platform</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Quality Score</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#E2E8F0'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center text-slate-600">
                <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2" />
                High Intent
              </span>
              <span className="font-bold">{stats.highIntentCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center text-slate-600">
                <span className="w-3 h-3 bg-slate-300 rounded-full mr-2" />
                Other
              </span>
              <span className="font-bold">{stats.totalLeads - stats.highIntentCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
