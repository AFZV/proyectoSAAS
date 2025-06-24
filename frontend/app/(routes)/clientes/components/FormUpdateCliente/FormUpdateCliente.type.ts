import { Dispatch, SetStateAction } from "react";

export type FormUpdateClienteProps = {
  setOpenModalUpdate: Dispatch<SetStateAction<boolean>>;
  onSuccess: Promise<void>;
};
