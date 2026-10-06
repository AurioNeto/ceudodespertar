<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        ${msg("errorTitle")}
    <#elseif section = "form">
        <div id="kc-error-message">
            <p class="cdd-instrucao">${message.summary}</p>
            <#if !skipLink?? && client?? && client.baseUrl?has_content>
                <a id="backToApplication" class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass}" href="${client.baseUrl}">${msg("backToApplication")}</a>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
