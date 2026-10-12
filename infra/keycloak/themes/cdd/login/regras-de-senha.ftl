<#function exigeSerDiferenteDoEmail>
    <#return passwordPolicies?? && (((passwordPolicies.notEmail)!false) || ((passwordPolicies.notUsername)!false))>
</#function>

<#function quantidadeDaPolitica nome>
    <#if passwordPolicies?? && passwordPolicies[nome]?? && passwordPolicies[nome]?is_number && passwordPolicies[nome] gt 0>
        <#return passwordPolicies[nome]>
    </#if>
    <#return 0>
</#function>

<#function chaveNoNumero chave quantidade>
    <#return chave + (quantidade == 1)?then(".um", ".varios")>
</#function>

<#function juntarComE itens>
    <#if itens?size lt 2>
        <#return itens?join("")>
    </#if>
    <#return msg("cddSenhaRegraJuncao", itens[0..<itens?size - 1]?join(", "), itens?last)>
</#function>

<#function tamanhoExigido>
    <#local minimo = quantidadeDaPolitica("length")>
    <#local maximo = quantidadeDaPolitica("maxLength")>
    <#if minimo gt 0 && maximo gt 0>
        <#return msg("cddSenhaRegraTamanhoEntre", minimo?c, maximo?c)>
    <#elseif minimo gt 0>
        <#return msg("cddSenhaRegraTamanhoMinimo", minimo?c)>
    <#elseif maximo gt 0>
        <#return msg("cddSenhaRegraTamanhoMaximo", maximo?c)>
    </#if>
    <#return "">
</#function>

<#function caracteresExigidos>
    <#local itens = []>
    <#list [["lowerCase", "cddSenhaRegraMinusculas"], ["upperCase", "cddSenhaRegraMaiusculas"], ["digits", "cddSenhaRegraNumeros"], ["specialChars", "cddSenhaRegraEspeciais"]] as regra>
        <#local quantidade = quantidadeDaPolitica(regra[0])>
        <#if quantidade gt 0>
            <#local itens = itens + [msg(chaveNoNumero(regra[1], quantidade), quantidade?c)]>
        </#if>
    </#list>
    <#return juntarComE(itens)>
</#function>

<#function fraseDeComposicao>
    <#local tamanho = tamanhoExigido()>
    <#local caracteres = caracteresExigidos()>
    <#if tamanho?has_content && caracteres?has_content>
        <#return msg("cddSenhaRegraUseCom", tamanho, caracteres)>
    <#elseif tamanho?has_content>
        <#return msg("cddSenhaRegraUse", tamanho)>
    <#elseif caracteres?has_content>
        <#return msg("cddSenhaRegraPrecisaTer", caracteres)>
    </#if>
    <#return "">
</#function>

<#function textoDasRegras>
    <#local frases = [fraseDeComposicao()]>
    <#if exigeSerDiferenteDoEmail()>
        <#local frases = frases + [msg("cddSenhaRegraNaoEmail")]>
    </#if>
    <#local historico = quantidadeDaPolitica("passwordHistory")>
    <#if historico gt 0>
        <#local frases = frases + [msg(chaveNoNumero("cddSenhaRegraHistorico", historico), historico?c)]>
    </#if>
    <#return frases?filter(frase -> frase?has_content)?join(" ")>
</#function>

<#macro descricao>
    <#assign texto = textoDasRegras()>
    <#if texto?has_content>
        <p class="cdd-descricao">${texto}</p>
    </#if>
</#macro>
