"""Inspeciona planilhas de renovação (reais) SEM expor dados pessoais.

Uso:
    python scripts/inspecionar_planilha.py data/raw/porto
    python scripts/inspecionar_planilha.py data/raw/porto/arquivo.xlsx

Para cada arquivo mostra: formato real (xlsx, xls, HTML disfarçado de .xls ou texto/CSV),
abas, linha do cabeçalho, colunas com o tipo inferido, quantidade de linhas e 3 linhas
de exemplo MASCARADAS.

Regra da máscara: todo texto é mascarado por padrão (letras -> A/a, dígitos -> 9, mantendo
pontuação e espaços), exceto colunas sabidamente não pessoais (ramo, produto, situação...).
CPF/CNPJ, telefone e e-mail são mascarados em qualquer coluna. Nada é impresso sem máscara.
"""

from __future__ import annotations

import csv
import io
import re
import sys
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

import pandas as pd

EXTENSOES = {".xls", ".xlsx", ".xlsm", ".csv", ".htm", ".html", ".txt"}

# Colunas cujo conteúdo pode ser mostrado (categorias, não identificam pessoas).
COLUNAS_SEGURAS = [
    "ramo", "produto", "modalidade", "seguradora", "cia", "companhia", "situacao", "status",
    "tipo", "forma de pagamento", "forma pagamento", "moeda", "renovada", "cotada", "classe bonus",
    "bonus", "uf", "estado", "sucursal", "origem", "canal", "periodicidade", "vigencia",
    "inicio", "fim", "termino", "vencimento", "data", "premio", "comissao", "valor", "parcela",
    "iof", "franquia", "is ", "importancia segurada", "desconto", "agravo",
]
# Colunas sempre mascaradas, mesmo que batam com a lista acima.
COLUNAS_PESSOAIS = [
    "nome", "segurado", "cliente", "estipulante", "proponente", "razao", "cpf", "cnpj", "documento",
    "telefone", "celular", "fone", "whats", "email", "e mail", "endereco", "logradouro", "rua",
    "bairro", "cep", "cidade", "complemento", "numero", "apolice", "proposta", "placa", "chassi",
    "renavam", "nascimento", "nasc", "rg", "contato", "corretor", "item", "endosso", "contrato",
]

SEGURADORAS = {
    "Porto Seguro": ["porto seguro", "porto"],
    "Tokio Marine": ["tokio marine", "tokio"],
    "Mapfre": ["mapfre"],
    "Allianz": ["allianz"],
    "Zurich": ["zurich"],
    "Azul": ["azul seguros", "azul"],
    "Suhai": ["suhai"],
    "HDI": ["hdi"],
}


def normalizar(v: object) -> str:
    t = unicodedata.normalize("NFD", str(v)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9%/ ]+", " ", t.lower())).strip()


# --------------------------------------------------------------------------- máscara

RE_CPF = re.compile(r"\d{3}\.?\d{3}\.?\d{3}-?\d{2}")
RE_CNPJ = re.compile(r"\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}")
RE_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
RE_FONE = re.compile(r"\(?\d{2}\)?\s?9?\d{4}-?\d{4}")


def forma(texto: str, limite: int = 24) -> str:
    """Só a forma do texto: letras -> A/a, dígitos -> 9. Mantém pontuação e espaços."""
    out = []
    for ch in texto[:limite]:
        if ch.isdigit():
            out.append("9")
        elif ch.isalpha():
            out.append("A" if ch.isupper() else "a")
        else:
            out.append(ch)
    return "".join(out) + ("…" if len(texto) > limite else "")


def mascarar_padroes(texto: str) -> str:
    for rx in (RE_EMAIL, RE_CNPJ, RE_CPF, RE_FONE):
        texto = rx.sub(lambda m: forma(m.group(0), 40), texto)
    return re.sub(r"\d{6,}", lambda m: "9" * len(m.group(0)), texto)  # qualquer número longo


def parece_dado(texto: str) -> bool:
    """Um "cabeçalho" com cara de valor (números longos, @, CPF, datas...) pode ser dado pessoal."""
    t = texto.strip()
    tudo_maiusculo_com_3_palavras = t.isupper() and len(t.split()) >= 3  # nomes costumam vir assim nos exports
    return bool(re.search(r"\d{3,}|@|\d{1,2}/\d{1,2}/\d{2,4}", t)) or len(t) > 45 or tudo_maiusculo_com_3_palavras


def cabecalho_seguro(texto: str, reconhecido: bool) -> str:
    """Nome de coluna para impressão: em claro só se o cabeçalho foi reconhecido e não parece dado."""
    if not reconhecido or parece_dado(texto):
        return forma(texto, 40) + " [nome mascarado]"
    return texto


def coluna_segura(cabecalho: str) -> bool:
    h = normalizar(cabecalho)
    if "comissao" in h or "premio" in h:  # percentuais/valores, mesmo "do corretor"
        return True
    if any(p in h for p in COLUNAS_PESSOAIS):
        return False
    return any(s in h for s in COLUNAS_SEGURAS)


