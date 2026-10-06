<#macro templates>
</#macro>

<#macro script field="">
    <div id="cdd-politica-senha" hidden data-campo="${field}"
         data-length="${passwordPolicies.length!-1}" data-length-erro="${msg('invalidPasswordMinLengthMessage')}"
         data-max-length="${passwordPolicies.maxLength!-1}" data-max-length-erro="${msg('invalidPasswordMaxLengthMessage')}"
         data-lower-case="${passwordPolicies.lowerCase!-1}" data-lower-case-erro="${msg('invalidPasswordMinLowerCaseCharsMessage')}"
         data-upper-case="${passwordPolicies.upperCase!-1}" data-upper-case-erro="${msg('invalidPasswordMinUpperCaseCharsMessage')}"
         data-digits="${passwordPolicies.digits!-1}" data-digits-erro="${msg('invalidPasswordMinDigitsMessage')}"
         data-special-chars="${passwordPolicies.specialChars!-1}" data-special-chars-erro="${msg('invalidPasswordMinSpecialCharsMessage')}"></div>
</#macro>
