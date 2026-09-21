import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { healthUrl, validateInteger } from "@/lib/control-settings";
import { controlRequest, normalizeControlApiUrl, toControlPayload } from "@/lib/control-api";
import { useColors } from "@/hooks/use-colors";
const SETTINGS_KEY = "infoplayerleft-control-settings-v1";
const CONTROL_TOKEN_KEY = "infoplayerleft-control-token-v1";
const DEFAULT_SETTINGS = {
  provider: "local",
  model: "local-model",
  llamaUrl: "http://127.0.0.1:8080/v1/chat/completions",
  controlApiUrl: "",
  controlToken: "",
  maxTokens: "64",
  timeoutMs: "120000",
  language: "es-ES",
  tone: "insultos",
  skipSearch: true,
  fastMode: true,
  notificationJid: "",
  commandAliases: ""
};
const COMMAND_TARGETS = ["info", "buscar", "servidor", "jugadores", "ping", "ai", "ia", "tono", "idioma", "proveedor", "anime", "vigilar", "vigilarnick", "novigilar", "lista", "escaneo", "ayuda", "help"];
const PROVIDER_DEFAULTS = {
  local: { model: "local-model", url: "http://127.0.0.1:8080/v1/chat/completions" },
  groq: { model: "openai/gpt-oss-20b", url: "https://api.groq.com/openai/v1/chat/completions" },
  gemini: { model: "gemini-2.5-flash", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" },
  mistral: { model: "mistral-small-4-0-26-03", url: "https://api.mistral.ai/v1/chat/completions" },
  ollama: { model: "gpt-oss:20b", url: "http://127.0.0.1:11434/v1/chat/completions" },
  khoj: { model: "khoj", url: "http://127.0.0.1:42110/api/chat?client=khoj" },
  openrouter: { model: "openrouter/auto", url: "https://openrouter.ai/api/v1/chat/completions" }
};
function HomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [connectionState, setConnectionState] = useState("idle");
  const [connectionMessage, setConnectionMessage] = useState("A\xFAn no se ha comprobado la conexi\xF3n");
  const [saveMessage, setSaveMessage] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState({});
  const [commandAlias, setCommandAlias] = useState("");
  const [commandTarget, setCommandTarget] = useState("info");
  useEffect(() => {
    Promise.all([AsyncStorage.getItem(SETTINGS_KEY), SecureStore.getItemAsync(CONTROL_TOKEN_KEY)]).then(([value, token]) => {
      if (!value) return;
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(value), controlToken: token || "" });
      } catch {
        setSaveMessage("No se pudieron leer las preferencias guardadas");
      }
    }).catch(() => setSaveMessage("No se pudieron leer las preferencias guardadas"));
  }, []);
  const update = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaveMessage("");
  }, []);
  const selectProvider = useCallback((provider) => {
    const defaults = PROVIDER_DEFAULTS[provider];
    setSettings((current) => ({ ...current, provider, model: defaults.model, llamaUrl: defaults.url }));
    setSaveMessage("");
  }, []);
  const addCommandAlias = useCallback(() => {
    const alias = commandAlias.trim().replace(/^!/, "").toLowerCase();
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(alias)) {
      Alert.alert("Nombre inv\xE1lido", "Usa letras, n\xFAmeros o guion bajo; debe empezar por una letra.");
      return;
    }
    if (alias === commandTarget) {
      Alert.alert("Nombre inv\xE1lido", "El nuevo nombre debe ser diferente al comando original.");
      return;
    }
    const entries = settings.commandAliases.split(",").map((entry) => entry.trim()).filter(Boolean).filter((entry) => {
      const [existingAlias, existingTarget] = entry.split("=").map((part) => part.trim().toLowerCase());
      return existingAlias !== alias && existingTarget !== commandTarget;
    });
    update("commandAliases", [...entries, `${alias}=${commandTarget}`].join(", "));
    setCommandAlias("");
  }, [commandAlias, commandTarget, settings.commandAliases, update]);
  const restoreOriginalCommands = useCallback(() => {
    update("commandAliases", "");
    setSaveMessage("Comandos originales restaurados en el formulario; pulsa Guardar configuraci\xF3n");
  }, [update]);
  const saveSettings = useCallback(async () => {
    if (!validateInteger(settings.maxTokens, 8, 4096)) {
      Alert.alert("Valor inv\xE1lido", "Los tokens m\xE1ximos deben estar entre 8 y 4096.");
      return;
    }
    if (!validateInteger(settings.timeoutMs, 1e3, 6e5)) {
      Alert.alert("Valor inv\xE1lido", "El tiempo de espera debe estar entre 1000 y 600000 ms.");
      return;
    }
    setIsSaving(true);
    try {
      const controlApiUrl = normalizeControlApiUrl(settings.controlApiUrl);
      const settingsToSave = { ...settings, controlApiUrl };
      const { controlToken, ...localSettings } = settingsToSave;
      if (controlApiUrl) {
        await controlRequest(controlApiUrl, controlToken, "/api/control/settings", {
          method: "POST",
          body: JSON.stringify(toControlPayload(settingsToSave))
        });
      }
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(localSettings));
      await SecureStore.setItemAsync(CONTROL_TOKEN_KEY, controlToken);
      if (controlApiUrl !== settings.controlApiUrl) {
        setSettings(settingsToSave);
      }
      setSaveMessage(controlApiUrl ? "Guardado en el bot y en este tel\xE9fono" : "Guardado en este tel\xE9fono");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la configuraci\xF3n");
    } finally {
      setIsSaving(false);
    }
  }, [settings]);
  const testConnection = useCallback(async () => {
    setConnectionState("checking");
    setConnectionMessage("Comprobando el bot\u2026");
    try {
      if (settings.controlApiUrl.trim()) {
        const status = await controlRequest(settings.controlApiUrl, settings.controlToken, "/api/control/status");
        setRemoteStatus(status);
        setConnectionMessage(`Bot ${status.whatsapp || "activo"} \xB7 proveedor ${status.provider || settings.provider}`);
      } else {
        const response = await fetch(healthUrl(settings.llamaUrl), { method: "GET" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setConnectionMessage("llama.cpp est\xE1 respondiendo");
      }
      setConnectionState("online");
    } catch (error) {
      setConnectionState("offline");
      setConnectionMessage(`No se pudo conectar: ${error instanceof Error ? error.message : "revisa la URL"}`);
    }
  }, [settings.controlApiUrl, settings.controlToken, settings.llamaUrl, settings.provider]);
  useEffect(() => {
    if (!settings.controlApiUrl.trim() || !settings.controlToken.trim()) return;
    const timer = setInterval(() => void testConnection(), 15e3);
    return () => clearInterval(timer);
  }, [settings.controlApiUrl, settings.controlToken, testConnection]);
  const uptimeLabel = remoteStatus.uptimeSeconds == null ? "\u2014" : `${Math.floor(remoteStatus.uptimeSeconds / 3600)}h ${Math.floor(remoteStatus.uptimeSeconds % 3600 / 60)}m`;
  const testRemoteAI = useCallback(async () => {
    if (!settings.controlApiUrl.trim()) {
      setTestMessage("Configura primero la URL de la API remota");
      return;
    }
    setTestMessage("Probando IA remota\u2026");
    try {
      const result = await controlRequest(settings.controlApiUrl, settings.controlToken, "/api/control/test-ai", {
        method: "POST",
        body: JSON.stringify({ question: "Responde solo: OK" })
      });
      setTestMessage(`Respuesta: ${result.answer}`);
    } catch (error) {
      setTestMessage(`Error: ${error instanceof Error ? error.message : "no se pudo probar"}`);
    }
  }, [settings.controlApiUrl, settings.controlToken]);
  const statusColor = connectionState === "online" ? colors.success : connectionState === "offline" ? colors.error : colors.muted;
  return /* @__PURE__ */ React.createElement(ScreenContainer, { edges: ["top", "left", "right", "bottom"], containerClassName: "bg-background" }, /* @__PURE__ */ React.createElement(KeyboardAvoidingView, { behavior: Platform.OS === "ios" ? "padding" : void 0, style: styles.flex }, /* @__PURE__ */ React.createElement(ScrollView, { contentContainerStyle: styles.content, keyboardShouldPersistTaps: "handled" }, /* @__PURE__ */ React.createElement(View, { style: styles.header }, /* @__PURE__ */ React.createElement(View, { style: styles.brandMark }, /* @__PURE__ */ React.createElement(MaterialIcons, { name: "tune", size: 24, color: colors.background })), /* @__PURE__ */ React.createElement(View, { style: styles.headerCopy }, /* @__PURE__ */ React.createElement(Text, { style: styles.eyebrow }, "INFOPLAYER LEFT"), /* @__PURE__ */ React.createElement(Text, { style: styles.title }, "Control del bot"), /* @__PURE__ */ React.createElement(Text, { style: styles.subtitle }, "Configura tu IA desde Android sin exponer tus claves."))), /* @__PURE__ */ React.createElement(View, { style: styles.statusCard }, /* @__PURE__ */ React.createElement(View, { style: styles.statusTopRow }, /* @__PURE__ */ React.createElement(View, { style: styles.statusLabelRow }, /* @__PURE__ */ React.createElement(View, { style: [styles.statusDot, { backgroundColor: statusColor }] }), /* @__PURE__ */ React.createElement(Text, { style: styles.cardTitle }, "Servidor local")), /* @__PURE__ */ React.createElement(Text, { style: [styles.statusText, { color: statusColor }] }, connectionState === "checking" ? "Comprobando" : connectionState === "online" ? "En l\xEDnea" : connectionState === "offline" ? "Sin conexi\xF3n" : "Sin comprobar")), /* @__PURE__ */ React.createElement(Text, { style: styles.cardDescription }, connectionMessage), !!settings.controlApiUrl.trim() && /* @__PURE__ */ React.createElement(View, { style: styles.statusMetrics }, /* @__PURE__ */ React.createElement(Metric, { label: "WhatsApp", value: remoteStatus.whatsapp || "\u2014", colors }), /* @__PURE__ */ React.createElement(Metric, { label: "Proveedor", value: remoteStatus.provider || "\u2014", colors }), /* @__PURE__ */ React.createElement(Metric, { label: "Activo", value: uptimeLabel, colors })), /* @__PURE__ */ React.createElement(Pressable, { onPress: testConnection, style: ({ pressed }) => [styles.secondaryButton, pressed && styles.pressed] }, connectionState === "checking" ? /* @__PURE__ */ React.createElement(ActivityIndicator, { size: "small", color: colors.primary }) : /* @__PURE__ */ React.createElement(MaterialIcons, { name: "wifi", size: 18, color: colors.primary }), /* @__PURE__ */ React.createElement(Text, { style: styles.secondaryButtonText }, "Probar conexi\xF3n"))), /* @__PURE__ */ React.createElement(View, { style: styles.sectionHeader }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Control remoto"), /* @__PURE__ */ React.createElement(Text, { style: styles.sectionHint }, "Opcional \xB7 red local")), /* @__PURE__ */ React.createElement(View, { style: styles.card }, /* @__PURE__ */ React.createElement(Field, { label: "URL de la API del bot", value: settings.controlApiUrl, onChangeText: (value) => update("controlApiUrl", value), colors, autoCapitalize: "none", keyboardType: "url", placeholder: "http://192.168.1.25:8787" }), /* @__PURE__ */ React.createElement(Field, { label: "Token de control", value: settings.controlToken, onChangeText: (value) => update("controlToken", value), colors, autoCapitalize: "none", secureTextEntry: true }), /* @__PURE__ */ React.createElement(Text, { style: styles.fieldHelp }, "Usa la IP del tel\xE9fono donde corre Termux y el puerto 8787. Pulsa Guardar para enviar los cambios al bot; el token se guarda en el llavero del tel\xE9fono."), /* @__PURE__ */ React.createElement(Field, { label: "N\xFAmero que recibe los avisos de cambios", value: settings.notificationJid, onChangeText: (value) => update("notificationJid", value.replace(/[^\d]/g, "")), colors, keyboardType: "phone-pad", placeholder: "Vac\xEDo = tu n\xFAmero del bot" }), /* @__PURE__ */ React.createElement(Text, { style: styles.fieldHelp }, "Escribe el n\xFAmero con c\xF3digo de pa\xEDs, sin + ni espacios. Al guardar, el bot enviar\xE1 all\xED el aviso privado de los cambios. Vac\xEDo usa la cuenta vinculada."), /* @__PURE__ */ React.createElement(View, { style: styles.commandBox }, /* @__PURE__ */ React.createElement(Text, { style: styles.cardTitle }, "Cambiar nombre de un comando"), /* @__PURE__ */ React.createElement(Text, { style: styles.fieldHelp }, "Ejemplo: selecciona !jugadores, escribe players y pulsa Guardar nombre. Solo funcionar\xE1 !players; puedes cambiarlo cuando quieras."), /* @__PURE__ */ React.createElement(View, { style: styles.commandChips }, COMMAND_TARGETS.map((target) => /* @__PURE__ */ React.createElement(Pressable, { key: target, onPress: () => setCommandTarget(target), style: ({ pressed }) => [styles.commandChip, commandTarget === target && styles.commandChipActive, pressed && styles.pressed] }, /* @__PURE__ */ React.createElement(Text, { style: [styles.commandChipText, commandTarget === target && styles.commandChipTextActive] }, "!", target)))), /* @__PURE__ */ React.createElement(Field, { label: "Nuevo nombre", value: commandAlias, onChangeText: setCommandAlias, colors, autoCapitalize: "none", placeholder: "left" }), /* @__PURE__ */ React.createElement(Pressable, { onPress: addCommandAlias, style: ({ pressed }) => [styles.secondaryButton, pressed && styles.pressed] }, /* @__PURE__ */ React.createElement(MaterialIcons, { name: "add", size: 18, color: colors.primary }), /* @__PURE__ */ React.createElement(Text, { style: styles.secondaryButtonText }, "Guardar nombre")), /* @__PURE__ */ React.createElement(Text, { style: styles.fieldHelp }, "Configurados: ", settings.commandAliases || "ninguno; se usan los nombres originales"), /* @__PURE__ */ React.createElement(Pressable, { onPress: restoreOriginalCommands, style: ({ pressed }) => [styles.restoreButton, pressed && styles.pressed] }, /* @__PURE__ */ React.createElement(MaterialIcons, { name: "restore", size: 18, color: colors.error }), /* @__PURE__ */ React.createElement(Text, { style: styles.restoreButtonText }, "Restaurar comandos originales"))), /* @__PURE__ */ React.createElement(Pressable, { onPress: testRemoteAI, style: ({ pressed }) => [styles.secondaryButton, pressed && styles.pressed] }, /* @__PURE__ */ React.createElement(MaterialIcons, { name: "psychology", size: 18, color: colors.primary }), /* @__PURE__ */ React.createElement(Text, { style: styles.secondaryButtonText }, "Probar IA remota")), !!testMessage && /* @__PURE__ */ React.createElement(Text, { style: styles.fieldHelp }, testMessage)), /* @__PURE__ */ React.createElement(View, { style: styles.sectionHeader }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Proveedor de IA"), /* @__PURE__ */ React.createElement(Text, { style: styles.sectionHint }, "La selecci\xF3n se guarda localmente")), /* @__PURE__ */ React.createElement(View, { style: styles.providerGrid }, ["local", "ollama", "khoj", "groq", "gemini", "mistral", "openrouter"].map((provider) => /* @__PURE__ */ React.createElement(
    Pressable,
    {
      key: provider,
      onPress: () => selectProvider(provider),
      style: ({ pressed }) => [styles.providerChip, settings.provider === provider && styles.providerChipActive, pressed && styles.pressed]
    },
    /* @__PURE__ */ React.createElement(Text, { style: [styles.providerChipText, settings.provider === provider && styles.providerChipTextActive] }, provider)
  ))), /* @__PURE__ */ React.createElement(View, { style: styles.card }, /* @__PURE__ */ React.createElement(Field, { label: "Modelo", value: settings.model, onChangeText: (value) => update("model", value), colors }), /* @__PURE__ */ React.createElement(Field, { label: settings.provider === "local" ? "URL de llama.cpp" : "URL de la API del proveedor", value: settings.llamaUrl, onChangeText: (value) => update("llamaUrl", value), colors, autoCapitalize: "none", keyboardType: "url", selectTextOnFocus: false }), /* @__PURE__ */ React.createElement(Field, { label: "Tokens m\xE1ximos", value: settings.maxTokens, onChangeText: (value) => update("maxTokens", value.replace(/\D/g, "")), colors, keyboardType: "number-pad" }), /* @__PURE__ */ React.createElement(Field, { label: "Tiempo m\xE1ximo (ms)", value: settings.timeoutMs, onChangeText: (value) => update("timeoutMs", value.replace(/\D/g, "")), colors, keyboardType: "number-pad" })), /* @__PURE__ */ React.createElement(View, { style: styles.sectionHeader }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionTitle }, "Respuesta r\xE1pida"), /* @__PURE__ */ React.createElement(Text, { style: styles.sectionHint }, "Recomendado para el tel\xE9fono")), /* @__PURE__ */ React.createElement(View, { style: styles.card }, /* @__PURE__ */ React.createElement(ToggleRow, { label: "Modo r\xE1pido local", description: "Prompt corto y menos memoria para responder antes.", value: settings.fastMode, onValueChange: (value) => update("fastMode", value), colors }), /* @__PURE__ */ React.createElement(View, { style: styles.divider }), /* @__PURE__ */ React.createElement(ToggleRow, { label: "Omitir b\xFAsqueda web", description: "Evita esperar a DuckDuckGo antes de responder.", value: settings.skipSearch, onValueChange: (value) => update("skipSearch", value), colors })), /* @__PURE__ */ React.createElement(View, { style: styles.card }, /* @__PURE__ */ React.createElement(Text, { style: styles.cardTitle }, "Preferencias de respuesta"), /* @__PURE__ */ React.createElement(View, { style: styles.inlineFields }, /* @__PURE__ */ React.createElement(View, { style: styles.inlineField }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Idioma"), /* @__PURE__ */ React.createElement(TextInput, { value: settings.language, onChangeText: (value) => update("language", value), style: styles.input, placeholder: "es-ES", placeholderTextColor: colors.muted })), /* @__PURE__ */ React.createElement(View, { style: styles.inlineField }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, "Tono"), /* @__PURE__ */ React.createElement(TextInput, { value: settings.tone, onChangeText: (value) => update("tone", value), style: styles.input, placeholder: "breve", placeholderTextColor: colors.muted })))), /* @__PURE__ */ React.createElement(View, { style: styles.saveArea }, /* @__PURE__ */ React.createElement(Pressable, { onPress: saveSettings, style: ({ pressed }) => [styles.primaryButton, pressed && styles.pressed] }, isSaving ? /* @__PURE__ */ React.createElement(ActivityIndicator, { size: "small", color: colors.background }) : /* @__PURE__ */ React.createElement(MaterialIcons, { name: "save", size: 19, color: colors.background }), /* @__PURE__ */ React.createElement(Text, { style: styles.primaryButtonText }, isSaving ? "Guardando\u2026" : "Guardar configuraci\xF3n")), !!saveMessage && /* @__PURE__ */ React.createElement(Text, { style: styles.saveMessage }, saveMessage)), /* @__PURE__ */ React.createElement(View, { style: styles.noteBox }, /* @__PURE__ */ React.createElement(MaterialIcons, { name: "lock-outline", size: 18, color: colors.primary }), /* @__PURE__ */ React.createElement(Text, { style: styles.noteText }, "Tus API keys no se copian a la app. Este panel solo guarda preferencias en el dispositivo.")))));
}
function Field({ label, value, onChangeText, colors, ...props }) {
  const styles = makeStyles(colors);
  return /* @__PURE__ */ React.createElement(View, { style: styles.field }, /* @__PURE__ */ React.createElement(Text, { style: styles.label }, label), /* @__PURE__ */ React.createElement(TextInput, { value, onChangeText, style: styles.input, placeholderTextColor: colors.muted, ...props }));
}
function ToggleRow({ label, description, value, onValueChange, colors }) {
  const styles = makeStyles(colors);
  return /* @__PURE__ */ React.createElement(View, { style: styles.toggleRow }, /* @__PURE__ */ React.createElement(View, { style: styles.toggleCopy }, /* @__PURE__ */ React.createElement(Text, { style: styles.toggleLabel }, label), /* @__PURE__ */ React.createElement(Text, { style: styles.toggleDescription }, description)), /* @__PURE__ */ React.createElement(Switch, { value, onValueChange, trackColor: { false: colors.border, true: colors.primary }, thumbColor: colors.background, ios_backgroundColor: colors.border }));
}
function Metric({ label, value, colors }) {
  const styles = makeStyles(colors);
  return /* @__PURE__ */ React.createElement(View, { style: styles.metric }, /* @__PURE__ */ React.createElement(Text, { style: styles.metricLabel }, label), /* @__PURE__ */ React.createElement(Text, { style: styles.metricValue }, value));
}
function makeStyles(colors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    content: { padding: 20, paddingBottom: 40, gap: 16 },
    header: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 6, paddingBottom: 6 },
    brandMark: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
    headerCopy: { flex: 1 },
    eyebrow: { fontSize: 11, letterSpacing: 1.5, fontWeight: "700", color: colors.primary },
    title: { marginTop: 2, fontSize: 27, lineHeight: 33, fontWeight: "800", color: colors.foreground },
    subtitle: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.muted },
    statusCard: { padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    statusTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    statusLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    statusDot: { width: 9, height: 9, borderRadius: 5 },
    statusText: { fontSize: 12, fontWeight: "700" },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
    cardDescription: { marginTop: 7, fontSize: 13, lineHeight: 18, color: colors.muted },
    statusMetrics: { marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", justifyContent: "space-between" },
    metric: { gap: 2 },
    metricLabel: { fontSize: 10, color: colors.muted },
    metricValue: { fontSize: 12, fontWeight: "800", color: colors.foreground },
    secondaryButton: { marginTop: 14, minHeight: 42, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    secondaryButtonText: { fontSize: 14, fontWeight: "700", color: colors.primary },
    sectionHeader: { marginTop: 4, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
    sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.foreground },
    sectionHint: { fontSize: 11, color: colors.muted },
    providerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    providerChip: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    providerChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    providerChipText: { fontSize: 13, fontWeight: "700", color: colors.muted },
    providerChipTextActive: { color: colors.background },
    card: { padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 14 },
    commandBox: { padding: 14, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 10 },
    commandChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    commandChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    commandChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    commandChipText: { fontSize: 12, fontWeight: "700", color: colors.muted },
    commandChipTextActive: { color: colors.background },
    field: { gap: 7 },
    label: { fontSize: 12, fontWeight: "700", color: colors.muted },
    input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground, fontSize: 14 },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    toggleCopy: { flex: 1, gap: 3 },
    toggleLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
    toggleDescription: { fontSize: 12, lineHeight: 17, color: colors.muted },
    divider: { height: 1, backgroundColor: colors.border },
    inlineFields: { flexDirection: "row", gap: 10 },
    inlineField: { flex: 1, gap: 7 },
    saveArea: { alignItems: "center", gap: 9 },
    primaryButton: { width: "100%", minHeight: 50, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: colors.primary },
    primaryButtonText: { fontSize: 15, fontWeight: "800", color: colors.background },
    saveMessage: { fontSize: 12, fontWeight: "700", color: colors.success },
    noteBox: { flexDirection: "row", gap: 9, padding: 13, borderRadius: 14, backgroundColor: colors.surface },
    noteText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.muted },
    fieldHelp: { fontSize: 11, lineHeight: 16, color: colors.muted },
    restoreButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: colors.error, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    restoreButtonText: { fontSize: 13, fontWeight: "700", color: colors.error },
    pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] }
  });
}
export {
  HomeScreen as default
};
