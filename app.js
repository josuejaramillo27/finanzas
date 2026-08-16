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
let totalFijosGlobal = 0;
let fijosPendientesGlobal = 0; // NUEVO: Suma de los gastos fijos que aún no vencen
let ingresosMesActualGlobal = 0;
const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// 1. ESCUCHAR GASTOS FIJOS Y CALCULAR PENDIENTES
const qFijos = query(collection(db, "gastos_fijos"), orderBy("dia", "asc"));
onSnapshot(qFijos, (querySnapshot) => {
    let sumaFijos = 0;
    let sumaPendientes = 0;
    const diaActual = new Date().getDate(); // Obtiene el día de hoy (1-31)
    
    const listaFijos = document.getElementById('lista-fijos');
    listaFijos.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        sumaFijos += data.monto;
        
        // NUEVA LÓGICA: Evaluar si el gasto ya pasó o falta pagar
        let estadoGasto = '';
        if (data.dia >= diaActual) {
            sumaPendientes += data.monto; // Aún falta pagar este mes, lo restamos del dinero libre
            estadoGasto = '<span style="color: #ffb800; font-size: 0.75rem; margin-left: 5px;">(Falta pagar)</span>';
        } else {
            estadoGasto = '<span style="color: #29c87c; font-size: 0.75rem; margin-left: 5px;">(Ya pasó)</span>';
        }
        
        let fechaRegistroTexto = data.fechaRegistro ? data.fechaRegistro.toDate().toLocaleDateString() : 'Sin fecha antigua';
        
        listaFijos.innerHTML += `
            <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <strong>${data.nombre}</strong> ${estadoGasto} <br>
                    <span style="font-size: 0.8rem; color: #aaa;">Día de pago: ${data.dia} | Registrado: ${fechaRegistroTexto}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <strong>S/ ${data.monto.toFixed(2)}</strong>
                    <button onclick="eliminarFijo('${documento.id}')" style="background: none; border: none; color: #ff3b4a; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>
        `;
    });
    
    totalFijosGlobal = sumaFijos;
    fijosPendientesGlobal = sumaPendientes; // Guardamos lo que falta pagar
    
    document.getElementById('total-fijos-texto').innerText = `S/ ${sumaFijos.toFixed(2)}`;
    actualizarBarraMeta();
    actualizarDineroLibre(); // Actualizamos el panel verde
});

// Guardar Gasto Fijo con Fecha
document.getElementById('form-gasto-fijo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-fijo').value;
    const monto = parseFloat(document.getElementById('monto-fijo').value);
    const dia = parseInt(document.getElementById('dia-fijo').value);
    try {
        await addDoc(collection(db, "gastos_fijos"), { 
            nombre, monto, dia, fechaRegistro: new Date()
        });
        document.getElementById('form-gasto-fijo').reset();
    } catch (error) { console.error(error); }
});

window.eliminarFijo = async function(id) {
    if(confirm("¿Eliminar este gasto fijo?")) await deleteDoc(doc(db, "gastos_fijos", id));
};

// 2. ESCUCHAR MOVIMIENTOS Y DIBUJAR HISTORIAL CON FECHAS
const qMovimientos = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
onSnapshot(qMovimientos, (querySnapshot) => {
    let ingresosMesActual = 0;
    let saldoTotalHistorico = 0; 
    
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    
    const listaMeses = document.getElementById('lista-meses');
    const listaHistorial = document.getElementById('lista-historial');
    
    if(listaMeses) listaMeses.innerHTML = '';
    if(listaHistorial) listaHistorial.innerHTML = '';
    
    let resumenMensual = {};

    querySnapshot.forEach((documento) => {
        const data = documento.data();
        const fechaDoc = data.fecha.toDate();
        const mesDoc = fechaDoc.getMonth();
        const anioDoc = fechaDoc.getFullYear();
        const llaveMes = `${mesesNombres[mesDoc]} ${anioDoc}`;

        if(!resumenMensual[llaveMes]) resumenMensual[llaveMes] = { ingresos: 0, gastos: 0 };

        if (data.tipo === 'ingreso') {
            saldoTotalHistorico += data.monto;
            resumenMensual[llaveMes].ingresos += data.monto;
        } else if (data.tipo === 'gasto') {
            saldoTotalHistorico -= data.monto;
            resumenMensual[llaveMes].gastos += data.monto;
        }

        if(mesDoc === mesActual && anioDoc === anioActual) {
            if (data.tipo === 'ingreso') ingresosMesActual += data.monto;
            
            if(listaHistorial) {
                let icono = data.tipo === 'ingreso' ? '🟢' : '🔴';
                listaHistorial.innerHTML += `
                    <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; flex-direction: column;">
                            <strong style="font-size: 1rem;">${icono} ${data.descripcion}</strong>
                            <span style="font-size: 0.8rem; color: #aaa;">Fecha: ${fechaDoc.toLocaleDateString()}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <strong style="font-size: 1.1rem;">S/ ${data.monto.toFixed(2)}</strong>
                            <button onclick="eliminarMovimiento('${documento.id}')" style="background: none; border: none; color: #ff3b4a; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </li>
                `;
            }
        }
    });

    saldoEsperadoGlobal = saldoTotalHistorico;
    const saldoTop = document.getElementById('saldo-actual-top');
    if(saldoTop) saldoTop.innerText = `S/ ${saldoEsperadoGlobal.toFixed(2)}`;

    ingresosMesActualGlobal = ingresosMesActual;
    actualizarBarraMeta();
    actualizarDineroLibre(); // Actualizamos el panel verde

    for (const [mes, datos] of Object.entries(resumenMensual)) {
        let neta = datos.ingresos - datos.gastos;
        let colorNeta = neta > 0 ? '#29c87c' : '#ff3b4a';
        
        if(listaMeses) {
            listaMeses.innerHTML += `
                <li style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${mes}</strong>
                        <strong style="color: ${colorNeta};">Neta: S/ ${neta.toFixed(2)}</strong>
                    </div>
                    <div style="font-size: 0.85rem; color: #aaa;">
                        Ingresos: S/ ${datos.ingresos.toFixed(2)} | Gastos: S/ ${datos.gastos.toFixed(2)}
                    </div>
                </li>
            `;
        }
    }
});

