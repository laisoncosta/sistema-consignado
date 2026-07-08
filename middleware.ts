import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";



import {

  canAccessRoute,

  getHomePath,

  normalizeRole,

  type UserRole,

} from "@/lib/rbac";



const SESSION_COOKIE = "shi_session";



type SessionCookie = {

  funcao?: string;

  alterarSenhaObrigatorio?: boolean;

};



function getSessionFromRequest(request: NextRequest): {

  role: UserRole | null;

  alterarSenhaObrigatorio: boolean;

} {

  const raw = request.cookies.get(SESSION_COOKIE)?.value;



  if (!raw) {

    return { role: null, alterarSenhaObrigatorio: false };

  }



  try {

    const parsed = JSON.parse(raw) as SessionCookie;

    return {

      role: normalizeRole(parsed.funcao ?? ""),

      alterarSenhaObrigatorio: parsed.alterarSenhaObrigatorio === true,

    };

  } catch {

    return { role: null, alterarSenhaObrigatorio: false };

  }

}



export function middleware(request: NextRequest) {

  const { pathname } = request.nextUrl;

  const { role, alterarSenhaObrigatorio } = getSessionFromRequest(request);



  if (pathname === "/alterar-senha") {

    if (!role) {

      return NextResponse.redirect(new URL("/login", request.url));

    }



    if (!alterarSenhaObrigatorio) {

      return NextResponse.redirect(new URL(getHomePath(role), request.url));

    }



    return NextResponse.next();

  }



  if (!pathname.startsWith("/dashboard")) {

    return NextResponse.next();

  }



  if (!role) {

    return NextResponse.redirect(new URL("/login", request.url));

  }



  if (alterarSenhaObrigatorio) {

    return NextResponse.redirect(new URL("/alterar-senha", request.url));

  }



  if (!canAccessRoute(role, pathname)) {

    return NextResponse.redirect(new URL(getHomePath(role), request.url));

  }



  return NextResponse.next();

}



export const config = {

  matcher: ["/dashboard/:path*", "/alterar-senha"],

};

