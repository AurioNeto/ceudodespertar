<#outputformat "plainText">
<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list></#if></#assign>
</#outputformat>
<#import "template.ftl" as layout>
<@layout.emailLayout>
<@layout.titulo>${msg("executeActionsTitulo")}</@layout.titulo>
<p style="margin:0 0 12px;">${msg("executeActionsIntro")}</p>
<p style="margin:0 0 24px;">${msg("executeActionsEtapas", requiredActionsText)}</p>
<@layout.botao link=link>${msg("executeActionsBotao")}</@layout.botao>
<@layout.rodapeDoLink link=link linkExpiration=linkExpiration/>
<@layout.observacao>${msg("executeActionsIgnorar")}</@layout.observacao>
</@layout.emailLayout>
