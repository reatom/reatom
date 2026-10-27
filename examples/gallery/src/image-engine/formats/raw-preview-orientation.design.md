# RAW preview orientation

2026-10-27: DSC07727.ARW has sensor dimensions 4912×3264 and Orientation 8.
Its embedded JPEG is 1616×1080 without EXIF orientation. The previous thumbnail
path skipped RAW orientation universally, so the first preview was sideways
until developed pixels replaced it.

The three consumers are thumbnail generation, embedded HTML images, and sized
canvas decoding. CSS-only rotation would duplicate orientation and fitting logic
across them. Waiting for RAW development would lose the fast preview. Re-encoding
every extracted preview would add decoder work and memory. Instead, extraction
adds a minimal EXIF APP1 orientation segment when needed, leaving JPEG pixels
unchanged. Native decoders and the existing oriented-bitmap pipeline then own
rotation, mirroring, and the ignore-orientation preference.

Preview-owned orientation wins, including explicit Normal. An untagged preview
whose portrait/landscape axes already differ from the sensor is preserved for
axis-swapping parent orientations. This dimension check is a compatibility
heuristic: pixels alone cannot establish whether an untagged square, mirrored,
or 180-degree preview has already been transformed.

Tests cover missing tags, explicit preview tags, pre-rotated dimensions, rotation,
mirroring, and preservation of JPEG bytes. Local Chromium inspection of the
reported photo produced an upright 401×600 thumbnail; ignoring orientation
produced 600×401. Both variants together took about 44 ms in that one run, which
is a diagnostic measurement, not a general performance guarantee. Private photo
bytes and the temporary diagnostic test are not included in the repository.
