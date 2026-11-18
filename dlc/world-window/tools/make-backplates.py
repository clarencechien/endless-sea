"""Extend the far side of depth discontinuities for small disocclusions."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

assets = Path(__file__).resolve().parents[1] / 'assets'
for name in ('lake', 'venice', 'meadow', 'coast'):
    photo = Image.open(assets / f'{name}.webp').convert('RGB')
    photo.thumbnail((1536, 768))
    rgb = np.array(photo)
    depth = np.asarray(Image.open(assets / f'{name}-depth.png')
                       .getchannel('G').resize(photo.size), dtype=float)
    # At a silhouette, copy only from the farther side of the edge.
    radius = max(4, photo.width // 70)
    far = ndimage.minimum_filter(depth, size=2 * radius + 1)
    hidden = depth > far + 12
    _, indices = ndimage.distance_transform_edt(hidden, return_indices=True)
    rgb[hidden] = rgb[indices[0][hidden], indices[1][hidden]]
    Image.fromarray(rgb).save(assets / f'{name}-back.webp', quality=88)
