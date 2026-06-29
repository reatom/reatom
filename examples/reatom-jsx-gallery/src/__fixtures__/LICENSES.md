# Image fixture licenses

Vendored test images for `reatom-jsx-gallery`. Machine-readable metadata lives in [`manifest.json`](./manifest.json). Re-download with `pnpm fixtures:fetch`.

## Tier A (default CI, ~4 MB)

| Source | License | Files |
|--------|---------|-------|
| [recurser/exif-orientation-examples](https://github.com/recurser/exif-orientation-examples) v2.0.1 | MIT | `tier-a/exif/Landscape_*.jpg`, `Portrait_*.jpg` |
| [web-platform-tests/wpt](https://github.com/web-platform-tests/wpt) `images/` | BSD-3-Clause | `tier-a/web/*` |
| [PngSuite](http://www.schaik.com/pngsuite/) | Freeware | `tier-a/png/basn*.png` |
| [libwebp-test-data](https://github.com/webmproject/libwebp-test-data) | BSD-3-Clause | `tier-a/webp/*` |
| [nomacs/formats_testset](https://github.com/nomacs/formats_testset) | BSD-3-Clause | `tier-a/gif/clock.gif` |
| [woelper/oculante](https://github.com/woelper/oculante) `tests/` | MIT | `tier-a/svg/shapes_and_text.svg` |
| Generated locally | Public Domain | `tier-a/bmp/rgb24-2x2.bmp` |
| [exiftool/exiftool](https://github.com/exiftool/exiftool) `t/images/` | Artistic-2.0 (toolchain) | `tier-a/metadata/*` |

## Tier B (extended, ~40 MB)

| Source | License | Files |
|--------|---------|-------|
| nomacs/formats_testset | BSD-3-Clause | `tier-b/exif/`, `tier-b/rotations/`, `tier-b/png-formats/`, `tier-b/avif/repetition3.avif` |
| [AOMediaCodec/libavif](https://github.com/AOMediaCodec/libavif) `tests/data/` | BSD-2-Clause | `tier-b/avif/colors-animated-8bpc.avif` |
| oculante `tests/` | MIT | `tier-b/stress/*` |
| [lovell/sharp](https://github.com/lovell/sharp) `test/fixtures/` | Apache-2.0 | `tier-b/orient-sharp/Landscape_*.jpg` |
| [image-rs/image](https://github.com/image-rs/image) `tests/bad/` | MIT OR Apache-2.0 | `tier-b/corrupt/*` |

## Tier C (RAW, Git LFS, ~140 MB)

| Source | License | Files |
|--------|---------|-------|
| nomacs/formats_testset | BSD-3-Clause | `tier-c/raw/*.CR2`, `tier-c/raw/*.NEF`, `tier-c/dng/*` |
| [raw.pixls.us](https://raw.pixls.us/) `data.lfs.git` | CC0 | `tier-c/pixls/RX700064.ARW`, `tier-c/pixls/RAW_OLYMPUS_C5050Z.ORF` |

## Git LFS

Tier C binaries are tracked with Git LFS. After clone:

```bash
git lfs install
git lfs pull
```

## Attribution notes

- Unsplash photos appear upstream in recurser orientation examples and oculante stress JPEGs; retain upstream attribution when redistributing subsets.
- ExifTool sample JPEGs are metadata test vectors; gallery tests read tags only.
- Do not reuse CC-BY-SA or NC-licensed corpora from other projects without updating this file.
