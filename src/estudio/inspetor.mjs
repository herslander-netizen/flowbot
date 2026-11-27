// Edição de um passo. O mesmo conteúdo serve ao painel lateral (computador) e à folha inferior (celular).
import { TIPOS, PAPEIS, LIMITES, portasDoNo, nomeDaPorta, PORTAS_DE_ERRO, duracao } from "./catalogo.mjs";
import { noPorId, saidasDe } from "./fluxo.mjs";
import { TIPOS_CRIAVEIS, MOTIVO_NAO_CRIAVEL } from "./edicao.mjs";
import { personagem, papelDo } from "./personagens.mjs";
import { html } from "../ui/componentes.mjs";
import { icone } from "../ui/icones.mjs";

const PRAZOS = [60, 120, 300, 600, 900, 1800, 3600, 21600, 86400];

export function cabecalhoDoPasso(no, { titulo = "passo-titulo" } = {}) {
  const papel = papelDo(no); const tipo = TIPOS[no.type];
  return `${personagem(papel, 36)}
    <div class="drawer__heading"><span class="t-label">${html(PAPEIS[papel].nome)} · ${html(tipo?.rotulo ?? no.type)}</span><h2 class="drawer__title" id="${titulo}">${html(no.id)}</h2></div>`;
}

export function corpoDoPasso(doc, no, avisos) {
  return `<div id="avisos-do-passo" aria-live="polite">${avisosDoPasso(avisos)}</div>
    ${camposDoPasso(no)}
    ${saidasDoPasso(doc, no)}
    <section class="section"><h3 class="section__title">Ações</h3>
      <div class="action-list">
        ${TIPOS[no.type]?.terminal ? "" : `<button type="button" class="action-row pressable" data-acao="inserir-depois" data-no-alvo="${html(no.id)}">${icone("mais")}<span><strong>Inserir passo depois</strong><small>Entra no caminho “${html(nomeDaPorta(portasDoNo(no)[0]?.nome ?? "next"))}”</small></span></button>`}
        ${no.id === doc.flow.entryNodeId ? `<p class="field__hint">${icone("cadeado", "icon icon--sm")} A entrada do fluxo não pode ser excluída.</p>` : `<button type="button" class="action-row action-row--danger pressable" data-acao="excluir-passo" data-no-alvo="${html(no.id)}">${icone("lixeira")}<span><strong>Excluir passo</strong><small>Dá para desfazer em seguida</small></span></button>`}
      </div>
    </section>
    <p class="field__hint">Tudo fica no rascunho desta aba. Salvar no motor ainda não está disponível.</p>`;
}

export function avisosDoPasso(avisos) {
  return avisos.length ? `<div class="alert alert--warning">${icone("alerta")}<span>${avisos.map((a) => html(a.message)).join("<br>")}</span></div>` : "";
}

