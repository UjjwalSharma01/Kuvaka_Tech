// Rule-based scoring logic (max 50 points)

/**
 * Calculate rule-based score for a lead
 * @param {Object} lead - Lead data
 * @param {Object} offer - Offer data for industry matching
 * @returns {Object} - Score breakdown and total
 */
function calculateRuleScore(lead, offer) {
  let score = 0;
  const breakdown = {};

  // Role relevance scoring (max 20 points)
  const role = (lead.role || '').toLowerCase();
  const decisionMakerRoles = ['ceo', 'cto', 'cfo', 'founder', 'director', 'head', 'manager', 'vp', 'vice president'];
  const influencerRoles = ['lead', 'senior', 'specialist', 'analyst', 'coordinator'];

  if (decisionMakerRoles.some(dmRole => role.includes(dmRole))) {
    breakdown.role_score = 20;
    breakdown.role_reason = 'Decision maker role';
  } else if (influencerRoles.some(infRole => role.includes(infRole))) {
    breakdown.role_score = 10;
    breakdown.role_reason = 'Influencer role';
  } else {
    breakdown.role_score = 0;
    breakdown.role_reason = 'Other role';
  }
  score += breakdown.role_score;

  // Industry matching (max 20 points)
  const leadIndustry = (lead.industry || '').toLowerCase();
  const offerUseCases = offer ? offer.ideal_use_cases.map(uc => uc.toLowerCase()) : [];
  
  // Check for exact match
  let industryMatch = false;
  for (const useCase of offerUseCases) {
    if (useCase.includes(leadIndustry) || leadIndustry.includes(useCase.split(' ')[0])) {
      breakdown.industry_score = 20;
      breakdown.industry_reason = 'Exact ICP match';
      industryMatch = true;
      break;
    }
  }

  // Check for adjacent match if no exact match
  if (!industryMatch) {
    const adjacentTerms = ['tech', 'software', 'saas', 'technology', 'digital', 'startup'];
    const hasAdjacentTerms = adjacentTerms.some(term => 
      leadIndustry.includes(term) || offerUseCases.some(uc => uc.includes(term))
    );
    
    if (hasAdjacentTerms) {
      breakdown.industry_score = 10;
      breakdown.industry_reason = 'Adjacent industry match';
    } else {
      breakdown.industry_score = 0;
      breakdown.industry_reason = 'No industry match';
    }
  }
  score += breakdown.industry_score;

  // Data completeness (max 10 points)
  const requiredFields = ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio'];
  const completedFields = requiredFields.filter(field => 
    lead[field] && typeof lead[field] === 'string' && lead[field].trim().length > 0
  );

  if (completedFields.length === requiredFields.length) {
    breakdown.completeness_score = 10;
    breakdown.completeness_reason = 'All fields present';
  } else {
    breakdown.completeness_score = Math.floor((completedFields.length / requiredFields.length) * 10);
    breakdown.completeness_reason = `${completedFields.length}/${requiredFields.length} fields complete`;
  }
  score += breakdown.completeness_score;

  return {
    total_rule_score: score,
    max_rule_score: 50,
    breakdown
  };
}

module.exports = {
  calculateRuleScore
};