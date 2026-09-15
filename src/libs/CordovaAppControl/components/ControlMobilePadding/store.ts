import { create } from 'zustand'


interface InitialAutoSizesState {
  autoBottomSize: number;
  autoTopSize: number;
  sizesBars: {
    heightNav: number;
    heightStatus: number;
  },
  keyboardData: {
    isShow: boolean;
    height: number
  }
  sizesDisplay: {
    width: number;
    height: number;
    isPortrait: boolean;
  }
}

interface AutoSizesActions {
  setAutoTopSize(payload: {autoTopSize: number}): void
  setAutoBottomSize(payload: {autoBottomSize: number}): void
  setSizesBars: (payload: Record<"heightStatus" | "heightNav", number>) => void
  set: (payload: Partial<InitialAutoSizesState>) => void
}



const initialState:InitialAutoSizesState = {
  autoBottomSize: 0,
  autoTopSize: 0,
  sizesBars: {
    heightNav: 0,
    heightStatus: 0
  },
  keyboardData: {
    isShow: false,
    height: 0
  },
  sizesDisplay: {
    width: 0,
    height: 0,
    isPortrait: false
  }
}


export const autoSizesBoxStore = create<InitialAutoSizesState>(() => (initialState));


export const autoSizesBoxActions:AutoSizesActions = {
  setAutoTopSize: ({autoTopSize}) => autoSizesBoxStore.setState({ autoTopSize }),
  setAutoBottomSize: ({autoBottomSize}) => autoSizesBoxStore.setState({ autoBottomSize }),
  setSizesBars: ({heightStatus, heightNav}) => autoSizesBoxStore.setState({ sizesBars: { heightNav, heightStatus } }),
  set: (payload) => autoSizesBoxStore.setState(payload),
};

export const autoSizesBoxSelectors = {
  getAutoTopSize: (state: InitialAutoSizesState) => state.autoTopSize,
  getAutoBottomSize: (state: InitialAutoSizesState) => state.autoBottomSize,
  getSizesBars: (state: InitialAutoSizesState) => state.sizesBars,
  getKeyboardInfo: (state: InitialAutoSizesState) => state.keyboardData,
  getSizesDisplay: (state: InitialAutoSizesState) => state.sizesDisplay,
};



export const useAutoSizesBoxSelector = <TSelected>(selector: (state: InitialAutoSizesState) => TSelected ): TSelected => autoSizesBoxStore(selector);
