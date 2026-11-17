# Depth Anything V2 integration preparation

Status: official V2 Small inference completed for lake, venice, coast and meadow
on 2026-11-17. The reviewed candidate maps are now installed in assets/.
`assets/depth-inference.json` records the immutable model revision, weights SHA-256,
input and output hashes. Weight SHA-256 was checked against official Hugging Face
LFS metadata. All water masks are preserved byte-for-byte. Five projection tests
and the desktop/mobile browser suite using all four candidate maps passed.
Personal photo uploads continue to use approximate depth, with no model download.

Use only `depth-anything/Depth-Anything-V2-Small-hf`. The upstream author identifies
Small as Apache-2.0; Base/Large/Giant have noncommercial model licenses:
https://github.com/DepthAnything/Depth-Anything-V2/blob/a561b849ebae10a6f5ef49e26c83cbbcd36c71bf/README.md#license

## Environment

Use `/workspace/window-depth-venv/bin/python` (CPU PyTorch 2.5.1+cpu,
transformers 4.48.3), with `HF_HOME=/workspace/.cache/huggingface`.
The verified model cache is `/workspace/.cache/window-depth`.
Allow huggingface.co and its weight-download redirect us.aws.cdn.hf.co.
Keep standard HTTPS/proxy verification enabled. No token is required for this
public model. The earlier network blocker has been resolved.

## Prepare and verify inputs without a model

From the repository root:

```sh
/workspace/window-depth-venv/bin/python dlc/world-window/tools/test_depth_projection.py
/workspace/window-depth-venv/bin/python dlc/world-window/tools/infer-depth.py \
  --prepare-only --scenes lake venice coast meadow \
  --output /tmp/window-depth-inputs-new
```

The output directory must be new and outside published assets. `review.html`
shows perspective inputs and current approximate depth. Its manifest explicitly
says `inputs-only-no-model`, with `model: null`.

## Reproduce inference

```sh
/workspace/window-depth-venv/bin/python dlc/world-window/tools/infer-depth.py \
  --scenes lake --output /tmp/window-depth-lake-candidate
```

Start with the native 4K lake. Resolve the official model to an immutable commit,
download only safetensors/config/license files, and record the resolved revision,
weight SHA-256, source-image hashes, tool hashes and inference library versions.
A repeat run can specify `--revision <recorded-40-character-commit>`.
No remote model code is trusted; inference runs on CPU, not in visitors' browsers.
The CPU dependencies and model weights are not part of the Pages artifact.

The 360-degree image is first rectified to a 1008 x 756 view with a 75-degree
vertical field of view. This covers the desktop/mobile camera frusta with margin.
The model's relative inverse depth is normalized, reprojected into the existing
panorama coordinates, and packed into R (soft) / G (sharp). B remains the original
water mask byte-for-byte. Unseen panorama regions retain approximate depth with a
feathered join. These are relative depths, not measured distances.

Outputs are candidates only. The script does not overwrite published assets,
change runtime labels, commit, push or deploy. `manifest.json` says
`inferred-needs-review` only after actual model inference finishes successfully.
Flat or nonfinite model outputs are rejected.

## Acceptance checklist for future regenerations

1. Inspect `review.html`: bright should mean nearer. Check sky, rocks, tree edges,
   buildings and water; reject visibly wrong depth rather than shipping it merely
   because the model ran.
2. Compare manual/model maps using the existing renderer at identical viewport,
   time and small drift. Check whether improved silhouettes outweigh edge tearing.
   The model cannot reconstruct hidden scenery or increase photo resolution.
3. Only after that review, copy candidate depth PNGs to `assets/`. Preserve each
   photo's license (lake adaptations remain CC BY-SA 3.0), and record the model
   provenance in `assets/sources.json`.
4. Update per-scene runtime `depthSource`, the about/credits copy and browser
   assertions to reflect the maps actually installed. Uploaded personal photos
   must continue to be labeled approximate; they do not run inference.
5. Run unit/build/browser checks, including water-mask motion, scene switching,
   mobile layout, 3D room alignment and context-loss fallback. Publish only after
   the real candidate images pass review. Existing main/Pages stays unchanged
   while this preparation branch is pending.
