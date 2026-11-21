# Kayal Log HTTP API

Use same-origin URLs. POST requests carry JSON. API errors use `{"error":"A message for the user."}`. Inspector writes use the shared PIN in the `x-admin-pin` header. If `adminPinRequired` is false, inspector writes accept requests without the header. Crew select a registered boat. Guests can read public records without signing in.

## Routes

`/api/state` returns at most 100 recent entries. `weeklyEntryCount` counts all projected handovers from Monday midnight in the server's local timezone through now, regardless of that feed limit; corrections do not count as additional handovers.

| Method and path | Caller | Request body | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /api/health` | Anyone | None | 200 `{ok, sarvamKey}` | Common errors below |
| `GET /api/state` | Anyone | None | 200 `{boats, facilities, entries, weeklyEntryCount, reports, chain, overdueDays, adminPinRequired}` | Common errors below |
| **New** `GET /api/events` | Anyone | None | 200 `text/event-stream` with named events | 400 request body. 405 wrong method. |
| `GET /api/boats/:boatId` | Anyone | None | 200 `{boat, entries, facilities}` | 404 unknown boat |
| `POST /api/log` | Crew with a registered boat ID | See crew request below | 200 stored entry or an answer to a waste question | 400 missing or invalid input, media or position. 404 unknown boat. 413 body, recording, photo or text too large. 422 recording too short, no speech, invalid quantity or no waste handover found. 502 language service failed or timed out. |
| **New** `POST /api/log/:entryId/correction` | Crew holding the correction token issued for that entry | `{boatId, quantity, correctionToken}` | 200 `{entry, correction}` | 400 invalid fields or quantity. 403 wrong token. 404 entry missing or belongs to a different boat. 409 entry unavailable for correction or already has the requested amount. |
| `POST /api/speak` | Caller holding a reply ID | `{"replyId":"f20ebf7c-f243-4c0e-badd-3c650648563e"}` | 200 `{audioBase64, mime}` | 400 missing or invalid identifier (use 1–80 ASCII letters, digits, underscores or hyphens). 404 unknown, expired or evicted reply, including an identifier in that syntax that was never issued. 502 language service failed or timed out. |
| **New** `POST /api/signin` | Inspector | `{role:"inspector", pin:"…"}` | 200 `{"ok":true}` | 400 role other than inspector or PIN missing, non-string, or over 64 characters. 401 wrong PIN when enabled. |
| **New** `POST /api/reports` | Anyone | `{photoDataUri, note?, location?, boatId?}` | 201 `{report}` | 400 missing/invalid photo, note, location, or boat ID. 404 unknown boat. 413 photo or request too large. 502 vision service failed or timed out. |
| **New** `POST /api/reports/:reportId/review` | Inspector | `{}` | 200 `{report}` | 400 body other than an empty JSON object. 401 wrong/missing PIN when enabled. 404 unknown report. |
| `POST /api/boats` | Inspector | `{"name":"Example Boat","registration":"SAMPLE-0105"}` | 201 `{boat}` | 400 invalid JSON or missing/invalid name (80 chars) or registration (40 chars). 401 wrong/missing PIN when enabled. 413 body too large. |
| `POST /api/facilities` | Inspector | `{"name":"Example Point","lat":9.5,"lon":76.4,"accepts":["oil"]}` | 201 `{facility}` | 400 invalid location, missing/invalid waste types or missing/invalid name (80 chars). 401 wrong/missing PIN when enabled. |
| `POST /api/facilities/:facilityId/status` | Inspector | `{"open":false}` | 200 `{facility}` | 400 missing or non-boolean `open`. 401 wrong/missing PIN when enabled. 404 unknown collection point. |

Common errors are 400 for malformed paths, GET requests with bodies on API routes, or POST bodies that are empty, invalid JSON or a value other than an object. Unknown GET and POST paths return 404. A wrong method on a known API path returns 405 with `Allow`. Other methods on unknown paths return 405. POST bodies are capped at 12 MiB including base64 and JSON overhead (413), and have 15 seconds to arrive (408). Unexpected server failures return 500. Names and registration numbers are plain text. Each successful log, report, boat or facility creation makes a new record, even when the submission is identical. Only the correction, review and facility-status updates described below support retries without a second change.

The sign-in check returns only `ok`. Keep including `x-admin-pin` on inspector writes. The server also serves HTML for public GETs to `/`, `/crew`, `/dashboard`, and `/boat/:boatId`. The boat page fetches its record separately. `GET /static/:path` serves legacy public assets (for example, `/static/app.css` returns CSS). The Vite build serves generated files from `GET /assets/:file`. The current page embeds its favicon. `GET /favicon.svg` serves a file only if the build supplies one. `GET /uploads/:file` serves uploaded JPEG, PNG or WebP images. For example, `/uploads/<entry-id>.jpg` returns image bytes with `Content-Type: image/jpeg`. Missing files return 404 JSON.

## Records

- **Boat** has string `id`, `name` and `registration`, and `status`. Server-created IDs begin with `b-`. Sample boats have readable IDs.
- **Facility** has string `id`, `name`, nullable strings `operator` and `note`, `accepts` (array of `sewage`, `solid`, or `oil`), numeric `lat` and `lon`, numeric `radiusM`, and boolean `open`. Created facilities begin open with radius 400 m and null operator and note. Server-created IDs begin with `f-`.
- **Entry** has string `id` (UUID), `boatId`, `at` (UTC ISO date), `kind` (`sewage_pumpout`, `solid_waste`, or `engine_oil`), `summaryEn`, nullable strings `quantity` (including units) and `facilityMentioned`, `heard`, nullable `location`, `verification`, nullable `photo`, `source` (`voice`, `text`, or `sample`), and SHA-256 hex strings `prevHash` and `hash`. `facilityMentioned` is what the crew said. `verification.facilityId` is the point matched to the phone.
- **Handover** fields on each entry are `method` (`collection_point`, `suction_truck`, `mobile_pump`, `waste_collector`, or `waste_bin`), `vehicleNumber` (registration, up to 40 characters or null), and `handedTo` (recipient or operator name, up to 100 characters or null). These fields are extracted from text or speech. An absent or unrecognized extracted method falls back to `collection_point`. Older entries read as `collection_point` with both optional values null.
- **Corrected entries** carry `corrected:true`, `correctionId` (UUID), `correctedAt` (UTC ISO date), and the latest `quantity`. An uncorrected entry has `corrected:false`, `correctionId:null`, and `correctedAt:null`. Proof, the recorded wording, and hashes still refer to the original event.
- **Heard** has string `original`, `language` (locale such as `ml-IN`), and `english`. For English typed input, both text fields contain the input.
- **Location** has numeric `lat` and `lon` and `accuracy` (rounded metres or null).
- **Photo** has string `file`, boolean `isReceipt`, and nullable strings `issuer`, `date`, `amount`, and `caption`. Load it from `/uploads/${photo.file}`. A photo can be stored even when it does not add receipt proof.
- **Verification** has `level`, nullable strings `facilityId` and `facilityName`, nullable number `distanceM` (rounded metres), and nullable string `reason`.
- **Boat status** has `state` (`verified`, `declared`, or `overdue`), numeric `overdueDays`, and `lastSewage` and `lastSolid`. Each is null or `{at, daysAgo, level, facilityName}`. `daysAgo` is a whole number. `facilityName` is null if the entry was not verified. `lastSewage` picks the newest verified sewage entry within the window, then the newest declared sewage entry in that window, then the newest sewage entry overall. `lastSolid` is the newest solid waste entry regardless of age. The status is `verified` if there is a location or receipt sewage entry in the window, `declared` if there are only declared sewage entries in the window, and `overdue` otherwise. The default window is 90 days.
- **Chain** has boolean `ok`, numeric `count` (all records in the chain), and `brokenAt` (zero-based insertion index, or null when intact). New entries hash the handover fields, named facility, and photo metadata. Older entries retain their original hashes. The chain does not hash the image bytes.
- **Reply** has string `id` (UUID), `english`, `local`, and `language`. Show `local` beside `english` when they differ.

## Proof

| Level | Meaning | Reason |
| --- | --- | --- |
| `declared` | Crew reported a `collection_point` handover. | `no_location` for no usable location, `no_facility` for no point accepting that waste, `too_far` for a point outside its radius, or `closed` for a closed point within range. |
| `location` | The phone was within the radius of an open collection point accepting the waste type. | `null` |
| `receipt` | Collection point location matched and the photo was recognized as a receipt, bill, token, or certificate. | `null` |
| `declared` | A `suction_truck`, `mobile_pump`, or `waste_collector` handover has no qualifying photo. | `no_fixed_point` |
| `receipt` | A `suction_truck`, `mobile_pump`, or `waste_collector` photo shows a handover receipt, bill, token, certificate, operator slip, or legible registration plate. | `handover_slip` |
| `declared` | Waste went into a public or communal bin. Photos can be saved at this level. | `waste_bin` |

For `collection_point`, proof follows the coordinates and accepted waste type. A different plant named in the text is preserved in `facilityMentioned` and does not override the location match. An open matching point in range wins over a closed point in range. A closed matching point in range wins over points outside their radii. Outside the radii, the nearest open eligible point is preferred, or the nearest eligible point if all are closed. `no_location` and `no_facility` leave the facility fields and distance null. For all other methods the facility fields and distance are null, and supplied GPS is stored in `entry.location`. Every sewage entry contributes to the 90-day status at its earned level.

## Crew log and playback

Send `POST /api/log` with `boatId` and one of these inputs:

- Typed: `{"boatId":"kayal-rani","text":"Septic truck KL-04-AB-1234 took 300 litres.","lat":9.5965,"lon":76.4292,"accuracy":15,"replyLanguage":"en-IN"}`.
- Recorded: replace `text` with `audioBase64` (standard base64, no data URI prefix) and `audioMime` (MediaRecorder MIME type such as `audio/webm;codecs=opus`, `audio/mp4`, or `audio/ogg;codecs=opus`). Also accepted are `audio/wav`, `audio/x-wav`, `audio/mpeg` and `audio/aac`. The default MIME is `audio/webm`. Audio has a 2,000-byte minimum and 6 MiB maximum after decoding. Text is capped at 600 trimmed characters.
- The position fields are optional and at the top level. Send `lat` (−90 to 90) and `lon` (−180 to 180) together as numbers and optional non-negative `accuracy` in metres. `photoBase64` is optional or null and carries raw base64 JPEG bytes up to 3 MiB decoded. The current crew UI resizes photos to a maximum side of 1280 px before converting to JPEG.
- Optional `replyLanguage` controls both written and spoken replies. Accepted values are `auto` (the default), `bn-IN`, `en-IN`, `gu-IN`, `hi-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `od-IN`, `pa-IN`, `ta-IN`, and `te-IN`. Other values return 400. In `auto`, the reply follows `heard.language` when Bulbul v3 supports it and uses `en-IN` otherwise. Typed Latin-script English replies in English by default. For any English reply, `reply.local` equals `reply.english` and reply translation is skipped. Input transcription or translation still follows the input language.

