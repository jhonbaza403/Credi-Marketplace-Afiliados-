# Credi Marketplace — Android con Capacitor

## Arquitectura elegida

Credi Marketplace mantiene Next.js + Vercel como aplicación web/full-stack y usa Capacitor como contenedor nativo Android. El paquete Android apunta al despliegue HTTPS de Credi Marketplace mediante `CAPACITOR_SERVER_URL`.

No se activa `output: 'export'` en Next.js. La aplicación contiene Route Handlers, autenticación server-side, Supabase y endpoints de pago/webhook que dependen del runtime de servidor. La documentación oficial de Next.js diferencia estas rutas server-side de una exportación estática. citeturn160807search0turn160807search4

## Versiones

El proyecto usa Capacitor 8.5.2 para `@capacitor/core`, `@capacitor/android` y `@capacitor/cli`. Estas versiones pertenecen a la línea estable 8.x disponible actualmente; la rama 9 se mantiene como pre-release. citeturn562660search2turn562660search8turn562660search0turn907215search1

## Desarrollo local

```bash
npm install
npm run android:add
npm run cap:sync
npm run cap:open:android
```

Para generar un APK de pruebas:

```bash
npm run android:build:debug
```

Para un AAB firmado de producción, configura en el entorno de CI las variables secretas `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD` y `ANDROID_KEY_PASSWORD`, y ejecuta el workflow **Credi Marketplace Android**.

## Publicación

El workflow `.github/workflows/android-capacitor.yml` genera el proyecto Android limpio, sincroniza Capacitor, compila el APK de depuración y, únicamente cuando existe el material de firma, genera el AAB de release.

El keystore nunca se guarda en Git. Tampoco deben almacenarse claves privadas, contraseñas ni certificados de firma dentro del repositorio.

## URL móvil

Por defecto, la app apunta a:

`https://credi-marketplace-afiliados.vercel.app`

Para una instancia de staging o desarrollo, usa `CAPACITOR_SERVER_URL` sin modificar el código nativo.

## Actualizaciones

La aplicación móvil utiliza el mismo frontend desplegado en Credi Marketplace. Un cambio publicado en Vercel puede quedar disponible dentro del contenedor sin recompilar el APK mientras no requiera cambios nativos. Los cambios que sí modifiquen configuración nativa, plugins o permisos deben pasar nuevamente por el pipeline Android.

Capacitor documenta explícitamente el flujo de añadir plataformas y sincronizar el contenido web con los proyectos nativos. citeturn400773search1turn368811search4
