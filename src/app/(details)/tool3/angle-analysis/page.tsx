"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { AdWithAngleAnalysis, DetailPageDataTool3, AngleAnalysisScores } from '@/lib/types';
import { TableAngleAnalysis } from '@/components/tools/tool3-scraper/table-angle-analysis';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LOGO_URL = "https://placehold.co/150x50/0284c7/FFFFFF?text=SEO+Toolkit+Pro"; // Defined in original HTML

const description7C_HTML = `
    <h4 class="text-lg font-semibold mb-2 text-foreground">Framework di Valutazione Copy AD – Metodo 7C</h4>
    <ul class="list-disc pl-5 space-y-1 text-sm text-muted-foreground mb-4">
        <li><strong>🎯 C1 Chiarezza:</strong> Il messaggio è comprensibile in meno di 5 secondi?</li>
        <li><strong>🧲 C2 Coinvolgimento (Hook):</strong> Il primo rigo attira l’attenzione o incuriosisce?</li>
        <li><strong>💎 C3 Concretezza (Benefit chiari):</strong> È chiaro il vantaggio per l’utente? È concreto, misurabile?</li>
        <li><strong>👤 C4 Coerenza col target:</strong> Usa un tono e un linguaggio adatto al pubblico?</li>
        <li><strong>🧠 C5 Credibilità:</strong> Ci sono elementi di fiducia (numeri, testimonianze, dati)?</li>
        <li><strong>🚀 C6 Call To Action (CTA):</strong> L’invito all’azione è chiaro, diretto e contestuale?</li>
        <li><strong>📱 C7 Contesto (platform-fit):</strong> È ottimizzato per il canale (Instagram, Facebook)?</li>
    </ul>
    <h5 class="text-md font-semibold mb-1 text-foreground">Punteggio e Valutazione:</h5>
    <ul class="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        <li><strong>0-2 per C:</strong> 0 = assente, 1 = presente ma debole, 2 = presente e forte.</li>
        <li><strong>Totale (max 14):</strong> 12–14 Ottimo; 9–11 Buono; 6–8 Debole; 0–5 Scarso.</li>
    </ul>`;

export default function Tool3AngleAnalysisDetailPage() {
  const router = useRouter();
  const [pageData, setPageData] = useState<DetailPageDataTool3 | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedDataString = localStorage.getItem('tool3AngleAnalysisData');
    if (storedDataString) {
      try {
        const adsWithAnalysis: AdWithAngleAnalysis[] = JSON.parse(storedDataString);
        
        const averageScores: AngleAnalysisScores = { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0, C7: 0 };
        let validAnalysisCount = 0;
        adsWithAnalysis.forEach(result => {
            if (result.angleAnalysis && !result.analysisError && !result.angleAnalysis.error) {
                validAnalysisCount++;
                Object.keys(averageScores).forEach(keyStr => {
                    const key = keyStr as keyof AngleAnalysisScores;
                    averageScores[key] += result.angleAnalysis!.scores[key] || 0;
                });
            }
        });

        if (validAnalysisCount > 0) {
            Object.keys(averageScores).forEach(keyStr => {
                const key = keyStr as keyof AngleAnalysisScores;
                averageScores[key] = parseFloat((averageScores[key] / validAnalysisCount).toFixed(2));
            });
        }
        
        const chartDataValues = {
          labels: Object.keys(averageScores),
          datasets: [{
              label: 'Punteggio Medio 7C',
              data: Object.values(averageScores),
              backgroundColor: 'hsl(var(--chart-1))',
              borderColor: 'hsl(var(--primary))',
              borderWidth: 1
          }]
        };
        const chartConfig = { type: 'bar', data: chartDataValues, options: { scales: { y: { beginAtZero: true, max: 2 } }, responsive: true, maintainAspectRatio: false } };


        setPageData({
          pageTitle: "Report Dettagliato: Analisi Angle Inserzioni (Metodo 7C)",
          descriptionHTML: description7C_HTML,
          chartConfig: chartConfig,
          tableData: adsWithAnalysis,
        });

      } catch (error) {
        console.error("Failed to parse data from localStorage for Tool 3 detail page:", error);
        setPageData(null);
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Caricamento dettagli analisi angle...</p></div>;
  }

  if (!pageData) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="container mx-auto max-w-5xl bg-card p-6 rounded-lg shadow-xl">
          <AppHeader />
          <Button onClick={() => router.back()} variant="outline" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna Indietro
          </Button>
          <h1 className="text-2xl font-bold mb-4">Dati non trovati</h1>
          <p>Impossibile caricare i dettagli dell'analisi angle. Torna alla pagina principale e riprova.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="container mx-auto max-w-6xl bg-card p-6 rounded-lg shadow-xl">
        <AppHeader />
        <Button onClick={() => router.back()} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Torna Indietro
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{pageData.pageTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-muted-foreground mb-6" dangerouslySetInnerHTML={{ __html: pageData.descriptionHTML }} />
            
            {pageData.chartConfig && (
              <div className="my-6 h-[350px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pageData.chartConfig.data.datasets[0].data.map((val, idx) => ({name: pageData.chartConfig.data.labels[idx], value: val}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 2]} allowDecimals={false}/>
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Punteggio Medio" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Tabella Dettaglio Analisi Angle</h3>
              <TableAngleAnalysis adsWithAnalysis={pageData.tableData} isDetailPage={true} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
