
import type { CsvRowTool1, CsvRowTool2, ComparisonResult } from './types';
import { EXPECTED_COLUMNS_TOOL1, EXPECTED_COLUMNS_TOOL2, COLUMN_ALIASES_TOOL1, COLUMN_ALIASES_TOOL2 } from './types';
import * as XLSX from 'xlsx';


// --- Funzioni di Utilità ---
function removeBOM(str: string): string {
  if (!str) return "";
  // Character code 0xFEFF is the BOM character
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.substring(1);
  }
  return str;
}

function getFirstLogicalLineAndRest(text: string): { headerLine: string; restOfText: string } {
  if (!text) return { headerLine: "", restOfText: "" };
  let inQuotes = false;
  let firstLineEndIndex = -1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      firstLineEndIndex = i;
      break;
    }
  }
  let headerLine, restOfText;
  if (firstLineEndIndex === -1) {
    headerLine = text;
    restOfText = "";
  } else {
    headerLine = text.substring(0, firstLineEndIndex);
    restOfText = text.substring(firstLineEndIndex).replace(/^(\r\n|\r|\n)+/, '');
  }
  return { headerLine, restOfText };
}

function parseCsvValues(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  const delimiterChar = delimiter.charAt(0);

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // If an escaped quote (two double quotes)
      if (inQuotes && i + 1 < line.length && line[i+1] === '"') {
        currentValue += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiterChar && !inQuotes) {
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue); // Add the last value

  // Post-process each value: unquote and trim
  return values.map(v => {
    let val = v;
    // Remove surrounding quotes if they exist
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    // Replace escaped double quotes with a single double quote
    val = val.replace(/""/g, '"');
    return val.trim();
  });
}


function getColumnIndices<T extends Record<string, string>, A extends Record<string, string[]>>(
  headers: string[],
  expectedColumns: T,
  columnAliases: A,
  siteNameForError: string,
  requiredKeys: (keyof T)[]
): Record<keyof T, number> {
  const columnIndices = {} as Record<keyof T, number>;
  const lowercasedHeaders = headers.map(h => h.toLowerCase());

  for (const key in expectedColumns) {
    const typedKey = key as keyof T;
    const expectedHeader = expectedColumns[typedKey].toLowerCase();
    let index = lowercasedHeaders.findIndex(h => h === expectedHeader);

    if (index === -1 && columnAliases[typedKey as string]) {
      for (const alias of columnAliases[typedKey as string]) {
        index = lowercasedHeaders.findIndex(h => h === alias.toLowerCase());
        if (index !== -1) break;
      }
    }
    
    if (index === -1 && requiredKeys.includes(typedKey)) {
      console.error(`Colonna obbligatoria "${expectedColumns[typedKey]}" (o alias) non trovata per ${siteNameForError}. Headers trovati:`, headers, `Expected: "${expectedHeader}"`);
      throw new Error(`Colonna obbligatoria "${expectedColumns[typedKey]}" (o suoi alias) non trovata nelle intestazioni CSV per ${siteNameForError}. Intestazioni rilevate: ${headers.join(' | ')}`);
    }
    columnIndices[typedKey] = index;
  }
  return columnIndices;
}

function detectDelimiter(headerLine: string): string {
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    if (semicolonCount > commaCount && semicolonCount > 0) {
        return ';';
    }
    return ',';
}


