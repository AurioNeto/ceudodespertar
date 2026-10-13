<#assign fonteDoTitulo = "Alegreya,Georgia,'Times New Roman',serif">
<#assign fonteDoRotulo = "'Alegreya Sans SC','Alegreya Sans',Georgia,serif">
<#assign fonteDoTexto = "'Public Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">

<#macro emailLayout>
<!DOCTYPE html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${msg("cddMarcaNome")}</title>
</head>
<body style="margin:0;padding:0;background:#E9EDD8;color:#1B3324;font-family:${fonteDoTexto};font-size:15px;line-height:1.5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#E9EDD8;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FBF8EF;border:1px solid #C6CDB8;border-radius:12px;">
    <tr><td style="padding:24px 32px 18px;border-bottom:2px solid #C9A66B;">
      <div style="font-family:${fonteDoTitulo};font-weight:700;font-size:24px;line-height:1.1;color:#764C29;">${msg("cddMarcaNome")}</div>
      <div style="margin-top:6px;font-family:${fonteDoRotulo};font-weight:700;font-size:13px;letter-spacing:0.14em;font-variant:small-caps;color:#8A6539;">${msg("cddMarcaDescritor")}</div>
    </td></tr>
    <tr><td style="padding:28px 32px 32px;">
      <#nested>
    </td></tr>
  </table>
  <p style="max-width:520px;margin:16px 0 0;font-size:12px;color:#3E5444;">${msg("cddRodape")}</p>
</td></tr>
</table>
</body>
</html>
</#macro>

<#macro titulo>
<h1 style="margin:0 0 12px;font-family:${fonteDoTitulo};font-weight:700;font-size:24px;line-height:1.2;color:#764C29;"><#nested></h1>
</#macro>

<#macro botao link>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#2F5D3A;border-radius:10px;">
  <a href="${link}" style="display:inline-block;padding:13px 24px;font-weight:600;font-size:15px;color:#F7F5EA;text-decoration:none;"><#nested></a>
</td></tr></table>
</#macro>

<#macro rodapeDoLink link linkExpiration>
<p style="margin:24px 0 8px;font-size:13px;color:#3E5444;">${msg("emailLinkAlternativo")}</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#2F5D3A;">${link}</a></p>
<p style="margin:0 0 4px;font-size:13px;color:#3E5444;">${msg("emailLinkExpira", linkExpirationFormatter(linkExpiration))}</p>
</#macro>

<#macro observacao>
<p style="margin:0;font-size:13px;color:#3E5444;"><#nested></p>
</#macro>
