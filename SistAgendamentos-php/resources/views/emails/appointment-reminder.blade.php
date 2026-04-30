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
              <p style="margin:0;font-size:22px;font-weight:700;color:#8e7f7e;">{{ $companyName }}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#a08c8b;">Sistema de Agendamentos</p>
            </td>
          </tr>

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
                Olá, <strong>{{ $clientName }}</strong>. Este é um lembrete do seu agendamento:
              </p>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#f5f0ee;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:14px;line-height:2;">
                    <strong>Data:</strong> {{ $dateStr }}<br />
                    <strong>Horário:</strong> {{ $timeStr }}<br />
                    <strong>Profissional:</strong> {{ $professionalName }}
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#a08c8b;line-height:1.6;">
                Caso precise remarcar ou cancelar, entre em contato com o nosso atendimento.
              </p>
            </td>
          </tr>

          <tr><td style="padding:32px 0 16px;">
            <hr style="border:none;border-top:1px solid #e8ddd9;" />
          </td></tr>

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
