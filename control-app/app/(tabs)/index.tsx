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
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { ScreenContainer } from "@/components/screen-container";
import { healthUrl, validateInteger } from "@/lib/control-settings";
import { controlRequest, normalizeControlApiUrl, toControlPayload } from "@/lib/control-api";
import { useColors } from "@/hooks/use-colors";

const SETTINGS_KEY = "infoplayerleft-control-settings-v1";
const CONTROL_TOKEN_KEY = "infoplayerleft-control-token-v1";
const DEFAULT_SETTINGS: Settings = {
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
  commandAliases: "",
};

type Provider = "local" | "groq" | "gemini" | "mistral" | "openrouter";
const COMMAND_TARGETS = ["info", "buscar", "servidor", "jugadores", "ping", "ai", "ia", "tono", "idioma", "proveedor", "anime", "vigilar", "vigilarnick", "novigilar", "lista", "escaneo", "ayuda", "help"] as const;
const PROVIDER_DEFAULTS: Record<Provider, { model: string; url: string }> = {
  local: { model: "local-model", url: "http://127.0.0.1:8080/v1/chat/completions" },
  groq: { model: "openai/gpt-oss-20b", url: "https://api.groq.com/openai/v1/chat/completions" },
  gemini: { model: "gemini-2.5-flash", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" },
  mistral: { model: "mistral-small-4-0-26-03", url: "https://api.mistral.ai/v1/chat/completions" },
  openrouter: { model: "openrouter/auto", url: "https://openrouter.ai/api/v1/chat/completions" },
};
type Settings = {
  provider: Provider;
  model: string;
  llamaUrl: string;
  controlApiUrl: string;
  controlToken: string;
  maxTokens: string;
  timeoutMs: string;
  language: string;
  tone: string;
  skipSearch: boolean;
  fastMode: boolean;
  notificationJid: string;
  commandAliases: string;
};

type ConnectionState = "idle" | "checking" | "online" | "offline";
type RemoteStatus = { whatsapp?: string; provider?: string; model?: string; uptimeSeconds?: number; pid?: number };

export default function HomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [connectionMessage, setConnectionMessage] = useState("Aún no se ha comprobado la conexión");
  const [saveMessage, setSaveMessage] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>({});
  const [commandAlias, setCommandAlias] = useState("");
  const [commandTarget, setCommandTarget] = useState<(typeof COMMAND_TARGETS)[number]>("info");

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(SETTINGS_KEY), SecureStore.getItemAsync(CONTROL_TOKEN_KEY)])
      .then(([value, token]) => {
        if (!value) return;
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(value), controlToken: token || "" });
        } catch {
          setSaveMessage("No se pudieron leer las preferencias guardadas");
        }
      })
      .catch(() => setSaveMessage("No se pudieron leer las preferencias guardadas"));
  }, []);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaveMessage("");
  }, []);

  const selectProvider = useCallback((provider: Provider) => {
    const defaults = PROVIDER_DEFAULTS[provider];
    setSettings((current) => ({ ...current, provider, model: defaults.model, llamaUrl: defaults.url }));
    setSaveMessage("");
  }, []);

  const addCommandAlias = useCallback(() => {
    const alias = commandAlias.trim().replace(/^!/, "").toLowerCase();
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(alias)) {
      Alert.alert("Nombre inválido", "Usa letras, números o guion bajo; debe empezar por una letra.");
      return;
    }
    if (alias === commandTarget) {
      Alert.alert("Nombre inválido", "El nuevo nombre debe ser diferente al comando original.");
      return;
    }
    const entries = settings.commandAliases
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .filter((entry) => {
        const [existingAlias, existingTarget] = entry.split("=").map((part) => part.trim().toLowerCase());
        return existingAlias !== alias && existingTarget !== commandTarget;
      });
    update("commandAliases", [...entries, `${alias}=${commandTarget}`].join(", "));
    setCommandAlias("");
  }, [commandAlias, commandTarget, settings.commandAliases, update]);

  const restoreOriginalCommands = useCallback(() => {
    update("commandAliases", "");
    setSaveMessage("Comandos originales restaurados en el formulario; pulsa Guardar configuración");
  }, [update]);

  const saveSettings = useCallback(async () => {
    if (!validateInteger(settings.maxTokens, 8, 4096)) {
      Alert.alert("Valor inválido", "Los tokens máximos deben estar entre 8 y 4096.");
      return;
    }
    if (!validateInteger(settings.timeoutMs, 1000, 600000)) {
      Alert.alert("Valor inválido", "El tiempo de espera debe estar entre 1000 y 600000 ms.");
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
          body: JSON.stringify(toControlPayload(settingsToSave)),
        });
      }
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(localSettings));
      await SecureStore.setItemAsync(CONTROL_TOKEN_KEY, controlToken);
      if (controlApiUrl !== settings.controlApiUrl) {
        setSettings(settingsToSave);
      }
      setSaveMessage(controlApiUrl ? "Guardado en el bot y en este teléfono" : "Guardado en este teléfono");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const testConnection = useCallback(async () => {
    setConnectionState("checking");
    setConnectionMessage("Comprobando el bot…");
    try {
      if (settings.controlApiUrl.trim()) {
        const status = await controlRequest<RemoteStatus>(settings.controlApiUrl, settings.controlToken, "/api/control/status");
        setRemoteStatus(status);
        setConnectionMessage(`Bot ${status.whatsapp || "activo"} · proveedor ${status.provider || settings.provider}`);
      } else {
        const response = await fetch(healthUrl(settings.llamaUrl), { method: "GET" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setConnectionMessage("llama.cpp está respondiendo");
      }
      setConnectionState("online");
    } catch (error) {
      setConnectionState("offline");
      setConnectionMessage(`No se pudo conectar: ${error instanceof Error ? error.message : "revisa la URL"}`);
    }
  }, [settings.controlApiUrl, settings.controlToken, settings.llamaUrl, settings.provider]);

  useEffect(() => {
    if (!settings.controlApiUrl.trim() || !settings.controlToken.trim()) return;
    const timer = setInterval(() => void testConnection(), 15_000);
    return () => clearInterval(timer);
  }, [settings.controlApiUrl, settings.controlToken, testConnection]);

  const uptimeLabel = remoteStatus.uptimeSeconds == null
    ? "—"
    : `${Math.floor(remoteStatus.uptimeSeconds / 3600)}h ${Math.floor((remoteStatus.uptimeSeconds % 3600) / 60)}m`;

  const testRemoteAI = useCallback(async () => {
    if (!settings.controlApiUrl.trim()) {
      setTestMessage("Configura primero la URL de la API remota");
      return;
    }
    setTestMessage("Probando IA remota…");
    try {
      const result = await controlRequest<{ answer: string }>(settings.controlApiUrl, settings.controlToken, "/api/control/test-ai", {
        method: "POST",
        body: JSON.stringify({ question: "Responde solo: OK" }),
      });
      setTestMessage(`Respuesta: ${result.answer}`);
    } catch (error) {
      setTestMessage(`Error: ${error instanceof Error ? error.message : "no se pudo probar"}`);
    }
  }, [settings.controlApiUrl, settings.controlToken]);

  const statusColor = connectionState === "online" ? colors.success : connectionState === "offline" ? colors.error : colors.muted;

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.brandMark}>
              <MaterialIcons name="tune" size={24} color={colors.background} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>INFOPLAYER LEFT</Text>
              <Text style={styles.title}>Control del bot</Text>
              <Text style={styles.subtitle}>Configura tu IA desde Android sin exponer tus claves.</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusTopRow}>
              <View style={styles.statusLabelRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.cardTitle}>Servidor local</Text>
              </View>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {connectionState === "checking" ? "Comprobando" : connectionState === "online" ? "En línea" : connectionState === "offline" ? "Sin conexión" : "Sin comprobar"}
              </Text>
            </View>
            <Text style={styles.cardDescription}>{connectionMessage}</Text>
            {!!settings.controlApiUrl.trim() && <View style={styles.statusMetrics}>
              <Metric label="WhatsApp" value={remoteStatus.whatsapp || "—"} colors={colors} />
              <Metric label="Proveedor" value={remoteStatus.provider || "—"} colors={colors} />
              <Metric label="Activo" value={uptimeLabel} colors={colors} />
            </View>}
            <Pressable onPress={testConnection} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              {connectionState === "checking" ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="wifi" size={18} color={colors.primary} />}
              <Text style={styles.secondaryButtonText}>Probar conexión</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Control remoto</Text>
            <Text style={styles.sectionHint}>Opcional · red local</Text>
          </View>
          <View style={styles.card}>
            <Field label="URL de la API del bot" value={settings.controlApiUrl} onChangeText={(value) => update("controlApiUrl", value)} colors={colors} autoCapitalize="none" keyboardType="url" placeholder="http://192.168.1.25:8787" />
            <Field label="Token de control" value={settings.controlToken} onChangeText={(value) => update("controlToken", value)} colors={colors} autoCapitalize="none" secureTextEntry />
            <Text style={styles.fieldHelp}>Usa la IP del teléfono donde corre Termux y el puerto 8787. Pulsa Guardar para enviar los cambios al bot; el token se guarda en el llavero del teléfono.</Text>
            <Field label="Número que recibe los avisos de cambios" value={settings.notificationJid} onChangeText={(value) => update("notificationJid", value.replace(/[^\d]/g, ""))} colors={colors} keyboardType="phone-pad" placeholder="Vacío = tu número del bot" />
            <Text style={styles.fieldHelp}>Escribe el número con código de país, sin + ni espacios. Al guardar, el bot enviará allí el aviso privado de los cambios. Vacío usa la cuenta vinculada.</Text>
            <View style={styles.commandBox}>
              <Text style={styles.cardTitle}>Cambiar nombre de un comando</Text>
              <Text style={styles.fieldHelp}>Ejemplo: selecciona !jugadores, escribe players y pulsa Guardar nombre. Solo funcionará !players; puedes cambiarlo cuando quieras.</Text>
              <View style={styles.commandChips}>
                {COMMAND_TARGETS.map((target) => (
                  <Pressable key={target} onPress={() => setCommandTarget(target)} style={({ pressed }) => [styles.commandChip, commandTarget === target && styles.commandChipActive, pressed && styles.pressed]}>
                    <Text style={[styles.commandChipText, commandTarget === target && styles.commandChipTextActive]}>!{target}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Nuevo nombre" value={commandAlias} onChangeText={setCommandAlias} colors={colors} autoCapitalize="none" placeholder="left" />
              <Pressable onPress={addCommandAlias} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <MaterialIcons name="add" size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Guardar nombre</Text>
              </Pressable>
              <Text style={styles.fieldHelp}>Configurados: {settings.commandAliases || "ninguno; se usan los nombres originales"}</Text>
              <Pressable onPress={restoreOriginalCommands} style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}>
                <MaterialIcons name="restore" size={18} color={colors.error} />
                <Text style={styles.restoreButtonText}>Restaurar comandos originales</Text>
              </Pressable>
            </View>
            <Pressable onPress={testRemoteAI} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <MaterialIcons name="psychology" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Probar IA remota</Text>
            </Pressable>
            {!!testMessage && <Text style={styles.fieldHelp}>{testMessage}</Text>}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Proveedor de IA</Text>
            <Text style={styles.sectionHint}>La selección se guarda localmente</Text>
          </View>
          <View style={styles.providerGrid}>
            {(["local", "groq", "gemini", "mistral", "openrouter"] as Provider[]).map((provider) => (
              <Pressable
                key={provider}
                onPress={() => selectProvider(provider)}
                style={({ pressed }) => [styles.providerChip, settings.provider === provider && styles.providerChipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.providerChipText, settings.provider === provider && styles.providerChipTextActive]}>{provider}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.card}>
            <Field label="Modelo" value={settings.model} onChangeText={(value) => update("model", value)} colors={colors} />
            <Field label={settings.provider === "local" ? "URL de llama.cpp" : "URL de la API del proveedor"} value={settings.llamaUrl} onChangeText={(value) => update("llamaUrl", value)} colors={colors} autoCapitalize="none" keyboardType="url" selectTextOnFocus={false} />
            <Field label="Tokens máximos" value={settings.maxTokens} onChangeText={(value) => update("maxTokens", value.replace(/\D/g, ""))} colors={colors} keyboardType="number-pad" />
            <Field label="Tiempo máximo (ms)" value={settings.timeoutMs} onChangeText={(value) => update("timeoutMs", value.replace(/\D/g, ""))} colors={colors} keyboardType="number-pad" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Respuesta rápida</Text>
            <Text style={styles.sectionHint}>Recomendado para el teléfono</Text>
          </View>
          <View style={styles.card}>
            <ToggleRow label="Modo rápido local" description="Prompt corto y menos memoria para responder antes." value={settings.fastMode} onValueChange={(value) => update("fastMode", value)} colors={colors} />
            <View style={styles.divider} />
            <ToggleRow label="Omitir búsqueda web" description="Evita esperar a DuckDuckGo antes de responder." value={settings.skipSearch} onValueChange={(value) => update("skipSearch", value)} colors={colors} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preferencias de respuesta</Text>
            <View style={styles.inlineFields}>
              <View style={styles.inlineField}><Text style={styles.label}>Idioma</Text><TextInput value={settings.language} onChangeText={(value) => update("language", value)} style={styles.input} placeholder="es-ES" placeholderTextColor={colors.muted} /></View>
              <View style={styles.inlineField}><Text style={styles.label}>Tono</Text><TextInput value={settings.tone} onChangeText={(value) => update("tone", value)} style={styles.input} placeholder="breve" placeholderTextColor={colors.muted} /></View>
            </View>
          </View>

          <View style={styles.saveArea}>
            <Pressable onPress={saveSettings} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              {isSaving ? <ActivityIndicator size="small" color={colors.background} /> : <MaterialIcons name="save" size={19} color={colors.background} />}
              <Text style={styles.primaryButtonText}>{isSaving ? "Guardando…" : "Guardar configuración"}</Text>
            </Pressable>
            {!!saveMessage && <Text style={styles.saveMessage}>{saveMessage}</Text>}
          </View>

          <View style={styles.noteBox}>
            <MaterialIcons name="lock-outline" size={18} color={colors.primary} />
            <Text style={styles.noteText}>Tus API keys no se copian a la app. Este panel solo guarda preferencias en el dispositivo.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Field({ label, value, onChangeText, colors, ...props }: { label: string; value: string; onChangeText: (value: string) => void; colors: ReturnType<typeof useColors> } & Partial<React.ComponentProps<typeof TextInput>>) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

function ToggleRow({ label, description, value, onValueChange, colors }: { label: string; description: string; value: boolean; onValueChange: (value: boolean) => void; colors: ReturnType<typeof useColors> }) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}><Text style={styles.toggleLabel}>{label}</Text><Text style={styles.toggleDescription}>{description}</Text></View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.background} ios_backgroundColor={colors.border} />
    </View>
  );
}

function Metric({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  const styles = makeStyles(colors);
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function makeStyles(colors: ReturnType<typeof useColors>) {
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
    pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  });
}
