'use client';

import { RadarChart as RechartsRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface RadarDataPoint {
  name: string;
  value: number;
  fullMark?: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  title?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  maxValue?: number;
}

const DEFAULT_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export function RadarChart({ 
  data, 
  title, 
  height = 400, 
  colors = DEFAULT_COLORS,
  showLegend = false,
  maxValue = 30
}: RadarChartProps) {
  // Format data for multiple series if needed
  const chartData = data.map(point => ({
    ...point,
    fullMark: maxValue,
  }));

  return (
    <div className="wiki-card p-4 md:p-6">
      {title && <h3 className="text-lg font-semibold text-gray-200 mb-4">{title}</h3>}
      <div className="w-full" style={{ minHeight: `${height}px` }}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsRadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickLine={{ stroke: '#4b5563' }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, maxValue]} 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="Stats"
              dataKey="value"
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.6}
              animationDuration={800}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
                padding: '8px 12px'
              }}
              formatter={(value: number) => [value, 'Value']}
            />
            {showLegend && (
              <Legend 
                wrapperStyle={{ color: '#9ca3af', fontSize: '14px' }}
                iconType="circle"
              />
            )}
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Specialized component for D&D stats
interface DnDStatsData {
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
}

interface DnDRadarChartProps {
  stats: DnDStatsData;
  title?: string;
  height?: number;
  showModifiers?: boolean;
}

export function DnDRadarChart({ stats, title = 'D&D Stats', height = 400, showModifiers = false }: DnDRadarChartProps) {
  const statData = [
    { name: 'STR', value: stats.strength || 10, modifier: stats.strength ? Math.floor((stats.strength - 10) / 2) : 0 },
    { name: 'DEX', value: stats.dexterity || 10, modifier: stats.dexterity ? Math.floor((stats.dexterity - 10) / 2) : 0 },
    { name: 'CON', value: stats.constitution || 10, modifier: stats.constitution ? Math.floor((stats.constitution - 10) / 2) : 0 },
    { name: 'INT', value: stats.intelligence || 10, modifier: stats.intelligence ? Math.floor((stats.intelligence - 10) / 2) : 0 },
    { name: 'WIS', value: stats.wisdom || 10, modifier: stats.wisdom ? Math.floor((stats.wisdom - 10) / 2) : 0 },
    { name: 'CHA', value: stats.charisma || 10, modifier: stats.charisma ? Math.floor((stats.charisma - 10) / 2) : 0 },
  ].filter(stat => stat.value > 0);

  if (statData.length === 0) {
    return (
      <div className="wiki-card p-4 md:p-6">
        <p className="text-gray-400 text-center">No D&D stats available for this character.</p>
      </div>
    );
  }

  return (
    <div className="wiki-card p-4 md:p-6">
      {title && <h3 className="text-lg font-semibold text-gray-200 mb-4">{title}</h3>}
      <div className="w-full" style={{ minHeight: `${height}px` }}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsRadarChart data={statData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ fill: '#9ca3af', fontSize: 14, fontWeight: 600 }}
              tickLine={{ stroke: '#4b5563' }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 30]} 
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickCount={7}
            />
            <Radar
              name="Ability Score"
              dataKey="value"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.6}
              animationDuration={800}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
                padding: '8px 12px'
              }}
              formatter={(value: number, name: string, props: any) => {
                const modifier = props.payload.modifier;
                const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                return showModifiers 
                  ? [`${value} (${modifierText})`, 'Ability Score']
                  : [value, 'Ability Score'];
              }}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
      {showModifiers && (
        <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
          {statData.map((stat) => {
            const modifier = stat.modifier;
            const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
            return (
              <div key={stat.name} className="text-center">
                <div className="text-gray-400">{stat.name}</div>
                <div className="text-purple-400 font-semibold">{stat.value}</div>
                <div className="text-gray-500 text-xs">({modifierText})</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