// Función para actualizar la barra de meta
function actualizarBarraMeta() {
    const estadoMeta = document.getElementById('estado-meta');
    const barraFijos = document.getElementById('barra-meta-fijos');
    
    if(!estadoMeta || !barraFijos) return;

    if(totalFijosGlobal === 0) {
        estadoMeta.innerText = "Agrega gastos fijos primero";
        barraFijos.style.width = '0%';
        return;
    }
    
    let faltan = totalFijosGlobal - saldoEsperadoGlobal;
    let porcentaje = (saldoEsperadoGlobal / totalFijosGlobal) * 100;
    
    if(porcentaje > 100) porcentaje = 100;
    if(porcentaje < 0) porcentaje = 0;

    barraFijos.style.width = `${porcentaje}%`;

    if(faltan <= 0) {
        estadoMeta.innerText = "¡Meta lograda! Fijos cubiertos 🎉";
        estadoMeta.style.color = "#29c87c";
    } else {
        estadoMeta.innerText = `Faltan S/ ${faltan.toFixed(2)}`;
        estadoMeta.style.color = "#ffb800";
    }
}

// NUEVA FUNCIÓN: Calcular Dinero Libre
function actualizarDineroLibre() {
    const elementoLibre = document.getElementById('dinero-libre');
    if (!elementoLibre) return;

    // Solo restamos de tu saldo los fijos que todavía no vencen este mes
    let dineroLibre = saldoEsperadoGlobal - fijosPendientesGlobal;

    if (dineroLibre > 0) {
        elementoLibre.innerText = `S/ ${dineroLibre.toFixed(2)}`;
        elementoLibre.style.color = "#29c87c"; // Verde brillante (Puedes gastar)
    } else {
        elementoLibre.innerText = `S/ 0.00`;
        elementoLibre.style.color = "#ff3b4a"; // Rojo (¡No gastes nada extra!)
    }
}

window.eliminarMovimiento = async function(id) {
    if(confirm("¿Borrar este registro? Esto recalculará tus saldos.")) {
        await deleteDoc(doc(db, "movimientos", id));
    }
};

// 3. REGISTRAR GASTOS VARIABLES E INGRESOS
const campoFecha = document.getElementById('fecha-movimiento');
if(campoFecha) campoFecha.valueAsDate = new Date();

const formMovimiento = document.getElementById('form-movimiento');
if(formMovimiento) {
    formMovimiento.addEventListener('submit', async (e) => {
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
            formMovimiento.reset();
            document.getElementById('fecha-movimiento').valueAsDate = new Date();
        } catch (error) { console.error("Error: ", error); }
    });
}

// 4. CIERRE DE BANCO: AJUSTE AUTOMÁTICO
const btnActualizarSaldo = document.getElementById('btn-actualizar-saldo');
if(btnActualizarSaldo) {
    btnActualizarSaldo.addEventListener('click', async () => {
        const saldoRealInput = document.getElementById('saldo-real').value;
        if(saldoRealInput === '') return alert("Ingresa tu saldo real.");
        
        const saldoReal = parseFloat(saldoRealInput);
        const diferencia = saldoReal - saldoEsperadoGlobal;

        if(Math.abs(diferencia) < 0.05) {
            alert("¡Todo cuadra!");
            document.getElementById('saldo-real').value = '';
            return;
        }

        let tipoAjuste = diferencia < 0 ? 'gasto' : 'ingreso';
        let descripcionAjuste = diferencia < 0 ? '☕ Gastos diarios menores (Auto)' : '✨ Ingreso no identificado (Auto)';
        let montoAjuste = Math.abs(diferencia);

        try {
            await addDoc(collection(db, "movimientos"), {
                tipo: tipoAjuste, monto: montoAjuste, descripcion: descripcionAjuste, fecha: new Date()
            });
            document.getElementById('saldo-real').value = '';
            alert(`Ajuste creado: ${tipoAjuste} por S/ ${montoAjuste.toFixed(2)} para cuadrar.`);
        } catch (error) { console.error(error); }
    });
}
