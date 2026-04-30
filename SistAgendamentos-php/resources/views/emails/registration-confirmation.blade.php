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
                Cadastro confirmado!
              </h2>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
                Olá, <strong>{{ $companyName }}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                Seu cadastro no Sistema de Agendamentos foi realizado com sucesso.
                Agora você pode acessar sua conta e começar a gerenciar seus agendamentos.
              </p>

              <!-- CTA Button -->
              <a href="{{ $frontendUrl }}"
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