A saved result is `{stored:true, kind, heard, entry, status, reply, correctionToken}`. Retain the private `correctionToken` locally to allow an edit of this specific entry. It is not available from state or boat detail. Example with the entry and status objects abbreviated:

```json
{
  "stored": true,
  "kind": "sewage_pumpout",
  "heard": {
    "original": "Septic truck KL-04-AB-1234 took 300 litres.",
    "language": "en-IN",
    "english": "Septic truck KL-04-AB-1234 took 300 litres."
  },
  "entry": {
    "id": "ee55e0fb-775e-4991-87a5-78b885fb1731",
    "quantity": "300 litres",
    "method": "suction_truck",
    "vehicleNumber": "KL-04-AB-1234",
    "handedTo": null,
    "verification": {"level":"declared","facilityId":null,"facilityName":null,"distanceM":null,"reason":"no_fixed_point"}
  },
  "status": {"state":"declared","overdueDays":90},
  "correctionToken": "c19fe765-4638-44fa-ad84-5e114ac39e90",
  "reply": {
    "id": "f20ebf7c-f243-4c0e-badd-3c650648563e",
    "english": "Saved. Toilet tank emptied by suction truck KL-04-AB-1234.",
    "local": "Saved. Toilet tank emptied by suction truck KL-04-AB-1234.",
    "language": "en-IN"
  }
}
```

