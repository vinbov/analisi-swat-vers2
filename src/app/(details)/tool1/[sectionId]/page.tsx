
"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { ComparisonResult, DetailPageSection, DetailPageDataTool1 } from '@/lib/types';
import { CommonKeywordsTop10Chart } from '@/components/tools/tool1-comparator/chart-common-keywords-top10';
import { TopOpportunitiesChart } from '@/components/tools/tool1-comparator/chart-top-opportunities';
import { ComparisonResultsTable } from '@/components/tools/tool1-comparator/table-comparison-results';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText, ImageDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TOOL1_DATA_CHANNEL_NAME, type RequestTool1DataMessage, type ResponseTool1DataMessage, type Tool1DataPayload } from '@/lib/tool1-data-channel';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/csv';

export default function Tool1DetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = params.sectionId as DetailPageSection;
  const [pageData, setPageData] = useState<DetailPageDataTool1 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const channelRef = useRef<BroadcastChannel | null>(null);
  const requestingTabIdRef = useRef<string>(`detailTab-${Date.now()}-${Math.random().toString(36).substring(2,7)}`);
  
  const dataIdFromParams = useMemo(() => {
    return searchParams.get('dataId');
  }, [searchParams]);

  const handleDownloadChart = () => {
    toast({
      title: "Funzionalità non implementata",
      description: "Il download del grafico come immagine richiederebbe una libreria aggiuntiva (es. html2canvas).",
      variant: "default",
    });
  };

  const handleDownloadSectionCSV = () => {
    if (!pageData || (!pageData.tableData && sectionId !== 'commonTop10' && sectionId !== 'topOpportunities')) {
      toast({ title: "Nessun dato", description: "Nessun dato da scaricare per questa sezione.", variant: "destructive" });
      return;
    }

    let csvData: any[] = [];
    let csvHeaders: string[] = [];
    let filename = `report_dettaglio_tool1_${sectionId}.csv`;

    const { comparisonResults, activeCompetitorNames } = pageData;

    if (sectionId === 'commonTop10') {
      filename = 'report_dettaglio_tool1_keyword_comuni_top10.csv';
      csvHeaders = ["Fonte", "Keyword", "Posizione"];
      const commonKWs = comparisonResults?.filter(r => r.status === 'common') || [];
      
      const mySiteTop10 = commonKWs
        .filter(kw => kw.mySiteInfo.pos !== 'N/P' && typeof kw.mySiteInfo.pos === 'number' && kw.mySiteInfo.pos <= 10)
        .sort((a, b) => (a.mySiteInfo.pos as number) - (b.mySiteInfo.pos as number));
      mySiteTop10.forEach(kw => csvData.push({ "Fonte": "Mio Sito", "Keyword": kw.keyword, "Posizione": kw.mySiteInfo.pos }));

      activeCompetitorNames?.forEach(compName => {
        const competitorTop10 = commonKWs
          .filter(kw => {
            const compInfo = kw.competitorInfo.find(c => c.name === compName);
            return compInfo && compInfo.pos !== 'N/P' && typeof compInfo.pos === 'number' && compInfo.pos <= 10;
          })
          .sort((a, b) => {
            const posA = a.competitorInfo.find(c => c.name === compName)?.pos as number;
            const posB = b.competitorInfo.find(c => c.name === compName)?.pos as number;
            return posA - posB;
          });
        competitorTop10.forEach(kw => csvData.push({ "Fonte": compName, "Keyword": kw.keyword, "Posizione": kw.competitorInfo.find(c => c.name === compName)?.pos }));
      });

    } else if (sectionId === 'topOpportunities') {
      filename = 'report_dettaglio_tool1_opportunita_top10.csv';
      csvHeaders = ["Keyword", "Volume", "Difficoltà", "Opportunity Score", "Competitor (Pos.)"];
      const topOpps = comparisonResults?.filter(r => r.status === 'competitorOnly' && typeof r.volume === 'number' && r.volume > 0)
        .sort((a, b) => (b.volume as number) - (a.volume as number))
        .slice(0, 10) || [];
      
      topOpps.forEach(item => {
        const competitorsRanking = item.competitorInfo
            .filter(c => c.pos !== 'N/P' && activeCompetitorNames?.includes(c.name))
            .map(c => `${c.name} (${c.pos})`)
            .join(', ');
        csvData.push({
          "Keyword": item.keyword,
          "Volume": item.volume,
          "Difficoltà": item.difficolta ?? 'N/A',
          "Opportunity Score": item.opportunity ?? 'N/A',
          "Competitor (Pos.)": competitorsRanking || 'N/A'
        });
      });

    } else if (pageData.tableData && pageData.tableHeaders && pageData.activeCompetitorNames) {
      csvHeaders = pageData.tableHeaders;
      const type = pageData.tableType;

      pageData.tableData.forEach(item => {
        const row: Record<string, any> = { 'Keyword': item.keyword };
        if (type !== 'competitorOnly') {
          row['Mio Sito Pos.'] = item.mySiteInfo.pos;
          row['Mio Sito URL'] = item.mySiteInfo.url;
        }
        if (type !== 'mySiteOnly') {
          pageData.activeCompetitorNames?.forEach(name => {
            const compInfo = item.competitorInfo.find(c => c.name === name);
            row[`${name} Pos.`] = compInfo ? compInfo.pos : 'N/P';
            row[`${name} URL`] = compInfo ? compInfo.url : 'N/A';
          });
        }
        row['Volume'] = item.volume ?? 'N/A';
        row['Difficoltà'] = item.difficolta ?? 'N/A';
        row['Opportunity'] = item.opportunity ?? 'N/A';
        row['Intento'] = item.intento ?? 'N/A';
        csvData.push(row);
      });
       if(sectionId === 'commonKeywordsSectionTool1') filename = 'report_dettaglio_tool1_keyword_comuni_completo.csv';
       if(sectionId === 'mySiteOnlyKeywordsSectionTool1') filename = 'report_dettaglio_tool1_punti_forza_completo.csv';
       if(sectionId === 'competitorOnlyKeywordsSectionTool1') filename = 'report_dettaglio_tool1_opportunita_completo.csv';
    }

    if (csvData.length > 0) {
      exportToCSV(filename, csvHeaders, csvData);
      toast({ title: "Download Avviato", description: `Il file ${filename} è in scaricamento.` });
    } else {
      toast({ title: "Nessun dato", description: "Nessun dato specifico trovato da esportare per questa sezione.", variant: "info" });
    }
  };

  useEffect(() => {
    if (!dataIdFromParams || !sectionId) {
      setDataLoadError("Impossibile caricare i dettagli. ID dati o sezione mancante. Torna al tool principale e riprova.");
      setIsLoading(false);
      setPageData(null);
      return;
    }
    
    // Non resettare pageData qui se isLoading è già false e pageData esiste, per evitare flicker
    if (isLoading || !pageData) {
      setIsLoading(true);
      setPageData(null); 
      setDataLoadError(null);
    }
    
    if (!channelRef.current || channelRef.current.name !== TOOL1_DATA_CHANNEL_NAME) {
      if (channelRef.current) {
        channelRef.current.close();
      }
      channelRef.current = new BroadcastChannel(TOOL1_DATA_CHANNEL_NAME);
    }
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RESPONSE_TOOL1_DATA') {
        const { dataId: responseDataId, requestingTabId: responseTabId, payload } = event.data as ResponseTool1DataMessage;
        
        if (responseDataId === dataIdFromParams && responseTabId === requestingTabIdRef.current) {
          setIsLoading(false);
          if (payload) {
            const { comparisonResults: allResults, activeCompetitorNames: currentActiveCompNames } = payload;
            let dataForPage: DetailPageDataTool1 | null = null;

            const commonKWs = allResults.filter(r => r.status === 'common');
            const mySiteOnlyKWs = allResults.filter(r => r.status === 'mySiteOnly');
            const competitorOnlyKWs = allResults.filter(r => r.status === 'competitorOnly');
            
            const getTableHeaders = (type: 'common' | 'mySiteOnly' | 'competitorOnly') => {
              if (!currentActiveCompNames) return [];
              if (type === 'common') return ['Keyword', 'Mio Sito Pos.', 'Mio Sito URL', ...currentActiveCompNames.flatMap(name => [`${name} Pos.`, `${name} URL`]), 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
              if (type === 'mySiteOnly') return ['Keyword', 'Mio Sito Pos.', 'Mio Sito URL', 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
              return ['Keyword', ...currentActiveCompNames.flatMap(name => [`${name} Pos.`, `${name} URL`]), 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
            };

            switch (sectionId) {
              case 'commonTop10':
                let commonTop10AdditionalContent = '';
                commonTop10AdditionalContent += `<h5 class="mt-4 font-semibold text-foreground">Mio Sito - Keyword Comuni in Top 10:</h5>`;
                const mySiteTop10KWsDetail = commonKWs
                  .filter(kw => kw.mySiteInfo.pos !== 'N/P' && typeof kw.mySiteInfo.pos === 'number' && kw.mySiteInfo.pos <= 10)
                  .sort((a, b) => (a.mySiteInfo.pos as number) - (b.mySiteInfo.pos as number));

                if (mySiteTop10KWsDetail.length > 0) {
                  commonTop10AdditionalContent += `
                    <div class="overflow-x-auto rounded-md border mt-2 mb-4 shadow-sm">
                      <table class="min-w-full divide-y divide-border">
                        <thead class="bg-muted/50">
                          <tr>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyword</th>
                            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Posizione</th>
                          </tr>
                        </thead>
                        <tbody class="bg-card divide-y divide-border">`;
                  mySiteTop10KWsDetail.forEach(item => {
                    commonTop10AdditionalContent += `
                          <tr>
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-foreground">${item.keyword}</td>
                            <td class="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">${item.mySiteInfo.pos}</td>
                          </tr>`;
                  });
                  commonTop10AdditionalContent += `
                        </tbody>
                      </table>
                    </div>`;
                } else {
                  commonTop10AdditionalContent += '<p class="text-sm text-muted-foreground mt-1 mb-3">Nessuna keyword comune in Top 10 per "Mio Sito".</p>';
                }

                currentActiveCompNames?.forEach(compName => {
                  commonTop10AdditionalContent += `<h5 class="mt-6 font-semibold text-foreground">${compName} - Keyword Comuni in Top 10:</h5>`;
                  const competitorKWsDetail = commonKWs
                    .filter(kw => {
                      const compInfo = kw.competitorInfo.find(c => c.name === compName);
                      return compInfo && compInfo.pos !== 'N/P' && typeof compInfo.pos === 'number' && compInfo.pos <= 10;
                    })
                    .sort((a, b) => {
                       const posA = a.competitorInfo.find(c => c.name === compName)?.pos as number;
                       const posB = b.competitorInfo.find(c => c.name === compName)?.pos as number;
                       return posA - posB;
                    });

                  if (competitorKWsDetail.length > 0) {
                    commonTop10AdditionalContent += `
                      <div class="overflow-x-auto rounded-md border mt-2 mb-4 shadow-sm">
                        <table class="min-w-full divide-y divide-border">
                          <thead class="bg-muted/50">
                            <tr>
                              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyword</th>
                              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Posizione</th>
                            </tr>
                          </thead>
                          <tbody class="bg-card divide-y divide-border">`;
                    competitorKWsDetail.forEach(item => {
                      const compInfo = item.competitorInfo.find(c => c.name === compName);
                      commonTop10AdditionalContent += `
                            <tr>
                              <td class="px-4 py-3 whitespace-nowrap text-sm text-foreground">${item.keyword}</td>
                              <td class="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">${compInfo?.pos}</td>
                            </tr>`;
                    });
                    commonTop10AdditionalContent += `
                          </tbody>
                        </table>
                      </div>`;
                  } else {
                    commonTop10AdditionalContent += `<p class="text-sm text-muted-foreground mt-1 mb-3">Nessuna keyword comune in Top 10 per ${compName}.</p>`;
                  }
                });
                
                dataForPage = {
                  pageTitle: "Analisi Keyword Comuni: Posizionamento Top 10",
                  description: "Confronto del numero di keyword comuni per cui \"Il Mio Sito\" e ciascun competitor si posizionano in Top 10, con dettaglio tabellare delle keyword.",
                  chartComponent: <CommonKeywordsTop10Chart results={allResults} activeCompetitorNames={currentActiveCompNames || []} />,
                  additionalContent: commonTop10AdditionalContent,
                  comparisonResults: allResults, 
                  activeCompetitorNames: currentActiveCompNames,
                };
                break;
              case 'topOpportunities':
                 const top10Opportunities = allResults
                    .filter(r => r.status === 'competitorOnly' && typeof r.volume === 'number' && r.volume > 0)
                    .sort((a, b) => (b.volume as number) - (a.volume as number))
                    .slice(0, 10);
                
                let topOpportunitiesTable = `<h5 class="mt-4 font-semibold text-foreground">Top ${top10Opportunities.length} Opportunità (Keyword Gap):</h5>`;
                if (top10Opportunities.length > 0) {
                    topOpportunitiesTable += `
                        <div class="overflow-x-auto rounded-md border mt-2 mb-4 shadow-sm">
                          <table class="min-w-full divide-y divide-border">
                            <thead class="bg-muted/50">
                              <tr>
                                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyword</th>
                                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume</th>
                                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Difficoltà</th>
                                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Opportunity Score</th>
                                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Competitor (Pos.)</th>
                              </tr>
                            </thead>
                            <tbody class="bg-card divide-y divide-border">`;
                    top10Opportunities.forEach(item => {
                        const competitorsRanking = item.competitorInfo
                            .filter(c => c.pos !== 'N/P' && currentActiveCompNames?.includes(c.name))
                            .map(c => `${c.name} (${c.pos})`)
                            .join(', ');
                        topOpportunitiesTable += `
                              <tr>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-foreground">${item.keyword}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">${item.volume}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">${item.difficolta ?? 'N/A'}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">${item.opportunity ?? 'N/A'}</td>
                                <td class="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">${competitorsRanking || 'N/A'}</td>
                              </tr>`;
                    });
                    topOpportunitiesTable += `
                            </tbody>
                          </table>
                        </div>`;
                } else {
                  topOpportunitiesTable += '<p class="text-sm text-muted-foreground mt-1 mb-3">Nessuna opportunità significativa trovata (keyword solo per competitor con volume > 0).</p>';
                }

                dataForPage = {
                  pageTitle: "Top 10 Opportunità per Volume (Keyword Gap)",
                  description: "Le keyword con il più alto volume di ricerca per cui i competitor si posizionano, ma \"Il Mio Sito\" no.",
                  chartComponent: <TopOpportunitiesChart results={allResults} />,
                  additionalContent: topOpportunitiesTable,
                  comparisonResults: allResults, 
                  activeCompetitorNames: currentActiveCompNames,
                };
                break;
              case 'commonKeywordsSectionTool1':
                dataForPage = {
                  pageTitle: "Dettaglio Tabella: Keyword Comuni",
                  description: "Elenco completo delle keyword per cui \"Il Mio Sito\" e almeno un competitor si posizionano.",
                  tableData: commonKWs,
                  tableHeaders: getTableHeaders('common'),
                  tableType: 'common',
                  activeCompetitorNames: currentActiveCompNames,
                  comparisonResults: allResults,
                };
                break;
              case 'mySiteOnlyKeywordsSectionTool1':
                dataForPage = {
                  pageTitle: "Dettaglio Tabella: Punti di Forza",
                  description: "Keyword per cui \"Il Mio Sito\" si posiziona, ma nessuno dei competitor analizzati.",
                  tableData: mySiteOnlyKWs,
                  tableHeaders: getTableHeaders('mySiteOnly'),
                  tableType: 'mySiteOnly',
                  activeCompetitorNames: currentActiveCompNames,
                  comparisonResults: allResults,
                };
                break;
              case 'competitorOnlyKeywordsSectionTool1':
                dataForPage = {
                  pageTitle: "Dettaglio Tabella: Opportunità",
                  description: "Keyword per cui i competitor si posizionano e \"Il Mio Sito\" no.",
                  tableData: competitorOnlyKWs,
                  tableHeaders: getTableHeaders('competitorOnly'),
                  tableType: 'competitorOnly',
                  activeCompetitorNames: currentActiveCompNames,
                  comparisonResults: allResults,
                };
                break;
              default: 
                setDataLoadError(`La sezione di dettaglio '${sectionId}' non è riconosciuta o è stata rimossa. Torna al tool principale.`);
                setPageData(null);
                return;
            }
            setPageData(dataForPage as DetailPageDataTool1);
            setDataLoadError(null);
          } else {
            setDataLoadError("I dati per questa sessione di dettaglio non sono più disponibili. Questo può accadere se la scheda del tool principale è stata chiusa o l'analisi è stata aggiornata. Torna al tool principale e riesegui l'analisi se necessario.");
            setPageData(null);
          }
        }
      }
    };
    
    if (channelRef.current) {
        channelRef.current.onmessage = handleMessage;
    }

    const requestMsg: RequestTool1DataMessage = {
      type: 'REQUEST_TOOL1_DATA',
      dataId: dataIdFromParams,
      requestingTabId: requestingTabIdRef.current,
    };
    channelRef.current?.postMessage(requestMsg);

    const timeoutId = setTimeout(() => {
      if (isLoading && !pageData) { 
        setDataLoadError("Timeout: Nessuna risposta dal tool principale. Assicurati che la scheda del Tool 1 sia aperta e attiva. Potrebbe essere necessario rieseguire l'analisi.");
        setIsLoading(false);
      }
    }, 7000); 

    return () => {
      if (channelRef.current) {
          channelRef.current.onmessage = null; 
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sectionId, dataIdFromParams, isLoading, pageData]); // Ripristino isLoading e pageData nelle dipendenze

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, []);


  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Caricamento dettagli in corso... Richiesta dati al tool principale.</p></div>;
  }

  if (dataLoadError || !pageData) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="container mx-auto max-w-3xl bg-card p-6 rounded-lg shadow-xl text-center">
          <AppHeader />
          <Button onClick={() => window.close()} variant="outline" className="mb-4 mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Chiudi Scheda
          </Button>
          <h1 className="text-2xl font-bold mb-4 mt-4">Dati non Trovati o Sessione Scaduta</h1>
          <p className="text-muted-foreground">{dataLoadError || "Impossibile caricare i dettagli per questa sezione. Torna al tool principale e riesegui l'analisi."}</p>
        </div>
      </div>
    );
  }
  
  interface DetailPageDataTool1Extended extends DetailPageDataTool1 {
    chartComponent?: React.ReactNode;
  }
  const extendedPageData = pageData as DetailPageDataTool1Extended;


  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="container mx-auto max-w-6xl bg-card p-6 rounded-lg shadow-xl">
        <AppHeader />
        <div className="flex justify-between items-center mb-6">
            <Button onClick={() => window.close()} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Chiudi Scheda
            </Button>
            {(extendedPageData.tableData || sectionId === 'commonTop10' || sectionId === 'topOpportunities') && (
              <Button onClick={handleDownloadSectionCSV} variant="default" size="sm">
                <Download className="mr-2 h-4 w-4" /> Scarica Dati Sezione (CSV)
              </Button>
            )}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{extendedPageData.pageTitle}</CardTitle>
            <CardDescription className="mt-1 text-base">{extendedPageData.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {extendedPageData.chartComponent && (
              <div className="my-6 min-h-[350px] md:min-h-[450px] flex flex-col justify-center items-center">
                {extendedPageData.chartComponent}
                <Button onClick={handleDownloadChart} variant="outline" size="sm" className="mt-4">
                  <ImageDown className="mr-2 h-4 w-4" /> Scarica Grafico (PNG)
                </Button>
              </div>
            )}
            {extendedPageData.additionalContent && (
              <div className="mt-6 p-4 bg-muted/10 rounded-md" dangerouslySetInnerHTML={{ __html: extendedPageData.additionalContent }} />
            )}
            {extendedPageData.tableData && extendedPageData.tableHeaders && extendedPageData.tableType && (
              <div className="mt-6">
                <ComparisonResultsTable 
                  results={extendedPageData.tableData} 
                  type={extendedPageData.tableType} 
                  activeCompetitorNames={extendedPageData.activeCompetitorNames || []}
                  isDetailPage={true}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
    
