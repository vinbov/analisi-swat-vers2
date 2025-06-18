
"use client";

import React, { useState } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { ToolNavigation } from '@/components/layout/tool-navigation';
import { Tool1Comparator } from '@/components/tools/tool1-comparator/tool1-comparator';
import { Tool2Analyzer } from '@/components/tools/tool2-analyzer/tool2-analyzer';
import { Tool3Scraper } from '@/components/tools/tool3-scraper/tool3-scraper';
import { Tool4GSCAnalyzer } from '@/components/tools/tool4-gsc-analyzer/tool4-gsc-analyzer';
import { Tool5MasterReport } from '@/components/tools/tool5-master-report/tool5-master-report';
import type { ComparisonResult, PertinenceAnalysisResult, ScrapedAd, AdWithAngleAnalysis, GscParsedData, GscAnalyzedData } from '@/lib/types';

const tools = [
  { id: 'tool1', label: 'Analizzatore Comparativo KW' },
  { id: 'tool2', label: 'Analizzatore Pertinenza & Priorità KW' },
  { id: 'tool3', label: 'FB Ads Library Scraper' },
  { id: 'tool4', label: 'Analizzatore Dati GSC' },
  { id: 'tool5', label: 'Report Consolidato' },
];

export default function HomePage() {
  const [activeTool, setActiveTool] = useState<string>('tool1');

  // --- State for Tool 1 ---
  const [tool1SiteFiles, setTool1SiteFiles] = useState<Record<string, { content: string; name: string }>>({});
  const [tool1ComparisonResults, setTool1ComparisonResults] = useState<ComparisonResult[]>([]);
  const [tool1ActiveCompetitorNames, setTool1ActiveCompetitorNames] = useState<string[]>([]);

  // --- State for Tool 2 ---
  const [tool2Industry, setTool2Industry] = useState('');
  const [tool2IndustryKeywords, setTool2IndustryKeywords] = useState('');
  const [tool2CsvFile, setTool2CsvFile] = useState<{ content: string; name: string } | null>(null);
  const [tool2AnalysisResults, setTool2AnalysisResults] = useState<PertinenceAnalysisResult[]>([]);
  
  // --- State for Tool 3 ---
  const [tool3ApifyToken, setTool3ApifyToken] = useState('');
  const [tool3ApifyActorId, setTool3ApifyActorId] = useState('curious_coder~facebook-ads-library-scraper');
  const [tool3FbAdsUrl, setTool3FbAdsUrl] = useState('');
  const [tool3MaxAdsToProcess, setTool3MaxAdsToProcess] = useState(10);
  const [tool3OpenAIApiKey, setTool3OpenAIApiKey] = useState(''); // Modificato da googleApiKey
  const [tool3ScrapedAds, setTool3ScrapedAds] = useState<ScrapedAd[]>([]);
  const [tool3AdsWithAnalysis, setTool3AdsWithAnalysis] = useState<AdWithAngleAnalysis[]>([]);


  // --- State for Tool 4 ---
  const [tool4GscExcelFile, setTool4GscExcelFile] = useState<{ content: ArrayBuffer; name: string } | null>(null);
  const [tool4ParsedGscData, setTool4ParsedGscData] = useState<GscParsedData | null>(null);
  const [tool4AnalyzedGscData, setTool4AnalyzedGscData] = useState<GscAnalyzedData | null>(null);
  const [tool4GscFiltersDisplay, setTool4GscFiltersDisplay] = useState<string>("");


  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="container mx-auto max-w-7xl bg-card p-4 md:p-6 lg:p-8 rounded-lg shadow-xl">
        <AppHeader />
        <ToolNavigation activeTool={activeTool} setActiveTool={setActiveTool} tools={tools} />

        <main>
          {activeTool === 'tool1' && (
            <div id="tool1-container">
              <Tool1Comparator
                siteFiles={tool1SiteFiles}
                setSiteFiles={setTool1SiteFiles}
                comparisonResults={tool1ComparisonResults}
                setComparisonResults={setTool1ComparisonResults}
                activeCompetitorNames={tool1ActiveCompetitorNames}
                setActiveCompetitorNames={setTool1ActiveCompetitorNames}
              />
            </div>
          )}
          {activeTool === 'tool2' && (
            <div id="tool2-container">
              <Tool2Analyzer
                industry={tool2Industry}
                setIndustry={setTool2Industry}
                industryKeywords={tool2IndustryKeywords}
                setIndustryKeywords={setTool2IndustryKeywords}
                csvFile={tool2CsvFile}
                setCsvFile={setTool2CsvFile}
                analysisResults={tool2AnalysisResults}
                setAnalysisResults={setTool2AnalysisResults}
              />
            </div>
          )}
          {activeTool === 'tool3' && (
            <div id="tool3-container">
              <Tool3Scraper
                apifyToken={tool3ApifyToken}
                setApifyToken={setTool3ApifyToken}
                apifyActorId={tool3ApifyActorId}
                setApifyActorId={setTool3ApifyActorId}
                fbAdsUrl={tool3FbAdsUrl}
                setFbAdsUrl={setTool3FbAdsUrl}
                maxAdsToProcess={tool3MaxAdsToProcess}
                setMaxAdsToProcess={setTool3MaxAdsToProcess}
                openAIApiKey={tool3OpenAIApiKey} // Modificato
                setOpenAIApiKey={setTool3OpenAIApiKey} // Modificato
                scrapedAds={tool3ScrapedAds}
                setScrapedAds={setTool3ScrapedAds}
                adsWithAnalysis={tool3AdsWithAnalysis}
                setAdsWithAnalysis={setTool3AdsWithAnalysis}
              />
            </div>
          )}
          {activeTool === 'tool4' && (
            <div id="tool4-container">
              <Tool4GSCAnalyzer
                gscExcelFile={tool4GscExcelFile}
                setGscExcelFile={setTool4GscExcelFile}
                parsedGscData={tool4ParsedGscData}
                setParsedGscData={setTool4ParsedGscData}
                analyzedGscData={tool4AnalyzedGscData}
                setAnalyzedGscData={setTool4AnalyzedGscData}
                gscFiltersDisplay={tool4GscFiltersDisplay}
                setGscFiltersDisplay={setTool4GscFiltersDisplay}
              />
            </div>
          )}
          {activeTool === 'tool5' && (
            <div id="tool5-container">
              <Tool5MasterReport 
                tool1Data={{
                  comparisonResultsCount: {
                    common: tool1ComparisonResults.filter(r => r.status === 'common').length,
                    mySiteOnly: tool1ComparisonResults.filter(r => r.status === 'mySiteOnly').length,
                    competitorOnly: tool1ComparisonResults.filter(r => r.status === 'competitorOnly').length,
                    totalUnique: new Set(tool1ComparisonResults.map(r => r.keyword)).size
                  },
                  rawResults: tool1ComparisonResults, 
                  activeCompetitorNames: tool1ActiveCompetitorNames,
                }}
                tool2Data={{
                  analysisResults: tool2AnalysisResults,
                  industryContext: tool2Industry || tool2IndustryKeywords ? `Settore di riferimento: ${tool2Industry || 'N/D'}, Parole chiave specifiche: ${tool2IndustryKeywords || 'N/D'}` : "Nessun contesto di settore fornito per l'analisi del Tool 2.",
                }}
                tool3Data={{
                  scrapedAds: tool3ScrapedAds,
                  adsWithAnalysis: tool3AdsWithAnalysis,
                }}
                tool4Data={{
                  analyzedGscData: tool4AnalyzedGscData,
                  gscFiltersDisplay: tool4GscFiltersDisplay,
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
