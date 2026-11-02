# Genjutsu: evidence, hypotheses, and reverse-engineering limits

Analysis dated November 2, 2026. **We have not established that Genjutsu is Wan 3.0, nor recovered its server-side generation pipeline.** This repository implements an independent laboratory; it does not promise a perfect replica.

## Is the harness just a prompt?

A harness can include prompting, model selection, input transformation, temporal segmentation, conditioning, reference management, and postprocessing. Which of these steps Genjutsu performs on its server remains unknown. Treating its HTTP contract as its generation algorithm would lead to a false conclusion.

The traced frontend path does not reveal a secret prompt appended to the user's text. The prompt is normalized and sent to the backend, which may still transform it. The absence of a browser template **does not prove** the absence of server-side prompting.

## Reproducible static observations

Page inspected without signing in: [Genjutsu](https://higgsfield.ai/ai/video?model=genjutsu).

| Evidence | Observation |
| --- | --- |
| Routing | Genjutsu: `hf_mult_motion_control`; Wan: `wan3_0` and `wan3_0_prime`. Distinct identifiers do not rule out a shared backend. |
| Media | `image`, `video`, and `location` roles are sent as asset identifiers. |
| Validation | One 4–30-second video; 1–30 references including at most one location; no duplicate IDs. |
| Scene | `off`, `character`, `video`, and `location`; optional character reference consistent with the mode. |
| Parameters | Resolution, batch size 1–4, aspect ratio, dimensions, folder, and prompt. |
| Normalization | Leading/trailing prompt whitespace is removed; empty becomes null. `scene_mode: video` is omitted by the final serializer. |
| Submission | A shared function constructs POST `/jobs/v2/{jobType}`. It was not called. |
| Restyle | A distinct path uses `preset_id`; this does not identify the rendering model. |

Public sources inspected, **not redistributed**:

- [Core bundle](https://assets.higgsfield.ai/tanstack/assets/187ac5b1-CsNFsHQjAyoxUa1A.js), SHA-256 `d500c41e73f1c3958df75ca2b3356f62ad2a515c1da5d649760fa01da5002137`.
- [State bundle](https://assets.higgsfield.ai/tanstack/assets/187ac5b1-cUratvvlwKoBb8PH.js), SHA-256 `c765adf15d4dc864f495c13fdb373b8afc53484a29429124617f0dc4297c9012`.

Zero-based UTF-8 byte offsets in core: `l$` (builder) 510747; `l0` (serializer) 538110; `h0` (validation) 539444; `d2` (submit) 557938; `o1` (transport) 523200. In state: `_M` (form defaults) 225401. Minified names apply only to these hashes.

## Official API contracts

[Genjutsu Motion Transfer](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/api-reference) exposes `video_url`, `image_urls`, `prompt`, and `resolution`. Its public limit is 1–8 images, unlike the web frontend. Our client uses this documented API; it does not reuse website sessions or private endpoints.

[Wan 3.0 on Alibaba](https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference) accepts reference videos and images with editing instructions. Reference videos total at most 15 seconds; output can reach 30 seconds, with combined input and output constrained to 30 seconds. Instructions can refer to `Video 1` and `Image 1`. Our adapter uses `ratio: adaptive`, `duration: -1`, and disables automatic prompt expansion to make experiments comparable. These settings **were not extracted from Genjutsu**.

The 15/30-second difference weakens the hypothesis of simple, unmodified forwarding to Wan's public API. It does not rule out chunking, different partner APIs, other models, or different commercial limits. It does not establish the underlying architecture.

## Separate hypotheses

| Hypothesis | Status | Further investigation |
| --- | --- | --- |
| Wan 3.0 plus editing instructions | Plausible, unproven | Controlled comparison of raw prompting and a structured prompt. |
| Wan plus preprocessing or multiple passes | Possible | Examine transitions, long-clip continuity, and duration-related behavior. |
| A different or specialized model | Possible | Compare systematic failures, camera preservation, and interactions between multiple subjects. |
| A JavaScript prompt is enough to clone it | Unsupported by the analyzed path | No hidden template was observed in that path. |

Latency, price, visual similarity, or route names alone do not identify a model. Even very similar results do not prove identical weights or pipelines.

## Why REA was not necessary

[REA](https://github.com/morluto/rea) can organize JavaScript inspection, browser observations, and captures. Reading public bundles and tracing them statically was sufficient for this step. REA cannot expose code executed on a remote server. It was not installed, and no user configuration was changed.

## Verification limits

No access to the backend, weights, or internal prompts. No authenticated traffic captures. No live generations or spending. Tests verify software behavior and contracts using simulated responses, not provider account availability or generation quality. Visual equivalence remains to be measured using the [comparison protocol](benchmark.md).
