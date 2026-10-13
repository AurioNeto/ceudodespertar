<#import "template.ftl" as layout>
<@layout.emailLayout>
<@layout.titulo>${msg("passwordResetTitulo")}</@layout.titulo>
<p style="margin:0 0 24px;">${msg("passwordResetIntro")}</p>
<@layout.botao link=link>${msg("passwordResetBotao")}</@layout.botao>
<@layout.rodapeDoLink link=link linkExpiration=linkExpiration/>
<@layout.observacao>${msg("passwordResetIgnorar")}</@layout.observacao>
</@layout.emailLayout>
