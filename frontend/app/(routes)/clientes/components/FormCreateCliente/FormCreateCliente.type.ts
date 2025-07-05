import { Dispatch, SetStateAction } from "react";

export type FormCreateClienteProps = {
  setOpenModalCreate: Dispatch<SetStateAction<boolean>>;
  onSuccess?: () => void; // Callback opcional para refrescar datos
};