"use client"

import React from 'react'; 
import type { ComparisonResult } from '@/lib/types';
import Link from 'next/link';

interface ComparisonResultsTableProps {
  results: ComparisonResult[];
  type: 'common' | 'mySiteOnly' | 'competitorOnly';
  activeCompetitorNames: string[];
  isDetailPage?: boolean;
}

export function ComparisonResultsTable({ results, type, activeCompetitorNames, isDetailPage = false }: ComparisonResultsTableProps) {
  if (results.length === 0) {
    return <p className="text-muted-foreground py-4">Nessuna keyword da mostrare in questa sezione.</p>;
  }

  let headers: string[] = [];
  if (type === 'common') {
    headers = ['Keyword', 'Mio Sito Pos.', 'Mio Sito URL', ...activeCompetitorNames.flatMap(name => [`${name} Pos.`, `${name} URL`]), 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
  } else if (type === 'mySiteOnly') {
    headers = ['Keyword', 'Mio Sito Pos.', 'Mio Sito URL', 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
  } else { // competitorOnly
    headers = ['Keyword', ...activeCompetitorNames.flatMap(name => [`${name} Pos.`, `${name} URL`]), 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
  }

  const getUrlClass = (url: string) => (url && url !== 'N/A') ? 'text-sky-600 hover:text-sky-800 hover:underline' : 'text-muted-foreground';

  return (
    <div className={isDetailPage ? "detail-page-table-container" : "table-container"}>
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header} scope="col">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {results.map((item, index) => (
            <tr key={`${item.keyword}-${index}`}>
              <td className="font-medium text-foreground">{item.keyword}</td>
              
              {type !== 'competitorOnly' && (
                <>
                  <td>{item.mySiteInfo.pos}</td>
                  <td className={isDetailPage ? "wrap-text-detail" : "truncate-url"}>
                    {item.mySiteInfo.url && item.mySiteInfo.url !== 'N/A' && item.mySiteInfo.url.startsWith('http') ? (
                      <Link href={item.mySiteInfo.url} target="_blank" rel="noopener noreferrer" className={getUrlClass(item.mySiteInfo.url)} title={item.mySiteInfo.url}>
                        {isDetailPage ? item.mySiteInfo.url : item.mySiteInfo.url.substring(0,27) + (item.mySiteInfo.url.length > 30 ? '...' : '')}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{item.mySiteInfo.url}</span>
                    )}
                  </td>
                </>
              )}

              {type !== 'mySiteOnly' && activeCompetitorNames.map(compName => {
                const compInfo = item.competitorInfo.find(c => c.name === compName);
                return (
                  <React.Fragment key={compName}>
                    <td>{compInfo ? compInfo.pos : 'N/P'}</td>
                    <td className={isDetailPage ? "wrap-text-detail" : "truncate-url"}>
                      {compInfo && compInfo.url && compInfo.url !== 'N/A' && compInfo.url.startsWith('http') ? (
                        <Link href={compInfo.url} target="_blank" rel="noopener noreferrer" className={getUrlClass(compInfo.url)} title={compInfo.url}>
                          {isDetailPage ? compInfo.url : compInfo.url.substring(0,27) + (compInfo.url.length > 30 ? '...' : '')}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{compInfo ? compInfo.url : 'N/A'}</span>
                      )}
                    </td>
                  </React.Fragment>
                );
              })}
              
              <td>{item.volume ?? 'N/A'}</td>
              <td className={`${(typeof item.difficolta === 'number' && item.difficolta <= 30) ? 'text-green-600' : (typeof item.difficolta === 'number' && item.difficolta > 60 ? 'text-red-600' : '')}`}>
                {item.difficolta ?? 'N/A'}
              </td>
              <td>{item.opportunity ?? 'N/A'}</td>
              <td className={isDetailPage ? 'wrap-text-detail' : 'wrap-text'}>{item.intento ?? 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