With `replyLanguage` omitted and `heard.language` equal to `ta-IN`, a Tamil reply can look like this.

```json
{
  "id": "de63c530-1c4f-4625-95a4-8c22bba32b23",
  "english": "Saved. Toilet tank emptied.",
  "local": "சேமிக்கப்பட்டது. கழிப்பறைத் தொட்டி காலி செய்யப்பட்டது.",
  "language": "ta-IN"
}
```

A question about waste returns 200 `{stored:false, kind:"question", heard, reply}` with open collection points and directions when location was supplied. Unrelated speech or text returns 422 `{error, stored:false, kind:"other", heard, reply}`. The reply asks the crew to describe what they emptied or handed over and where. Both use the same language selection as saved entries. Silence and other 422 errors may have only `error`. If extraction, translation or receipt reading fails or times out, the log returns 502 and saves no entry or receipt.

Play the reply with `POST /api/speak` and `{"replyId":"…"}`. Bulbul v3 generates MP3 in `reply.language` from `reply.local`. A real response starts `{"audioBase64":"//PAxAAAAANIAAAA…","mime":"audio/mpeg"}` (audio truncated). Assign the audio element a URL like `data:${mime};base64,${audioBase64}`. Reply IDs are kept in memory for up to ten minutes, with a 200-reply cache. Audio is generated on demand and cached with the reply.

