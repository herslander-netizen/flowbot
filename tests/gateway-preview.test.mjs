import test from "node:test";
import assert from "node:assert/strict";
import { criarClienteGateway } from "../src/estudio/gateway-preview.mjs";
const json = (status, body) => new Response(JSON.stringify(body), {status,headers:{"Content-Type":"application/json"}});
test("consulta e gravação usam o contrato D3 e cookie de mesma origem", async () => {
  const calls = [];
  const c = criarClienteGateway({fetchImpl:async (path, opts) => {calls.push({path,opts});return json(200,{revision:2});}});
  assert.equal((await c.obterRascunho("bot_1",2)).ok,true);
  await c.salvarRascunho("bot_1",1,{flow:{id:"bot_1"}});
  assert.equal(calls[0].path,"/studio/v1/flows/bot_1/draft?revision=2");
  assert.equal(calls[1].path,"/studio/v1/flows/bot_1/draft");
  assert.equal(calls[1].opts.method,"PUT");
  assert.equal(calls[1].opts.credentials,"same-origin");
  assert.equal(calls[1].opts.redirect,"error");
  assert.equal(calls[1].opts.headers.Authorization,undefined);
  assert.deepEqual(JSON.parse(calls[1].opts.body),{expectedRevision:1,document:{flow:{id:"bot_1"}}});
});
test("sessão usa somente as três rotas documentadas", async () => {
  const calls=[];
  const c=criarClienteGateway({fetchImpl:async(path,opts)=>{calls.push([path,opts.method]);return json(200,{ok:true});}});
  await c.entrar("operador","senha-sintetica"); await c.sessao(); await c.sair();
  assert.deepEqual(calls,[["/studio/session","POST"],["/studio/session","GET"],["/studio/session","DELETE"]]);
});
test("sessão expirada, permissão e conflitos preservam os estados existentes", async () => {
  for (const [status,body,estado] of [[401,{error:"session_expired"},"sessao"],[403,{error:"forbidden"},"permissao"],[409,{error:"revision_conflict",currentRevision:3},"conflito"]]) {
    const c=criarClienteGateway({fetchImpl:async()=>json(status,body)});
    const r=await c.salvarRascunho("bot",2,{});
    assert.equal(r.ok,false); assert.equal(r.estado,estado);
    if(status===409) assert.equal(r.revisaoAtual,3);
  }
});
test("falha de rede ou HTML não vira sucesso", async () => {
  for(const fetchImpl of [async()=>{throw Error("offline")},async()=>new Response("<html>login</html>"),async()=>json(200,null)]) {
    const c=criarClienteGateway({fetchImpl});
    assert.equal((await c.sessao()).estado,"indisponivel");
  }
});
test("operações não suportadas, IDs inválidos e revisão inválida não fazem chamadas", async () => {
  let chamadas=0;
  const c=criarClienteGateway({fetchImpl:async()=>{chamadas++;return json(200,{})}});
  assert.equal((await c.obterRascunho("../session")).ok,false);
  assert.equal((await c.historico("bot",0)).ok,false);
  assert.equal((await c.aprovar()).ok,false);
  assert.equal((await c.publicar()).ok,false);
  assert.equal((await c.pedirProposta()).ok,false);
  assert.equal(chamadas,0);
});
