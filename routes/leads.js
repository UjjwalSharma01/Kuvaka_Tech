const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// POST /api/leads/upload - Upload CSV leads
router.post('/leads/upload', (req, res) => {
  try {
    const { csvData } = req.body;
    
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ 
        error: 'Missing csvData field. Send CSV content as a string in the request body.' 
      });
    }

    // Parse CSV manually (simple approach for MVP)
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must contain at least a header and one data row' });
    }

    // Get headers and normalize them
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredColumns = ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio'];
    
    // Check if all required columns are present
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}`,
        required_columns: requiredColumns,
        found_columns: headers
      });
    }

    // Parse data rows
    const parsedLeads = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        continue; // Skip malformed rows
      }

      const lead = {};
      headers.forEach((header, index) => {
        lead[header] = values[index];
      });

      // Basic validation - ensure name is present
      if (lead.name && lead.name.length > 0) {
        lead.id = Date.now() + i; // Simple ID generation
        lead.uploaded_at = new Date().toISOString();
        parsedLeads.push(lead);
      }
    }

    // Store leads (replace any existing ones for simplicity)
    dataStore.setLeads(parsedLeads);
    
    res.json({ 
      message: 'CSV uploaded and parsed successfully',
      leads_uploaded: parsedLeads.length,
      sample_lead: parsedLeads[0] || null
    });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    res.status(500).json({ error: 'Failed to process CSV upload' });
  }
});

// POST /api/score - Run scoring on uploaded leads
router.post('/score', async (req, res) => {
  try {
    const { calculateRuleScore } = require('../utils/scoring');
    const { getAIIntent } = require('../utils/gemini');
    
    const offers = dataStore.getOffers();
    const leads = dataStore.getLeads();
    
    if (!offers || offers.length === 0) {
      return res.status(400).json({ error: 'No offer found. Please create an offer first.' });
    }
    
    if (!leads.length) {
      return res.status(400).json({ error: 'No leads uploaded. Please upload leads first.' });
    }

    const offer = offers[0]; // Get the active offer
    const scoringResults = [];
    
    // Process each lead
    for (const lead of leads) {
      try {
        // Rule-based scoring
        const ruleResult = calculateRuleScore(lead, offer);
        
        // AI scoring
        const aiResult = await getAIIntent(lead, offer);
        let ai_points = 10; // Default for 'Low'
        if (aiResult.intent === 'High') ai_points = 50;
        else if (aiResult.intent === 'Medium') ai_points = 30;
        
        // Final score
        const total_score = ruleResult.total_rule_score + ai_points;
        
        scoringResults.push({
          name: lead.name,
          role: lead.role,
          company: lead.company,
          intent: aiResult.intent,
          score: total_score,
          reasoning: aiResult.reasoning,
          rule_breakdown: ruleResult.breakdown
        });
      } catch (error) {
        console.error(`Error scoring lead ${lead.name}:`, error);
        // Continue with fallback scoring for this lead
        const ruleResult = calculateRuleScore(lead, offer);
        scoringResults.push({
          name: lead.name,
          role: lead.role,
          company: lead.company,
          intent: 'Low',
          score: ruleResult.total_rule_score + 10,
          reasoning: 'AI scoring failed, using fallback',
          rule_breakdown: ruleResult.breakdown
        });
      }
    }
    
    // Store results
    dataStore.setScoringResults(scoringResults);
    
    res.json({
      message: 'Scoring completed successfully',
      total_leads_scored: scoringResults.length,
      results: scoringResults
    });
  } catch (error) {
    console.error('Scoring error:', error);
    res.status(500).json({ error: 'Failed to score leads' });
  }
});

// GET /api/results - Get scoring results
router.get('/results', (req, res) => {
  try {
    const scoringResults = dataStore.getScoringResults();
    res.json({ 
      results: scoringResults,
      total_scored: scoringResults.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// GET /api/results/csv - Export results as CSV
router.get('/results/csv', (req, res) => {
  try {
    const scoringResults = dataStore.getScoringResults();
    
    if (scoringResults.length === 0) {
      return res.status(404).json({ error: 'No results available for export' });
    }

    // Generate CSV headers
    const headers = [
      'name',
      'role', 
      'company',
      'intent',
      'score',
      'reasoning',
      'rule_score',
      'ai_score',
      'role_points',
      'industry_points',
      'completeness_points'
    ];

    // Generate CSV rows
    const csvRows = [headers.join(',')];
    
    scoringResults.forEach(result => {
      const aiScore = result.intent === 'High' ? 50 : result.intent === 'Medium' ? 30 : 10;
      const ruleScore = (result.rule_breakdown?.role_score || 0) + 
                       (result.rule_breakdown?.industry_score || 0) + 
                       (result.rule_breakdown?.completeness_score || 0);
      
      const row = [
        `"${(result.name || '').replace(/"/g, '""')}"`,
        `"${(result.role || '').replace(/"/g, '""')}"`,
        `"${(result.company || '').replace(/"/g, '""')}"`,
        result.intent || 'Low',
        result.score || 0,
        `"${(result.reasoning || '').replace(/"/g, '""')}"`,
        ruleScore,
        aiScore,
        result.rule_breakdown?.role_score || 0,
        result.rule_breakdown?.industry_score || 0,
        result.rule_breakdown?.completeness_score || 0
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="lead-scores-${new Date().toISOString().split('T')[0]}.csv"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent));
    
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export results as CSV' });
  }
});

// GET /api/leads - List uploaded leads (helper endpoint)
router.get('/leads', (req, res) => {
  const leads = dataStore.getLeads();
  res.json({ 
    leads: leads,
    total: leads.length 
  });
});

module.exports = router;