## Quantity correction (new)

For 30 minutes after saving a log, the client can send `POST /api/log/${entry.id}/correction` with `{"boatId":"kayal-rani","quantity":"8000 litres","correctionToken":"…"}`. Use the token from the crew log response. Send a non-negative number or a string containing a decimal amount with optional comma grouping and optional unit, including Malayalam. The trimmed decimal amount and unit together can be up to 80 characters. Numeric inputs use decimal notation without grouping and have the same limit. `quantity` is returned as a string. The existing unit can be included in that string. Entries created before this feature and sample entries have no token.

The response is `{entry, correction}`. The correction record is `{id, boatId, at, correctsEntryId, quantity, prevHash, hash}` and is appended to the existing hash chain. Resending the latest amount returns that correction again. A different amount appends another correction within the window. State and boat detail show one entry with the latest quantity and correction marker. `chain.count` includes the original and each correction.

Sandbox example, with the entry abbreviated:

```json
{
  "entry": {
    "id": "1269daa7-1cd2-4d05-9d3b-4bb0f8e043ba",
    "quantity": "8000 litres",
    "corrected": true,
    "correctionId": "fbdcd596-e8b8-4f41-abb4-3347f5823978"
  },
  "correction": {
    "id": "fbdcd596-e8b8-4f41-abb4-3347f5823978",
    "boatId": "kayal-rani",
    "at": "2026-11-21T15:19:46.592Z",
    "correctsEntryId": "1269daa7-1cd2-4d05-9d3b-4bb0f8e043ba",
    "quantity": "8000 litres",
    "prevHash": "c9cfa330b766047fbb9822bce5c17e1df68bf871cd2b3d2ad0b28e51d321ef5a",
    "hash": "60fa1c474fc05be8ca9f83381120dd19037f10ec17e47db2a996598ed2f2411e"
  }
}
```

## Tourist reports (new)

Send `POST /api/reports` with the required `photoDataUri` and any of the optional fields:

- `photoDataUri` is a complete standard-base64 image URL, such as `data:image/jpeg;base64,/9j/…`. JPEG, PNG, and WebP are accepted up to 3 MiB decoded. Resize and encode on the client as needed.
- `note` is optional plain text up to 600 trimmed characters. Blank or omitted notes are stored as null.
- `location` is optional and uses `{"lat":9.5223,"lon":76.3536,"accuracy":15}`. Latitude and longitude are required when an object is provided. Accuracy is optional.
- `boatId` is optional. If supplied, it must identify a registered boat.

A report has `id` (UUID), `at` (UTC ISO date), nullable `boatId`, `note`, and `location`, `photo:{file,mime}`, `description` (short English line from the vision model), `plausibleWasteInWater` (boolean model assessment), and `reviewedAt` (UTC ISO date or null). Load the photo from `/uploads/${report.photo.file}`. State returns all reports, newest appended first.

