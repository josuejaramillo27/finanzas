import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// Variables Globales
let totalFijosGlobal = 0;
let fijosPendientesGlobal = 0; 
let ingresosMesGlobal = 0;
let gastosMesGlobal = 0;
let saldoEsperadoGlobal = 0;   
let ultimaFechaMovGlobal = null; 
let desgloseIngresosGlobal = {}; 

// 1. ESCUCHAR CATEGORÍAS DE CLIENTES
const qCategorias = query(collection(db, "categorias_ingreso"), orderBy("nombre", "asc"));
onSnapshot(qCategorias, (querySnapshot) => {
    const selectCat = document.getElementById('categoria-ingreso');
    const listaCat = document.getElementById('lista-categorias');
    
    if(selectCat) selectCat.innerHTML = '<option value="">Selecciona cliente/categoría...</option>';
    if(listaCat) listaCat.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        
        if(selectCat) selectCat.innerHTML += `<option value="${data.nombre}">${data.nombre}</option>`;
        if(listaCat) listaCat.innerHTML += `
            <li style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                <span>${data.nombre}</span>
                <button onclick="eliminarRegistro('categorias_ingreso', '${documento.id}')" style="background: none; border: none; color: #aaa; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
            </li>
        `;
    });
});

document.getElementById('form-categoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-categoria').value;
    try {
        await addDoc(collection(db, "categorias_ingreso"), { nombre });
        document.getElementById('form-categoria').reset();
    } catch (error) { console.error(error); }
});

// 2. ESCUCHAR GASTOS FIJOS (BOTÓN PAGADO Y BARRA VERDE/ROJA)
const qFijos = query(collection(db, "gastos_fijos"), orderBy("dia", "asc"));
onSnapshot(qFijos, (querySnapshot) => {
    let sumaFijos = 0;
    let sumaPendientes = 0;
    let proximoGasto = null;
    let minDiasFaltantes = 999;
    
    const fechaHoy = new Date();
    const diaActual = fechaHoy.getDate(); 
    const mesActualNum = fechaHoy.getMonth();
    const anioActualNum = fechaHoy.getFullYear();
    const diasEnMesActual = new Date(anioActualNum, mesActualNum + 1, 0).getDate();
    
    const listaFijos = document.getElementById('lista-fijos');
    if(listaFijos) listaFijos.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        sumaFijos += data.monto;
        
        let diasFaltantes = 0;
        let bloquearDinero = false;

        if (data.dia >= diaActual) {
            diasFaltantes = data.dia - diaActual;
        } else {
            diasFaltantes = (diasEnMesActual - diaActual) + data.dia;
        }

        // Determinar a qué mes/año pertenece el cobro
        let mesFijo = mesActualNum;
        let anioFijo = anioActualNum;
        if (data.dia < diaActual && diasFaltantes <= 5) {
            mesFijo = mesActualNum + 1;
            if (mesFijo > 11) { mesFijo = 0; anioFijo++; }
        }
        let idMesCobro = `${mesFijo}-${anioFijo}`;
        
        // Comprobar si tú mismo lo marcaste manualmente como ✅ "Pagado"
        let yaPagado = data.mesPagado === idMesCobro;

        let estadoGasto = '';

        if (yaPagado) {
            bloquearDinero = false;
            estadoGasto = '<span style="color: #10B981; font-size: 0.75rem; margin-left: 5px;">(Pagado)</span>';
        } else {
            if (data.dia >= diaActual) {
                bloquearDinero = true;
                estadoGasto = '<span style="color: #F4F4F5; font-size: 0.75rem; margin-left: 5px;">(Falta pagar)</span>';
            } else if (diasFaltantes <= 5) { 
                bloquearDinero = true;
                estadoGasto = '<span style="color: #10B981; font-size: 0.75rem; margin-left: 5px;">(Próximo mes: ¡Se acerca!)</span>';
            } else {
                bloquearDinero = false;
                estadoGasto = '<span style="color: #3F3F46; font-size: 0.75rem; margin-left: 5px;">(Ya pasó)</span>';
            }
        }

        if (bloquearDinero) {
            sumaPendientes += data.monto;
        }
        
        if (!yaPagado && diasFaltantes < minDiasFaltantes) {
            minDiasFaltantes = diasFaltantes;
            proximoGasto = data;
        }
        
        listaFijos.innerHTML += `
            <li style="background: #1E1E1E; padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #27272A;">
                <div>
                    <strong style="color: #F4F4F5;">${data.nombre}</strong> ${estadoGasto} <br>
                    <span style="font-size: 0.8rem; color: #A1A1AA;">Día de pago: ${data.dia}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <strong style="color: #F4F4F5;">S/ ${data.monto.toFixed(2)}</strong>
                    ${!yaPagado ? `<button onclick="marcarPagado('${documento.id}', '${idMesCobro}')" style="background: none; border: none; color: #10B981; cursor: pointer; font-size: 1.2rem;" title="Marcar como pagado">✅</button>` : `<button onclick="deshacerPago('${documento.id}')" style="background: none; border: none; color: #A1A1AA; cursor: pointer;" title="Deshacer pago"><i class="fa-solid fa-rotate-left"></i></button>`}
                    <button onclick="eliminarRegistro('gastos_fijos', '${documento.id}')" style="background: none; border: none; color: #EF4444; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>
        `;
    });
    
    totalFijosGlobal = sumaFijos;
    fijosPendientesGlobal = sumaPendientes;
    
    const alertaGasto = document.getElementById('alerta-proximo-gasto');
    if (proximoGasto && minDiasFaltantes <= 5) {
        alertaGasto.style.display = 'block';
        let textoDias = minDiasFaltantes === 0 ? "Hoy mismo" : (minDiasFaltantes === 1 ? "Mañana" : `en ${minDiasFaltantes} días`);
        alertaGasto.innerHTML = `<i class="fa-solid fa-bell"></i> Próximo fijo: <strong>${proximoGasto.nombre}</strong> se paga ${textoDias}. <br>Ya apartamos sus S/ ${proximoGasto.monto.toFixed(2)} en la barra roja.`;
    } else {
        alertaGasto.style.display = 'none';
    }
    
    actualizarPanelPrincipal();
});

