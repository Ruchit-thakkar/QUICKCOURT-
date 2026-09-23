/**
 * Server-side Gemini API client with deterministic fallback engine
 */

interface GeminiContentPart {
  text: string;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Call Gemini 2.5 Flash API with timeout and error handling
 */
export async function callGemini(
  systemPrompt: string,
  userQuery: string,
  contextStr: string,
  contextObj?: any,
  isOwner: boolean = true
): Promise<{ reply: string; source: "gemini" | "data_engine" }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const promptPayload = `${systemPrompt}

VENUE & BOOKING DATA CONTEXT:
${contextStr}

USER QUESTION:
${userQuery}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000), // 10s timeout
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: promptPayload }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
          },
        }),
      });

      if (res.ok) {
        const data: GeminiResponse = await res.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText && generatedText.trim().length > 0) {
          return { reply: generatedText.trim(), source: "gemini" };
        }
      } else {
        const errText = await res.text();
        console.warn("Gemini API non-200 response:", res.status, errText);
      }
    } catch (err) {
      console.warn("Gemini API call failed or timed out:", err);
    }
  }

  // Fallback to deterministic intelligence engine based on authentic data
  const fallbackReply = generateDataBackedFallback(userQuery, contextObj || {}, isOwner);
  return { reply: fallbackReply, source: "data_engine" };
}

/**
 * Deterministic Data-Backed Intelligence Engine
 * Formats factual responses strictly matching the prompt's required structure:
 * Summary, Data, Insight, Recommendation
 */
function generateDataBackedFallback(
  query: string,
  ctx: any,
  isOwner: boolean
): string {
  const q = query.toLowerCase();

  // OWNER ASSISTANT QUERIES
  if (isOwner) {
    const totalBookings = ctx.totalBookings || 0;
    const totalRevenue = ctx.totalRevenue || 0;
    const occupancyRate = ctx.occupancyRate || 0;
    const peakHours = ctx.peakHours || [];
    const lowDemandHours = ctx.lowDemandHours || [];
    const popularSports = ctx.popularSports || [];
    const popularCourts = ctx.popularCourts || [];
    const cancellationRate = ctx.cancellationRate || 0;
    const businessName = ctx.businessName || "your venue";

    // Condition: 0 bookings or insufficient data
    if (totalBookings === 0) {
      return `### Summary
There isn't enough booking data yet to identify a reliable trend for ${businessName}.

### Data
- Total Bookings Recorded: 0
- Total Revenue: ₹0
- Slot Occupancy: 0%

### Insight
As new matches and court reservations are confirmed on QuickCourt, slot utilization patterns, peak demand hours, and court profitability metrics will automatically calculate.

### Recommendation
Ensure all active sports courts have updated pricing and operating hours configured in Courts & Pricing, and share your venue page to drive initial bookings.`;
    }

    // Query 1: Peak Hours
    if (q.includes("peak") || q.includes("busy") || q.includes("rush")) {
      const topSlot = peakHours[0];
      const slotList = peakHours
        .map((s: any, i: number) => `- Rank #${i + 1}: ${s.slotLabel} (${s.bookingCount} bookings, ${s.percentage}% share)`)
        .join("\n");

