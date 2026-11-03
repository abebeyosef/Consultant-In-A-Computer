/** The scripted Harbourline workshop (BUILD_PLAN §10). Fictional client, original text. */
export const SAMPLE_SESSION_NAME = "Harbourline AI ideas workshop";

export const SAMPLE_PARAGRAPHS: { at: number; text: string }[] = [
  {
    at: 0,
    text: "Okay, thanks everyone for making the time. The goal today is simple: we've got a long list of AI ideas for Harbourline and we need to leave this room with three we actually pursue this quarter. Let me read back what we collected. Automatic summaries at the top of every article. Auto-tagging the archive so search actually works. A personalised morning newsletter. A model that predicts who's about to cancel their subscription. Audio versions of every article. And a chatbot that answers reader questions from the archive.",
  },
  {
    at: 30,
    text: "Honestly, the summaries feel like the highest value to me, readers keep asking for them. The chatbot sounds great, but I think it's really hard, our archive data is a mess before 2015. Tagging is boring but it's easy, we could do it in a few weeks. The cancellation model is hugely valuable for the commercial team, but I'm not sure we have the data to make it feasible.",
  },
  {
    at: 60,
    text: "Can I raise something before we rank these? None of this goes anywhere without the right people. Priya, our CTO, has to sign off anything that touches the platform, and she's stretched. The newsroom editors are nervous, some of them think summaries will cheapen the journalism, and they're quite vocal. Legal will want to review anything customer-facing. The commercial director is the opposite, she's desperate for the cancellation model and will champion it. And then there's the board, they barely know this project exists, but they control next year's budget.",
  },
  {
    at: 100,
    text: "So we need a plan for who we bring in early and who we just keep updated. The union reps are interested but have no real veto. Our freelance network will hear about it eventually.",
  },
  {
    at: 130,
    text: "Okay, let's pick up audio articles, because that one has a decision attached. We could build our own text-to-speech pipeline, the dev team reckons three months. Or we buy an off-the-shelf voice service, we'd be live in two weeks, but it's about forty thousand a year and we don't control the voices. Or we partner with the podcast network we already work with, they'd produce it and share the ad revenue. Building gives us control and keeps the IP. Buying is fastest. Partnering is cheapest up front, but we'd be tied to them.",
  },
  {
    at: 170,
    text: "My worry with building is we don't have audio engineers. My worry with buying is the cost scales with every article.",
  },
  {
    at: 190,
    text: "Right, let's capture where we've landed and then take a ten-minute break.",
  },
];

export const SAMPLE_FULL_TEXT = SAMPLE_PARAGRAPHS.map((p) => p.text).join("\n\n");

/** Split a paragraph into sentences (keeps punctuation). */
export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}
