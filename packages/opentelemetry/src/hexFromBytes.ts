export const hexFromBytes = (bytes: Uint8Array): string => {
  let hex = ''
  for (let index = 0; index < bytes.length; index++)
    hex += bytes[index]!.toString(16).padStart(2, '0')
  return hex
}
