# Lead Scoring Backend Service

A production-ready backend service that scores leads based on product/offer context using rule-based logic combined with AI reasoning. Built with Node.js, Express, and Google Gemini AI.

## 🚀 Live Demo

**API Base URL:** `https://your-deployed-url.com` *(will be updated after deployment)*

## 📋 Assignment Overview

This service accepts product/offer information and CSV lead data, then assigns each lead a 0-100 score with intent classification (High/Medium/Low) using:
- **Rule Layer (max 50 points):** Role relevance, industry matching, data completeness
- **AI Layer (max 50 points):** Google Gemini AI analysis with structured XML prompting

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16+
- Google Gemini API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/UjjwalSharma01/Kuvaka_Tech.git
   cd Kuvaka_Tech
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Add your Gemini API key to .env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:3000/health
   ```

## 📚 API Documentation

### Health Check
```bash
GET /health
```
Response:
```json
{
  "status": "OK",
  "timestamp": "2025-09-15T19:30:00.000Z",
  "service": "Lead Scoring Backend"
}
```

### 1. Create Offer
```bash
POST /api/offer
Content-Type: application/json

{
  "name": "AI Outreach Automation",
  "value_props": ["24/7 outreach", "6x more meetings"],
  "ideal_use_cases": ["B2B SaaS mid-market"]
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/offer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Outreach Automation",
    "value_props": ["24/7 outreach", "6x more meetings", "Automated follow-up"],
    "ideal_use_cases": ["B2B SaaS mid-market", "Sales teams 10-50 people"]
  }'
```

### 2. Upload Leads
```bash
POST /api/leads/upload
Content-Type: application/json

{
  "csvData": "name,role,company,industry,location,linkedin_bio\nAva Patel,Head of Growth,FlowMetrics,SaaS,San Francisco,Growth expert..."
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/leads/upload \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": "name,role,company,industry,location,linkedin_bio\nAva Patel,Head of Growth,FlowMetrics,B2B SaaS,San Francisco,Growth expert with 8 years scaling SaaS companies\nJohn Smith,Software Engineer,TechCorp,Technology,New York,Backend developer with 5 years experience"
  }'
```

### 3. Run Scoring
```bash
POST /api/score
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/score
```

### 4. Get Results
```bash
GET /api/results
```

**Example cURL:**
```bash
curl http://localhost:3000/api/results
```

**Sample Response:**
```json
{
  "results": [
    {
      "name": "Ava Patel",
      "role": "Head of Growth",
      "company": "FlowMetrics",
      "intent": "High",
      "score": 100,
      "reasoning": "Decision maker in relevant industry with strong automation focus.",
      "rule_breakdown": {
        "role_score": 20,
        "role_reason": "Decision maker role",
        "industry_score": 20,
        "industry_reason": "Exact ICP match",
        "completeness_score": 10,
        "completeness_reason": "All fields present"
      }
    }
  ],
  "total_scored": 1
}
```

## 🧮 Scoring Algorithm

### Rule Layer (Max 50 Points)

#### Role Relevance (Max 20 Points)
- **Decision Makers (+20):** CEO, CTO, CFO, Founder, Director, Head, Manager, VP
- **Influencers (+10):** Lead, Senior, Specialist, Analyst, Coordinator
- **Others (0):** Individual contributors, unrelated roles

#### Industry Matching (Max 20 Points)
- **Exact ICP Match (+20):** Industry directly matches product's ideal use cases
- **Adjacent Match (+10):** Related industry (tech, software, SaaS, technology, digital)
- **No Match (0):** Unrelated industry

#### Data Completeness (Max 10 Points)
- **Complete Profile (+10):** All required fields present (name, role, company, industry, location, linkedin_bio)
- **Partial Profile (0-9):** Proportional score based on completed fields

### AI Layer (Max 50 Points)

Uses Google Gemini with structured XML prompting for intelligent analysis:

```xml
<task>
You are an expert B2B lead qualification analyst. Analyze the provided lead against the given product/offer and classify their buying intent.
</task>

