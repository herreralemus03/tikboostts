// =========================================================
// TikBoosTTS Landing -- configuracion central
// Los valores sensibles usan placeholders __NOMBRE__
// que deploy.ps1 reemplaza desde .dev.vars antes de subir.
// =========================================================

window.TIKBOOSTTS_CONFIG = {
  // Enlace principal del boton "Descargar APK"
  downloadUrl: "https://cutt.ly/itKjyt4D",

  // Enlace de Google Play (deja "" si todavia no esta publicada)
  playStoreUrl: "",

  // Datos de la app
  appName: "TikBoosTTS",
  appVersion: "1.0.13",
  minAndroid: "8.0",

  // Si la APK aun no existe, pon esto en false.
  downloadEnabled: true,

  // -- Paddle Billing --------------------------------------------------------
  // Secrets inyectados por deploy.ps1 desde .dev.vars (no commitear valores reales)
  paddle: {
    clientToken: "__PADDLE_CLIENT_TOKEN__",   // test_XXXX (sandbox) | live_XXXX (prod)
    sandbox: __PADDLE_SANDBOX__,              // true | false
    proPriceId:   "__PADDLE_PRO_PRICE_ID__",
    elitePriceId: "__PADDLE_ELITE_PRICE_ID__",
  },
};
