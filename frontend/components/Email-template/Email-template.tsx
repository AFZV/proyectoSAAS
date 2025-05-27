import * as React from "react";

interface EmailTemplateProps {
  numeroRecibo: string;
  customer: string;
  ciudad: string;
  valor: number;
  tipo: string;
  concepto: string;
  actualizacion?: boolean;
}

export const EmailTemplateForRecaudos: React.FC<
  Readonly<EmailTemplateProps>
> = ({
  numeroRecibo,
  customer,
  ciudad,
  valor,
  tipo,
  concepto,
  actualizacion,
}) => (
  <div
    style={{
      fontFamily: "Arial, sans-serif",
      maxWidth: "600px",
      margin: "0 auto",
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      padding: "24px",
      backgroundColor: "#ffffff",
    }}
  >
    <h2
      style={{
        color: "#2d3748",
        borderBottom: "2px solid #e2e8f0",
        paddingBottom: "12px",
        marginBottom: "24px",
      }}
    >
      Recibo de Pago
    </h2>

    <table style={{ width: "100%", fontSize: "16px" }}>
      <tbody>
        <tr>
          <td style={{ fontWeight: "bold", padding: "8px 0" }}>
            Numero De recibo:
          </td>
          <td>{numeroRecibo}</td>
        </tr>
        <tr>
          <td style={{ fontWeight: "bold", padding: "8px 0" }}>Cliente:</td>
          <td>{customer}</td>
        </tr>
        <tr>
          <td style={{ fontWeight: "bold", padding: "8px 0" }}>Ciudad:</td>
          <td>{ciudad}</td>
        </tr>
        <tr>
          <td style={{ fontWeight: "bold", padding: "8px 0" }}>Valor:</td>
          <td style={{ color: "#3182ce" }}>
            $
            {valor.toLocaleString("es-CO", {
              minimumFractionDigits: 0,
            })}
          </td>
        </tr>
        <tr>
          <td style={{ fontWeight: "bold", padding: "8px 0" }}>
            Tipo de pago:
          </td>
          <td>{tipo.toUpperCase()}</td>
        </tr>
        <tr>
          <td style={{ fontWeight: "bold", padding: "8px 0" }}>Concepto:</td>
          <td>{concepto}</td>
        </tr>
      </tbody>
    </table>

    {actualizacion ? (
      <p
        style={{
          marginTop: "32px",
          fontSize: "14px",
          color: "#4a5568",
          fontWeight: "bold",
        }}
      >
        Esta es una corrección al recibo: {numeroRecibo}. Por favor omitir el
        anterior, este es el recibo final actualizado.
      </p>
    ) : (
      <p
        style={{
          marginTop: "32px",
          fontSize: "14px",
          color: "#4a5568",
        }}
      >
        Gracias por su pago. Este correo es una confirmación automática de su
        transacción. Si tiene alguna duda, comuníquese con su asesor de ventas.
      </p>
    )}
  </div>
);
