import { bindAudioElement } from '../model'

export const AudioHost = () => {
  return (
    <audio
      ref={(el) => bindAudioElement(el)}
      css={`
        display: none;
      `}
    />
  )
}
