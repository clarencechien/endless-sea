import sys, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
source, target = map(pathlib.Path, sys.argv[1:3])
for name in ['venice', 'coast', 'meadow']:
    a = np.fromfile(source / (name + '.rgba'), dtype='<f4').reshape(512, 1024, 4)[:, :, :3]
    a = np.clip((a * (2.51 * a + .03)) / (a * (2.43 * a + .59) + .14), 0, 1) ** (1 / 2.2)
    Image.fromarray((a * 255).astype('uint8')).save(target / (name + '.webp'), quality=94, method=6)
    y = np.linspace(0, 1, 512)[:, None]
    depth = np.clip((y - .49) / .51, 0, 1) * .83 + .10
    depth[y < .48] = .02
    sharp = Image.fromarray((np.broadcast_to(depth, (512, 1024)) * 255).astype('uint8')).copy()
    if name == 'venice':
        d = ImageDraw.Draw(sharp)
        d.polygon([(0,245),(0,209),(80,211),(126,227),(129,217),(187,216),(205,237),(262,240),(280,256)], fill=120)
        d.polygon([(866,254),(866,232),(912,224),(913,203),(947,202),(947,187),(983,186),(983,205),(1023,211),(1023,270)], fill=130)
    Image.merge('RGB', (sharp.filter(ImageFilter.GaussianBlur(7)), sharp, Image.new('L', (1024,512), 0))).save(target / (name + '-depth.png'), optimize=True)
