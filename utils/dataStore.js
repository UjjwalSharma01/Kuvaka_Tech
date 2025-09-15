// Shared data storage for the application
let offers = [];
let leads = [];
let scoringResults = [];

module.exports = {
  offers,
  leads,
  scoringResults,
  setOffers: (newOffers) => { offers = newOffers; },
  setLeads: (newLeads) => { leads = newLeads; },
  setScoringResults: (newResults) => { scoringResults = newResults; },
  getOffers: () => offers,
  getLeads: () => leads,
  getScoringResults: () => scoringResults
};