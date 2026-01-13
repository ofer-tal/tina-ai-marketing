// This is the pivot code section to insert into chat.js

  } else if (lastUserMessage.includes("pivot") || lastUserMessage.includes("strategic pivot") || lastUserMessage.includes("change direction") || lastUserMessage.includes("new direction")) {
    // Strategic pivot recommendations
    const data = mockHistoricalData;

    return {
      role: "assistant",
      content: `**🔄 Strategic Pivot Recommendation**

After analyzing your performance data, I recommend a **strategic pivot from paid advertising to organic content-first growth**.

---

**📊 Current Situation Analysis:**

**Paid Ads Performance (What's NOT Working):**
- Total spend: $2,160 across 3 campaigns
- Conversions: Only 13 users acquired
- Cost Per Acquisition (CAC): $400 per user
- ROI: -60% average (losing money on every campaign)

**Organic Content Performance (What IS Working):**
- 10 posts generated ~315,000 views
- Average engagement rate: 4.0%
- Estimated organic CAC: ~$15 per user
- Organic ROI: +280% (content costs vs user value)

**The Pivot Opportunity:**
- **Current mix**: 90% paid, 10% organic → **Result: Losing money, slow growth**
- **Proposed mix**: 10% paid (for testing), 90% organic → **Expected: Profitable, fast growth**

---

**🎯 Recommended Strategic Pivot:**

**FROM:** Paid-First Growth Strategy
- Heavy investment in paid ads
- Reality: Burning $2,160/month for minimal growth

**TO:** Organic Content-First Growth Strategy
- Heavy investment in content creation
- Expected: Scale through viral content and organic reach

---

**📋 Pivot Implementation Plan:**

**Phase 1: Immediate (Week 1) - "Stop the Bleeding"**
- **PAUSE all paid campaigns** immediately
- Reallocate budget to content tools and production

**Phase 2: Build (Weeks 2-4) - "Content Engine"**
- Increase posting: 2 posts/day → 4-5 posts/day
- Content mix: 60% top performers, 30% testing, 10% experimental
- Build content pipeline: 50+ stories queued

**Phase 3: Scale (Month 2) - "Growth Acceleration"**
- Double down on winning content categories
- Test influencer collaborations

**Phase 4: Optimize (Month 3+) - "Profit Machine"**
- Reintroduce paid ads ONLY for retargeting
- Focus on high LTV users

---

**💰 Expected Outcomes (90 Days):**

**Before Pivot (Paid-First):**
- Monthly spend: $3,000
- New users: ~15/month
- CAC: $400
- Profitability: ❌ Negative

**After Pivot (Organic-First):**
- Monthly spend: $1,400
- New users: ~80-120/month
- CAC: ~$15
- Profitability: ✅ Positive

**Key Metrics Improvement:**
- **CAC**: $400 → $15 (96% reduction)
- **Monthly users**: 15 → 80-120 (5-8x increase)
- **Profit margin**: -60% → +85%

---

**⚠️ Risks & Mitigation:**

**Risk 1: Organic reach may decline**
- Mitigation: Diversify platforms (TikTok, Instagram, YouTube Shorts)

**Risk 2: Content production bottleneck**
- Mitigation: Build pipeline and hire freelancer

**Risk 3: Takes longer to see results**
- Mitigation: Run small paid tests for data

---

**🎯 Success Criteria (90 Days):**
- [ ] Posting 4-5 times daily
- [ ] At least 2 posts with >50K views
- [ ] MRR growth of $300-500/month
- [ ] Positive profit margin

---

**💡 My Recommendation:**

**Execute this pivot immediately.** The data shows paid ads are draining capital while organic content generates real growth.

This pivot transforms marketing from:
- ❌ Burning cash, slow growth, negative ROI
- ✅ Positive cash flow, rapid growth, sustainable scalability

**Shall I create action items for this pivot?**`,
      timestamp: new Date().toISOString(),
      pivot: {
        type: "strategic_pivot",
        from: "paid_first_growth",
        to: "organic_content_first_growth",
        reasoning: "Paid campaigns have -60% average ROI with $400 CAC. Organic content generates +280% ROI with ~$15 CAC. Pivot reduces CAC by 96% and increases user acquisition 5-8x.",
        expectedOutcomes: {
          beforePivot: { monthlySpend: 3000, newUsers: 15, cac: 400, profitability: "negative" },
          afterPivot: { monthlySpend: 1400, newUsers: "80-120", cac: 15, profitability: "positive" }
        },
        implementationPhases: [
          { phase: 1, name: "Stop the Bleeding", duration: "Week 1", actions: ["Pause campaigns", "Reallocate budget"] },
          { phase: 2, name: "Content Engine", duration: "Weeks 2-4", actions: ["Increase posts", "Build pipeline"] },
          { phase: 3, name: "Growth Acceleration", duration: "Month 2", actions: ["Double down", "Test influencers"] },
          { phase: 4, name: "Profit Machine", duration: "Month 3+", actions: ["Retargeting ads", "Optimize LTV"] }
        ],
        risks: [
          { risk: "Organic reach decline", mitigation: "Diversify platforms" },
          { risk: "Content bottleneck", mitigation: "Hire freelancer" },
          { risk: "Slower results", mitigation: "Small paid tests" }
        ],
        successCriteria: ["4-5 posts daily", "2+ posts >50K views", "$300-500 MRR growth", "Positive margin"],
        status: "awaiting_approval",
        reviewDate: null
      }
    };
