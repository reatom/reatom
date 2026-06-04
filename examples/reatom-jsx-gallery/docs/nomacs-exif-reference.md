# nomacs EXIF reference (for reatom-jsx-gallery)

Behavior distilled from [nomacs](https://github.com/nomacs/nomacs) (`ImageLounge/src/DkCore/DkMetaData.cpp`, `DkBasicLoader.cpp`). nomacs delegates parsing to Exiv2; this document captures constants and quirks we mirror in the gallery’s TypeScript parser.

## Orientation (TIFF tag `0x0112`)

| Value | Rotation (clockwise °) | Horizontal mirror | Label |
|------:|------------------------|-------------------|-------|
| 1 | 0 | no | Normal |
| 2 | 0 | yes | Mirror horizontal |
| 3 | 180 | no | Rotate 180° |
| 4 | 180 | yes | Mirror vertical |
| 5 | 90 | yes | Mirror horizontal + rotate 270° CW |
| 6 | 90 | no | Rotate 90° CW |
| 7 | 270 | yes | Mirror horizontal + rotate 90° CW |
| 8 | 270 | no | Rotate 270° CW |

**Invalid:** `0` (old nomacs wrote 0; Qt JPG loader fails), `9+`, non-numeric.

**States:** `not_set` (missing), `invalid`, `valid`.

**Tag precedence:** IFD0 `Orientation` wins over Exif-sub-IFD `0x112` when both exist (`getExifValue` tries `Exif.Image.*` then `Exif.Photo.*` in nomacs).

**Display:** Prefer CSS `image-orientation: from-image` when respecting EXIF; `image-orientation: none` when user enables “Ignore EXIF orientation”.

**Double rotation:** HEIC/AVIF/JXL and some RAW Qt plugins may already rotate pixels while the tag remains — browser decoders can do the same; manual canvas rotate only when needed (embedded EXIF thumbnails).

### Lossless rotate composition (`setOrientation`)

When writing metadata (future): current tag × Δangle → new tag 1–8. See `composeOrientation()` in `src/image-engine/orientation.ts`.

## Flash (bitmask → label)

From ExifTool Flash table; nomacs `DkMetaDataHelper::init` lines 1638–1665. Use sparse `Map` lookup, not array index by value (nomacs bug at 1800–1805).

| Hex | Label |
|-----|-------|
| 0x0 | No Flash |
| 0x1 | Fired |
| 0x5 | Fired, Return not detected |
| 0x7 | Fired, Return detected |
| 0x8 | On, Did not fire |
| 0x9 | On, Fired |
| 0xd | On, Return not detected |
| 0xf | On, Return detected |
| 0x10 | Off, Did not fire |
| 0x14 | Off, Did not fire, Return not detected |
| 0x18 | Auto, Did not fire |
| 0x19 | Auto, Fired |
| 0x1d | Auto, Fired, Return not detected |
| 0x1f | Auto, Fired, Return detected |
| 0x20 | No flash function |
| 0x30 | Off, No flash function |
| 0x41 | Fired, Red-eye reduction |
| 0x45 | Fired, Red-eye reduction, Return not detected |
| 0x47 | Fired, Red-eye reduction, Return detected |
| 0x49 | On, Red-eye reduction |
| 0x4d | On, Red-eye reduction, Return not detected |
| 0x4f | On, Red-eye reduction, Return detected |
| 0x50 | Off, Red-eye reduction |
| 0x58 | Auto, Did not fire, Red-eye reduction |
| 0x59 | Auto, Fired, Red-eye reduction |
| 0x5d | Auto, Fired, Red-eye reduction, Return not detected |
| 0x5f | Auto, Fired, Red-eye reduction, Return detected |

## Compression (TIFF code → label)

Manufacturer-specific codes from nomacs 1667–1716: 1–10, 99, 262, 32766–32773, 32867, 32895–32898, 32908–32909, 32946–32947, 33003, 33005, 34661, 34676–34677, 34712–34720, 34887, 34892, 34925–34927, 34933–34934, **32767** Sony ARW, **32770** Samsung SRW, **65000** Kodak DCR, **65535** Pentax PEF.

## Exposure mode (0–7)

not defined, manual, normal, aperture priority, shutter priority, program creative, high-speed program, portrait mode, landscape mode.

## Display helpers

- **Aperture:** `ApertureValue` rational → f-number via 2^(AV/2); fallback `FNumber`.
- **Exposure time:** if ≤ 1s, show `1/N sec` (nomacs #496).
- **GPS:** DMS from deg/min/sec rationals; Maps URL `https://maps.google.com/maps?q=+{LatRef}+...+{LonRef}+...`.
- **UserComment:** Exif UNDEFINED with 8-byte header (ASCII / JIS / Unicode).
- **Large tags:** count ≥ 2000 → `"<data too large to display>"` (nomacs); avoid parsing huge MakerNote blobs in UI.

## Edge-case checklist

| Issue | nomacs | Gallery handling |
|-------|--------|------------------|
| Orientation 0 | Breaks Qt JPG | Treat as invalid |
| Save buffer shrink | Abort if new size ≤ 50% of original (Exiv2 #995, Hasselblad 3FR) | Document only; no writes yet |
| Pixel edit + save | `clearOrientation()` → tag 1 | Document only |
| Multi APP1 | Exiv2 merges | Scan all APP1; use largest TIFF block |
| EXIF read cap | Full file | Adaptive slice up to 512KB |
| Thumbnail embed max | 200px (Exiv2 crash) | N/A (read only) |
| XMP rating -1 | Rejected; ignored | Not parsed yet |
| MicrosoftPhoto.Rating | Percent, not stars (FIXME) | Not used |
| BMFF (HEIC/AVIF) | `enableBMFF` | AVIF: engine reads **dimensions** only (`bmff.ts`); no BMFF EXIF yet |

## nomacs source index

| Topic | File |
|-------|------|
| Orientation read/write | `ImageLounge/src/DkCore/DkMetaData.cpp` 317–380, 1128–1224 |
| Load + transform policy | `ImageLounge/src/DkCore/DkBasicLoader.cpp` 170–208, 419–495 |
| Display maps | `ImageLounge/src/DkCore/DkMetaData.cpp` 1628–1716, 1719–1900 |
| Settings | `ImageLounge/src/DkCore/DkSettings.h` 320–322 |
| Save guards | `DkMetaData.cpp` 276–279, `DkImageLoader.cpp` 1059–1060, 1366–1435 |