function camposDoPasso(no) {
  const c = no.config ?? {};
  if (no.type === "message.text") {
    return `<div class="field"><label class="field__label" for="campo-texto">Mensagem</label>
      <textarea class="textarea" id="campo-texto" data-campo="text" maxlength="${LIMITES.texto}" rows="4">${html(c.text)}</textarea>
      <span class="field__hint field__hint--row"><span>Use {{contact.firstName}} para o primeiro nome.</span><span data-contador="campo-texto">${String(c.text ?? "").length}/${LIMITES.texto}</span></span></div>`;
  }
  if (no.type === "message.quick_replies") {
    return `<div class="field"><label class="field__label" for="campo-prompt">Pergunta</label>
      <input class="input" id="campo-prompt" data-campo="prompt" value="${html(c.prompt)}" maxlength="${LIMITES.texto}"></div>
      <fieldset class="fieldset"><legend class="field__label">Opções <span class="t-faint">${c.options.length} de ${LIMITES.opcoes.max}</span></legend>
      <div class="option-list">${c.options.map((o, i) => `<div class="option-row"><span class="option-row__value" title="Valor que a escolha compara">${html(o.value)}</span>
        <input class="input" aria-label="Texto da opção ${html(o.value)}" data-opcao="${i}" value="${html(o.label)}" maxlength="${LIMITES.rotuloDaOpcao}">
        <span class="option-row__count" data-contador-opcao="${i}">${o.label.length}/${LIMITES.rotuloDaOpcao}</span>
        <button type="button" class="btn btn--ghost btn--icon btn--sm" data-acao="remover-opcao" data-indice="${i}" aria-label="Remover opção ${html(o.value)}" ${c.options.length <= LIMITES.opcoes.min ? "disabled" : ""}>${icone("fechar")}</button></div>`).join("")}</div>
      <button type="button" class="btn btn--ghost btn--sm" data-acao="adicionar-opcao" ${c.options.length >= LIMITES.opcoes.max ? "disabled" : ""}>${icone("mais")}Adicionar opção</button>
      </fieldset>
      <p class="field__hint">O número é o valor que o passo “Escolha” compara. No WhatsApp sai como menu numerado.</p>`;
  }
  if (no.type === "state.wait_for_reply") {
    const lista = PRAZOS.includes(c.timeoutSeconds) ? PRAZOS : [...PRAZOS, c.timeoutSeconds].sort((a, b) => a - b);
    return `<div class="field"><label class="field__label" for="campo-prazo">Esperar até</label>
      <select class="select" id="campo-prazo" data-campo-numero="timeoutSeconds">${lista.map((s) => `<option value="${s}" ${s === c.timeoutSeconds ? "selected" : ""}>${duracao(s)}</option>`).join("")}</select>
      <span class="field__hint">Depois disso a conversa segue por “sem resposta”.</span></div>
      <dl class="dl"><div><dt>Guarda a resposta em</dt><dd>${html(c.saveAs ?? "—")}</dd></div><div><dt>Tentativas</dt><dd>${html(c.maxAttempts ?? 1)}</dd></div></dl>`;
  }
  if (no.type === "action.handoff") {
    return `<div class="field"><label class="field__label" for="campo-nota">Nota para a equipe</label>
      <input class="input" id="campo-nota" data-campo="note" value="${html(c.note ?? "")}" maxlength="500" placeholder="Ex.: pediu atendimento"></div>`;
  }
  if (no.type === "logic.goto") {
    return `<dl class="dl"><div><dt>Volta para</dt><dd>${html(c.target)}</dd></div><div><dt>Até</dt><dd>${html(c.maxVisits)} vez(es)</dd></div></dl>
      <p class="field__hint">Depois do limite, segue por “esgotou”. É o que impede a conversa de girar sem fim.</p>`;
  }
  const linhas = Object.entries(c).map(([k, v]) => `<div><dt>${html(k)}</dt><dd>${html(typeof v === "object" ? JSON.stringify(v) : v)}</dd></div>`).join("");
  return `<section class="section"><h3 class="section__title">Configuração</h3>${linhas ? `<dl class="dl">${linhas}</dl>` : `<p class="field__hint">Este passo não tem configuração.</p>`}</section>`;
}

function saidasDoPasso(doc, no) {
  const portas = portasDoNo(no);
  if (!portas.length) return `<section class="section"><h3 class="section__title">Saídas</h3><p class="field__hint">Passo final: a conversa termina aqui.</p></section>`;
  const opcoes = (atual) => `<option value="">Sem ligação</option>` + doc.nodes.filter((n) => n.id !== no.id && !TIPOS[n.type]?.gatilho)
    .map((n) => `<option value="${html(n.id)}" ${n.id === atual ? "selected" : ""}>${html(n.id)} · ${html(TIPOS[n.type]?.rotulo ?? n.type)}</option>`).join("");
  return `<section class="section"><h3 class="section__title">Saídas</h3>
    <div class="out-list">${portas.map((p) => {
      const e = saidasDe(doc, no.id).find((x) => x.port === p.nome);
      const id = "saida-" + p.nome.replace(/[^a-z0-9]/gi, "-");
      return `<div class="out-row${PORTAS_DE_ERRO.has(p.nome) ? " out-row--error" : ""}">
        <label class="out-row__port" for="${id}">${html(nomeDaPorta(p.nome))}${p.obrigatoria ? "" : ' <span class="t-faint">(opcional)</span>'}</label>
        <select class="select select--sm" id="${id}" data-ligar="${html(p.nome)}" ${!e && p.obrigatoria ? 'aria-invalid="true"' : ""}>${opcoes(e?.to)}</select>
      </div>`;
    }).join("")}</div></section>`;
}

// Escolha do tipo de passo a criar: agrupado por personagem; tipos que não dá para criar aparecem com o motivo.
export function seletorDeTipo() {
  const grupos = Object.keys(PAPEIS).map((papel) => {
    const tipos = Object.entries(TIPOS).filter(([, t]) => t.papel === papel);
    return `<section class="type-group"><h3 class="type-group__title">${personagem(papel, 22)}${html(PAPEIS[papel].nome)}</h3>
      <div class="type-grid">${tipos.map(([id, t]) => TIPOS_CRIAVEIS.includes(id)
        ? `<button type="button" class="type-card pressable" data-criar="${id}"><span class="type-card__name">${html(t.rotulo)}</span><span class="type-card__ports">${t.terminal ? "Termina a conversa" : t.portas.length > 1 ? t.portas.map((p) => nomeDaPorta(p.nome)).join(" · ") : "Segue adiante"}</span></button>`
        : `<div class="type-card type-card--off" aria-disabled="true"><span class="type-card__name">${html(t.rotulo)}</span><span class="type-card__ports">${html(MOTIVO_NAO_CRIAVEL[id] ?? "")}</span></div>`).join("")}</div></section>`;
  }).join("");
  return `<div class="type-picker">${grupos}</div>`;
}

export { noPorId };
