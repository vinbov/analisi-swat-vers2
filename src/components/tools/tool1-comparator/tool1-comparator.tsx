
"use client";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/shared/file-upload-zone';
import { parseCSVTool1, exportTool1FullReportToXLSX } from '@/lib/csv';
import type { CsvRowTool1, ComparisonResult, DetailPageSection } from '@/lib/types';
import { CommonKeywordsTop10Chart } from './chart-common-keywords-top10';
import { TopOpportunitiesChart } from './chart-top-opportunities';
import { ComparisonResultsTable } from './table-comparison-results';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Download, AlertCircle, FileText, LineChart, DownloadCloud, ImageDown } from 'lucide-react'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TOOL1_DATA_CHANNEL_NAME, type RequestTool1DataMessage, type ResponseTool1DataMessage, type Tool1DataPayload } from '@/lib/tool1-data-channel';


const APP_CHUNK_SIZE_TOOL1 = 500;

interface Tool1ComparatorProps {
  siteFiles: Record<string, { content: string; name: string }>;
  setSiteFiles: React.Dispatch<React.SetStateAction<Record<string, { content: string; name: string }>>>;
  comparisonResults: ComparisonResult[];
  setComparisonResults: React.Dispatch<React.SetStateAction<ComparisonResult[]>>;
  activeCompetitorNames: string[];
  setActiveCompetitorNames: React.Dispatch<React.SetStateAction<string[]>>;
}

