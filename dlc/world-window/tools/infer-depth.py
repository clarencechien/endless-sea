"""Prepare / infer Depth Anything V2 Small candidates. Never modifies published assets.

Default inference uses the official Small model, safetensors, and a pinned model
snapshot. --prepare-only does not import a model or label any map as AI output.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

import numpy as np
from PIL import Image
from depth_projection import WIDTH, HEIGHT, VFOV, PITCH, rectify, normalize_prediction, pack_depth

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'depth-anything/Depth-Anything-V2-Small-hf'
LICENSE_EVIDENCE = 'https://github.com/DepthAnything/Depth-Anything-V2/blob/a561b849ebae10a6f5ef49e26c83cbbcd36c71bf/README.md#license'


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def load_model(revision, cache):
    # Use standard HTTPS downloads, with the inherited Cloud proxy and CA trust.
    os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
    from huggingface_hub import HfApi, snapshot_download
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    import torch
    revision = revision or HfApi().model_info(MODEL).sha
    if not re.fullmatch(r'[0-9a-f]{40}', revision or ''):
        raise ValueError('A resolved 40-character model commit is required')
    path = Path(snapshot_download(MODEL, revision=revision, cache_dir=str(cache),
                                 allow_patterns=['config.json', 'preprocessor_config.json', 'model.safetensors', 'README.md', 'LICENSE*']))
    config = json.loads((path / 'config.json').read_text())
    if (config.get('model_type') != 'depth_anything'
            or config.get('backbone_config', {}).get('hidden_size') != 384
            or config.get('depth_estimation_type', 'relative') != 'relative'):
        raise ValueError('Only the relative-depth V2 Small configuration is allowed')
    processor = AutoImageProcessor.from_pretrained(path, local_files_only=True, trust_remote_code=False, use_fast=False)
    model = AutoModelForDepthEstimation.from_pretrained(path, local_files_only=True, trust_remote_code=False, use_safetensors=True).eval()
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    return processor, model, {'id': MODEL, 'revision': revision, 'weightsSHA256': sha(path / 'model.safetensors'),
                             'license': 'Apache-2.0', 'licenseEvidence': LICENSE_EVIDENCE,
                             'torch': torch.__version__, 'transformers': __import__('transformers').__version__}


def write_review(output, records, inferred):
    # Keep this developer review local. Image assets retain their source licenses.
    cards = []
    for r in records:
        name = r['id']
        after = f'<img src="{name}-prediction.png" alt="Model relative inverse depth">' if inferred else '<p>Model not run — input preparation only.</p>'
        cards.append(f'<section><h2>{name}</h2><div><figure><img src="{name}-view.webp"><figcaption>Rectified model input</figcaption></figure><figure><img src="{name}-manual-view.png"><figcaption>Existing approximate depth</figcaption></figure><figure>{after}<figcaption>Depth Anything V2 Small candidate</figcaption></figure></div></section>')
    (output / 'review.html').write_text('<!doctype html><meta charset="utf-8"><title>Depth candidate review</title><style>body{font:16px system-ui;background:#ede9df;color:#333;padding:24px}section>div{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0}img{width:100%}figcaption{padding:8px}section{margin-bottom:32px}</style><h1>Offline depth review — not installed</h1><p>Bright = near. Check sky, silhouettes, water and shoreline. The model estimates relative depth, not measured distance.</p>' + ''.join(cards))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path, help='New staging directory, outside published assets')
    parser.add_argument('--scenes', nargs='+', default=['lake'], choices=['lake', 'venice', 'coast', 'meadow'])
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--revision', help='Exact Hugging Face model commit; otherwise resolve once and record it')
    parser.add_argument('--cache', type=Path, default=Path('/workspace/.cache/window-depth'))
    args = parser.parse_args()
    out = args.output.resolve()
    if out.is_relative_to((ROOT / 'assets').resolve()) or out.exists():
        parser.error('Use a new staging directory outside published assets')
    scenes = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
                       "import {scenes} from './dlc/world-window/scenes.js'; console.log(JSON.stringify(scenes))"], cwd=ROOT.parent.parent))
    processor = model = model_info = None
    if not args.prepare_only:
        processor, model, model_info = load_model(args.revision, args.cache)
    out.mkdir(parents=True)
    records = []
    for scene_id in dict.fromkeys(args.scenes):
        scene = next(s for s in scenes if s['id'] == scene_id)
        photo_path, original_path = ROOT / 'assets' / f'{scene_id}.webp', ROOT / 'assets' / f'{scene_id}-depth.png'
        photo, original = Image.open(photo_path).convert('RGB'), Image.open(original_path).convert('RGB')
        view = rectify(photo, scene['position'])
        view.save(out / f'{scene_id}-view.webp', quality=94, method=6)
        rectify(original, scene['position']).getchannel('R').save(out / f'{scene_id}-manual-view.png')
        record = {'id': scene_id, 'center': scene['position'], 'sourcePhotoSHA256': sha(photo_path),
                  'originalDepthSHA256': sha(original_path), 'viewSHA256': sha(out / f'{scene_id}-view.webp'), 'inputRGBSHA256': hashlib.sha256(view.tobytes()).hexdigest()}
        if model is not None:
            import torch
            inputs = processor(images=view, return_tensors='pt')
            with torch.inference_mode():
                result = model(**inputs)
            raw = processor.post_process_depth_estimation(result, target_sizes=[(HEIGHT, WIDTH)])[0]['predicted_depth'].cpu().numpy()
            prediction, percentiles = normalize_prediction(raw)
            packed, coverage = pack_depth(prediction, np.asarray(original), scene['position'])
            Image.fromarray(packed).save(out / f'{scene_id}-depth.png', optimize=True)
            Image.fromarray(np.rint(prediction * 255).astype('uint8')).save(out / f'{scene_id}-prediction.png')
            np.save(out / f'{scene_id}-raw.npy', raw)
            shutil.copyfile(photo_path, out / f'{scene_id}-photo.webp')
            shutil.copyfile(original_path, out / f'{scene_id}-manual.png')
            record.update({'depthSHA256': sha(out / f'{scene_id}-depth.png'), 'percentiles2and98': percentiles,
                           'panoramaInferredCoverage': coverage, 'waterMaskPreserved': bool(np.array_equal(packed[..., 2], np.asarray(original)[..., 2]))})
        records.append(record)
        print(scene_id, 'inferred candidate' if model is not None else 'input prepared', flush=True)
    manifest = {'schema': 1, 'status': 'inferred-needs-review' if model is not None else 'inputs-only-no-model',
                'createdUTC': datetime.now(timezone.utc).isoformat(), 'model': model_info,
                'generatorSHA256': sha(Path(__file__)), 'projectionCodeSHA256': sha(Path(__file__).with_name('depth_projection.py')),
                'projection': {'width': WIDTH, 'height': HEIGHT, 'verticalFOV': VFOV, 'pitchSlope': PITCH},
                'depthMeaning': 'relative inverse depth; higher is nearer; non-metric', 'scenes': records}
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    write_review(out, records, model is not None)
    print('Review candidates at', out, '— published assets were not modified.')


if __name__ == '__main__':
    main()
