import { Dispatch, SetStateAction } from "react";

export type FormUpdateProveedorProps = {
  setOpenModalUpdate: Dispatch<SetStateAction<boolean>>;
  onSuccess?: () => void;
};
