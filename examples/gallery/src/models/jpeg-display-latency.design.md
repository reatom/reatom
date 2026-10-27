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
