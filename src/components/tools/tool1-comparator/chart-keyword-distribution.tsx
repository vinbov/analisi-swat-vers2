"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ComparisonResult } from '@/lib/types';

interface KeywordDistributionChartProps {
  results: ComparisonResult[];
}

const COLORS = {
  common: 'hsl(var(--chart-5))', // purple
  mySiteOnly: 'hsl(var(--chart-3))', // green
  competitorOnly: 'hsl(var(--chart-2))', // orange
};

export function KeywordDistributionChart({ results }: KeywordDistributionChartProps) {
  const commonKWs = results.filter(r => r.status === 'common').length;
  const mySiteOnlyKWs = results.filter(r => r.status === 'mySiteOnly').length;
  const competitorOnlyKWs = results.filter(r => r.status === 'competitorOnly').length;
  const totalUniqueKWs = new Set(results.map(r => r.keyword)).size;

  const data = [
    { name: 'Keyword Comuni', value: commonKWs, color: COLORS.common },
    { name: 'Punti di Forza (Solo Mio Sito)', value: mySiteOnlyKWs, color: COLORS.mySiteOnly },
    { name: 'Opportunità (Solo Competitor)', value: competitorOnlyKWs, color: COLORS.competitorOnly },
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nessun dato sufficiente per il grafico di distribuzione.</p>;
  }

  return (
    <div className="h-[300px] md:h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius="80%"
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value} keywords`, name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-4 text-sm text-center text-muted-foreground font-semibold">Totale keyword uniche analizzate: {totalUniqueKWs}</p>
    </div>
  );
}