<context>
<product>
  <name>AI Outreach Automation</name>
  <value_propositions>
    <value_prop>24/7 outreach</value_prop>
    <value_prop>6x more meetings</value_prop>
  </value_propositions>
  <ideal_use_cases>
    <use_case>B2B SaaS mid-market</use_case>
  </ideal_use_cases>
</product>

<lead_profile>
  <name>Ava Patel</name>
  <role>Head of Growth</role>
  <company>FlowMetrics</company>
  <industry>B2B SaaS</industry>
  <location>San Francisco</location>
  <linkedin_bio>Growth expert with 8 years scaling SaaS companies...</linkedin_bio>
</lead_profile>
</context>

<classification_criteria>
<high_intent>Decision maker role, industry match, relevant pain points</high_intent>
<medium_intent>Influencer role, adjacent industry, some relevance</medium_intent>
<low_intent>IC role, unrelated industry, no clear interest</low_intent>
</classification_criteria>
```

**AI Score Mapping:**
- **High Intent:** 50 points
- **Medium Intent:** 30 points  
- **Low Intent:** 10 points

**Final Score = Rule Score + AI Score (0-100)**

## 🏗️ Architecture

```
├── server.js              # Express server setup
├── routes/
│   ├── offers.js          # Offer management endpoints
│   └── leads.js           # Lead upload and scoring endpoints
├── utils/
│   ├── scoring.js         # Rule-based scoring logic
│   ├── gemini.js          # AI integration with XML prompting
│   └── dataStore.js       # In-memory data management
└── package.json           # Dependencies and scripts
```

## 🔧 Error Handling & Resilience

- **AI Fallback:** If Gemini API fails, system uses intelligent rule-based fallback
- **Input Validation:** Comprehensive validation for all endpoints
- **Graceful Degradation:** Service continues working even with partial failures
- **Structured Logging:** Clear error messages and debugging information

## 🧪 Testing Examples

### Complete Workflow Test
```bash
# 1. Create offer
curl -X POST http://localhost:3000/api/offer \
  -H "Content-Type: application/json" \
  -d '{"name":"AI Outreach Automation","value_props":["24/7 outreach","6x more meetings"],"ideal_use_cases":["B2B SaaS mid-market"]}'

# 2. Upload leads
curl -X POST http://localhost:3000/api/leads/upload \
  -H "Content-Type: application/json" \
  -d '{"csvData":"name,role,company,industry,location,linkedin_bio\nAva Patel,Head of Growth,FlowMetrics,B2B SaaS,San Francisco,Growth expert with automation focus"}'

# 3. Run scoring
curl -X POST http://localhost:3000/api/score

# 4. Get results
curl http://localhost:3000/api/results
```

## 🚀 Deployment

*Deployment instructions will be added after selecting cloud platform*

## 📝 Technical Decisions

### Why Minimal Dependencies?
- **Express + CORS + dotenv + @google/generative-ai** only
- Faster startup, smaller footprint
- Built-in CSV parsing using native JavaScript
- No external file upload middleware needed

### Why Gemini AI?
- Free tier available for development
- Excellent prompt following with XML structure
- Reliable JSON response formatting
- Good rate limits for testing

### Why In-Memory Storage?
- Fast development for MVP
- No database setup required
- Easy to migrate to persistent storage later
- Perfect for assignment demonstration

## 🎯 Assignment Completion Status

✅ **Core Requirements:**
- ✅ POST /offer endpoint with validation
- ✅ POST /leads/upload with CSV parsing  
- ✅ Rule-based scoring (50 points max)
- ✅ AI integration with Gemini
- ✅ POST /score and GET /results endpoints
- ✅ Proper error handling and fallbacks
- ✅ Clean code with documentation
- ✅ Structured XML prompting for AI

🔄 **In Progress:**
- 🔄 Deployment to cloud platform
- 🔄 Live API URL

💡 **Bonus Features (Optional):**
- ⏳ CSV export endpoint
- ⏳ Unit tests for rule layer
- ⏳ Docker containerization

---

**Built with ❤️ by Ujjwal Sharma**