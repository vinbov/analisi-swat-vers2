
"use client";

import React from 'react';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import type { GscSectionAnalysis } from '@/lib/types';

interface ChartGSCProps {
  data?: GscSectionAnalysis['topItemsByClicksChartData'];
  pieData?: GscSectionAnalysis['pieChartData'];
  type: 'bar' | 'pie';
  title: string;
}

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))',
  'hsl(210, 90%, 50%)',
  'hsl(160, 70%, 40%)',
  'hsl(340, 80%, 60%)',
  'hsl(40, 90%, 55%)',
  'hsl(280, 70%, 65%)'
];

export function ChartGSC({ data, pieData, type, title }: ChartGSCProps) {
  if (type === 'bar') {
    const hasValidData = data && data.labels && data.labels.length > 0 && data.datasets && data.datasets.length > 0 && data.datasets[0].data && data.datasets[0].data.length > 0 && data.labels.length === data.datasets[0].data.length;
    
    if (!hasValidData) {
      return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-center py-8">Dati insufficienti per il grafico a barre: {title}.</p></div>;
    }
    
    const chartData = data.labels.map((label, index) => ({
      name: label,
      value: data.datasets[0].data[index] || 0,
      fill: data.datasets[0].backgroundColor?.[index] || COLORS[index % COLORS.length]
    }));

    return (
      <div className="h-full w-full">
        <h4 className="text-lg font-semibold text-center mb-2 text-foreground">{title}</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 55 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              angle={-40} 
              textAnchor="end" 
              height={70} 
              interval={0} 
              tick={{ fontSize: '11px', fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: '11px', fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px'}}
              labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold' }}
              itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
            />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
            <Bar dataKey="value" name={data.datasets[0].label || "Valore"} minPointSize={2}>
                {chartData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                ))}
              <LabelList dataKey="value" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: '10px' }}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'pie') {
    const hasValidPieData = pieData && pieData.length > 0 && pieData.every(p => typeof p.value === 'number' && p.value >= 0);

    if (!hasValidPieData) {
      return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-center py-8">Dati insufficienti per il grafico a torta: {title}.</p></div>;
    }
    
    const processedPieData = pieData.map((entry, index) => ({
        ...entry,
        fill: entry.fill || COLORS[index % COLORS.length] 
    }));

    return (
      <div className="h-full w-full">
        <h4 className="text-lg font-semibold text-center mb-2 text-foreground">{title}</h4>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
            <Pie
              data={processedPieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius="80%"
              dataKey="value"
              nameKey="name"
              label={({ name, percent, value }) => `${name}: ${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`}
              style={{ fontSize: '12px' }}
            >
              {processedPieData.map((entry, index) => (
                <Cell key={`cell-pie-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => [`${value.toLocaleString()} Clic`, name]} 
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px'}}
              labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 'bold' }}
              itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
            />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return <div className="flex items-center justify-center h-full"><p className="text-destructive">Tipo di grafico non supportato: {type}.</p></div>;
}
