import { Dispatch, SetStateAction } from "react";

export type FormUpdateRecaudoProps = {
  setOpenModalUpdate: Dispatch<SetStateAction<boolean>>;
  onSuccess?: () => void;
};
