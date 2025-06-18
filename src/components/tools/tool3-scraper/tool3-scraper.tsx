
"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ScrapedAd, AdWithAngleAnalysis, ApifyRawAdItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { analyzeAdAngleAction } from '@/app/actions/tool3-actions';
import { TableScrapedAds } from './table-scraped-ads';
import { TableAngleAnalysis } from './table-angle-analysis';
import { exportToCSV } from '@/lib/csv';
import { PlayIcon, Download, AlertCircle, Bot, SearchCode, Loader2, FileText, PackageX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface Tool3ScraperProps {
  apifyToken: string;
  setApifyToken: (value: string) => void;
  apifyActorId: string;
  setApifyActorId: (value: string) => void;
  fbAdsUrl: string;
  setFbAdsUrl: (value: string) => void;
  maxAdsToProcess: number;
  setMaxAdsToProcess: (value: number) => void;
  openAIApiKey: string;
  setOpenAIApiKey: (value: string) => void;
  scrapedAds: ScrapedAd[];
  setScrapedAds: React.Dispatch<React.SetStateAction<ScrapedAd[]>>;
  adsWithAnalysis: AdWithAngleAnalysis[];
  setAdsWithAnalysis: React.Dispatch<React.SetStateAction<AdWithAngleAnalysis[]>>;
}

export function Tool3Scraper({
  apifyToken,
  setApifyToken,
  apifyActorId,
  setApifyActorId,
  fbAdsUrl,
  setFbAdsUrl,
  maxAdsToProcess,
  setMaxAdsToProcess,
  openAIApiKey,
  setOpenAIApiKey,
  scrapedAds,
  setScrapedAds,
  adsWithAnalysis,
  setAdsWithAnalysis,
}: Tool3ScraperProps) {
  const [isLoadingScraping, setIsLoadingScraping] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [apifyStatus, setApifyStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openAIPluginMissingError, setOpenAIPluginMissingError] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const runScraping = async () => {
    if (!apifyToken) { setError("Inserisci il tuo Apify API Token."); return; }
    if (!apifyActorId) { setError("Inserisci l'Apify Actor ID."); return; }
    if (!fbAdsUrl || !fbAdsUrl.startsWith("http")) { setError("Inserisci un URL valido per la Facebook Ads Library."); return; }

    setIsLoadingScraping(true);
    setLoadingMessage("Avvio scraping con Apify...");
    setApifyStatus("Stato: Inizializzazione...");
    setError(null);
    setOpenAIPluginMissingError(false);
    setScrapedAds([]); 
    setAdsWithAnalysis([]); 

    const apifyInputPayload = {
      urls: [{ url: fbAdsUrl }],
      count: 100, 
      "scrapePageAds.activeStatus": "all",
      period: ""
    };
    const apiUrl = `https://api.apify.com/v2/acts/${apifyActorId}/run-sync-get-dataset-items?token=${apifyToken}&format=json&clean=true`;

    try {
      setLoadingMessage("Esecuzione Actor Apify (potrebbe richiedere tempo)...");
      setApifyStatus("Stato: Invocazione API Apify...");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyInputPayload)
      });

      const responseText = await response.text();
      if (!response.ok) {
        let errorMsg = `Errore API Apify (${response.status})`;
        try { const errorJson = JSON.parse(responseText); errorMsg += `: ${errorJson.error?.message || responseText}`; } 
        catch (e) { errorMsg += `: ${responseText}`; }
        throw new Error(errorMsg);
      }

      const items: ApifyRawAdItem[] = JSON.parse(responseText);
      if (!Array.isArray(items)) throw new Error("La risposta dell'API Apify non è un array come atteso.");
      
      if (items.length === 0) {
        setLoadingMessage("Scraping completato. Nessun dato trovato.");
        setApifyStatus("Stato: Completato - Nessun dato.");
        toast({ title: "Nessun Annuncio", description: "Nessun annuncio trovato per i criteri specificati." });
        setIsLoadingScraping(false);
        return;
      }
      
      setLoadingMessage("Processazione risultati...");
      setApifyStatus("Stato: Processazione dati...");

      const processedAdsCollector: ScrapedAd[] = [];
      let adsCounter = 0;
      for (const item of items) {
        const snapshotCards = item.snapshot?.cards;
        if (snapshotCards && snapshotCards.length > 0) {
          for (const card of snapshotCards) {
            if (adsCounter >= maxAdsToProcess) break;
            processedAdsCollector.push({
              id: generateId(),
              testo: card.body || "",
              titolo: card.title || "",
              link: card.link_url || "",
              immagine: card.resized_image_url || card.original_image_url || ""
            });
            adsCounter++;
          }
        } else if (item.snapshot && (item.snapshot.body?.text || item.snapshot.videos?.length > 0 || item.snapshot.images?.length > 0)) {
          if (adsCounter < maxAdsToProcess) {
            processedAdsCollector.push({
              id: generateId(),
              testo: item.snapshot.body?.text || "",
              titolo: item.snapshot.title || item.snapshot.page_name || "N/D",
              link: item.snapshot.link_url || item.snapshot.page_profile_uri || item.url || "",
              immagine: item.snapshot.videos?.[0]?.video_preview_image_url || item.snapshot.images?.[0]?.url || item.snapshot.page_profile_picture_url || ""
            });
            adsCounter++;
          }
        }
        if (adsCounter >= maxAdsToProcess) break;
      }
      
      setScrapedAds(processedAdsCollector); 
      setAdsWithAnalysis(processedAdsCollector.map(ad => ({...ad}))); 
      setLoadingMessage("Scraping completato!");
      setApifyStatus("Stato: Completato.");
      toast({ title: "Scraping Completato", description: `${processedAdsCollector.length} annunci recuperati.` });

    } catch (e: any) {
      console.error("Errore durante lo scraping (Tool 3):", e);
      setError(`Errore scraping: ${e.message}`);
      setApifyStatus(`Stato: Errore - ${e.message.substring(0,100)}`);
      toast({ title: "Errore Scraping", description: e.message, variant: "destructive" });
    } finally {
      setIsLoadingScraping(false);
    }
  };

  const runAngleAnalysis = async () => {
    if (scrapedAds.length === 0) {
      setError("Nessun annuncio disponibile per l'analisi. Esegui prima lo scraping.");
      return;
    }
    
    const currentOpenAIApiKey = openAIApiKey.trim();
    if (!currentOpenAIApiKey) {
      setError("Inserisci la tua OpenAI API Key per l'analisi dell'angle.");
      toast({ title: "OpenAI API Key Mancante", description: "Inserisci la OpenAI API Key per l'analisi.", variant: "destructive" });
      return;
    }

    setIsLoadingAnalysis(true);
    setLoadingMessage("Analisi angle in corso con OpenAI...");
    setError(null);
    setOpenAIPluginMissingError(false);

    const currentAdsForAnalysis = [...adsWithAnalysis]; 

    const analysisPromises = currentAdsForAnalysis.map(async (ad) => {
      if (ad.angleAnalysis || ad.analysisError) return ad; 
      try {
        const analysisResult = await analyzeAdAngleAction({
          adText: ad.testo,
          adTitle: ad.titolo,
        }, currentOpenAIApiKey);
        
        // Controlla se l'analisi è fallita a causa del plugin mancante
        if (analysisResult.evaluation === "Analisi AI Non Disponibile" && analysisResult.detailedAnalysis.includes("plugin OpenAI potrebbe non essere installato")) {
          setOpenAIPluginMissingError(true); // Imposta lo stato per mostrare l'avviso globale
        }
        return { ...ad, angleAnalysis: analysisResult };
      } catch (e: any) {
        console.error(`Errore analisi angle per ad "${ad.titolo}":`, e);
        // Se l'errore è dovuto al plugin mancante, questo potrebbe non essere catturato qui, ma nel flow
        if (e.message && e.message.toLowerCase().includes("openai")) {
           setOpenAIPluginMissingError(true);
        }
        return { ...ad, analysisError: e.message || "Errore sconosciuto durante analisi AI con OpenAI" };
      }
    });

    try {
      const results = await Promise.all(analysisPromises);
      setAdsWithAnalysis(results); 
      setLoadingMessage("Analisi angle completata!");
      toast({ title: "Analisi Angle Completata", description: "L'analisi 7C degli annunci (OpenAI) è terminata." });
    } catch (e: any) {
      setError(`Errore durante l'analisi degli angle (OpenAI): ${e.message}`);
      toast({ title: "Errore Analisi Angle (OpenAI)", description: e.message, variant: "destructive" });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };
  
  const handleDownloadCSV = () => {
    if (adsWithAnalysis.length === 0) {
      toast({ title: "Nessun dato", description: "Nessun risultato da scaricare.", variant: "destructive" });
      return;
    }
    const headers = [
      "Testo Ad", "Titolo Ad", "Link Ad", "Immagine Ad URL", 
      "7C_C1_Chiarezza", "7C_C2_Coinvolgimento", "7C_C3_Concretezza", "7C_C4_CoerenzaTarget", 
      "7C_C5_Credibilita", "7C_C6_CTA", "7C_C7_Contesto",
      "7C_PunteggioTotale", "7C_Valutazione", "7C_AnalisiApprofondita", "Errore Analisi"
    ];
    const dataToExport = adsWithAnalysis.map(item => ({
      "Testo Ad": item.testo,
      "Titolo Ad": item.titolo,
      "Link Ad": item.link,
      "Immagine Ad URL": item.immagine,
      "7C_C1_Chiarezza": item.angleAnalysis?.c1Clarity,
      "7C_C2_Coinvolgimento": item.angleAnalysis?.c2Engagement,
      "7C_C3_Concretezza": item.angleAnalysis?.c3Concreteness,
      "7C_C4_CoerenzaTarget": item.angleAnalysis?.c4Coherence,
      "7C_C5_Credibilita": item.angleAnalysis?.c5Credibility,
      "7C_C6_CTA": item.angleAnalysis?.c6CallToAction,
      "7C_C7_Contesto": item.angleAnalysis?.c7Context,
      "7C_PunteggioTotale": item.angleAnalysis?.totalScore,
      "7C_Valutazione": item.angleAnalysis?.evaluation,
      "7C_AnalisiApprofondita": item.angleAnalysis?.detailedAnalysis,
      "Errore Analisi": item.analysisError || (item.angleAnalysis?.error || ""),
    }));
    exportToCSV("fb_ads_analysis_report.csv", headers, dataToExport);
  };
  
  const openAngleAnalysisDetailPage = () => {
    if (adsWithAnalysis.length === 0 || !adsWithAnalysis.some(ad => ad.angleAnalysis)) {
      toast({ title: "Dati Insufficienti", description: "Esegui prima lo scraping e l'analisi degli angle.", variant: "destructive"});
      return;
    }
    localStorage.setItem('tool3AngleAnalysisData', JSON.stringify(adsWithAnalysis));
    router.push('/tool3/angle-analysis');
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h2 className="text-3xl font-bold" style={{ color: 'hsl(var(--sky-600))' }}>Facebook Ads Library Scraper (via Apify)</h2>
        <p className="text-muted-foreground mt-2">Estrai dati dalla Facebook Ads Library e analizza gli angle di marketing con OpenAI.</p>
      </header>

      {openAIPluginMissingError && (
        <Alert variant="destructive" className="my-4">
          <PackageX className="h-4 w-4" />
          <AlertTitle>Plugin OpenAI Mancante o Non Funzionante</AlertTitle>
          <AlertDescription>
            L'analisi dell'angle degli annunci non può essere eseguita perché il plugin Genkit per OpenAI (`@genkit-ai/openai`)
            non è stato installato correttamente. Questo è probabilmente dovuto a problemi con `npm install` che non riesce a trovare il pacchetto.
            Verifica la configurazione del tuo ambiente `npm` (registro, cache, connessione di rete) e prova a reinstallare i pacchetti
            o il plugin `@genkit-ai/openai` manualmente. Fino a quando il plugin non sarà installato, questa funzionalità rimarrà non disponibile.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Configurazione Scraping & Analisi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="apifyTokenTool3" className="block text-sm font-medium text-foreground mb-1">Apify API Token</label>
            <Input type="password" id="apifyTokenTool3" value={apifyToken} onChange={(e) => setApifyToken(e.target.value)} placeholder="Il tuo token API Apify" />
          </div>
          <div>
            <label htmlFor="apifyActorIdTool3" className="block text-sm font-medium text-foreground mb-1">Apify Actor ID</label>
            <Input type="text" id="apifyActorIdTool3" value={apifyActorId} onChange={(e) => setApifyActorId(e.target.value)} />
          </div>
          <div>
            <label htmlFor="fbAdsUrlTool3" className="block text-sm font-medium text-foreground mb-1">URL Facebook Ads Library</label>
            <Input type="url" id="fbAdsUrlTool3" value={fbAdsUrl} onChange={(e) => setFbAdsUrl(e.target.value)} placeholder="Es: https://www.facebook.com/ads/library/?q=nomepagina..." />
          </div>
          <div>
            <label htmlFor="maxAdsToProcessTool3" className="block text-sm font-medium text-foreground mb-1">Numero Annunci da Analizzare (max 100)</label>
            <Input type="number" id="maxAdsToProcessTool3" value={maxAdsToProcess} onChange={(e) => setMaxAdsToProcess(Math.min(100, Math.max(1, parseInt(e.target.value))))} min="1" max="100" />
          </div>
           <div>
            <label htmlFor="openAIApiKeyTool3" className="block text-sm font-medium text-foreground mb-1">OpenAI API Key</label> 
            <Input 
              type="password" 
              id="openAIApiKeyTool3"
              value={openAIApiKey}
              onChange={(e) => setOpenAIApiKey(e.target.value)}
              placeholder="La tua chiave API OpenAI (es. sk-...)" 
            />
            <p className="text-xs text-muted-foreground mt-1">Usata per l'analisi 7C con i modelli OpenAI.</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center">
        <Button onClick={runScraping} disabled={isLoadingScraping || isLoadingAnalysis} className="action-button bg-sky-600 hover:bg-sky-700 text-white text-lg">
          {isLoadingScraping ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <SearchCode className="mr-2 h-5 w-5" />}
          {isLoadingScraping ? "Scraping..." : "Avvia Scraping"}
        </Button>
      </div>

      {(isLoadingScraping || isLoadingAnalysis) && (
        <div className="text-center my-6">
          <p className="text-sky-600 text-lg mb-1">{loadingMessage}</p>
          {isLoadingScraping && <p className="text-sm text-muted-foreground">{apifyStatus}</p>}
          {(isLoadingScraping || isLoadingAnalysis) && <Progress value={isLoadingAnalysis ? 50 : 25} className="w-3/4 mx-auto mt-2" />}
        </div>
      )}

      {error && (
         <Alert variant="destructive" className="my-4">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Errore</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}
      
      {scrapedAds.length > 0 && !isLoadingScraping && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="text-2xl">Risultati Scraping Facebook Ads</CardTitle>
            <CardDescription>{scrapedAds.length} annunci recuperati.</CardDescription>
          </CardHeader>
          <CardContent>
            <TableScrapedAds ads={scrapedAds} />
            <div className="text-center mt-8">
              <Button 
                onClick={runAngleAnalysis} 
                disabled={isLoadingAnalysis || openAIPluginMissingError} 
                className="action-button bg-purple-600 hover:bg-purple-700 text-white text-lg"
                title={openAIPluginMissingError ? "Funzionalità non disponibile a causa di problemi con l'installazione del plugin OpenAI" : "Analizza angle con OpenAI"}
              >
                {isLoadingAnalysis ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Bot className="mr-2 h-5 w-5" />}
                {isLoadingAnalysis ? "Analisi Angle (OpenAI)..." : "Analizza Angle Inserzioni (7C con OpenAI)"} 
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {adsWithAnalysis.some(ad => ad.angleAnalysis || ad.analysisError) && !isLoadingAnalysis && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Risultati Analisi Angle (Metodo 7C con OpenAI)</CardTitle>
            </div>
            <Button variant="link" onClick={openAngleAnalysisDetailPage} className="detail-button">
                Visualizza Report Dettagliato <FileText className="ml-2 h-4 w-4"/>
            </Button>
          </CardHeader>
          <CardContent>
             <TableAngleAnalysis adsWithAnalysis={adsWithAnalysis.slice(0,5)} /> 
             {adsWithAnalysis.length > 5 && <p className="text-sm text-muted-foreground text-center mt-2">Mostrati i primi 5 risultati. Clicca su "Visualizza Report Dettagliato" per vederli tutti.</p>}
          </CardContent>
        </Card>
      )}

      {(scrapedAds.length > 0 || adsWithAnalysis.length > 0) && !isLoadingScraping && !isLoadingAnalysis && (
         <div className="text-center mt-6">
            <Button onClick={handleDownloadCSV} variant="outline">
              Scarica Risultati Completi (CSV) <Download className="ml-2 h-4 w-4" />
            </Button>
          </div>
      )}

    </div>
  );
}
