# Testing the Wan 3.0 hypothesis

Status: protocol prepared; **no generation results have been measured**.

Use your own clips and images with permission to share them with each provider. Do not commit media, signed URLs, private prompts, or outputs to the public repository.

## Minimum test set

Use three 6–10-second clips: one person with a fixed camera; one person with camera rotation and occlusion; and two people interacting. A fourth 20–30-second clip can explore Genjutsu, but is outside our Wan 3.0 adapter's limits and is not a direct comparison.

For each clip, keep resolution, creative direction, reference character, and source identical. Use three replicates per condition: 27 generations across 3 clips × 3 conditions × 3 replicates. Agree on a budget before running them; they do not start automatically.

## Conditions

1. Official Genjutsu API with a short creative prompt.
2. Direct Wan 3.0 with the `raw` recipe and the same intent expressed using `Video 1` and `Image 1`.
3. Direct Wan 3.0 with the `motion-transfer` or `character-replace` recipe and the same additional direction.

Save the payload shown by **Inspect request** in a local directory excluded from Git. Do not add visual description, upscaling, or face-swap stages until the baseline has been measured: changing several factors at once prevents attributing improvements to a specific cause.

## Evaluation

Assign random A/B/C labels to outputs before evaluation. Measure these dimensions separately:

- Timing: frame error for recognizable events such as contact, steps, rotation, or gestures, adjusted for FPS.
- Motion: compare trajectories and poses, including detector failures.
- Camera: apparent direction and speed of the background; distinguish these from subject movement.
- Identity: character and wardrobe continuity, especially after occlusion.
- Interactions: contact between hands, objects, and other subjects; correct role assignment.
- Preservation: unwanted changes to the background and other subjects in replacement tasks.
- Duration, audio, cuts, flicker, completion time, and actual cost.

Do not use SSIM/PSNR as the only metric: successful recasting intentionally changes many pixels. Report medians, variation, and individual failures; do not select only the best output. Results may support a practical approximation, but cannot uniquely identify Higgsfield's pipeline.

## Suggested local record

Fields: experiment ID, input file hashes, provider, recipe, prompt hash/version, resolution, duration, request ID, timestamp, cost, output path, timing error, camera score, identity score, interaction score, and notes. Keep this record in the Git-excluded `.data/` directory.

To improve quality, change one component at a time and repeat the set: prompt, image preparation, reference roles, or model. This project does not label its templates “Genjutsu recovered”: they are original implementations requiring evaluation.

## Genjutsu Light follow-up

The [November 3 investigation](genjutsu-light.md) identifies Light as a separate comparison target. Use its official playground/API for this condition; the application's existing Genjutsu selector calls the standard endpoint.

For the initial comparison, replace standard Genjutsu with Light in condition 1, keeping the same three clips, three conditions, and three replicates (27 generations). Including both Genjutsu variants instead yields four conditions and 36 generations. Record the exact endpoint in every result. Obtain a budget before either experiment.

Then run focused experiments separately, with repeat counts and costs agreed in advance:

| Question | Controlled change | Measurement |
| --- | --- | --- |
| Does Light infer the transfer task? | Empty versus explicit prompt; fixed clip and reference. | Motion, identity, background, and camera retention. |
| Does reference order assign roles? | Swap two image references; keep text unchanged. | Which subject or scene follows each image. A change does not by itself reveal internal prompting. |
| Is the first-15-second behavior observable? | Submit a longer source and its precisely trimmed 15-second counterpart to Light. | Output events and timestamps around the boundary; billed input duration. Do not submit the longer source to Wan. |
| Is source audio preserved? | Compare decoded source and output audio after temporal alignment. | Correlation, offset, drift, and content changes. Container hashes can differ after re-encoding. |
| Does prompt rewriting help Wan? | Repeat an identical Wan payload with `prompt_extend` off/on through the direct API. | Quality, latency, and variability. The current app fixes this setting to false. |

Do not add trimming, audio replacement, and prompt changes simultaneously. An improved independent pipeline demonstrates useful behavior; it still cannot establish that Higgsfield uses the same components.
