const HEX = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0'),
)

export const hexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => HEX[b]!).join('')
