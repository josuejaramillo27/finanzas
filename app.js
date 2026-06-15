// Importar funciones de Firebase (Versión Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: PEGA AQUÍ TU firebaseConfig REAL
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

// Variables globales para el gráfico
let graficoFinanzas;

// Escuchar los datos en tiempo real
const q = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
onSnapshot(q, (querySnapshot) => {
    let ingresos = 0;
    let gastos = 0;
    let intocable = 0;

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tipo === 'ingreso') ingresos += data.monto;
        if (data.tipo === 'gasto') gastos += data.monto;
        if (data.tipo === 'intocable') intocable += data.monto;
    });

    actualizarDashboard(ingresos, gastos, intocable);
});

// Función para calcular 50/30/20 y actualizar textos
function actualizarDashboard(ingresos, gastos, intocable) {
    const saldoDisponible = ingresos - gastos;

    // Actualizar HTML
    document.getElementById('saldo-total').innerText = `S/ ${saldoDisponible.toFixed(2)}`;
    document.getElementById('saldo-intocable').innerText = `S/ ${intocable.toFixed(2)}`;

    // Matemáticas de la Regla 50/30/20
    const nec50 = saldoDisponible > 0 ? saldoDisponible * 0.50 : 0;
    const des30 = saldoDisponible > 0 ? saldoDisponible * 0.30 : 0;
    const aho20 = saldoDisponible > 0 ? saldoDisponible * 0.20 : 0;

    document.getElementById('pres-50').innerText = nec50.toFixed(2);
    document.getElementById('pres-30').innerText = des30.toFixed(2);
    document.getElementById('pres-20').innerText = aho20.toFixed(2);

    dibujarGrafico(ingresos, gastos);
}

// Función para dibujar el gráfico con Chart.js
function dibujarGrafico(ingresos, gastos) {
    const ctx = document.getElementById('miGrafico').getContext('2d');
    
    // Si ya existe un gráfico, lo destruimos para actualizarlo
    if (graficoFinanzas) {
        graficoFinanzas.destroy();
    }

    graficoFinanzas = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{
                data: [ingresos, gastos],
                backgroundColor: ['#27ae60', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
}

// Lógica para guardar un nuevo movimiento en Firebase
document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tipo = document.getElementById('tipo-movimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const banco = document.getElementById('banco').value;
    const categoria = document.getElementById('categoria').value;

    try {
        await addDoc(collection(db, "movimientos"), {
            tipo: tipo,
            monto: monto,
            banco: banco,
            categoria: categoria,
            fecha: new Date()
        });
        document.getElementById('form-movimiento').reset();
    } catch (error) {
        console.error("Error al guardar: ", error);
        alert('Hubo un error al guardar tu dinero.');
    }
});