// Guardar y Actualizar Gasto Fijo
document.getElementById('form-gasto-fijo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-fijo').value;
    const monto = parseFloat(document.getElementById('monto-fijo').value);
    const dia = parseInt(document.getElementById('dia-fijo').value);
    try {
        await addDoc(collection(db, "gastos_fijos"), { nombre, monto, dia, mesPagado: null });
        document.getElementById('form-gasto-fijo').reset();
    } catch (error) { console.error(error); }
});

window.marcarPagado = async function(id, idMesCobro) {
    await updateDoc(doc(db, "gastos_fijos", id), { mesPagado: idMesCobro });
};

window.deshacerPago = async function(id) {
    await updateDoc(doc(db, "gastos_fijos", id), { mesPagado: null });
};

// 3. ESCUCHAR MOVIMIENTOS
const qMovimientos = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
onSnapshot(qMovimientos, (querySnapshot) => {
    let ingresosMes = 0;
    let gastosMes = 0;
    let saldoTotal = 0;
    desgloseIngresosGlobal = {}; 
    
    const listaHistorial = document.getElementById('lista-historial');
    if(listaHistorial) listaHistorial.innerHTML = '';
    
    let isFirst = true;

    querySnapshot.forEach((documento) => {
        const data = documento.data();
        const fechaDoc = data.fecha.toDate();
        const mesDoc = fechaDoc.getMonth();
        const anioDoc = fechaDoc.getFullYear();

        if(isFirst) {
            ultimaFechaMovGlobal = fechaDoc;
            isFirst = false;
        }

        if (data.tipo === 'ingreso') saldoTotal += data.monto;
        if (data.tipo === 'gasto') saldoTotal -= data.monto;

        if(mesDoc === mesActual && anioDoc === anioActual) {
            if (data.tipo === 'ingreso') {
                ingresosMes += data.monto;
                desgloseIngresosGlobal[data.descripcion] = (desgloseIngresosGlobal[data.descripcion] || 0) + data.monto;
            }
            if (data.tipo === 'gasto') {
                gastosMes += data.monto;
            }
            
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

document.getElementById('tipo-movimiento').addEventListener('change', (e) => {
    const inputGasto = document.getElementById('descripcion-gasto');
    const selectIngreso = document.getElementById('categoria-ingreso');
    
    if(e.target.value === 'ingreso') {
        inputGasto.style.display = 'none';
        inputGasto.removeAttribute('required');
        selectIngreso.style.display = 'block';
        selectIngreso.setAttribute('required', 'true');
    } else {
        inputGasto.style.display = 'block';
        inputGasto.setAttribute('required', 'true');
        selectIngreso.style.display = 'none';
        selectIngreso.removeAttribute('required');
    }
});

const campoFecha = document.getElementById('fecha-movimiento');
if(campoFecha) campoFecha.valueAsDate = new Date();

document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo-movimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);
    
    const descripcion = tipo === 'ingreso' ? document.getElementById('categoria-ingreso').value : document.getElementById('descripcion-gasto').value; 
    const fechaElegida = document.getElementById('fecha-movimiento').value;
    const fechaGuardar = new Date(fechaElegida + 'T12:00:00');

    try {
        await addDoc(collection(db, "movimientos"), {
            tipo, monto, descripcion, fecha: fechaGuardar
        });
        document.getElementById('form-movimiento').reset();
        document.getElementById('fecha-movimiento').valueAsDate = new Date();
        document.getElementById('tipo-movimiento').dispatchEvent(new Event('change'));
    } catch (error) { console.error("Error: ", error); }
});

// 4. FUNCIÓN CENTRAL DE ACTUALIZACIÓN VISUAL
function actualizarPanelPrincipal() {
    document.getElementById('saldo-actual-top').innerText = `S/ ${saldoEsperadoGlobal.toFixed(2)}`;

    let dineroLibre = saldoEsperadoGlobal - fijosPendientesGlobal;
    const elementoLibre = document.getElementById('dinero-libre');
    
    if (dineroLibre > 0) {
        elementoLibre.innerText = `S/ ${dineroLibre.toFixed(2)}`;
        elementoLibre.style.color = "#29c87c"; 
    } else {
        elementoLibre.innerText = `S/ 0.00`;
        elementoLibre.style.color = "#ff3b4a"; 
    }
    
    // DINÁMICA DE LA BARRA VERDE/ROJA
    const barraRoja = document.getElementById('barra-roja-fijos');
    if (barraRoja) {
        let porcentajeRojo = 0;
        if (saldoEsperadoGlobal > 0) {
            porcentajeRojo = (fijosPendientesGlobal / saldoEsperadoGlobal) * 100;
            if (porcentajeRojo > 100) porcentajeRojo = 100;
        } else if (fijosPendientesGlobal > 0) {
            porcentajeRojo = 100;
        }
        barraRoja.style.width = `${porcentajeRojo}%`;
    }

    document.getElementById('resumen-ingresos').innerText = `S/ ${ingresosMesGlobal.toFixed(2)}`;
    
    const boxDesglose = document.getElementById('desglose-clientes');
    boxDesglose.innerHTML = '';
    for (const [cliente, total] of Object.entries(desgloseIngresosGlobal)) {
        if (!cliente.includes('(Auto)')) {
            boxDesglose.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;"><span>${cliente}:</span> <strong>S/ ${total.toFixed(2)}</strong></div>`;
        }
    }
    if (boxDesglose.innerHTML === '') boxDesglose.innerHTML = 'Sin ingresos aún.';

    document.getElementById('resumen-gastos').innerText = `S/ ${gastosMesGlobal.toFixed(2)}`;
    document.getElementById('resumen-fijos').innerText = `S/ ${totalFijosGlobal.toFixed(2)}`;

    let balanceNeto = ingresosMesGlobal - gastosMesGlobal - totalFijosGlobal;
    const balanceEl = document.getElementById('balance-neto');
    balanceEl.innerText = `S/ ${balanceNeto.toFixed(2)}`;
    
    if (balanceNeto > 0) balanceEl.style.color = "#29c87c"; 
    else if (balanceNeto < 0) balanceEl.style.color = "#ff3b4a"; 
    else balanceEl.style.color = "#ffffff";
}

// 5. CIERRE DE BANCO
const btnActualizarSaldo = document.getElementById('btn-actualizar-saldo');
if(btnActualizarSaldo) {
    btnActualizarSaldo.addEventListener('click', async () => {
        const saldoRealInput = document.getElementById('saldo-real').value;
        if(saldoRealInput === '') return alert("Ingresa tu saldo real en cuenta.");
        
        const saldoReal = parseFloat(saldoRealInput);
        const diferencia = saldoReal - saldoEsperadoGlobal;

        if(Math.abs(diferencia) < 0.05) {
            alert("¡Tu cuenta cuadra perfectamente!");
            document.getElementById('saldo-real').value = '';
            return;
        }

        let tipoAjuste = diferencia < 0 ? 'gasto' : 'ingreso';
        let montoAjuste = Math.abs(diferencia);
        
        let fechaDesdeTexto = ultimaFechaMovGlobal ? ultimaFechaMovGlobal.toLocaleDateString() : 'Ayer';
        let descripcionAjuste = diferencia < 0 ? `☕ Gastos invisibles (Del ${fechaDesdeTexto} al Hoy)` : `✨ Ingreso no mapeado (Del ${fechaDesdeTexto} al Hoy)`;

        try {
            await addDoc(collection(db, "movimientos"), {
                tipo: tipoAjuste, monto: montoAjuste, descripcion: descripcionAjuste, fecha: new Date()
            });
            document.getElementById('saldo-real').value = '';
            alert(`Se ajustó tu cuenta: ${tipoAjuste} por S/ ${montoAjuste.toFixed(2)}.`);
        } catch (error) { console.error(error); }
    });
}

window.eliminarRegistro = async function(coleccion, id) {
    if(confirm("¿Borrar este registro? Esto recalculará todo.")) {
        await deleteDoc(doc(db, coleccion, id));
    }
};
