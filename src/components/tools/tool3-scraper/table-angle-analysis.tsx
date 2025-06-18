"use client";

import type { AdWithAngleAnalysis } from '@/lib/types';

interface TableAngleAnalysisProps {
  adsWithAnalysis: AdWithAngleAnalysis[];
  isDetailPage?: boolean;
}

export function TableAngleAnalysis({ adsWithAnalysis, isDetailPage = false }: TableAngleAnalysisProps) {
  if (adsWithAnalysis.length === 0) {
    return <p className="text-muted-foreground py-4">Nessun risultato di analisi angle da visualizzare.</p>;
  }

  const headers = ["Ad (Titolo/Testo)", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "Totale", "Valutazione", "Analisi Approfondita"];

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
          {adsWithAnalysis.map((item) => {
            const adIdentifier = item.titolo ? item.titolo.substring(0, 50) + (item.titolo.length > 50 ? "..." : "") : item.testo.substring(0, 50) + "...";
            const analysis = item.angleAnalysis;
            const error = item.analysisError || analysis?.error;

            return (
              <tr key={item.id}>
                <td className="wrap-text-detail font-medium text-foreground" title={`${item.titolo}\n${item.testo}`}>{adIdentifier}</td>
                {error ? (
                  <td colSpan={headers.length - 1} className="text-destructive wrap-text-detail">
                    Errore analisi: {error} {analysis?.raw && `(Raw: ${analysis.raw.substring(0,100)}...)`}
                  </td>
                ) : analysis ? (
                  <>
                    <td className="text-center">{analysis.scores.C1}</td>
                    <td className="text-center">{analysis.scores.C2}</td>
                    <td className="text-center">{analysis.scores.C3}</td>
                    <td className="text-center">{analysis.scores.C4}</td>
                    <td className="text-center">{analysis.scores.C5}</td>
                    <td className="text-center">{analysis.scores.C6}</td>
                    <td className="text-center">{analysis.scores.C7}</td>
                    <td className="text-center font-semibold">{analysis.totalScore}</td>
                    <td className="wrap-text-detail">{analysis.evaluation}</td>
                    <td className="wrap-text-detail min-w-[300px] md:min-w-[350px]" dangerouslySetInnerHTML={{ __html: analysis.detailedAnalysis.replace(/\n/g, '<br />') }} />
                  </>
                ) : (
                  <td colSpan={headers.length - 1} className="text-muted-foreground wrap-text-detail">Analisi non ancora eseguita o in attesa.</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
