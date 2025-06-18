"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import type { ComparisonResult } from '@/lib/types';

interface TopOpportunitiesChartProps {
  results: ComparisonResult[];
}

export function TopOpportunitiesChart({ results }: TopOpportunitiesChartProps) {
  const competitorOnlyKWs = results.filter(r => r.status === 'competitorOnly');
  
  const topOpportunities = competitorOnlyKWs
    .filter(kw => typeof kw.volume === 'number' && kw.volume > 0)
    .sort((a, b) => (b.volume as number) - (a.volume as number))
    .slice(0, 10);

  if (topOpportunities.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nessuna opportunità significativa trovata (keyword solo per competitor con volume > 0).</p>;
  }

  const data = topOpportunities.map(kw => ({
    name: kw.keyword.length > 25 ? kw.keyword.substring(0, 22) + '...' : kw.keyword,
    fullKeyword: kw.keyword,
    volume: kw.volume,
    fill: 'hsl(var(--chart-2))' // orange
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={120} interval={0} />
          <Tooltip formatter={(value, name, props) => [value, props.payload.fullKeyword]}/>
          <Legend />
          <Bar dataKey="volume" name="Volume di Ricerca" >
             <LabelList dataKey="volume" position="right" style={{ fill: 'hsl(var(--foreground))' }}/>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
