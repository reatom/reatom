import { Section, Segmented } from '../../components/controls/widgets'
import { barrelLabels, correctionLabels } from '../catalog/labels'
import type { BarrelFilter, CorrectionFilter } from '../catalog/types'
import {
  barrel,
  barrelOptions,
  correction,
  correctionOptions,
} from '../model'

export const ProductionFilters = () => (
  <>
    <Section title="Nearest lens filters">
      <Segmented<CorrectionFilter>
        name="Correction"
        value={correction}
        options={correctionOptions}
        render={(option) => correctionLabels[option]}
      />
      <Segmented<BarrelFilter>
        name="Barrel"
        value={barrel}
        options={barrelOptions}
        render={(option) => barrelLabels[option]}
      />
    </Section>
  </>
)