export function Tool1Comparator({ 
  siteFiles, setSiteFiles,
  comparisonResults, setComparisonResults,
  activeCompetitorNames, setActiveCompetitorNames
}: Tool1ComparatorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  const [dataForDetailPages, setDataForDetailPages] = useState<Map<string, Tool1DataPayload>>(new Map());
  const dataForDetailPagesRef = useRef(dataForDetailPages); 
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    dataForDetailPagesRef.current = dataForDetailPages;
  }, [dataForDetailPages]);

  useEffect(() => {
    if (!channelRef.current) {
        channelRef.current = new BroadcastChannel(TOOL1_DATA_CHANNEL_NAME);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'REQUEST_TOOL1_DATA' && channelRef.current) {
        const { dataId, requestingTabId } = event.data as RequestTool1DataMessage;
        const payload = dataForDetailPagesRef.current.get(dataId) || null;
        
        const responseMsg: ResponseTool1DataMessage = {
          type: 'RESPONSE_TOOL1_DATA',
          dataId,
          requestingTabId,
          payload
        };
        channelRef.current.postMessage(responseMsg);
      }
    };

    channelRef.current.onmessage = handleMessage;

    return () => {
      if (channelRef.current) {
        channelRef.current.onmessage = null; 
      }
    };
  }, []); 

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, []);


  const handleFileLoad = useCallback((siteKey: string, content: string, name: string) => {
    if (content && name) {
      setSiteFiles(prev => ({ ...prev, [siteKey]: { content, name } }));
    } else {
      setSiteFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[siteKey];
        return newFiles;
      });
      if (siteKey === 'Mio Sito') {
        localStorage.removeItem('tool1MioSitoCoreKeywords');
      }
    }
  }, [setSiteFiles]);

  const runComparison = async () => {
    setIsLoading(true);
    setLoadingMessage("Preparazione analisi...");
    setProgress(0);
    setError(null);
    setComparisonResults([]); // Clear previous results from global state
    setActiveCompetitorNames([]);
    
    dataForDetailPagesRef.current.clear();
    setDataForDetailPages(new Map());
    localStorage.removeItem('tool1MioSitoCoreKeywords'); 

    if (!siteFiles['Mio Sito']?.content) {
      setError("Carica il CSV per 'Il Mio Sito'.");
      setIsLoading(false);
      return;
    }

    const currentActiveComps = Object.keys(siteFiles).filter(key => key !== 'Mio Sito' && siteFiles[key]?.content);
    if (currentActiveComps.length === 0) {
      setError("Carica i dati CSV per almeno un Competitor.");
      setIsLoading(false);
      return;
    }
    setActiveCompetitorNames(currentActiveComps); // Set active competitors in global state

    try {
      const parsedSiteData: Record<string, CsvRowTool1[]> = {};
      for (const siteName in siteFiles) {
        if (siteFiles[siteName]?.content) {
          setLoadingMessage(`Parsing dati per ${siteFiles[siteName].name}...`);
          await new Promise(resolve => setTimeout(resolve, 50));
          parsedSiteData[siteName] = parseCSVTool1(siteFiles[siteName].content, siteFiles[siteName].name);
        }
      }
      
      if (Object.keys(parsedSiteData).length === 0 || !parsedSiteData['Mio Sito'] || parsedSiteData['Mio Sito'].length === 0) {
        setError("Nessun dato CSV valido da analizzare. Controlla i file e le intestazioni.");
        setIsLoading(false);
        return;
      }

      const mySiteName = 'Mio Sito';

      const mySiteKeywordsData = parsedSiteData[mySiteName];
      if (mySiteKeywordsData && mySiteKeywordsData.length > 0) {
        let coreKeywords = new Set<string>();
        mySiteKeywordsData
          .filter(kw => typeof kw.posizione === 'number' && kw.posizione <= 10 && kw.keyword)
          .sort((a, b) => (a.posizione as number) - (b.posizione as number))
          .slice(0, 5)
          .forEach(kw => coreKeywords.add(kw.keyword));
        if (coreKeywords.size < 10) {
          mySiteKeywordsData
            .filter(kw => typeof kw.volume === 'number' && kw.volume > 0 && kw.keyword && !coreKeywords.has(kw.keyword))
            .sort((a, b) => (b.volume as number) - (a.volume as number))
            .slice(0, 10 - coreKeywords.size)
            .forEach(kw => coreKeywords.add(kw.keyword));
        }
        if (coreKeywords.size < 5 && coreKeywords.size < mySiteKeywordsData.length) {
           mySiteKeywordsData
              .filter(kw => kw.keyword && !coreKeywords.has(kw.keyword))
              .slice(0, Math.min(5, 10 - coreKeywords.size))
              .forEach(kw => coreKeywords.add(kw.keyword));
        }
        const coreKeywordsArray = Array.from(coreKeywords);
        if (coreKeywordsArray.length > 0) {
          localStorage.setItem('tool1MioSitoCoreKeywords', JSON.stringify(coreKeywordsArray));
        }
      }

      const siteKeywordMaps: Record<string, Map<string, CsvRowTool1>> = {};
      for (const siteName in parsedSiteData) {
        siteKeywordMaps[siteName] = new Map(parsedSiteData[siteName].map(item => [item.keyword, item]));
      }

      let allKeywordsSet = new Set<string>();
      for (const siteName in parsedSiteData) {
        parsedSiteData[siteName].forEach(item => { if (item.keyword) allKeywordsSet.add(item.keyword); });
      }
      const allKeywordsArray = Array.from(allKeywordsSet);
      const totalKeywords = allKeywordsArray.length;
      
      const resultsCollector: ComparisonResult[] = [];
      
      for (let i = 0; i < totalKeywords; i += APP_CHUNK_SIZE_TOOL1) {
        const chunk = allKeywordsArray.slice(i, i + APP_CHUNK_SIZE_TOOL1);
        for (const kw of chunk) {
          if (!kw) continue;
          const mySiteEntry = siteKeywordMaps[mySiteName]?.get(kw);
          let competitorEntriesData: { name: string; entry?: CsvRowTool1 }[] = [];
          let ranksInAtLeastOneCompetitor = false;

          currentActiveComps.forEach(compName => {
            const compEntry = siteKeywordMaps[compName]?.get(kw);
            competitorEntriesData.push({ name: compName, entry: compEntry });
            if (compEntry) ranksInAtLeastOneCompetitor = true;
          });

          let status: ComparisonResult['status'] | '' = '';
          if (mySiteEntry && ranksInAtLeastOneCompetitor) status = 'common';
          else if (mySiteEntry && !ranksInAtLeastOneCompetitor) status = 'mySiteOnly';
          else if (!mySiteEntry && ranksInAtLeastOneCompetitor) status = 'competitorOnly';
          else continue;

          let commonMetricsSource = mySiteEntry;
          if (!commonMetricsSource && ranksInAtLeastOneCompetitor) {
            const firstCompetitorWithKw = competitorEntriesData.find(c => c.entry);
            if (firstCompetitorWithKw) commonMetricsSource = firstCompetitorWithKw.entry;
          }

          resultsCollector.push({
            keyword: kw,
            mySiteInfo: mySiteEntry ? { pos: mySiteEntry.posizione ?? 'N/P', url: mySiteEntry.url ?? 'N/A' } : { pos: 'N/P', url: 'N/A' },
            competitorInfo: competitorEntriesData.map(c => ({ name: c.name, pos: c.entry?.posizione ?? 'N/P', url: c.entry?.url ?? 'N/A' })),
            volume: commonMetricsSource?.volume ?? 'N/A',
            difficolta: commonMetricsSource?.difficolta ?? 'N/A',
            opportunity: commonMetricsSource?.opportunity ?? 'N/A',
            intento: commonMetricsSource?.intento ?? 'N/A',
            status,
          });
        }
        setProgress(Math.min(i + APP_CHUNK_SIZE_TOOL1, totalKeywords) / totalKeywords * 100);
        setLoadingMessage(`Analisi Comparatore... (${Math.min(i + APP_CHUNK_SIZE_TOOL1, totalKeywords)} di ${totalKeywords} kw)`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      setComparisonResults(resultsCollector); // Update global state with results
      
      // Save summary for master report (can be adjusted if Tool5 receives full results)
      if (resultsCollector.length > 0) {
        try {
            const commonKWsResult = resultsCollector.filter(r => r.status === 'common');
            const mySiteTop5Common = commonKWsResult
                .filter(kw => kw.mySiteInfo.pos !== 'N/P' && typeof kw.mySiteInfo.pos === 'number' && kw.mySiteInfo.pos <= 10)
                .sort((a, b) => (a.mySiteInfo.pos as number) - (b.mySiteInfo.pos as number))
                .slice(0, 5)
                .map(kw => ({ keyword: kw.keyword, position: kw.mySiteInfo.pos }));

            const competitorsTopCommon: Record<string, { keyword: string; position: number | string | null }[]> = {};
            currentActiveComps.slice(0, 2).forEach(compName => { 
                competitorsTopCommon[compName] = commonKWsResult
                    .filter(kw => {
                        const compInfo = kw.competitorInfo.find(c => c.name === compName);
                        return compInfo && compInfo.pos !== 'N/P' && typeof compInfo.pos === 'number' && compInfo.pos <= 10;
                    })
                    .sort((a, b) => {
                        const posA = a.competitorInfo.find(c => c.name === compName)?.pos as number;
                        const posB = b.competitorInfo.find(c => c.name === compName)?.pos as number;
                        return posA - posB;
                    })
                    .slice(0, 5)
                    .map(kw => ({ keyword: kw.keyword, position: kw.competitorInfo.find(c => c.name === compName)?.pos || 'N/P' }));
            });

            const top5Opportunities = resultsCollector
                .filter(r => r.status === 'competitorOnly' && typeof r.volume === 'number' && r.volume > 0)
                .sort((a, b) => (b.volume as number) - (a.volume as number))
                .slice(0, 5)
                .map(kw => ({ keyword: kw.keyword, volume: kw.volume }));
            
            const summaryForMasterReport = {
                comparisonResultsCount: {
                    common: commonKWsResult.length,
                    mySiteOnly: resultsCollector.filter(r => r.status === 'mySiteOnly').length,
                    competitorOnly: resultsCollector.filter(r => r.status === 'competitorOnly').length,
                    totalUnique: allKeywordsArray.length
                },
                mySiteTop5Common,
                competitorsTopCommon, 
                top5Opportunities
            };
            localStorage.setItem('tool1ResultsForMasterReport', JSON.stringify(summaryForMasterReport));
        } catch (e) {
          console.warn("Tool 1: Non è stato possibile salvare i risultati per il Master Report in localStorage (potrebbe essere troppo grande o API non disponibile).", e);
        }
      } else {
         localStorage.removeItem('tool1ResultsForMasterReport');
      }

      if (resultsCollector.length === 0 && Object.values(siteFiles).some(f => f?.content && f.content.trim() !== '')) {
        toast({ title: "Nessun Risultato", description: "Nessuna keyword valida trovata o nessuna corrispondenza/differenza significativa. Controlla le intestazioni dei tuoi file CSV."});
      } else if (resultsCollector.length > 0) {
        toast({ title: "Analisi Completata", description: `${resultsCollector.length} keyword analizzate.` });
      }

    } catch (e: any) {
      console.error("Errore durante l'analisi (Tool1):", e);
      setError(`Errore analisi (Tool1): ${e.message}`);
      toast({
        title: "Errore di Analisi",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const openDetailPage = (section: DetailPageSection) => {
    if (!comparisonResults || comparisonResults.length === 0) {
        toast({
            title: "Nessun Dato da Visualizzare",
            description: "Esegui prima un'analisi per poter visualizzare i dettagli.",
            variant: "default",
        });
        return;
    }
    try {
      const dataId = `tool1-${section}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const payloadForDetail: Tool1DataPayload = { comparisonResults, activeCompetitorNames };
      
      dataForDetailPagesRef.current.set(dataId, payloadForDetail);
      setDataForDetailPages(new Map(dataForDetailPagesRef.current));

      const url = `/tool1/${section}?dataId=${dataId}`;
      window.open(url, '_blank'); 
    } catch (e: any) {
        console.error("Errore imprevisto nell'apertura della pagina di dettaglio:", e);
        toast({
            title: "Errore Imprevisto",
            description: "Si è verificato un errore nell'aprire la pagina di dettaglio. Controlla la console.",
            variant: "destructive",
        });
         setError(`Errore imprevisto nell'apertura dei dettagli: ${e.message}`);
    }
  };

  const handleDownloadFullReport = () => {
    if (comparisonResults.length === 0) {
      toast({ title: "Nessun dato", description: "Nessun risultato da scaricare per il report completo.", variant: "destructive" });
      return;
    }
    try {
      exportTool1FullReportToXLSX("report_completo_tool1_analisi_seo.xlsx", comparisonResults, activeCompetitorNames);
      toast({ title: "Download Avviato", description: "Il report completo del Tool 1 è in scaricamento." });
    } catch (e: any) {
      console.error("Errore durante la creazione del report Excel completo (Tool1):", e);
      setError(`Errore creazione report Excel: ${e.message}`);
      toast({
        title: "Errore Export Excel",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadChartPlaceholder = () => {
    toast({
      title: "Funzionalità non implementata",
      description: "Il download del grafico come immagine richiederebbe una libreria aggiuntiva (es. html2canvas).",
      variant: "default",
    });
  };

  const competitorUploadZones = Array.from({ length: 5 }, (_, i) => `Competitor ${i + 1}`);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h2 className="text-3xl font-bold" style={{ color: 'hsl(var(--sky-600))' }}>Analizzatore Comparativo Keyword SEO</h2>
        <p className="text-muted-foreground mt-2">Trascina i file CSV per confrontare "Il Mio Sito" con fino a 5 competitor.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Caricamento File CSV</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FileUploadZone
            siteKey="Mio Sito"
            label="Il Mio Sito"
            onFileLoad={(content, name) => handleFileLoad("Mio Sito", content, name)}
          />
          {competitorUploadZones.map((key, index) => (
            <FileUploadZone
              key={key}
              siteKey={key}
              label={`Competitor ${index + 1}`}
              optional={index > 0} 
              onFileLoad={(content, name) => handleFileLoad(key, content, name)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button onClick={runComparison} disabled={isLoading} className="action-button bg-sky-600 hover:bg-sky-700 text-white text-lg">
          {isLoading ? "Analisi in corso..." : "Confronta Dati"} <BarChart3 className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {isLoading && (
        <div className="text-center my-6">
          <p className="text-sky-600 text-lg mb-2">{loadingMessage}</p>
          <Progress value={progress} className="w-3/4 mx-auto" />
        </div>
      )}

      {error && (
         <Alert variant="destructive" className="my-4">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Errore</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

      {comparisonResults.length > 0 && !isLoading && (
        <section className="mt-12 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-2xl font-semibold text-center md:text-left" style={{ color: 'hsl(var(--sky-700))' }}>Report Comparativo SEO</h3>
            <Button onClick={handleDownloadFullReport} variant="outline" className="w-full md:w-auto">
              Scarica Report Completo (Excel) <DownloadCloud className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Cos'è la "Keyword Opportunity"?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La metrica "Keyword Opportunity" (o "Punteggio di Opportunità"), quando fornita da tool SEO come Seozoom, è un indicatore sintetico che cerca di stimare il potenziale di una parola chiave. Generalmente, un punteggio più alto suggerisce una migliore opportunità. <br/>Questo punteggio è solitamente calcolato combinando diversi fattori, tra cui: Volume di Ricerca, Keyword Difficulty (KD), e a volte il Costo Per Click (CPC).<br/>Nel nostro report, le keyword nella sezione "Opportunità (Solo Competitor)" con un alto punteggio di "Keyword Opportunity" (se disponibile nel tuo CSV) e un buon volume di ricerca potrebbero essere priorità interessanti da considerare per la creazione di nuovi contenuti.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">Analisi Keyword Comuni: Posizionamento Top 10</CardTitle>
               <div className="flex items-center space-x-2">
                 <Button variant="outline" size="sm" onClick={handleDownloadChartPlaceholder}>
                    <ImageDown className="mr-2 h-4 w-4" /> Scarica Grafico
                 </Button>
                 <Button variant="link" onClick={() => openDetailPage('commonTop10')} className="detail-button">
                  Visualizza Dettaglio <BarChart3 className="ml-2 h-4 w-4"/>
                 </Button>
               </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">Confronto del numero di keyword comuni per cui "Il Mio Sito" e ciascun competitor (mostrati individualmente) si posizionano in Top 10.</CardDescription>
              <CommonKeywordsTop10Chart results={comparisonResults} activeCompetitorNames={activeCompetitorNames} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">Top 10 Opportunità per Volume (Keyword Gap)</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleDownloadChartPlaceholder}>
                    <ImageDown className="mr-2 h-4 w-4" /> Scarica Grafico
                </Button>
                <Button variant="link" onClick={() => openDetailPage('topOpportunities')} className="detail-button">
                  Visualizza Dettaglio <LineChart className="ml-2 h-4 w-4"/>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">Le keyword con il più alto volume di ricerca per cui i competitor si posizionano, ma "Il Mio Sito" no.</CardDescription>
              <TopOpportunitiesChart results={comparisonResults} />
            </CardContent>
          </Card>

          <div className="space-y-8 mt-10">
            <Card id="commonKeywordsSectionTool1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold">Anteprima Keyword Comuni</CardTitle>
                 <Button variant="link" onClick={() => openDetailPage('commonKeywordsSectionTool1')} className="detail-button">
                  Vedi Tabella Completa <FileText className="ml-2 h-4 w-4"/>
                </Button>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">Keyword per cui "Il Mio Sito" e almeno un competitor si posizionano.</CardDescription>
                <ComparisonResultsTable results={comparisonResults.filter(r => r.status === 'common').slice(0,10)} type="common" activeCompetitorNames={activeCompetitorNames} />
                <p className="mt-2 text-sm text-muted-foreground">Totale: {comparisonResults.filter(r => r.status === 'common').length} keyword</p>
              </CardContent>
            </Card>

            <Card id="mySiteOnlyKeywordsSectionTool1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold">Anteprima Punti di Forza</CardTitle>
                 <Button variant="link" onClick={() => openDetailPage('mySiteOnlyKeywordsSectionTool1')} className="detail-button">
                  Vedi Tabella Completa <FileText className="ml-2 h-4 w-4"/>
                </Button>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">Keyword per cui "Il Mio Sito" si posiziona, ma nessuno dei competitor analizzati.</CardDescription>
                <ComparisonResultsTable results={comparisonResults.filter(r => r.status === 'mySiteOnly').slice(0,10)} type="mySiteOnly" activeCompetitorNames={activeCompetitorNames}/>
                 <p className="mt-2 text-sm text-muted-foreground">Totale: {comparisonResults.filter(r => r.status === 'mySiteOnly').length} keyword</p>
              </CardContent>
            </Card>
            
            <Card id="competitorOnlyKeywordsSectionTool1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold">Anteprima Opportunità</CardTitle>
                <Button variant="link" onClick={() => openDetailPage('competitorOnlyKeywordsSectionTool1')} className="detail-button">
                  Vedi Tabella Completa <FileText className="ml-2 h-4 w-4"/>
                </Button>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">Keyword per cui i competitor si posizionano e "Il Mio Sito" no.</CardDescription>
                <ComparisonResultsTable results={comparisonResults.filter(r => r.status === 'competitorOnly').slice(0,10)} type="competitorOnly" activeCompetitorNames={activeCompetitorNames}/>
                <p className="mt-2 text-sm text-muted-foreground">Totale: {comparisonResults.filter(r => r.status === 'competitorOnly').length} keyword</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
