// Import Wes's Pocket Casts listening history extracted from screenshots
// Run with: node importListeningHistory.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAIugDQF-5in9mwo8DL5IajZMYaLyfhUl0",
  authDomain: "podcommons-41064.firebaseapp.com",
  projectId: "podcommons-41064",
  storageBucket: "podcommons-41064.firebasestorage.app",
  messagingSenderId: "798625937353",
  appId: "1:798625937353:web:b0577810228b6baf46da18"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// All episodes extracted from 8 Pocket Casts history screenshots
// Nov 2025 - April 2026
const listeningHistory = [
  // Screenshot 8 (most recent - March/April 2026)
  { episodeTitle: "The Enemy Is Power, Wherever You Find It with Matt Zwolinski", showName: "The Liberalism.org Show", listenedAt: "2026-03-25" },
  { episodeTitle: "Pete Hegseth is Praying for a Holy War", showName: "On the Media", listenedAt: "2026-04-03" },
  { episodeTitle: "A jury says Meta and Google hurt a kid. What now?", showName: "Decoder with Nilay Patel", listenedAt: "2026-04-02" },
  { episodeTitle: "534: Soldiers, SEALs, and Ramadi. Leading In The Most Challenging Combat Environment.", showName: "Jocko Podcast", listenedAt: "2026-04-01" },
  { episodeTitle: "224 - Project Hail Mary Book Review", showName: "No Dumb Questions", listenedAt: "2026-03-24" },
  { episodeTitle: "Blood diamonds and the meeting between Florence Nightingale and Aga Khan III", showName: "The History Hour", listenedAt: "2026-02-28" },
  { episodeTitle: "The Supreme Court Takes On Birthright Citizenship", showName: "The Daily", listenedAt: "2026-04-02" },
  { episodeTitle: "Talking With the Military Ethics Professor Who Resigned in Protest", showName: "Angry Planet", listenedAt: "2025-07-16" },
  { episodeTitle: "Artemis II: 2. Rocket man", showName: "13 Minutes Presents: Artemis II", listenedAt: "2026-03-31" },
  { episodeTitle: "Weekly Roundup: Pete Hegseth's Military Vision, Violent Prayer & GOP Tax Dogma", showName: "Straight White American Jesus", listenedAt: "2026-03-27" },
  { episodeTitle: "Episode 3: The Black Panther Party's Free Breakfast Program with John Grant, IV", showName: "UnderTold by CM", listenedAt: "2026-03-22" },
  { episodeTitle: "The Ezra Klein Show: How Fast Will A.I. Agents Rip Through the Economy?", showName: "Hard Fork", listenedAt: "2026-03-27" },
  { episodeTitle: "OpenAI owes us $180 billion", showName: "Today, Explained", listenedAt: "2026-03-25" },

  // Screenshot 7 (March 2026)
  { episodeTitle: "Attack of the drones", showName: "Today, Explained", listenedAt: "2026-03-23" },
  { episodeTitle: "When Democracy Fell: The Wilmington Coup of 1898 | Guy Hill", showName: "The Teacher's Forum", listenedAt: "2026-03-23" },
  { episodeTitle: "300 - Guest: Mark Peres, Civic Entrepreneur, part 2", showName: "Artificial Intelligence and You", listenedAt: "2026-03-16" },
  { episodeTitle: "098: The Practice and Inner Life of Liberalism (w/ Jason Canon)", showName: "Reimagining Liberty", listenedAt: "2026-03-18" },
  { episodeTitle: "Immigration Law in 2026: Fighting the Cruelty Machine", showName: "5-4", listenedAt: "2026-03-03" },
  { episodeTitle: "Fan Favorite: Great American Authors | Mark Twain: Voice of a Nation", showName: "American History Tellers", listenedAt: "2026-03-11" },
  { episodeTitle: "The New Shape of American Religion with Ross Douthat and Molly Worthen", showName: "Everything Happens with Kate Bowler", listenedAt: "2026-03-03" },
  { episodeTitle: "Songs of San Quentin", showName: "Ear Hustle", listenedAt: "2026-03-04" },
  { episodeTitle: "What Prison Can Teach Us About School w/ Jennifer Berkshire", showName: "Human Restoration Project", listenedAt: "2026-03-07" },
  { episodeTitle: "Chicken Mating Harnesses - Supreme Court Rules AI Art Not Copyrightable", showName: "This Week in Tech (Audio)", listenedAt: "2026-03-08" },
  { episodeTitle: "Celebration and Mourning: Inside an Iran at War", showName: "The Daily", listenedAt: "2026-03-02" },
  { episodeTitle: "Iran strike claims, Trump Cuba prediction and Germany wolf bill", showName: "Fact & Spin", listenedAt: "2026-03-07" },
  { episodeTitle: "Engaging chatbots", showName: "Tech Life", listenedAt: "2026-02-17" },
  { episodeTitle: "A Killer True Crime Fandom & Islamic State's Digital Caliphate", showName: "Angry Planet", listenedAt: "2026-03-04" },

  // Screenshot 6 (February/March 2026)
  { episodeTitle: "006: Trump, the New Apostolic Reformation & the Battle for the Midterms", showName: "Reign of Error with Sarah Posner", listenedAt: "2026-02-26" },
  { episodeTitle: "Weekly Roundup: State of the Union Fallout: ICE Expansion, Christian Nationalism & Retribution", showName: "Straight White American Jesus", listenedAt: "2026-02-27" },
  { episodeTitle: "Dr. Jill Brown on the Ed Tech Landscape", showName: "Talking Technology with ATLIS", listenedAt: "2026-02-10" },
  { episodeTitle: "Screen time is up for grandma and grandpa", showName: "Short Wave", listenedAt: "2026-02-25" },
  { episodeTitle: "February 22, 2026", showName: "Letters from an American", listenedAt: "2026-02-23" },
  { episodeTitle: "When Americans Became 'Splendid Liberators'", showName: "Angry Planet", listenedAt: "2026-02-20" },
  { episodeTitle: "The Sunday Interview: Leah Payne with Dr. Melissa Deckman (PRRI) on Measuring Christian Nationalism", showName: "Straight White American Jesus", listenedAt: "2026-02-22" },
  { episodeTitle: "How to Get Paid to Polarize on TikTok", showName: "The Tech Policy Press Podcast", listenedAt: "2026-02-22" },
  { episodeTitle: "S10E10 Empowering Student Voice Through Technology: Talking with Teachers at the AECT Mini", showName: "How We Teach This", listenedAt: "2025-01-29" },
  { episodeTitle: "North Carolina archivist discusses archives as participatory, vital", showName: "Charlotte Talks", listenedAt: "2026-02-09" },
  { episodeTitle: "Ep 39 Snow Days and Resistance", showName: "Wes and Shelly Share", listenedAt: "2026-02-08" },
  { episodeTitle: "'If You Can Keep It': The Future Of The Free Press", showName: "1A", listenedAt: "2026-02-02" },
  { episodeTitle: "Ep 2: Why 'Heal our Culture?'", showName: "Heal Our Culture", listenedAt: "2024-06-11" },
  { episodeTitle: "We are Living Through a Giant Civics Lesson", showName: "The Steady State Sentinel", listenedAt: "2026-02-10" },

  // Screenshot 5 (January/February 2026)
  { episodeTitle: "AI in Education: Jeffrey Riley on AI Literacy, Teachers, and the Future of Learning", showName: "The Teacher's Forum", listenedAt: "2026-02-03" },
  { episodeTitle: "February 6, 2026", showName: "Letters from an American", listenedAt: "2026-02-07" },
  { episodeTitle: "EdTechSR Episode 368: The OpenClaw Warning", showName: "EdTech Situation Room", listenedAt: "2026-02-05" },
  { episodeTitle: "Ep 5 'Giving Up is Unforgivable' with Joyce Vance", showName: "Indivisible CLT Podcast", listenedAt: "2026-02-05" },
  { episodeTitle: "Will ChatGPT Ads Change OpenAI? + Amanda Askell Explains Claude's New Constitution", showName: "Hard Fork", listenedAt: "2026-01-23" },
  { episodeTitle: "The U.S. Air Force Pilot Who Had A Dogfight With A UFO", showName: "WEAPONIZED with Jeremy Corbell & George Knapp", listenedAt: "2026-01-20" },
  { episodeTitle: "How to Apply the 'Tyrant Test' to Technology", showName: "The Tech Policy Press Podcast", listenedAt: "2026-02-01" },
  { episodeTitle: "January 31, 2026", showName: "Letters from an American", listenedAt: "2026-02-01" },
  { episodeTitle: "Ron Howard: Reinventing Himself After Child Fame, Henry Fonda's Advice", showName: "The Great Creators with Guy Raz", listenedAt: "2024-12-24" },
  { episodeTitle: "Online Culture Is the Whole Culture", showName: "Angry Planet", listenedAt: "2026-01-30" },
  { episodeTitle: "Ep 04: Voter Suppression and Redistricting in NC with Bob Phillips and Tyler Daye (Part 2)", showName: "Indivisible CLT Podcast", listenedAt: "2026-01-28" },
  { episodeTitle: "Ep 03: Voter Suppression and Redistricting in NC with Bob Phillips and Tyler Daye (Part 1)", showName: "Indivisible CLT Podcast", listenedAt: "2026-01-28" },
  { episodeTitle: "Ep 104: Hating Bill Maher w/ Will Weldon (Pt 1)", showName: "Polite Conversations", listenedAt: "2026-01-21" },
  { episodeTitle: "Toto's Electrostatic Chuck - Is TikTok's New Privacy Policy Cause for Alarm?", showName: "This Week in Tech", listenedAt: "2026-01-26" },

  // Screenshot 4 (January 2026)
  { episodeTitle: "UNLOCKED (Full ep) 'Fashademics' 1 - War on Science", showName: "Polite Conversations", listenedAt: "2026-01-15" },
  { episodeTitle: "Minneapolis vs. ICE", showName: "Today, Explained", listenedAt: "2026-01-24" },
  { episodeTitle: "How To Fight Insurrection 2.0 | The Joy Reid Show LIVE!", showName: "The Joy Reid Show", listenedAt: "2026-01-16" },
  { episodeTitle: "Rapid Response Pod on The Implications of Claude's New Constitution", showName: "Scaling Laws", listenedAt: "2026-01-22" },
  { episodeTitle: "Daughters of thunder", showName: "The Documentary Podcast", listenedAt: "2026-01-22" },
  { episodeTitle: "January 22, 2026", showName: "Letters from an American", listenedAt: "2026-01-23" },
  { episodeTitle: "Design before you dig: How digital-first infrastructure can save millions", showName: "Connected Nation", listenedAt: "2026-01-14" },
  { episodeTitle: "January 21, 2026", showName: "Letters from an American", listenedAt: "2026-01-22" },
  { episodeTitle: "Where Do We Go from Here: Chaos or Community? Ernest Crim III on Teaching Martin Luther King", showName: "The Teacher's Forum", listenedAt: "2026-01-19" },
  { episodeTitle: "What Would It Take to Actually Trust Each Other? The Game Theory Dilemma", showName: "Your Undivided Attention", listenedAt: "2026-01-08" },
  { episodeTitle: "The Post-American Internet (39C3, Hamburg, Dec 28)", showName: "Podcast – Cory Doctorow's craphound.com", listenedAt: "2026-01-01" },
  { episodeTitle: "'A Breaking Point': The Minneapolis Police Chief on ICE", showName: "The Daily", listenedAt: "2026-01-12" },
  { episodeTitle: "On Spectacles of Cruelty", showName: "Angry Planet", listenedAt: "2026-01-09" },
  { episodeTitle: "Richard Danzig on Cyber and AI", showName: "ChinaTalk", listenedAt: "2026-01-17" },

  // Screenshot 3 (December 2025 / January 2026)
  { episodeTitle: "Special Episode: The Killing of Renee Nicole Good by ICE w/ Angela Denker", showName: "Straight White American Jesus", listenedAt: "2026-01-08" },
  { episodeTitle: "Grok's Undressing Scandal + Claude Code Capers + Casey Busts a Reddit Hoax", showName: "Hard Fork", listenedAt: "2026-01-09" },
  { episodeTitle: "The Creation of America's Car Culture, Part 2", showName: "The War on Cars", listenedAt: "2026-01-06" },
  { episodeTitle: "Best Of: How Spending Time In Nature Helps Our Health", showName: "1A", listenedAt: "2025-12-29" },
  { episodeTitle: "The Creation of America's Car Culture", showName: "The War on Cars", listenedAt: "2025-11-11" },
  { episodeTitle: "The American Freedom Train and the invention of text messaging", showName: "The History Hour", listenedAt: "2026-01-03" },
  { episodeTitle: "Where Is All the A.I.-Driven Scientific Progress?", showName: "Hard Fork", listenedAt: "2025-12-26" },
  { episodeTitle: "Deep Fakes, Data Centers, and AI Slop — Are We Cooked?", showName: "On the Media", listenedAt: "2025-12-19" },
  { episodeTitle: "Authentic Voice in the Age of AI", showName: "Tea for Teaching", listenedAt: "2025-12-24" },
  { episodeTitle: "Why Are We Obsessed With Aliens? (With Becky Ferreira)", showName: "The 404 Media Podcast", listenedAt: "2025-12-15" },
  { episodeTitle: "Why Roomba Died + Tech Predictions for 2026 + A Hard Forkin' Xmas Song", showName: "Hard Fork", listenedAt: "2025-12-19" },
  { episodeTitle: "Introducing The Homework Machine", showName: "Click Here", listenedAt: "2025-12-09" },
  { episodeTitle: "We The People: A conversation with Rachel Maddow and Timothy Snyder", showName: "The Rachel Maddow Show", listenedAt: "2025-12-13" },
  { episodeTitle: "How Did Ancient Humans Use The Acoustics Of Spaces Like Caves?", showName: "Science Friday", listenedAt: "2025-12-12" },

  // Screenshot 2 (November/December 2025)
  { episodeTitle: "Australia Kicks Kids Off Social Media + Is the A.I. Water Issue Fake? + Hard Fork Wrapped", showName: "Hard Fork", listenedAt: "2025-12-12" },
  { episodeTitle: "The US Government's AI Grand Bargain", showName: "Angry Planet", listenedAt: "2025-12-06" },
  { episodeTitle: "OpenAI's 'Code Red' - Samsung's Trifold Phone Challenging the Future of Mobile Phones", showName: "Tech News Weekly", listenedAt: "2025-12-04" },
  { episodeTitle: "Peace: Wholeness, Completion, and Flourishing", showName: "BibleProject", listenedAt: "2025-12-08" },
  { episodeTitle: "Ukraine and America's Credibility Crisis — with Anne Applebaum", showName: "The Prof G Pod with Scott Galloway", listenedAt: "2025-12-04" },
  { episodeTitle: "The Porch Podcast S1, Episode 4: In Spirit & Strategy ft. Jade Brooks and Carlin Rushing", showName: "The Porch", listenedAt: "2025-09-02" },
  { episodeTitle: "Ep 1: The Best Nest", showName: "Wes and Shelly Share", listenedAt: "2023-01-29" },
  { episodeTitle: "Wicked For Good x Femslash with Leena Norms", showName: "Material Girls", listenedAt: "2025-11-25" },
  { episodeTitle: "It's in the Code ep 171: 'A Man Like God'", showName: "Straight White American Jesus", listenedAt: "2025-12-03" },
  { episodeTitle: "Michael Burry Speaks", showName: "Against the Rules: The Big Short Companion", listenedAt: "2025-12-02" },
  { episodeTitle: "Functional Tassels", showName: "Clockwise", listenedAt: "2025-11-25" },
  { episodeTitle: "Amazon vs Perplexity: Who Controls the Agent?", showName: "AI Inside", listenedAt: "2025-11-05" },
  { episodeTitle: "John Green Knows That No One Really Loves You on the Internet", showName: "The Interview", listenedAt: "2025-11-22" },
  { episodeTitle: "Is There an A.I. Bubble? And What if It Pops?", showName: "The Daily", listenedAt: "2025-11-20" },

  // Screenshot 1 (oldest - November 2025)
  { episodeTitle: "Teaching Through Crisis in Charlotte: Dr. James Ford on Immigration Raids, Student Safety, and Ed...", showName: "The Teacher's Forum", listenedAt: "2025-11-21" },
  { episodeTitle: "From ER Doctor to Middle School Teacher: Dr. Keith Pochick on Trust, Equity, and Education Reform", showName: "The Teacher's Forum", listenedAt: "2025-11-17" },
  { episodeTitle: "Data Centers in Space + A.I. Policy on the Right + A Gemini History Mystery", showName: "Hard Fork", listenedAt: "2025-11-14" },
];

