# Motion Transfer Studio

A free, independent local workspace for motion transfer with your own API keys. Includes an analysis of the public Genjutsu frontend and a transparent Wan 3.0 harness for comparison with the original service.

The interface takes its cues from early-2000s desktop utilities: heavy beveled window frames, inset controls, monospace readouts, and Matrix-green monitors. The `.exe` titles are visual styling; this is a Node.js web application, not a Windows executable. The interface, messages, and documentation are in English.

**This is not a replica of the Genjutsu model. There is no proof that Genjutsu uses Wan 3.0.** Read the [evidence and limitations](docs/research.md) before interpreting results.

## Quick start

Requires Node.js 22.15+ (Node 24 recommended) and npm.

```sh
npm ci
cp .env.example .env
# Add only the keys for the providers you want to use to .env.
npm start
```

Open **http://127.0.0.1:3210**. The interface and request inspector work without API keys. Generation becomes available when the selected provider is configured. Configured means a key is present; it does not confirm account access or credit balance.

## Engines

| Engine | Configuration | Purpose |
| --- | --- | --- |
| Wan 3.0 direct | `DASHSCOPE_API_KEY`, `ALIBABA_API_BASE` | Raw baseline or original harness; reference video up to 15s. |
| Official Genjutsu | `HF_CREDENTIALS=ID:SECRET` | Public Higgsfield API, 1–8 reference images. |
| Kling 2.6 Pro | `FAL_KEY` | Motion control with one reference image. |
| Wan Animate Move / Replace | `FAL_KEY` | Character animation or replacement. |
| Your own API | `CUSTOM_API_URL`, optional `CUSTOM_API_KEY` | [Service contract](docs/custom-provider.md). |

For Alibaba, `ALIBABA_API_BASE` is your workspace HTTPS origin, such as `https://WORKSPACE.eu-central-1.maas.aliyuncs.com`. Use a compatible region, key, and model as described in the [official documentation](https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference). Do not use a generic domain belonging to a different provider.

Cloud inference is billed to your provider account. The software itself requires no subscription. No model weights or local inference engine are included.

## Workflow

1. Choose an engine and enter downloadable HTTPS URLs for your video and image references. For fal engines, you can upload MP4, PNG, JPEG, or WebP files directly; these files are transferred to fal. For other engines, use your own storage.
2. Set the actual source duration and output resolution. The app attempts to read video duration in the browser; the provider must still validate remote media.
3. With Wan 3.0, compare the `Baseline` recipe with a harness. **Inspect request** shows the actual prompt before submission.
4. Generate and track the request in the session log. Select a session to view its source and output. Save generated files before provider URLs expire.

The browser polls active jobs while the page is open. Closing it does not cancel work at the provider. History and request IDs persist in `.data/jobs.json`; polling resumes when you reopen the app. Generations are never automatically resubmitted. An ambiguous submission is marked `submission_unknown`: check the provider dashboard before creating another job. Do not run two server processes against the same `.data/` directory.

## Privacy and public source

- Credentials stay on the server in `.env`; no keys are included in browser code.
- The server binds to loopback, checks Host/Origin, and enables no public CORS access. This is a personal local app, not a multiuser service for public Internet deployment.
- `.env`, history, media, logs, HAR files, and captures are excluded from Git. History contains potentially private prompts and URLs; do not share it.
- No proprietary bundles, cookies, session tokens, or Higgsfield media are included.
- Previews load media in your browser. fal uploads use external storage. Anyone holding a signed media URL may be able to access the file.
- `npm run check:public` scans **the Git index**, not just working-tree files. It is a heuristic check and should accompany a review of the diff.

## Verification

```sh
npm run check
npm run check:public
```

Automated tests cover validation, provider mappings, simulated job lifecycles, deduplication, interruption recovery, and HTTP boundaries. **No live generations or visual-equivalence measurements have been performed.** See the [benchmark protocol](docs/benchmark.md).

## Project layout

- `src/domain.js`: capabilities, validation, and original prompt templates.
- `src/providers.js`: HTTP adapters and uploads through the official fal client.
- `src/server.js`, `src/store.js`: local API and persistent job history.
- `public/`: desktop-inspired interface with no frontend framework or build step.
- `docs/research.md`: reproducible evidence, hashes, and offsets in the observed public bundles.

## API contract sources

[Genjutsu API](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/api-reference) · [Wan 3.0 API](https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference) · [Kling on fal](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/motion-control/api) · [Wan Move](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/move/api) · [Wan Replace](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/replace/api) · [fal Queue](https://fal.ai/docs/documentation/model-apis/inference/queue).

Original code is licensed under MIT. Models, APIs, and trademarks retain their respective terms. This project is not affiliated with Higgsfield, Alibaba, Kling, or fal.
