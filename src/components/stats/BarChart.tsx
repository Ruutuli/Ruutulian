'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

interface BarChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartData[];
  dataKey?: string;
  color?: string;
  title?: string;
  height?: number;
  horizontal?: boolean;
}

// Custom label component for horizontal bars
const HorizontalLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (width < 20) return null; // Don't show label if bar is too small
  return (
    <text
      x={x + width + 5}
      y={y + 10}
      fill="#9ca3af"
      fontSize={12}
      fontWeight={500}
    >
      {value}
    </text>
  );
};

// Custom label component for vertical bars
const VerticalLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="#9ca3af"
      fontSize={12}
      fontWeight={500}
      textAnchor="middle"
    >
      {value}
    </text>
  );
};

export function BarChart({ data, dataKey = 'value', color = '#ec4899', title, height = 300, horizontal = false }: BarChartProps) {
  return (
    <div className="wiki-card p-4 md:p-6 overflow-x-auto">
      {title && <h3 className="text-lg font-semibold text-gray-200 mb-4">{title}</h3>}
      <div className="w-full min-w-0" style={{ minHeight: `${height}px` }}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart 
            data={data} 
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 20, right: horizontal ? 50 : 30, left: horizontal ? 0 : 0, bottom: horizontal ? 5 : 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            {horizontal ? (
              <>
                <XAxis 
                  type="number"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  width={120}
                />
              </>
            ) : (
              <>
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
              </>
            )}
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
                padding: '8px 12px'
              }}
              cursor={{ fill: 'rgba(147, 51, 234, 0.1)' }}
            />
            <Bar 
              dataKey={dataKey} 
              fill={color} 
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              animationDuration={800}
            >
              <LabelList 
                dataKey={dataKey} 
                content={horizontal ? HorizontalLabel : VerticalLabel}
              />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

