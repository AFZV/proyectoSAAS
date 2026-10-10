"use client";

import React, { useMemo, useState } from "react";
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

export type SortBy = "fecha" | "nombre" | "revisado";
export type SortDir = "asc" | "desc";

const SORT_COLUMN_TO_SORT_BY: Record<string, SortBy> = {
  Fechacrecion: "fecha",
  nombre: "nombre",
  revisado: "revisado",
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading: boolean;
  totalItems: number;
  pageIndex: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortBy: SortBy;
  sortDir: SortDir;
  onSortChange: (sortBy: SortBy, sortDir: SortDir) => void;
}

// Antes esta tabla traía TODOS los recibos de la empresa y paginaba/filtraba/ordenaba
// del lado del navegador (getPaginationRowModel/getFilteredRowModel). Ahora el servidor
// ya entrega solo la página pedida, así que la tabla opera en modo manual: solo refleja
// el estado que le pasa el padre (ListRecaudos) y le avisa cuando el usuario pide un
// cambio de página, búsqueda u orden.
export function ClienteDataTable<TData, TValue>({
  columns,
  data,
  loading,
  totalItems,
  pageIndex,
  pageCount,
  onPageChange,
  searchValue,
  onSearchChange,
  sortBy,
  sortDir,
  onSortChange,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    {}
  );

  const sortColumnId = useMemo(
    () =>
      Object.entries(SORT_COLUMN_TO_SORT_BY).find(
        ([, by]) => by === sortBy
      )?.[0] ?? "Fechacrecion",
    [sortBy]
  );
  const sorting: SortingState = [
    { id: sortColumnId, desc: sortDir === "desc" },
  ];

  const pagination = useMemo(
    () => ({ pageIndex, pageSize: 20 }),
    [pageIndex]
  );

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    pageCount: pageCount || 1,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any) => row.id, // 👈 clave estable por registro
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater;
      const col = next[0];
      if (!col) return;
      const by = SORT_COLUMN_TO_SORT_BY[col.id] ?? sortBy;
      onSortChange(by, col.desc ? "desc" : "asc");
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      onPageChange(next.pageIndex);
    },
  });

  const rangeStart = totalItems === 0 ? 0 : pageIndex * 20 + 1;
  const rangeEnd = Math.min((pageIndex + 1) * 20, totalItems);

  return (
    <div className="space-y-4">
      {/* Filtros superiores */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por NIT o nombre..."
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-10 w-[260px] sm:w-[280px] md:w-[320px] lg:w-[360px]"
          />
          {loading && (
            <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Control de columnas visibles */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabla */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.original.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Search className="w-8 h-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No se encontraron clientes
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Intenta ajustar los filtros de búsqueda
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {rangeStart} a {rangeEnd} de {totalItems} clientes
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || loading}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: table.getPageCount() }, (_, i) => i + 1)
              .slice(
                Math.max(0, pageIndex - 2),
                Math.min(table.getPageCount(), pageIndex + 3)
              )
              .map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={pageNumber === pageIndex + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => table.setPageIndex(pageNumber - 1)}
                  disabled={loading}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || loading}
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
