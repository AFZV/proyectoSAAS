import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";

export function DatePickerWithRange({
  onSelect,
  onClose,
  rol,
}: {
  onSelect?: (range: DateRange | undefined) => void;
  onClose?: () => void;
  rol: string;
}) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  const { userId } = useAuth();
  const [nombreVendedor, setNombreVendedor] = useState<string>("");

  function handleSelect(range: DateRange | undefined) {
    setDate(range);
    if (range?.from && range?.to) {
      onSelect?.(range);
    }
  }

  async function exportarFechas(date: DateRange) {
    if (!date?.from || !date?.to) return;

    // Realiza la llamada al backend con los parámetros correctos
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/recibos/exportar`,
      {
        method: "POST",
        body: JSON.stringify({
          from: date.from.toISOString(),
          to: date.to.toISOString(),
          nombreVendedor: nombreVendedor, // El nombre del vendedor es dinámico aquí
          userId, // El userId del usuario autenticado
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      // En caso de que la respuesta no sea correcta, muestra un error

      return;
    }

    // Convierte la respuesta del backend en un blob
    const blob = await res.blob();

    // Crea un enlace temporal para descargar el archivo
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nombreVendedor}.xlsx`; // Nombre del archivo basado en el vendedor
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <>
      {rol === "admin" && (
        <div className="grid gap-4">
          <div className="text-sm text-muted-foreground">
            Rango seleccionado:{" "}
            {date?.from && date?.to
              ? `${format(date.from, "LLL dd, y")} - ${format(
                  date.to,
                  "LLL dd, y"
                )}`
              : "Ninguno"}
          </div>
          <Calendar
            mode="range"
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            defaultMonth={new Date()}
          />
          <select
            value={nombreVendedor}
            name="vendedor"
            id="vendedor"
            onChange={(e) => {
              const target = e.target as HTMLSelectElement;
              setNombreVendedor(target.value); // Al seleccionar un vendedor, se actualiza el estado
            }}
          >
            <option value="">Selecciona un vendedor</option>
            <option value="alexis">ALEXIS ZULUAGA</option>
            <option value="gloria">GLORIA HOYOS</option>
            <option value="felipe">FELIPE NOREÑA</option>
            <option value="milton">MILTON ROSERO</option>
            <option value="alexander">ALEXANDER FERNANDEZ</option>
            <option value="alexis-noreña">ALEXIS NOREÑA</option>
            <option value="isabella">ISABELLA</option>
            <option value="todos">TODOS</option>{" "}
            {/* Opción para seleccionar todos los vendedores */}
          </select>
          <Button
            onClick={() => {
              exportarFechas(date as DateRange); // Llamamos a la función con las fechas seleccionadas
              onClose?.(); // Si hay una función para cerrar, la ejecutamos
            }}
          >
            Exportar
          </Button>
        </div>
      )}
    </>
  );
}
