
"use client"

import type { PertinenceAnalysisResult } from '@/lib/types';

interface TablePertinenceResultsProps {
  results: PertinenceAnalysisResult[];
}

export function TablePertinenceResults({ results }: TablePertinenceResultsProps) {
  if (results.length === 0) {
    return <p className="text-muted-foreground py-4">Nessun risultato da mostrare.</p>;
  }

  const headers = ['Keyword', 'Settore Analizzato', 'Pertinenza', 'Priorità SEO', 'Motivazione'];

  const getPriorityIndicator = (priority: string): React.ReactNode => {
    let colorClass = 'bg-gray-400'; // Default color
    if (priority.toLowerCase().includes('alta') || priority.toLowerCase().includes('mantenimento')) {
      colorClass = 'bg-green-500';
    } else if (priority.toLowerCase().includes('media')) {
      colorClass = 'bg-yellow-400';
    } else if (priority.toLowerCase().includes('bassa') || priority.toLowerCase().includes('non applicabile') || priority.toLowerCase().includes('dati insufficienti')) {
      colorClass = 'bg-red-500';
    }

    return (
      <span className="flex items-center">
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${colorClass}`}></span>
        {priority}
      </span>
    );
  };

  return (
    <div className="table-container">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header} scope="col">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {results.map((row, index) => (
            <tr key={`${row.keyword}-${index}`}>
              <td className="font-medium text-foreground">{row.keyword}</td>
              <td>{row.settore}</td>
              <td className={row.pertinenza === "Errore" ? "text-destructive" : ""}>{row.pertinenza}</td>
              <td className={row.prioritaSEO === "Errore" ? "text-destructive" : ""}>
                {row.prioritaSEO !== "Errore" ? getPriorityIndicator(row.prioritaSEO) : row.prioritaSEO}
              </td>
              <td className={`wrap-text-detail ${row.motivazioneSEO.startsWith("Errore") ? "text-destructive" : ""}`}>{row.motivazioneSEO}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
