"""
email.py
--------
Email configuration and transactional email helpers using fastapi-mail.

All functions are async and should be called via FastAPI BackgroundTasks
so they never block the HTTP response.

.env required keys:
    MAIL_USERNAME   — Gmail address used to send (e.g. contato@empresa.com)
    MAIL_PASSWORD   — Gmail App Password (not the account password)
    MAIL_FROM       — From address shown to the recipient
    MAIL_FROM_NAME  — Display name (e.g. "Flor de Liz")
    FRONTEND_URL    — Base URL of the web app (e.g. http://localhost:8081)
"""

import os
from datetime import datetime
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

_DAYS_PT = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
_MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
               "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]


def _format_datetime_pt(iso: str) -> tuple[str, str]:
    """Returns (date_str, time_str) formatted in Brazilian Portuguese."""
    dt = datetime.fromisoformat(iso)
    date_str = f"{_DAYS_PT[dt.weekday()]}, {dt.day} de {_MONTHS_PT[dt.month - 1]} de {dt.year}"
    time_str = dt.strftime("%H:%M")
    return date_str, time_str

_conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", ""),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "Flor de Liz"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

_mailer = FastMail(_conf)


async def send_registration_confirmation(company_name: str, to_email: str) -> None:
    """
    Sends a welcome e-mail after a company is successfully registered.
    Called as a background task — failures are silently logged, never raised.
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8081")

    html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background-color:#f5f0ee;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0ee;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background-color:#fcfaf9;border-radius:12px;padding:40px;font-family:Arial,sans-serif;color:#3d2b2b;">

              <!-- Header -->
              <tr>
                <td style="padding-bottom:8px;">
                  <p style="margin:0;font-size:15px;font-weight:600;color:#8e7f7e;letter-spacing:1px;text-transform:uppercase;">Sistema de Agendamentos</p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 0;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Body -->
              <tr>
                <td>
                  <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">
                    Cadastro confirmado! ✓
                  </h2>
                  <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                    Olá, <strong>{company_name}</strong>.
                  </p>
                  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                    Seu cadastro no Sistema de Agendamentos foi realizado com sucesso.
                    Agora você pode acessar sua conta e começar a gerenciar seus agendamentos.
                  </p>

                  <!-- CTA Button -->
                  <a href="{frontend_url}"
                     style="display:inline-block;padding:14px 32px;background-color:#8e7f7e;
                            color:#ffffff;text-decoration:none;border-radius:8px;
                            font-size:15px;font-weight:600;">
                    Acessar o sistema
                  </a>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:32px 0 16px;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Footer -->
              <tr>
                <td style="font-size:12px;color:#c2b4b2;line-height:1.6;">
                  Este e-mail foi enviado automaticamente. Por favor, não responda.<br />
                  Se você não realizou este cadastro, ignore este e-mail.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Cadastro confirmado — Sistema de Agendamentos",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )

    try:
        await _mailer.send_message(message)
    except Exception as exc:
        # Log but never crash the application over an email failure
        print(f"[email] Failed to send registration confirmation to {to_email}: {exc}")


async def send_professional_invite(
    professional_name: str,
    to_email: str,
    invite_link: str,
    company_name: str = "",
) -> None:
    """
    Sends a personalised invite e-mail to a new professional.
    The invite_link is a one-time Supabase link that lets them set their password.
    Called as a background task — failures are silently logged, never raised.
    """
    html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background-color:#f5f0ee;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0ee;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background-color:#fcfaf9;border-radius:12px;padding:40px;font-family:Arial,sans-serif;color:#3d2b2b;">

              <!-- Header -->
              <tr>
                <td style="padding-bottom:8px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:#8e7f7e;">{company_name}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#a08c8b;">Sistema de Agendamentos</p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 0;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Body -->
              <tr>
                <td>
                  <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">
                    Você foi convidado!
                  </h2>
                  <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                    Olá, <strong>{professional_name}</strong>.
                  </p>
                  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                    Você foi cadastrado como profissional no sistema {company_name}.
                    Clique no botão abaixo para definir sua senha e ativar seu acesso.
                  </p>
                  <p style="margin:0 0 24px;font-size:13px;color:#a08c8b;line-height:1.6;">
                    Este link é de uso único e expira em 24 horas.
                  </p>

                  <!-- CTA Button -->
                  <a href="{invite_link}"
                     style="display:inline-block;padding:14px 32px;background-color:#8e7f7e;
                            color:#ffffff;text-decoration:none;border-radius:8px;
                            font-size:15px;font-weight:600;">
                    Definir minha senha
                  </a>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:32px 0 16px;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Footer -->
              <tr>
                <td style="font-size:12px;color:#c2b4b2;line-height:1.6;">
                  Este e-mail foi enviado automaticamente. Por favor, não responda.<br />
                  Se você não esperava este convite, ignore este e-mail com segurança.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject=f"Você foi convidado — {company_name}",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )

    try:
        await _mailer.send_message(message)
    except Exception as exc:
        print(f"[email] Failed to send professional invite to {to_email}: {exc}")


async def send_appointment_notification(
    client_name: str,
    to_email: str,
    starts_at_iso: str,
    professional_name: str,
    company_name: str = "",
) -> None:
    """
    Sends an appointment confirmation e-mail to a client.
    Called as a background task — failures are silently logged, never raised.
    """
    date_str, time_str = _format_datetime_pt(starts_at_iso)

    html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background-color:#f5f0ee;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0ee;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background-color:#fcfaf9;border-radius:12px;padding:40px;font-family:Arial,sans-serif;color:#3d2b2b;">

              <!-- Header -->
              <tr>
                <td style="padding-bottom:8px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:#8e7f7e;">{company_name}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#a08c8b;">Sistema de Agendamentos</p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 0;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Body -->
              <tr>
                <td>
                  <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">
                    Agendamento confirmado!
                  </h2>
                  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
                    Olá, <strong>{client_name}</strong>. Seu agendamento foi realizado com sucesso.
                    Confira os detalhes abaixo:
                  </p>

                  <!-- Info box -->
                  <table width="100%" cellpadding="0" cellspacing="0"
                         style="background-color:#f5f0ee;border-radius:10px;padding:20px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e8ddd9;">
                        <span style="font-size:11px;font-weight:700;color:#a08c8b;text-transform:uppercase;letter-spacing:0.5px;">Data</span><br />
                        <span style="font-size:15px;color:#3d2b2b;">{date_str}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e8ddd9;">
                        <span style="font-size:11px;font-weight:700;color:#a08c8b;text-transform:uppercase;letter-spacing:0.5px;">Horário</span><br />
                        <span style="font-size:15px;color:#3d2b2b;">{time_str}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="font-size:11px;font-weight:700;color:#a08c8b;text-transform:uppercase;letter-spacing:0.5px;">Profissional</span><br />
                        <span style="font-size:15px;color:#3d2b2b;">{professional_name}</span>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:14px;color:#a08c8b;line-height:1.6;">
                    Caso precise remarcar ou cancelar, entre em contato com o nosso atendimento.
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:32px 0 16px;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Footer -->
              <tr>
                <td style="font-size:12px;color:#c2b4b2;line-height:1.6;">
                  Este e-mail foi enviado automaticamente. Por favor, não responda.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject=f"Agendamento confirmado — {company_name}",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )

    try:
        await _mailer.send_message(message)
    except Exception as exc:
        print(f"[email] Failed to send appointment notification to {to_email}: {exc}")


async def send_password_reset(to_email: str, reset_link: str) -> None:
    """
    Sends a branded password reset e-mail.
    Called as a background task — failures are silently logged, never raised.
    """
    html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background-color:#f5f0ee;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0ee;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background-color:#fcfaf9;border-radius:12px;padding:40px;font-family:Arial,sans-serif;color:#3d2b2b;">

              <!-- Header -->
              <tr>
                <td style="padding-bottom:8px;">
                  <p style="margin:0;font-size:15px;font-weight:600;color:#8e7f7e;letter-spacing:1px;text-transform:uppercase;">Sistema de Agendamentos</p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 0;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Body -->
              <tr>
                <td>
                  <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">
                    Redefinição de senha
                  </h2>
                  <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                    Recebemos uma solicitação para redefinir a senha da sua conta.
                  </p>
                  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                    Clique no botão abaixo para criar uma nova senha. O link é de uso único e expira em 1 hora.
                  </p>

                  <!-- CTA Button -->
                  <a href="{reset_link}"
                     style="display:inline-block;padding:14px 32px;background-color:#8e7f7e;
                            color:#ffffff;text-decoration:none;border-radius:8px;
                            font-size:15px;font-weight:600;">
                    Redefinir minha senha
                  </a>

                  <p style="margin:24px 0 0;font-size:13px;color:#a08c8b;line-height:1.6;">
                    Se você não solicitou a redefinição de senha, ignore este e-mail com segurança.
                    Sua senha não será alterada.
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:32px 0 16px;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Footer -->
              <tr>
                <td style="font-size:12px;color:#c2b4b2;line-height:1.6;">
                  Este e-mail foi enviado automaticamente. Por favor, não responda.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Redefinição de senha — Sistema de Agendamentos",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )

    try:
        await _mailer.send_message(message)
    except Exception as exc:
        print(f"[email] Failed to send password reset to {to_email}: {exc}")


async def send_appointment_reminder(
    client_name: str,
    to_email: str,
    starts_at_iso: str,
    professional_name: str,
    company_name: str = "",
) -> None:
    """
    Sends a reminder e-mail to a client before their appointment.
    Called as a background task — failures are silently logged, never raised.
    """
    date_str, time_str = _format_datetime_pt(starts_at_iso)

    html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8" /></head>
    <body style="margin:0;padding:0;background-color:#f5f0ee;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0ee;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background-color:#fcfaf9;border-radius:12px;padding:40px;font-family:Arial,sans-serif;color:#3d2b2b;">

              <!-- Header -->
              <tr>
                <td style="padding-bottom:8px;">
                  <p style="margin:0;font-size:22px;font-weight:700;color:#8e7f7e;">{company_name}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#a08c8b;">Sistema de Agendamentos</p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:16px 0;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Body -->
              <tr>
                <td>
                  <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">
                    Lembrete de agendamento
                  </h2>
                  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
                    Olá, <strong>{client_name}</strong>. Este é um lembrete do seu agendamento de hoje:
                  </p>

                  <!-- Info box -->
                  <table width="100%" cellpadding="0" cellspacing="0"
                         style="background-color:#f5f0ee;border-radius:10px;padding:20px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e8ddd9;">
                        <span style="font-size:11px;font-weight:700;color:#a08c8b;text-transform:uppercase;letter-spacing:0.5px;">Data</span><br />
                        <span style="font-size:15px;color:#3d2b2b;">{date_str}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e8ddd9;">
                        <span style="font-size:11px;font-weight:700;color:#a08c8b;text-transform:uppercase;letter-spacing:0.5px;">Horário</span><br />
                        <span style="font-size:15px;color:#3d2b2b;">{time_str}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="font-size:11px;font-weight:700;color:#a08c8b;text-transform:uppercase;letter-spacing:0.5px;">Profissional</span><br />
                        <span style="font-size:15px;color:#3d2b2b;">{professional_name}</span>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:14px;color:#a08c8b;line-height:1.6;">
                    Caso precise remarcar ou cancelar, entre em contato com o nosso atendimento.
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="padding:32px 0 16px;">
                <hr style="border:none;border-top:1px solid #e8ddd9;" />
              </td></tr>

              <!-- Footer -->
              <tr>
                <td style="font-size:12px;color:#c2b4b2;line-height:1.6;">
                  Este e-mail foi enviado automaticamente. Por favor, não responda.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject=f"Lembrete de agendamento — {company_name}",
        recipients=[to_email],
        body=html,
        subtype=MessageType.html,
    )

    try:
        await _mailer.send_message(message)
    except Exception as exc:
        print(f"[email] Failed to send appointment reminder to {to_email}: {exc}")
