// Utility for interacting with Gemini API
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Get AI intent and reasoning for a lead using Gemini with structured XML prompting
 * @param {Object} lead - Lead data
 * @param {Object} offer - Offer data
 * @returns {Promise<{ intent: string, reasoning: string }>} AI result
 */
async function getAIIntent(lead, offer) {
  // Compose structured XML prompt for Gemini
  const prompt = `
<task>
You are an expert B2B lead qualification analyst. Analyze the provided lead against the given product/offer and classify their buying intent.
</task>

<context>
<product>
  <name>${offer.name}</name>
  <value_propositions>
    ${offer.value_props.map(vp => `<value_prop>${vp}</value_prop>`).join('\n    ')}
  </value_propositions>
  <ideal_use_cases>
    ${offer.ideal_use_cases.map(uc => `<use_case>${uc}</use_case>`).join('\n    ')}
  </ideal_use_cases>
</product>

<lead_profile>
  <name>${lead.name}</name>
  <role>${lead.role}</role>
  <company>${lead.company}</company>
  <industry>${lead.industry}</industry>
  <location>${lead.location}</location>
  <linkedin_bio>${lead.linkedin_bio}</linkedin_bio>
</lead_profile>
</context>

<classification_criteria>
<high_intent>
- Decision maker role (CEO, CTO, Director, Head, Manager, VP)
- Industry closely matches product's ideal use cases
- LinkedIn bio shows relevant pain points or interests
- Company size/stage fits the product
</high_intent>

<medium_intent>
- Influencer role (Senior, Lead, Specialist)
- Adjacent industry or some relevance to use cases
- Some indicators of potential interest but not strong
</medium_intent>

<low_intent>
- Individual contributor or unrelated role
- Industry doesn't match product use cases
- No clear indicators of interest or need
</low_intent>
</classification_criteria>

<instructions>
1. Analyze the lead against the classification criteria
2. Consider role authority, industry fit, and bio relevance
3. Classify as High, Medium, or Low intent
4. Provide 1-2 sentences explaining your reasoning
5. Focus on specific factors that influenced your decision
</instructions>

<output_format>
Respond in this exact JSON format:
{
  "intent": "High|Medium|Low",
  "reasoning": "Specific explanation in 1-2 sentences focusing on key qualifying factors"
}
</output_format>`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Enhanced JSON parsing with better error handling
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const aiResult = JSON.parse(jsonMatch[0]);
        
        // Validate the response structure
        if (aiResult.intent && aiResult.reasoning) {
          // Ensure intent is valid
          const validIntents = ['High', 'Medium', 'Low'];
          if (validIntents.includes(aiResult.intent)) {
            return {
              intent: aiResult.intent,
              reasoning: aiResult.reasoning.trim()
            };
          }
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
      }
    }
    
    // Enhanced fallback with intent extraction from text
    const textLower = text.toLowerCase();
    let fallbackIntent = 'Low';
    
    if (textLower.includes('high intent') || textLower.includes('"high"')) {
      fallbackIntent = 'High';
    } else if (textLower.includes('medium intent') || textLower.includes('"medium"')) {
      fallbackIntent = 'Medium';
    }
    
    return {
      intent: fallbackIntent,
      reasoning: 'AI response processed successfully but required format correction.'
    };
    
  } catch (error) {
    console.error('Gemini API error:', error.message);
    
    // Intelligent fallback based on lead data
    let fallbackIntent = 'Low';
    let fallbackReasoning = 'AI service unavailable, using rule-based fallback.';
    
    // Simple heuristic for fallback intent
    const role = (lead.role || '').toLowerCase();
    const industry = (lead.industry || '').toLowerCase();
    const bio = (lead.linkedin_bio || '').toLowerCase();
    
    const decisionMakerTerms = ['ceo', 'cto', 'director', 'head', 'manager', 'vp', 'founder'];
    const industryTerms = offer.ideal_use_cases.map(uc => uc.toLowerCase());
    
    const isDecisionMaker = decisionMakerTerms.some(term => role.includes(term));
    const hasIndustryMatch = industryTerms.some(term => 
      industry.includes(term.split(' ')[0]) || bio.includes(term.split(' ')[0])
    );
    
    if (isDecisionMaker && hasIndustryMatch) {
      fallbackIntent = 'High';
      fallbackReasoning = 'Decision maker in relevant industry (fallback analysis).';
    } else if (isDecisionMaker || hasIndustryMatch) {
      fallbackIntent = 'Medium';
      fallbackReasoning = 'Partial match on role or industry (fallback analysis).';
    }
    
    return {
      intent: fallbackIntent,
      reasoning: fallbackReasoning
    };
  }
}

module.exports = { getAIIntent };