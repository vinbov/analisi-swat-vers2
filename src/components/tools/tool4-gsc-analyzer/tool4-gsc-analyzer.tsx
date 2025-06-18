
"use client";
import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/shared/file-upload-zone';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/csv';
import type { GscSheetRow, GscParsedData, GscAnalyzedData, GscSectionAnalysis, GscReportType, GscAnalyzedItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TableGSC } from './table-gsc';
import { ChartGSC } from './charts-gsc';
import { Loader2, BarChart2, PieChartIcon, Download, AlertCircle, Eye } from 'lucide-react';
import Image from 'next/image';

const GSC_SHEET_MAPPING: Record<GscReportType, string[]> = {
    filters: ["Filters", "Filtri", "Panoramica"],
    queries: ["Queries", "Query", "Query di ricerca", "Principali query"],
    pages: ["Pages", "Pagine", "Pagine principali", "Principali pagine"],
    countries: ["Countries", "Paesi"],
    devices: ["Devices", "Dispositivi"],
    searchAppearance: ["Search Appearance", "Aspetto nella ricerca", "Search appearances", "Tipi di risultati multimediali", "Aspetto della ricerca"]
};
const GSC_SHEET_DISPLAY_ORDER: GscReportType[] = ['filters', 'queries', 'pages', 'countries', 'devices', 'searchAppearance'];

const GSC_LOGO_URL = "https://placehold.co/150x50/1e3a8a/FFFFFF?text=GSC+Tool";
const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface Tool4GSCAnalyzerProps {
  gscExcelFile: { content: ArrayBuffer; name: string } | null;
  setGscExcelFile: (file: { content: ArrayBuffer; name: string } | null) => void;
  parsedGscData: GscParsedData | null;
  setParsedGscData: React.Dispatch<React.SetStateAction<GscParsedData | null>>;
  analyzedGscData: GscAnalyzedData | null;
  setAnalyzedGscData: React.Dispatch<React.SetStateAction<GscAnalyzedData | null>>;
  gscFiltersDisplay: string;
  setGscFiltersDisplay: React.Dispatch<React.SetStateAction<string>>;
}