def mascarar(valor: object, cabecalho: str) -> str:
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return ""
    if isinstance(valor, (datetime, date, pd.Timestamp)):
        return "<data>" if not coluna_segura(cabecalho) else str(valor)[:10]
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        if coluna_segura(cabecalho):
            return str(valor)
        return forma(str(valor))
    texto = str(valor).strip()
    if coluna_segura(cabecalho) and len(texto) <= 40:
        return mascarar_padroes(texto)
    return forma(texto)


# --------------------------------------------------------------------------- leitura


def formato_real(caminho: Path) -> str:
    cab = caminho.read_bytes()[:2048]
    if cab.startswith(b"PK\x03\x04"):
        return "xlsx"
    if cab.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        return "xls"
    texto = cab.decode("latin-1", errors="ignore").lstrip("﻿ \r\n\t").lower()
    if texto.startswith("<"):
        return "html"
    return "texto"


def ler_texto(caminho: Path) -> tuple[str, str]:
    bruto = caminho.read_bytes()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return bruto.decode(enc), enc
        except UnicodeDecodeError:
            continue
    return bruto.decode("latin-1", errors="replace"), "latin-1"


def ler_abas(caminho: Path, fmt: str) -> tuple[dict[str, pd.DataFrame], list[str]]:
    """Lê todas as abas sem cabeçalho (header=None). Tenta os leitores e registra o que funcionou."""
    tentativas: list[str] = []
    ordem = {"xlsx": ["xlsx", "xls", "html"], "xls": ["xls", "xlsx", "html"], "html": ["html", "xls", "xlsx"], "texto": ["csv", "html"]}[fmt]
    for leitor in ordem:
        try:
            if leitor == "xlsx":
                abas = pd.read_excel(caminho, sheet_name=None, header=None, engine="openpyxl")
            elif leitor == "xls":
                abas = pd.read_excel(caminho, sheet_name=None, header=None, engine="xlrd")
            elif leitor == "html":
                texto, _ = ler_texto(caminho)
                tabelas = pd.read_html(io.StringIO(texto), header=None, thousands=None, keep_default_na=False)
                abas = {}
                for i, t in enumerate(tabelas):
                    if not isinstance(t.columns, pd.RangeIndex):  # cabeçalho em <th>: vira a 1ª linha
                        cols = [" ".join(str(x) for x in c if "Unnamed" not in str(x)) if isinstance(c, tuple) else str(c) for c in t.columns]
                        t = pd.concat([pd.DataFrame([cols]), pd.DataFrame(t.values)], ignore_index=True)
                    abas[f"tabela_{i + 1}"] = t
            else:
                texto, enc = ler_texto(caminho)
                try:
                    sep = csv.Sniffer().sniff(texto[:4096], delimiters=";,\t|").delimiter
                except csv.Error:
                    sep = ";" if texto.count(";") >= texto.count(",") else ","
                abas = {f"csv (sep '{sep}', {enc})": pd.read_csv(io.StringIO(texto), sep=sep, header=None, dtype=str, keep_default_na=False)}
            tentativas.append(f"{leitor}: ok")
            return abas, tentativas
        except Exception as e:  # noqa: BLE001 - queremos registrar qualquer falha de leitura
            tentativas.append(f"{leitor}: falhou ({type(e).__name__}: {forma(str(e), 80)})")
    return {}, tentativas


# --------------------------------------------------------------------------- análise

PALAVRAS_CABECALHO = {
    "segurado", "nome", "cpf", "cnpj", "cpf/cnpj", "apolice", "vigencia", "vencimento", "ramo", "produto",
    "premio", "comissao", "seguradora", "corretor", "telefone", "email", "inicio", "fim", "termino",
    "proposta", "placa", "item", "situacao", "status", "parcelas", "cliente", "renovada", "cotada",
}


def pontuar(linha: list[object]) -> int:
    pontos = 0
    for v in linha:
        if isinstance(v, str) and v.strip():
            h = normalizar(v)
            if any(p in h.split() or h.startswith(p) for p in PALAVRAS_CABECALHO):
                pontos += 2
            elif not re.search(r"\d", h) and len(h) < 40:
                pontos += 0.5
    return pontos


def detectar_cabecalho(df: pd.DataFrame) -> int:
    melhor, pontos = 0, -1.0
    for i in range(min(30, len(df))):
        p = pontuar(list(df.iloc[i].values))
        if p > pontos:
            melhor, pontos = i, p
    return melhor


@dataclass
class Coluna:
    nome: str
    tipo: str
    preenchido: float


