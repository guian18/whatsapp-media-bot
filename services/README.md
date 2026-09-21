# Backends locales de IA

El bot puede usar backends gratuitos ejecutados en el mismo equipo mediante APIs HTTP. No se incluyen claves privadas en el repositorio; los modelos y sus licencias deben revisarse por separado.

## Ollama

Ollama es la opción recomendada para una instalación sencilla. Usa `AI_PROVIDER=ollama`, escucha normalmente en `http://127.0.0.1:11434` y ofrece una API local sin autenticación por defecto.

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gpt-oss:20b
ollama serve
```

```env
AI_PROVIDER=ollama
AI_MODEL=gpt-oss:20b
OLLAMA_URL=http://127.0.0.1:11434/v1/chat/completions
OLLAMA_API_KEY=ollama
```

Documentación: [Ollama](https://github.com/ollama/ollama), [descarga](https://ollama.com/download) y [compatibilidad OpenAI](https://docs.ollama.com/api/openai-compatibility).

## llama.cpp server

llama.cpp es una opción ligera para modelos GGUF y ofrece un endpoint compatible con OpenAI. Usa `AI_PROVIDER=llama_cpp` y configura el modelo que hayas cargado.

```bash
./build/bin/llama-server --model /ruta/al/modelo.gguf --host 127.0.0.1 --port 8080
```

```env
AI_PROVIDER=llama_cpp
AI_MODEL=nombre-del-modelo-gguf
LLAMA_CPP_URL=http://127.0.0.1:8080/v1/chat/completions
LLAMA_CPP_API_KEY=
```

Documentación: [repositorio llama.cpp](https://github.com/ggml-org/llama.cpp) y [servidor HTTP](https://github.com/ggml-org/llama.cpp/tree/master/tools/server).

## LocalAI

LocalAI es otra alternativa compatible con OpenAI. Se recomienda para quien ya utilice Docker y quiera gestionar varios backends/modelos.

```bash
docker run -p 8081:8080 --name local-ai -ti localai/localai:latest
```

```env
AI_PROVIDER=localai
AI_MODEL=nombre-del-modelo
LOCALAI_URL=http://127.0.0.1:8081/v1/chat/completions
LOCALAI_API_KEY=
```

Documentación: [repositorio LocalAI](https://github.com/mudler/LocalAI) y [compatibilidad OpenAI](https://localai.io/features/openai-compatibility/).

## Seguridad y recursos

Los tres backends son gratuitos en local, pero no tienen coste cero: requieren descarga de modelos, almacenamiento, CPU/RAM o GPU/VRAM y electricidad. Los servidores locales no deben exponerse a Internet sin autenticación, firewall y TLS. Si se configura una API remota o una clave para acceso remoto, debe guardarse en `.env`, secretos de Heroku o el gestor de secretos correspondiente, nunca en el código.
