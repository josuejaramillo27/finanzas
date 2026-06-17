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

// Variables Globales
let saldoEsperadoGlobal = 0;
const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// 1. ESCUCHAR MOVIMIENTOS Y CALCULAR TODO
const qMovimientos = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
onSnapshot(qMovimientos, (querySnapshot) => {
    let ingresosMesActual = 0;
    let gastosMesActual = 0;
    let saldoTotalHistorico = 0; // Para la conciliación matemática
    
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    
    const listaHistorial = document.getElementById('lista-historial');
    const listaMeses = document.getElementById('lista-meses');
    listaHistorial.innerHTML = '';
    listaMeses.innerHTML = '';

    // Objeto para agrupar por meses
    let resumenMensual = {};

    querySnapshot.forEach((documento) => {
        const data = documento.data();
        const fechaDoc = data.fecha.toDate();
        const mesDoc = fechaDoc.getMonth();
        const anioDoc = fechaDoc.getFullYear();
        const llaveMes = `${mesesNombres[mesDoc]} ${anioDoc}`;

        // Preparar objeto de resumen histórico si no existe
        if(!resumenMensual[llaveMes]) {
            resumenMensual[llaveMes] = { ingresos: 0, gastos: 0 };
        }

        // Cálculos generales (Saldo Esperado)
        if (data.tipo === 'ingreso') {
            saldoTotalHistorico += data.monto;
            resumenMensual[llaveMes].ingresos += data.monto;
        } else if (data.tipo === 'gasto') {
            saldoTotalHistorico -= data.monto;
            resumenMensual[llaveMes].gastos += data.monto;
        }

        // Cálculos solo del mes actual
        if(mesDoc === mesActual && anioDoc === anioActual) {
            if (data.tipo === 'ingreso') ingresosMesActual += data.monto;
            if (data.tipo === 'gasto') gastosMesActual += data.monto;
            
            // Dibujar en el historial detallado
            let icono = data.tipo === 'ingreso' ? '🟢' : data.tipo === 'gasto' ? '🔴' : '🚀';
            listaHistorial.innerHTML += `
                <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; flex-direction: column;">
                        <strong style="font-size: 1rem;">${icono} ${data.descripcion}</strong>
                        <span style="font-size: 0.8rem; color: #aaa;">${fechaDoc.toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <strong style="font-size: 1.1rem;">S/ ${data.monto.toFixed(2)}</strong>
                        <button onclick="eliminarMovimiento('${documento.id}')" style="background: none; border: none; color: #ff3b4a; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </li>
            `;
        }
    });

    // Guardar el saldo esperado global para usarlo en el botón de ajuste
    saldoEsperadoGlobal = saldoTotalHistorico;
    document.getElementById('saldo-esperado').innerText = `S/ ${saldoEsperadoGlobal.toFixed(2)}`;

  // NUEVA LÍNEA: Mostrar el saldo gigante en la parte superior
    document.getElementById('saldo-actual-top').innerText = `S/ ${saldoEsperadoGlobal.toFixed(2)}`;

    // Actualizar Panel de Meta del Mes Actual
    const gananciaNetaActual = ingresosMesActual - gastosMesActual;
    document.getElementById('ganancia-mensual').innerText = `S/ ${gananciaNetaActual.toFixed(2)}`;
    
    let porcentajeMeta = (gananciaNetaActual / 1000) * 100;
    if (porcentajeMeta < 0) porcentajeMeta = 0;
    if (porcentajeMeta > 100) porcentajeMeta = 100;
    document.getElementById('barra-meta').style.width = `${porcentajeMeta}%`;

    // Dibujar Resumen por Meses
    for (const [mes, datos] of Object.entries(resumenMensual)) {
        let neta = datos.ingresos - datos.gastos;
        let colorNeta = neta >= 1000 ? '#29c87c' : (neta > 0 ? '#ffb800' : '#ff3b4a');
        let mensaje = neta >= 1000 ? '¡Meta lograda! 🏆' : 'A seguir mejorando 💪';
        
        listaMeses.innerHTML += `
            <li style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong>${mes}</strong>
                    <strong style="color: ${colorNeta};">Neta: S/ ${neta.toFixed(2)}</strong>
                </div>
                <div style="font-size: 0.85rem; color: #aaa; display: flex; justify-content: space-between;">
                    <span>Ingresos: S/ ${datos.ingresos.toFixed(2)} | Gastos: S/ ${datos.gastos.toFixed(2)}</span>
                    <span>${mensaje}</span>
                </div>
            </li>
        `;
    }
});

// Función Global para eliminar movimiento
window.eliminarMovimiento = async function(id) {
    if(confirm("¿Borrar este registro? Esto recalculará tus saldos.")) {
        await deleteDoc(doc(db, "movimientos", id));
    }
};

// 2. FECHA POR DEFECTO Y GUARDADO MANUAL
const campoFecha = document.getElementById('fecha-movimiento');
campoFecha.valueAsDate = new Date();

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
    } catch (error) {
        console.error("Error: ", error);
    }
});

// 3. LA MAGIA: AJUSTE AUTOMÁTICO DE CIERRE DE DÍA
document.getElementById('btn-actualizar-saldo').addEventListener('click', async () => {
    const saldoRealInput = document.getElementById('saldo-real').value;
    if(saldoRealInput === '') return alert("Por favor ingresa tu saldo real del banco.");
    
    const saldoReal = parseFloat(saldoRealInput);
    const diferencia = saldoReal - saldoEsperadoGlobal;

    // Si la diferencia es casi 0 (evitar decimales locos), no hacemos nada
    if(Math.abs(diferencia) < 0.05) {
        alert("¡Todo cuadra perfectamente! No hay fugas de dinero.");
        document.getElementById('saldo-real').value = '';
        return;
    }

    let tipoAjuste, descripcionAjuste, montoAjuste;

    if (diferencia < 0) {
        // Tiene MENOS dinero del esperado = Gastos diarios que no anotó
        tipoAjuste = 'gasto';
        montoAjuste = Math.abs(diferencia);
        descripcionAjuste = '☕ Gastos diarios menores (Auto)';
    } else {
        // Tiene MÁS dinero del esperado = Ingreso que olvidó anotar
        tipoAjuste = 'ingreso';
        montoAjuste = diferencia;
        descripcionAjuste = '✨ Ingreso no identificado (Auto)';
    }

    try {
        await addDoc(collection(db, "movimientos"), {
            tipo: tipoAjuste,
            monto: montoAjuste,
            descripcion: descripcionAjuste,
            fecha: new Date()
        });
        document.getElementById('saldo-real').value = '';
        alert(`Ajuste automático creado: Se registró un ${tipoAjuste} por S/ ${montoAjuste.toFixed(2)} para cuadrar tu cuenta.`);
    } catch (error) {
        console.error("Error al hacer el ajuste: ", error);
    }
});
