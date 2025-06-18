"use client";

import type { GscAnalyzedItem } from '@/lib/types';

interface TableGSCProps {
  data: GscAnalyzedItem[];
  itemDisplayName: string;
  isDetailPage?: boolean;
}

export function TableGSC({ data, itemDisplayName, isDetailPage = false }: TableGSCProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground py-4">Nessun dato da visualizzare.</p>;
  }

  const headers = [
    itemDisplayName, "Clic Attuali", "Clic Prec.", "Diff. Clic", "% Clic",
    "Impr. Attuali", "Impr. Prec.", "Diff. Impr.", "% Impr.",
    "CTR Attuale", "CTR Prec.", "Diff. CTR",
    "Pos. Attuale", "Pos. Prec.", "Diff. Pos."
  ];
  
  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };
  
  const formatPercentage = (value: number) => {
    if (!isFinite(value)) return value === Infinity ? '+Inf%' : 'N/A';
    return (value * 100).toFixed(1) + '%';
  };
  const formatPosition = (value: number | null) => value !== null ? value.toFixed(1) : 'N/A';
  const formatCTR = (value: number) => (value * 100).toFixed(2) + '%';
  const formatCTRDiff = (value: number) => (value * 100).toFixed(2) + 'pp';


  return (
    <div className={isDetailPage ? "detail-page-table-container" : "table-container"}>
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header} scope="col" className="text-center first:text-left">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {data.map((row, index) => (
            <tr key={`${row.item}-${index}`}>
              <td className={`font-medium text-foreground ${isDetailPage ? 'wrap-text-detail' : 'truncate-text'}`}>{row.item}</td>
              <td className="text-center">{row.clicks_current.toLocaleString()}</td>
              <td className="text-center">{row.clicks_previous.toLocaleString()}</td>
              <td className={`text-center ${getChangeColor(row.diff_clicks)}`}>{row.diff_clicks.toLocaleString()}</td>
              <td className={`text-center ${getChangeColor(row.perc_change_clicks)}`}>{formatPercentage(row.perc_change_clicks)}</td>
              
              <td className="text-center">{row.impressions_current.toLocaleString()}</td>
              <td className="text-center">{row.impressions_previous.toLocaleString()}</td>
              <td className={`text-center ${getChangeColor(row.diff_impressions)}`}>{row.diff_impressions.toLocaleString()}</td>
              <td className={`text-center ${getChangeColor(row.perc_change_impressions)}`}>{formatPercentage(row.perc_change_impressions)}</td>

              <td className="text-center">{formatCTR(row.ctr_current)}</td>
              <td className="text-center">{formatCTR(row.ctr_previous)}</td>
              <td className={`text-center ${getChangeColor(row.diff_ctr)}`}>{formatCTRDiff(row.diff_ctr)}</td>
              
              <td className="text-center">{formatPosition(row.position_current)}</td>
              <td className="text-center">{formatPosition(row.position_previous)}</td>
              <td className={`text-center ${row.diff_position !== null ? getChangeColor(row.diff_position * -1) : ''}`}>{formatPosition(row.diff_position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
