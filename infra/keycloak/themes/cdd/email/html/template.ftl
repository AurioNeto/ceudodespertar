<#macro emailLayout>
<!DOCTYPE html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${msg("cddMarcaNome")}</title>
</head>
<body style="margin:0;padding:0;background:#FAF7F0;color:#22304E;font-family:'Public Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF7F0;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #DEDFE6;border-radius:10px;">
    <tr><td style="padding:24px 32px;background:#F3EEE2;border-bottom:1px solid #E3D9C5;border-radius:10px 10px 0 0;">
      <div style="font-family:Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-weight:800;font-size:20px;line-height:1.1;letter-spacing:0.01em;text-transform:uppercase;color:#764C29;">${msg("cddMarcaNome")}</div>
      <div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A6539;">${msg("cddMarcaDescritor")}</div>
    </td></tr>
    <tr><td style="padding:28px 32px 32px;">
      <#nested>
    </td></tr>
  </table>
  <p style="max-width:520px;margin:16px 0 0;font-size:12px;color:#4C5670;">${msg("cddRodape")}</p>
</td></tr>
</table>
</body>
</html>
</#macro>
