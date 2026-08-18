'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPKR } from '@/lib/utils';

/**
 * Every Recharts usage lives here so the ~90 KB library can be code-split out
 * of the admin overview's first load — the KPI cards and tables render
 * immediately while the charts stream in behind them.
 */

const TOOLTIP_STYLE = {
  background: '#121212',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  fontSize: 12,
} as const;

const AXIS = 'rgba(244,241,236,0.35)';
const GRID = 'rgba(255,255,255,0.06)';

export const PIE_COLORS = ['#c8102e', '#f4b400', '#7a8b99'];

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8102e" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#c8102e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          stroke={AXIS}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          minTickGap={28}
        />
        <YAxis
          stroke={AXIS}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#f4b400' }}
          formatter={(value: number, name: string) => [
            name === 'revenue' ? formatPKR(value) : value,
            name === 'revenue' ? 'Revenue' : 'Orders',
          ]}
          labelFormatter={(d: string) =>
            new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })
          }
        />
        <Area type="monotone" dataKey="revenue" stroke="#c8102e" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TopSellersChart({ data }: { data: { name: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="rgba(244,241,236,0.5)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={125}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: number) => [formatPKR(v), 'Revenue']}
        />
        <Bar dataKey="revenue" fill="#f4b400" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrderMixChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v} orders`, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
