# Kayal Log: pitch notes

For one presenter, read shortly before going on. Say the plain text. Do not read the `[brackets]`: they name where a fact came from, in case a judge asks. Every Malayalam line in the product has its English meaning beside it, so you never need to read Malayalam.

Before you go on, check that the pages in section 3 exist and work. `PLAN.md` lists the crew page, boat record and dashboard as still being built.

---

## 1. The one-line pitch

**Kayal Log lets a houseboat crew say in Malayalam where they emptied their waste, then checks the phone's location and the receipt, so tourists and inspectors can see a record they can trust.**

Short version, if you get ten seconds: *"A voice logbook that lets Alappuzha houseboats prove where their sewage went."*

---

## 2. The two-minute spoken pitch

About 300 spoken words, which is two minutes at a calm pace.

### The problem

Since 19 April, houseboats without pollution control and valid certification cannot run on Vembanad lake. The High Court ordered it. *[The Hindu / PTI, 17 Apr 2026]*

To renew a licence, a boat must empty its septage at a treatment plant every three months. *[New Indian Express, 16 Oct 2023]*

But only one of the two plants works. *[Down To Earth, 25 May 2026]* And there is no shared record of who emptied what. *[PLAN.md]*

Government estimates count about 700 registered houseboats and 750 unregistered ones. *[Down To Earth, 25 May 2026]* Inspectors check them one at a time. In April, dealing with one boat that had no valid papers took so long that the team could not check the others. *[Onmanorama, 21 Apr 2026]*

### Who it hurts

It hurts the crew. Captains, helpers and cooks earn their living on these boats. *[Down To Earth, 25 May 2026]* Owners say they cannot get a no-pollution certificate, even with their other papers in order, because there are too few plants. *[New Indian Express, 16 Oct 2023]*

It hurts the lake. One researcher says untreated waste has changed the colour of the backwaters. *[Onmanorama, 21 Apr 2026]*

And a tourist has no way to check any of it.

### What Kayal Log does

A crew member says in Malayalam what they emptied and where. The phone checks its location against the known collection points. It reads a photo of the receipt.

Each entry gets a proof level: Declared, Location, or Receipt. Each entry is chained to the one before it, so an edit shows. *[PLAN.md]*

Tourists scan a QR code on the boat and see the record. Inspectors see every boat on one map, most overdue first. Nothing to install. *[PLAN.md]*

### Why now

The court's date has passed and inspections have begun. *[Onmanorama, 21 Apr 2026]* And Malayalam voice is ready: Sarvam's speech model supports Malayalam. *[Sarvam API docs, models page, saved 21 Nov 2026]*

We are on a houseboat right now. Its own crew can use this tonight.

### What is next

Real sign-in: phone OTP for crews, government accounts for inspectors. *[PLAN.md]* A native Malayalam speaker to check every line. *[PLAN.md]*

Kayal Log: a record every boat can show, and every tourist can check.

---

## 3. The 90-second live demo

**Before you go on (30 seconds, no more):**

- The public link is open on the crew's phone, with microphone and location allowed.
- The laptop shows the dashboard, signed in as inspector.
- The boat starts amber (Declared only).
- A Malayalam speaker is standing by to say the line in step 2. Your plan lists this as an open question. If nobody can, play the backup video.
- The phone will be at an open collection point. If it is not, the entry stays at Declared and step 3 cannot reach Receipt. Run steps 1 to 4 once in the room before you go on.
- You know the name of that plant. The crew must say it in step 2, and you close it in step 5.
- The backup video is loaded and ready to play.
- Afterwards, reopen the plant you closed.

| # | Time | What you do | What the audience sees | The one sentence you say |
| --- | --- | --- | --- | --- |
| 1 | 0–15 s | Ask a judge to scan the QR code on the boat. | The boat's public record on their phone, with an amber seal. | "This is the public record for this boat. The seal is amber because the crew has only said it, and nothing confirms it." |
| 2 | 15–40 s | The crew member taps the big button on the crew page and says in Malayalam that they emptied the tank at the plant. | A moving sound wave while recording, then the reply as a conversation, in Malayalam with English beside it. The phone speaks the reply. | "The crew speaks Malayalam, the phone checks where they are, writes it down, and answers in Malayalam." |
| 3 | 40–55 s | The crew member photographs the receipt. | The entry moves up to the Receipt level. | "Now the receipt photo is read, and the entry moves up to the top level." |
| 4 | 55–70 s | Turn to the laptop. | The dashboard updates and the boat turns green. | "The inspector sees it on the map straight away, and the boat turns green." |
| 5 | 70–90 s | On the dashboard, mark the plant closed. The crew logs the same sentence again, naming that plant. | The new entry stays at Declared, with the reason shown. | "A closed plant cannot give a boat a verified entry, and the screen says why." |

