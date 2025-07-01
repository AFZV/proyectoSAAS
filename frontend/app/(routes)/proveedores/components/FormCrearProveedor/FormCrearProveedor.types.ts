import { Dispatch, SetStateAction } from "react";

export type CrearProveedorProps = {
  setOpenModalCreate: Dispatch<SetStateAction<boolean>>;
  onSuccess?: () => void;
};
