'use server';

/**
 * @fileOverview Analyzes keywords for pertinence and SEO priority.
 *
 * This file exports:
 * - `analyzeKeywordPertinenceAndPriority` - The main function to analyze keyword pertinence and priority.
 * - `AnalyzeKeywordPertinenceAndPriorityInput` - The input type for the function.
 * - `AnalyzeKeywordPertinenceAndPriorityOutput` - The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeKeywordPertinenceAndPriorityInputSchema = z.object({
  keyword: z.string().describe('The keyword to analyze.'),
  industry: z.string().describe('The industry to which the keyword should be relevant.'),
  volume: z.number().describe('The search volume for the keyword.'),
  keywordDifficulty: z.number().describe('The keyword difficulty (0-100).'),
  opportunity: z.number().describe('The keyword opportunity (0-100).'),
  currentPosition: z.number().describe('The current position of the website for the keyword.'),
  url: z.string().describe('The URL currently ranking for the keyword.'),
  searchIntent: z.string().describe('The primary search intent behind the keyword.'),
});
export type AnalyzeKeywordPertinenceAndPriorityInput = z.infer<
  typeof AnalyzeKeywordPertinenceAndPriorityInputSchema
>;

const AnalyzeKeywordPertinenceAndPriorityOutputSchema = z.object({
  relevance: z
    .string()
    .describe('Whether the keyword is in target or out of target.'),
  seoPriority: z.string().describe('The SEO priority for the keyword.'),
  motivation: z.string().describe('The motivation behind the SEO priority.'),
});

export type AnalyzeKeywordPertinenceAndPriorityOutput = z.infer<
  typeof AnalyzeKeywordPertinenceAndPriorityOutputSchema
>;

export async function analyzeKeywordPertinenceAndPriority(
  input: AnalyzeKeywordPertinenceAndPriorityInput
): Promise<AnalyzeKeywordPertinenceAndPriorityOutput> {
  return analyzeKeywordPertinenceAndPriorityFlow(input);
}

const analyzeKeywordPertinenceAndPriorityPrompt = ai.definePrompt({
  name: 'analyzeKeywordPertinenceAndPriorityPrompt',
  input: {schema: AnalyzeKeywordPertinenceAndPriorityInputSchema},
  output: {schema: AnalyzeKeywordPertinenceAndPriorityOutputSchema},
  prompt: `You are an expert SEO and content analyst. Your task is to EVALUATE A SINGLE KEYWORD in two steps, providing a structured answer.

**Data Provided for the Keyword:**
* Keyword to Analyze: "{{{keyword}}}"
* Industry of Reference for the Site: "{{{industry}}}"
* Estimated Monthly Search Volume: "{{{volume}}}"
* Keyword Difficulty (0-100): "{{{keywordDifficulty}}}"
* Opportunity Score (0-100): "{{{opportunity}}}"
* Current Position of the Site for the Keyword: "{{{currentPosition}}}"
* URL Currently Positioned: "{{{url}}}"
* Primary Search Intent: "{{{searchIntent}}}"

**STEP 1: Relevance Assessment ("In Target" / "Out of Target")**
Guiding Principle for Relevance: A keyword is "In Target" if an entity operating in the "{{{industry}}}" could realistically create relevant content, or if the keyword reflects a problem, question, or interest that the sector addresses. Also, consider generic keywords or questions if the industry can provide an authoritative answer. It is "Out of Target" if it clearly belongs to other areas without a logical connection.
Relevance Criteria:
- High Relevance ("In Target"): Directly related to the core products/services of the "{{{industry}}}", or a very common problem/question the industry solves.
- Medium Relevance ("In Target"): Tangentially related, could be a shoulder topic or a less direct user need but still addressable by the "{{{industry}}}".
- Low Relevance ("Out of Target"): Very loosely connected or clearly unrelated to the "{{{industry}}}".

Based on this, determine if the keyword is "In Target" or "Out of Target" for the \`relevance\` output field.

**STEP 2: SEO Priority Assessment and Motivation**
Guiding Principle for SEO Priority: Based on all data, determine the SEO priority (e.g., "High", "Medium", "Low").
Factors to Consider for SEO Priority:
- High Volume: Generally increases priority, but consider difficulty.
- Low Keyword Difficulty (KD < 30): Increases priority, especially if volume is decent.
- High Keyword Difficulty (KD > 60): Decreases priority unless opportunity and volume are very high, or current position is already good.
- High Opportunity Score (> 70): Increases priority.
- Current Position (Pos. > 0 and <= 10): If already ranking well, priority might be "High" for maintenance/improvement or "Medium" if stable.
- Current Position (Pos. > 10 and <= 30): "High" or "Medium" priority to improve.
- Current Position (Pos. > 30 or N/P): Priority depends heavily on other factors. If volume and opportunity are high and KD is manageable, could be "High".
- Search Intent: Consider if the intent aligns with potential business goals. Informational keywords might be "Medium" priority for content marketing, while transactional ones might be "High".

Based on these factors, assign an SEO priority ("High", "Medium", or "Low") to the \`seoPriority\` output field.

Then, in the \`motivation\` output field, provide a concise explanation (1-2 sentences) for your relevance and SEO priority assessment, referencing specific data points (e.g., "High priority due to high volume and good opportunity score, despite moderate KD. Keyword is in target as it directly relates to user needs in the industry.").

Ensure your entire response is a single JSON object matching the output schema.
`,
});

const analyzeKeywordPertinenceAndPriorityFlow = ai.defineFlow(
  {
    name: 'analyzeKeywordPertinenceAndPriorityFlow',
    inputSchema: AnalyzeKeywordPertinenceAndPriorityInputSchema,
    outputSchema: AnalyzeKeywordPertinenceAndPriorityOutputSchema,
  },
  async input => {
    const {output} = await analyzeKeywordPertinenceAndPriorityPrompt(input);
    return output!;
  }
);