### If something fails

| What fails | What you do | What you say |
| --- | --- | --- |
| Network or the public link drops | Try the phone on another phone's hotspot once. If the page still does not load, play the backup video and talk over it with the same five sentences. | "The venue network is unreliable, so here is the recording of the same run." |
| Microphone does not work | Check the browser's microphone permission once. If it still fails, play the backup video. | "The microphone is not cooperating, so here is the recording." |
| Phone location is off or denied | Carry on. This is not a failure. The entry stays at Declared, and the reply tells the crew to turn location on. | "Without location, the entry stays at Declared. That is the design." |
| The reply is slow | Do not tap again. Repeat your step 2 sentence while it works. | "It is hearing the Malayalam and checking the place." |
| No Malayalam speaker | Play the backup video. | "We recorded this earlier with a Malayalam speaker." |

---

## 4. How it works, in proper terms

| Step | What happens | Technical term |
| --- | --- | --- |
| 1. The crew speaks | The crew member's Malayalam voice is turned into text. | Automatic speech recognition (ASR) with Sarvam Saaras v4, which covers 23 languages including Malayalam *[Sarvam API docs, models page, saved 21 Nov 2026]* |
| 2. The sentence is understood | The text becomes fields: what kind of waste, which place, and a short summary. | Structured extraction with Gemma 4 (a language model that returns structured data) |
| 3. The place is checked | The phone's position is compared with the known collection points, and open or closed status is taken into account. | Geofencing with the browser Geolocation API |
| 4. The receipt is read | A photo of the receipt is read by a model that takes text and images. | Document understanding of the photo with Gemma 4, which accepts text and image input *[Sarvam API docs, models page, saved 21 Nov 2026]* |
| 5. A proof level is set | Declared (said only), Location (phone at an open collection point), or Receipt (location matched and photo read). | Tiered verification |
| 6. The entry is stored | Each entry holds a fingerprint of the entry before it, so a later edit breaks the chain and shows. | SHA-256 hash-chained, append-only log (tamper-evident, not tamper-proof) |
| 7. The reply is written in Malayalam | The English reply is translated for the crew. | Sarvam-Translate, which covers English and 22 Indian languages *[Sarvam API docs, models page, saved 21 Nov 2026]* |
| 8. The reply is spoken | The Malayalam reply is read aloud. | Sarvam Bulbul v3 text to speech, which supports Malayalam *[Sarvam API docs, Bulbul page, saved 21 Nov 2026]* |
| 9. Others see the record | Tourists scan a QR code for the boat record. Inspectors see all boats on a map. | Public QR link, plus a map using Leaflet and OpenStreetMap *[PLAN.md]* |

---

## 5. Which track, and how it touches the other two

**We enter Track 01, Place & People.** This is the Alappuzha challenge. The problem is Alappuzha's houseboats and their waste. The users are the crew, tourists and inspectors on that lake. *[PLAN.md]*

- **Track 02, Voice & Language.** The crew speaks Malayalam and hears Malayalam back, all through Sarvam: Saaras v4 for hearing, Sarvam-Translate and Bulbul v3 for replying. A crew member does not need to type or read English. *[PLAN.md]*
- **Track 03, Physical-world computing.** The phone's location and the receipt photo tie each entry to a real place and a real piece of paper. *[PLAN.md]*

We do not know the judging rubric. It is an open question in `PLAN.md`. Do not claim a fit to any scoring.

---

## 6. Ten questions judges are likely to ask

**1. How can it be faked?**
Anyone can say anything, so a spoken entry alone stays at Declared, and location shows only that the phone was at an open plant. A receipt photo can be a wrong or old receipt, because we read it and do not check it against the plant's own records. *[PLAN.md]*

