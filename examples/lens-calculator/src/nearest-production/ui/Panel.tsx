import { panel } from '../../styles'
import { ProductionFilters } from './Filters'
import { ProductionReference } from './Reference'

export const ProductionPanel = () => (
  <aside
    aria-label="Nearest production lens"
    css={`
      ${panel}
      display: grid;
      align-content: start;
      gap: 1.25rem;
      padding: 1.25rem;
    `}
  >
    <ProductionFilters />
    <ProductionReference />
  </aside>
)
