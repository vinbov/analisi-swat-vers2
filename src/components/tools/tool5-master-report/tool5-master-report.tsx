
"use client";

import React, { useEffect, useState }
from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InfoIcon, BarChart3, SearchCode, ClipboardList, BarChart2, Presentation, Download, FileCode, Copy } from 'lucide-react';
import type {
    AdWithAngleAnalysis, AngleAnalysisScores, GscAnalyzedData, GscReportType, GscSectionAnalysis,
    ComparisonResult, ScrapedAd, PertinenceAnalysisResult, Tool2MasterReportData
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Importa i componenti di tabella e grafico (per la visualizzazione LIVE nel Tool 5)
import { ComparisonResultsTable } from '@/components/tools/tool1-comparator/table-comparison-results';
import { CommonKeywordsTop10Chart } from '@/components/tools/tool1-comparator/chart-common-keywords-top10';
import { TopOpportunitiesChart } from '@/components/tools/tool1-comparator/chart-top-opportunities';
import { TableAngleAnalysis } from '@/components/tools/tool3-scraper/table-angle-analysis';
import { TablePertinenceResults } from '@/components/tools/tool2-analyzer/table-pertinence-results'; // Importa la tabella per Tool 2
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'; // Per il grafico 7C live
import { ChartGSC } from '@/components/tools/tool4-gsc-analyzer/charts-gsc';


interface Tool1MasterReportData {
    comparisonResultsCount: {
      common: number;
      mySiteOnly: number;
      competitorOnly: number;
      totalUnique: number;
    };
    rawResults: ComparisonResult[];
    activeCompetitorNames: string[];
}

interface Tool3MasterReportData {
  scrapedAds: ScrapedAd[];
  adsWithAnalysis: AdWithAngleAnalysis[];
}

interface Tool4MasterReportData {
    analyzedGscData: GscAnalyzedData | null;
    gscFiltersDisplay: string;
}

interface Tool5MasterReportProps {
    tool1Data: Tool1MasterReportData | null;
    tool2Data: Tool2MasterReportData | null;
    tool3Data: Tool3MasterReportData | null;
    tool4Data: Tool4MasterReportData | null;
}

const chartJsColors = [
    'rgba(54, 162, 235, 0.7)',  // Blu Primario
    'rgba(255, 159, 64, 0.7)', // Arancione Accento
    'rgba(75, 192, 192, 0.7)', // Verde Acqua
    'rgba(255, 99, 132, 0.7)',  // Rosso
    'rgba(153, 102, 255, 0.7)',// Viola
    'rgba(255, 205, 86, 0.7)', // Giallo
    'rgba(101, 115, 195, 0.7)',// Indaco
    'rgba(201, 203, 207, 0.7)' // Grigio
];
const chartJsBorderColors = chartJsColors.map(color => color.replace('0.7', '1'));


export function Tool5MasterReport({ tool1Data, tool2Data, tool3Data, tool4Data }: Tool5MasterReportProps) {
  const [average7CScores, setAverage7CScores] = useState<AngleAnalysisScores | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (tool3Data && tool3Data.adsWithAnalysis) {
        const analyzedAds = tool3Data.adsWithAnalysis.filter(ad => ad.angleAnalysis && !ad.angleAnalysis.error);
        if (analyzedAds.length > 0) {
            const avgScores: AngleAnalysisScores = { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0, C7: 0 };
            analyzedAds.forEach(ad => {
                const scores = ad.angleAnalysis?.scores ?? ad.angleAnalysis;
                if (scores) {
                    avgScores.C1 += (scores as any).c1Clarity ?? scores.C1 ?? 0;
                    avgScores.C2 += (scores as any).c2Engagement ?? scores.C2 ?? 0;
                    avgScores.C3 += (scores as any).c3Concreteness ?? scores.C3 ?? 0;
                    avgScores.C4 += (scores as any).c4Coherence ?? scores.C4 ?? 0;
                    avgScores.C5 += (scores as any).c5Credibility ?? scores.C5 ?? 0;
                    avgScores.C6 += (scores as any).c6CallToAction ?? scores.C6 ?? 0;
                    avgScores.C7 += (scores as any).c7Context ?? scores.C7 ?? 0;
                }
            });
            Object.keys(avgScores).forEach(keyStr => {
                const key = keyStr as keyof AngleAnalysisScores;
                avgScores[key] = parseFloat((avgScores[key] / analyzedAds.length).toFixed(2));
            });
            setAverage7CScores(avgScores);
        } else {
            setAverage7CScores(null);
        }
    } else {
        setAverage7CScores(null);
    }
  }, [tool3Data]);


  const getGSCReportItemDisplayName = (type: GscReportType): string => {
      const map: Record<GscReportType, string> = {
          queries: 'Query', pages: 'Pagine', countries: 'Paesi', devices: 'Dispositivi',
          searchAppearance: 'Aspetto nella Ricerca', filters: 'Filtri'
      };
      return map[type] || type;
  };
  
  const escapeHtml = (unsafe: string | number | null | undefined): string => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  };

  const generateTableHtml = (headers: string[], data: Record<string, any>[], title?: string, tableId?: string): string => {
    const uniqueTableId = tableId || `table-${Math.random().toString(36).substring(2, 9)}`;
    const previewWrapperId = `${uniqueTableId}-preview-wrapper`;

    if (!data || data.length === 0) {
        return (title ? `<h3 class="report-h3" id="${uniqueTableId}-title">${escapeHtml(title)}</h3>` : '') +
               `<p class="no-data-message">Nessun dato disponibile per questa tabella.</p>`;
    }
    
    let html = title ? `<h3 class="report-h3" id="${uniqueTableId}-title">${escapeHtml(title)}</h3>` : '';
    
    html += `<div class="table-preview-container" id="${previewWrapperId}">`;
    html += `<div class="table-wrapper"><table id="${uniqueTableId}">`;
    html += '<thead><tr>';
    headers.forEach(header => html += `<th>${escapeHtml(header)}</th>`);
    html += '</tr></thead><tbody>';
    data.forEach(row => {
      html += '<tr>';
      headers.forEach(header => {
        const cellValue = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
        const escapedCellValue = (header === 'Analisi Approfondita' && cellValue.includes('<br />')) 
                                 ? cellValue 
                                 : escapeHtml(cellValue);
        html += `<td>${escapedCellValue}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>'; // Close table-wrapper and table-preview-container
    html += `<button class="toggle-table-button" onclick="toggleTableVisibility('${previewWrapperId}', this)">Mostra tutta la tabella</button>`;
    return html;
  };
  
  const prepareFullHTMLReportString = (): string => {
    let tocHTML = '<div class="toc"><h2>Indice dei Contenuti</h2><ul>';
    const sections: {id: string; title: string, level: number}[] = [];

    let reportHtml = '';
    let chartConfigs: any[] = []; 
    const addSection = (id: string, title: string, level: number) => {
        sections.push({id, title, level});
        if (level === 1) return `<h1 class="report-h1" id="${id}">${escapeHtml(title)}</h1>`;
        return `<h3 class="report-h3" id="${id}">${escapeHtml(title)}</h3>`;
    };

    // --- Tool 1 Section ---
    reportHtml += addSection("tool1-main", "Tool 1: Analizzatore Comparativo Keyword", 1);
    if (tool1Data && tool1Data.rawResults && tool1Data.rawResults.length > 0) {
        reportHtml += addSection("tool1-summary", "Riepilogo Conteggio Keyword", 3);
        reportHtml += `<ul class="summary-list">
                  <li>Keyword Comuni: <strong>${tool1Data.comparisonResultsCount.common}</strong></li>
                  <li>Punti di Forza (Solo Mio Sito): <strong>${tool1Data.comparisonResultsCount.mySiteOnly}</strong></li>
                  <li>Opportunità (Solo Competitor): <strong>${tool1Data.comparisonResultsCount.competitorOnly}</strong></li>
                  <li>Totale Keyword Uniche Analizzate: <strong>${tool1Data.comparisonResultsCount.totalUnique}</strong></li>
                </ul>`;
        reportHtml += '<hr class="subsection-separator">';
        
        const commonKWsTool1ChartData = [];
        commonKWsTool1ChartData.push({ name: 'Mio Sito', count: tool1Data.rawResults.filter(kw => kw.status === 'common' && kw.mySiteInfo.pos !== 'N/P' && typeof kw.mySiteInfo.pos === 'number' && kw.mySiteInfo.pos <= 10).length });
        tool1Data.activeCompetitorNames.forEach(compName => {
            commonKWsTool1ChartData.push({ name: compName, count: tool1Data.rawResults.filter(kw => kw.status === 'common' && kw.competitorInfo.find(c => c.name === compName && c.pos !== 'N/P' && typeof c.pos === 'number' && c.pos <= 10)).length });
        });
        
        if (commonKWsTool1ChartData.some(d => d.count > 0)) {
            const chart1Id = `chartTool1CommonTop10`;
            reportHtml += addSection(chart1Id + "-container", "Grafico: Keyword Comuni in Top 10", 3);
            reportHtml += `<div class="chart-container-html-report"><canvas id="${chart1Id}"></canvas></div>`;
            chartConfigs.push({
                id: chart1Id, type: 'bar',
                data: {
                    labels: commonKWsTool1ChartData.map(d => d.name),
                    datasets: [{ label: 'N. Keyword Comuni in Top 10', data: commonKWsTool1ChartData.map(d => d.count), backgroundColor: commonKWsTool1ChartData.map((_, i) => chartJsColors[i % chartJsColors.length]), borderColor: commonKWsTool1ChartData.map((_, i) => chartJsBorderColors[i % chartJsColors.length]), borderWidth: 1 }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: true, position: 'top'} } }
            });
        } else { reportHtml += `<p class="no-data-message">Nessuna keyword comune in Top 10 da visualizzare nel grafico.</p>`; }
        reportHtml += '<hr class="subsection-separator">';

        const topOppsTool1 = tool1Data.rawResults.filter(r => r.status === 'competitorOnly' && typeof r.volume === 'number' && r.volume > 0).sort((a, b) => (b.volume as number) - (a.volume as number)).slice(0, 10);
        if (topOppsTool1.length > 0) {
            const chart2Id = `chartTool1TopOpps`;
            reportHtml += addSection(chart2Id + "-container", "Grafico: Top 10 Opportunità per Volume (Keyword Gap)", 3);
            reportHtml += `<div class="chart-container-html-report"><canvas id="${chart2Id}"></canvas></div>`;
            chartConfigs.push({
                id: chart2Id, type: 'bar',
                data: {
                    labels: topOppsTool1.map(kw => kw.keyword.length > 25 ? kw.keyword.substring(0, 22) + '...' : kw.keyword),
                    datasets: [{ label: 'Volume di Ricerca', data: topOppsTool1.map(kw => kw.volume), backgroundColor: chartJsColors[1], borderColor: chartJsBorderColors[1], borderWidth: 1 }]
                },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } }, plugins: { legend: { display: true, position: 'top'} } }
            });
        } else { reportHtml += `<p class="no-data-message">Nessuna opportunità significativa per il grafico.</p>`; }
        reportHtml += '<hr class="subsection-separator">';
        
        const commonDataTool1 = tool1Data.rawResults.filter(r => r.status === 'common');
        const commonHeadersTool1 = ['Keyword', 'Mio Sito Pos.', 'Mio Sito URL', ...tool1Data.activeCompetitorNames.flatMap(name => [`${name} Pos.`, `${name} URL`]), 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
        const commonTableDataTool1 = commonDataTool1.map(item => {
            const row: Record<string, any> = { Keyword: item.keyword, 'Mio Sito Pos.': item.mySiteInfo.pos, 'Mio Sito URL': item.mySiteInfo.url };
            tool1Data.activeCompetitorNames.forEach(name => {
                const compInfo = item.competitorInfo.find(c => c.name === name);
                row[`${name} Pos.`] = compInfo ? compInfo.pos : 'N/P';
                row[`${name} URL`] = compInfo ? compInfo.url : 'N/A';
            });
            row['Volume'] = item.volume ?? 'N/A'; row['Difficoltà'] = item.difficolta ?? 'N/A'; row['Opportunity'] = item.opportunity ?? 'N/A'; row['Intento'] = item.intento ?? 'N/A';
            return row;
        });
        reportHtml += generateTableHtml(commonHeadersTool1, commonTableDataTool1, "Dettaglio: Keyword Comuni", "tool1-common-table");
        reportHtml += '<hr class="subsection-separator">';

        const mySiteOnlyDataTool1 = tool1Data.rawResults.filter(r => r.status === 'mySiteOnly');
        const mySiteOnlyHeadersTool1 = ['Keyword', 'Mio Sito Pos.', 'Mio Sito URL', 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
        const mySiteOnlyTableDataTool1 = mySiteOnlyDataTool1.map(item => ({ Keyword: item.keyword, 'Mio Sito Pos.': item.mySiteInfo.pos, 'Mio Sito URL': item.mySiteInfo.url, Volume: item.volume ?? 'N/A', Difficoltà: item.difficolta ?? 'N/A', Opportunity: item.opportunity ?? 'N/A', Intento: item.intento ?? 'N/A' }));
        reportHtml += generateTableHtml(mySiteOnlyHeadersTool1, mySiteOnlyTableDataTool1, "Dettaglio: Punti di Forza (Solo Mio Sito)", "tool1-mysiteonly-table");
        reportHtml += '<hr class="subsection-separator">';
        
        const competitorOnlyDataTool1 = tool1Data.rawResults.filter(r => r.status === 'competitorOnly');
        const competitorOnlyHeadersTool1 = ['Keyword', ...tool1Data.activeCompetitorNames.flatMap(name => [`${name} Pos.`, `${name} URL`]), 'Volume', 'Difficoltà', 'Opportunity', 'Intento'];
        const competitorOnlyTableDataTool1 = competitorOnlyDataTool1.map(item => {
            const row: Record<string, any> = { Keyword: item.keyword };
            tool1Data.activeCompetitorNames.forEach(name => {
                const compInfo = item.competitorInfo.find(c => c.name === name);
                row[`${name} Pos.`] = compInfo ? compInfo.pos : 'N/P';
                row[`${name} URL`] = compInfo ? compInfo.url : 'N/A';
            });
             row['Volume'] = item.volume ?? 'N/A'; row['Difficoltà'] = item.difficolta ?? 'N/A'; row['Opportunity'] = item.opportunity ?? 'N/A'; row['Intento'] = item.intento ?? 'N/A';
            return row;
        });
        reportHtml += generateTableHtml(competitorOnlyHeadersTool1, competitorOnlyTableDataTool1, "Dettaglio: Opportunità (Solo Competitor)", "tool1-competitoronly-table");

    } else { reportHtml += "<p class='no-data-message'>Nessun dato disponibile dal Tool 1 o analisi non eseguita.</p>"; }
    reportHtml += '<hr class="tool-section-separator">';

    // --- Tool 2 Section ---
    reportHtml += addSection("tool2-main", "Tool 2: Analizzatore Pertinenza & Priorità KW (Offline)", 1);
    if (tool2Data && tool2Data.analysisResults && tool2Data.analysisResults.length > 0) {
        reportHtml += addSection("tool2-summary", "Riepilogo Analisi Pertinenza Keyword (Offline)", 3);
        if (tool2Data.industryContext) {
            reportHtml += `<p class="context-info"><strong>Contesto Analisi:</strong> ${escapeHtml(tool2Data.industryContext)}</p>`;
        }
        const tool2Headers = ["Keyword", "Settore Analizzato", "Pertinenza", "Priorità SEO", "Motivazione", "Volume", "KD", "Opportunity", "Posizione", "URL", "Intent"];
        const tool2TableData = tool2Data.analysisResults.map(res => ({
            "Keyword": res.keyword,
            "Settore Analizzato": res.settore,
            "Pertinenza": res.pertinenza,
            "Priorità SEO": res.prioritaSEO,
            "Motivazione": res.motivazioneSEO,
            "Volume": res.volume !== undefined && res.volume !== null ? String(res.volume) : 'N/A',
            "KD": res.kd !== undefined && res.kd !== null ? String(res.kd) : 'N/A',
            "Opportunity": res.opportunity !== undefined && res.opportunity !== null ? String(res.opportunity) : 'N/A',
            "Posizione": res.posizione !== undefined && res.posizione !== null ? String(res.posizione) : 'N/A',
            "URL": res.url || 'N/A',
            "Intent": res.intento || 'N/A'
        }));
        reportHtml += generateTableHtml(tool2Headers, tool2TableData, "Dettaglio: Analisi Pertinenza e Priorità Keyword", "tool2-analysis-table");
    } else {
        reportHtml += "<p class='no-data-message'>Nessun dato disponibile dal Tool 2 o analisi non eseguita.</p>";
    }
    reportHtml += '<hr class="tool-section-separator">';


    // Tool 3 Section
    reportHtml += addSection("tool3-main", "Tool 3: FB Ads Library Scraper & Analisi Angle", 1);
    if (tool3Data && tool3Data.adsWithAnalysis) {
        reportHtml += addSection("tool3-summary", "Riepilogo Analisi Facebook Ads", 3);
        reportHtml += `<ul class="summary-list">
                      <li>Annunci Totali Recuperati dallo Scraper: <strong>${tool3Data.scrapedAds?.length || 0}</strong></li>`;
        const analyzedCount = tool3Data.adsWithAnalysis?.filter(ad => ad.angleAnalysis && !ad.angleAnalysis.error).length || 0;
        reportHtml += `<li>Annunci con Analisi Angle (7C) Completata: <strong>${analyzedCount}</strong></li></ul>`;
        reportHtml += '<hr class="subsection-separator">';
        
        if (average7CScores && analyzedCount > 0) {
            const chart3Id = `chartTool3Avg7C`;
            reportHtml += addSection(chart3Id + "-container", "Grafico: Punteggi Medi 7C (su annunci analizzati)", 3);
            reportHtml += `<div class="chart-container-html-report"><canvas id="${chart3Id}"></canvas></div>`;
            chartConfigs.push({
                id: chart3Id, type: 'bar',
                data: {
                    labels: Object.keys(average7CScores),
                    datasets: [{ label: 'Punteggio Medio 7C', data: Object.values(average7CScores), backgroundColor: chartJsColors[2], borderColor: chartJsBorderColors[2], borderWidth: 1 }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 2, ticks: { stepSize: 0.5 } } }, plugins: { legend: { display: true, position: 'top'} } }
            });
        } else { reportHtml += `<p class="no-data-message">Nessun dato sui punteggi medi 7C da visualizzare.</p>`;}
        reportHtml += '<hr class="subsection-separator">';
        
        const angleHeadersTool3 = ["Ad (Titolo/Testo)", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "Totale", "Valutazione", "Analisi Approfondita", "Errore"];
        const angleTableDataTool3 = tool3Data.adsWithAnalysis.map(item => ({
            "Ad (Titolo/Testo)": item.titolo ? item.titolo.substring(0, 50) + (item.titolo.length > 50 ? "..." : "") : item.testo.substring(0, 50) + "...",
            "C1": item.angleAnalysis?.c1Clarity ?? 'N/A', "C2": item.angleAnalysis?.c2Engagement ?? 'N/A', "C3": item.angleAnalysis?.c3Concreteness ?? 'N/A',
            "C4": item.angleAnalysis?.c4Coherence ?? 'N/A', "C5": item.angleAnalysis?.c5Credibility ?? 'N/A', "C6": item.angleAnalysis?.c6CallToAction ?? 'N/A',
            "C7": item.angleAnalysis?.c7Context ?? 'N/A', "Totale": item.angleAnalysis?.totalScore ?? 'N/A', "Valutazione": item.angleAnalysis?.evaluation ?? 'N/A',
            "Analisi Approfondita": item.angleAnalysis?.detailedAnalysis?.replace(/\r\n|\r|\n/g, '<br />') ?? 'N/A',
            "Errore": item.analysisError || item.angleAnalysis?.error || ''
        }));
        reportHtml += generateTableHtml(angleHeadersTool3, angleTableDataTool3, "Dettaglio: Analisi Angle Inserzioni (Metodo 7C)", "tool3-angle-table");
    } else { reportHtml += "<p class='no-data-message'>Nessun dato disponibile dal Tool 3 o analisi non eseguita.</p>"; }
    reportHtml += '<hr class="tool-section-separator">';

    // Tool 4 Section
    reportHtml += addSection("tool4-main", "Tool 4: Analizzatore Dati GSC", 1);
    if (tool4Data && tool4Data.analyzedGscData) {
        if (tool4Data.gscFiltersDisplay) {
            const cleanGscFiltersDisplay = tool4Data.gscFiltersDisplay.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
            reportHtml += addSection("tool4-filters", "Filtri GSC Applicati all'Export", 3);
            reportHtml += `<div class="filters-display">${cleanGscFiltersDisplay}</div>`;
            reportHtml += '<hr class="subsection-separator">';
        }
        (['queries', 'pages', 'countries', 'devices', 'searchAppearance'] as GscReportType[]).forEach((reportType, idx) => {
            if (!tool4Data.analyzedGscData) return;
            const analysis = tool4Data.analyzedGscData[reportType];
            const itemDisplayName = getGSCReportItemDisplayName(reportType);
            reportHtml += addSection(`tool4-${reportType}-section`, `Analisi GSC: ${escapeHtml(itemDisplayName)}`, 3);
            
            if (analysis && analysis.detailedDataWithDiffs && analysis.detailedDataWithDiffs.length > 0) {
                const cleanSummaryText = (analysis.summaryText || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
                reportHtml += `<p>${cleanSummaryText}</p>`;
                
                const chart4Id = `chartTool4_${reportType}`;
                const isPieChart = reportType === 'devices';
                const chartContainerClass = isPieChart ? "chart-container-html-report chart-container-html-report-pie" : "chart-container-html-report";
                reportHtml += `<div class="${chartContainerClass}"><canvas id="${chart4Id}"></canvas></div>`;

                const chartDataForTool4 = analysis.topItemsByClicksChartData || { labels: [], datasets: [] };
                let chartJsData;
                if (isPieChart && analysis.pieChartData && analysis.pieChartData.length > 0) {
                    chartJsData = {
                        labels: analysis.pieChartData.map(d => d.name),
                        datasets: [{
                            label: `Clic per ${itemDisplayName}`,
                            data: analysis.pieChartData.map(d => d.value),
                            backgroundColor: analysis.pieChartData.map((_, i) => chartJsColors[i % chartJsColors.length]),
                            borderColor: analysis.pieChartData.map((_, i) => chartJsBorderColors[i % chartJsColors.length]),
                            borderWidth: 1
                        }]
                    };
                } else if (!isPieChart && chartDataForTool4.labels.length > 0 && chartDataForTool4.datasets[0]?.data.length > 0) {
                     chartJsData = {
                        labels: chartDataForTool4.labels,
                        datasets: [{
                            label: chartDataForTool4.datasets[0]?.label || `Clic per ${itemDisplayName}`,
                            data: chartDataForTool4.datasets[0]?.data,
                            backgroundColor: chartJsColors[idx % chartJsColors.length],
                            borderColor: chartJsBorderColors[idx % chartJsBorderColors.length],
                            borderWidth: 1
                        }]
                    };
                }

                if (chartJsData) {
                    chartConfigs.push({
                        id: chart4Id, type: isPieChart ? 'pie' : 'bar', data: chartJsData,
                        options: { responsive: true, maintainAspectRatio: false, scales: (isPieChart ? {} : { y: { beginAtZero: true } }), plugins: { legend: { display: true, position: 'top'} } }
                    });
                } else {
                    const chartPlaceholderDiv = `<div class="${chartContainerClass}" style="height:auto; padding: 20px 0;"><p class="no-data-message">Dati insufficienti per il grafico di ${escapeHtml(itemDisplayName)}.</p></div>`;
                    reportHtml = reportHtml.replace(`<div class="${chartContainerClass}"><canvas id="${chart4Id}"></canvas></div>`, chartPlaceholderDiv);
                }
                
                const gscHeaders = [itemDisplayName, "Clic Attuali", "Clic Prec.", "Diff. Clic", "% Clic", "Impr. Attuali", "Impr. Prec.", "Diff. Impr.", "% Impr.", "CTR Attuale", "CTR Prec.", "Diff. CTR", "Pos. Attuale", "Pos. Prec.", "Diff. Pos."];
                const gscTableData = analysis.detailedDataWithDiffs.map(d => ({
                    [itemDisplayName]: d.item,
                    "Clic Attuali": d.clicks_current, "Clic Prec.": d.clicks_previous, "Diff. Clic": d.diff_clicks,
                    "% Clic": isFinite(d.perc_change_clicks) ? (d.perc_change_clicks * 100).toFixed(1) + '%' : (d.perc_change_clicks === Infinity ? '+Inf%' : 'N/A'),
                    "Impr. Attuali": d.impressions_current, "Impr. Prec.": d.impressions_previous, "Diff. Impr.": d.diff_impressions,
                    "% Impr.": isFinite(d.perc_change_impressions) ? (d.perc_change_impressions * 100).toFixed(1) + '%' : (d.perc_change_impressions === Infinity ? '+Inf%' : 'N/A'),
                    "CTR Attuale": (d.ctr_current * 100).toFixed(2) + '%', "CTR Prec.": (d.ctr_previous * 100).toFixed(2) + '%',
                    "Diff. CTR": (d.diff_ctr * 100).toFixed(2) + 'pp',
                    "Pos. Attuale": d.position_current?.toFixed(1) || 'N/A', "Pos. Prec.": d.position_previous?.toFixed(1) || 'N/A',
                    "Diff. Pos.": d.diff_position?.toFixed(1) || 'N/A',
                }));
                reportHtml += generateTableHtml(gscHeaders, gscTableData, `Dettaglio: ${escapeHtml(itemDisplayName)}`, `tool4-${reportType}-table`);
            } else { reportHtml += `<p class="no-data-message">Nessun dato trovato per ${escapeHtml(itemDisplayName)}.</p>`; }
            if (idx < (['queries', 'pages', 'countries', 'devices', 'searchAppearance'] as GscReportType[]).length -1) {
                reportHtml += '<hr class="subsection-separator">';
            }
        });
    } else { reportHtml += "<p class='no-data-message'>Nessun dato disponibile dal Tool 4 o analisi non eseguita.</p>"; }
    reportHtml += '<hr class="tool-section-separator">';

    // --- Finalizza TOC ---
    sections.forEach(section => {
        tocHTML += `<li class="toc-level-${section.level}"><a href="#${section.id}">${escapeHtml(section.title)}</a></li>`;
    });
    tocHTML += '</ul></div><hr class="toc-end-hr">';


    let finalHtml = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Report Consolidato S.W.A.T.</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
        <style>
          /* General Body & Container */
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; line-height: 1.6; color: #333; background-color: #f4f4f4; }
          .report-container { max-width: 1200px; margin: 20px auto; padding: 30px; background-color: #fff; box-shadow: 0 0 20px rgba(0,0,0,0.1); border-radius: 8px; }

          /* Headings */
          .report-h1 { color: #1e3a8a; /* Dark Blue */ border-bottom: 2px solid #3b82f6; /* Primary Blue */ padding-bottom: 10px; margin-top: 40px; margin-bottom: 25px; font-size: 28px; font-weight: 600; }
          .report-h1:first-of-type { margin-top: 0; }
          .report-h3 { color: #1d4ed8; /* Medium Blue */ margin-top: 30px; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px solid #93c5fd; /* Lighter Blue */ font-size: 20px; font-weight: 500;}

          /* Paragraphs and Lists */
          p, .summary-list, .filters-display p, .context-info { margin-bottom: 15px; font-size: 14px; color: #334155; }
          .summary-list { list-style-type: disc; padding-left: 25px; }
          .summary-list li { margin-bottom: 8px; }
          .summary-list strong { color: #1e40af; }
          p.no-data-message { color: #64748b; font-style: italic; text-align: center; padding: 20px 0; }
          .context-info { background-color: #eef2ff; border-left: 3px solid #4f46e5; padding: 10px 15px; margin-bottom: 20px; border-radius: 4px; font-size: 0.9em;}


          /* Separators */
          hr.tool-section-separator { border: none; border-top: 2px solid #60a5fa; margin-top: 50px; margin-bottom: 50px; }
          hr.subsection-separator { border: none; border-top: 1px dashed #cbd5e1; margin-top: 35px; margin-bottom: 35px; }
          hr.toc-end-hr { margin-top: 20px; margin-bottom: 40px; border-top: 2px solid #60a5fa; }


          /* Tables */
          .table-preview-container { max-height: 300px; /* Initial collapsed height */ overflow-y: auto; margin-bottom: 0px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background-color: #fdfdfe; position: relative; }
          .table-preview-container.expanded { max-height: none; overflow-y: visible; }
          .table-wrapper { overflow-x: auto; /* Existing horizontal scroll for wide tables */ }
          table { border-collapse: collapse; width: 100%; font-size: 13px; }
          th, td { border: 1px solid #e2e8f0; /* Light Gray */ padding: 10px 12px; text-align: left; vertical-align: top; word-break: break-word; }
          th { background-color: #f1f5f9; /* Very Light Blue/Gray */ font-weight: 600; color: #0f172a; /* Darker Gray for header text */ white-space: nowrap; position: sticky; top: 0; z-index: 1;}
          tr:nth-child(even) td { background-color: #f8fafc; /* Slightly off-white for zebra */ }
          td { color: #334155; /* Slate Gray for table text */ }
          td a { color: #2563eb; text-decoration: none; }
          td a:hover { text-decoration: underline; }
          .toggle-table-button { display: block; width: auto; margin: 8px auto 25px auto; padding: 6px 12px; font-size: 0.85em; color: #1e40af; background-color: #e0f2fe; border: 1px solid #93c5fd; border-radius: 4px; cursor: pointer; transition: background-color 0.2s; }
          .toggle-table-button:hover { background-color: #d1eaff; }


          /* Chart Containers */
          .chart-container-html-report { background-color: #f9fafb; padding: 20px; text-align: center; margin: 30px auto; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); max-width: 750px; height: 400px; }
          .chart-container-html-report-pie { max-width: 480px; height: 480px; } 

          /* Filters Display */
          .filters-display { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; margin-bottom: 25px; border-radius: 4px; font-size: 0.9em; }
          .filters-display h4 { margin-top: 0; color: #1e40af; font-size: 1.1em; margin-bottom: 10px; }
          .filters-display ul { padding-left: 20px; margin-bottom: 0; }
          .filters-display li { margin-bottom: 5px; }

          /* Table of Contents (TOC) */
          .toc { padding: 25px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 40px; }
          .toc h2 { font-size: 24px; color: #1e3a8a; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #93c5fd; padding-bottom: 12px; }
          .toc ul { list-style-type: none; padding-left: 0; margin-bottom: 0; }
          .toc li a { text-decoration: none; color: #1d4ed8; display: block; padding: 8px 0; transition: color 0.2s ease; }
          .toc li a:hover { text-decoration: none; color: #3b82f6; background-color: #eff6ff; padding-left: 5px; border-radius: 4px;}
          .toc li.toc-level-1 > a { font-weight: 500; font-size: 1.15em; padding-left: 0px; }
          .toc li.toc-level-3 > a { padding-left: 25px; font-size: 0.95em; }
          .toc li.toc-level-3 > a::before { content: "- "; }


          /* Print Styles */
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; font-size: 10pt; background-color: #fff !important; color: #000 !important; }
            .report-container { box-shadow: none !important; border: none !important; padding:0 !important; margin: 10mm !important; max-width: none !important; border-radius: 0 !important; }
            th { background-color: #f1f5f9 !important; color: #0f172a !important; position: static !important; /* Override sticky for print */ }
            tr:nth-child(even) td { background-color: #f8fafc !important; }
            .chart-container-html-report { border: 1px solid #ccc !important; box-shadow: none !important; page-break-inside: avoid !important; background-color: #fff !important; }
            .table-preview-container, .table-wrapper { page-break-inside: avoid !important; border: 1px solid #ccc !important; box-shadow: none !important; border-radius: 0 !important; max-height: none !important; overflow: visible !important; }
            table { page-break-inside: auto !important; font-size: 9pt !important; } /* Allow tables to break if very long */
            th, td { padding: 6px 8px !important; }
            h1, h3, .report-h1, .report-h3 { page-break-after: avoid !important; page-break-inside: avoid !important; color: #000 !important; border-color: #999 !important; }
            .report-h1 { font-size: 20pt !important; }
            .report-h3 { font-size: 14pt !important; }
            .toc, .no-print, .toggle-table-button { display: none !important; }
            hr { border-color: #ccc !important; }
            a { color: #000 !important; text-decoration: none !important; } /* Make links black and not underlined for print */
          }
        </style>
      </head>
      <body>
        <div class="report-container">
        ${tocHTML} 
        ${reportHtml}
        <div class="no-print" style="text-align:center; margin-top:30px; padding:15px; background-color:#e0f2fe; border-radius:5px;">
          <p style="margin:0; font-size:0.9em; color:#0c4a6e;">Per una versione PDF di questo report, utilizza la funzione "Stampa" del tuo browser (Ctrl+P o Cmd+P) e scegli "Salva come PDF".</p>
        </div>
    `;
    
    finalHtml += `<script>
      function toggleTableVisibility(wrapperId, buttonElement) {
        const wrapper = document.getElementById(wrapperId);
        if (wrapper) {
          wrapper.classList.toggle('expanded');
          if (wrapper.classList.contains('expanded')) {
            buttonElement.textContent = 'Mostra meno';
          } else {
            buttonElement.textContent = 'Mostra tutta la tabella';
          }
        }
      }
    <\/script>`;

    if (chartConfigs.length > 0) {
        finalHtml += `<script>
            window.addEventListener('DOMContentLoaded', () => {
                const chartConfigs = ${JSON.stringify(chartConfigs)};
                chartConfigs.forEach(config => {
                    const ctx = document.getElementById(config.id);
                    if (ctx) {
                        try {
                            new Chart(ctx.getContext('2d'), {
                                type: config.type,
                                data: config.data,
                                options: config.options || {}
                            });
                        } catch (e) {
                            console.error('Errore creazione grafico Chart.js:', config.id, e);
                            if (ctx.parentElement) ctx.parentElement.innerHTML = '<p style="color:red; text-align:center;">Errore nel caricamento del grafico.</p>';
                        }
                    } else {
                        console.warn('Canvas non trovato per grafico:', config.id);
                    }
                });
            });
        <\/script>`;
    }

    finalHtml += `</div></body></html>`;
    return finalHtml;
  }

  const handleDownloadCompleteHTMLReport = () => {
    const reportString = prepareFullHTMLReportString();
    const blob = new Blob([reportString], { type: 'text/html;charset=utf-8' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "report_consolidato_swat_completo.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleCopyHTMLToClipboard = async () => {
    const reportString = prepareFullHTMLReportString();
    try {
      await navigator.clipboard.writeText(reportString);
      toast({
        title: "HTML Copiato!",
        description: "Il codice HTML completo del report è stato copiato negli appunti.",
        duration: 3000,
      });
    } catch (err) {
      console.error('Errore nel copiare HTML negli appunti:', err);
      toast({
        title: "Errore Copia",
        description: "Impossibile copiare l'HTML. Controlla la console per i dettagli.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };


  return (
    <div className="tool5-master-report space-y-8 p-4 md:p-6 text-foreground">
      <header className="text-center py-6 no-print">
        <h1 className="text-3xl md:text-4xl font-bold text-primary flex items-center justify-center">
            <Presentation className="mr-3 h-8 w-8 md:h-10 md:w-10" /> Report Consolidato Dettagliato
        </h1>
      </header>
      
      <Card className="no-print">
        <CardHeader>
            <CardTitle className="text-primary text-xl flex items-center"><FileCode className="mr-2 h-6 w-6"/>Esportazione Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <p className="text-primary-foreground text-base">
                Scegli come vuoi condividere o salvare il report completo.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li><strong>Scarica Report HTML:</strong> Genera un file <code>.html</code> che puoi aprire nel browser. Questo file contiene tutti i dati, le tabelle interattive (espandibili) e i grafici (renderizzati dinamicamente con Chart.js).</li>
                <li><strong>Copia HTML Report:</strong> Copia l'intero codice sorgente HTML del report negli appunti. Puoi incollarlo in servizi come GitHub Gist per una facile condivisione online o per altri usi.</li>
            </ul>
             <p className="text-xs text-muted-foreground mt-2">
                Per una versione PDF, scarica prima il report HTML, aprilo nel browser, quindi utilizza la funzione "Stampa" (Ctrl+P o Cmd+P) e scegli "Salva come PDF".
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
                <Button onClick={handleDownloadCompleteHTMLReport} variant="default" size="lg">
                    <Download className="mr-2 h-5 w-5"/> Scarica Report HTML
                </Button>
                 <Button onClick={handleCopyHTMLToClipboard} variant="outline" size="lg">
                    <Copy className="mr-2 h-5 w-5"/> Copia HTML Report
                </Button>
            </div>
        </CardContent>
    </Card>

    {/* ANTEPRIMA REPORT */}
    <div className="mt-12 p-6 bg-sky-50 border border-sky-200 rounded-md shadow no-print">
        <h2 className="text-xl font-semibold text-sky-700 mb-3">Anteprima Contenuto Report (Live)</h2>
        <p className="text-muted-foreground mb-4">
            Di seguito un'anteprima dei dati che saranno inclusi nel report HTML scaricabile. I grafici qui sotto sono renderizzati con Recharts per la visualizzazione live; il report HTML scaricato userà Chart.js per renderizzare grafici simili.
        </p>
        {(!tool1Data?.rawResults?.length && (!tool2Data || !tool2Data.analysisResults || tool2Data.analysisResults.length === 0) && !tool3Data?.adsWithAnalysis?.length && !tool4Data?.analyzedGscData) && (
             <Alert variant="default" className="my-4">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Nessun Dato da Visualizzare</AlertTitle>
                <AlertDescription>
                    Nessuna analisi è stata ancora eseguita nei tool precedenti, oppure i dati non sono stati passati correttamente.
                    Esegui le analisi nei Tool 1, 2, 3 e 4 per popolare il report consolidato.
                </AlertDescription>
            </Alert>
        )}
        {tool1Data && tool1Data.rawResults && tool1Data.rawResults.length > 0 && (
            <Card className="my-4 report-section" id="tool1-summary-live">
                <CardHeader>
                    <CardTitle className="report-h1 text-2xl flex items-center"><BarChart3 className="mr-2"/>Tool 1: Analizzatore Comparativo Keyword</CardTitle>
                </CardHeader>
                <CardContent>
                    <h3 className="report-h3 text-lg mt-4">Conteggio Generale Keyword</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li>Keyword Comuni: {tool1Data.comparisonResultsCount.common}</li>
                        <li>Punti di Forza: {tool1Data.comparisonResultsCount.mySiteOnly}</li>
                        <li>Opportunità: {tool1Data.comparisonResultsCount.competitorOnly}</li>
                        <li>Totale Uniche: {tool1Data.comparisonResultsCount.totalUnique}</li>
                    </ul>
                    
                    <h3 className="report-h3 text-lg mt-4">Grafico: Analisi Keyword Comuni in Top 10 (Live)</h3>
                    <div className="h-[350px] w-full my-4">
                        <CommonKeywordsTop10Chart results={tool1Data.rawResults} activeCompetitorNames={tool1Data.activeCompetitorNames} />
                    </div>

                    <h3 className="report-h3 text-lg mt-4">Grafico: Top 10 Opportunità per Volume (Live)</h3>
                     <div className="h-[400px] w-full my-4">
                        <TopOpportunitiesChart results={tool1Data.rawResults} />
                    </div>
                    
                    <h3 className="report-h3 text-lg mt-4">Anteprima Tabella: Keyword Comuni (Prime 5 righe)</h3>
                    <ComparisonResultsTable results={tool1Data.rawResults.filter(r => r.status === 'common').slice(0,5)} type="common" activeCompetitorNames={tool1Data.activeCompetitorNames} />
                </CardContent>
            </Card>
        )}
        {tool2Data && tool2Data.analysisResults && tool2Data.analysisResults.length > 0 && (
            <Card className="my-4 report-section" id="tool2-summary-live">
                <CardHeader>
                    <CardTitle className="report-h1 text-2xl flex items-center"><ClipboardList className="mr-2 h-6 w-6"/>Tool 2: Analizzatore Pertinenza & Priorità KW (Offline)</CardTitle>
                </CardHeader>
                <CardContent>
                    {tool2Data.industryContext && <p className="text-sm text-muted-foreground mb-2"><strong>Contesto Analisi:</strong> {tool2Data.industryContext}</p>}
                    <h3 className="report-h3 text-lg mt-4">Anteprima Tabella: Analisi Pertinenza e Priorità (Prime 5 righe)</h3>
                    <TablePertinenceResults results={tool2Data.analysisResults.slice(0,5)} />
                </CardContent>
            </Card>
        )}
         {tool3Data && (tool3Data.scrapedAds?.length > 0 || tool3Data.adsWithAnalysis?.length > 0) && (
            <Card className="my-4 report-section" id="tool3-summary-live">
                <CardHeader>
                    <CardTitle className="report-h1 text-2xl flex items-center"><SearchCode className="mr-2"/>Tool 3: FB Ads Library Scraper & Analisi Angle</CardTitle>
                </CardHeader>
                <CardContent>
                     <h3 className="report-h3 text-lg mt-4">Riepilogo Analisi Facebook Ads</h3>
                     <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li>Annunci Recuperati: {tool3Data.scrapedAds?.length || 0}</li>
                        <li>Annunci Analizzati (7C): {tool3Data.adsWithAnalysis?.filter(ad => ad.angleAnalysis && !ad.angleAnalysis.error).length || 0}</li>
                    </ul>
                    {average7CScores && (
                        <>
                        <h3 className="report-h3 text-lg mt-4">Grafico: Punteggi Medi 7C (Live)</h3>
                        <div className="h-[350px] w-full my-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={Object.entries(average7CScores).map(([name, value]) => ({name, value}))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 2]} allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" name="Punteggio Medio" fill="hsl(var(--chart-3))" />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </div>
                        </>
                    )}
                    <h3 className="report-h3 text-lg mt-4">Anteprima Tabella: Analisi Angle (Prime 3 righe)</h3>
                    <TableAngleAnalysis adsWithAnalysis={tool3Data.adsWithAnalysis.slice(0,3)} />
                </CardContent>
            </Card>
        )}
        {tool4Data && tool4Data.analyzedGscData && (
             <Card className="my-4 report-section" id="tool4-summary-live">
                <CardHeader>
                    <CardTitle className="report-h1 text-2xl flex items-center"><BarChart2 className="mr-2"/>Tool 4: Analizzatore Dati GSC</CardTitle>
                </CardHeader>
                <CardContent>
                {tool4Data.gscFiltersDisplay && <div className="text-xs text-muted-foreground prose prose-xs max-w-none" dangerouslySetInnerHTML={{__html: tool4Data.gscFiltersDisplay}}/>}
                
                {(['queries', 'pages', 'devices'] as GscReportType[]).map((reportType) => {
                    if(!tool4Data.analyzedGscData) return null;
                    const analysis = tool4Data.analyzedGscData[reportType];
                    if (!analysis || !analysis.detailedDataWithDiffs || analysis.detailedDataWithDiffs.length === 0) return null;
                    const itemDisplayName = getGSCReportItemDisplayName(reportType);
                    const chartType = reportType === 'devices' ? 'pie' : 'bar';
                    return (
                        <div key={reportType} className="my-6">
                            <h3 className="report-h3 text-lg">{`Sintesi ${itemDisplayName}`}</h3>
                            {analysis.summaryText && <p className="text-sm text-muted-foreground mb-2" dangerouslySetInnerHTML={{__html: analysis.summaryText}} />}
                            <div className="h-[350px] md:h-[400px] my-4">
                                <ChartGSC
                                    data={analysis.topItemsByClicksChartData}
                                    pieData={analysis.pieChartData}
                                    type={chartType}
                                    title={`Top ${itemDisplayName} per Clic (Live)`}
                                />
                            </div>
                            <h4 className="font-semibold mt-2 text-base">Tabella Dati: {itemDisplayName} (Prime 5 righe)</h4>
                            <TableGSC data={analysis.detailedDataWithDiffs.slice(0,5)} itemDisplayName={itemDisplayName} />
                        </div>
                    );
                })}
                </CardContent>
            </Card>
        )}
    </div>

      <footer className="mt-12 py-6 border-t border-border text-center no-print">
        <p className="text-muted-foreground">
            Per generare un report PDF completo, scarica il file HTML (pulsante sopra) e aprilo nel tuo browser.
            Quindi, utilizza la funzione "File &gt; Stampa" e scegli "Salva come PDF".
        </p>
        <p className="text-sm text-muted-foreground mt-2">
            Questo metodo assicura che tutti i dati, le tabelle formattate e i grafici generati dinamicamente siano inclusi nel tuo PDF finale.
        </p>
      </footer>
    </div>
  );
}
