import nodemailer from "nodemailer";

type EnviarEmailParams = {
  para: string;
  assunto: string;
  texto: string;
  html: string;
};

function smtpConfigurado(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  );
}

export async function enviarEmail(params: EnviarEmailParams): Promise<boolean> {
  if (!smtpConfigurado()) {
    console.info(
      "[email] SMTP não configurado. Mensagem simulada:",
      params.para,
      params.assunto,
      params.texto,
    );
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.para,
    subject: params.assunto,
    text: params.texto,
    html: params.html,
  });

  return true;
}

export function obterUrlBaseApp(request?: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (request) {
    const origin = request.headers.get("origin") ?? request.headers.get("host");
    if (origin) {
      const comProtocolo = origin.startsWith("http")
        ? origin
        : `http://${origin}`;
      return comProtocolo.replace(/\/$/, "");
    }
  }

  return "http://localhost:3000";
}
