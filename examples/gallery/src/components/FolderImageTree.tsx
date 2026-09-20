import type { JSX } from '@reatom/jsx'

import {
  bindGalleryImagePreview,
  folderModelTree,
  type GalleryFolderModel,
  type ImageModel,
  isFolderBranchInCurrentScope,
  isFolderImagesInCurrentScope,
} from '../model'

export const mapFolderImages = <T,>(
  folder: GalleryFolderModel,
  mapImage: (image: ImageModel, folder: GalleryFolderModel) => T,
): T[] => [
  ...folder.sortedImages().map((image) => mapImage(image, folder)),
  ...folder.children.flatMap((child) => mapFolderImages(child, mapImage)),
]

export const FolderImageTree = ({
  renderImage,
}: {
  renderImage: (image: ImageModel, folder: GalleryFolderModel) => JSX.Element
}) => {
  const Folder = ({ folder }: { folder: GalleryFolderModel }) => (
    <div
      style:display={() =>
        isFolderBranchInCurrentScope(folder) ? 'contents' : 'none'
      }
    >
      <div
        style:display={() =>
          isFolderImagesInCurrentScope(folder) ? 'contents' : 'none'
        }
      >
        {() =>
          folder
            .sortedImages()
            .map((image) => renderImage(image, folder))
        }
      </div>
      {folder.children.map((child) => (
        <Folder folder={child} />
      ))}
    </div>
  )

  return () => {
    const tree = folderModelTree()
    return tree ? <Folder folder={tree} /> : null
  }
}

export const PreviewBoundImage = ({
  image,
  folder,
  css,
  children,
}: {
  image: ImageModel
  folder: GalleryFolderModel
  css?: string
  children: JSX.ElementChildren
}) => (
  <div
    style:display={() => (image.visible() ? 'contents' : 'none')}
    ref={() => bindGalleryImagePreview(image, folder)}
    css={css}
  >
    {children}
  </div>
)
