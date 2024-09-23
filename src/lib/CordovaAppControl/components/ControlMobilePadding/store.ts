// import { legacy_createStore as createStore, } from 'redux';
import { create } from 'zustand'

// // const controlMobilePaddingInitialStore = {
// //   autoBottomSize: 0
// // }
// const ADD_HEIGHT = 'ADD_HEIGHT';
// function reducer(state = 0, action) {
//   switch (action.type) {
//     case ADD_HEIGHT: return action.autoBottomSize
//     default: return state
//   }
// }

// export const store = createStore(reducer, 0)

// export const ControlMobileAutoHeight = {
//   set: ({autoBottomSize}) => {
//     console.log('ControlMobileAutoHeight(set)', autoBottomSize);
//     store.dispatch(({type: ADD_HEIGHT, autoBottomSize}))
//   },
//   // get: () => store.getState().autoBottomSize
// }


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
    console.log('ControlMobileAutoHeight(set)', autoBottomSize);
    useStore.setState({autoBottomSize})
  },
  // get: () => store.getState().autoBottomSize
}

