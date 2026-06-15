// Importar funciones de Firebase (Versión Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: Reemplazar esto con la configuración de TU proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDnfTtl-CzKBguHzr4xwGJzPoJ-8-gRqDU",
  authDomain: "mis-finanzas-767fc.firebaseapp.com",
  projectId: "mis-finanzas-767fc",
  storageBucket: "mis-finanzas-767fc.firebasestorage.app",
  messagingSenderId: "888544036329",
  appId: "1:888544036329:web:d69d5b3409c876f3b8f778"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Lógica básica del formulario
document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tipo = document.getElementById('tipo-movimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const banco = document.getElementById('banco').value;
    const categoria = document.getElementById('categoria').value;

    try {
        // Guardar en la base de datos de Firebase
        await addDoc(collection(db, "movimientos"), {
            tipo: tipo,
            monto: monto,
            banco: banco,
            categoria: categoria,
            fecha: new Date()
        });
        alert('¡Movimiento guardado con éxito!');
        document.getElementById('form-movimiento').reset();
    } catch (error) {
        console.error("Error al guardar: ", error);
        alert('Hubo un error al guardar.');
    }
});
