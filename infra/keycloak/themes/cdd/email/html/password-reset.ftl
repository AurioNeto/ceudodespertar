<#import "template.ftl" as layout>
<@layout.emailLayout>
<h1 style="margin:0 0 12px;font-family:Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:22px;line-height:1.2;color:#764C29;">${msg("passwordResetTitulo")}</h1>
<p style="margin:0 0 24px;">${msg("passwordResetIntro")}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#1A3DA8;border-radius:6px;">
  <a href="${link}" style="display:inline-block;padding:13px 24px;font-weight:600;font-size:15px;color:#FFFFFF;text-decoration:none;">${msg("passwordResetBotao")}</a>
</td></tr></table>
<p style="margin:24px 0 8px;font-size:13px;color:#4C5670;">${msg("emailLinkAlternativo")}</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#1A3DA8;">${link}</a></p>
<p style="margin:0 0 4px;font-size:13px;color:#4C5670;">${msg("emailLinkExpira", linkExpirationFormatter(linkExpiration))}</p>
<p style="margin:0;font-size:13px;color:#4C5670;">${msg("passwordResetIgnorar")}</p>
</@layout.emailLayout>
