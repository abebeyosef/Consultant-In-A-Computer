import type { AnyFill, CanvasFill, ChainFill, MatrixFill, TableFill } from "./types";

/* Canned fills for the scripted Harbourline sample (BUILD_PLAN §10). Quotes are verbatim from the script. */

export const SAMPLE_VALUE_FEASIBILITY: MatrixFill = {
  items: [
    { text: "Article summaries", y: 5, x: 4, sourceQuote: "Honestly, the summaries feel like the highest value to me, readers keep asking for them." },
    { text: "Archive auto-tagging", y: 3, x: 5, sourceQuote: "Tagging is boring but it's easy, we could do it in a few weeks." },
    { text: "Personalised newsletter", y: 4, x: 3, sourceQuote: "A personalised morning newsletter." },
    { text: "Cancellation prediction", y: 5, x: 2, sourceQuote: "The cancellation model is hugely valuable for the commercial team, but I'm not sure we have the data to make it feasible." },
    { text: "Audio articles", y: 3, x: 3, sourceQuote: "Audio versions of every article." },
    { text: "Archive chatbot", y: 4, x: 1, sourceQuote: "The chatbot sounds great, but I think it's really hard, our archive data is a mess before 2015." },
  ],
};

export const SAMPLE_STAKEHOLDERS: MatrixFill = {
  items: [
    { text: "Priya, CTO — sign-off", y: 5, x: 4, sourceQuote: "Priya, our CTO, has to sign off anything that touches the platform, and she's stretched." },
    { text: "Commercial director — champion", y: 4, x: 5, sourceQuote: "The commercial director is the opposite, she's desperate for the cancellation model and will champion it." },
    { text: "Newsroom editors — sceptical", y: 3, x: 5, sourceQuote: "The newsroom editors are nervous, some of them think summaries will cheapen the journalism, and they're quite vocal." },
    { text: "Legal — reviews customer-facing", y: 4, x: 2, sourceQuote: "Legal will want to review anything customer-facing." },
    { text: "The board — controls budget", y: 5, x: 1, sourceQuote: "And then there's the board, they barely know this project exists, but they control next year's budget." },
    { text: "Union reps — no veto", y: 1, x: 4, sourceQuote: "The union reps are interested but have no real veto." },
    { text: "Freelance network", y: 1, x: 1, sourceQuote: "Our freelance network will hear about it eventually." },
  ],
};

const Q = {
  build: "We could build our own text-to-speech pipeline, the dev team reckons three months.",
  buy: "Or we buy an off-the-shelf voice service, we'd be live in two weeks, but it's about forty thousand a year and we don't control the voices.",
  partner: "Or we partner with the podcast network we already work with, they'd produce it and share the ad revenue.",
  control: "Building gives us control and keeps the IP.",
  cheapest: "Partnering is cheapest up front, but we'd be tied to them.",
  engineers: "My worry with building is we don't have audio engineers.",
  scales: "My worry with buying is the cost scales with every article.",
  fastest: "Buying is fastest.",
};

export const SAMPLE_BUILD_BUY_PARTNER: TableFill = {
  cells: [
    { row: "Cost", col: "Build", text: "Dev team time", sourceQuote: Q.build },
    { row: "Cost", col: "Buy", text: "~£40k a year, scales per article", sourceQuote: Q.buy },
    { row: "Cost", col: "Partner", text: "Cheapest up front, shared ad revenue", sourceQuote: Q.cheapest },
    { row: "Speed", col: "Build", text: "~3 months", sourceQuote: Q.build },
    { row: "Speed", col: "Buy", text: "Live in 2 weeks", sourceQuote: Q.buy },
    { row: "Speed", col: "Partner", text: "Depends on partner", sourceQuote: Q.partner },
    { row: "Control & IP", col: "Build", text: "Full control, keeps IP", sourceQuote: Q.control },
    { row: "Control & IP", col: "Buy", text: "No control of voices", sourceQuote: Q.buy },
    { row: "Control & IP", col: "Partner", text: "Tied to partner", sourceQuote: Q.cheapest },
    { row: "Risk", col: "Build", text: "No audio engineers", sourceQuote: Q.engineers },
    { row: "Risk", col: "Buy", text: "Cost scales", sourceQuote: Q.scales },
    { row: "Risk", col: "Partner", text: "Dependency", sourceQuote: Q.cheapest },
  ],
};

