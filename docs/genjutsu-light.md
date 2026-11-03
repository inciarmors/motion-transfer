# Genjutsu Light: public playground investigation

Inspected November 3, 2026. This is a static investigation of public documentation, page configuration, and referenced JavaScript. No generation was submitted, no account was used, and no model identity or visual equivalence was established.

## Findings

The [Light playground](https://open.higgsfield.ai/models/higgsfield/genjutsu-light/motion-transfer/v1.0/playground) is a separate endpoint from [standard Genjutsu](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/playground). Shared branding and request fields do not establish shared weights or processing stages.

The public description says Light processes the first 15 seconds and retains source audio. The pricing explanation counts reference-video seconds plus output seconds, with output rounded up to whole seconds. These are documented behaviors, not behaviors measured in this investigation. How trimming affects billable input seconds still needs confirmation from actual usage records.

### Public input contract

The server-rendered page includes the following schema information:

| Field | Observed contract |
| --- | --- |
| Endpoint | `higgsfield/genjutsu-light/motion-transfer/v1.0` |
| `video_url` | Required URI string; 1–2,083 characters. |
| `image_urls` | Required array of 1–8 URI strings. |
| `prompt` | Optional string, empty by default; at most 10,000 characters. |
| `resolution` | `480p`, `720p`, or `1080p`; default `720p`. |

The UI schema hides a duration control, but the input schema does not define a duration property. This does not expose a hidden duration value. The visible form has one video input, image references, prompt, and quality. The schema allows additional properties; that is not evidence that undocumented controls work.

### What “Copy agent prompt” actually contains

The copy button selects a public `copy_text` action and writes its supplied text to the clipboard. The page embeds that text: model documentation covering the endpoint, credentials, input/output schemas, SDK examples, and polling. It does not contain a motion-transfer system prompt or a sequence of internal generation steps.

The browser reported a successful copy, but the automation clipboard read returned empty. We therefore verified the content through the embedded page data and the button's JavaScript rather than claiming a successful clipboard extraction. The advertised model-specific `llms.txt` link could not be retrieved through the web reader; its availability was not assumed.

### Submission trace

The inspected public code supports this path:

1. Schema-driven controls collect the user's values.
2. The serializer selects declared schema fields, removes empty media values, and normalizes arrays. A generic helper supplies random seeds only when the schema declares a matching seed field; Light's observed schema has none.
3. Submission extensions check required inputs, sign-in, and API credentials, then manage errors, analytics, local state, and polling.
4. The transport serializes the normalized form object into a POST to the model slug.

No Light-specific motion-transfer instruction was appended in this inspected path. No local video trimming or audio remux stage was found in that path. These negative findings are limited to the examined client code: server preprocessing and prompt construction remain opaque.

The page configuration also contains `workflow: null` and an empty `system_name`. These are catalog fields, not a declaration that the backend has no workflow or internal prompt.

## Implications for the Wan 3.0 hypothesis

The [Alibaba API reference](https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference) limits reference videos to 15 seconds total and reports usage as input-video duration plus output-video duration. Both are consistent with Light's description. They make Light a useful comparison target without proving its implementation. Billing conventions can be adopted by unrelated services.

There are still important differences and unknowns:

- Light exposes up to eight images; Wan exposes up to ten.
- Light accepts an empty user prompt. A task-specific default, learned conditioning, model routing, or server-generated instructions could explain useful output without user text. An empty prompt does not identify which mechanism is used.
- Wan's `audio: true` requests an audio track; its documentation does not promise preservation of the input waveform. Light's preservation claim could involve audio processing outside generation.
- Our Wan adapter uses smart duration (`-1`), which does not guarantee frame-for-frame source duration. Exact timing and audio alignment need measurement.
- Neither a model identifier nor a backend template was exposed in the inspected Light configuration.

A candidate independent implementation would measure and trim the source, assign reference roles, compile editing instructions, invoke a video-editing model, and align/remux source audio. This is an engineering hypothesis to test, not a recovered Higgsfield pipeline. Prompt tuning alone would not implement those media-processing steps.

## Documentation inconsistencies

The public API-reference page showed two different integration conventions: a header example using `@higgsfield/client/v2` and `HF_CREDENTIALS`, and generic body text using `@higgsfield-ai/client` with bearer authentication. The embedded agent documentation agrees with the header's key-pair convention. This investigation does not change the application's existing authentication based on the conflicting generic body text.

The related-model table advertises a four-second duration, while the main description discusses processing the first 15 seconds. Do not convert that table value into a fixed four-second output constraint. Likewise, list prices and discounted table prices should not be mixed when estimating experiments.

## Reproducibility

Public assets inspected, not copied into this repository. Hashes are SHA-256 of downloaded bytes; offsets below are zero-based UTF-8 byte positions. Names and offsets apply only to these builds.

| Public asset | SHA-256 | Relevant offsets |
| --- | --- | --- |
| [Copy control](https://open.higgsfield.ai/assets/slug-model-llm-menu-BNqDk4NC.js) | `7b69a143927991e2309683acbbbb57ea091f0077143ed9650f370d26d69a1aa0` | `w`: 5973 |
| [Submission controller](https://open.higgsfield.ai/assets/slug-playground-media-BTwIH9t4.js) | `86414a954fec8ecbc03b1cca02ea640f875bf7385d76f712585aa81059bbb81e` | `st`: 3983; `At`: 6391; `Iw`: 414080; `Lw`: 414129 |
| [Schema field selection](https://open.higgsfield.ai/assets/download-media-NWF0GPSU.js) | `2c9cf4cc2b1c08c41cdf65222a91938c4c3712a6c6bbf5adf82f653916ddd85e` | `D`: 2281 |
| [Seed normalization](https://open.higgsfield.ai/assets/slug-model-provider-DlIYJ7tJ.js) | `76c6bb5931c581158fcbc9deb76b031554df597c2a23dcdf43a0f42cf50d45f0` | `y`: 4024 |

The [API reference](https://open.higgsfield.ai/models/higgsfield/genjutsu-light/motion-transfer/v1.0/api-reference) and playground are live pages and may change. The repository records findings and source locations, not raw HTML, account data, proprietary bundles, or example media.

## Next measurement

Use the [Light comparison protocol](benchmark.md#genjutsu-light-follow-up) to test prompt dependence, reference ordering, trimming, and audio preservation. Light is currently an external benchmark target via its official playground/API; the local app's Genjutsu selector still addresses the standard endpoint. No Light adapter or media preprocessing has been added by this documentation update.
