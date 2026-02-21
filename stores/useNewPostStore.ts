import { create } from "zustand";

type NewPostStore = {
  videoUri: string;
  setVideoUri: (uri: string) => void;
  reset: () => void;
};

export const useNewPostStore = create<NewPostStore>((set) => ({
  videoUri: "",
  setVideoUri: (uri) => set({ videoUri: uri }),
  reset: () => set({ videoUri: "" }),
}));
