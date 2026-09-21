#!/usr/bin/env bash
set -euo pipefail

# Instala la versión estable actual desde el instalador oficial de Ollama.
curl -fsSL https://ollama.com/install.sh | sh

MODEL="${OLLAMA_MODEL:-gpt-oss:20b}"
ollama pull "$MODEL"
printf 'Ollama listo con el modelo %s. Inicia el servidor con: ollama serve\n' "$MODEL"
