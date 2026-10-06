<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <#if messageHeader??>${msg(messageHeader)}<#elseif requiredActions??>${msg("cddEtapaPendenteTitulo")}<#elseif message.type = 'success'>${msg("cddConcluidoTitulo")}<#else>${message.summary}</#if>
    <#elseif section = "form">
        <div id="kc-info-message">
            <p class="cdd-instrucao">${message.summary}<#if requiredActions??><#list requiredActions>: <b><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#items></b></#list></#if></p>
            <#if !skipLink??>
                <#if pageRedirectUri?has_content>
                    <a id="voltarAoSistema" class="${properties.kcButtonPrimaryClass} ${properties.kcButtonBlockClass}" href="${pageRedirectUri}">${msg("backToApplication")}</a>
                <#elseif actionUri?has_content>
                    <a id="continuarAcao" class="${properties.kcButtonPrimaryClass} ${properties.kcButtonBlockClass}" href="${actionUri}">${msg("proceedWithAction")}</a>
                <#elseif client?? && client.baseUrl?has_content>
                    <a id="voltarAoSistema" class="${properties.kcButtonPrimaryClass} ${properties.kcButtonBlockClass}" href="${client.baseUrl}">${msg("backToApplication")}</a>
                </#if>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
