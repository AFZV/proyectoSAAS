import { Dispatch, ReactNode, SetStateAction } from "react";

export type HeaderPanelsProps = {
  title: string;
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription?: string;
  children: (setOpenModal: Dispatch<SetStateAction<boolean>>) => ReactNode;
};
