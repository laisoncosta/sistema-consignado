const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return "";
  const parts = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  return parts.map((c) => c.split(";")[0]).join("; ");
}

async function login(email, senha) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login ${email}: ${data.error ?? res.status}`);
  const cookie = parseCookies(res.headers.getSetCookie?.() ?? res.headers.raw?.()?.["set-cookie"]);
  return { data, cookie };
}

async function apiGet(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GET ${path}: ${data.error ?? res.status}`);
  return data;
}

async function apiPost(path, body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path}: ${data.error ?? res.status}`);
  return data;
}

async function main() {
  console.log("=== 1. Login promotor@teste.com ===");
  const { data: promLogin, cookie: promCookie } = await login(
    "promotor@teste.com",
    "teste123",
  );
  console.log(`OK — ${promLogin.user.funcao} / ${promLogin.user.regiao}`);

  console.log("\n=== 2. Lojas vinculadas ===");
  const { lojas } = await apiGet("/api/portal/lojas", promCookie);
  console.log(`OK — ${lojas.length} loja(s)`);
  if (lojas.length === 0) throw new Error("Promotor sem lojas vinculadas.");
  const loja = lojas[0];
  console.log(`Loja: ${loja.rotulo} (id ${loja.id})`);

  const regiaoId = loja.regiaoId ?? 1;
  console.log("\n=== 3. Produtos da região ===");
  const { produtos } = await apiGet(
    `/api/pedidos?regiaoId=${regiaoId}`,
    promCookie,
  );
  console.log(`OK — ${produtos.length} produto(s)`);

  console.log("\n=== 4. Criar pedido ===");
  const pedido = await apiPost(
    "/api/pedidos",
    {
      lojaId: Number(loja.id),
      regiaoId,
      linhas: [
        {
          produtoId: Number(produtos[0].id),
          estoque: 12,
          avaria: 0,
          trocas: 0,
          pedido: 7,
        },
        {
          produtoId: Number(produtos[1].id),
          estoque: 9,
          avaria: 1,
          trocas: 0,
          pedido: 4,
        },
      ],
    },
    promCookie,
  );
  console.log(
    `OK — Pedido #${pedido.pedido.id} | ${pedido.pedido.status} | ${pedido.pedido.regiaoNome}`,
  );

  const hoje = new Date().toISOString().slice(0, 10);
  const mesInicio = `${hoje.slice(0, 8)}01`;
  const lancPath = `/api/expedicao/lancamentos?dataInicio=${mesInicio}&dataFim=${hoje}&avulso=todos&status=todos`;

  console.log("\n=== 5. Login expedicao-manaus@teste.com ===");
  const { data: expLogin, cookie: expCookie } = await login(
    "expedicao-manaus@teste.com",
    "teste123",
  );
  console.log(`OK — ${expLogin.user.funcao} / ${expLogin.user.regiao}`);

  console.log("\n=== 6. Lançamentos na Expedição (Manaus) ===");
  const lanc = await apiGet(lancPath, expCookie);
  const itens = (lanc.lancamentos ?? []).filter(
    (i) => i.pedidoId === pedido.pedido.id,
  );
  console.log(`Total lançamentos: ${lanc.lancamentos?.length ?? 0}`);
  console.log(`Itens do pedido #${pedido.pedido.id}: ${itens.length}`);
  for (const item of itens) {
    console.log(
      `  • ${item.produto} | ${item.loja} | pedido ${item.pedidoSolicitado} | ${item.status}`,
    );
  }

  console.log("\n=== 7. Isolamento — expedicao-riobranco@teste.com ===");
  const { cookie: rbCookie } = await login(
    "expedicao-riobranco@teste.com",
    "teste123",
  );
  const lancRb = await apiGet(lancPath, rbCookie);
  const vazamento = (lancRb.lancamentos ?? []).some(
    (i) => i.pedidoId === pedido.pedido.id,
  );
  console.log(
    vazamento
      ? "FALHA — Rio Branco viu pedido de Manaus!"
      : "OK — Rio Branco NÃO vê o pedido de Manaus",
  );

  if (itens.length === 0) {
    process.exitCode = 1;
    console.error("\nFALHA: pedido não apareceu na expedição Manaus.");
  } else {
    console.log("\n✓ Fluxo promotor → expedição validado com sucesso!");
  }
}

main().catch((err) => {
  console.error("\nERRO:", err.message);
  process.exit(1);
});
