
"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { ComparisonResult } from '@/lib/types';

interface CommonKeywordsTop10ChartProps {
  results: ComparisonResult[];
  activeCompetitorNames: string[];
}

const CHART_COLORS = [
  'hsl(var(--chart-1))', // Mio Sito
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--sky-500))', // Un colore aggiuntivo se ci sono più di 4 competitor
];

export function CommonKeywordsTop10Chart({ results, activeCompetitorNames }: CommonKeywordsTop10ChartProps) {
  const commonKWs = results.filter(r => r.status === 'common');
  
  const data = [];

  // Mio Sito
  const mySiteTop10Count = commonKWs.filter(kw => 
    kw.mySiteInfo.pos !== 'N/P' && typeof kw.mySiteInfo.pos === 'number' && kw.mySiteInfo.pos <= 10
  ).length;
  data.push({ name: 'Mio Sito', count: mySiteTop10Count, fill: CHART_COLORS[0] });

  // Competitors
  activeCompetitorNames.forEach((compName, index) => {
    const competitorTop10Count = commonKWs.filter(kw => {
      const compInfo = kw.competitorInfo.find(c => c.name === compName);
      return compInfo && compInfo.pos !== 'N/P' && typeof compInfo.pos === 'number' && compInfo.pos <= 10;
    }).length;
    data.push({ name: compName, count: competitorTop10Count, fill: CHART_COLORS[(index + 1) % CHART_COLORS.length] });
  });


  if (data.every(d => d.count === 0)) {
     return <p className="text-muted-foreground text-center py-8">Nessuna keyword comune trovata in Top 10 per i siti analizzati.</p>;
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" name="N. Keyword Comuni in Top 10">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
