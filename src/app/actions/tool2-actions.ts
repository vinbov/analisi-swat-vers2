"use server";

import { analyzeKeywordPertinenceAndPriority, type AnalyzeKeywordPertinenceAndPriorityInput, type AnalyzeKeywordPertinenceAndPriorityOutput } from '@/ai/flows/analyze-keyword-pertinence-and-priority';

export async function analyzeKeywordAction(
  input: AnalyzeKeywordPertinenceAndPriorityInput,
  apiKey: string 
): Promise<AnalyzeKeywordPertinenceAndPriorityOutput> {
  
  try {
    const result = await analyzeKeywordPertinenceAndPriority(input);
    return result;
  } catch (error: any) {
    console.error("Error in analyzeKeywordAction:", error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}
