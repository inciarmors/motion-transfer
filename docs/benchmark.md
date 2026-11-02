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
