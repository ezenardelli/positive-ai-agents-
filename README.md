# Positive AI Agents Hub

Una aplicación Next.js para gestionar agentes de IA con persistencia en Firebase y integración con Google AI (Gemini).

## 🚀 Configuración Rápida

### 1. Variables de Entorno
El archivo `env.local` ya está configurado con las credenciales necesarias. Para usarlo:

```bash
# Renombrar el archivo para que Next.js lo reconozca
mv env.local .env.local
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Verificar Configuración
```bash
npm run check-config
```

### 4. Ejecutar en Desarrollo
```bash
npm run dev
```

## 🔧 Configuración

### Variables de Entorno Requeridas
- `GEMINI_API_KEY`: API key de Google AI (Gemini)
- `NEXT_PUBLIC_FIREBASE_*`: Configuración de Firebase

### Firebase Setup
1. Proyecto: `positive-hub-ai`
2. Authentication habilitado (Google)
3. Firestore Database habilitado
4. Reglas de seguridad configuradas

### Autenticación
- **Desarrollo**: Cualquier email de Google
- **Producción**: Solo emails de `@positiveit.com.ar`

## 📁 Estructura del Proyecto

```
src/
├── ai/                    # Configuración de Genkit y flujos de IA
├── app/                   # Páginas y acciones del servidor
├── components/            # Componentes de React
├── hooks/                 # Hooks personalizados
├── lib/                   # Utilidades y tipos
└── services/             # Servicios de Firebase
```

## 🤖 Agentes Disponibles

1. **PosiAgent**: Asistente general para preguntas y conversaciones
2. **MinutaMaker**: Generador de actas de reuniones

## 🔥 Funcionalidades

- ✅ Chat en tiempo real con IA
- ✅ Persistencia de conversaciones en Firestore
- ✅ Autenticación con Google
- ✅ Gestión de contexto de cliente
- ✅ Generación automática de títulos
- ✅ Modo de prueba para desarrollo

## 🛠️ Scripts Disponibles

- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de producción
- `npm run check-config`: Verificar configuración
- `npm run genkit:dev`: Servidor de desarrollo de Genkit
