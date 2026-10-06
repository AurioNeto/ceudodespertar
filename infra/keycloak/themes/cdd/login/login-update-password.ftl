<#import "template.ftl" as layout>
<#import "password-commons.ftl" as passwordCommons>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<#import "password-validation.ftl" as validator>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>
    <#if section = "header">
        ${msg("updatePasswordTitle")}
    <#elseif section = "form">
        <p class="cdd-descricao">${msg("cddSenhaRegras")}</p>
        <form id="kc-passwd-update-form" class="${properties.kcFormClass!}" data-bloqueia-envio-duplo action="${url.loginAction}" method="post" novalidate="novalidate">
            <@field.password name="password-new" label=msg("passwordNew") fieldName="password" autocomplete="new-password" autofocus=true />
            <@field.password name="password-confirm" label=msg("passwordConfirm") autocomplete="new-password" />

            <div class="${properties.kcFormGroupClass!}">
                <@passwordCommons.logoutOtherSessions/>
            </div>

            <@buttons.actionGroup horizontal=true>
                <#if isAppInitiatedAction??>
                    <@buttons.button id="kc-submit" name="login" label="cddSalvarSenha" class=["kcButtonPrimaryClass"]/>
                    <@buttons.button id="kc-cancel" label="doCancel" name="cancel-aia" class=["kcButtonSecondaryClass"]/>
                <#else>
                    <@buttons.button id="kc-submit" name="login" label="cddSalvarSenha" class=["kcButtonPrimaryClass", "kcButtonBlockClass"]/>
                </#if>
            </@buttons.actionGroup>
        </form>

        <@validator.script field="password-new"/>
    </#if>
</@layout.registrationLayout>
