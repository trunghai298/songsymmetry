import { createSlice } from "@reduxjs/toolkit";

interface ISubscribe {
  openDialog: boolean;
}

const initialState: ISubscribe = {
  openDialog: false,
};

export const subscribeSlice = createSlice({
  name: "subscribe",
  initialState,
  reducers: {
    openSubscribeDialog: (state) => {
      state.openDialog = true;
    },
    closeSubscribeDialog: (state) => {
      state.openDialog = false;
    },
  },
});

// Export actions directly
export const { openSubscribeDialog, closeSubscribeDialog } = subscribeSlice.actions;

// For consumer convenience, also export these as function names
export const setOpenSubscribeDialog = openSubscribeDialog;
export const setCloseSubscribeDialog = closeSubscribeDialog;

export default subscribeSlice.reducer;