import { db } from "../db";
import { ProductsType } from "./product.types";

export async function getAllProducts(): Promise<ProductsType[]> {
  const products = await db.producto.findMany({
    orderBy: {
      nombre: "asc",
    },
  });
  return products;
}
