import "./passwordVisibility.js";
import { checkAuthSession, startSessionPolling } from "./authChecker.js";
import { validatePassword } from "./password-policy.js";

const { ssoUrl, authSessionHash } = document.body.dataset;

if (ssoUrl) {
  startSessionPolling(ssoUrl);
}

if (authSessionHash) {
  checkAuthSession(authSessionHash);
}

document.querySelectorAll("form[data-bloqueia-envio-duplo]").forEach((form) => {
  form.addEventListener("submit", () => {
    form.querySelectorAll("button[type=submit]").forEach((botao) => {
      botao.disabled = true;
    });
  });
});

const politica = document.getElementById("cdd-politica-senha");

if (politica) {
  const campo = document.getElementById(politica.dataset.campo);
  const regras = ["length", "maxLength", "lowerCase", "upperCase", "digits", "specialChars"]
    .map((nome) => ({
      name: nome,
      policy: { value: Number(politica.dataset[nome] ?? -1), error: politica.dataset[`${nome}Erro`] ?? "" },
    }))
    .filter((regra) => regra.policy.value !== -1);
  const erros = document.getElementById(`input-error-container-${politica.dataset.campo}`);

  campo.addEventListener("change", (evento) => {
    const falhas = validatePassword(evento.target.value, regras);
    if (falhas.length === 0) {
      erros.replaceChildren();
      return;
    }
    const lista = document.createElement("ul");
    lista.className = "cdd-regras-erro";
    lista.setAttribute("role", "alert");
    falhas.forEach((falha) => {
      const item = document.createElement("li");
      item.textContent = falha;
      lista.appendChild(item);
    });
    erros.replaceChildren(lista);
  });
}