export function parseCSVTool1(csvText: string, siteNameForError: string): CsvRowTool1[] {
  let content = removeBOM(csvText.trim());
  const { headerLine, restOfText } = getFirstLogicalLineAndRest(content);
  
  if (!headerLine) {
    throw new Error(`File CSV per ${siteNameForError} sembra vuoto o non contiene una riga di intestazione valida.`);
  }
  
  const detectedDelimiter = detectDelimiter(headerLine);

  const headers = parseCsvValues(headerLine, detectedDelimiter)
    .map(h => h.replace(/\r\n|\n|\r/g, ' ').trim()); 

  const requiredKeysTool1: (keyof typeof EXPECTED_COLUMNS_TOOL1)[] = ['keyword', 'posizione', 'url'];
  const columnIndices = getColumnIndices(headers, EXPECTED_COLUMNS_TOOL1, COLUMN_ALIASES_TOOL1, siteNameForError, requiredKeysTool1);

  const data: CsvRowTool1[] = [];
  const dataLines = restOfText.replace(/\r\n?/g, '\n').split('\n').filter(line => line.trim() !== '');

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const values = parseCsvValues(line, detectedDelimiter);
    const entry: Partial<CsvRowTool1> = {};

    entry.keyword = (columnIndices.keyword !== -1 && values[columnIndices.keyword]) ? values[columnIndices.keyword].toLowerCase() : undefined;
    if (!entry.keyword) continue;

    const posVal = columnIndices.posizione !== -1 ? values[columnIndices.posizione] : null;
    entry.posizione = posVal && !isNaN(parseInt(posVal)) ? parseInt(posVal) : null;
    
    entry.url = columnIndices.url !== -1 ? values[columnIndices.url] : 'N/A';
    
    const volVal = columnIndices.volume !== -1 ? values[columnIndices.volume] : null;
    entry.volume = volVal && !isNaN(parseInt(volVal)) ? parseInt(volVal) : null;

    const diffVal = columnIndices.difficolta !== -1 ? values[columnIndices.difficolta] : null;
    entry.difficolta = diffVal && !isNaN(parseInt(diffVal)) ? parseInt(diffVal) : null;

    const oppVal = columnIndices.opportunity !== -1 ? values[columnIndices.opportunity] : null;
    entry.opportunity = oppVal && !isNaN(parseInt(oppVal)) ? parseInt(oppVal) : null;
    
    entry.intento = columnIndices.intento !== -1 ? values[columnIndices.intento] : 'N/A';
    
    entry.varTraffico = columnIndices.varTraffico !== -1 ? values[columnIndices.varTraffico] : 'N/A';
    entry.trafficoStimato = columnIndices.trafficoStimato !== -1 ? values[columnIndices.trafficoStimato] : 'N/A';
    entry.cpcMedio = columnIndices.cpcMedio !== -1 ? values[columnIndices.cpcMedio] : 'N/A';

    data.push(entry as CsvRowTool1);
  }
  return data;
}


export function parseCSVTool2(csvText: string): CsvRowTool2[] {
  let content = removeBOM(csvText.trim());
  const { headerLine, restOfText } = getFirstLogicalLineAndRest(content);

  if (!headerLine) {
    throw new Error(`File CSV per Tool 2 sembra vuoto o non contiene una riga di intestazione valida.`);
  }

  const detectedDelimiter = detectDelimiter(headerLine);

  const headers = parseCsvValues(headerLine, detectedDelimiter)
    .map(h => h.replace(/\r\n|\n|\r/g, ' ').trim());

  const requiredKeysTool2: (keyof typeof EXPECTED_COLUMNS_TOOL2)[] = ['keyword'];
  const columnIndices = getColumnIndices(headers, EXPECTED_COLUMNS_TOOL2, COLUMN_ALIASES_TOOL2, "Tool 2", requiredKeysTool2); 
  
  const data: CsvRowTool2[] = [];
  const dataLines = restOfText.replace(/\r\n?/g, '\n').split('\n').filter(line => line.trim() !== '');

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const values = parseCsvValues(line, detectedDelimiter);
    const entry: Partial<CsvRowTool2> = {};

    entry.keyword = (columnIndices.keyword !== -1 && values[columnIndices.keyword]) ? values[columnIndices.keyword].toLowerCase() : undefined;
    if (!entry.keyword) continue;
    
    const volVal = columnIndices.volume !== -1 ? values[columnIndices.volume] : "N/A";
    entry.volume = volVal && !isNaN(parseInt(volVal as string)) ? parseInt(volVal as string) : "N/A";

    const diffVal = columnIndices.difficolta !== -1 ? values[columnIndices.difficolta] : "N/A";
    entry.difficolta = diffVal && !isNaN(parseInt(diffVal as string)) ? parseInt(diffVal as string) : "N/A";
    
    const oppVal = columnIndices.opportunity !== -1 ? values[columnIndices.opportunity] : "N/A";
    entry.opportunity = oppVal && !isNaN(parseInt(oppVal as string)) ? parseInt(oppVal as string) : "N/A";

    const posVal = columnIndices.posizione !== -1 ? values[columnIndices.posizione] : "N/A";
    entry.posizione = posVal && !isNaN(parseInt(posVal as string)) ? parseInt(posVal as string) : "N/A";

    entry.url = columnIndices.url !== -1 ? values[columnIndices.url] : 'N/A';
    entry.intento = columnIndices.intento !== -1 ? values[columnIndices.intento] : 'N/A';
    
    data.push(entry as CsvRowTool2);
  }
  return data;
}

