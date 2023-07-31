// https://github.com/jjranalli/nightwind/issues/74#issuecomment-1639973119

declare module "nightwind/helper" {
  interface NightwindHelperModule {
    init: () => string
    beforeTransition: () => void
    toggle: () => void
    enable: (dark: boolean) => void
    checkNightMode: () => boolean
    watchNightMode: () => void
    addNightModeSelector: () => void
    addNightTransitions: () => void
    initNightwind: () => void
    toggleNightMode: () => void
  }

  const nightwindHelper: NightwindHelperModule

  export default nightwindHelper
}
