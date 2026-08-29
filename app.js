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

document.getElementById('mes-actual-nombre').innerText = mesesNombres[mesActual];

// Variables Globales de Cálculo
let totalFijosGlobal = 0;
let fijosPendientesGlobal = 0; // Solo los que faltan pagar este mes
let ingresosMesGlobal = 0;
let gastosMesGlobal = 0;
let saldoEsperadoGlobal = 0;   // Todo el dinero histórico (Ingresos totales - Gastos totales)

// 1. ESCUCHAR GASTOS FIJOS
const qFijos = query(collection(db, "gastos_fijos"), orderBy("dia", "asc"));
onSnapshot(qFijos, (querySnapshot) => {
    let sumaFijos = 0;
    let sumaPendientes = 0;
    const diaActual = new Date().getDate(); 
    
    const listaFijos = document.getElementById('lista-fijos');
    if(listaFijos) listaFijos.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        sumaFijos += data.monto;
        
        // Evaluar si ya pasó o falta pagar
        let estadoGasto = '';
        if (data.dia >= diaActual) {
            sumaPendientes += data.monto; 
            estadoGasto = '<span style="color: #ffb800; font-size: 0.75rem; margin-left: 5px;">(Falta pagar)</span>';
        } else {
            estadoGasto = '<span style="color: #29c87c; font-size: 0.75rem; margin-left: 5px;">(Ya pasó)</span>';
        }
        
        listaFijos.innerHTML += `
            <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <strong>${data.nombre}</strong> ${estadoGasto} <br>
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
    fijosPendientesGlobal = sumaPendientes;
    actualizarPanelPrincipal();
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

// 2. ESCUCHAR MOVIMIENTOS (HISTÓRICO Y MES ACTUAL)
const qMovimientos = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
onSnapshot(qMovimientos, (querySnapshot) => {
    let ingresosMes = 0;
    let gastosMes = 0;
    let saldoTotal = 0;
    
    const listaHistorial = document.getElementById('lista-historial');
    if(listaHistorial) listaHistorial.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        const fechaDoc = data.fecha.toDate();
        const mesDoc = fechaDoc.getMonth();
        const anioDoc = fechaDoc.getFullYear();

        // Calcular Saldo Histórico Global
        if (data.tipo === 'ingreso') saldoTotal += data.monto;
        if (data.tipo === 'gasto') saldoTotal -= data.monto;

        // Calcular y mostrar SOLO el mes actual
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

    saldoEsperadoGlobal = saldoTotal;
    ingresosMesGlobal = ingresosMes;
    gastosMesGlobal = gastosMes;
    actualizarPanelPrincipal();
});

// Guardar Movimiento Manual
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

// 3. FUNCIÓN CENTRAL DE ACTUALIZACIÓN VISUAL
function actualizarPanelPrincipal() {
    // 3.1 Actualizar Saldo Real (Histórico)
    document.getElementById('saldo-actual-top').innerText = `S/ ${saldoEsperadoGlobal.toFixed(2)}`;

    // 3.2 Actualizar Dinero Libre (Saldo Actual - Fijos Pendientes de este mes)
    let dineroLibre = saldoEsperadoGlobal - fijosPendientesGlobal;
    const elementoLibre = document.getElementById('dinero-libre');
    
    if (dineroLibre > 0) {
        elementoLibre.innerText = `S/ ${dineroLibre.toFixed(2)}`;
        elementoLibre.style.color = "#29c87c"; 
    } else {
        elementoLibre.innerText = `S/ 0.00`;
        elementoLibre.style.color = "#ff3b4a"; 
    }

    // 3.3 Actualizar Resumen Mensual (Textos pequeños)
    document.getElementById('resumen-ingresos').innerText = `S/ ${ingresosMesGlobal.toFixed(2)}`;
    document.getElementById('resumen-gastos').innerText = `S/ ${gastosMesGlobal.toFixed(2)}`;
    document.getElementById('resumen-fijos').innerText = `S/ ${totalFijosGlobal.toFixed(2)}`;

    // 3.4 Actualizar Balance Neto del Mes
    let balanceNeto = ingresosMesGlobal - gastosMesGlobal - totalFijosGlobal;
    const balanceEl = document.getElementById('balance-neto');
    balanceEl.innerText = `S/ ${balanceNeto.toFixed(2)}`;
    
    if (balanceNeto > 0) {
        balanceEl.style.color = "#29c87c"; 
    } else if (balanceNeto < 0) {
        balanceEl.style.color = "#ff3b4a"; 
    } else {
        balanceEl.style.color = "#ffffff";
    }
}

// 4. CIERRE DE BANCO: AJUSTE AUTOMÁTICO DE GASTOS INVISIBLES
const btnActualizarSaldo = document.getElementById('btn-actualizar-saldo');
if(btnActualizarSaldo) {
    btnActualizarSaldo.addEventListener('click', async () => {
        const saldoRealInput = document.getElementById('saldo-real').value;
        if(saldoRealInput === '') return alert("Ingresa tu saldo real en cuenta.");
        
        const saldoReal = parseFloat(saldoRealInput);
        const diferencia = saldoReal - saldoEsperadoGlobal;

        // Si la diferencia es de centavos, no hacemos nada
        if(Math.abs(diferencia) < 0.05) {
            alert("¡Tu cuenta cuadra perfectamente!");
            document.getElementById('saldo-real').value = '';
            return;
        }

        // Detectamos si es fuga de dinero o ingreso no mapeado
        let tipoAjuste = diferencia < 0 ? 'gasto' : 'ingreso';
        let descripcionAjuste = diferencia < 0 ? '☕ Gastos diarios menores (Auto)' : '✨ Ingreso no identificado (Auto)';
        let montoAjuste = Math.abs(diferencia);

        try {
            await addDoc(collection(db, "movimientos"), {
                tipo: tipoAjuste, monto: montoAjuste, descripcion: descripcionAjuste, fecha: new Date()
            });
            document.getElementById('saldo-real').value = '';
            alert(`Se ajustó tu cuenta: ${tipoAjuste} por S/ ${montoAjuste.toFixed(2)}.`);
        } catch (error) { console.error(error); }
    });
}

// Función global para eliminar (sirve para fijos y movimientos)
window.eliminarRegistro = async function(coleccion, id) {
    if(confirm("¿Borrar este registro? Esto recalculará todo.")) {
        await deleteDoc(doc(db, coleccion, id));
    }
};
