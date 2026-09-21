# Servicios independientes

## Servicio de conocimiento personal

`services/khoj/` contiene un servicio independiente de IA, búsqueda semántica y gestión de documentos. Se ejecuta separado del bot principal de InfoPlayer Left y conserva su propia arquitectura Python, frontend, Docker, documentación, pruebas y archivos de dependencias.

El servicio se mantiene bajo la licencia **GNU Affero General Public License v3 (AGPL-3.0)**. El archivo `services/khoj/LICENSE` y los avisos incluidos en el servicio deben conservarse al distribuir o modificar este código.

### Ejecución

Consulta `services/khoj/README.md` para la configuración oficial. Las opciones principales son:

```bash
cd services/khoj
uv sync
uv run khoj --host 0.0.0.0 --port 42110
```

También se incluyen `Dockerfile`, `prod.Dockerfile`, `computer.Dockerfile` y `docker-compose.yml` para su ejecución aislada.

### Relación con el bot principal

El bot de WhatsApp de la raíz continúa siendo un proyecto JavaScript independiente. El servicio de esta carpeta no se inicia con `npm start`, no comparte la sesión de WhatsApp y no reemplaza las funciones de Steam, Left 4 Dead 2, A2S o vigilancia.

El snapshot incluido corresponde al commit `ae229ca894c0b80ad84664afcfdde523b5e87057` y conserva el archivo `versions.json` del servicio.
