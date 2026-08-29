import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const mesActual = new Date().getMonth();
const anioActual = new Date().getFullYear();

// Poner el nombre del mes en el título
document.getElementById('mes-actual-nombre').innerText = mesesNombres[mesActual];

let totalFijosGlobal = 0;
let ingresosMesGlobal = 0;
let gastosMesGlobal = 0;

// 1. ESCUCHAR GASTOS FIJOS
const qFijos = query(collection(db, "gastos_fijos"), orderBy("dia", "asc"));
onSnapshot(qFijos, (querySnapshot) => {
    let sumaFijos = 0;
    const listaFijos = document.getElementById('lista-fijos');
    if(listaFijos) listaFijos.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        sumaFijos += data.monto;
        
        listaFijos.innerHTML += `
            <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <strong>${data.nombre}</strong> <br>
                    <span style="font-size: 0.8rem; color: #aaa;">Día de pago: ${data.dia}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <strong>S/ ${data.monto.toFixed(2)}</strong>
                    <button onclick="eliminarRegistro('gastos_fijos', '${documento.id}')" style="background: none; border: none; color: #ff3b4a; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>
        `;
    });
    
    totalFijosGlobal = sumaFijos;
    actualizarBalanceNeto();
});

// Guardar Gasto Fijo
document.getElementById('form-gasto-fijo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-fijo').value;
    const monto = parseFloat(document.getElementById('monto-fijo').value);
    const dia = parseInt(document.getElementById('dia-fijo').value);
    
    try {
        await addDoc(collection(db, "gastos_fijos"), { nombre, monto, dia });
        document.getElementById('form-gasto-fijo').reset();
    } catch (error) { console.error("Error: ", error); }
});

// 2. ESCUCHAR MOVIMIENTOS (INGRESOS Y GASTOS)
const qMovimientos = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
onSnapshot(qMovimientos, (querySnapshot) => {
    let ingresosMes = 0;
    let gastosMes = 0;
    
    const listaHistorial = document.getElementById('lista-historial');
    if(listaHistorial) listaHistorial.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        const fechaDoc = data.fecha.toDate();
        const mesDoc = fechaDoc.getMonth();
        const anioDoc = fechaDoc.getFullYear();

        // Solo sumamos y mostramos lo del mes actual
        if(mesDoc === mesActual && anioDoc === anioActual) {
            if (data.tipo === 'ingreso') ingresosMes += data.monto;
            if (data.tipo === 'gasto') gastosMes += data.monto;
            
            let icono = data.tipo === 'ingreso' ? '🟢' : '🔴';
            let colorMonto = data.tipo === 'ingreso' ? '#29c87c' : '#ff3b4a';

            listaHistorial.innerHTML += `
                <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; flex-direction: column;">
                        <strong style="font-size: 1rem;">${icono} ${data.descripcion}</strong>
                        <span style="font-size: 0.8rem; color: #aaa;">${fechaDoc.toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <strong style="font-size: 1.1rem; color: ${colorMonto};">S/ ${data.monto.toFixed(2)}</strong>
                        <button onclick="eliminarRegistro('movimientos', '${documento.id}')" style="background: none; border: none; color: #aaa; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </li>
            `;
        }
    });

    ingresosMesGlobal = ingresosMes;
    gastosMesGlobal = gastosMes;
    actualizarBalanceNeto();
});

// Guardar Movimiento (Ingreso/Gasto)
const campoFecha = document.getElementById('fecha-movimiento');
if(campoFecha) campoFecha.valueAsDate = new Date();

document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo-movimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const descripcion = document.getElementById('descripcion').value; 
    
    const fechaElegida = document.getElementById('fecha-movimiento').value;
    const fechaGuardar = new Date(fechaElegida + 'T12:00:00');

    try {
        await addDoc(collection(db, "movimientos"), {
            tipo, monto, descripcion, fecha: fechaGuardar
        });
        document.getElementById('form-movimiento').reset();
        document.getElementById('fecha-movimiento').valueAsDate = new Date();
    } catch (error) { console.error("Error: ", error); }
});

// 3. FUNCIÓN CENTRAL DE CÁLCULO
function actualizarBalanceNeto() {
    // Actualizar los textos pequeños
    document.getElementById('resumen-ingresos').innerText = `S/ ${ingresosMesGlobal.toFixed(2)}`;
    document.getElementById('resumen-gastos').innerText = `S/ ${gastosMesGlobal.toFixed(2)}`;
    document.getElementById('resumen-fijos').innerText = `S/ ${totalFijosGlobal.toFixed(2)}`;

    // El Balance Total es: Lo que ingresó MENOS lo que gastaste MENOS tus obligaciones fijas
    let balanceNeto = ingresosMesGlobal - gastosMesGlobal - totalFijosGlobal;

    const balanceEl = document.getElementById('balance-neto');
    balanceEl.innerText = `S/ ${balanceNeto.toFixed(2)}`;
    
    if (balanceNeto > 0) {
        balanceEl.style.color = "#29c87c"; // Verde = Vas bien
    } else if (balanceNeto < 0) {
        balanceEl.style.color = "#ff3b4a"; // Rojo = Estás en negativo
    } else {
        balanceEl.style.color = "#ffffff";
    }
}

// Función global para eliminar (sirve para fijos y movimientos)
window.eliminarRegistro = async function(coleccion, id) {
    if(confirm("¿Borrar este registro?")) {
        await deleteDoc(doc(db, coleccion, id));
    }
};
