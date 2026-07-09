"use client";



import { Loader2, MapPin } from "lucide-react";

import { useState, type CSSProperties } from "react";



import type { BrandTheme } from "@/lib/brands";

import { formatarCep } from "@/lib/admin-lojas";

import {

  classeInput,

  classeLabelCampo,

  classeSecaoFormularioCompacta,

  classeTextoAuxiliar,

  classeTituloLocalizacao,

} from "@/lib/form-aparencia";

import { ufPorNomeRegiao } from "@/lib/uf-regiao";



export type LojaEnderecoForm = {

  cep: string;

  rua: string;

  numero: string;

  bairro: string;

  cidade: string;

  uf: string;

  latitude: string;

  longitude: string;

};



type LojaLocalizacaoCamposProps = {

  idPrefix: string;

  valores: LojaEnderecoForm;

  brand: BrandTheme;

  regiaoNome?: string;

  onChange: (patch: Partial<LojaEnderecoForm>) => void;

};



export function LojaLocalizacaoCampos({

  idPrefix,

  valores,

  brand,

  regiaoNome,

  onChange,

}: LojaLocalizacaoCamposProps) {

  const [buscandoCep, setBuscandoCep] = useState(false);

  const [validandoPonto, setValidandoPonto] = useState(false);

  const [erroCep, setErroCep] = useState<string | null>(null);

  const [erroGeocode, setErroGeocode] = useState<string | null>(null);



  const inputRingStyle = { "--tw-ring-color": brand.primary } as CSSProperties;

  const ufFallback = regiaoNome ? ufPorNomeRegiao(regiaoNome) : "AM";



  async function consultarCep(cepDigitado: string) {

    const cep = cepDigitado.replace(/\D/g, "");



    if (cep.length !== 8) {

      return;

    }



    setBuscandoCep(true);

    setErroCep(null);

    setErroGeocode(null);



    try {

      const response = await fetch(`/api/admin/cep/${cep}`, {

        credentials: "include",

      });

      const data = await response.json();



      if (!response.ok) {

        throw new Error(data.error ?? "Não foi possível consultar o CEP.");

      }



      onChange({

        cep: data.cep ?? formatarCep(cep),

        rua: data.rua ?? "",

        bairro: data.bairro ?? "",

        cidade: data.cidade ?? "",

        uf: data.uf || ufFallback,

        numero: "",

        latitude: "",

        longitude: "",

      });

    } catch (error) {

      setErroCep(

        error instanceof Error

          ? error.message

          : "Não foi possível consultar o CEP.",

      );

    } finally {

      setBuscandoCep(false);

    }

  }



  async function validarPontoNoMapa(numeroInformado?: string) {

    const numero = (numeroInformado ?? valores.numero).trim();

    const uf = valores.uf.trim() || ufFallback;



    if (!numero) {

      return;

    }



    if (!valores.rua.trim() || !valores.bairro.trim() || !valores.cidade.trim()) {

      setErroGeocode("Preencha o CEP para carregar rua, bairro e cidade.");

      return;

    }



    setValidandoPonto(true);

    setErroGeocode(null);



    try {

      const response = await fetch("/api/admin/geocode", {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          rua: valores.rua,

          numero,

          bairro: valores.bairro,

          cidade: valores.cidade,

          uf,

          cep: valores.cep,

        }),

      });

      const data = await response.json();



      if (!response.ok) {

        throw new Error(data.error ?? "Não foi possível validar o ponto no mapa.");

      }



      onChange({

        numero,

        uf,

        latitude:

          data.latitude !== null && data.latitude !== undefined

            ? String(data.latitude)

            : "",

        longitude:

          data.longitude !== null && data.longitude !== undefined

            ? String(data.longitude)

            : "",

      });

    } catch (error) {

      onChange({ latitude: "", longitude: "" });

      setErroGeocode(

        error instanceof Error

          ? error.message

          : "Não foi possível validar o ponto no mapa.",

      );

    } finally {

      setValidandoPonto(false);

    }

  }



  return (

    <div className={classeSecaoFormularioCompacta}>

      <div className={classeTituloLocalizacao}>

        <MapPin className="h-4 w-4" style={{ color: brand.primary }} />

        Localização

      </div>



      <div className="space-y-4">

        <div>

          <label

            htmlFor={`${idPrefix}-cep`}

            className={classeLabelCampo}

          >

            CEP

          </label>

          <div className="relative">

            <input

              id={`${idPrefix}-cep`}

              value={valores.cep}

              onChange={(event) => {

                onChange({ cep: formatarCep(event.target.value) });

              }}

              onBlur={() => void consultarCep(valores.cep)}

              placeholder="00000-000"

              className={classeInput}

              style={inputRingStyle}

            />

            {buscandoCep ? (

              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />

            ) : null}

          </div>

          {erroCep ? (

            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{erroCep}</p>

          ) : (

            <p className={`mt-2 ${classeTextoAuxiliar}`}>

              O CEP preenche rua, bairro, cidade e UF. Confira os dados e informe

              o número para validar latitude e longitude no mapa.

            </p>

          )}

        </div>



        <div className="grid grid-cols-[minmax(0,4fr)_minmax(0,1fr)] gap-3">

          <div>

            <label

              htmlFor={`${idPrefix}-rua`}

              className={classeLabelCampo}

            >

              Rua

            </label>

            <input

              id={`${idPrefix}-rua`}

              value={valores.rua}

              onChange={(event) => {

                onChange({

                  rua: event.target.value,

                  latitude: "",

                  longitude: "",

                });

                setErroGeocode(null);

              }}

              className={classeInput}

              style={inputRingStyle}

            />

          </div>

          <div>

            <label

              htmlFor={`${idPrefix}-numero`}

              className={classeLabelCampo}

            >

              Nº

            </label>

            <input

              id={`${idPrefix}-numero`}

              value={valores.numero}

              inputMode="numeric"

              onChange={(event) => {

                onChange({

                  numero: event.target.value,

                  latitude: "",

                  longitude: "",

                });

                setErroGeocode(null);

              }}

              onBlur={(event) => void validarPontoNoMapa(event.target.value)}

              placeholder="123"

              className={classeInput}

              style={inputRingStyle}

            />

          </div>

        </div>



        {validandoPonto ? (

          <div className={`flex items-center gap-2 text-xs ${classeTextoAuxiliar}`}>

            <Loader2 className="h-3.5 w-3.5 animate-spin" />

            Validando ponto no mapa...

          </div>

        ) : null}



        {erroGeocode ? (

          <p className="text-xs text-red-600 dark:text-red-400">{erroGeocode}</p>

        ) : null}



        <div className="grid gap-4 sm:grid-cols-3">

          <div>

            <label

              htmlFor={`${idPrefix}-bairro`}

              className={classeLabelCampo}

            >

              Bairro

            </label>

            <input

              id={`${idPrefix}-bairro`}

              value={valores.bairro}

              onChange={(event) => {

                onChange({

                  bairro: event.target.value,

                  latitude: "",

                  longitude: "",

                });

                setErroGeocode(null);

              }}

              className={classeInput}

              style={inputRingStyle}

            />

          </div>

          <div>

            <label

              htmlFor={`${idPrefix}-cidade`}

              className={classeLabelCampo}

            >

              Cidade

            </label>

            <input

              id={`${idPrefix}-cidade`}

              value={valores.cidade}

              onChange={(event) => {

                onChange({

                  cidade: event.target.value,

                  latitude: "",

                  longitude: "",

                });

                setErroGeocode(null);

              }}

              className={classeInput}

              style={inputRingStyle}

            />

          </div>

          <div>

            <label

              htmlFor={`${idPrefix}-uf`}

              className={classeLabelCampo}

            >

              UF

            </label>

            <input

              id={`${idPrefix}-uf`}

              value={valores.uf}

              maxLength={2}

              onChange={(event) => {

                onChange({

                  uf: event.target.value.toUpperCase().slice(0, 2),

                  latitude: "",

                  longitude: "",

                });

                setErroGeocode(null);

              }}

              className={`${classeInput} uppercase`}

              style={inputRingStyle}

            />

          </div>

        </div>

      </div>

    </div>

  );

}


