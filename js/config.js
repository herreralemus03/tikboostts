// =========================================================
// TikBoosTTS Landing — configuración central
// Edita aquí los enlaces de descarga y datos de la app.
// =========================================================

window.TIKBOOSTTS_CONFIG = {
  // Enlace principal del botón "Descargar APK"
  downloadUrl: "https://cutt.ly/itKjyt4D",

  // Enlace de Google Play (deja "" si todavía no está publicada)
  playStoreUrl: "",

  // Datos de la app
  appName: "TikBoosTTS",
  appVersion: "1.0.13",
  minAndroid: "8.0",

  // Si la APK aún no existe, pon esto en false.
  downloadEnabled: true,

  // ── Paddle Billing ────────────────────────────────────────────────────────
  paddle: {
    // Client-side token: Paddle dashboard > Developer > Authentication > Client-side tokens
    // Sandbox tokens start with "test_", live tokens with "live_"
    clientToken: "REPLACE_WITH_PADDLE_CLIENT_TOKEN",

    sandbox: true,   // ← cambiar a false en producción

    proPriceId:   "pri_01krqmbpvpmdh00bk32vfbvhet",
    elitePriceId: "pri_01krqn157drvgp0bm91ydswtyk",
  },
};
