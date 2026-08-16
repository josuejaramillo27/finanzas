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
let fijosPendientesGlobal = 0;
let ingresosMesActualGlobal = 0;
const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- NUEVA LÓGICA: GAMIFICACIÓN DE RACHA CORREGIDA ---
function calcularRacha(diasNetos) {
    let racha = 0;
    const rachaEl = document.getElementById('racha-dias');

    // Si tu app es nueva y aún no hay registros, la racha empieza en 0
    if (diasNetos.size === 0) {
        if(rachaEl) rachaEl.innerText = 0;
        return;
    }

    // Averiguamos cuál fue el primer día que registraste un movimiento en la app
    let tiempos = Array.from(diasNetos.keys());
    let tiempoMasAntiguo = Math.min(...tiempos);

    let fechaCheck = new Date();
    fechaCheck.setHours(0,0,0,0);
    
    // Comprueba día por día hacia atrás
    for(let i=0; i<365; i++) {
        let tiempo = fechaCheck.getTime();
        
        // ¡LA MAGIA! Si el buscador viaja más atrás del día en que instalaste la app, se detiene
        if (tiempo < tiempoMasAntiguo) {
            break;
        }

        // Si hoy no registraste nada, o si tus ingresos superaron tus gastos = Día Verde 🔥
        if (!diasNetos.has(tiempo) || diasNetos.get(tiempo) >= 0) {
            racha++;
            fechaCheck.setDate(fechaCheck.getDate() - 1);
        } else {
            // Si el neto es negativo (gastaste más de lo que ganaste hoy), se rompe la racha
            break;
        }
    }
    
    if(rachaEl) rachaEl.innerText = racha;
}

