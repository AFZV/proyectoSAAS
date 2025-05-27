import { EmailTemplateForRecaudos } from "@/components/Email-template/Email-template";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();
  const {
    numeroRecibo,
    customer,
    ciudad,
    email,
    valor,
    tipo,
    concepto,
    actualizacion,
  } = body;

  try {
    const { data, error } = await resend.emails.send({
      from: "noreply@softversedevs.com",
      to: email,
      subject: actualizacion
        ? "Actualización de Recibo de pago"
        : "Recibo de pago",
      react: EmailTemplateForRecaudos({
        numeroRecibo,
        customer,
        ciudad,
        valor,
        tipo,
        concepto,
        actualizacion,
      }),
    });

    if (error) return Response.json({ error }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
