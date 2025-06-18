"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { DetailPageDataTool4, GscReportType, GscAnalyzedItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableGSC } from '@/components/tools/tool4-gsc-analyzer/table-gsc';
import { ChartGSC } from '@/components/tools/tool4-gsc-analyzer/charts-gsc';
import { exportToCSV } from '@/lib/csv'; // Assuming this can handle generic data
import { useToast } from '@/hooks/use-toast';

export default function Tool4DetailPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.sectionId as GscReportType;
  const [pageData, setPageData] = useState<DetailPageDataTool4 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedDataString = localStorage.getItem('tool4DetailData');
    if (storedDataString && sectionId) {
      try {
        const storedData: DetailPageDataTool4 = JSON.parse(storedDataString);
        // Ensure the stored data is for the current sectionId (reportType)
        if (storedData.reportType === sectionId) {
          setPageData(storedData);
        } else {
          console.error("Mismatch between sectionId and stored tool4DetailData reportType");
          setPageData(null);
        }
      } catch (error) {
        console.error("Failed to parse data from localStorage for Tool 4 detail page:", error);
        setPageData(null);
      }
    }
    setIsLoading(false);
  }, [sectionId]);

  const handleDownloadCSVDetail = () => {
    if (!pageData || !pageData.analyzedData || !pageData.analyzedData.detailedDataWithDiffs) {
      toast({ title: "Nessun dato", description: "Nessun risultato da scaricare.", variant: "destructive" });
      return;
    }
    const { analyzedData, itemDisplayName, reportType } = pageData;
    const headers = [
        itemDisplayName, "Clic Attuali", "Clic Prec.", "Diff. Clic", "% Clic", 
        "Impr. Attuali", "Impr. Prec.", "Diff. Impr.", "% Impr.",
        "CTR Attuale", "CTR Prec.", "Diff. CTR",
        "Pos. Attuale", "Pos. Prec.", "Diff. Pos."
    ];
    const dataForCsv = analyzedData.detailedDataWithDiffs.map(d => ({
        [itemDisplayName]: d.item,
        "Clic Attuali": d.clicks_current, "Clic Prec.": d.clicks_previous, "Diff. Clic": d.diff_clicks,
        "% Clic": isFinite(d.perc_change_clicks) ? (d.perc_change_clicks * 100).toFixed(1) + '%' : (d.perc_change_clicks === Infinity ? '+Inf%' : 'N/A'),
        "Impr. Attuali": d.impressions_current, "Impr. Prec.": d.impressions_previous, "Diff. Impr.": d.diff_impressions,
        "% Impr.": isFinite(d.perc_change_impressions) ? (d.perc_change_impressions * 100).toFixed(1) + '%' : (d.perc_change_impressions === Infinity ? '+Inf%' : 'N/A'),
        "CTR Attuale": (d.ctr_current * 100).toFixed(2) + '%', "CTR Prec.": d.ctr_previous * 100 .toFixed(2) + '%',
        "Diff. CTR": (d.diff_ctr * 100).toFixed(2) + 'pp',
        "Pos. Attuale": d.position_current?.toFixed(1) || 'N/A', "Pos. Prec.": d.position_previous?.toFixed(1) || 'N/A',
        "Diff. Pos.": d.diff_position?.toFixed(1) || 'N/A',
    }));
    exportToCSV(`report_dettaglio_gsc_${reportType}.csv`, headers, dataForCsv);
  };


  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Caricamento dettagli GSC...</p></div>;
  }

  if (!pageData || !pageData.analyzedData) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <div className="container mx-auto max-w-5xl bg-card p-6 rounded-lg shadow-xl">
          <AppHeader />
          <Button onClick={() => router.back()} variant="outline" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna Indietro
          </Button>
          <h1 className="text-2xl font-bold mb-4">Dati non trovati</h1>
          <p>Impossibile caricare i dettagli per questa sezione GSC. Torna alla pagina principale e riprova.</p>
        </div>
      </div>
    );
  }
  
  const { pageTitle, description, analyzedData, itemDisplayName, chartType } = pageData;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="container mx-auto max-w-6xl bg-card p-6 rounded-lg shadow-xl">
        <AppHeader />
        <Button onClick={() => router.back()} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Torna Indietro
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{pageTitle}</CardTitle>
            {description && <CardDescription className="mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{__html: description}} />}
          </CardHeader>
          <CardContent>
            {analyzedData.topItemsByClicksChartData && (
              <div className="my-6 h-[400px] md:h-[500px]">
                 <ChartGSC 
                    data={analyzedData.topItemsByClicksChartData} 
                    pieData={analyzedData.pieChartData}
                    type={chartType || 'bar'} 
                    title={`Top Elementi per ${itemDisplayName}`} 
                />
              </div>
            )}
            
            <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-semibold text-foreground">Tabella Dettaglio: {itemDisplayName}</h3>
                    <Button onClick={handleDownloadCSVDetail} variant="outline" size="sm">
                       <Download className="mr-2 h-4 w-4" /> Scarica Tabella (CSV)
                    </Button>
                </div>
              <TableGSC data={analyzedData.detailedDataWithDiffs} itemDisplayName={itemDisplayName} isDetailPage={true} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
