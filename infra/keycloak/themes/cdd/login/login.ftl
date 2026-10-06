<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password'); section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <p class="cdd-descricao">${msg("loginAccountDescricao")}</p>
        <#if realm.password>
            <form id="kc-form-login" class="${properties.kcFormClass!}" data-bloqueia-envio-duplo action="${url.loginAction}" method="post" novalidate="novalidate">
                <#if !usernameHidden??>
                    <@field.input name="username" label=msg("email") error=messagesPerField.getFirstError('username','password')
                        autofocus=true autocomplete="username" value=login.username!'' />
                </#if>
                <@field.password name="password" label=msg("password") error="" forgotPassword=realm.resetPasswordAllowed autofocus=usernameHidden?? autocomplete="current-password" />

                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                <@buttons.loginButton />
            </form>
        </#if>
    </#if>
</@layout.registrationLayout>
