# Article verification

Audit of the 26 records in the application archive. Checked on 4 November 2026.

Direct requests to `https://www.piratewires.com/` returned HTTP 429 from the site checkpoint, including the homepage, feed, sitemap, and search. Each record was checked through:

- the publication archive at `https://piratewires.substack.com/api/v1/archive` and the post record at `/api/v1/posts/{slug}`
- site search results for the exact headline, which return the title, month and day, and author
- the article page reached from `https://piratewires.substack.com/p/{slug}`, which redirects to `https://www.piratewires.com/p/{slug}`

The page title and the final URL matched the stored headline and canonical URL for every record below. The stored date is the post date, and the displayed US date matched that date. The stored byline matches the published byline, including the lowercase byline `jane gatsby` and the joint byline `Blake Dodge, Harris Sockel`.

Product topic is an editorial classification used by this application. The publication’s own section was not available as a consistent field, so category is null. Views, engaged time, read-through, distribution, newsletter, and retention figures are illustrative and are not publication measurements.

| Status | Count |
| --- | --- |
| Records audited | 26 |
| VERIFIED | 26 |
| INCORRECT | 0 |
| UNVERIFIED | 0 |
| EXCLUDED in this audit | 0 |
| Publication fields corrected | 0 |

| Title | Author | Date | Topic | Canonical URL |
| --- | --- | --- | --- | --- |
| Republicans Lead Lawsuit Barrage Targeting OpenAI | G. B. Rango | 2026-11-03 | Tech Policy | https://www.piratewires.com/p/republicans-lead-lawsuit-barrage |
| Two Columbia Students Argued Jane Doe May Have Exercised ‘Sexual Freedom.’ The Campus Revolted. | Jonas Du | 2026-10-29 | Culture | https://www.piratewires.com/p/columbia-student-essay-cornell-7-condemned |
| Anduril Unveils American-Made Laptop | Jonas Du | 2026-10-27 | Defense | https://www.piratewires.com/p/why-andurils-new-laptop-matters |
| How Noisy Are America’s Largest Data Centers? | Nic Carter | 2026-10-26 | AI | https://www.piratewires.com/p/how-noisy-are-americas-largest-data |
| The Official Anthem of MeToo’s Revival | Riley Nork | 2026-10-23 | Culture | https://www.piratewires.com/p/the-official-anthem-of-metoos-revival |
| San Francisco’s Hot Girl Bubble | Nicole Wizman | 2026-10-21 | Culture | https://www.piratewires.com/p/san-franciscos-hot-girl-bubble |
| One Man’s Quest to Build a Very Small Data Center on a Remote Plot of Sand | Jonas Du | 2026-10-21 | AI | https://www.piratewires.com/p/colorado-data-centers-david-meyer-strata |
| Did This AI Research Breakthrough Just Avert the Apocalypse? | G. B. Rango | 2026-10-21 | AI | https://www.piratewires.com/p/did-this-ai-research-breakthrough |
| How Wikipedia Buried the Truth About Covid | Ashley Rindsberg | 2026-10-19 | Media | https://www.piratewires.com/p/how-wikipedia-buried-the-truth-about |
| Inside the Strange Intersection of AI Doom, ‘Rationalism,’ and Sexual Transgression | jane gatsby | 2026-10-16 | AI | https://www.piratewires.com/p/inside-the-strange-intersection-of |
| 24 Hours Inside the Adult Toy Store Where Kelly Clarkson Tried to Buy a Fake Bird | Harris Sockel | 2026-10-15 | Culture | https://www.piratewires.com/p/24-hours-inside-the-adult-toy-store |
| How LA Destroyed Its Housing Market — And Sent Young People Packing | Nicole Wizman | 2026-10-14 | Politics | https://www.piratewires.com/p/how-la-destroyed-its-housing-market |
| Arrested OpenAI Engineer Credits Saudi Prince With His Decision to Work in U.S. Tech | Evan Milenko | 2026-10-14 | AI | https://www.piratewires.com/p/arrested-openai-engineer-credits |
| The New American-Greenlandic Forever Pact | G. B. Rango | 2026-10-07 | Politics | https://www.piratewires.com/p/the-new-american-greenlandic-forever |
| Doom Analysis | Mike Solana | 2026-10-06 | AI | https://www.piratewires.com/p/doom-analysis |
| Why AI Keeps Going ‘Rogue’ | Evan Milenko | 2026-10-05 | AI | https://www.piratewires.com/p/why-ai-keeps-going-rogue |
| EXCLUSIVE: Pentagon Taps Elon Musk and Palmer Luckey to Plan Future of War | Ryan Hassan | 2026-09-30 | Defense | https://www.piratewires.com/p/exclusive-pentagon-taps-elon-musk |
| Why I Threw a Pro-Data Center Party | Jonas Du | 2026-09-30 | AI | https://www.piratewires.com/p/why-i-threw-a-pro-data-center-party |
| State Department Enlists Palantir and Anduril to Fight Censorship Abroad | Hunter Ryerson | 2026-09-29 | Tech Policy | https://www.piratewires.com/p/state-department-enlists-palantir |
| Are Guards Abusing Homeless Women in LA Shelters? | Nicole Wizman | 2026-09-28 | Politics | https://www.piratewires.com/p/la-homeless-women-abuse-security-guards |
| EXCLUSIVE: Jacob Coxon Worked With Doomer PR Firm | Hunter Ryerson | 2026-09-24 | AI | https://www.piratewires.com/p/jacob-coxon-worked-with-ai-doomer-firm |
| Here Come AI’s ‘Independent’ Regulators | Brady Dale | 2026-09-24 | Tech Policy | https://www.piratewires.com/p/here-come-ais-independent-regulators |
| Inside Xavier Becerra’s $782 Million Migrant Sleepaway Camp From Hell | Nicole Wizman | 2026-09-21 | Politics | https://www.piratewires.com/p/xavier-becerra-pomona-migrant-children-facilities-waste |
| Was Hugging Face the Beginning of the End — or Just a Really Stupid Experiment? Tech Insiders Debate | Blake Dodge, Harris Sockel | 2026-09-18 | AI | https://www.piratewires.com/p/openai-hugging-face-ai-slowdown-experts-debate |
| How America Learned to Love Nuclear Again | Ryan Hassan | 2026-09-13 | Energy | https://www.piratewires.com/p/how-america-learned-to-love-nuclear |
| How to H-1B American | Mike Solana | 2026-09-09 | Tech Policy | https://www.piratewires.com/p/how-to-h-1b-american |

## Left out of the sample

These titles were seen in the public archive and were not added, because their article pages were not confirmed:

- Former MIT Scientist Wins $6M in Landmark Case Against False Sexual Assault Accusations
- Inside Peter Thiel’s Nashville Antichrist Lectures
- A San Francisco Voter Guide for People Who Aren’t Insane

The earlier fictional 26-record set, including “The Compute Cartel: Who Actually Controls Frontier AI,” is not in this archive. That older set is still what https://piratewiresxyz.vercel.app serves until this branch is promoted.
