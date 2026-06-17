import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// 1. ESCUCHAR MOVIMIENTOS Y CALCULAR META MENSUAL
const qMovimientos = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
onSnapshot(qMovimientos, (querySnapshot) => {
    let ingresosMes = 0;
    let gastosMes = 0;
    let inversionesMes = 0;
    
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    
    const listaHistorial = document.getElementById('lista-historial');
    listaHistorial.innerHTML = '';

    querySnapshot.forEach((documento) => {
        const data = documento.data();
        const fechaDoc = data.fecha.toDate();
        
        // Calcular totales solo si es del mes actual
        if(fechaDoc.getMonth() === mesActual && fechaDoc.getFullYear() === anioActual) {
            if (data.tipo === 'ingreso') ingresosMes += data.monto;
            if (data.tipo === 'gasto') gastosMes += data.monto;
            if (data.tipo === 'inversion') inversionesMes += data.monto;
            
            // Dibujar historial
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

    // Actualizar Panel de Meta Mensual
    const gananciaNeta = ingresosMes - gastosMes;
    document.getElementById('mes-ingresos').innerText = ingresosMes.toFixed(2);
    document.getElementById('mes-gastos').innerText = gastosMes.toFixed(2);
    document.getElementById('mes-inversiones').innerText = inversionesMes.toFixed(2);
    document.getElementById('ganancia-mensual').innerText = `S/ ${gananciaNeta.toFixed(2)}`;
    
    // Calcular porcentaje de la meta de 1000 soles
    let porcentajeMeta = (gananciaNeta / 1000) * 100;
    if (porcentajeMeta < 0) porcentajeMeta = 0;
    if (porcentajeMeta > 100) porcentajeMeta = 100;
    document.getElementById('barra-meta').style.width = `${porcentajeMeta}%`;
});

// Función Global para eliminar movimiento del historial
window.eliminarMovimiento = async function(id) {
    if(confirm("¿Borrar este registro del historial?")) {
        await deleteDoc(doc(db, "movimientos", id));
    }
};

// 2. GUARDAR MOVIMIENTO NUEVO (Con descripción libre)
document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo-movimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const descripcion = document.getElementById('descripcion').value; // Ahora es texto libre

    try {
        await addDoc(collection(db, "movimientos"), {
            tipo, monto, descripcion, fecha: new Date()
        });
        document.getElementById('form-movimiento').reset();
    } catch (error) {
        console.error("Error: ", error);
    }
});

// 3. GUARDAR Y LEER EL SALDO DEL BANCO (CIERRE DE DÍA)
const docSaldo = doc(db, "configuracion", "saldo_real");

onSnapshot(docSaldo, (doc) => {
    if (doc.exists()) {
        document.getElementById('mostrar-saldo-real').innerText = `S/ ${doc.data().monto.toFixed(2)}`;
    }
});

document.getElementById('btn-actualizar-saldo').addEventListener('click', async () => {
    const nuevoSaldo = parseFloat(document.getElementById('saldo-real').value);
    if(isNaN(nuevoSaldo)) return alert("Ingresa un monto válido");
    
    try {
        await setDoc(docSaldo, { monto: nuevoSaldo, ultima_actualizacion: new Date() });
        document.getElementById('saldo-real').value = '';
    } catch (error) {
        console.error("Error al actualizar saldo: ", error);
    }
});

// 4. GASTOS FIJOS (Igual que antes pero adaptado a tu estilo)
const qFijos = query(collection(db, "gastos_fijos"), orderBy("dia", "asc"));
onSnapshot(qFijos, (querySnapshot) => {
    const listaFijos = document.getElementById('lista-fijos');
    listaFijos.innerHTML = '';
    querySnapshot.forEach((documento) => {
        const data = documento.data();
        listaFijos.innerHTML += `
            <li style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05);">
                <div><strong>${data.nombre}</strong> <br><span style="font-size: 0.8rem;">Día ${data.dia}</span></div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <strong>S/ ${data.monto.toFixed(2)}</strong>
                    <button onclick="eliminarFijo('${documento.id}')" style="background: none; border: none; color: #ff3b4a; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </li>
        `;
    });
});

window.eliminarFijo = async function(id) {
    if(confirm("¿Eliminar este gasto fijo?")) await deleteDoc(doc(db, "gastos_fijos", id));
};

document.getElementById('form-gasto-fijo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-fijo').value;
    const monto = parseFloat(document.getElementById('monto-fijo').value);
    const dia = parseInt(document.getElementById('dia-fijo').value);
    try {
        await addDoc(collection(db, "gastos_fijos"), { nombre, monto, dia });
        document.getElementById('form-gasto-fijo').reset();
    } catch (error) {
        console.error(error);
    }
});
