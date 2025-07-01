import { Dispatch, SetStateAction } from "react";

export type FormCrearUsuarioProps = {
  setOpenModalUsuarioCreate: Dispatch<SetStateAction<boolean>>;
  refetchUsuarios: () => void;
  usuarioId?: string;
};
