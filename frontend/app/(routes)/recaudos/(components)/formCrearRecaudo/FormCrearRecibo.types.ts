import { Dispatch, SetStateAction } from "react";

export type FormCrearReciboProps = {
  setOpenModalCreate: Dispatch<SetStateAction<boolean>>;
  onSuccess?: () => void; // ✅ Añadir esta línea
};
