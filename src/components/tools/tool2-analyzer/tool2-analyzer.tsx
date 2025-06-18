"use client";
import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/shared/file-upload-zone';
import { parseCSVTool2, exportToCSV } from '@/lib/csv';
import type { CsvRowTool2, PertinenceAnalysisResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { TablePertinenceResults } from './table-pertinence-results';
import { PlayIcon, StopCircle, Download, AlertCircle, Loader2, ImportIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const APP_CHUNK_SIZE_TOOL2_OFFLINE = 50;

const STOP_WORDS_IT = [
  "a", "ad", "al", "allo", "ai", "agli", "all", "agl", "alla", "alle", "con", "col", "coi", "da", "dal", "dallo", "dai", "dagli", "dall", "dagl", "dalla", "dalle",
  "di", "del", "dello", "dei", "degli", "dell", "degl", "della", "delle", "in", "nel", "nello", "nei", "negli", "nell", "negl", "nella", "nelle", "su", "sul", "sullo",
  "sui", "sugli", "sull", "sugl", "sulla", "sulle", "per", "tra", "fra", "e", "ed", "o", "od", "ma", "però", "anche", "pure", "né", "ne", "se", "che", "chi", "cui",
  "non", "il", "lo", "i", "gli", "la", "le", "un", "uno", "una", "mio", "mia", "miei", "mie", "tuo", "tua", "tuoi", "tue", "suo", "sua", "suoi", "sue", "nostro",
  "nostra", "nostri", "nostre", "vostro", "vostra", "vostri", "vostre", "loro", "questo", "questa", "questi", "queste", "quello", "quella", "quelli", "quelle",
  "ci", "vi", "si", "io", "tu", "lui", "lei", "noi", "voi", "essi", "esse", "me", "te", "sé", "c'", "l'", "un'", "qual", "dov'", "com'", "è", "ha"
];

function tokenizeAndClean(text: string, stopWords: string[] = []): string[] {
    if (!text || typeof text !== 'string') return [];
    const cleanedText = text.toLowerCase()
                           .replace(/[^\w\s'-]/g, '') 
                           .replace(/\s+/g, ' ') 
                           .trim();

    const tokens = cleanedText.split(/\s+/)
        .map(token => token.replace(/^['-]|['-]$/g, '')) 
        .filter(token => token.length > 1 && token !== '-' && token !== "'" && !stopWords.includes(token.toLowerCase()));
    return tokens;
}

interface Tool2AnalyzerProps {
  industry: string;
  setIndustry: (value: string) => void;
  industryKeywords: string;
  setIndustryKeywords: (value: string) => void;
  csvFile: { content: string; name: string } | null;
  setCsvFile: (file: { content: string; name: string } | null) => void;
  analysisResults: PertinenceAnalysisResult[];
  setAnalysisResults: React.Dispatch<React.SetStateAction<PertinenceAnalysisResult[]>>;
}

export function Tool2Analyzer({
  industry,
  setIndustry,
  industryKeywords,
  setIndustryKeywords,
  csvFile,
  setCsvFile,
  analysisResults,
  setAnalysisResults,
}: Tool2AnalyzerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isAnalysisStoppedRef = useRef(false);

  const { toast } = useToast();

  const handleFileLoad = useCallback((content: string, name: string) => {
    if (content && name) {
      setCsvFile({ content, name });
    } else {
      setCsvFile(null);
    }
  }, [setCsvFile]);

  const handleStopAnalysis = () => {
    isAnalysisStoppedRef.current = true;
    setLoadingMessage("Interruzione analisi in corso...");
    toast({ title: "Analisi Interrotta", description: "L'analisi è stata interrotta dall'utente." });
  };

  const checkPertinenzaOffline = (keywordAnalizzata: string, settoreGlobale: string, paroleChiavePrincipaliInput: string): { pertinente: boolean; motivazione: string } => {
    const kwTokens = tokenizeAndClean(keywordAnalizzata, STOP_WORDS_IT);
    const settoreTokens = tokenizeAndClean(settoreGlobale, STOP_WORDS_IT);
    const paroleChiavePrincipali = tokenizeAndClean(paroleChiavePrincipaliInput, STOP_WORDS_IT);
    
    const modificatoriInformativi = ["significato", "cos'è", "come funziona", "guida", "tutorial", "definizione", "spiegazione", "informazioni", "dettagli", "base", "principiante", "avanzato", "cosa sono", "perché", "quando"];
    const modificatoriCommerciali = ["prezzi", "costo", "offerta", "sconto", "comprare", "acquistare", "vendita", "noleggio", "servizio di", "consulenza per", "preventivo", "shop", "negozio", "migliore", "top"];
    
    let punteggioPertinenza = 0;
    const motivazioneLogSet = new Set<string>();
    const kwTokensAlreadyMatchedForPK = new Set<string>();
    const kwTokensAlreadyMatchedForSettore = new Set<string>();
    let modificatoreLogAdded = false;

    for (const pkToken of paroleChiavePrincipali) {
        for (const kwToken of kwTokens) {
            if (kwToken === pkToken && !kwTokensAlreadyMatchedForPK.has(kwToken)) {
                punteggioPertinenza += 3;
                motivazioneLogSet.add(`Corrisponde alla parola chiave di settore '${pkToken}'.`);
                kwTokensAlreadyMatchedForPK.add(kwToken);
            }
        }
    }

    const tokenSettoreSignificativi = settoreTokens.filter(t => t.length > 2 && !paroleChiavePrincipali.includes(t)); 
    for (const sToken of tokenSettoreSignificativi) {
        for (const kwToken of kwTokens) {
            if (kwToken === sToken && !paroleChiavePrincipali.includes(kwToken) && !kwTokensAlreadyMatchedForSettore.has(kwToken) && !kwTokensAlreadyMatchedForPK.has(kwToken)) {
                 punteggioPertinenza += 2;
                 motivazioneLogSet.add(`Contiene termine rilevante dal settore ('${settoreGlobale}'): '${sToken}'.`);
                 kwTokensAlreadyMatchedForSettore.add(kwToken);
            }
        }
    }
    
    let modificatoreTrovato = null;
    let tokenChiaveConModificatoreTrovato = null;

    for (const mod of [...modificatoriInformativi, ...modificatoriCommerciali]) {
        if (kwTokens.includes(mod)) {
            modificatoreTrovato = mod;
            for (const kwToken of kwTokens) {
                if (kwToken !== mod && (paroleChiavePrincipali.includes(kwToken) || tokenSettoreSignificativi.includes(kwToken) || kwTokensAlreadyMatchedForPK.has(kwToken) || kwTokensAlreadyMatchedForSettore.has(kwToken) )) {
                    tokenChiaveConModificatoreTrovato = kwToken;
                    break;
                }
            }
            if (tokenChiaveConModificatoreTrovato) break;
        }
    }

    if (modificatoreTrovato && tokenChiaveConModificatoreTrovato && !modificatoreLogAdded) {
        punteggioPertinenza += 2;
        let tipoIntento = modificatoriInformativi.includes(modificatoreTrovato) ? "informativo" : "commerciale/transazionale";
        motivazioneLogSet.add(`Rilevato intento ${tipoIntento} ('${modificatoreTrovato}') associato al termine di settore '${tokenChiaveConModificatoreTrovato}'.`);
        modificatoreLogAdded = true; 
    }
    
    const motivazioneFinale = Array.from(motivazioneLogSet).join(" ");
    const sogliaMinimaPertinenza = paroleChiavePrincipali.length > 0 || settoreTokens.length > 0 ? 2 : 1; 

    if (punteggioPertinenza >= sogliaMinimaPertinenza) { 
        return { pertinente: true, motivazione: "In Target. " + (motivazioneFinale.length > 0 ? motivazioneFinale : "Corrispondenza generica con il settore.") };
    } else {
        return { pertinente: false, motivazione: "Fuori Target. " + (motivazioneFinale.length > 0 ? motivazioneFinale : `Nessuna corrispondenza forte con il settore '${settoreGlobale}' o le parole chiave fornite.`) };
    }
  };

  const valutaPrioritaEMotivazioneOffline = (volume: number | string, kd: number | string, opportunity: number | string, posizione: number | string, pertinenzaInfo: { pertinente: boolean; motivazione: string }): { priorita: string; motivazione: string } => {
      let prioritaCat = "SEO: N/D";
      let motivazioneArr = [pertinenzaInfo.motivazione]; 

      const vol = (typeof volume === 'number' && !isNaN(volume)) ? volume : null;
      const keyDiff = (typeof kd === 'number' && !isNaN(kd)) ? kd : null;
      const opp = (typeof opportunity === 'number' && !isNaN(opportunity)) ? opportunity : null;
      const pos = (typeof posizione === 'number' && !isNaN(posizione)) ? posizione : null;

      if (!pertinenzaInfo.pertinente) {
          return { priorita: "SEO: Non Applicabile", motivazione: pertinenzaInfo.motivazione };
      }

      if (pos !== null && pos > 0 && pos <= 3) {
          prioritaCat = "SEO: Mantenimento";
          motivazioneArr.push(`Posizione attuale (${pos}) eccellente: l'obiettivo è difenderla e monitorare costantemente le performance.`);
      } else if (vol === null || keyDiff === null) {
          prioritaCat = "SEO: Dati Insufficienti";
          motivazioneArr.push("Mancano dati cruciali (Volume e/o KD) per una valutazione SEO completa della priorità.");
      } else if (vol > 800 && keyDiff < 50 && (opp === null || opp > 60)) {
          prioritaCat = "SEO: Priorità Alta";
          motivazioneArr.push("Questa keyword rappresenta un'alta priorità strategica.");
          motivazioneArr.push(`Il volume di ricerca (${vol}) è elevato e la Keyword Difficulty (${keyDiff}) è considerata gestibile.`);
          if (opp !== null) motivazioneArr.push(`L'Opportunity Score (${opp}) è promettente.`);
          if (pos !== null && pos > 3) motivazioneArr.push(`Con una posizione attuale di ${pos}, c'è un buon potenziale di crescita verso le prime posizioni.`);
           else if (pos === null || pos === 0 || pos > 10) motivazioneArr.push(`Attualmente non nelle prime posizioni (${pos !== null ? pos : 'N/P'}).`);
      } else if (vol > 300 && keyDiff < 65 && (opp === null || opp > 35)) {
          prioritaCat = "SEO: Priorità Media";
          motivazioneArr.push("Priorità media per questa keyword.");
          motivazioneArr.push(`Presenta un volume di ricerca (${vol}) discreto.`);
          if (keyDiff < 50) motivazioneArr.push(`La KD (${keyDiff}) è favorevole.`);
          else motivazioneArr.push(`La KD (${keyDiff}) è di medio livello e richiede un'analisi competitiva per stimare lo sforzo.`);
          if (opp !== null) motivazioneArr.push(`L'Opportunity Score (${opp}) è interessante.`);
           if (pos !== null && pos > 0) motivazioneArr.push(`Posizione attuale: ${pos}. Valutare l'ottimizzazione per migliorare.`);
      } else if (keyDiff !== null && keyDiff > 70 && vol < 500) {
          prioritaCat = "SEO: Priorità Bassa (Difficile)";
          motivazioneArr.push("Bassa priorità a causa dell'elevata difficoltà.");
          motivazioneArr.push(`La KD (${keyDiff}) è molto alta rispetto al volume di ricerca (${vol}).`);
      } else if (vol < 50) {
          prioritaCat = "SEO: Priorità Bassa (Volume Scarso)";
          motivazioneArr.push("Bassa priorità a causa del volume esiguo.");
          motivazioneArr.push(`Il volume di ricerca (${vol}) è molto basso e potrebbe non giustificare uno sforzo SEO dedicato al momento.`);
      } else {
          prioritaCat = "SEO: Priorità Bassa/Da Valutare";
          motivazioneArr.push("Da valutare attentamente in base alla strategia complessiva.");
          motivazioneArr.push(`Le metriche (Vol: ${vol ?? 'N/A'}, KD: ${keyDiff ?? 'N/A'}, Opp: ${opp ?? 'N/A'}) suggeriscono un potenziale limitato o uno sforzo elevato.`);
      }
      
      motivazioneArr.push(`Dati metriche -> Volume: ${vol ?? 'N/A'}, KD: ${keyDiff ?? 'N/A'}, Opportunity: ${opp ?? 'N/A'}, Posizione: ${pos ?? 'N/A'}.`);
      
      return { priorita: prioritaCat, motivazione: motivazioneArr.join(" ").trim() };
  };

  const handleImportKeywordsFromTool1 = () => {
    try {
      const storedKeywordsString = localStorage.getItem('tool1MioSitoCoreKeywords');
      if (storedKeywordsString) {
        const keywordsArray: string[] = JSON.parse(storedKeywordsString);
        if (keywordsArray && keywordsArray.length > 0) {
          setIndustryKeywords(keywordsArray.join(', '));
          toast({
            title: "Keyword Importate",
            description: `${keywordsArray.length} keyword principali da 'Mio Sito' (Tool 1) sono state caricate.`,
          });
        } else {
          toast({
            title: "Nessuna Keyword da Importare",
            description: "Non sono state trovate keyword principali da 'Mio Sito' (Tool 1) da importare.",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Dati Tool 1 Non Trovati",
          description: "Esegui prima un'analisi con 'Mio Sito' nel Tool 1 per poter importare le keyword.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Errore durante l'importazione delle keyword da localStorage:", error);
      toast({
        title: "Errore Importazione",
        description: "Si è verificato un errore durante l'importazione delle keyword.",
        variant: "destructive",
      });
    }
  };


  const runAnalysis = async () => {
    const globalSettore = industry.trim();
    const paroleChiaveSettore = industryKeywords.trim();

    if (!csvFile) { setError("Carica un file CSV con le keyword."); return; }
    if (!globalSettore && !paroleChiaveSettore) { 
      setError("Inserisci il Settore di Riferimento e/o le Parole Chiave Specifiche del Settore.");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Preparazione analisi offline...");
    setProgress(0);
    setError(null);
    setAnalysisResults([]); 
    isAnalysisStoppedRef.current = false;

    try {
      const keywordData = parseCSVTool2(csvFile.content);
      if (!keywordData || keywordData.length === 0) {
        setError("Nessun dato valido trovato nel file CSV. Assicurati che ci siano le colonne richieste.");
        setIsLoading(false);
        return;
      }

      const totalKeywords = keywordData.length;
      const resultsCollector: PertinenceAnalysisResult[] = [];
      
      for (let i = 0; i < totalKeywords; i += APP_CHUNK_SIZE_TOOL2_OFFLINE) {
        if (isAnalysisStoppedRef.current) break;

        const chunk = keywordData.slice(i, i + APP_CHUNK_SIZE_TOOL2_OFFLINE);
        setLoadingMessage(`Analisi keyword ${i + 1}-${Math.min(i + chunk.length, totalKeywords)} di ${totalKeywords}...`);
        
        const chunkPromises = chunk.map(async (row) => {
          if (isAnalysisStoppedRef.current) return null;
          try {
            const pertinenzaInfo = checkPertinenzaOffline(row.keyword, globalSettore, paroleChiaveSettore);
            const analisiPriorita = valutaPrioritaEMotivazioneOffline(row.volume, row.difficolta, row.opportunity, row.posizione, pertinenzaInfo);
            
            return {
              keyword: row.keyword,
              settore: globalSettore,
              pertinenza: pertinenzaInfo.pertinente ? "In Target" : "Fuori Target",
              prioritaSEO: analisiPriorita.priorita,
              motivazioneSEO: analisiPriorita.motivazione,
              volume: row.volume,
              kd: row.difficolta,
              opportunity: row.opportunity,
              posizione: row.posizione,
              url: row.url,
              intento: row.intento
            };
          } catch (e: any) {
            console.error(`Errore analisi keyword ${row.keyword}:`, e);
            return {
              keyword: row.keyword,
              settore: globalSettore,
              pertinenza: "Errore",
              prioritaSEO: "Errore",
              motivazioneSEO: e.message || "Errore sconosciuto durante analisi offline",
              volume: row.volume,
              kd: row.difficolta,
              opportunity: row.opportunity,
              posizione: row.posizione,
              url: row.url,
              intento: row.intento
            };
          }
        });

        const chunkResults = (await Promise.all(chunkPromises)).filter(r => r !== null) as PertinenceAnalysisResult[];
        resultsCollector.push(...chunkResults);
        setAnalysisResults(prev => [...prev, ...chunkResults]); 
        
        setProgress(((i + chunk.length) / totalKeywords) * 100);
        
        if (!isAnalysisStoppedRef.current && i + APP_CHUNK_SIZE_TOOL2_OFFLINE < totalKeywords) {
          await new Promise(resolve => setTimeout(resolve, 0)); 
        }
      }

      if (isAnalysisStoppedRef.current) {
        setLoadingMessage(`Analisi interrotta. ${resultsCollector.length} keyword processate.`);
      } else {
        setLoadingMessage("Analisi completata!");
        toast({ title: "Analisi Completata", description: `${resultsCollector.length} keyword analizzate.` });
      }

    } catch (e: any) {
      console.error("Errore durante l'analisi (Tool 2 Offline):", e);
      setError(`Errore analisi (Tool 2 Offline): ${e.message}`);
      toast({
        title: "Errore di Analisi",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (analysisResults.length === 0) {
      toast({ title: "Nessun dato", description: "Nessun risultato da scaricare.", variant: "destructive" });
      return;
    }
    const headers = ["Keyword", "Settore Analizzato", "Pertinenza", "Priorità SEO", "Motivazione", "Volume", "KD", "Opportunity", "Posizione", "URL", "Intent"];
    const dataToExport = analysisResults.map(res => ({
        "Keyword": res.keyword || "",
        "Settore Analizzato": res.settore || "",
        "Pertinenza": res.pertinenza || "",
        "Priorità SEO": res.prioritaSEO || "",
        "Motivazione": res.motivazioneSEO || "",
        "Volume": res.volume !== undefined ? res.volume : "N/A",
        "KD": res.kd !== undefined ? res.kd : "N/A",
        "Opportunity": res.opportunity !== undefined ? res.opportunity : "N/A",
        "Posizione": res.posizione !== undefined ? res.posizione : "N/A",
        "URL": res.url || "",
        "Intent": res.intento || ""
    }));
    exportToCSV("report_analisi_pertinenza_priorita_offline.csv", headers, dataToExport);
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h2 className="text-3xl font-bold" style={{ color: 'hsl(var(--sky-600))' }}>Analizzatore Pertinenza & Priorità KW (Offline)</h2>
        <p className="text-muted-foreground mt-2">Determina pertinenza e priorità SEO per le tue keyword con regole offline.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Configurazione Analisi Offline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="settoreTool2" className="block text-sm font-medium text-foreground mb-1">Settore di Riferimento (Generale)</label>
              <Input 
                type="text" 
                id="settoreTool2" 
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Es: Marketing Online, Ristorazione, etc." 
              />
               <p className="text-xs text-muted-foreground mt-1">Usato per un matching generico se le parole chiave specifiche non bastano.</p>
            </div>
            <div>
              <label htmlFor="paroleChiaveSettoreTool2" className="block text-sm font-medium text-foreground mb-1">Parole Chiave Specifiche del Settore (Separate da virgola)</label>
              <Textarea
                id="paroleChiaveSettoreTool2"
                value={industryKeywords}
                onChange={(e) => setIndustryKeywords(e.target.value)}
                placeholder="Es: SEO, content marketing, advertising online"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">Le KW più importanti che definiscono il tuo settore. Essenziali per l'analisi di pertinenza.</p>
               <Button 
                variant="outline" 
                size="sm" 
                onClick={handleImportKeywordsFromTool1} 
                className="mt-2 text-xs"
              >
                <ImportIcon className="mr-2 h-3 w-3" /> Importa KW Principali da 'Mio Sito' (Tool 1)
              </Button>
            </div>
          </div>
          <div>
            <FileUploadZone
              siteKey="Tool2File"
              label="File CSV Keyword e Dati SEO"
              onFileLoad={handleFileLoad}
              dropInstructionText="Trascina qui il file CSV (con colonne: Keyword, Volume, KD, Opportunity, Posizione, URL, Intent) o clicca."
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center space-x-4">
        <Button onClick={runAnalysis} disabled={isLoading} className="action-button bg-sky-600 hover:bg-sky-700 text-white text-lg">
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayIcon className="mr-2 h-5 w-5" />}
          {isLoading ? "Analisi in corso..." : "Analizza Keyword (Offline)"}
        </Button>
        {isLoading && (
          <Button onClick={handleStopAnalysis} variant="destructive" className="action-button text-lg">
            <StopCircle className="mr-2 h-5 w-5" /> Interrompi Analisi
          </Button>
        )}
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

      {analysisResults.length > 0 && ( 
        <section className="mt-10">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Risultati Analisi Pertinenza e Priorità SEO (Offline)</CardTitle>
                <CardDescription>{analysisResults.length} keyword analizzate finora.</CardDescription>
              </div>
              <Button onClick={handleDownloadCSV} variant="outline" disabled={isLoading && analysisResults.length === 0}>
                Scarica Risultati (CSV) <Download className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <TablePertinenceResults results={analysisResults} />
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
