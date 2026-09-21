import { label, mono } from '../../styles'
import { t } from '../../translations'
import { productionCatalog } from '../catalog'
import { manufacturerLabels, mountLabels } from '../catalog/labels'
import { catalogMeta } from '../catalog/meta'
import { anyOption, type MountId, type ProductionLens } from '../catalog/types'
import {
  matchingLenses,
  mount,
  mountOptions,
  nearbyProductionLenses,
  nearestProductionLens,
} from '../model'
import { Select } from './Select'

const formatLensStats = (lens: ProductionLens) => {
  const size =
    lens.diameter !== null && lens.length !== null
      ? `Ø ${lens.diameter} × ${lens.length} mm`
      : null
  const weight = lens.weight !== null ? `${lens.weight} g` : null
  const elements = lens.elements !== null ? `${lens.elements} el` : null
  const filter =
    lens.filter === null
      ? null
      : lens.filter === 0
        ? t.reference.dropIn
        : `M${lens.filter}`
  return [size, weight, elements, filter].filter(Boolean).join(' · ')
}

const LensCard = ({ lens }: { lens: ProductionLens }) => (
  <div
    css={`
      display: grid;
      gap: 0.2rem;
    `}
  >
    <span
      css={`
        color: var(--ink-dim);
      `}
    >
      {lens.name}
    </span>
    <span
      css={`
        ${mono}
        color: var(--ink-faint);
      `}
    >
      {`${manufacturerLabels[lens.manufacturer]} · ${mountLabels[lens.mount]}`}
    </span>
    <span
      css={`
        ${mono}
        color: var(--ink-dim);
      `}
    >
      {() => formatLensStats(lens) || t.reference.identityOnly}
    </span>
  </div>
)

export const ProductionReference = () => (
  <div
    css={`
      display: grid;
      gap: 0.85rem;
    `}
  >
    <Select<MountId | typeof anyOption>
      name={t.reference.mount}
      value={mount}
      options={mountOptions}
      render={(option) =>
        option === anyOption ? t.filter.any : mountLabels[option]
      }
    />

    <p
      css={`
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.5;
        color: var(--ink-faint);
      `}
    >
      {() => {
        if (!productionCatalog.ready()) return t.reference.loadingProduction
        const error = productionCatalog.error()
        if (error) return error.message
        const nearest = nearestProductionLens()
        if (nearest === null) {
          return t.reference.noMatch(productionCatalog.data().length)
        }
        return t.reference.closeMatches(
          matchingLenses().length,
          productionCatalog.data().length,
        )
      }}
    </p>

    {() => {
      const nearest = nearestProductionLens()
      if (nearest === null) return null
      return (
        <p
          css={`
            margin: 0;
            padding: 0.75rem 0.85rem;
            border: 1px dashed var(--hairline);
            font-size: 0.75rem;
            line-height: 1.5;
            color: var(--ink-faint);
          `}
        >
          <span
            css={`
              ${label}
              margin-right: 0.5rem;
              font-size: 0.5625rem;
              color: var(--ink-faint);
            `}
          >
            {t.reference.nearest}
          </span>
          <LensCard lens={nearest} />
        </p>
      )
    }}

    {() => {
      const others = nearbyProductionLenses().slice(1)
      if (others.length === 0) return null
      return (
        <ol
          css={`
            margin: 0;
            padding: 0;
            display: grid;
            gap: 0.65rem;
            list-style: none;
            font-size: 0.75rem;
            line-height: 1.45;
          `}
        >
          {others.map((lens) => (
            <li>
              <LensCard lens={lens} />
            </li>
          ))}
        </ol>
      )
    }}

    <p
      css={`
        margin: 0;
        font-size: 0.6875rem;
        line-height: 1.45;
        color: var(--ink-faint);
      `}
    >
      {t.reference.catalogFoot(catalogMeta.lensCount)}
    </p>
  </div>
)
