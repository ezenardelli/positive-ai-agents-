#!/usr/bin/env node

const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔥 Probando conexión con Firebase...\n');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('❌ Configuración de Firebase incompleta:');
  missingFields.forEach(field => {
    console.error(`   - Falta: ${field}`);
  });
  process.exit(1);
}

console.log('✅ Configuración de Firebase válida');

try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase inicializado correctamente');

  // Test Authentication
  const auth = getAuth(app);
  console.log('✅ Módulo de autenticación cargado');

  // Test Firestore
  const db = getFirestore(app);
  console.log('✅ Módulo de Firestore cargado');

  // Test basic Firestore operation (read-only)
  console.log('\n📊 Probando operación de lectura en Firestore...');
  
  // This will test if we can connect to Firestore
  // We'll try to get a collection (even if it doesn't exist)
  getDocs(collection(db, 'test-collection'))
    .then(() => {
      console.log('✅ Conexión a Firestore exitosa');
      console.log('\n🎉 ¡Firebase está configurado correctamente!');
      console.log('\n📝 Próximos pasos:');
      console.log('   1. Ejecuta: npm run dev');
      console.log('   2. Abre: http://localhost:9002');
      console.log('   3. Inicia sesión con Google');
      console.log('   4. ¡Disfruta de tu chat con IA!');
    })
    .catch((error) => {
      console.error('❌ Error al conectar con Firestore:', error.message);
      
      if (error.code === 'permission-denied') {
        console.log('\n💡 Solución: Verifica las reglas de Firestore en firebase.rules');
      } else if (error.code === 'unavailable') {
        console.log('\n💡 Solución: Verifica tu conexión a internet');
      } else {
        console.log('\n💡 Solución: Revisa la configuración de Firebase');
      }
    });

} catch (error) {
  console.error('❌ Error al inicializar Firebase:', error.message);
  
  if (error.message.includes('invalid-api-key')) {
    console.log('\n💡 Solución: Verifica que NEXT_PUBLIC_FIREBASE_API_KEY sea correcta');
  } else if (error.message.includes('auth-domain')) {
    console.log('\n💡 Solución: Verifica que NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN sea correcto');
  }
}

