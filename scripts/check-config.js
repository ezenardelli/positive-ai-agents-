#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración del proyecto...\n');

// Verificar archivo .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', 'env.local');

let envFile = null;
if (fs.existsSync(envPath)) {
  envFile = envPath;
} else if (fs.existsSync(envExamplePath)) {
  envFile = envExamplePath;
  console.log('⚠️  Archivo .env.local no encontrado, usando env.local');
  console.log('   Renombra env.local a .env.local para usar las variables de entorno\n');
}

if (envFile) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  // Verificar variables críticas
  const requiredVars = [
    'GEMINI_API_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  const missingVars = [];
  const presentVars = [];

  requiredVars.forEach(varName => {
    if (envContent.includes(varName + '=')) {
      presentVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  });

  if (missingVars.length === 0) {
    console.log('✅ Todas las variables de entorno están configuradas');
  } else {
    console.log('❌ Variables de entorno faltantes:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  // Verificar si las variables tienen valores reales
  const lines = envContent.split('\n');
  const emptyVars = [];
  
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [varName, value] = line.split('=');
      if (value === 'tu_api_key_de_gemini_aqui' || 
          value === 'tu_firebase_api_key_aqui' ||
          value === 'tu_proyecto.firebaseapp.com' ||
          value === 'tu_proyecto_id_aqui') {
        emptyVars.push(varName.trim());
      }
    }
  });

  if (emptyVars.length > 0) {
    console.log('\n⚠️  Variables con valores de ejemplo (necesitan ser reemplazadas):');
    emptyVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  } else {
    console.log('\n✅ Todas las variables tienen valores reales configurados');
  }
} else {
  console.log('❌ No se encontró archivo de variables de entorno');
  console.log('   Crea un archivo .env.local con las variables necesarias');
}

// Verificar package.json
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log('\n📦 Dependencias del proyecto:');
  console.log(`   - Next.js: ${packageJson.dependencies?.next || 'No encontrado'}`);
  console.log(`   - Firebase: ${packageJson.dependencies?.firebase || 'No encontrado'}`);
  console.log(`   - Genkit: ${packageJson.dependencies?.genkit || 'No encontrado'}`);
  console.log(`   - Google AI: ${packageJson.dependencies?.['@genkit-ai/googleai'] || 'No encontrado'}`);
}

// Verificar firestore.rules
const rulesPath = path.join(__dirname, '..', 'firestore.rules');
if (fs.existsSync(rulesPath)) {
  console.log('\n🔥 Reglas de Firestore encontradas');
} else {
  console.log('\n⚠️  Archivo firestore.rules no encontrado');
}

console.log('\n🚀 Para ejecutar el proyecto:');
console.log('   1. npm install');
console.log('   2. npm run dev');
console.log('\n📝 Notas:');
console.log('   - Asegúrate de que Firebase esté configurado correctamente');
console.log('   - Verifica que las reglas de Firestore permitan lectura/escritura');
console.log('   - En desarrollo, cualquier email de Google puede autenticarse');
console.log('   - En producción, solo se permiten emails de @positiveit.com.ar');

