/**
 * Publication metadata is taken from the public Pirate Wires archive.
 * Headlines, bylines, dates, canonical URLs and subtitles were checked
 * against piratewires.substack.com archive records and the article pages
 * at www.piratewires.com. Performance figures in this file are synthetic.
 * They stay on demo records and never enter analytical totals.
 */
import { createRandom } from "@/lib/scene/random";
import { CHANNELS, type Article, type Channel, type Topic } from "./types";

interface PublishedArticle {
  headline: string;
  author: string;
  publishedAt: string;
  topic: Topic;
  slug: string;
  subtitle: string;
}

const PUBLISHED: PublishedArticle[] = [
  {
    headline: "Republicans Lead Lawsuit Barrage Targeting OpenAI",
    author: "G. B. Rango",
    publishedAt: "2026-11-03",
    topic: "Tech Policy",
    slug: "republicans-lead-lawsuit-barrage",
    subtitle: "ten pending state lawsuits against openai, nine filed by republican attorneys general, seek measures including state-mandated ai ‘approvals’ and halts on new model development",
  },
  {
    headline: "Two Columbia Students Argued Jane Doe May Have Exercised ‘Sexual Freedom.’ The Campus Revolted.",
    author: "Jonas Du",
    publishedAt: "2026-10-29",
    topic: "Culture",
    slug: "columbia-student-essay-cornell-7-condemned",
    subtitle: "in an op-ed, the students called the cornell 7 hysteria a ‘deeply unproductive’ ‘collective frenzy.’ their classmates responded with a deeply unproductive collective frenzy.",
  },
  {
    headline: "Anduril Unveils American-Made Laptop",
    author: "Jonas Du",
    publishedAt: "2026-10-27",
    topic: "Defense",
    slug: "why-andurils-new-laptop-matters",
    subtitle: "america invented computers, but we can’t build them anymore. anduril and qualcomm are taking the ‘first step’ toward fixing that.",
  },
  {
    headline: "How Noisy Are America’s Largest Data Centers?",
    author: "Nic Carter",
    publishedAt: "2026-10-26",
    topic: "AI",
    slug: "how-noisy-are-americas-largest-data",
    subtitle: "my agents and i mapped noise coming from america’s 25 largest data centers. turns out not all hyperscalers annoy their neighbors, and this problem is very solvable.",
  },
  {
    headline: "The Official Anthem of MeToo’s Revival",
    author: "Riley Nork",
    publishedAt: "2026-10-23",
    topic: "Culture",
    slug: "the-official-anthem-of-metoos-revival",
    subtitle: "the cornell 7 and lindsay clancy cases have sparked a resurgence of online female empowerment. in paris paloma’s ‘labour,’ these women have found their new slave song",
  },
  {
    headline: "San Francisco’s Hot Girl Bubble",
    author: "Nicole Wizman",
    publishedAt: "2026-10-21",
    topic: "Culture",
    slug: "san-franciscos-hot-girl-bubble",
    subtitle: "gorgeous women are flocking to sf. should we be worried about the economy?",
  },
  {
    headline: "One Man’s Quest to Build a Very Small Data Center on a Remote Plot of Sand",
    author: "Jonas Du",
    publishedAt: "2026-10-21",
    topic: "AI",
    slug: "colorado-data-centers-david-meyer-strata",
    subtitle: "we joined a data center founder's 'listening tour' through rural colorado. it went very badly and also very well.",
  },
  {
    headline: "Did This AI Research Breakthrough Just Avert the Apocalypse?",
    author: "G. B. Rango",
    publishedAt: "2026-10-21",
    topic: "AI",
    slug: "did-this-ai-research-breakthrough",
    subtitle: "breaking down former openai researcher nick cammarata’s new ‘interpretability’ findings on how ai models reason, and the debate over whether understanding ai will help us control it",
  },
  {
    headline: "How Wikipedia Buried the Truth About Covid",
    author: "Ashley Rindsberg",
    publishedAt: "2026-10-19",
    topic: "Media",
    slug: "how-wikipedia-buried-the-truth-about",
    subtitle: "inside wikipedia’s six-year editorial battle to frame lab leak as a partisan ‘conspiracy,’ and to manufacture consensus about one of the most important scientific questions of our time",
  },
  {
    headline: "Inside the Strange Intersection of AI Doom, ‘Rationalism,’ and Sexual Transgression",
    author: "jane gatsby",
    publishedAt: "2026-10-16",
    topic: "AI",
    slug: "inside-the-strange-intersection-of",
    subtitle: "a small group of people in the bay area believe ai will soon kill everyone. they are also having a bunch of rape-y orgies. what might explain this? an earnest philosophical inquiry",
  },
  {
    headline: "24 Hours Inside the Adult Toy Store Where Kelly Clarkson Tried to Buy a Fake Bird",
    author: "Harris Sockel",
    publishedAt: "2026-10-15",
    topic: "Culture",
    slug: "24-hours-inside-the-adult-toy-store",
    subtitle: "the shop says kelly clarkson has put them ‘in danger,’ but everything seems pretty relaxed inside (except for all the high-strung journalists)",
  },
  {
    headline: "How LA Destroyed Its Housing Market — And Sent Young People Packing",
    author: "Nicole Wizman",
    publishedAt: "2026-10-14",
    topic: "Politics",
    slug: "how-la-destroyed-its-housing-market",
    subtitle: "los angeles keeps making it harder to build, buy, and stay, as its “mansion tax” and other restrictions fuel a massive exodus.",
  },
  {
    headline: "Arrested OpenAI Engineer Credits Saudi Prince With His Decision to Work in U.S. Tech",
    author: "Evan Milenko",
    publishedAt: "2026-10-14",
    topic: "AI",
    slug: "arrested-openai-engineer-credits",
    subtitle: "the saudi national’s motive is unknown, but in a podcast released less than a month ago he says: “you learn from the source, then bring that expertise and knowledge back home, God willing.”",
  },
  {
    headline: "The New American-Greenlandic Forever Pact",
    author: "G. B. Rango",
    publishedAt: "2026-10-07",
    topic: "Politics",
    slug: "the-new-american-greenlandic-forever",
    subtitle: "a new deal between denmark, the u.s., and greenland expands american military access, restricts chinese and russian influence, and sets the stage for a new world order",
  },
  {
    headline: "Doom Analysis",
    author: "Mike Solana",
    publishedAt: "2026-10-06",
    topic: "AI",
    slug: "doom-analysis",
    subtitle: "pirate wires #164 // if we keep building artificial intelligence, are you, and everyone you know and love, going to die?",
  },
  {
    headline: "Why AI Keeps Going ‘Rogue’",
    author: "Evan Milenko",
    publishedAt: "2026-10-05",
    topic: "AI",
    slug: "why-ai-keeps-going-rogue",
    subtitle: "agents are breaking containment and hacking government websites because they’re following our prompts too literally",
  },
  {
    headline: "EXCLUSIVE: Pentagon Taps Elon Musk and Palmer Luckey to Plan Future of War",
    author: "Ryan Hassan",
    publishedAt: "2026-09-30",
    topic: "Defense",
    slug: "exclusive-pentagon-taps-elon-musk",
    subtitle: "‘project meridian’ will reimagine the american military for the year 2100. musk, luckey, and their teams will deliver a report to the public within 120 days.",
  },
  {
    headline: "Why I Threw a Pro-Data Center Party",
    author: "Jonas Du",
    publishedAt: "2026-09-30",
    topic: "AI",
    slug: "why-i-threw-a-pro-data-center-party",
    subtitle: "amid rampant data center derangement syndrome, I wanted to throw a house party to celebrate american innovation. then it went viral.",
  },
  {
    headline: "State Department Enlists Palantir and Anduril to Fight Censorship Abroad",
    author: "Hunter Ryerson",
    publishedAt: "2026-09-29",
    topic: "Tech Policy",
    slug: "state-department-enlists-palantir",
    subtitle: "the admin’s new ‘freedom tech excellence program’ recruits tech workers to fight draconian online censorship in the u.s. and around the world. here’s how it works",
  },
  {
    headline: "Are Guards Abusing Homeless Women in LA Shelters?",
    author: "Nicole Wizman",
    publishedAt: "2026-09-28",
    topic: "Politics",
    slug: "la-homeless-women-abuse-security-guards",
    subtitle: "abuse appears to be rampant in la homeless facilities. but a shadow cabal of third-party ‘contractors’ protects the uniparty from scrutiny",
  },
  {
    headline: "EXCLUSIVE: Jacob Coxon Worked With Doomer PR Firm",
    author: "Hunter Ryerson",
    publishedAt: "2026-09-24",
    topic: "AI",
    slug: "jacob-coxon-worked-with-ai-doomer-firm",
    subtitle: "the new face of ai safety claimed he worked alone. but the firm representing eliezer yudkowsky is helping him book interviews.",
  },
  {
    headline: "Here Come AI’s ‘Independent’ Regulators",
    author: "Brady Dale",
    publishedAt: "2026-09-24",
    topic: "Tech Policy",
    slug: "here-come-ais-independent-regulators",
    subtitle: "ai companies are hiring contractors to verify their models are safe, and congress may soon require it — but how ‘independent’ (and trustworthy) can a regulator-for-hire really be?",
  },
  {
    headline: "Inside Xavier Becerra’s $782 Million Migrant Sleepaway Camp From Hell",
    author: "Nicole Wizman",
    publishedAt: "2026-09-21",
    topic: "Politics",
    slug: "xavier-becerra-pomona-migrant-children-facilities-waste",
    subtitle: "the california dem candidate for governor once funded a $92,608-per-cot migrant facility that may have sent kids to trafficking rings",
  },
  {
    headline: "Was Hugging Face the Beginning of the End — or Just a Really Stupid Experiment? Tech Insiders Debate",
    author: "Blake Dodge, Harris Sockel",
    publishedAt: "2026-09-18",
    topic: "AI",
    slug: "openai-hugging-face-ai-slowdown-experts-debate",
    subtitle: "openai’s agents hacked a company and lied about it, sure, but their ‘cage’ was made out of thin paper and chewing gum, so are we still all gonna die or what?",
  },
  {
    headline: "How America Learned to Love Nuclear Again",
    author: "Ryan Hassan",
    publishedAt: "2026-09-13",
    topic: "Energy",
    slug: "how-america-learned-to-love-nuclear",
    subtitle: "the untold story of how president trump, energy secretary chris wright, and DOGE turned america’s nuclear power industry back on",
  },
  {
    headline: "How to H-1B American",
    author: "Mike Solana",
    publishedAt: "2026-09-09",
    topic: "Tech Policy",
    slug: "how-to-h-1b-american",
    subtitle: "pirate wires #163 // palmer luckey vs. paul graham on american labor, unpacking the h-1b visa, and how tech stumbled into the red hot center of america’s battle over immigration",
  },
];

/** Per-topic multipliers so the illustrative metrics have a readable shape. */
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

export function buildIllustrativeCorpus(): Article[] {
  const rand = createRandom(4242);
  return PUBLISHED.map((article, i) => {
    const { topic } = article;
    const pull = TOPIC_PULL[topic] * (0.6 + rand() * 0.9);
    const views = Math.round((38000 + rand() * 52000) * pull);
    const engagedSec = Math.round(110 + rand() * 170 + (topic === "AI" ? 35 : 0));
    const completion = Math.min(0.82, 0.28 + rand() * 0.38 + (topic === "AI" ? 0.06 : 0));
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
      headline: article.headline,
      author: article.author,
      publishedAt: article.publishedAt,
      topic,
      url: `https://www.piratewires.com/p/${article.slug}`,
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
      publicationVerified: true,
      sourceName: "Pirate Wires",
      excerpt: article.subtitle,
    };
  });
}

const ARTICLES = buildIllustrativeCorpus();

/** Data access seam: swap for a fetch to your API. */
export function getArticles(): Article[] {
  return ARTICLES;
}

export function getArticle(id: string) {
  return ARTICLES.find((a) => a.id === id);
}
