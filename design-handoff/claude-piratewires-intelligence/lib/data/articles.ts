/**
 * DEMO DATA — illustrative sample records only.
 *
 * Headlines, authors, URLs and every metric below are fictional and generated
 * deterministically for interface development. They do not describe real
 * Pirate Wires articles or real performance. Replace `getArticles()` with your
 * CMS / analytics source; the rest of the app only depends on the `Article` type.
 */
import { createRandom } from "@/lib/scene/random";
import { CHANNELS, type Article, type Channel, type Topic } from "./types";

const AUTHORS = ["M. Hale", "R. Okafor", "J. Brennan", "S. Lindqvist", "T. Varga", "E. Castellanos", "D. Achebe"];

const SEED: [string, Topic, string][] = [
  ["The Compute Cartel: Who Actually Controls Frontier AI", "AI", "2026-10-28"],
  ["Inside the Race to Wire Gigawatt Data Centers", "AI", "2026-10-24"],
  ["Capitol Hill Discovers the Data Center Lobby", "Politics", "2026-10-22"],
  ["Open Weights, Closed Doors: The Model Release Fight", "AI", "2026-10-20"],
  ["Nuclear's Comeback Runs Through the Server Farm", "Energy", "2026-10-17"],
  ["AI Agents Are Coming for the Back Office First", "AI", "2026-10-15"],
  ["Section 230's Quiet Rewrite", "Tech Policy", "2026-10-13"],
  ["Silicon Valley's Defense Pivot, One Year In", "Defense", "2026-10-10"],
  ["The State-Level AI Bill Nobody Read", "AI", "2026-10-08"],
  ["Legacy Media's Trust Problem, Quantified", "Media", "2026-10-06"],
  ["Why Every Lab Is Suddenly a Chip Company", "AI", "2026-10-02"],
  ["The Grid Can't Keep Up. Now What?", "Energy", "2026-09-29"],
  ["Drones, Doctrine and the New Procurement Playbook", "Defense", "2026-09-26"],
  ["The Founder Mode Backlash", "Culture", "2026-09-24"],
  ["Benchmarks Are Broken. Here's What Labs Measure Instead", "AI", "2026-09-21"],
  ["The App Store Antitrust Endgame", "Tech Policy", "2026-09-18"],
  ["Stablecoins Go Mainstream, Quietly", "Crypto", "2026-09-15"],
  ["San Francisco's Strange Recovery", "Culture", "2026-09-12"],
  ["The Tech Right, Mapped", "Politics", "2026-09-09"],
  ["Who Pays for AI Safety Research?", "AI", "2026-09-05"],
  ["Substack, X and the Unbundled Newsroom", "Media", "2026-09-02"],
  ["Export Controls and the Chip Smuggling Economy", "Tech Policy", "2026-08-29"],
  ["Small Models, Big Margins", "AI", "2026-08-26"],
  ["The Permitting Bottleneck Behind Every Megaproject", "Energy", "2026-08-22"],
  ["Prediction Markets Go to Washington", "Crypto", "2026-08-19"],
  ["What the Hearings Got Wrong About AI Chips", "AI", "2026-08-15"],
];

/** Per-topic multipliers so the demo set has a believable shape. */
const TOPIC_PULL: Record<Topic, number> = {
  AI: 1.45,
  "Tech Policy": 0.95,
  Defense: 1.05,
  Energy: 0.9,
  Politics: 1.15,
  Media: 0.85,
  Culture: 1.0,
  Crypto: 0.75,
};

const CHANNEL_WEIGHT: Record<Channel, number> = {
  Newsletter: 1,
  X: 0.85,
  LinkedIn: 0.35,
  YouTube: 0.25,
  Podcast: 0.18,
  Reddit: 0.2,
  "Hacker News": 0.22,
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function build(): Article[] {
  const rand = createRandom(4242);
  return SEED.map(([headline, topic, date], i) => {
    const pull = TOPIC_PULL[topic] * (0.6 + rand() * 0.9);
    const views = Math.round((38000 + rand() * 52000) * pull);
    const engagedSec = Math.round(110 + rand() * 170 + (topic === "AI" ? 35 : 0));
    const completion = Math.min(0.82, 0.28 + rand() * 0.38 + (topic === "AI" ? 0.06 : 0));
    // technical AI pieces travel on HN/Reddit; policy on LinkedIn
    const distribution = CHANNELS.map((channel) => {
      let w = CHANNEL_WEIGHT[channel] * (0.5 + rand());
      if (topic === "AI" && (channel === "Hacker News" || channel === "Reddit")) w *= 2.2;
      if (topic === "AI" && channel === "LinkedIn") w *= 0.6;
      if ((topic === "Tech Policy" || topic === "Politics") && channel === "LinkedIn") w *= 1.8;
      const impressions = Math.round(views * 4.2 * w);
      return {
        channel,
        posts: channel === "Newsletter" ? 1 : Math.max(0, Math.round(w * 4)),
        impressions,
        clicks: Math.round(impressions * (0.012 + rand() * 0.03)),
      };
    }).filter((d) => d.posts > 0);
    const peak = views * (0.26 + rand() * 0.12);
    const decay = 0.52 + rand() * 0.2 + (topic === "AI" ? 0.08 : 0);
    const trend = Array.from({ length: 14 }, (_, d) => Math.round(peak * Math.pow(decay, d) * (0.85 + rand() * 0.3)));
    return {
      id: `pw-${String(i + 1).padStart(3, "0")}`,
      headline,
      author: AUTHORS[Math.floor(rand() * AUTHORS.length)],
      publishedAt: date,
      topic,
      url: `https://www.piratewires.com/p/${slug(headline)}`,
      readMinutes: Math.round(6 + rand() * 12),
      metrics: {
        views,
        engagedSec,
        completion,
        shares: Math.round(views * (0.008 + rand() * 0.02) * (topic === "AI" ? 1.3 : 1)),
        comments: Math.round(views * (0.0015 + rand() * 0.004)),
        subsGained: Math.round(views * (0.0025 + rand() * 0.004) * (topic === "AI" ? 1.2 : 1)),
      },
      distribution,
      trend,
      demo: true,
    };
  });
}

const ARTICLES = build();

/** Data access seam: swap for a fetch to your API. */
export function getArticles(): Article[] {
  return ARTICLES;
}

export function getArticle(id: string) {
  return ARTICLES.find((a) => a.id === id);
}