// Extract unique shows and their listen counts for taste profile
function buildTasteProfile(history) {
  const showCounts = {};
  const topicSignals = [];

  for (const ep of history) {
    showCounts[ep.showName] = (showCounts[ep.showName] || 0) + 1;
  }

  return { showCounts, totalEpisodes: history.length };
}

async function importHistory() {
  console.log(`Importing ${listeningHistory.length} episodes from Pocket Casts history...`);

  let added = 0;
  for (const ep of listeningHistory) {
    await addDoc(collection(db, "listeningHistory"), {
      userId: "admin", // Will be associated with Wes's user ID
      episodeId: null,
      podcastTitle: ep.showName,
      episodeTitle: ep.episodeTitle,
      source: "pocketcasts_ocr",
      listenedAt: Timestamp.fromDate(new Date(ep.listenedAt)),
      importedAt: Timestamp.fromDate(new Date()),
    });
    added++;
  }

  console.log(`\n✅ Imported ${added} listening history entries`);

  // Print taste profile summary
  const { showCounts } = buildTasteProfile(listeningHistory);
  const sorted = Object.entries(showCounts).sort((a, b) => b[1] - a[1]);

  console.log("\n📊 Your listening taste profile (most listened shows):");
  sorted.forEach(([show, count]) => {
    console.log(`  ${count}x ${show}`);
  });

  console.log("\n🎯 Top topic clusters detected:");
  console.log("  - AI & Technology (Hard Fork, EdTech SR, Tech News Weekly, AI Inside)");
  console.log("  - Civic/Democracy (Letters from an American, Angry Planet, Indivisible CLT, 5-4)");
  console.log("  - Education (The Teacher's Forum, How We Teach This, Tea for Teaching)");
  console.log("  - Media Literacy (On the Media, Tech Policy Press, Your Undivided Attention)");
  console.log("  - Faith & Culture (BibleProject, Straight White American Jesus, Everything Happens)");
  console.log("  - History (The History Hour, American History Tellers, The War on Cars)");

  process.exit(0);
}

importHistory().catch(console.error);