def inferir_tipo(valores: list[object]) -> str:
    vals = [v for v in valores if v is not None and not (isinstance(v, float) and pd.isna(v)) and str(v).strip() != ""]
    if not vals:
        return "vazia"
    tipos: dict[str, int] = {}

    def conta(t: str) -> None:
        tipos[t] = tipos.get(t, 0) + 1

    for v in vals:
        if isinstance(v, bool):
            conta("booleano")
        elif isinstance(v, (datetime, date, pd.Timestamp)):
            conta("data")
        elif isinstance(v, (int, float)):
            conta("data (serial Excel?)" if 30000 < float(v) < 60000 and float(v).is_integer() else "número")
        else:
            t = str(v).strip()
            d = re.sub(r"\D", "", t)
            if RE_EMAIL.fullmatch(t):
                conta("e-mail")
            elif re.fullmatch(r"\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}( .*)?", t):
                conta("data em texto")
            elif RE_CNPJ.fullmatch(t) or (t.isdigit() and len(t) == 14):
                conta("CNPJ")
            elif RE_CPF.fullmatch(t) or (t.isdigit() and len(t) == 11):
                conta("CPF (ou nº de 11 dígitos)")
            elif re.fullmatch(r"\(?\d{2}\)?\s?9?\d{4}-?\d{4}", t):
                conta("telefone")
            elif re.fullmatch(r"(R\$\s*)?-?[\d.]+(,\d+)?", t) and d:
                conta("valor/número em texto")
            elif t.lower() in {"sim", "não", "nao", "s", "n", "true", "false", "x", "✅", "❌"}:
                conta("sim/não")
            else:
                conta("texto")
    principal = max(tipos, key=tipos.get)
    outros = [t for t in tipos if t != principal]
    return principal + (f" (+{', '.join(outros)})" if outros else "")


def seguradoras_citadas(df: pd.DataFrame, nome_arquivo: str) -> list[str]:
    alvo = normalizar(nome_arquivo) + " " + " ".join(normalizar(v) for v in df.head(40).values.ravel() if isinstance(v, str))
    palavras = set(alvo.split())
    achadas = []
    for nome, apelidos in SEGURADORAS.items():
        if any((a in alvo) if " " in a else (a in palavras) for a in apelidos):
            achadas.append(nome)
    return achadas


def inspecionar(caminho: Path) -> None:
    print("=" * 100)
    print(f"ARQUIVO: {caminho.as_posix()}  ({caminho.stat().st_size} bytes)")
    fmt = formato_real(caminho)
    print(f"Formato real: {fmt} (extensão: {caminho.suffix or '-'})")
    abas, tentativas = ler_abas(caminho, fmt)
    print("Leitores: " + " | ".join(tentativas))
    if not abas:
        texto, enc = ler_texto(caminho)
        sem_tags = re.sub(r"<[^>]+>|\{[^}]*\}", " ", texto).strip()
        print(f"Sem tabela legível ({enc}, {len(texto)} caracteres; texto fora das tags: {len(sem_tags)} caracteres). Provável exportação vazia.")
        return

    for nome_aba, df in abas.items():
        df = df.dropna(how="all").dropna(axis=1, how="all").reset_index(drop=True)
        print("-" * 100)
        print(f"Aba: {nome_aba!r}  ({df.shape[0]} linhas não vazias x {df.shape[1]} colunas)")
        if df.empty:
            print("  (vazia)")
            continue
        print(f"  Seguradoras citadas (nome do arquivo/conteúdo): {', '.join(seguradoras_citadas(df, caminho.name)) or 'nenhuma'}")
        i_cab = detectar_cabecalho(df)
        reconhecido = pontuar(list(df.iloc[i_cab].values)) >= 4  # pelo menos 2 palavras típicas de cabeçalho
        if not reconhecido:
            print("  ATENÇÃO: cabeçalho não reconhecido; nomes de coluna mascarados (pode não haver cabeçalho).")
        cab = [str(v).strip() if v is not None and not (isinstance(v, float) and pd.isna(v)) else f"(sem nome {j + 1})" for j, v in enumerate(df.iloc[i_cab].values)]
        print(f"  Linha do cabeçalho: {i_cab + 1} (entre as linhas não vazias)")
        for k in range(i_cab):
            print(f"  Linha {k + 1} antes do cabeçalho (mascarada): {' | '.join(forma(str(v), 40) for v in df.iloc[k].values if isinstance(v, str) and v.strip())}")
        dados = df.iloc[i_cab + 1 :].reset_index(drop=True)
        print(f"  Linhas de dados: {len(dados)}")
        print("  Colunas:")
        for j, nome in enumerate(cab):
            valores = list(dados.iloc[:, j].values) if j < dados.shape[1] else []
            cheios = sum(1 for v in valores if v is not None and not (isinstance(v, float) and pd.isna(v)) and str(v).strip() != "")
            pct = 100 * cheios / len(valores) if valores else 0
            marca = "" if coluna_segura(nome) else "  [mascarada]"
            print(f"    {j + 1:>2}. {cabecalho_seguro(nome, reconhecido)!r:<45} {inferir_tipo(valores):<45} {pct:5.0f}% preenchida{marca}")
        print("  Exemplos (até 3 linhas, MASCARADAS):")
        for r in range(min(3, len(dados))):
            linha = [f"{j + 1}={mascarar(v, cab[j] if reconhecido else '')}" for j, v in enumerate(dados.iloc[r].values) if j < len(cab)]
            print("    - " + " ; ".join(linha))


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    alvo = Path(sys.argv[1])
    arquivos = sorted(p for p in alvo.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSOES) if alvo.is_dir() else [alvo]
    if not arquivos:
        print(f"Nenhuma planilha em {alvo}")
    for arq in arquivos:
        inspecionar(arq)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    main()
