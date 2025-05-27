"use client";
import { CardProduct } from "@/components/CardProduct";
import { ProductProps } from "@/components/CardProduct/CardProduct.type";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Carrito } from "../Carrito";
import { ClienteDatos, ClientePedido } from "../BuscarClienteModal";

export function ListProducts({
  productos,
  categoria,
}: {
  productos: ProductProps[];
  categoria: string;
}) {
  const [carrito, setCarrito] = useState<
    (ProductProps & { cantidad: number })[]
  >([]);
  const router = useRouter();
  const [observacion, setObservacion] = useState<string>("");
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [cliente, setCliente] = useState<ClientePedido>({
    id: "",
    nit: "",
    apellidos: "",
    nombres: "",
    ciudad: "",
    telefono: "",
    direccion: "",
  });
  const [clienteEncontrado, setClienteEncontrado] = useState<boolean>(false);
  const [nit, setNit] = useState<string>("");
  const handleEliminar = (index: number) => {
    setCarrito((prevCarrito) => prevCarrito.filter((_, i) => i !== index));
  };

  const total = carrito.reduce(
    (acumuluado, producto) => acumuluado + producto.precio * producto.cantidad,
    0
  );
  const handleFinalizarPedido = async () => {
    if (cliente.id) {
      try {
        const response = await fetch("/api/pedido", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            carrito,
            observacion,
            clienteId: cliente.id,
          }),
        });

        const data = await response.json();
        console.log("esto va en data a pedidos:", data);
        if (data.success) {
          console.log("Pedido guardado:", data.pedido);
          router.push(`/`);
          router.refresh();
        } else {
          console.error("Error en el servidor:", data.error);
        }
      } catch (error) {
        console.error("Error al enviar pedido:", error);
      }
    } else {
      console.warn(
        "Por favor, busca y selecciona un cliente antes de finalizar el pedido."
      );
    }
  };

  const handleAgregarAlCarrito = (
    nuevoProducto: ProductProps & { cantidad: number }
  ) => {
    setCarrito((prev) => {
      const index = prev.findIndex(
        (item) => item.nombre === nuevoProducto.nombre
      );
      if (index !== -1) {
        const actualizado = prev.map((item, i) =>
          i === index
            ? { ...item, cantidad: item.cantidad + nuevoProducto.cantidad }
            : item
        );
        setIsOpenModal(true);
        return actualizado;
      }
      setIsOpenModal(true);
      return [...prev, nuevoProducto];
    });
  };

  return (
    <div
      className="grid md:grid-cols-2
            xl:grid-cols-3 gap-12
            place-items-center mt-2
        "
    >
      {categoria
        ? productos
            .filter((producto) => producto.categoria === categoria)
            .map((producto) => (
              <CardProduct
                onAgregar={handleAgregarAlCarrito}
                producto={producto}
                key={producto.imagenUrl}
              />
            ))
        : productos.map((producto) => (
            <CardProduct
              onAgregar={handleAgregarAlCarrito}
              producto={producto}
              key={producto.imagenUrl}
            />
          ))}

      {isOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-h-[80vh] overflow-y-auto mx-4">
            {clienteEncontrado ? (
              <ClienteDatos
                clienteEncontrado={clienteEncontrado}
                cliente={cliente}
                setClienteEncontrado={setClienteEncontrado}
                setCliente={setCliente}
              />
            ) : (
              <ClienteDatos
                clienteEncontrado={clienteEncontrado}
                cliente={cliente}
                setClienteEncontrado={setClienteEncontrado}
                setCliente={setCliente}
                nit={nit}
                setNit={setNit}
              />
            )}

            <Carrito
              carrito={carrito}
              total={total}
              handleEliminar={handleEliminar}
              observacion={observacion}
              setObservacion={setObservacion}
            />
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => setIsOpenModal(false)}
                className="bg-sky-700"
              >
                Seguir en pedido
              </Button>
              <Button
                onClick={handleFinalizarPedido}
                className="bg-green-700"
                disabled={!clienteEncontrado}
              >
                Finalizar Pedido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
