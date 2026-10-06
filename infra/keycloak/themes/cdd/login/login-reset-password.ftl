<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        ${msg("emailForgotTitle")}
    <#elseif section = "form">
        <p class="cdd-descricao">${msg("emailInstruction")}</p>
        <form id="kc-reset-password-form" class="${properties.kcFormClass!}" data-bloqueia-envio-duplo action="${url.loginAction}" method="post">
            <@field.input name="username" label=msg("email") value=auth.attemptedUsername!'' autofocus=true autocomplete="username" />

            <@buttons.actionGroup>
              <@buttons.button id="kc-form-buttons" label="cddEnviarLink" class=["kcButtonPrimaryClass", "kcButtonBlockClass"]/>
              <@buttons.buttonLink href=url.loginUrl label="backToLogin" class=["kcButtonSecondaryClass", "kcButtonBlockClass"]/>
            </@buttons.actionGroup>
        </form>
    </#if>
</@layout.registrationLayout>
