import type { Barrel, Tier } from '../../optics'

import type { ManufacturerId, MountId } from './types'
import { anyOption } from './types'

export const manufacturerLabels: Record<ManufacturerId, string> = {
  sony: 'Sony',
  canon: 'Canon',
  nikon: 'Nikon',
  fujifilm: 'Fujifilm',
  olympus: 'OM System',
  panasonic: 'Panasonic',
  leica: 'Leica',
  sigma: 'Sigma',
  tamron: 'Tamron',
  zeiss: 'Zeiss',
  samyang: 'Samyang',
  voigtlander: 'Voigtländer',
  tokina: 'Tokina',
  laowa: 'Laowa',
  viltrox: 'Viltrox',
  ttartisan: 'TTArtisan',
  artisans: '7artisans',
  yongnuo: 'Yongnuo',
  meike: 'Meike',
  pentax: 'Pentax',
  hasselblad: 'Hasselblad',
  minolta: 'Minolta',
  other: 'Other',
}

export const mountLabels: Record<MountId, string> = {
  'sony-e': 'Sony E',
  'sony-a': 'Sony / Minolta A',
  'canon-rf': 'Canon RF',
  'canon-ef': 'Canon EF',
  'canon-ef-s': 'Canon EF-S',
  'canon-ef-m': 'Canon EF-M',
  'nikon-z': 'Nikon Z',
  'nikon-f': 'Nikon F',
  'fujifilm-x': 'Fujifilm X',
  'fujifilm-g': 'Fujifilm G',
  mft: 'Micro Four Thirds',
  'four-thirds': 'Four Thirds',
  'leica-l': 'L-Mount',
  'leica-m': 'Leica M',
  'leica-r': 'Leica R',
  'leica-sl': 'Leica SL',
  'pentax-k': 'Pentax K',
  'hasselblad-xcd': 'Hasselblad XCD',
  'minolta-a': 'Minolta A',
  m42: 'M42',
  645: '645',
  other: 'Other',
}

export const correctionLabels: Record<Tier | typeof anyOption, string> = {
  any: 'Any',
  classic: 'Classic',
  modern: 'Modern',
  flagship: 'Flagship',
}

export const barrelLabels: Record<Barrel | typeof anyOption, string> = {
  any: 'Any',
  aluminium: 'Aluminium',
  magnesium: 'Magnesium',
  polycarbonate: 'Polycarbonate',
  brass: 'Brass',
}