export function Tool4GSCAnalyzer({ 
    gscExcelFile, setGscExcelFile,
    parsedGscData, setParsedGscData,
    analyzedGscData, setAnalyzedGscData,
    gscFiltersDisplay, setGscFiltersDisplay
}: Tool4GSCAnalyzerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileLoad = useCallback((content: string, name: string, arrayBufferContent?: ArrayBuffer) => {
        if (arrayBufferContent && arrayBufferContent.byteLength > 0) {
            setGscExcelFile({ content: arrayBufferContent, name });
            setError(null);
            setParsedGscData(null); 
            setAnalyzedGscData(null); 
            setGscFiltersDisplay("");
        } else {
            setError("Errore nel caricamento del file Excel/ODS. Il contenuto non è valido o il file è vuoto.");
            setGscExcelFile(null);
            toast({ title: "Errore File", description: "Contenuto file non valido o file vuoto.", variant: "destructive" });
        }
    }, [setGscExcelFile, setParsedGscData, setAnalyzedGscData, setGscFiltersDisplay, toast]);

    const handleResetFile = () => {
        setGscExcelFile(null);
        setParsedGscData(null);
        setAnalyzedGscData(null);
        setError(null);
        setGscFiltersDisplay("");
        const fileInput = document.getElementById('gscExcelFileInputTool4') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    };

    const parseSheetData = (workbook: XLSX.WorkBook, sheetName: string, reportType: GscReportType): GscSheetRow[] => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            console.warn(`[Tool4 ParseSheetData] Sheet '${sheetName}' not found in workbook.`);
            return [];
        }

        const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, blankrows: false, defval: null });
        if (jsonData.length === 0) {
            console.warn(`[Tool4 ParseSheetData] Sheet '${sheetName}' is empty.`);
            return [];
        }

        let headersRaw: any[] = [];
        let dataRows: any[][] = [];
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            const row = jsonData[i] as any[];
            if (row && row.some(h => typeof h === 'string' && (
                h.toLowerCase().includes('clic') || h.toLowerCase().includes('impression') ||
                h.toLowerCase().includes('query') || h.toLowerCase().includes('page') ||
                h.toLowerCase().includes('date') || h.toLowerCase().includes('filter')
            ))) {
                headersRaw = row;
                dataRows = jsonData.slice(i + 1) as any[][];
                headerRowIndex = i;
                break;
            }
        }
        
        if (headerRowIndex === -1) { // Fallback if specific keywords aren't found but data exists
            if (jsonData.length > 0 && reportType === 'filters') {
                headersRaw = jsonData[0] as any[]; 
                dataRows = jsonData.slice(1) as any[][];
            } else if (jsonData.length > 0 && reportType !== 'filters') {
                 headersRaw = jsonData[0] as any[]; 
                 dataRows = jsonData.slice(1) as any[][];
            } else {
                console.warn(`[Tool4 ParseSheetData] Could not find a valid header row for sheet '${sheetName}'.`);
                return [];
            }
        }
        
        const headerMap: Record<string, keyof GscSheetRow | 'item'> = {
            "top queries": "item", "top query": "item", "query": "item", "principali query":"item", "query di ricerca": "item",
            "top pages": "item", "pagina": "item", "pagine principali":"item", "principali pagine":"item",
            "country": "item", "paese": "item", "paesi":"item",
            "device": "item", "dispositivo": "item", "dispositivi":"item",
            "search appearance": "item", "aspetto nella ricerca": "item", "search appearances":"item", "tipi di risultati multimediali":"item", "aspetto della ricerca":"item",
            "date": "item", "data":"item", 

            "clicks": "clicks_current", "clic": "clicks_current",
            "impressions": "impressions_current", "impressioni": "impressions_current",
            "ctr": "ctr_current",
            "position": "position_current", "posizione":"position_current",

            "clic attuali": "clicks_current", "clics attuali": "clicks_current", 
            "impressioni attuali": "impressions_current",
            "ctr attuale": "ctr_current",
            "posizione attuale": "position_current", "pos. attuale": "position_current",
        
            "clic prec.": "clicks_previous", "clic precedenti": "clicks_previous", "clics prec.": "clicks_previous",
            "impressioni prec.": "impressions_previous", "impressioni precedenti": "impressions_previous",
            "ctr prec.": "ctr_previous", "ctr precedente": "ctr_previous",
            "posizione prec.": "position_previous", "posizione precedente": "position_previous", "pos. prec.": "position_previous",
        
            "clicks last 28 days": "clicks_current", "clic ultimi 28 giorni": "clicks_current", "clic (ultimi 28 giorni)": "clicks_current",
            "clicks previous 28 days": "clicks_previous", "clic 28 giorni precedenti": "clicks_previous", "clic (28 giorni precedenti)": "clicks_previous",
            
            "impressions last 28 days": "impressions_current", "impressioni ultimi 28 giorni": "impressions_current", "impressioni (ultimi 28 giorni)": "impressions_current",
            "impressions previous 28 days": "impressions_previous", "impressioni 28 giorni precedenti": "impressions_previous", "impressioni (28 giorni precedenti)": "impressions_previous",
            
            "ctr last 28 days": "ctr_current", "ctr ultimi 28 giorni": "ctr_current", "ctr (ultimi 28 giorni)": "ctr_current",
            "ctr previous 28 days": "ctr_previous", "ctr 28 giorni precedenti": "ctr_previous", "ctr (28 giorni precedenti)": "ctr_previous",
            
            "position last 28 days": "position_current", "posizione ultimi 28 giorni": "position_current", "posizione (ultimi 28 giorni)": "position_current",
            "position previous 28 days": "position_previous", "posizione 28 giorni precedenti": "position_previous", "posizione (28 giorni precedenti)": "position_previous",
            
            // Common variations for 3 months period
            "last 3 months clicks": "clicks_current", "clic ultimi 3 mesi": "clicks_current", "clic (ultimi 3 mesi)": "clicks_current",
            "previous 3 months clicks": "clicks_previous", "clic 3 mesi precedenti": "clicks_previous", "clic (3 mesi precedenti)": "clicks_previous",
            "last 3 months impressions": "impressions_current", "impressioni ultimi 3 mesi": "impressions_current", "impressioni (ultimi 3 mesi)": "impressions_current",
            "previous 3 months impressions": "impressions_previous", "impressioni 3 mesi precedenti": "impressions_previous", "impressioni (3 mesi precedenti)": "impressions_previous",
            "last 3 months ctr": "ctr_current", "ctr ultimi 3 mesi": "ctr_current", "ctr (ultimi 3 mesi)": "ctr_current",
            "previous 3 months ctr": "ctr_previous", "ctr 3 mesi precedenti": "ctr_previous", "ctr (3 mesi precedenti)": "ctr_previous",
            "last 3 months position": "position_current", "posizione ultimi 3 mesi": "position_current", "posizione (ultimi 3 mesi)": "position_current",
            "previous 3 months position": "position_previous", "posizione 3 mesi precedenti": "position_previous", "posizione (3 mesi precedenti)": "position_previous",

            "filter": "filterName", "filtro": "filterName",
            "value": "filterValue", "valore": "filterValue"
        };
        
        let primaryItemKey : keyof GscSheetRow | 'item' = 'item';
        if (reportType === 'queries') primaryItemKey = 'item'; 
        else if (reportType === 'pages') primaryItemKey = 'item';
        else if (reportType === 'countries') primaryItemKey = 'item';
        else if (reportType === 'devices') primaryItemKey = 'item';
        else if (reportType === 'searchAppearance') primaryItemKey = 'item';
        else if (reportType === 'filters') primaryItemKey = 'filterName';


        const headers = headersRaw.map((h, idx) => {
            const trimmedHeader = String(h || '').trim().toLowerCase();
            if (idx === 0 && reportType !== 'filters' && !headerMap[trimmedHeader]) return primaryItemKey;
            return headerMap[trimmedHeader] || trimmedHeader.replace(/\s+/g, '_').replace(/[^\w_]/gi, '') || `column_${idx}`;
        });

        const parsedRows: GscSheetRow[] = dataRows.map(row => {
            const entry: GscSheetRow = {};
            headers.forEach((headerKey, index) => {
                let value = row[index];
                const key = headerKey as keyof GscSheetRow;

                if (key === 'clicks_current' || key === 'clicks_previous' || key === 'impressions_current' || key === 'impressions_previous') {
                    let strVal = String(value ?? '').trim();
                    if (strVal === "" || strVal === "-") {
                        value = 0;
                    } else {
                        const cleanedDigits = strVal.replace(/[^\d]/g, ''); // Remove non-digits (handles ".")
                        if (cleanedDigits === "") {
                            value = 0;
                        } else {
                            value = parseInt(cleanedDigits, 10);
                            if (isNaN(value)) value = 0;
                        }
                    }
                } else if (key === 'ctr_current' || key === 'ctr_previous') {
                    if (typeof value === 'string') {
                        value = parseFloat(value.replace('%', '').replace(',', '.')) / 100;
                    } else if (typeof value === 'number') {
                        value = (value > 1 && value <= 100) ? value / 100 : value;
                    } else {
                        value = 0;
                    }
                    value = isNaN(value) ? 0 : value;
                } else if (key === 'position_current' || key === 'position_previous') {
                    let strPosVal = String(value ?? '').trim();
                     if (strPosVal === "" || strPosVal === "-") {
                        value = null;
                    } else {
                        value = parseFloat(strPosVal.replace(',', '.')) || null;
                        if (isNaN(value as number)) value = null;
                    }
                } else if (key === primaryItemKey || key === 'filterName' || key === 'filterValue') {
                    value = String(value || '').trim();
                }
                entry[key] = value;
            });

            if (reportType !== 'filters' && !entry[primaryItemKey] && row[0] !== undefined && row[0] !== null) {
                entry[primaryItemKey] = String(row[0]).trim();
            }
            if (reportType === 'filters') {
                if (!entry.filterName && row[0] !== undefined && row[0] !== null) entry.filterName = String(row[0]).trim();
                if (!entry.filterValue && row[1] !== undefined && row[1] !== null) entry.filterValue = String(row[1]).trim();
            }
            
            return entry;
        }).filter(entry => (reportType === 'filters' ? (entry.filterName && entry.filterName !== "") : (entry[primaryItemKey] && String(entry[primaryItemKey]).trim() !== "" && String(entry[primaryItemKey]).trim().toLowerCase() !== "sommario")) );
        
        return parsedRows;
    };

    const analyzeGSCData = (data: GscSheetRow[], itemKeyType: GscReportType): GscSectionAnalysis | null => {
        if (!data || data.length === 0) {
            return null;
        }

        let totalCurrentClicks = 0, totalPreviousClicks = 0, totalCurrentImpressions = 0, totalPreviousImpressions = 0;

        const processedItems: GscAnalyzedItem[] = data.map(d => {
            const currentClicks = d.clicks_current || 0;
            const previousClicks = d.clicks_previous || 0;
            const currentImpressions = d.impressions_current || 0;
            const previousImpressions = d.impressions_previous || 0;
            const currentCTR = d.ctr_current || 0;
            const previousCTR = d.ctr_previous || 0;
            const currentPosition = d.position_current ?? null;
            const previousPosition = d.position_previous ?? null;

            totalCurrentClicks += currentClicks;
            totalPreviousClicks += previousClicks;
            totalCurrentImpressions += currentImpressions;
            totalPreviousImpressions += previousImpressions;

            const diffClicks = currentClicks - previousClicks;
            const percChangeClicks = previousClicks !== 0 ? (diffClicks / previousClicks) : (currentClicks > 0 ? Infinity : 0);
            const diffImpressions = currentImpressions - previousImpressions;
            const percChangeImpressions = previousImpressions !== 0 ? (diffImpressions / previousImpressions) : (currentImpressions > 0 ? Infinity : 0);
            const diffCTR = currentCTR - previousCTR;
            let diffPosition: number | null = null;
            if (currentPosition !== null && previousPosition !== null) {
                diffPosition = previousPosition - currentPosition; 
            }
            
            let itemIdentifier = "N/D";
            if (itemKeyType === 'filters') itemIdentifier = `${d.filterName}: ${d.filterValue}`;
            else itemIdentifier = d.item || "N/D";


            return {
                item: itemIdentifier,
                clicks_current: currentClicks, clicks_previous: previousClicks, diff_clicks: diffClicks, perc_change_clicks: percChangeClicks,
                impressions_current: currentImpressions, impressions_previous: previousImpressions, diff_impressions: diffImpressions, perc_change_impressions: percChangeImpressions,
                ctr_current: currentCTR, ctr_previous: previousCTR, diff_ctr: diffCTR,
                position_current: currentPosition, position_previous: previousPosition, diff_position: diffPosition,
            };
        });

        let summaryText = `Clic totali (periodo corrente): ${totalCurrentClicks.toLocaleString()}. Impressioni totali: ${totalCurrentImpressions.toLocaleString()}.`;
        const hasPreviousData = processedItems.some(p => p.clicks_previous > 0 || p.impressions_previous > 0 || p.ctr_previous > 0 || p.position_previous !== null);

        if(hasPreviousData) {
            const overallClickDiff = totalCurrentClicks - totalPreviousClicks;
            const overallImpressionDiff = totalCurrentImpressions - totalPreviousImpressions;
            summaryText += ` Variazione clic vs periodo precedente: ${overallClickDiff >= 0 ? '+' : ''}${overallClickDiff.toLocaleString()}.`;
            summaryText += ` Variazione impressioni: ${overallImpressionDiff >= 0 ? '+' : ''}${overallImpressionDiff.toLocaleString()}.`;
        }
        
        const topNForChart = 5;
        
        const topItemsByClicks = [...processedItems]
                                  .filter(it => it.item && it.item !== "N/D" && it.clicks_current > 0)
                                  .sort((a, b) => (b.clicks_current || 0) - (a.clicks_current || 0))
                                  .slice(0, topNForChart);
        
        const topItemsByClicksChartData: GscSectionAnalysis['topItemsByClicksChartData'] = {
            labels: topItemsByClicks.map(it => (String(it.item) || 'N/D').substring(0, 30) + ((String(it.item) || '').length > 30 ? '...' : '')),
            datasets: [{ 
                label: `Clic (Corrente) - ${getReportItemDisplayName(itemKeyType)}`, 
                data: topItemsByClicks.map(it => it.clicks_current), 
                backgroundColor: topItemsByClicks.map((_, index) => chartColors[index % chartColors.length])
            }]
        };
        
        let pieChartData: GscSectionAnalysis['pieChartData'] = [];
        if (itemKeyType === 'devices' && processedItems.length > 0) {
            const deviceSummary = processedItems.reduce((acc, curr) => {
                const deviceName = curr.item || 'Sconosciuto';
                acc[deviceName] = (acc[deviceName] || 0) + curr.clicks_current;
                return acc;
            }, {} as Record<string, number>);

            pieChartData = Object.entries(deviceSummary)
                .filter(([, value]) => value > 0)
                .map(([name, value], index) => ({ name, value, fill: chartColors[index % chartColors.length] }))
                .sort((a,b) => b.value - a.value);
        }
        
        return { summaryText, detailedDataWithDiffs: processedItems, topItemsByClicksChartData, pieChartData };
    };

    const processGSCData = async () => {
        if (!gscExcelFile || !gscExcelFile.content) {
            setError("Nessun file Excel/ODS caricato o contenuto non valido.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setLoadingMessage("Lettura file...");
        setError(null);
        setParsedGscData(null); 
        setAnalyzedGscData(null); 
        setGscFiltersDisplay("");
        setProgress(0);
        
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const workbook = XLSX.read(gscExcelFile.content, { type: 'array', cellDates: true });
            
            const newParsedCollector: GscParsedData = { filters: [], queries: [], pages: [], countries: [], devices: [], searchAppearance: [] };
            const newAnalyzedCollector: GscAnalyzedData = { queries: undefined, pages: undefined, countries: undefined, devices: undefined, searchAppearance: undefined };

            let filtersTextCollector = '<h4 class="font-semibold text-sky-700 mb-1">Filtri GSC Applicati all\'Export:</h4>';
            const filtersSheetName = workbook.SheetNames.find(name => GSC_SHEET_MAPPING.filters.some(pn => name.toLowerCase().trim() === pn.toLowerCase().trim()));
            
            if (filtersSheetName) {
                newParsedCollector.filters = parseSheetData(workbook, filtersSheetName, 'filters');
                if (newParsedCollector.filters && newParsedCollector.filters.length > 0) {
                    filtersTextCollector += '<ul>';
                    newParsedCollector.filters.forEach(filter => {
                         filtersTextCollector += `<li class="ml-4 list-disc">${filter.filterName || 'Filtro Sconosciuto'}: ${filter.filterValue || 'N/D'}</li>`;
                    });
                    filtersTextCollector += '</ul>';
                } else {
                    filtersTextCollector += '<p>Nessun filtro specifico rilevato o foglio "Filters" vuoto.</p>';
                }
            } else {
                filtersTextCollector += '<p>Foglio "Filters" (o varianti nome) non trovato.</p>';
            }
            setGscFiltersDisplay(filtersTextCollector);

            let currentProgress = 0;
            const reportTypesToProcess = GSC_SHEET_DISPLAY_ORDER.filter(type => type !== 'filters');
            const progressIncrement = 100 / (reportTypesToProcess.length || 1); 

            for (const reportType of reportTypesToProcess) {
                setLoadingMessage(`Parsing foglio: ${reportType}...`);
                const sheetName = workbook.SheetNames.find(name => GSC_SHEET_MAPPING[reportType].some(pn => name.toLowerCase().trim() === pn.toLowerCase().trim()));

                if (sheetName) {
                    const sheetData = parseSheetData(workbook, sheetName, reportType);
                    newParsedCollector[reportType] = sheetData;
                    
                    if (sheetData.length > 0) {
                        setLoadingMessage(`Analisi dati: ${reportType}...`);
                        newAnalyzedCollector[reportType] = analyzeGSCData(sheetData, reportType);
                    } else {
                         console.warn(`[Tool4 ProcessGSCData] No data parsed from sheet '${sheetName}' for report type '${reportType}'.`);
                        newAnalyzedCollector[reportType] = undefined;
                    }
                } else {
                    console.warn(`[Tool4 ProcessGSCData] Sheet for ${reportType} not found. Expected names:`, GSC_SHEET_MAPPING[reportType].join(', '));
                    newParsedCollector[reportType] = [];
                    newAnalyzedCollector[reportType] = undefined;
                }
                 currentProgress += progressIncrement;
                 setProgress(Math.min(currentProgress, 100)); 
                 await new Promise(resolve => setTimeout(resolve, 10));
            }

            setParsedGscData(newParsedCollector);
            setAnalyzedGscData(newAnalyzedCollector);
            
            const dataFound = Object.values(newAnalyzedCollector).some(analysis => analysis !== undefined && analysis.detailedDataWithDiffs.length > 0);
            if (dataFound) {
                 toast({ title: "Analisi Completata", description: "Dati GSC processati." });
            } else {
                 toast({ title: "Analisi Completata", description: "Nessun dato metrico trovato nei fogli attesi (Query, Pagine, ecc.). Controlla i nomi dei fogli e il contenuto del file Excel/ODS.", variant: "default", duration: 7000});
                 setError("Nessun dato metrico trovato nei fogli GSC attesi. Verifica che il file Excel/ODS contenga i fogli corretti (es. 'Query', 'Pagine', ecc. con i dati).");
            }

        } catch (e: any) {
            console.error("[Tool4 ProcessGSCData DEBUG] CRITICAL ERROR during GSC processing:", e);
            setError(`Errore CRITICO nel processamento del file GSC: ${e.message}. Controlla la console per dettagli.`);
            toast({ title: "Errore Analisi CRITICO", description: e.message, variant: "destructive", duration: 10000 });
        } finally {
            setIsLoading(false);
            setLoadingMessage("");
            setProgress(0);
        }
    };

    const getReportItemDisplayName = (type: GscReportType): string => {
        switch(type) {
            case 'queries': return 'Query';
            case 'pages': return 'Pagina';
            case 'countries': return 'Paese';
            case 'devices': return 'Dispositivo';
            case 'searchAppearance': return 'Aspetto nella Ricerca';
            default: return 'Elemento';
        }
    };

    const handleDownloadSectionCSV = (reportType: GscReportType) => {
        if (!analyzedGscData) {
            toast({ title: "Dati non disponibili", description: "Esegui prima l'analisi.", variant: "destructive" });
            return;
        }
        const analysis = analyzedGscData[reportType];
        if (!analysis || !analysis.detailedDataWithDiffs || analysis.detailedDataWithDiffs.length === 0) {
            toast({ title: "Nessun dato", description: `Nessun dato da scaricare per ${getReportItemDisplayName(reportType)}.`, variant: "destructive" });
            return;
        }
        const headers = [
            getReportItemDisplayName(reportType), "Clic Attuali", "Clic Prec.", "Diff. Clic", "% Clic",
            "Impr. Attuali", "Impr. Prec.", "Diff. Impr.", "% Impr.",
            "CTR Attuale", "CTR Prec.", "Diff. CTR",
            "Pos. Attuale", "Pos. Prec.", "Diff. Pos."
        ];
         const dataForCsv = analysis.detailedDataWithDiffs.map(d => ({
            [getReportItemDisplayName(reportType)]: d.item,
            "Clic Attuali": d.clicks_current, "Clic Prec.": d.clicks_previous, "Diff. Clic": d.diff_clicks,
            "% Clic": isFinite(d.perc_change_clicks) ? (d.perc_change_clicks * 100).toFixed(1) + '%' : (d.perc_change_clicks === Infinity ? '+Inf%' : 'N/A'),
            "Impr. Attuali": d.impressions_current, "Impr. Prec.": d.impressions_previous, "Diff. Impr.": d.diff_impressions,
            "% Impr.": isFinite(d.perc_change_impressions) ? (d.perc_change_impressions * 100).toFixed(1) + '%' : (d.perc_change_impressions === Infinity ? '+Inf%' : 'N/A'),
            "CTR Attuale": (d.ctr_current * 100).toFixed(2) + '%', "CTR Prec.": (d.ctr_previous * 100).toFixed(2) + '%',
            "Diff. CTR": (d.diff_ctr * 100).toFixed(2) + 'pp',
            "Pos. Attuale": d.position_current?.toFixed(1) || 'N/A', "Pos. Prec.": d.position_previous?.toFixed(1) || 'N/A',
            "Diff. Pos.": d.diff_position?.toFixed(1) || 'N/A',
        }));
        exportToCSV(`report_gsc_${reportType}.csv`, headers, dataForCsv);
    };

    const openDetailPage = (reportType: GscReportType) => {
        if (!analyzedGscData) { 
             toast({ title: "Dati non disponibili", description: "Esegui prima l'analisi.", variant: "destructive" });
            return;
        }
        const analysis = analyzedGscData[reportType];
        if (!analysis || !analysis.detailedDataWithDiffs || analysis.detailedDataWithDiffs.length === 0) {
            toast({ title: "Dati Insufficienti", description: `Nessun dato dettagliato da visualizzare per ${getReportItemDisplayName(reportType)}.`, variant: "destructive"});
            return;
        }
        localStorage.setItem('tool4DetailData', JSON.stringify({
            reportType,
            itemDisplayName: getReportItemDisplayName(reportType),
            analyzedData: analysis, 
            chartType: reportType === 'devices' ? 'pie' : 'bar', 
            pageTitle: `Dettaglio GSC: ${getReportItemDisplayName(reportType)}`,
            description: analysis.summaryText, 
        }));
        const url = `/tool4/${reportType}`;
        window.open(url, '_blank'); 
    };

    const acceptedExcelTypes = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel,.ods,application/vnd.oasis.opendocument.spreadsheet";

    return (
        <div className="space-y-8">
            <header className="text-center">
                 <Image src={GSC_LOGO_URL} alt="Logo GSC Tool" width={150} height={50} className="mx-auto h-12 mb-4 object-contain" style={{width: "auto"}} data-ai-hint="logo excel chart"/>
                <h2 className="text-3xl font-bold text-sky-700">Analizzatore Dati Google Search Console</h2>
                <p className="text-muted-foreground mt-2">Carica il tuo export Excel/ODS da GSC per un'analisi descrittiva dei dati.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Caricamento File GSC Excel/ODS</CardTitle>
                </CardHeader>
                <CardContent>
                    <FileUploadZone
                        siteKey="gscExcelFileInputTool4"
                        label="File GSC (formati .xlsx, .xls, .ods)"
                        onFileLoad={handleFileLoad}
                        acceptedFileTypes={acceptedExcelTypes}
                        dropInstructionText="Trascina qui il file (.xlsx, .xls, .ods) o clicca per selezionare."
                        expectsArrayBuffer={true}
                    />
                     <p className="text-xs text-muted-foreground mt-1">Il tool analizzerà i fogli: Filters, Queries, Pages, Countries, Devices, Search Appearance (se presenti con nomi standard o comuni alias in italiano/inglese).</p>
                    {gscExcelFile && (
                         <Button onClick={handleResetFile} variant="outline" size="sm" className="mt-2">Rimuovi File</Button>
                    )}
                </CardContent>
            </Card>

            {gscExcelFile && (
                <div className="text-center">
                    <Button 
                        onClick={processGSCData}
                        disabled={isLoading} 
                        className="action-button bg-sky-600 hover:bg-sky-700 text-white text-lg"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <BarChart2 className="mr-2 h-5 w-5" />}
                        {isLoading ? "Analisi in corso..." : "Analizza Dati GSC"}
                    </Button>
                </div>
            )}

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

            {analyzedGscData && !isLoading && (
                <div className="space-y-8 mt-10">
                    {gscFiltersDisplay && (
                        <Card>
                            <CardContent className="pt-6">
                                <div dangerouslySetInnerHTML={{ __html: gscFiltersDisplay }} className="prose prose-sm max-w-none text-muted-foreground"/>
                            </CardContent>
                        </Card>
                    )}

                    {GSC_SHEET_DISPLAY_ORDER.filter(type => type !== 'filters').map((reportType) => {
                        if (!analyzedGscData) return null;
                        const analysis = analyzedGscData[reportType];
                        const itemDisplayName = getReportItemDisplayName(reportType);
                        const chartTypeToUse = reportType === 'devices' ? 'pie' : 'bar';
                        
                        const hasValidAnalysis = analysis && analysis.detailedDataWithDiffs && analysis.detailedDataWithDiffs.length > 0;
                        
                        const chartDataForRender = (hasValidAnalysis && analysis.topItemsByClicksChartData) 
                            ? analysis.topItemsByClicksChartData 
                            : { labels: [], datasets: [{ label: `Clic (Corrente) - ${itemDisplayName}`, data: [], backgroundColor: [] }] };
                        
                        const pieDataForRender = (hasValidAnalysis && analysis.pieChartData) ? analysis.pieChartData : [];

                        const hasBarChartData = chartTypeToUse === 'bar' && hasValidAnalysis && chartDataForRender.labels.length > 0 && chartDataForRender.datasets[0]?.data.length > 0;
                        const hasPieChartData = chartTypeToUse === 'pie' && hasValidAnalysis && pieDataForRender && pieDataForRender.length > 0;
                        const shouldRenderChart = chartTypeToUse === 'bar' ? hasBarChartData : hasPieChartData;

                        if (!hasValidAnalysis && !isLoading) {
                             return (
                                <Card key={reportType}>
                                    <CardHeader>
                                        <CardTitle className="text-xl font-semibold">Analisi {itemDisplayName}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">Nessun dato trovato per {itemDisplayName} o foglio non presente/vuoto.</p>
                                    </CardContent>
                                </Card>
                            );
                        }
                        
                        return hasValidAnalysis ? (
                            <Card key={reportType} id={`${reportType}-analysis-section`}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xl font-semibold">Analisi {itemDisplayName}</CardTitle>
                                    <Button variant="outline" size="sm" onClick={() => openDetailPage(reportType)} disabled={!hasValidAnalysis}>
                                        <Eye className="mr-2 h-4 w-4"/> Vedi Dettaglio
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {analysis?.summaryText && <CardDescription className="mb-3 prose prose-sm max-w-none" dangerouslySetInnerHTML={{__html: analysis.summaryText}} /> }

                                    {shouldRenderChart ? (
                                        <div className="my-6 h-[350px] md:h-[400px]">
                                            <ChartGSC
                                                data={chartDataForRender}
                                                pieData={pieDataForRender}
                                                type={chartTypeToUse}
                                                title={`Top 5 ${itemDisplayName} per Clic`}
                                            />
                                        </div>
                                     ) : (
                                        <p className="text-muted-foreground text-center py-8">Nessun dato sufficiente per il grafico di {itemDisplayName}.</p>
                                     )}

                                    <h4 className="text-lg font-semibold text-foreground mt-6 mb-2">Tabella Dati {itemDisplayName} (Top 20 righe)</h4>
                                    <TableGSC data={analysis?.detailedDataWithDiffs.slice(0,20) || []} itemDisplayName={itemDisplayName} />

                                    <div className="text-center mt-4">
                                        <Button onClick={() => handleDownloadSectionCSV(reportType)} variant="default" size="sm" disabled={!hasValidAnalysis}>
                                            <Download className="mr-2 h-4 w-4"/> Scarica Dati {itemDisplayName} (CSV)
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null;
                    })}
                </div>
            )}
        </div>
    );
}
