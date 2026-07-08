import { NextResponse } from "next/server";

import { getBrandByRegiao } from "@/lib/brands";
import { prisma } from "@/lib/prisma";
import { findTestUserByEmail, normalizeEmail } from "@/lib/test-users";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = normalizeEmail(String(searchParams.get("email") ?? ""));

  if (!email) {
    return NextResponse.json({ brand: getBrandByRegiao("Manaus") });
  }

  const testProfile = findTestUserByEmail(email);

  if (testProfile) {
    return NextResponse.json({
      brand: getBrandByRegiao(testProfile.regiaoNome),
      regiao: testProfile.regiaoNome,
    });
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      ativo: true,
      usuario: { equals: email, mode: "insensitive" },
    },
    include: { regiao: true },
  });

  if (!usuario) {
    return NextResponse.json({ brand: getBrandByRegiao("Manaus") });
  }

  return NextResponse.json({
    brand: getBrandByRegiao(usuario.regiao.nome),
    regiao: usuario.regiao.nome,
  });
}
