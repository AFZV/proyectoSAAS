"use client";
// app/reportes/services/reportes.service.ts

import { useAuth } from "@clerk/nextjs";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ReportesService {
  /**
   * Maneja la descarga de archivos desde el backend
   */
  private static async handleDownload(response: Response, filename: string) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error ${response.status}: ${errorText || response.statusText}`
      );
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Obtiene headers con token de autenticación (para client components)
   */
  private static async getHeaders(): Promise<Record<string, string>> {
    try {
      const token =
        localStorage.getItem("clerk_token") ||
        sessionStorage.getItem("clerk_token");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      return headers;
    } catch (error) {
      console.warn("No se pudo obtener el token:", error);
      return {
        "Content-Type": "application/json",
      };
    }
  }

  // ========== REPORTES DE INVENTARIO ==========

  /**
   * Genera reporte general de inventario
   */
  static async generarInventarioGeneral(data: {
    formato: "excel" | "pdf";
    fechaInicio: string;
    fechaFin: string;
  }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/inventario/${data.formato}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fechaInicio: new Date(data.fechaInicio).toISOString(),
          fechaFin: new Date(data.fechaFin).toISOString(),
        }),
      }
    );

    await this.handleDownload(
      response,
      `reporte-inventario.${data.formato === "excel" ? "xlsx" : "pdf"}`
    );
  }

  /**
   * Genera reporte de inventario por rango de letras
   */
  static async generarInventarioRango(data: {
    formato: "excel" | "pdf";
    palabraClave: string;
  }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/buscar/palabraClave/${data.formato}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          palabraClave: data.palabraClave,
        }),
      }
    );

    await this.handleDownload(
      response,
      `inventario_${data.palabraClave}.${
        data.formato === "excel" ? "xlsx" : "pdf"
      }`
    );
  }

  // ========== REPORTES DE CLIENTES ==========

  /**
   * Genera reporte de todos los clientes
   */
  static async generarClientesTodas(data: { formato: "excel" | "pdf" }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/clientes/${data.formato}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      }
    );

    await this.handleDownload(
      response,
      `reporte-clientes.${data.formato === "excel" ? "xlsx" : "pdf"}`
    );
  }

  /**
   * Genera reporte de clientes por ciudad
   */
  static async generarClientesCiudad(data: {
    formato: "excel" | "pdf";
    ciudad: string;
  }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/clientes/ciudad/${data.formato}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          ciudad: data.ciudad.toUpperCase(),
        }),
      }
    );

    await this.handleDownload(
      response,
      `clientes-${data.ciudad}.${data.formato === "excel" ? "xlsx" : "pdf"}`
    );
  }

  /**
   * Genera reporte de clientes por vendedor
   */
  static async generarClientesVendedor(data: {
    formato: "excel" | "pdf";
    vendedorId: string;
  }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/clientes/vendedor/${data.vendedorId}/${data.formato}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      }
    );

    await this.handleDownload(
      response,
      `clientes-vendedor.${data.formato === "excel" ? "xlsx" : "pdf"}`
    );
  }

  // ========== REPORTES DE PEDIDOS ==========

  /**
   * Genera reporte de todos los pedidos
   */
  static async generarPedidosTodos(data: {
    formato: "excel" | "pdf";
    fechaInicio: string;
    fechaFin: string;
  }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/pedidos/${data.formato}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fechaInicio: new Date(data.fechaInicio).toISOString(),
          fechaFin: new Date(data.fechaFin).toISOString(),
        }),
      }
    );

    await this.handleDownload(
      response,
      `reporte-pedidos.${data.formato === "excel" ? "xlsx" : "pdf"}`
    );
  }

  /**
   * Genera reporte de pedidos por vendedor
   */
  static async generarPedidosVendedor(data: {
    formato: "excel" | "pdf";
    fechaInicio: string;
    fechaFin: string;
    vendedorId: string;
  }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/pedidos/${data.formato}/${data.vendedorId}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fechaInicio: new Date(data.fechaInicio).toISOString(),
          fechaFin: new Date(data.fechaFin).toISOString(),
        }),
      }
    );

    await this.handleDownload(
      response,
      `pedidos-vendedor.${data.formato === "excel" ? "xlsx" : "pdf"}`
    );
  }

  // ========== REPORTES DE CARTERA ==========

  /**
   * Genera reporte de cartera general
   */
  static async generarCarteraGeneral(data: {
    formato: "excel" | "pdf";
    fechaInicio: string;
    fechaFin: string;
  }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/cartera/${data.formato}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fechaInicio: new Date(data.fechaInicio).toISOString(),
          fechaFin: new Date(data.fechaFin).toISOString(),
        }),
      }
    );

    await this.handleDownload(
      response,
      `cartera-pendiente.${data.formato === "excel" ? "xlsx" : "pdf"}`
    );
  }

  /**
   * Genera reporte de cartera por vendedor
   */
  static async generarCarteraVendedor(data: {
    formato: "excel" | "pdf";
    fechaInicio: string;
    fechaFin: string;
    vendedorId: string;
  }) {
    const headers = await this.getHeaders();
    const response = await fetch(
      `${BACKEND_URL}/reportes/cartera/${data.formato}/vendedor/${data.vendedorId}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fechaInicio: new Date(data.fechaInicio).toISOString(),
          fechaFin: new Date(data.fechaFin).toISOString(),
        }),
      }
    );

    await this.handleDownload(
      response,
      `cartera-vendedor.${data.formato === "excel" ? "xlsx" : "pdf"}`
    );
  }

  // ========== MÉTODO PRINCIPAL PARA EL FORMULARIO ==========

  /**
   * Genera cualquier tipo de reporte basado en tipo y opción
   */
  static async generarReporte(
    tipo: "inventario" | "clientes" | "pedidos" | "cartera",
    opcion: string,
    data: any
  ) {
    switch (tipo) {
      case "inventario":
        if (opcion === "general") {
          return this.generarInventarioGeneral(data);
        } else if (opcion === "rango") {
          return this.generarInventarioRango(data);
        }
        break;

      case "clientes":
        if (opcion === "todos") {
          return this.generarClientesTodas(data);
        } else if (opcion === "ciudad") {
          return this.generarClientesCiudad(data);
        } else if (opcion === "vendedor") {
          return this.generarClientesVendedor(data);
        }
        break;

      case "pedidos":
        if (opcion === "todos") {
          return this.generarPedidosTodos(data);
        } else if (opcion === "vendedor") {
          return this.generarPedidosVendedor(data);
        }
        break;

      case "cartera":
        if (opcion === "general") {
          return this.generarCarteraGeneral(data);
        } else if (opcion === "vendedor") {
          return this.generarCarteraVendedor(data);
        }
        break;

      default:
        throw new Error(`Tipo de reporte no soportado: ${tipo} - ${opcion}`);
    }
  }
}
