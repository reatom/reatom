import { themeCss } from '../themeCss'

const emptyArtCss = `
  display: none;
  ${themeCss(
    'bauhaus',
    `
      display: block;
      position: absolute;
      inset: 24px 0 24px 55%;
      overflow: hidden;
      border-left: 1px solid var(--text-primary);
      background: var(--bg-secondary);

      > span {
        position: absolute;
        display: block;
        transition: transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      > span:first-child {
        width: 68%;
        aspect-ratio: 1;
        top: 6%;
        left: 9%;
        border-radius: 50%;
        background: var(--bauhaus-red);
      }
      > span:nth-child(2) {
        width: 78%;
        height: 74%;
        top: 9%;
        right: -12%;
        background: var(--bauhaus-yellow);
        clip-path: polygon(50% 0, 100% 100%, 0 100%);
      }
      > span:nth-child(3) {
        width: 53%;
        height: 44%;
        bottom: 9%;
        left: 0;
        background: var(--bauhaus-blue);
      }
      > span:nth-child(4) {
        width: 36%;
        height: 23%;
        bottom: 12%;
        right: 0;
        background: repeating-linear-gradient(
          0deg,
          var(--text-primary) 0 2px,
          transparent 2px 10px
        );
      }
      > span:last-child {
        bottom: 0;
        right: 0;
        padding: 6px 0 0 12px;
        color: var(--text-primary);
        background: var(--bg-primary);
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.16em;
      }
      &:hover > span:first-child {
        transform: translate(8px, -6px);
      }
      &:hover > span:nth-child(2) {
        transform: translate(-8px, 0);
      }
      &:hover > span:nth-child(3) {
        transform: translateY(8px);
      }
      &:hover > span:nth-child(4) {
        transform: translateX(-12px);
      }
      @media (prefers-reduced-motion: reduce) {
        > span {
          transition: none;
        }
        &:hover > span {
          transform: none;
        }
      }
      @media (max-width: 600px) {
        position: relative;
        inset: auto;
        width: 100%;
        height: 220px;
        border-left: 0;
        grid-row: 5;
        margin-top: 12px;
        > span:first-child {
          width: 48%;
          left: 13%;
          top: 8%;
        }
        > span:nth-child(2) {
          width: 58%;
          right: 0;
        }
        > span:nth-child(3) {
          width: 36%;
          left: 5%;
        }
      }
    `,
  )}
`

const eyebrowCss = `
  display: none;
  ${themeCss(
    'bauhaus',
    `
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--text-primary);
    `,
  )}
`

const sidebarPrintCss = `
  display: none;
  ${themeCss(
    'bauhaus',
    `
      display: flex;
      flex-direction: column;
      gap: 18px;
      flex-shrink: 0;
      margin: auto 12px 18px;
      padding-top: 56px;
      user-select: none;
      color: var(--text-primary);
    `,
  )}
`

const printShapesCss = `
  display: flex;
  align-items: end;
  height: 54px;
  > span {
    display: block;
    width: 54px;
    height: 54px;
  }
  > span:nth-child(1) {
    background: var(--bauhaus-red);
    border-radius: 50%;
  }
  > span:nth-child(2) {
    background: var(--bauhaus-yellow);
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
    margin-left: -9px;
  }
  > span:nth-child(3) {
    background: var(--bauhaus-blue);
    width: 38px;
    height: 38px;
    margin-left: -5px;
  }
`

export const BauhausEmptyArt = () => (
  <>
    <div attr:aria-hidden="true" css={emptyArtCss}>
      <span />
      <span />
      <span />
      <span />
      <span>FORM / COLOR / LIGHT</span>
    </div>
    <span css={eyebrowCss}>A space for seeing.</span>
  </>
)

export const BauhausSidebarPrint = () => (
  <div attr:aria-hidden="true" css={sidebarPrintCss}>
    <div css={printShapesCss}>
      <span />
      <span />
      <span />
    </div>
    <span
      css={`
        font-size: 44px;
        line-height: 0.88;
        letter-spacing: -0.065em;
        font-weight: 900;
      `}
    >
      Look
      <br />
      closer.
    </span>
    <span
      css={`
        font-size: 9px;
        letter-spacing: 0.13em;
        font-weight: 700;
        border-top: 1px solid var(--text-primary);
        padding-top: 12px;
      `}
    >
      THERE’S MORE TO SEE.
    </span>
  </div>
)
