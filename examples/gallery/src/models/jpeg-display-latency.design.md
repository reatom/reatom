# JPEG lightbox decode latency

2026-10-27: DSC03440.jpg is 9568×6376 with normal orientation and no embedded
preview. In a local Chromium run at DPR 2, selected-image decoding overlapped
neighbor decoding, three grid thumbnails, and a redundant full-size image
decode. First canvas presentation was about 880 ms after decoding began.

Waiting longer or enlarging every thumbnail would preserve the duplicate work.
Adding another preview cache would duplicate image ownership. The chosen change
keeps the existing decode policy as the owner: sizedImage returns its selected
original image when the policy uses one, otherwise its canvas. The lightbox
consumes that result without independently activating fullImage. Neighbor
preloading waits for the selected image; hidden JPEG preload URLs use thumbnails.

Untransformed JPEG VideoFrames can use native createImageBitmap directly instead
of copying RGBA pixels through JS. Rotated/mirrored frames retain the existing
stored-layout copy and explicit orientation path to preserve browser behavior.

After these changes the same local three-image scenario presented its first
canvas in about 360 ms, and no full-resolution decode ran. These are individual
diagnostic runs, not a guaranteed latency bound. The file still needs entropy
decoding, unlike a RAW file with a small embedded JPEG. Tests cover returning the
policy-selected original, preserving orientation, native unrotated frame transfer,
and deferring neighbor decoding without starting a duplicate original.

## Progressive gallery thumbnails

2026-10-31: A representative 16 MB, 7319×7150 JPEG contains a 160×156
embedded preview. The gallery rejected that preview because it was smaller
than the requested thumbnail, leaving the card empty until a full decode
finished. In a local Chromium scan of 1200 handles using this photo, the first
image appeared at about 1.2 seconds. File access and card mounting started
within the first frame; browser lazy loading added only a few milliseconds
once the thumbnail was ready.

The engine now delivers an undersized embedded preview through optional
`onPreview`, while its promise still resolves to the requested final thumbnail.
Returning only the small image would lose the resolution upgrade; lowering all
decode concurrency had mixed latency results and reduced throughput. The
callback keeps existing promise consumers compatible. It transfers URL
ownership to the model, which publishes the preview while pending and revokes
it on replacement or disposal. Late aborted callbacks release their URL.

With this path, the first image loaded at about 140–210 ms in diagnostic
scans. The preview and resolution upgrade retain the same image DOM node. These individual runs demonstrate the avoided decode wait, not a latency
guarantee. JPEGs without an embedded preview still require source decoding.
