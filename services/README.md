# Servicios independientes

## Servicio de conocimiento personal

`services/khoj/` contiene el backend de IA, búsqueda semántica y gestión de documentos que el bot puede seleccionar mediante `AI_PROVIDER=khoj`. Conserva su propia arquitectura Python, frontend, Docker, documentación, pruebas y archivos de dependencias.

El servicio se mantiene bajo la licencia **GNU Affero General Public License v3 (AGPL-3.0)**. El archivo `services/khoj/LICENSE` y los avisos incluidos en el servicio deben conservarse al distribuir o modificar este código.

### Ejecución

Consulta `services/khoj/README.md` para la configuración oficial. Las opciones principales son:

```bash
cd services/khoj
uv sync
uv run khoj --host 0.0.0.0 --port 42110
```

También se incluyen `Dockerfile`, `prod.Dockerfile`, `computer.Dockerfile` y `docker-compose.yml` para su ejecución aislada.

### Integración con el bot principal

El bot de WhatsApp de la raíz continúa ejecutándose en JavaScript y envía las consultas de IA a `http://127.0.0.1:42110/api/chat?client=khoj` cuando `AI_PROVIDER=khoj`. Este servicio no se inicia con `npm start`, no comparte la sesión de WhatsApp y no reemplaza las funciones de Steam, Left 4 Dead 2, A2S o vigilancia.

El snapshot incluido corresponde al commit `ae229ca894c0b80ad84664afcfdde523b5e87057` y conserva el archivo `versions.json` del servicio.

## Ollama

El bot también admite Ollama como proveedor local mediante `AI_PROVIDER=ollama`. Ollama funciona en `http://127.0.0.1:11434` y expone compatibilidad con `/v1/chat/completions`. Consulta la [documentación oficial de compatibilidad OpenAI](https://docs.ollama.com/api/openai-compatibility) y descarga la versión actual desde [ollama.com/download](https://ollama.com/download).
