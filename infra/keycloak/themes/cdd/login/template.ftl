<#import "footer.ftl" as loginFooter>
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<#assign tituloDaPagina><#nested "header"></#assign>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${lang}" dir="${(locale.rtl)?then('rtl','ltr')}">
<head>
    <meta charset="utf-8">
    <meta name="color-scheme" content="light">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>${tituloDaPagina} · ${msg("cddMarcaNome")}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.svg" type="image/svg+xml" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/cdd-pagina.js"></script>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
</head>

<body id="keycloak-bg" class="cdd-corpo ${bodyClass}" data-page-id="login-${pageId}"
      data-sso-url="${url.ssoLoginInOtherTabsUrl}"<#if authenticationSession??> data-auth-session-hash="${authenticationSession.authSessionIdHash}"</#if>>
<div class="cdd-portao">
  <aside class="cdd-marca">
    <div class="cdd-marca__flor" aria-hidden="true"></div>
    <div class="cdd-marca__nome">
      <div class="cdd-marca__wordmark">${msg("cddMarcaLinha1")} <span class="cdd-marca__quebra">${msg("cddMarcaLinha2")}</span></div>
      <div class="cdd-marca__descritor">${msg("cddMarcaDescritor")}</div>
    </div>
    <p class="cdd-marca__frase">${msg("cddMarcaFrase")}</p>
  </aside>

  <main class="cdd-conteudo">
    <div class="cdd-cartao">
      <h1 id="kc-page-title" class="cdd-titulo">${tituloDaPagina}</h1>

      <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
        <div id="kc-username" class="cdd-usuario">
          <span id="kc-attempted-username">${auth.attemptedUsername}</span>
          <a id="reset-login" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
        </div>
        <#nested "show-username">
      </#if>

      <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
        <div class="cdd-aviso cdd-aviso--${message.type}" role="${(message.type = 'error')?then('alert', 'status')}">
          <span class="cdd-aviso__rotulo">${msg("cddAviso." + message.type)}</span>
          <span class="cdd-aviso__texto">${message.summary}</span>
        </div>
      </#if>

      <#nested "form">

      <#if auth?has_content && auth.showTryAnotherWayLink()>
        <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
          <input type="hidden" name="tryAnotherWay" value="on"/>
          <button type="submit" id="try-another-way" class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass}">${msg("doTryAnotherWay")}</button>
        </form>
      </#if>

      <#nested "socialProviders">

      <#if displayInfo>
        <div id="kc-info" class="cdd-rodape">
          <#nested "info">
        </div>
      </#if>

      <@loginFooter.content/>
    </div>
  </main>
</div>
</body>
</html>
</#macro>