// 1. ESCUCHAR GASTOS FIJOS Y CUOTAS
const qFijos = query(collection(db, "gastos_fijos"), orderBy("dia", "asc"));
onSnapshot(qFijos, (querySnapshot) => {
    let sumaFijos = 0;
    let sumaPendientes = 0;
    const diaActual = new Date().getDate(); 
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    
    const listaFijos = document.getElementById('lista-fijos');
    listaFijos.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        let esActivo = true;
        let cuotasTexto = '';

        // Lógica de CUOTAS (La app detecta si ya pasó el tiempo)
        if (data.cuotas && data.cuotas > 0 && data.fechaRegistro) {
            let fechaReg = data.fechaRegistro.toDate();
            // Diferencia en meses desde que se registró
            let mesesPasados = (anioActual - fechaReg.getFullYear()) * 12 + (mesActual - fechaReg.getMonth());
            let cuotaActual = mesesPasados + 1;
            
            if (cuotaActual > data.cuotas) {
                esActivo = false; // El tiempo se acabó, ya no se cobra
            } else {
                cuotasTexto = `<span style="color: #c048db; font-size: 0.75rem; margin-left: 5px;">(Cuota ${cuotaActual}/${data.cuotas})</span>`;
            }
        }

        // Si la cuota ya terminó, la mostramos tachada y NO sumamos
        if (!esActivo) {
            listaFijos.innerHTML += `
                <li style="background: rgba(0,0,0,0.1); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05); opacity: 0.5;">
                    <div>
                        <strong style="text-decoration: line-through;">${data.nombre}</strong> <span style="color: #29c87c; font-size: 0.75rem; margin-left: 5px;">(Completado)</span> <br>
                        <span style="font-size: 0.8rem; color: #aaa;">Día de pago: ${data.dia}</span>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button onclick="eliminarFijo('${documento.id}')" style="background: none; border: none; color: #ff3b4a; cursor: pointer;" title="Eliminar del historial"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </li>
            `;
            return; // Saltamos para no sumarlo a los gastos de este mes
        }

        // Si es activo (fijo de siempre o cuota vigente)
        sumaFijos += data.monto;
        let estadoGasto = '';
        if (data.dia >= diaActual) {
            sumaPendientes += data.monto; 
            estadoGasto = '<span style="color: #ffb800; font-size: 0.75rem; margin-left: 5px;">(Falta pagar)</span>';
        } else {
            estadoGasto = '<span style="color: #29c87c; font-size: 0.75rem; margin-left: 5px;">(Ya pasó)</span>';
        }
        
        let fechaRegistroTexto = data.fechaRegistro ? data.fechaRegistro.toDate().toLocaleDateString() : 'Sin fecha antigua';
        
        listaFijos.innerHTML += `
            <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <strong>${data.nombre}</strong> ${cuotasTexto} ${estadoGasto} <br>
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
    fijosPendientesGlobal = sumaPendientes;
    
    document.getElementById('total-fijos-texto').innerText = `S/ ${sumaFijos.toFixed(2)}`;
    actualizarBarraMeta();
    actualizarDineroLibre(); 
});

// Guardar Gasto Fijo o Cuota
document.getElementById('form-gasto-fijo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-fijo').value;
    const monto = parseFloat(document.getElementById('monto-fijo').value);
    const dia = parseInt(document.getElementById('dia-fijo').value);
    const cuotas = parseInt(document.getElementById('cuotas-fijo').value) || 0; // NUEVO
    
    try {
        await addDoc(collection(db, "gastos_fijos"), { 
            nombre, monto, dia, cuotas, fechaRegistro: new Date()
        });
        document.getElementById('form-gasto-fijo').reset();
    } catch (error) { console.error(error); }
});

window.eliminarFijo = async function(id) {
    if(confirm("¿Eliminar este gasto fijo?")) await deleteDoc(doc(db, "gastos_fijos", id));
};


// 2. ESCUCHAR PRÉSTAMOS (NUEVA SECCIÓN)
const qPrestamos = query(collection(db, "prestamos"), orderBy("fecha", "desc"));
onSnapshot(qPrestamos, (querySnapshot) => {
    const listaPrestamos = document.getElementById('lista-prestamos');
    if(!listaPrestamos) return;
    listaPrestamos.innerHTML = '';
    
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        let color = data.tipo === 'me_deben' ? '#29c87c' : '#ff3b4a';
        let textoTipo = data.tipo === 'me_deben' ? 'Me deben a mi' : 'Yo le debo';
        
        listaPrestamos.innerHTML += `
            <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid ${color};">
                <div>
                    <strong>${data.nombre}</strong> <br>
                    <span style="font-size: 0.8rem; color: #aaa;">${textoTipo}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <strong style="color: ${color};">S/ ${data.monto.toFixed(2)}</strong>
                    <button onclick="eliminarPrestamo('${documento.id}')" style="background: none; border: none; color: #aaa; cursor: pointer;" title="Marcar como pagado"><i class="fa-solid fa-check-circle"></i></button>
                </div>
            </li>
        `;
    });
});

document.getElementById('form-prestamo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-prestamo').value;
    const monto = parseFloat(document.getElementById('monto-prestamo').value);
    const tipo = document.getElementById('tipo-prestamo').value;
    try {
        await addDoc(collection(db, "prestamos"), { 
            nombre, monto, tipo, fecha: new Date()
        });
        document.getElementById('form-prestamo').reset();
    } catch (error) { console.error(error); }
});

window.eliminarPrestamo = async function(id) {
    if(confirm("¿Seguro que esta deuda ya fue saldada?")) await deleteDoc(doc(db, "prestamos", id));
};


// 3. ESCUCHAR MOVIMIENTOS Y DIBUJAR HISTORIAL
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
    let diasNetos = new Map(); // Para calcular la racha

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
        
        // Recopilando datos para Gamificación (Ignorando ajustes automáticos)
        if (!data.descripcion.includes('(Auto)')) {
            let fechaSinHora = new Date(fechaDoc);
            fechaSinHora.setHours(0,0,0,0);
            let tiempo = fechaSinHora.getTime();
            
            let actualNeto = diasNetos.has(tiempo) ? diasNetos.get(tiempo) : 0;
            if(data.tipo === 'ingreso') {
                diasNetos.set(tiempo, actualNeto + data.monto);
            } else if(data.tipo === 'gasto') {
                diasNetos.set(tiempo, actualNeto - data.monto);
            }
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

    // Calcular y pintar la Racha
    calcularRacha(diasNetos);

    saldoEsperadoGlobal = saldoTotalHistorico;
    const saldoTop = document.getElementById('saldo-actual-top');
    if(saldoTop) saldoTop.innerText = `S/ ${saldoEsperadoGlobal.toFixed(2)}`;

    ingresosMesActualGlobal = ingresosMesActual;
    actualizarBarraMeta();
    actualizarDineroLibre(); 

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


function actualizarDineroLibre() {
    const elementoLibre = document.getElementById('dinero-libre');
    if (!elementoLibre) return;

    let dineroLibre = saldoEsperadoGlobal - fijosPendientesGlobal;

    if (dineroLibre > 0) {
        elementoLibre.innerText = `S/ ${dineroLibre.toFixed(2)}`;
        elementoLibre.style.color = "#29c87c"; 
    } else {
        elementoLibre.innerText = `S/ 0.00`;
        elementoLibre.style.color = "#ff3b4a"; 
    }
}

window.eliminarMovimiento = async function(id) {
    if(confirm("¿Borrar este registro? Esto recalculará tus saldos.")) {
        await deleteDoc(doc(db, "movimientos", id));
    }
};

// 4. REGISTRAR GASTOS VARIABLES E INGRESOS
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

// 5. CIERRE DE BANCO: AJUSTE AUTOMÁTICO
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
