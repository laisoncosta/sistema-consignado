import { AUTH_CODE_CONTA_PENDENTE, MENSAGEM_CONTA_PENDENTE } from "@/lib/auth-codes";
import { getBrandByRegiao, getRedirectPath, type BrandTheme } from "@/lib/brands";

import {
  normalizarDeviceId,
  validarTravaAparelhoLogin,
} from "@/lib/device-id";

import { prisma } from "@/lib/prisma";

import type { SessionUser } from "@/lib/session";

import {

  findTestUserByEmail,

  normalizeEmail,

  SEED_DEFAULT_PASSWORD,

  TEST_USER_PASSWORD,

} from "@/lib/test-users";

import { exigeTrocaSenhaNoLogin } from "@/lib/troca-senha-obrigatoria";
import { normalizarGenero } from "@/lib/usuario";
import { normalizarStatusConta } from "@/lib/admin-usuarios";



const usuarioInclude = {

  regiao: true,

  regioesAcesso: { select: { regiaoId: true } },

} as const;



function montarSessionUser(

  usuario: {

    id: number;

    nome: string;

    usuario: string;

    funcao: string;

    genero: string;

    regiaoId: number;

    alterarSenhaObrigatorio: boolean;

    regiao: { nome: string };

    regioesAcesso: Array<{ regiaoId: number }>;

  },

  email: string,

): SessionUser {

  return {

    id: usuario.id,

    email,

    name: usuario.nome,

    nome: usuario.nome,

    usuario: email,

    funcao: usuario.funcao,

    genero: normalizarGenero(usuario.genero),

    regiaoId: usuario.regiaoId,

    regiaoNome: usuario.regiao.nome,

    alterarSenhaObrigatorio: usuario.alterarSenhaObrigatorio,

    regioesAcessoIds: usuario.regioesAcesso.map((item) => item.regiaoId),

  };

}



export type AuthenticateSuccess = {

  ok: true;

  user: SessionUser;

  redirectTo: string;

  brand: BrandTheme;

  requiresPasswordChange: boolean;

};



export type AuthenticateFailure = {

  ok: false;

  error: string;

  status: number;

  code?: typeof AUTH_CODE_CONTA_PENDENTE;

};



export type AuthenticateResult = AuthenticateSuccess | AuthenticateFailure;



function montarResultadoSucesso(

  sessionUser: SessionUser,

  alterarSenhaObrigatorioDb: boolean,

): AuthenticateSuccess {

  const requiresPasswordChange = exigeTrocaSenhaNoLogin(alterarSenhaObrigatorioDb);



  const user: SessionUser = {

    ...sessionUser,

    alterarSenhaObrigatorio: requiresPasswordChange,

  };



  const brand = getBrandByRegiao(sessionUser.regiaoNome);



  return {

    ok: true,

    user,

    requiresPasswordChange,

    redirectTo: requiresPasswordChange

      ? "/alterar-senha"

      : getRedirectPath(sessionUser.funcao),

    brand,

  };

}



export async function authenticateUser(

  rawEmail: string,

  rawSenha: string,

  rawDeviceId?: string | null,

): Promise<AuthenticateResult> {

  const email = normalizeEmail(rawEmail);

  const senha = rawSenha.trim();

  const deviceId = normalizarDeviceId(rawDeviceId ?? null);



  if (!email || !senha) {

    return {

      ok: false,

      error: "E-mail e senha são obrigatórios.",

      status: 400,

    };

  }



  const testProfile = findTestUserByEmail(email);



  if (testProfile) {

    let dbUser = null;



    try {

      dbUser = await prisma.usuario.findFirst({

        where: {

          ativo: true,

          usuario: { equals: email, mode: "insensitive" },

        },

        include: usuarioInclude,

      });

    } catch (dbError) {

      console.warn("Banco indisponível no login de teste:", dbError);

    }



    const senhasAceitas = new Set(

      [TEST_USER_PASSWORD, SEED_DEFAULT_PASSWORD, dbUser?.senha?.trim()].filter(

        (valor): valor is string => Boolean(valor),

      ),

    );



    if (!senhasAceitas.has(senha)) {

      return {

        ok: false,

        error: "E-mail ou senha inválidos.",

        status: 401,

      };

    }



    if (dbUser) {

      const funcaoPromotor =
        dbUser.funcao.trim().toLowerCase() === "promotor";

      if (funcaoPromotor) {

        const trava = await validarTravaAparelhoLogin(

          {

            id: dbUser.id,

            deviceId: dbUser.deviceId ?? null,

            ignorarTravaAparelho: dbUser.ignorarTravaAparelho ?? false,

          },

          deviceId,

        );

        if (!trava.permitido) {

          return {

            ok: false,

            error: trava.erro,

            status: trava.status,

          };

        }

      }

      const resultado = montarResultadoSucesso(

        montarSessionUser(dbUser, email),

        dbUser.alterarSenhaObrigatorio,

      );

      return resultado;

    }



    const sessionUser: SessionUser = {

      id: 0,

      email,

      name: testProfile.name,

      nome: testProfile.name,

      usuario: email,

      funcao: testProfile.funcao,

      genero: normalizarGenero(testProfile.genero),

      regiaoId: 0,

      regiaoNome: testProfile.regiaoNome,

      alterarSenhaObrigatorio: false,

    };



    return montarResultadoSucesso(sessionUser, false);

  }



  let usuario = null;

  try {
    const usuarioEncontrado = await prisma.usuario.findFirst({
      where: {
        usuario: { equals: email, mode: "insensitive" },
      },
      include: usuarioInclude,
    });

    if (usuarioEncontrado) {
      const senhaValida = (usuarioEncontrado.senha?.trim() ?? "") === senha;
      const statusConta = normalizarStatusConta(
        usuarioEncontrado.statusConta,
        usuarioEncontrado.ativo,
      );

      if (senhaValida && statusConta === "Pendente") {
        return {
          ok: false,
          error: MENSAGEM_CONTA_PENDENTE,
          status: 403,
          code: AUTH_CODE_CONTA_PENDENTE,
        };
      }

      if (senhaValida && statusConta === "Inativo") {
        return {
          ok: false,
          error: "E-mail ou senha inválidos.",
          status: 401,
        };
      }

      if (senhaValida && statusConta === "Ativo" && usuarioEncontrado.ativo) {
        usuario = usuarioEncontrado;
      }
    }
  } catch (dbError) {

    console.error("Banco indisponível no login:", dbError);

    return {

      ok: false,

      error:

        "Serviço temporariamente indisponível. Use um e-mail de teste ou tente novamente.",

      status: 503,

    };

  }



  if (!usuario || (usuario.senha?.trim() ?? "") !== senha) {

    return {

      ok: false,

      error: "E-mail ou senha inválidos.",

      status: 401,

    };

  }



  const funcaoPromotor = usuario.funcao.trim().toLowerCase() === "promotor";

  if (funcaoPromotor) {

    const trava = await validarTravaAparelhoLogin(

      {

        id: usuario.id,

        deviceId: usuario.deviceId ?? null,

        ignorarTravaAparelho: usuario.ignorarTravaAparelho ?? false,

      },

      deviceId,

    );

    if (!trava.permitido) {

      return {

        ok: false,

        error: trava.erro,

        status: trava.status,

      };

    }

  }

  const resultado = montarResultadoSucesso(

    montarSessionUser(usuario, email),

    usuario.alterarSenhaObrigatorio,

  );

  return resultado;

}