export function escapeCSVField(field: any): string {
  if (field === null || typeof field === 'undefined') {
    return "";
  }
  let stringField = String(field);
  if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
    stringField = stringField.replace(/"/g, '""'); // Escape double quotes
    return `"${stringField}"`; // Enclose in double quotes
  }
  return stringField;
}

export function exportToCSV(filename: string, headers: string[], data: Record<string, any>[]) {
  let csvContent = headers.map(h => escapeCSVField(h)).join(",") + "\r\n";

  data.forEach(item => {
    const row = headers.map(header => {
      const itemKey = Object.keys(item).find(k => 
        k.toLowerCase().replace(/\s+/g, '') === header.toLowerCase().replace(/\s+/g, '') ||
        (header.startsWith('7C_') && k.toLowerCase().replace(/\s+/g, '') === header.substring(3).toLowerCase().replace(/\s+/g, ''))
      );
      return escapeCSVField(itemKey ? item[itemKey] : "");
    });
    csvContent += row.join(",") + "\r\n";
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel compatibility
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}


export function exportTool1FullReportToXLSX(
  filename: string,
  comparisonResults: ComparisonResult[],
  activeCompetitorNames: string[]
) {
  const wb = XLSX.utils.book_new();

  // --- Foglio 1: Panoramica Distribuzione ---
  const commonKWsCount = comparisonResults.filter(r => r.status === 'common').length;
  const mySiteOnlyKWsCount = comparisonResults.filter(r => r.status === 'mySiteOnly').length;
  const competitorOnlyKWsCount = comparisonResults.filter(r => r.status === 'competitorOnly').length;
  const totalUniqueKWs = new Set(comparisonResults.map(r => r.keyword)).size;

  const overviewData = [
    ["Categoria", "Numero Keyword"],
    ["Keyword Comuni", commonKWsCount],
    ["Punti di Forza (Solo Mio Sito)", mySiteOnlyKWsCount],
    ["Opportunità (Solo Competitor)", competitorOnlyKWsCount],
    ["Totale Keyword Uniche Analizzate", totalUniqueKWs],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, "Panoramica Distribuzione");

  // --- Foglio 2: Riepilogo Top 10 Comuni ---
  const commonKWs = comparisonResults.filter(r => r.status === 'common');
  const mySiteTop10KWs = commonKWs.filter(kw => kw.mySiteInfo.pos !== 'N/P' && typeof kw.mySiteInfo.pos === 'number' && kw.mySiteInfo.pos <= 10)
    .sort((a, b) => (a.mySiteInfo.pos as number) - (b.mySiteInfo.pos as number))
    .slice(0, 10);
  
  const competitorTop10UniqueKWs = new Set<string>();
  commonKWs.forEach(kw => {
      kw.competitorInfo.forEach(comp => {
          if (activeCompetitorNames.includes(comp.name) && comp.pos !== 'N/P' && typeof comp.pos === 'number' && comp.pos <= 10) {
              competitorTop10UniqueKWs.add(kw.keyword);
          }
      });
  });
  const competitorTop10List = Array.from(competitorTop10UniqueKWs).slice(0,10);

  const top10CommonSummaryData = [
      ["Analisi Top 10 Keyword Comuni"],
      ["Mio Sito - Top 10 KW Comuni in Top 10"],
      ["Keyword", "Posizione"],
      ...mySiteTop10KWs.map(item => [item.keyword, item.mySiteInfo.pos]),
      mySiteTop10KWs.length === 0 ? ["Nessuna"] : [],
      [], // Riga vuota
      [`Competitors - Prime ${competitorTop10List.length} KW Comuni in Top 10 (da almeno un competitor)`],
      ["Keyword"],
      ...competitorTop10List.map(kw => [kw]),
      competitorTop10List.length === 0 ? ["Nessuna"] : [],
  ];
  const wsTop10Common = XLSX.utils.aoa_to_sheet(top10CommonSummaryData.filter(row => row.length > 0));
  XLSX.utils.book_append_sheet(wb, wsTop10Common, "Riepilogo Top10 Comuni");


  // --- Foglio 3: Riepilogo Top 10 Opportunità ---
  const topOpportunities = comparisonResults.filter(r => r.status === 'competitorOnly' && typeof r.volume === 'number' && r.volume > 0)
    .sort((a, b) => (b.volume as number) - (a.volume as number))
    .slice(0, 10);
  
  const topOpportunitiesSummaryData = [
      [`Top ${topOpportunities.length} Opportunità per Volume (Keyword Gap)`],
      ["Keyword", "Volume"],
      ...topOpportunities.map(item => [item.keyword, item.volume]),
      topOpportunities.length === 0 ? ["Nessuna"] : [],
  ];
  const wsTopOpportunities = XLSX.utils.aoa_to_sheet(topOpportunitiesSummaryData.filter(row => row.length > 0));
  XLSX.utils.book_append_sheet(wb, wsTopOpportunities, "Riepilogo Top10 Opportunità");


  // Funzione helper per convertire i dati delle tabelle
  const mapResultsToSheetData = (results: ComparisonResult[], type: 'common' | 'mySiteOnly' | 'competitorOnly') => {
    return results.map(item => {
      const row: Record<string, any> = {
        Keyword: item.keyword,
        Volume: item.volume ?? 'N/A',
        Difficoltà: item.difficolta ?? 'N/A',
        Opportunity: item.opportunity ?? 'N/A',
        Intento: item.intento ?? 'N/A',
      };
      if (type !== 'competitorOnly') {
        row['Mio Sito Pos.'] = item.mySiteInfo.pos;
        row['Mio Sito URL'] = item.mySiteInfo.url;
      }
      if (type !== 'mySiteOnly') {
        activeCompetitorNames.forEach(compName => {
          const compInfo = item.competitorInfo.find(c => c.name === compName);
          row[`${compName} Pos.`] = compInfo ? compInfo.pos : 'N/P';
          row[`${compName} URL`] = compInfo ? compInfo.url : 'N/A';
        });
      }
      return row;
    });
  };
  
  // --- Foglio 4: Dettaglio Keyword Comuni ---
  const commonDataDetailed = comparisonResults.filter(r => r.status === 'common');
  if (commonDataDetailed.length > 0) {
    const commonSheetData = mapResultsToSheetData(commonDataDetailed, 'common');
    const wsCommonDetailed = XLSX.utils.json_to_sheet(commonSheetData);
    XLSX.utils.book_append_sheet(wb, wsCommonDetailed, "Dettaglio Keyword Comuni");
  } else {
     XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nessuna Keyword Comune Trovata"]]), "Dettaglio Keyword Comuni");
  }
  
  // --- Foglio 5: Dettaglio Punti di Forza ---
  const mySiteOnlyDataDetailed = comparisonResults.filter(r => r.status === 'mySiteOnly');
  if (mySiteOnlyDataDetailed.length > 0) {
    const mySiteOnlySheetData = mapResultsToSheetData(mySiteOnlyDataDetailed, 'mySiteOnly');
    const wsMySiteOnlyDetailed = XLSX.utils.json_to_sheet(mySiteOnlySheetData);
    XLSX.utils.book_append_sheet(wb, wsMySiteOnlyDetailed, "Dettaglio Punti di Forza");
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nessun Punto di Forza Trovato"]]), "Dettaglio Punti di Forza");
  }

  // --- Foglio 6: Dettaglio Opportunità ---
  const competitorOnlyDataDetailed = comparisonResults.filter(r => r.status === 'competitorOnly');
   if (competitorOnlyDataDetailed.length > 0) {
    const competitorOnlySheetData = mapResultsToSheetData(competitorOnlyDataDetailed, 'competitorOnly');
    const wsCompetitorOnlyDetailed = XLSX.utils.json_to_sheet(competitorOnlySheetData);
    XLSX.utils.book_append_sheet(wb, wsCompetitorOnlyDetailed, "Dettaglio Opportunità");
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Nessuna Opportunità Trovata"]]), "Dettaglio Opportunità");
  }

  // Scrittura e download del file
  XLSX.writeFile(wb, filename);
}
