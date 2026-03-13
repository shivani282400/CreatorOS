export const buildContentPrompt = (topic: string, platform: string) => {
  return `
You are an elite viral content strategist.

Your job is to create high-engagement social media content.

Topic: ${topic}
Platform: ${platform}

Create content that follows viral frameworks used by creators like MrBeast and Alex Hormozi.

Optimize for:
- high curiosity hooks
- strong emotional triggers
- pattern interrupts
- clear benefit-driven messaging

Hook frameworks to use:

1. Curiosity Gap
   Example: "I tested 10 productivity hacks and only one actually worked."

2. Bold Claim
   Example: "If you're still doing this in 2025, you're wasting your time."

3. Challenge
   Example: "Try this 5-minute morning routine for 7 days."

4. Contrarian
   Example: "Most productivity advice is wrong."

5. Fast Result
   Example: "This simple trick doubled my productivity."

Generate:

1 YouTube script (short, engaging, storytelling)
5 viral hooks using different frameworks
3 social media captions
2 tweet threads

Each hook must be short, punchy, curiosity-driven, and under 20 words.

Return ONLY valid JSON.

Format exactly like this:

{
  "script": "...",
  "hooks": ["...", "...", "...", "...", "..."],
  "captions": ["...", "...", "..."],
  "threads": ["...", "..."]
}

Do not include explanations or markdown.
`;
};
