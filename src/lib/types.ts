

// Tool 1: Keyword Comparator
export interface CsvRowTool1 {
  keyword: string;
  posizione: number | null;
  url: string;
  volume: number | null;
  difficolta: number | null;
  opportunity: number | null;
  intento: string;
  varTraffico?: string;
  trafficoStimato?: string;
  cpcMedio?: string;
}

export interface CompetitorEntry {
  name: string;
  pos: number | string | null; 
  url: string;
}

export interface ComparisonResult {
  keyword: string;
  mySiteInfo: { pos: number | string | null; url: string };
  competitorInfo: CompetitorEntry[];
  volume: number | string | null;
  difficolta: number | string | null;
  opportunity: number | string | null;
  intento: string;
  status: 'common' | 'mySiteOnly' | 'competitorOnly';
}

// Tool 2: Keyword Pertinence & Priority Analyzer
export interface CsvRowTool2 {
  keyword: string;
  volume: number | string; 
  difficolta: number | string; 
  opportunity: number | string; 
  posizione: number | string; 
  url: string;
  intento: string;
}

export interface PertinenceAnalysisResult {
  keyword: string;
  settore: string;
  pertinenza: string;
  prioritaSEO: string;
  motivazioneSEO: string;
  volume?: number | string;
  kd?: number | string;
  opportunity?: number | string;
  posizione?: number | string;
  url?: string;
  intento?: string;
}

// Tool 3: Facebook Ads Library Scraper
export interface ApifyRawAdItem {
  snapshot?: {
    cards?: Array<{
      body?: string;
      title?: string;
      link_url?: string;
      resized_image_url?: string;
      original_image_url?: string;
    }>;
    body?: { text?: string };
    title?: string;
    page_name?: string;
    link_url?: string;
    page_profile_uri?: string;
    videos?: Array<{ video_preview_image_url?: string }>;
    images?: Array<{ url?: string }>;
    page_profile_picture_url?: string;
  };
  url?: string; 
  [key: string]: any;
}

export interface ScrapedAd {
  id: string; 
  testo: string;
  titolo: string;
  link: string;
  immagine: string;
}

export interface AngleAnalysisScores {
  C1: number; 
  C2: number; 
  C3: number; 
  C4: number; 
  C5: number; 
  C6: number; 
  C7: number; 
}

export interface AngleAnalysis {
  c1Clarity: number;
  c2Engagement: number;
  c3Concreteness: number;
  c4Coherence: number;
  c5Credibility: number;
  c6CallToAction: number;
  c7Context: number;
  scores: AngleAnalysisScores; // Kept for potential direct use if AI returns this nested
  totalScore: number;
  evaluation: string;
  detailedAnalysis: string;
  error?: string; 
  raw?: string; 
}

export interface AdWithAngleAnalysis extends ScrapedAd {
  angleAnalysis?: AngleAnalysis;
  analysisError?: string;
}

// Tool 4: GSC Analyzer
export type GscReportType = 'queries' | 'pages' | 'countries' | 'devices' | 'searchAppearance' | 'filters';

export interface GscSheetRow {
  item?: string; 
  clicks_current?: number;
  clicks_previous?: number;
  impressions_current?: number;
  impressions_previous?: number;
  ctr_current?: number;
  ctr_previous?: number;
  position_current?: number | null;
  position_previous?: number | null;
  filterName?: string;
  filterValue?: string;
  [key: string]: any;
}

export interface GscAnalyzedItem {
  item: string;
  clicks_current: number;
  clicks_previous: number;
  diff_clicks: number;
  perc_change_clicks: number; 
  impressions_current: number;
  impressions_previous: number;
  diff_impressions: number;
  perc_change_impressions: number; 
  ctr_current: number;
  ctr_previous: number;
  diff_ctr: number; 
  position_current: number | null;
  position_previous: number | null;
  diff_position: number | null; 
}

export interface GscSectionAnalysis {
  summaryText: string;
  detailedDataWithDiffs: GscAnalyzedItem[];
  topItemsByClicksChartData: { 
    labels: string[]; 
    datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
        fill?: string; 
    }>;
  };
  pieChartData?: Array<{ name: string; value: number; fill: string }>;
}


export interface GscParsedData {
  queries?: GscSheetRow[];
  pages?: GscSheetRow[];
  countries?: GscSheetRow[];
  devices?: GscSheetRow[];
  searchAppearance?: GscSheetRow[];
  filters?: GscSheetRow[];
}

export interface GscAnalyzedData {
  queries?: GscSectionAnalysis;
  pages?: GscSectionAnalysis;
  countries?: GscSectionAnalysis;
  devices?: GscSectionAnalysis;
  searchAppearance?: GscSectionAnalysis;
}

// For Master Report Tool 5
export interface Tool2MasterReportData {
  analysisResults: PertinenceAnalysisResult[];
  industryContext: string;
}


// For detail pages
export type DetailPageSection = 
  | 'distribution' 
  | 'commonTop10' 
  | 'topOpportunities' 
  | 'commonKeywordsSectionTool1' 
  | 'mySiteOnlyKeywordsSectionTool1' 
  | 'competitorOnlyKeywordsSectionTool1'
  | 'angleAnalysisDetail'
  | GscReportType; 


export type ChartConfig = any; 

export interface DetailPageDataTool1 {
  pageTitle: string;
  description: string;
  chartComponent?: React.ReactNode; 
  tableData?: ComparisonResult[];
  tableHeaders?: string[];
  tableType?: 'common' | 'mySiteOnly' | 'competitorOnly';
  activeCompetitorNames?: string[];
  additionalContent?: string; 
}

export interface DetailPageDataTool3 {
  pageTitle: string;
  descriptionHTML: string; 
  chartConfig?: ChartConfig; 
  tableData: AdWithAngleAnalysis[];
}

export interface DetailPageDataTool4 {
  pageTitle: string;
  description: string;
  analyzedData: GscSectionAnalysis | null;
  itemDisplayName: string; 
  reportType: GscReportType;
  chartType?: 'bar' | 'pie';
}


// CSV Column mapping
export const EXPECTED_COLUMNS_TOOL1: Record<keyof CsvRowTool1, string> = { 
  keyword: 'Keyword', posizione: 'Pos', url: 'URL', volume: 'Volume',
  difficolta: 'Keyword Difficulty', opportunity: 'Keyword Opportunity', intento: 'Intent',
  varTraffico: 'var. traffico', trafficoStimato: 'traffico stimato', cpcMedio: 'cpc medio'
};

export const COLUMN_ALIASES_TOOL1: Record<keyof Partial<CsvRowTool1>, string[]> = { 
  difficolta: ['keyword difficulty', 'key diff', 'kd'], 
  opportunity: ['keyword opportunity', 'opportunity score'], 
  posizione: ['pos', 'position']
};

export const EXPECTED_COLUMNS_TOOL2: Record<keyof CsvRowTool2, string> = { 
  keyword: 'Keyword', posizione: 'Pos', url: 'URL', volume: 'Volume',
  difficolta: 'Keyword Difficulty', opportunity: 'Keyword Opportunity', intento: 'Intent'
};
export const COLUMN_ALIASES_TOOL2 = COLUMN_ALIASES_TOOL1;