export const SAMPLE_CANNED_FILLS: Record<string, AnyFill> = {
  "value-feasibility": SAMPLE_VALUE_FEASIBILITY,
  "stakeholder-map": SAMPLE_STAKEHOLDERS,
  "build-buy-partner": SAMPLE_BUILD_BUY_PARTNER,
};

/* Illustrative fills for the library preview (not from any transcript). */
const PREVIEW_FILLS: Record<string, AnyFill> = {
  ...SAMPLE_CANNED_FILLS,
  "impact-effort": {
    items: [
      { text: "Fix broken search filters", x: 2, y: 5 },
      { text: "Rewrite onboarding emails", x: 1, y: 4 },
      { text: "Migrate billing system", x: 5, y: 5 },
      { text: "Rename settings labels", x: 1, y: 2 },
      { text: "Custom report builder", x: 5, y: 2 },
      { text: "Add CSV export", x: 2, y: 4 },
    ],
  } satisfies MatrixFill,
  swot: {
    blocks: {
      strengths: [{ text: "Loyal subscriber base" }, { text: "Deep archive since 1890" }],
      weaknesses: [{ text: "Messy archive data pre-2015" }, { text: "Small data team" }],
      opportunities: [{ text: "Readers want summaries" }, { text: "Audio listening is growing" }],
      threats: [{ text: "Aggregators taking traffic" }],
    },
  } satisfies CanvasFill,
  jtbd: {
    blocks: {
      job: [{ text: "When I commute, I want the news in ten minutes" }],
      functional: [{ text: "Catch up quickly" }],
      emotional: [{ text: "Feel informed, not overwhelmed" }],
      pains: [{ text: "Too many long articles" }],
      gains: [{ text: "A short daily briefing" }],
    },
  } satisfies CanvasFill,
  "customer-journey": {
    columns: ["Discover", "Trial", "Subscribe", "Read"],
    cells: [
      { row: "Actions", col: "Discover", text: "Finds article via social" },
      { row: "Pain points", col: "Trial", text: "Paywall hits too early" },
      { row: "Thoughts & feelings", col: "Subscribe", text: "Is this worth it?" },
      { row: "Opportunities", col: "Read", text: "Personalised digest" },
    ],
  } satisfies TableFill,
  "five-whys": {
    problem: { text: "Weekend newsletter went out late again" },
    whys: [{ text: "Final edit approved after 9am" }, { text: "Editor covers two desks on weekends" }, { text: "Weekend rota was never rebalanced" }],
    rootCause: { text: "Rota designed before the newsletter existed" },
    countermeasure: { text: "Add a dedicated weekend newsletter slot" },
  } satisfies ChainFill,
  "options-appraisal": {
    columns: ["Weekly digest", "Daily digest"],
    cells: [
      { row: "Pros", col: "Weekly digest", text: "Less production effort" },
      { row: "Cons", col: "Weekly digest", text: "Feels stale by Friday" },
      { row: "Pros", col: "Daily digest", text: "Builds a daily habit" },
      { row: "Open questions", col: "Daily digest", text: "Who writes it at 6am?" },
    ],
  } satisfies TableFill,
  "business-model-canvas": {
    blocks: {
      segments: [{ text: "Commuting professionals" }],
      value: [{ text: "Ten-minute audio briefing" }],
      channels: [{ text: "Podcast apps" }],
      revenue: [{ text: "Premium tier upsell" }, { text: "Sponsorship" }],
      partners: [{ text: "Podcast network" }],
      costs: [{ text: "Voice licensing" }],
    },
  } satisfies CanvasFill,
};

export function previewFillFor(frameworkId: string): AnyFill | null {
  return PREVIEW_FILLS[frameworkId] ?? null;
}
