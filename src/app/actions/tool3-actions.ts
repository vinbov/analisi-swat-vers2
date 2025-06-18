
'use server';

import {
  analyzeFacebookAdMarketingAngle,
  type AnalyzeFacebookAdMarketingAngleInput,
  type AnalyzeFacebookAdMarketingAngleOutput,
} from '@/ai/flows/analyze-facebook-ad-marketing-angle';

export async function analyzeAdAngleAction(
  input: AnalyzeFacebookAdMarketingAngleInput,
  apiKey: string // Questa chiave API proviene dall'UI, attesa come chiave OpenAI
): Promise<AnalyzeFacebookAdMarketingAngleOutput> {
  // Il plugin Genkit openAI cercherà OPENAI_API_KEY in process.env
  // se una chiave API non è stata fornita all'inizializzazione del plugin.
  // La impostiamo temporaneamente qui per lo scope di questa action,
  // dando priorità alla chiave fornita dall'utente tramite UI.

  const originalEnvOpenAIApiKey = process.env.OPENAI_API_KEY;
  let restoreOpenAINeeded = false;

  if (apiKey && typeof apiKey === 'string' && apiKey.trim() !== '') {
    process.env.OPENAI_API_KEY = apiKey;
    restoreOpenAINeeded = true;
    console.log('analyzeAdAngleAction: OPENAI_API_KEY impostata temporaneamente dall\'input UI.');
  } else if (originalEnvOpenAIApiKey) {
    console.log('analyzeAdAngleAction: OPENAI_API_KEY utilizzata dalla variabile d\'ambiente globale.');
  } else {
    console.warn(
      'analyzeAdAngleAction: Nessuna OpenAI API Key fornita tramite UI, e OPENAI_API_KEY non è impostata nell\'ambiente.'
    );
    // Potrebbe essere necessario lanciare un errore qui se la chiave è strettamente richiesta e non trovata
  }

  try {
    // Il flow 'analyzeFacebookAdMarketingAngle' ora usa un modello OpenAI
    const result = await analyzeFacebookAdMarketingAngle(input);
    return result;
  } catch (error: any) {
    console.error('Errore in analyzeAdAngleAction (OpenAI):', error);
    let errorMessage = `AI ad angle analysis with OpenAI failed: ${error.message}`;
    if (
      (error.message?.includes('API key') || error.message?.includes('credential')) &&
      (!apiKey || apiKey.trim() === '') && 
      !originalEnvOpenAIApiKey
    ) {
      errorMessage = `AI ad angle analysis with OpenAI failed: La OpenAI API Key è mancante. Forniscila nel campo di input o imposta la variabile d'ambiente OPENAI_API_KEY. Errore originale: ${error.message}`;
    } else if (error.message?.includes('model_not_found') || error.message?.includes('insufficient_quota')) {
      errorMessage = `AI ad angle analysis with OpenAI failed: Il modello specificato potrebbe non essere disponibile con la tua API Key OpenAI, potresti non avere quota sufficiente, o il plugin OpenAI non è configurato correttamente. Errore originale: ${error.message}`;
    }
    throw new Error(errorMessage);
  } finally {
    if (restoreOpenAINeeded) {
      if (originalEnvOpenAIApiKey !== undefined) {
        process.env.OPENAI_API_KEY = originalEnvOpenAIApiKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
      console.log('analyzeAdAngleAction: OPENAI_API_KEY ripristinata/rimossa.');
    }
  }
}
