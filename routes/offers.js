const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// POST /api/offer - Create new offer
router.post('/offer', (req, res) => {
  try {
    const { name, value_props, ideal_use_cases } = req.body;
    
    // Validate required fields
    if (!name || !value_props || !ideal_use_cases) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, value_props, ideal_use_cases' 
      });
    }

    // Validate data types
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name must be a non-empty string' });
    }

    const offer = {
      id: Date.now(), // Simple timestamp-based ID for MVP
      name: name.trim(),
      value_props: Array.isArray(value_props) ? value_props : [value_props],
      ideal_use_cases: Array.isArray(ideal_use_cases) ? ideal_use_cases : [ideal_use_cases],
      created_at: new Date().toISOString()
    };

    // Store offer in shared data store (for simplicity, we'll work with one active offer)
    dataStore.setOffers([offer]);
    
    res.status(201).json({ 
      message: 'Offer created successfully', 
      offer: offer 
    });
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// GET /api/offers - List all offers (helper endpoint)
router.get('/offers', (req, res) => {
  res.json({ offers: dataStore.getOffers() });
});

module.exports = router;