"""Geometry and packing for offline relative-depth inference, with no model/network IO."""
import numpy as np
from PIL import Image, ImageFilter

WIDTH, HEIGHT, VFOV, PITCH = 1008, 756, 75.0, .025


def sample(image, u, v, wrap=False):
    a = np.asarray(image, dtype=np.float32)
    h, w = a.shape[:2]
    x, y = u * w - .5, np.clip(v * h - .5, 0, h - 1)
    if not wrap:
        x = np.clip(x, 0, w - 1)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    if a.ndim == 3:
        fx, fy = fx[..., None], fy[..., None]
    x1 = (x0 + 1) % w if wrap else np.minimum(x0 + 1, w - 1)
    x0 = x0 % w if wrap else x0
    y1 = np.minimum(y0 + 1, h - 1)
    return ((a[y0, x0] * (1 - fx) + a[y0, x1] * fx) * (1 - fy)
            + (a[y1, x0] * (1 - fx) + a[y1, x1] * fx) * fy)


def view_uv(center, width=WIDTH, height=HEIGHT, vfov=VFOV):
    span = 2 * np.tan(np.deg2rad(vfov / 2))
    x, y = np.meshgrid((np.arange(width) + .5) / width, (np.arange(height) + .5) / height)
    rx, ry = (x - .5) * span * width / height, (.5 - y) * span + PITCH
    return ((center + np.arctan2(rx, 1) / (2 * np.pi)) % 1,
            np.arccos(ry / np.sqrt(rx * rx + ry * ry + 1)) / np.pi)


def panorama_to_view(u, v, center, width=WIDTH, height=HEIGHT, vfov=VFOV):
    theta = ((u - center + .5) % 1 - .5) * 2 * np.pi
    phi = v * np.pi
    z = np.sin(phi) * np.cos(theta)
    safe_z = np.maximum(z, 1e-8)
    span = 2 * np.tan(np.deg2rad(vfov / 2))
    x = np.sin(phi) * np.sin(theta) / safe_z / (span * width / height) + .5
    y = .5 - (np.cos(phi) / safe_z - PITCH) / span
    valid = (z > 0) & (x >= 0) & (x <= 1) & (y >= 0) & (y <= 1)
    return x, y, valid


def normalize_prediction(prediction):
    a = np.asarray(prediction, dtype=np.float32)
    if a.ndim != 2 or not np.isfinite(a).all():
        raise ValueError('Depth prediction must be a finite 2D field')
    low, high = np.percentile(a, [2, 98])
    if high - low < 1e-6:
        raise ValueError('Degenerate depth prediction; refusing to export a flat map')
    # Relative inverse depth: higher values are nearer, matching the existing shader.
    return (.02 + .88 * np.clip((a - low) / (high - low), 0, 1)), [float(low), float(high)]


def pack_depth(prediction, original, center):
    """Project the inferred view back to pano UVs; preserve the water mask byte-for-byte.

    The visible camera frustum is inside the inference view. The panorama outside
    this view retains the original approximate map, with a narrow feathered join.
    """
    original = np.asarray(original, dtype=np.uint8)
    if original.ndim != 3 or original.shape[2] != 3:
        raise ValueError('Expected packed RGB depth / water map')
    h, w = original.shape[:2]
    u, v = np.meshgrid((np.arange(w) + .5) / w, (np.arange(h) + .5) / h)
    x, y, valid = panorama_to_view(u, v, center)
    edge = np.minimum.reduce([x, 1 - x, y, 1 - y])
    t = np.clip(edge / .035, 0, 1)
    weight = t * t * (3 - 2 * t) * valid
    inferred = sample(prediction, np.clip(x, 0, 1), np.clip(y, 0, 1)) * 255
    sharp = np.rint(original[..., 1] * (1 - weight) + inferred * weight).clip(0, 255).astype('uint8')
    soft_view = np.asarray(Image.fromarray(np.rint(prediction * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255
    soft_inferred = sample(soft_view, np.clip(x, 0, 1), np.clip(y, 0, 1)) * 255
    soft = np.rint(original[..., 0] * (1 - weight) + soft_inferred * weight).clip(0, 255).astype('uint8')
    return np.stack([soft, sharp, original[..., 2]], axis=-1), float(np.mean(weight > .99))


def rectify(image, center):
    u, v = view_uv(center)
    return Image.fromarray(np.rint(sample(image, u, v, wrap=True)).clip(0, 255).astype('uint8'))
