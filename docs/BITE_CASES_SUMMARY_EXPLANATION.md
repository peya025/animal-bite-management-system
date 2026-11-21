# Bite Cases Summary - Risk Calculation & Demo Guide

## 📊 Purpose of Bite Cases Summary (Easy to Memorize)

**"The Bite Cases Summary helps clinic staff identify HIGH-RISK areas and patients who need URGENT attention using a transparent, evidence-based scoring system."**

### Key Benefits:
1. **Prioritize Resources** - Focus on locations with most severe cases
2. **Prevent Outbreaks** - Identify trends before they become emergencies  
3. **Track Compliance** - Find patients who missed their vaccine doses
4. **Evidence-Based Decisions** - Use data, not guesswork, to allocate staff and vaccines

---

## 🧮 Risk Calculation Method

### **Priority Score Formula (0-100 scale)**

The system calculates a **Composite Priority Score** using 4 weighted factors:

```
Composite Score = (Case Burden × 35%) + (Severity × 35%) + (Overdue × 20%) + (Trend × 10%)
```

### **4 Components Explained:**

#### 1. **Case Burden Score (35% weight)** - Volume of Cases
- **What it measures:** Total bite cases in this location compared to the busiest location
- **Formula:** `(Location Cases ÷ Max Cases Across All Locations) × 100`
- **Example:** 
  - Poblacion has 15 cases
  - Busiest location has 20 cases
  - Score = (15 ÷ 20) × 100 = **75 points**

#### 2. **Exposure Severity Score (35% weight)** - Category III Rate
- **What it measures:** Percentage of severe Category III exposures requiring RIG
- **Formula:** `(Category III Cases ÷ Total Cases) × 100`
- **Example:**
  - Total cases: 15
  - Category III: 9
  - Score = (9 ÷ 15) × 100 = **60 points**

#### 3. **Overdue PEP Score (20% weight)** - Missed Vaccine Doses
- **What it measures:** Percentage of patients who missed scheduled vaccine doses
- **Formula:** `(Overdue Patients ÷ Total Cases) × 100`
- **Example:**
  - Total cases: 15
  - Overdue patients: 3
  - Score = (3 ÷ 15) × 100 = **20 points**

#### 4. **Trend Score (10% weight)** - Period-over-Period Change
- **What it measures:** Whether cases are increasing, decreasing, or stable
- **Formula:**
  - **Stable/Neutral** = 50 points (baseline)
  - **Increasing** = 50 + (change × 15), max 100
  - **Decreasing** = 50 - (change × 15), min 0
  - **New location** = 60 points
- **Example:**
  - Cases increased by +2 from last period
  - Score = 50 + (2 × 15) = **80 points**

---

## 🎯 Priority Level Classification

After calculating the composite score, locations are classified:

| Composite Score | Priority Level | Action Required |
|----------------|----------------|-----------------|
| **70-100** | 🔴 **High Priority** | Immediate review, ensure adequate vaccines, follow up overdue patients |
| **40-69** | 🟡 **Medium Priority** | Continue standard monitoring and routine follow-up |
| **0-39** | 🟢 **Low Priority** | Routine monitoring only |
| **<3 cases** | ⚪ **Limited Data** | Insufficient data, monitor but don't over-prioritize single incidents |

### **Real Calculation Example:**

**Location: Poblacion**
- Total cases: 15 (Max across all locations: 20)
- Category III: 9, Category II: 4, Category I: 2
- Overdue patients: 3
- Trend: Up by +2 cases

**Step-by-step calculation:**
1. Case Burden = (15 ÷ 20) × 100 = **75**
2. Severity = (9 ÷ 15) × 100 = **60**
3. Overdue = (3 ÷ 15) × 100 = **20**
4. Trend = 50 + (2 × 15) = **80**

**Final Score:**
```
(75 × 0.35) + (60 × 0.35) + (20 × 0.20) + (80 × 0.10)
= 26.25 + 21 + 4 + 8
= 59.25 ≈ 59 points
```

**Result:** 🟡 **Medium Priority** - Continue standard monitoring and follow up overdue patients

---

## 📚 Sources & Scientific Basis

### **When Panel Asks: "What are your sources?"**

**Answer confidently:**

*"Our risk calculation is based on established public health surveillance principles and WHO rabies prevention guidelines. The scoring system uses four evidence-based factors:"*

