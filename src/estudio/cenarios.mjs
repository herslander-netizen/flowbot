// Conferência de cenários na prévia do navegador, no mesmo formato de relatório do motor
// (RelatorioDoCenario: { name, ok, passos: [{ entrada, saidas, status, motivo, falhas }] }).
// Serve à fonte de demonstração e ao aviso antecipado na tela. O resultado oficial é sempre o do motor.
import { iniciarConversa, responder, esgotarPrazo, noPorId } from "./fluxo.mjs";

// Texto de saída igual ao do motor: menu numerado no mesmo texto da pergunta.
const textoDaSaida = (m) => m.opcoes ? m.texto + "\n" + m.opcoes.map((o) => `[${o.value}] ${o.label}`).join("\n") : m.texto;

export function conferirCenario(doc, cenario) {
  const s = iniciarConversa(cenario.contact ?? {});
  const passos = cenario.steps.map((p) => {
    let saidas = []; let entrada = "";
    if (p.say !== undefined) { entrada = "> " + p.say; saidas = responder(doc, s, p.say).map(textoDaSaida); }
    else if (p.wait !== undefined) {
      entrada = "(espera " + p.wait + " s)";
      const prazo = s.cursor ? noPorId(doc, s.cursor)?.config?.timeoutSeconds : null;
      if (prazo && p.wait >= prazo) saidas = esgotarPrazo(doc, s).map(textoDaSaida);
    } else { entrada = "(webhook)"; }
    const falhas = [];
    const e = p.expect;
    if (e) {
      if (e.replies && JSON.stringify(e.replies) !== JSON.stringify(saidas)) falhas.push(`respostas: esperado ${JSON.stringify(e.replies)}, veio ${JSON.stringify(saidas)}`);
      for (const trecho of e.contains ?? []) if (!saidas.some((t) => t.includes(trecho))) falhas.push(`nenhuma resposta contém "${trecho}"`);
      if (e.status && e.status !== s.status) falhas.push(`status: esperado ${e.status}, veio ${s.status}`);
      if (e.cursor !== undefined && e.cursor !== s.cursor) falhas.push(`cursor: esperado ${String(e.cursor)}, veio ${String(s.cursor)}`);
      for (const [k, v] of Object.entries(e.variables ?? {})) if (String(s.variaveis[k]) !== String(v)) falhas.push(`variável ${k}: esperado ${v}, veio ${s.variaveis[k] ?? "—"}`);
      if (e.handoff !== undefined && e.handoff !== (s.status === "handed_off")) falhas.push(`encaminhamento: esperado ${String(e.handoff)}`);
    }
    return { entrada, saidas, status: s.status, motivo: s.motivo ?? "", falhas };
  });
  return { name: cenario.name, ok: passos.every((p) => !p.falhas.length), passos };
}

export function conferirCenarios(doc, arquivo) {
  const reports = (arquivo?.scenarios ?? []).map((c) => conferirCenario(doc, c));
  return { reports, scenariosPassed: reports.every((r) => r.ok) };
}
