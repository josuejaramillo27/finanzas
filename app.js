// Importar funciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: PEGA AQUÍ TU firebaseConfig REAL
const firebaseConfig = {
  apiKey: "AIzaSyDnfTtl-CzKBguHzr4xwGJzPoJ-8-gRqDU",
  authDomain: "mis-finanzas-767fc.firebaseapp.com",
  projectId: "mis-finanzas-767fc",
  storageBucket: "mis-finanzas-767fc.firebasestorage.app",
  messagingSenderId: "888544036329",
  appId: "1:888544036329:web:d69d5b3409c876f3b8f778"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let graficoFinanzas;

// 1. Escuchar MOVIMIENTOS GENERALES
const qMovimientos = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
onSnapshot(qMovimientos, (querySnapshot) => {
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

// 2. Escuchar GASTOS FIJOS
const qFijos = query(collection(db, "gastos_fijos"), orderBy("dia", "asc"));
onSnapshot(qFijos, (querySnapshot) => {
    const listaFijos = document.getElementById('lista-fijos');
    listaFijos.innerHTML = ''; // Limpiar lista

    querySnapshot.forEach((documento) => {
        const data = documento.data();
        listaFijos.innerHTML += `
            <li>
                <div class="info-fijo">
                    <strong>${data.nombre}</strong>
                    <span>Día ${data.dia} | S/ ${data.monto.toFixed(2)}</span>
                </div>
                <button class="btn-pildora btn-rojo btn-eliminar" onclick="eliminarFijo('${documento.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </li>
        `;
    });
});

// Función para eliminar gasto fijo (Hecha global para el botón HTML)
window.eliminarFijo = async function(id) {
    if(confirm("¿Seguro que quieres eliminar este gasto fijo?")) {
        await deleteDoc(doc(db, "gastos_fijos", id));
    }
};

// Guardar Movimiento General
document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo-movimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const banco = document.getElementById('banco').value;
    const categoria = document.getElementById('categoria').value;

    try {
        await addDoc(collection(db, "movimientos"), {
            tipo, monto, banco, categoria, fecha: new Date()
        });
        document.getElementById('form-movimiento').reset();
    } catch (error) {
        console.error("Error: ", error);
    }
});

// Guardar Nuevo Gasto Fijo
document.getElementById('form-gasto-fijo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-fijo').value;
    const monto = parseFloat(document.getElementById('monto-fijo').value);
    const dia = parseInt(document.getElementById('dia-fijo').value);

    try {
        await addDoc(collection(db, "gastos_fijos"), {
            nombre, monto, dia
        });
        document.getElementById('form-gasto-fijo').reset();
    } catch (error) {
        console.error("Error al guardar gasto fijo: ", error);
    }
});

// Matemáticas del Dashboard
function actualizarDashboard(ingresos, gastos, intocable) {
    const saldoDisponible = ingresos - gastos;

    document.getElementById('saldo-total').innerText = `S/ ${saldoDisponible.toFixed(2)}`;
    document.getElementById('saldo-intocable').innerText = `S/ ${intocable.toFixed(2)}`;

    const nec50 = saldoDisponible > 0 ? saldoDisponible * 0.50 : 0;
    const des30 = saldoDisponible > 0 ? saldoDisponible * 0.30 : 0;
    const aho20 = saldoDisponible > 0 ? saldoDisponible * 0.20 : 0;

    document.getElementById('pres-50').innerText = nec50.toFixed(2);
    document.getElementById('pres-30').innerText = des30.toFixed(2);
    document.getElementById('pres-20').innerText = aho20.toFixed(2);

    dibujarGrafico(ingresos, gastos);
}

// Gráfico
function dibujarGrafico(ingresos, gastos) {
    const ctx = document.getElementById('miGrafico').getContext('2d');
    if (graficoFinanzas) graficoFinanzas.destroy();

    graficoFinanzas = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{
                data: [ingresos, gastos],
                backgroundColor: ['#29c87c', '#ff3b4a'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// ==========================================
// LÓGICA DEL BOTÓN "DESCARGAR APP" (PWA)
// ==========================================
let eventoInstalacion;
const btnInstalar = document.getElementById('btn-instalar');

// 1. Verificar si la app ya está instalada al cargar la página
if (window.matchMedia('(display-mode: standalone)').matches) {
    // Si ya está como app en el celular, el botón nunca aparece
    btnInstalar.style.display = 'none';
}

// 2. Capturar el evento de instalación que envía Android/Chrome
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenimos que Android muestre su propio aviso feo
    e.preventDefault();
    // Guardamos el evento para activarlo con nuestro botón
    eventoInstalacion = e;
    // Mostramos nuestro botón elegante
    btnInstalar.style.display = 'flex';
});

// 3. Qué pasa al tocar nuestro botón
btnInstalar.addEventListener('click', async () => {
    if (!eventoInstalacion) return;
    
    // Desplegamos la ventana nativa de instalación de Android
    eventoInstalacion.prompt();
    
    // Esperamos a ver si el usuario aceptó o canceló
    const { outcome } = await eventoInstalacion.userChoice;
    if (outcome === 'accepted') {
        console.log('App instalada con éxito');
        // Ocultamos el botón inmediatamente
        btnInstalar.style.display = 'none';
    }
    
    // Limpiamos la variable
    eventoInstalacion = null;
});

// 4. Asegurarnos de borrar el botón si la instalación se completó
window.addEventListener('appinstalled', () => {
    btnInstalar.style.display = 'none';
});
