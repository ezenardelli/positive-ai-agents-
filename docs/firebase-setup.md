# Configuración de Firebase

## 🔥 Pasos para configurar Firebase

### 1. Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o usa el existente: `positive-hub-ai`
3. Habilita Google Analytics (opcional)

### 2. Configurar Authentication

1. En el panel de Firebase, ve a **Authentication**
2. Haz clic en **Get started**
3. En la pestaña **Sign-in method**, habilita **Google**
4. Configura el dominio autorizado:
   - Para desarrollo: `localhost`
   - Para producción: `tu-dominio.com`

### 3. Configurar Firestore Database

1. Ve a **Firestore Database**
2. Haz clic en **Create database**
3. Selecciona **Start in test mode** (para desarrollo)
4. Elige la ubicación más cercana a tus usuarios

### 4. Configurar Reglas de Seguridad

Las reglas ya están configuradas en `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write only their own conversations
    match /conversations/{conversationId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Allow users to read and write only their own minutes
    match /minutes/{minuteId} {
        allow read, create: if request.auth != null;
    }
  }
}
```

### 5. Obtener Configuración de la App Web

1. En Firebase Console, ve a **Project Settings** (ícono de engranaje)
2. En la sección **Your apps**, haz clic en **Add app** → **Web**
3. Registra la app con un nombre (ej: "Positive AI Agents")
4. Copia la configuración que aparece

### 6. Variables de Entorno

Las variables ya están configuradas en `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA3BK2GufRwBL2xlMPSkaqEq3XJG8nx90U
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=positive-hub-ai.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=positive-hub-ai
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=positive-hub-ai.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=154533672174
NEXT_PUBLIC_FIREBASE_APP_ID=1:154533672174:web:5fb403d4112f5dbfa9afff
```

## 🔧 Configuración de Producción

### Reglas de Firestore para Producción

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden acceder a sus conversaciones
    match /conversations/{conversationId} {
      allow read, write, delete: if request.auth != null 
        && request.auth.uid == resource.data.userId
        && request.auth.token.email_verified == true;
    }

    // Solo usuarios autenticados pueden crear minutos
    match /minutes/{minuteId} {
      allow read, create: if request.auth != null 
        && request.auth.token.email_verified == true;
    }
  }
}
```

### Dominios Autorizados

En **Authentication** → **Settings** → **Authorized domains**, agrega:
- `tu-dominio.com`
- `www.tu-dominio.com`

## 🚨 Solución de Problemas

### Error: "auth/invalid-api-key"
- Verifica que las variables de entorno estén correctas
- Asegúrate de que el archivo `.env.local` existe
- Reinicia el servidor de desarrollo

### Error: "permission-denied"
- Verifica las reglas de Firestore
- Asegúrate de que el usuario esté autenticado
- Revisa que el usuario tenga permisos para la colección

### Error: "requires an index"
- Ve a Firebase Console → Firestore → Indexes
- Crea el índice compuesto requerido
- Espera a que se construya el índice

## 📊 Monitoreo

### Firebase Analytics
- Ve a **Analytics** en Firebase Console
- Configura eventos personalizados si es necesario

### Firebase Performance
- Monitorea el rendimiento de la app
- Revisa métricas de carga y respuesta

## 🔐 Seguridad

### Buenas Prácticas
1. Nunca expongas las claves de API en el código cliente
2. Usa reglas de Firestore restrictivas
3. Valida datos en el servidor
4. Implementa rate limiting si es necesario
5. Monitorea logs de Firebase para actividad sospechosa

