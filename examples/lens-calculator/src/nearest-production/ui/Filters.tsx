import { Section, Segmented } from '../../components/controls/widgets'
import { t } from '../../translations'
import type { BarrelFilter, CorrectionFilter } from '../catalog/types'
import { barrel, barrelOptions, correction, correctionOptions } from '../model'

export const ProductionFilters = () => (
  <>
    <Section title={t.reference.filters}>
      <Segmented<CorrectionFilter>
        name={t.controls.correction}
        value={correction}
        options={correctionOptions}
        render={(option) => (option === 'any' ? t.filter.any : t.tier[option])}
      />
      <Segmented<BarrelFilter>
        name={t.controls.barrel}
        value={barrel}
        options={barrelOptions}
        render={(option) =>
          option === 'any' ? t.filter.any : t.barrel[option]
        }
      />
    </Section>
  </>
)
