<#ftl output_format="plainText">
<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#items></#list></#if></#assign>
${msg("cddMarcaNome")} - ${msg("cddMarcaDescritor")}

${msg("executeActionsIntro")}
${msg("executeActionsEtapas", requiredActionsText)}

${msg("executeActionsBotao")}:
${link}

${msg("emailLinkExpira", linkExpirationFormatter(linkExpiration))}
${msg("executeActionsIgnorar")}
