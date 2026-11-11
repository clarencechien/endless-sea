import unittest
import numpy as np
from depth_projection import view_uv, panorama_to_view, pack_depth, normalize_prediction, sample


class ProjectionTests(unittest.TestCase):
    def test_pixel_centers_round_trip_even_across_panorama_seam(self):
        for center in [.23, .9, .995]:
            u, v = view_uv(center, 80, 60)
            x, y, valid = panorama_to_view(u, v, center, 80, 60)
            expected_x, expected_y = np.meshgrid((np.arange(80) + .5) / 80, (np.arange(60) + .5) / 60)
            self.assertTrue(valid.all())
            np.testing.assert_allclose(x, expected_x, atol=1e-12)
            np.testing.assert_allclose(y, expected_y, atol=1e-12)

    def test_model_view_covers_desktop_and_mobile_rendered_frusta(self):
        for center in [.23, .5, .46, .9]:
            # Same 1.02 span as renderer.js, expanded for its small parallax offset.
            for aspect in [1.60, .92]:
                x, y = np.meshgrid(np.linspace(-.53, .53, 15), np.linspace(-.53, .53, 15))
                rx, ry = x * 1.02 * aspect, -y * 1.02 + .025
                u = (center + np.arctan2(rx, 1) / (2 * np.pi)) % 1
                v = np.arccos(ry / np.sqrt(rx * rx + ry * ry + 1)) / np.pi
                px, py, valid = panorama_to_view(u, v, center)
                self.assertTrue(valid.all())
                self.assertGreater(min(px.min(), py.min(), 1-px.max(), 1-py.max()), .035)

    def test_water_mask_and_unseen_panorama_are_preserved(self):
        rng = np.random.default_rng(5)
        original = rng.integers(0, 256, (128, 256, 3), dtype=np.uint8)
        inferred = np.tile(np.linspace(.02, .9, 60)[:, None], (1, 80))
        packed, coverage = pack_depth(inferred, original, .9)
        np.testing.assert_array_equal(packed[..., 2], original[..., 2])
        np.testing.assert_array_equal(packed[:, 110:120], original[:, 110:120])
        self.assertGreater(coverage, .08)
        self.assertLess(coverage, .3)
        self.assertGreater(np.count_nonzero(packed[..., 0] != original[..., 0]), 100)

    def test_nearer_is_brighter_and_invalid_model_outputs_fail_closed(self):
        result, _ = normalize_prediction(np.arange(100).reshape(10, 10))
        self.assertGreater(result[-1, -1], result[0, 0])
        for bad in [np.zeros((10, 10)), np.full((10, 10), np.nan)]:
            with self.assertRaises(ValueError):
                normalize_prediction(bad)

    def test_bilinear_wrap_keeps_constant_sky_constant(self):
        image = np.full((4, 8, 3), 73, dtype=np.uint8)
        np.testing.assert_allclose(sample(image, np.array([-.01, .5, 1.01]), np.array([0, .5, 1]), wrap=True), 73)


if __name__ == '__main__':
    unittest.main()
