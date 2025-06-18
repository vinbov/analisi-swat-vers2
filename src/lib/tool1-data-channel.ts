
import type { ComparisonResult } from '@/lib/types';

export const TOOL1_DATA_CHANNEL_NAME = 'tool1-data-channel';

export interface Tool1DataPayload {
  comparisonResults: ComparisonResult[];
  activeCompetitorNames: string[];
}

export interface RequestTool1DataMessage {
  type: 'REQUEST_TOOL1_DATA';
  dataId: string;
  requestingTabId: string; 
}

export interface ResponseTool1DataMessage {
  type: 'RESPONSE_TOOL1_DATA';
  dataId: string;
  requestingTabId: string;
  payload: Tool1DataPayload | null;
}