To review, send `POST /api/reports/${report.id}/review` with `{}` and the `x-admin-pin` header. The returned report has `reviewedAt` populated. Repeating the request keeps the original review timestamp. Reports and their review status are claims and have no effect on a boat's proof or status.

Sandbox response for a synthetic test image:

```json
{
  "report": {
    "id": "413137de-c01a-43b9-8bd3-51e2544a00ee",
    "boatId": "kayal-rani",
    "note": "A tourist noticed possible waste near the jetty.",
    "location": {"lat":9.5223,"lon":76.3536,"accuracy":15},
    "at": "2026-11-21T15:23:18.537Z",
    "photo": {"file":"413137de-c01a-43b9-8bd3-51e2544a00ee.jpg","mime":"image/jpeg"},
    "description": "The image shows a solid blue-green gradient background.",
    "plausibleWasteInWater": false,
    "reviewedAt": null
  }
}
```

Reviewing returned the same report fields with `"reviewedAt":"2026-11-21T15:23:18.552Z"`.

## Live events (new)

Connect with `new EventSource('/api/events')`. Listen for the named events below. Read `event.data` as JSON and fetch `GET /api/state` for the updated records. Fetch state when the stream opens, including after reconnects. The stream sends future changes and does not replay missed events.

| Event | `action` | Other fields |
| --- | --- | --- |
| `entry` | `created` | `id` (entry ID), `boatId` |
| `correction` | `corrected` | `id` (correction ID), `entryId` (original entry ID), `boatId` |
| `report` | `created` or `reviewed` | `id` (report ID), `boatId` (string or null) |
| `boat` | `created` | `id` (boat ID) |
| `facility` | `created` or `updated` | `id` (facility ID) |

The stream starts with a `: connected` comment and sends a `: keep-alive` comment every 20 seconds. Events are sent after the write succeeds. Retrying an identical correction or review, setting a facility to its existing status, and asking a waste question produce no event.

Sandbox event:

```text
event: boat
data: {"action":"created","id":"b-544d787c"}
```

## Other response examples

The following values are from the sandbox. Nested records in the state and boat examples are abbreviated. See Records for the full shapes.

- Health returns `{"ok":true,"sarvamKey":true}`. `sarvamKey` indicates whether the service key is configured.
- State returns `{"boats":[{"id":"kayal-rani","name":"Kayal Rani","registration":"SAMPLE-ALP-0101","status":{"state":"verified","overdueDays":90}}],"facilities":[{"id":"kumarakom-stp","name":"Kumarakom STP"}],"entries":[{"id":"c738d7c8-f5b8-4337-a6b0-17b0c9aeb666","boatId":"kayal-rani","kind":"solid_waste","quantity":"4 bags"}],"reports":[],"chain":{"ok":true,"count":4,"brokenAt":null},"overdueDays":90,"adminPinRequired":true}`. The feed is limited to 100 entries, newest appended first.
- Boat detail returns `{"boat":{"id":"kayal-rani","name":"Kayal Rani","registration":"SAMPLE-ALP-0101","status":{"state":"verified","overdueDays":90}},"entries":[{"id":"c738d7c8-f5b8-4337-a6b0-17b0c9aeb666","boatId":"kayal-rani","kind":"solid_waste","quantity":"4 bags"}],"facilities":[{"id":"kumarakom-stp","name":"Kumarakom STP"}]}`. Entries for that boat are newest appended first, with no feed cap.
- Adding a boat returned `{"boat":{"id":"b-e7cd7221","name":"Example Boat","registration":"SAMPLE-0105","status":{"state":"overdue","overdueDays":90,"lastSewage":null,"lastSolid":null}}}`.
- Adding a facility returned `{"facility":{"id":"f-a97ed818","name":"Example Point","operator":null,"accepts":["oil"],"lat":9.5,"lon":76.4,"radiusM":400,"open":true,"note":null}}`.
- Closing that facility returned `{"facility":{"id":"f-a97ed818","name":"Example Point","operator":null,"accepts":["oil"],"lat":9.5,"lon":76.4,"radiusM":400,"open":false,"note":null}}`.
