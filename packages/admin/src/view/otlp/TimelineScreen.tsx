import type { OtlpAdmin } from '../../otlp'
import { SplitPane, tokens } from '../design-system'
import { OtlpGanttChart, recordRowAdapter } from './GanttChart'
import { OtlpInspector } from './Inspector'

export interface OtlpTimelineScreenProps {
  admin: OtlpAdmin
}

export const OtlpTimelineScreen = ({ admin }: OtlpTimelineScreenProps) => {
  return (
    <div
      data-reatom-name="OtlpTimelineScreen"
      css={`
        height: 100%;
        min-height: 0;
        overflow: hidden;
      `}
    >
      <SplitPane
        ratio={admin.timelineSplitRatio}
        left={
          <OtlpGanttChart
            gantt={admin.gantt}
            admin={admin}
            adapter={recordRowAdapter(admin, admin.ganttSelection)}
          />
        }
        right={
          <aside
            css={`
              height: 100%;
              min-height: 0;
              overflow: hidden;
              background: ${tokens.surface1};
            `}
          >
            <OtlpInspector admin={admin} />
          </aside>
        }
        minLeft={280}
        minRight={260}
        defaultRatio={0.58}
      />
    </div>
  )
}