1. **WHO Rabies Prevention Guidelines (2018)**
   - Category III exposures are the most severe and require immediate intervention
   - PEP completion is critical to prevent rabies mortality
   - Reference: [WHO Expert Consultation on Rabies, Third Report](https://www.who.int/publications/i/item/WHO-TRS-1012)

2. **Public Health Surveillance Best Practices**
   - Case volume monitoring to identify outbreak clusters
   - Trend analysis for early detection of epidemiological changes
   - Geographic risk mapping for resource allocation
   - Source: CDC Field Epidemiology Manual

3. **DOH Philippines - Rabies Program**
   - National rabies elimination strategy emphasizes follow-up compliance
   - Risk-based surveillance for targeting interventions
   - Reference: DOH Administrative Order on Rabies Prevention and Control

4. **Composite Risk Scoring Methodology**
   - Multi-factor weighted scoring is standard in epidemiological surveillance
   - Allows transparent, reproducible prioritization decisions
   - Used by CDC, WHO, and other public health agencies

### **Key Points to Emphasize:**

✅ **Transparent** - Every score component is clearly defined and calculated  
✅ **Evidence-Based** - Uses WHO Category system and PEP compliance metrics  
✅ **Actionable** - Directly identifies where staff should focus efforts  
✅ **Adaptable** - Weights can be adjusted based on local context  

---

## 🎤 Demo Script (2-3 minutes)

### **Opening (15 seconds)**
*"Let me show you our Bite Cases Risk Dashboard - this tool helps us identify which areas and patients need urgent attention."*

### **Overview (30 seconds)**
*"At the top, you see our key metrics: total cases, active treatments, high-risk zones, and overdue patients. These update in real-time as we register new cases."*

### **Priority Scoring (45 seconds)**
*"Each location gets a priority score from 0 to 100 based on four factors:"*

1. *"Case volume - how many bites compared to other areas"*
2. *"Severity - percentage of Category III cases needing RIG"*
3. *"Overdue patients - those who missed vaccine doses"*
4. *"Trend - whether cases are increasing or decreasing"*

*"The system calculates: Case Burden 35%, Severity 35%, Overdue 20%, Trend 10%"*

### **Action Items (30 seconds)**
*"High priority locations show in red - these need immediate staff attention. Click any location to see:"*
- *"Exact breakdown of the score"*
- *"List of overdue patients requiring follow-up calls"*
- *"Clinical summary with recommended actions"*

### **Practical Use (30 seconds)**
*"For example, Poblacion shows 59 points - Medium Priority. We have 3 overdue patients here. I can click to see their names and case numbers, then call them directly to schedule their next dose."*

### **Closing (15 seconds)**
*"This system ensures we're making evidence-based decisions about where to deploy vaccines, staff, and awareness campaigns - not just guessing."*

---

## 🧠 Memory Aid (Memorize This!)

**4-Factor Formula (CSOT):**
- **C**ase burden (35%)
- **S**everity Cat III (35%)
- **O**verdue PEP (20%)
- **T**rend (10%)

**3 Priority Levels:**
- **70+** = 🔴 High (act now)
- **40-69** = 🟡 Medium (monitor)
- **0-39** = 🟢 Low (routine)

**Key Message:**
*"We use transparent, WHO-aligned scoring to prioritize resources and prevent rabies deaths through timely PEP completion."*

---

## 📖 Additional Technical Notes

### **Why These Weights?**

- **Case Burden (35%)** - High weight because absolute volume drives resource needs
- **Severity (35%)** - Equal weight because Cat III cases are life-threatening
- **Overdue (20%)** - Lower but significant - these are active failures needing correction
- **Trend (10%)** - Lowest weight - forward-looking but less urgent than current cases

### **Statistical Validity:**

✅ **Bounded Scale** - All scores 0-100 for comparability  
✅ **Composite Method** - Prevents single-factor distortion  
✅ **Limited Data Filter** - Locations with <3 cases flagged to prevent overreaction  
✅ **Transparent** - Staff can see exactly why each location scores as it does  

---

## 📌 Quick Reference Card

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Case Burden** | Location cases ÷ Max cases × 100 | Higher = more volume |
| **Severity** | Cat III ÷ Total × 100 | Higher = more severe |
| **Overdue** | Overdue pts ÷ Total × 100 | Higher = more missed doses |
| **Trend** | 50 + (change × 15) | >50 = increasing |
| **Composite** | Sum of (each × weight) | 0-100 priority score |

**Remember:** The goal is to save lives by ensuring complete PEP delivery and preventing rabies deaths through data-driven resource allocation.