**2. Why would a crew use it?**
Owners told the press they cannot get a no-pollution certificate even with their other papers in order, and that they are routinely fined, with penalties of Rs 70,000. *[New Indian Express, 16 Oct 2023]* One spoken sentence gives them a record they can show, though we have not yet tested whether the authorities will accept it.

**3. Who pays?**
Nobody pays yet and we have not set a price. Operators already pay annual waste fees of Rs 6,000 to Rs 24,000 by boat size, and the tourism council planned a Rs 15 lakh a year contract for dry waste collection, so the money already moves. *[Onmanorama, 3 Nov 2023]*

**4. How does it scale?**
Today it is one small server and one JSON file, which suits a pilot and not the whole lake. *[PLAN.md]* Estimates run from about 1,450 houseboats (700 registered, 750 unregistered) *[Down To Earth, 25 May 2026]* to more than 1,500 operating *[New Indian Express, 9 Nov 2026]*, so the next steps are a real database and real sign-in, and each entry also costs paid Sarvam calls that we have not yet priced.

**5. What happens with no network on the water?**
Today it needs a connection, because the speech and AI services run in the cloud and phones need a public https link for microphone and location. *[PLAN.md]* Saving a note on the phone and sending it at the jetty would be our next step, but it is not built, and whether there is mobile data on the water is an open question in our plan.

**6. Is it a blockchain?**
No. It is a hash-chained, tamper-evident log: each entry stores a SHA-256 fingerprint that includes the entry before it, so changing an old entry breaks every fingerprint after it. *[PLAN.md]* Whoever runs the server could still rewrite the whole chain, so a real version needs the latest fingerprint kept by someone outside our server.

**7. Is the sign-in real?**
No, these are demo sign-ins: crews pick their boat from a list, and the inspector uses a shared PIN. *[PLAN.md]* The real version would use phone OTP for crews and government accounts for inspectors.

**8. Is the Malayalam correct?**
It is unverified, because no native speaker has heard it yet. *[PLAN.md]* Every Malayalam line sits next to its English meaning, and we will fix whatever a speaker finds.

**9. Does anything like this already exist?**
We searched and found no tool made for logging houseboat pump-outs. *[PLAN.md]* We did find general boat logbook apps and a houseboat GPS tracker that watches location and unauthorised movement, but none that records waste disposal. *[SimpliGPS houseboat tracker and boat logbook app results, undated, from our search]*

**10. What happens when a plant is closed?**
The inspector marks it closed on the dashboard, and new entries naming that plant are saved but stay at Declared, with the reason shown. *[PLAN.md]* That makes the shortage visible, since only one of the two plants is reported to work. *[Down To Earth, 25 May 2026]*

---

## 7. What not to claim

**From the plan:**

- **Do not say blockchain.** It is a hash-chained, tamper-evident log.
- **Do not say it measures how much waste was emptied.** It does not measure tank volume. It records what the crew declares.
- **Do not say location proves the tank was emptied.** It proves the phone was there.
- **Do not say the Malayalam is correct.** It is unchecked until a native speaker has heard it.

**Added from the research:**

- **Do not say the sign-in is secure or real.** It is demo sign-in.
- **Do not say a receipt is proof.** The Receipt level means location matched and a receipt photo was read. It is not checked against the plant's records.
- **Do not say offline use works.** It is not built.
- **Do not say the authorities, the Pollution Control Board or Sarvam back this.** Nothing in our sources says so.
- **Do not say it is the only tool.** Say "we found no existing tool for logging houseboat pump-outs."
- **Do not give the boat count as exact.** About 700 registered and 750 unregistered is a government estimate. *[Down To Earth, 25 May 2026]* Another estimate says more than 1,500 operate and about 800 are registered with the Alappuzha port office. *[New Indian Express, 9 Nov 2026]*
- **Do not state the three-month rule as today's law.** It comes from 2023 reporting. *[New Indian Express, 16 Oct 2023]*
- **Do not give a plant count beyond "one of the two."** Reports from 2023 say at least three plants were not working. *[Onmanorama, 3 Nov 2023]*
- **Do not state owners' figures as fact.** The Rs 8,500 tanker cost against Rs 3,500 earlier, and the Rs 70,000 penalties, are what owners told the newspaper. *[New Indian Express, 16 Oct 2023]*
- **Do not say it reduces pollution.** We have no measurement.
- **Do not say the demo works unless you have run it once in the room.** If you have not, say so and play the video.
