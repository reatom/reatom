import { ChoiceButton, IconButton } from '../design-system'
import type { ImageModel } from '../model'
import { selectImage } from '../model'
import { CheckIcon, HeartIcon } from './Icons'

export const ImageSelectButton = ({
  image,
  css,
  slot,
}: {
  image: ImageModel
  css?: string
  slot?: string
}) => (
  <ChoiceButton
    slot={slot}
    label={() =>
      image.selected()
        ? `Deselect ${image.source.name}`
        : `Select ${image.source.name}`
    }
    selected={image.selected}
    selection="checked"
    stopPropagation
    onClick={() => selectImage(image)}
    size="icon"
    css={css}
  >
    {() => (image.selected() ? <CheckIcon /> : null)}
  </ChoiceButton>
)

export const ImageFavoriteButton = ({
  image,
  css,
  slot,
}: {
  image: ImageModel
  css?: string
  slot?: string
}) => (
  <IconButton
    slot={slot}
    label={() =>
      image.favorite()
        ? `Remove ${image.source.name} from favorites`
        : `Add ${image.source.name} to favorites`
    }
    selected={image.favorite}
    stopPropagation
    onClick={() => image.favorite.toggle()}
    css={css}
  >
    {() => <HeartIcon filled={image.favorite()} />}
  </IconButton>
)
