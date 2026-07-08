import { MENSAGEM_EMAIL_JA_CADASTRO } from "@/lib/auth-codes";

import {

  emailLoginValido,

  FUNCAO_USUARIO_PENDENTE,

  normalizarEmailLogin,

} from "@/lib/admin-usuarios";

import { prisma } from "@/lib/prisma";

import { resolverRegiaoCadastroPublico } from "@/lib/regioes-publicas";

import {

  buscarUsuarioPorEmailLogin,

  isErroEmailLoginDuplicado,

} from "@/lib/usuario-email-login";



export type CadastroUsuarioInput = {

  nome: string;

  email: string;

  senha: string;

  confirmarSenha: string;

  regiaoId: number;

};



export type CadastroUsuarioResult =

  | { ok: true }

  | { ok: false; error: string; status: number };



class CadastroEmailDuplicadoError extends Error {

  constructor() {

    super("EMAIL_DUPLICADO");

    this.name = "CadastroEmailDuplicadoError";

  }

}



function resultadoEmailDuplicado(): CadastroUsuarioResult {

  return {

    ok: false,

    error: MENSAGEM_EMAIL_JA_CADASTRO,

    status: 409,

  };

}



function senhaValida(senha: string): boolean {

  return senha.trim().length >= 6;

}



export async function cadastrarUsuarioPublico(

  input: CadastroUsuarioInput,

): Promise<CadastroUsuarioResult> {

  const nome = input.nome.trim();

  const email = normalizarEmailLogin(input.email);

  const senha = input.senha.trim();

  const confirmarSenha = input.confirmarSenha.trim();

  const regiaoId = Number(input.regiaoId);



  if (!nome || nome.length < 3) {

    return {

      ok: false,

      error: "Informe seu nome completo.",

      status: 400,

    };

  }



  if (!emailLoginValido(email)) {

    return {

      ok: false,

      error: "Informe um e-mail válido.",

      status: 400,

    };

  }



  if (!Number.isInteger(regiaoId) || regiaoId <= 0) {

    return {

      ok: false,

      error: "Selecione a região em que você vai atuar.",

      status: 400,

    };

  }



  const regiao = await resolverRegiaoCadastroPublico(regiaoId);



  if (!regiao) {

    return {

      ok: false,

      error: "Região inválida. Selecione uma região disponível.",

      status: 400,

    };

  }



  if (!senhaValida(senha)) {

    return {

      ok: false,

      error: "A senha deve ter pelo menos 6 caracteres.",

      status: 400,

    };

  }



  if (senha !== confirmarSenha) {

    return {

      ok: false,

      error: "As senhas informadas não coincidem.",

      status: 400,

    };

  }



  const emailEmUso = await buscarUsuarioPorEmailLogin(email);



  if (emailEmUso) {

    return resultadoEmailDuplicado();

  }



  try {

    await prisma.$transaction(async (tx) => {

      const emailEmUsoNaTransacao = await buscarUsuarioPorEmailLogin(email, {

        tx,

      });



      if (emailEmUsoNaTransacao) {

        throw new CadastroEmailDuplicadoError();

      }



      const criado = await tx.usuario.create({

        data: {

          nome,

          usuario: email,

          senha,

          funcao: FUNCAO_USUARIO_PENDENTE,

          regiaoId: regiao.id,

          statusConta: "Pendente",

          ativo: false,

          alterarSenhaObrigatorio: false,

          cercaVirtualAtiva: false,

          clt: false,

          genero: "M",

        },

      });



      await tx.usuarioRegiao.create({

        data: {

          usuarioId: criado.id,

          regiaoId: regiao.id,

        },

      });

    });

  } catch (error) {

    if (error instanceof CadastroEmailDuplicadoError) {

      return resultadoEmailDuplicado();

    }



    if (isErroEmailLoginDuplicado(error)) {

      return resultadoEmailDuplicado();

    }



    throw error;

  }



  return { ok: true };

}

