/**
 * Cliente REST para o backend FlowBot. NÃO persiste JWT nem contém chaves privadas.
 * A camada de autenticação deve fornecer uma sessão Supabase válida a cada chamada.
 * A UI atual continua como demonstração local até integrar autenticação.
 */
export function criarClienteProspecao({ getAccessToken, fetcher = fetch, baseUrl = "" }) {
  if (typeof getAccessToken !== "function")
    throw new Error("getAccessToken é obrigatório");

  async function chamar(caminho, method = "GET", body) {
    const token = await getAccessToken();
    if (!token || typeof token !== "string") throw new Error("sessao_expirada");
    const response = await fetcher(baseUrl + caminho, {
      method,
      headers: {
        authorization: "Bearer " + token,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      credentials: "omit",
    });
    let resultado;
    try { resultado = await response.json(); }
    catch { throw new Error("resposta_invalida"); }
    if (!response.ok)
      throw new Error(resultado?.erro || "operacao_falhou");
    return resultado.data;
  }

  function validarId(id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id ?? "")))
      throw new Error("identificador_invalido");
    return id;
  }
  return Object.freeze({
    listarWorkspaces: () => chamar("/api/v1/workspaces"),
    listarEmpresas: (workspaceId, { limit = 50, stage } = {}) => {
      const query = new URLSearchParams({
        workspaceId: validarId(workspaceId),
        limit: String(limit),
      });
      if (stage) query.set("stage", stage);
      return chamar("/api/v1/prospects?" + query.toString());
    },
    criarEmpresa: (workspaceId, prospect) =>
      chamar("/api/v1/prospects", "POST", {
        workspaceId: validarId(workspaceId), prospect,
      }),
    atualizarEmpresa: (workspaceId, id, changes) =>
      chamar("/api/v1/prospects/" + validarId(id), "PATCH", {
        workspaceId: validarId(workspaceId),
        ...changes,
      }),
    bloquearEmpresa: (workspaceId, id) =>
      chamar("/api/v1/prospects/" + validarId(id), "PATCH", {
        workspaceId: validarId(workspaceId), suppressed: true,
      }),
  });
}
