export async function getCiudades(id: string) {
  const res = await fetch(
    `https://api-colombia.com/api/v1/Department/${id}/cities`
  );

  if (!res.ok) {
    throw new Error("Error al obtener los datos");
  }

  const data = await res.json();
  console.log(data);
  return data;
}
