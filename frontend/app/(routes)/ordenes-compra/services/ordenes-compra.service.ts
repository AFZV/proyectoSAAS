import type {
  OrdenCompraResumen,
  ProveedorOC,
  ProductoParaOC,
  CreateOrdenCompraPayload,
} from "../types/ordenes-compra.types";

const API = process.env.NEXT_PUBLIC_API_URL;

async function req<T>(
  url: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || "Error en la petición");
  }
  return res.json();
}

export async function listarOrdenesCompra(
  token: string,
): Promise<OrdenCompraResumen[]> {
  try {
    const res = await fetch(`${API}/ordenes-compra`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function crearOrdenCompra(
  token: string,
  data: CreateOrdenCompraPayload,
): Promise<OrdenCompraResumen> {
  return req(`${API}/ordenes-compra`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function eliminarOrdenCompra(
  token: string,
  id: string,
): Promise<void> {
  await req(`${API}/ordenes-compra/${id}`, token, { method: "DELETE" });
}

export async function actualizarEstadoOC(
  token: string,
  id: string,
  estado: string,
): Promise<OrdenCompraResumen> {
  return req(`${API}/ordenes-compra/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export async function getProveedoresParaOC(
  token: string,
): Promise<ProveedorOC[]> {
  try {
    const res = await fetch(`${API}/proveedores/all`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getProductosParaOC(
  token: string,
): Promise<ProductoParaOC[]> {
  try {
    const [prodRes, catRes] = await Promise.all([
      fetch(`${API}/productos/empresa/activos`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${API}/productos/categoria/empresa`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    if (!prodRes.ok) return [];

    const { productos } = await prodRes.json();
    const categorias: { idCategoria: string; nombre: string }[] = catRes.ok
      ? (await catRes.json()).categorias
      : [];
    const catMap = new Map(categorias.map((c) => [c.idCategoria, c.nombre]));

    return (productos as any[])
      .filter((p) => p.estado === "activo") // por si acaso: nunca mostrar inactivos en la OC
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        referencia: p.referencia,
        imagenUrl: p.imagenUrl,
        precioCompra: p.precioCompra,
        precioCompraExterior: p.precioCompraExterior,
        monedaCompraExterior: p.monedaCompraExterior,
        unidadesPorBulto: p.unidadesPorBulto,
        pesoPorBulto: p.pesoPorBulto,
        cubicajePorBulto: p.cubicajePorBulto,
        stock: p.inventario?.[0]?.stockActual ?? 0,
        stockReferencia: p.inventario?.[0]?.stockReferenciaOinicial ?? undefined,
        categoria: catMap.get(p.categoriaId) ?? "",
      }));
  } catch {
    return [];
  }
}

export async function descargarExcelOC(
  token: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${API}/ordenes-compra/${id}/excel`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Error al generar el Excel");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `OC-${id.slice(0, 8).toUpperCase()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
