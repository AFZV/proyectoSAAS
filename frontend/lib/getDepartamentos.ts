export async function getDepartamentos() {
  const res = await fetch("https://api-colombia.com/api/v1/Department");

  if (!res.ok) {
    throw new Error("Error al obtener los datos");
  }

  const data = await res.json();

  return Response.json(data);
}
