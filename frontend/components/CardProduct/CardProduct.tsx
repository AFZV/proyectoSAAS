"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { ShoppingCartIcon } from "lucide-react";
import { ProductProps } from "./CardProduct.type";

export function CardProduct({
  producto,
  onAgregar,
}: {
  producto: ProductProps;
  onAgregar: (item: ProductProps & { cantidad: number }) => void;
}) {
  const { imagenUrl, nombre, precio, categoria } = producto;

  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [cantidad, setCantidad] = useState(1);

  const handleAgregarAlCarrito = () => {
    onAgregar({ ...producto, cantidad });
    setIsOpenModal(false);
    setCantidad(1);
  };

  return (
    <>
      <div className="card bg-base-100 w-120 shadow-xl hover:bg-slate-100 rounded-2xl ">
        <figure className="m-2">
          <img src={imagenUrl} alt={nombre} className="rounded-2xl" />
        </figure>
        <div className="card-body grid grid-cols-2 text-center ">
          <h2 className="card-title col-span-2 pb-2">{nombre.toUpperCase()}</h2>
          <p className="pb-2">Categoria-{categoria.toUpperCase()}</p>
          <p className="pb-5">Precio-{precio.valueOf()}</p>
          <div className="card-actions col-span-3">
            <Button onClick={() => setIsOpenModal(true)} className="mb-3">
              Comprar
              <ShoppingCartIcon />
            </Button>
          </div>
          {/**aca va el boton de editar  */}
        </div>
      </div>
      {isOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-2">{nombre}</h3>
            <p>Categoria: {categoria}</p>
            <p>Precio: {precio}</p>
            <div className="my-4">
              <label className="block mb-1" autoFocus={true}>
                Cantidad:
              </label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="border border-gray-300 p-2 w-full rounded"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsOpenModal(false)} variant="secondary">
                Cancelar
              </Button>
              <Button onClick={handleAgregarAlCarrito}>Agregar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
