import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async enviarCorreo(destino: string, asunto: string, html: string) {
    const { data, error } = await this.resend.emails.send({
      from: 'TuApp <noreply@tudominio.com>',
      to: [destino],
      subject: asunto,
      html,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async enviarCorreoConAdjunto({
    to,
    subject,
    html,
    attachments,
  }: {
    to: string;
    subject: string;
    html: string;
    attachments: { filename: string; content: string }[];
  }) {
    const { data, error } = await this.resend.emails.send({
      from: 'TuApp <noreply@tudominio.com>',
      to: [to],
      subject,
      html,
      attachments,
    });

    if (error) throw new Error(error.message);
    return data;
  }
}
