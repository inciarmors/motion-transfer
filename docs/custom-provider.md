# Own API contract

Configure `CUSTOM_API_URL` on the server (for example `http://127.0.0.1:8188/motion`) and optionally `CUSTOM_API_KEY`. HTTP is permitted only on loopback; otherwise use HTTPS. The adapter does not implement ComfyUI's native protocol: a ComfyUI deployment needs a bridge implementing this contract. No self-hosted model is bundled.

`POST {base}/jobs` receives JSON:

```json
{
  "model": "custom",
  "videoUrl": "https://media.example.com/source.mp4",
  "imageUrls": ["https://media.example.com/character.png"],
  "prompt": "Replace the main character.",
  "resolution": "720p",
  "duration": 8,
  "recipe": "raw"
}
```

Respond with `{"id":"your-job-id"}`. IDs must contain only letters, digits, `_` and `-`. Requests carry `Idempotency-Key`; persist it and never create two paid jobs for the same key. If configured, authentication is `Authorization: Bearer <your key>`.

`GET {base}/jobs/{id}` returns one of:

```json
{"status":"queued"}
{"status":"running"}
{"status":"completed","video":{"url":"https://media.example.com/output.mp4"}}
{"status":"failed"}
```

The bridge must expose its outputs as HTTPS URLs for this version of the UI. Validate content, size, duration and remote URL destinations before downloading on the bridge. The studio itself does not fetch user-supplied media URLs; provider services and the browser do. Provider error bodies are not relayed to the UI.

Use this to connect a service you control, including a GPU worker running an appropriately licensed model. API charges can be avoided with your own inference infrastructure, but hardware and electricity still cost money.