      return `### Summary
Your highest booking density is concentrated during ${topSlot ? topSlot.slotLabel : "evening hours"}, capturing the majority of player reservations.

### Data
${slotList || "- No peak slots identified yet."}
- Overall Venue Occupancy: ${occupancyRate}%
- Total Matches in Period: ${totalBookings}

### Insight
Players exhibit strong evening preferences, creating high slot contention and peak capacity utilization during these specific intervals.

### Recommendation
Protect these high-demand slots from scheduled maintenance and consider implementing premium peak-hour rates during ${topSlot ? topSlot.slotLabel : "these slots"}.`;
    }

    // Query 2: Best Performing Court
    if (q.includes("court") || q.includes("perform")) {
      const topCourt = popularCourts[0];
      const courtsList = popularCourts
        .map((c: any) => `- ${c.courtName} (${c.sportName}): ${c.bookingCount} bookings, ₹${c.revenue.toLocaleString("en-IN")} generated`)
        .join("\n");

      return `### Summary
${topCourt ? topCourt.courtName : "Your main court"} is your top performing court, driving the highest volume of reservations and revenue.

### Data
${courtsList}
- Total Revenue from Courts: ₹${totalRevenue.toLocaleString("en-IN")}

### Insight
Demand heavily correlates with court condition, turf quality, and sport popularity among local community players.

### Recommendation
Evaluate court scheduling to ensure secondary courts have competitive rates or flexible slot durations (30 min vs 60 min) to balance footfall across all grounds.`;
    }

    // Query 3: Sport Revenue / Popular Sport
    if (q.includes("sport") || q.includes("cricket") || q.includes("football") || q.includes("earn")) {
      const topSport = popularSports[0];
      const sportsList = popularSports
        .map((s: any) => `- ${s.sportName}: ${s.bookingCount} bookings (${s.percentage}% share) • ₹${s.revenue.toLocaleString("en-IN")}`)
        .join("\n");

      return `### Summary
${topSport ? topSport.sportName : "Cricket"} is your primary sport revenue driver, contributing the greatest share of overall bookings.

### Data
${sportsList}
- Total Valid Revenue: ₹${totalRevenue.toLocaleString("en-IN")}
- Average Booking Value: ₹${ctx.averageBookingValue || 800}

### Insight
Local player demand is heavily centered around ${topSport ? topSport.sportName : "your primary sport"}, creating consistent weekly booking cycles.

### Recommendation
Maintain high pitch quality for ${topSport ? topSport.sportName : "your top sport"} and cross-promote secondary sports with trial match discounts during off-peak windows.`;
    }

    // Query 4: Low Bookings / Weekday Improvement / Low Demand
    if (q.includes("low") || q.includes("improve") || q.includes("weekday") || q.includes("revenue")) {
      const lowSlots = lowDemandHours
        .map((s: any) => `- ${s.slotLabel}: only ${s.bookingCount} match booked`)
        .join("\n");

      return `### Summary
Booking volume shows distinct off-peak valleys, primarily during weekday afternoon timeframes, while overall cancellation rate stands at ${cancellationRate}%.

### Data
- Total Bookings in Period: ${totalBookings}
- Total Revenue Generated: ₹${totalRevenue.toLocaleString("en-IN")}
- Cancellation Rate: ${cancellationRate}%
${lowSlots ? `Lowest Demand Windows:\n${lowSlots}` : ""}

### Insight
Weekday mornings and afternoons naturally face lower recreational traffic due to work/school hours, leaving courts underutilized.

### Recommendation
1. Introduce 15% to 20% off-peak afternoon rates to attract college students and corporate squads.
2. Follow up on cancellations (${cancellationRate}% rate) to capture player feedback or implement advance slot confirmation.`;
    }

    // Default Owner Overview
    return `### Summary
Your venue ${businessName} has generated ₹${totalRevenue.toLocaleString("en-IN")} across ${totalBookings} match reservations with a slot occupancy rate of ${occupancyRate}%.

### Data
- Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}
- Total Matches: ${totalBookings}
- Occupancy Rate: ${occupancyRate}%
- Average Booking Value: ₹${ctx.averageBookingValue || 0}
- Cancellation Rate: ${cancellationRate}%

### Insight
Venue operations show active player engagement. Continuing to analyze peak vs off-peak hours will help unlock additional capacity.

### Recommendation
Review low-demand slots to create targeted promotional rates, and protect high-demand evening slots for consistent revenue generation.`;
  }

  // PLAYER ASSISTANT QUERIES
  const totalMatches = ctx.totalBookings || 0;
  const totalSpent = ctx.totalSpent || 0;
  const favoriteSport = ctx.favoriteSport || "Sports";
  const favoriteVenue = ctx.favoriteVenue?.businessName || "QuickCourt venues";
  const nearbyVenues = ctx.nearbyVenues || [];

  if (q.includes("spend") || q.includes("cost") || q.includes("money")) {
    return `### Your Sports Investment
You have invested **₹${totalSpent.toLocaleString("en-IN")}** across **${totalMatches}** match reservations on QuickCourt.

- All-Time Matches: ${totalMatches} games
- Current Month Spending: ₹${(ctx.thisMonthSpent || totalSpent).toLocaleString("en-IN")}
- Total Venues Explored: ${ctx.uniqueVenuesVisited || 1} facilities`;
  }

  if (q.includes("sport") || q.includes("play")) {
    return `### Your Top Sports
Your most frequently played sport is **${favoriteSport}**.

- Favorite Discipline: ${favoriteSport}
- Total Games Played: ${totalMatches}
- Keep up your playing streak by scheduling your next match!`;
  }

  if (q.includes("venue") || q.includes("ground") || q.includes("near") || q.includes("find")) {
    const list = nearbyVenues
      .slice(0, 3)
      .map((v: any) => `- **${v.businessName}**: ${v.categories?.join(", ") || "Multi-sport"} • Starting at ₹${v.priceFrom || 800}/hr`)
      .join("\n");

    return `### Recommended Venues For You
Based on your sports preferences, here are top sports venues on QuickCourt:

${list || "- Browse our Discover page to view all verified sports grounds near your location."}

You can book directly from the **Discover** tab with instant slot confirmation!`;
  }

  return `### Match Summary
You have played **${totalMatches} matches** on QuickCourt with **₹${totalSpent.toLocaleString("en-IN")}** total investment in fitness.

- Favorite Sport: **${favoriteSport}**
- Top Venue: **${favoriteVenue}**
- Venues Visited: **${ctx.uniqueVenuesVisited || 1} sports arenas**

Ready for your next game? Check out the Discover tab to reserve open slots!`;
}
