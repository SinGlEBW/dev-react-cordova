import { create } from 'zustand'


interface AutoBottomSizeState {
  autoBottomSize: number
  setAutoBottomSize(d:{autoBottomSize: number}): void
}

export const useStore = create<AutoBottomSizeState>((set) => ({
  autoBottomSize: 0,
  setAutoBottomSize: ({autoBottomSize}) => set(() => ({ autoBottomSize: autoBottomSize })),
}))

export const ControlMobileAutoHeight = {
  set: ({autoBottomSize}:Parameters<AutoBottomSizeState['setAutoBottomSize']>[0]) => {
    useStore.setState({autoBottomSize})
  },
  // get: () => store.getState().autoBottomSize
}

