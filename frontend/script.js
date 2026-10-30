const API_BASE = "/api";

let listaAfiliados = [];
let debounceTimer = null;

// Precios sugeridos por plan en COP
const PRECIOS_PLANES = {
  Mensual: 80000,
  Trimestral: 220000,
  Anual: 750000
};

// ==================== UTILIDADES DE RESPUESTA Y FORMATO ====================
async function parsearRespuestaJson(res, mensajeFallback = "Error en la solicitud") {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || mensajeFallback);
    }
    return data;
  } else {
    const texto = await res.text();
    if (!res.ok) {
      throw new Error(`Error del servidor (${res.status}): ${texto.length > 80 ? texto.substring(0, 80) + '...' : (texto || mensajeFallback)}`);
    }
    return { mensaje: texto };
  }
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return "N/A";
  try {
    const parteFecha = fechaStr.includes("T") ? fechaStr.split("T")[0] : fechaStr.split(" ")[0];
    const partes = parteFecha.split("-");
    if (partes.length === 3) {
      const [año, mes, dia] = partes;
      return `${dia}/${mes}/${año}`;
    }
    return new Date(fechaStr).toLocaleDateString("es-CO");
  } catch (e) {
    return fechaStr;
  }
}


// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", () => {
  verificarEstadoServidor();
  cargarAfiliados();
  cargarEstadisticasPagos();
  configurarEventos();
  configurarTabs();
  configurarControlAcceso();
  configurarFiltrosHistorial();
});

// ==================== EVENTOS Y MODALES ====================
function configurarEventos() {
  // Búsqueda en tiempo real (HU06)
  const inputBusqueda = document.getElementById("input-busqueda");
  const btnLimpiar = document.getElementById("btn-limpiar-busqueda");

  inputBusqueda.addEventListener("input", (e) => {
    const valor = e.target.value.trim();
    btnLimpiar.style.display = valor ? "block" : "none";
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      cargarAfiliados(valor);
    }, 250);
  });

  btnLimpiar.addEventListener("click", () => {
    inputBusqueda.value = "";
    btnLimpiar.style.display = "none";
    cargarAfiliados("");
  });

  // Apertura modal registro (HU04)
  document.getElementById("btn-abrir-registro").addEventListener("click", () => {
    document.getElementById("form-registro").reset();
    document.getElementById("reg-foto-preview").src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
    abrirModal("modal-registro");
  });

  // Botones cerrar modales
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cerrarModal(btn.getAttribute("data-close"));
    });
  });

  // Cerrar al dar click fuera
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });

  // Vista previa de fotos (Archivos y URLs)
  configurarUploaderFoto("reg-foto-file", "reg-foto-url", "reg-foto-preview");
  configurarUploaderFoto("edit-foto-file", "edit-foto-url", "edit-foto-preview");

  // Formulario HU04: Registro
  document.getElementById("form-registro").addEventListener("submit", manejarRegistroAfiliado);

  // Formulario HU05: Edición
  document.getElementById("form-edicion").addEventListener("submit", manejarEdicionAfiliado);

  // Formulario HU07: Asignación de Plan
  document.getElementById("form-plan").addEventListener("submit", manejarAsignacionPlan);
  document.getElementById("plan-tipo").addEventListener("change", actualizarPreviewFechasPlan);

  // Formulario HU08: Cobro y Factura
  document.getElementById("form-pago").addEventListener("submit", manejarCobroPago);
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("active");
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
}

function configurarUploaderFoto(inputId, urlId, previewId) {
  const fileInput = document.getElementById(inputId);
  const urlInput = document.getElementById(urlId);
  const previewImg = document.getElementById(previewId);

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        urlInput.value = "";
      };
      reader.readAsDataURL(file);
    }
  });

  urlInput.addEventListener("input", (e) => {
    if (e.target.value.trim()) {
      previewImg.src = e.target.value.trim();
    }
  });
}

// ==================== SERVIDOR & ESTADO ====================
async function verificarEstadoServidor() {
  const texto = document.getElementById("texto-estado");
  const contenedor = document.getElementById("estado-servidor");
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (data.estado === "OK") {
      texto.textContent = "Servidor Conectado";
      contenedor.style.borderColor = "rgba(16, 185, 129, 0.4)";
    }
  } catch (error) {
    texto.textContent = "Servidor Desconectado";
    contenedor.style.color = "#f87171";
    contenedor.style.borderColor = "rgba(239, 68, 68, 0.4)";
  }
}

// ==================== HU06: BÚSQUEDA Y LISTADO DINÁMICO ====================
async function cargarAfiliados(termino = null) {
  const contenedor = document.getElementById("contenedor-afiliados");
  try {
    const inputBusqueda = document.getElementById("input-busqueda");
    const filtro = termino !== null ? termino : (inputBusqueda ? inputBusqueda.value.trim() : "");
    const url = filtro ? `${API_BASE}/usuarios?buscar=${encodeURIComponent(filtro)}` : `${API_BASE}/usuarios`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error al obtener afiliados");
    listaAfiliados = await parsearRespuestaJson(res, "Error al obtener lista de afiliados");

    actualizarEstadisticas(listaAfiliados);
    renderizarAfiliados(listaAfiliados);
    return listaAfiliados;
  } catch (error) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error de conexión</h3>
        <p>${error.message}</p>
      </div>
    `;
    return [];
  }
}

function renderizarAfiliados(afiliados) {
  const contenedor = document.getElementById("contenedor-afiliados");

  if (!afiliados || afiliados.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No se encontraron afiliados</h3>
        <p>Intenta con otro número de cédula o nombre, o da de alta a un nuevo cliente.</p>
      </div>
    `;
    return;
  }

  contenedor.innerHTML = afiliados.map((u) => {
    const foto = u.foto_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
    const estado = u.estado_membresia || "SIN MEMBRESÍA";
    const badgeClase = estado === "ACTIVO" ? "activo" : (estado === "VENCIDO" ? "vencido" : "sin-membresia");
    const plan = u.plan_actual || "Sin plan asignado";
    const vencimiento = formatearFecha(u.fecha_fin_membresia);

    return `
      <article class="affiliate-card">
        <div>
          <div class="card-header">
            <img src="${foto}" alt="${u.nombre}" class="card-avatar" onerror="this.src='https://via.placeholder.com/150'">
            <div class="card-identity">
              <h3>${u.nombre}</h3>
              <div class="cedula-badge">🪪 CC: ${u.cedula}</div>
              <div><span class="status-badge ${badgeClase}">${estado}</span></div>
            </div>
          </div>

          <div class="card-details">
            <div class="detail-row">
              <span class="detail-label">Plan Actual:</span>
              <span class="detail-value" style="font-weight: 600; color: #60a5fa;">${plan}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vigencia hasta:</span>
              <span class="detail-value">${vencimiento}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Teléfono:</span>
              <span class="detail-value">${u.telefono}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Emergencia:</span>
              <span class="detail-value" style="font-size: 0.8rem; color: #d1d5db;">${u.contacto_emergencia || "No registrado"}</span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn btn-sm btn-action-edit" onclick="prepararEdicion(${u.id})">
            ✏️ Editar
          </button>
          <button class="btn btn-sm btn-action-plan" onclick="prepararAsignarPlan(${u.id})">
            💳 Asignar Plan
          </button>
          <button class="btn btn-sm btn-action-pay" onclick="prepararCobro(${u.id})">
            🧾 Cobrar
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function actualizarEstadisticas(afiliados) {
  document.getElementById("stat-total-afiliados").textContent = afiliados.length;
  const activas = afiliados.filter((a) => a.estado_membresia === "ACTIVO").length;
  const vencidas = afiliados.filter((a) => a.estado_membresia !== "ACTIVO").length;
  document.getElementById("stat-activas").textContent = activas;
  document.getElementById("stat-vencidas").textContent = vencidas;
}

async function cargarEstadisticasPagos() {
  try {
    const res = await fetch(`${API_BASE}/pagos`);
    if (res.ok) {
      const pagos = await res.json();
      const total = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
      document.getElementById("stat-total-pagos").textContent = `$${total.toLocaleString("es-CO")}`;
    }
  } catch (e) {
    console.warn("No se pudo cargar estadístico de pagos:", e.message);
  }
}

// ==================== HU04: REGISTRO DE AFILIADOS ====================
async function manejarRegistroAfiliado(e) {
  e.preventDefault();

  const cedula = document.getElementById("reg-cedula").value.trim();
  const nombre = document.getElementById("reg-nombre").value.trim();
  const telefono = document.getElementById("reg-telefono").value.trim();
  const contacto_emergencia = document.getElementById("reg-contacto-emergencia").value.trim();
  const foto_preview = document.getElementById("reg-foto-preview").src;

  // Validación de teléfono internacional
  const regexIntl = /^\+[1-9]\d{6,14}$/;
  if (!regexIntl.test(telefono)) {
    mostrarToast("El teléfono debe tener formato internacional (ej. +573123456789).", "error");
    return;
  }

  if (!foto_preview || foto_preview.length < 10) {
    mostrarToast("La fotografía es obligatoria.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cedula,
        nombre,
        telefono,
        contacto_emergencia,
        foto_url: foto_preview
      })
    });

    const data = await parsearRespuestaJson(res, "No se pudo registrar el afiliado.");

    cerrarModal("modal-registro");
    mostrarToast(`¡Afiliado ${nombre} registrado exitosamente!`);
    await cargarAfiliados();

    // Invitar a asignar membresía
    setTimeout(() => {
      if (confirm(`¿Deseas asignar un plan de membresía a ${nombre} ahora mismo?`)) {
        prepararAsignarPlan(data.id);
      }
    }, 400);

  } catch (error) {
    mostrarToast(error.message, "error");
  }
}

// ==================== HU05: EDICIÓN DE PERFIL ====================
async function prepararEdicion(id) {
  const usuario = listaAfiliados.find((u) => u.id === id);
  if (!usuario) return;

  document.getElementById("edit-id").value = usuario.id;
  document.getElementById("edit-cedula").value = usuario.cedula;
  document.getElementById("edit-nombre").value = usuario.nombre;
  document.getElementById("edit-telefono").value = usuario.telefono;
  document.getElementById("edit-contacto-emergencia").value = usuario.contacto_emergencia || "";
  
  const fotoSrc = usuario.foto_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
  document.getElementById("edit-foto-preview").src = fotoSrc;
  document.getElementById("edit-foto-url").value = usuario.foto_url && !usuario.foto_url.startsWith("data:") ? usuario.foto_url : "";
  document.getElementById("edit-foto-file").value = "";

  abrirModal("modal-edicion");
}

async function manejarEdicionAfiliado(e) {
  e.preventDefault();

  const id = document.getElementById("edit-id").value;
  const nombre = document.getElementById("edit-nombre").value.trim();
  const telefono = document.getElementById("edit-telefono").value.trim();
  const contacto_emergencia = document.getElementById("edit-contacto-emergencia").value.trim();
  const foto_url = document.getElementById("edit-foto-preview").src;

  const regexIntl = /^\+[1-9]\d{6,14}$/;
  if (!regexIntl.test(telefono)) {
    mostrarToast("El teléfono debe tener formato internacional (ej. +573123456789).", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        telefono,
        contacto_emergencia,
        foto_url
      })
    });

    const data = await parsearRespuestaJson(res, "Error al actualizar perfil.");

    cerrarModal("modal-edicion");
    mostrarToast(data.mensaje || "Perfil actualizado exitosamente.");
    await cargarAfiliados();
  } catch (error) {
    mostrarToast(error.message, "error");
  }
}

// ==================== HU07: ASIGNACIÓN DE PLANES ====================
function prepararAsignarPlan(id) {
  const usuario = listaAfiliados.find((u) => u.id === id);
  if (!usuario) return;

  document.getElementById("plan-id-usuario").value = usuario.id;
  document.getElementById("plan-nombre-usuario").value = `${usuario.nombre} (CC: ${usuario.cedula})`;
  document.getElementById("plan-tipo").value = "Mensual";
  actualizarPreviewFechasPlan();

  abrirModal("modal-plan");
}

function actualizarPreviewFechasPlan() {
  const tipo = document.getElementById("plan-tipo").value;
  const hoy = new Date();
  const fin = new Date(hoy);

  if (tipo === "Mensual") fin.setMonth(fin.getMonth() + 1);
  if (tipo === "Trimestral") fin.setMonth(fin.getMonth() + 3);
  if (tipo === "Anual") fin.setFullYear(fin.getFullYear() + 1);

  document.getElementById("preview-fecha-inicio").textContent = hoy.toLocaleDateString("es-CO");
  document.getElementById("preview-fecha-fin").textContent = fin.toLocaleDateString("es-CO");
}

async function manejarAsignacionPlan(e) {
  e.preventDefault();

  const id_usuario = parseInt(document.getElementById("plan-id-usuario").value);
  const tipo_plan = document.getElementById("plan-tipo").value;

  try {
    const res = await fetch(`${API_BASE}/membresias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_usuario, tipo_plan })
    });

    const data = await parsearRespuestaJson(res, "Error al asignar membresía.");

    cerrarModal("modal-plan");
    mostrarToast(data.mensaje || `Plan ${tipo_plan} activado correctamente.`);
    
    // Recargar inmediatamente los afiliados para reflejar el plan asignado en el dashboard
    await cargarAfiliados();

    // Abrir automáticamente el modal de cobro (HU08) con los datos del plan recién asignado
    setTimeout(() => {
      prepararCobro(id_usuario, data.id, tipo_plan);
    }, 300);

  } catch (error) {
    mostrarToast(error.message, "error");
  }
}

// ==================== HU08: COBRO Y COMPROBANTE DIGITAL ====================
function prepararCobro(idUsuario, idMembresia = null, tipoPlan = null) {
  const usuario = listaAfiliados.find((u) => u.id === idUsuario);
  if (!usuario) return;

  const plan = tipoPlan || usuario.plan_actual || "Mensual";
  const idMem = idMembresia || usuario.id_membresia || null;

  document.getElementById("pago-id-usuario").value = usuario.id;
  document.getElementById("pago-id-membresia").value = idMem || "";
  document.getElementById("pago-nombre-usuario").value = `${usuario.nombre} (CC: ${usuario.cedula})`;
  document.getElementById("pago-plan-usuario").value = plan;
  // Sin validación de rango forzada: sugiere el valor base o permite libre ingreso según administración
  document.getElementById("pago-monto").value = PRECIOS_PLANES[plan] !== undefined ? PRECIOS_PLANES[plan] : "";
  document.getElementById("pago-metodo").value = "Efectivo";

  abrirModal("modal-pago");
}

async function manejarCobroPago(e) {
  e.preventDefault();

  const id_usuario = parseInt(document.getElementById("pago-id-usuario").value);
  const id_membresia = document.getElementById("pago-id-membresia").value ? parseInt(document.getElementById("pago-id-membresia").value) : null;
  const monto = parseFloat(document.getElementById("pago-monto").value);
  const metodo_pago = document.getElementById("pago-metodo").value;

  if (isNaN(monto) || monto < 0) {
    mostrarToast("Por favor ingrese un monto válido indicado por administración.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/pagos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_usuario, id_membresia, monto, metodo_pago })
    });

    const data = await parsearRespuestaJson(res, "Error al procesar el pago.");

    cerrarModal("modal-pago");
    mostrarToast("¡Pago procesado con éxito! Generando comprobante digital...");
    
    // Actualizar simultáneamente estadísticas de pagos y lista de afiliados
    await Promise.all([cargarEstadisticasPagos(), cargarAfiliados()]);

    // Mostrar Comprobante Digital (HU08)
    mostrarComprobanteDigital(data.comprobante);

  } catch (error) {
    mostrarToast(error.message, "error");
  }
}

function mostrarComprobanteDigital(comprobante) {
  if (!comprobante) return;

  const fechaFormateada = new Date(comprobante.fecha_pago || Date.now()).toLocaleString("es-CO", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  const montoFormat = `$${parseFloat(comprobante.monto).toLocaleString("es-CO")} COP`;

  document.getElementById("recibo-numero").textContent = comprobante.numero_comprobante || `FZP-REC-${comprobante.id}`;
  document.getElementById("recibo-fecha").textContent = fechaFormateada;
  document.getElementById("recibo-metodo").textContent = comprobante.metodo_pago;
  document.getElementById("recibo-cliente").textContent = comprobante.usuario_nombre;
  document.getElementById("recibo-cedula").textContent = comprobante.usuario_cedula;
  document.getElementById("recibo-concepto").textContent = `Membresía ${comprobante.tipo_plan || "Plan FitZone"}`;
  document.getElementById("recibo-subtotal").textContent = montoFormat;
  document.getElementById("recibo-total").textContent = montoFormat;

  abrirModal("modal-comprobante");
}

// ==================== TOAST NOTIFICATIONS ====================
function mostrarToast(mensaje, tipo = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <span>${tipo === "success" ? "✅" : "⚠️"}</span>
    <span>${mensaje}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==================== TAB NAVIGATION ====================
function configurarTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${tab}`).classList.add("active");
      if (tab === "acceso") {
        cargarEstadisticasAcceso();
      }
    });
  });
}

// ==================== HU09: VALIDADOR DE ACCESO INSTANTÁNEO ====================
let accesoActual = null; // Afiliado actualmente validado
let contadorConsultas = 0;
let contadorDenegados = 0;

async function cargarEstadisticasAcceso() {
  try {
    const res = await fetch(`${API_BASE}/asistencias/historial?fechaInicio=${hoyISO()}&fechaFin=${hoyISO()}`);
    if (res.ok) {
      const rows = await res.json();
      document.getElementById("stat-ingresos-hoy").textContent = rows.length;
      if (rows.length > 0) {
        const ultimo = rows[0];
        const dt = new Date(ultimo.fecha_ingreso);
        document.getElementById("stat-ultimo-ingreso").textContent =
          dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
      } else {
        document.getElementById("stat-ultimo-ingreso").textContent = "—";
      }
    }
  } catch (e) {
    console.warn("Error cargando stats de acceso:", e.message);
  }
  document.getElementById("stat-consultas").textContent = contadorConsultas;
  document.getElementById("stat-denegados").textContent = contadorDenegados;
}

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

function configurarControlAcceso() {
  const input = document.getElementById("acceso-cedula-input");
  const btnValidar = document.getElementById("btn-validar-acceso");
  const btnRegistrar = document.getElementById("btn-registrar-ingreso");
  const btnVerificar = document.getElementById("btn-verificar-facial");

  // Validar con Enter
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") validarAcceso();
  });

  btnValidar.addEventListener("click", validarAcceso);
  btnRegistrar.addEventListener("click", registrarIngreso);
  btnVerificar.addEventListener("click", abrirCamara);

  // Cámara
  document.getElementById("btn-capturar-foto").addEventListener("click", capturarFoto);
  document.getElementById("btn-cerrar-camara").addEventListener("click", cerrarCamara);
}

async function validarAcceso() {
  const cedula = document.getElementById("acceso-cedula-input").value.trim();
  if (!cedula) {
    mostrarToast("Por favor ingrese un número de cédula.", "error");
    return;
  }

  contadorConsultas++;
  document.getElementById("stat-consultas").textContent = contadorConsultas;

  const inicio = performance.now();
  try {
    const res = await fetch(`${API_BASE}/asistencias/validar/${encodeURIComponent(cedula)}`);
    const duracion = performance.now() - inicio;
    console.log(`[RNF-01] Respuesta en ${duracion.toFixed(0)}ms`);

    if (res.status === 404) {
      mostrarResultadoAcceso(null, cedula);
      contadorDenegados++;
      document.getElementById("stat-denegados").textContent = contadorDenegados;
      return;
    }

    const usuario = await res.json();
    if (!res.ok) throw new Error(usuario.error);
    accesoActual = usuario;
    mostrarResultadoAcceso(usuario);

    // Si el acceso está denegado, incrementar contador
    if (usuario.estado_membresia !== "ACTIVO") {
      contadorDenegados++;
      document.getElementById("stat-denegados").textContent = contadorDenegados;
    }

  } catch (err) {
    mostrarToast(`Error al validar: ${err.message}`, "error");
  }
}

function mostrarResultadoAcceso(usuario, cedulaNoEncontrada = null) {
  const resultBox = document.getElementById("acceso-resultado");
  const indicator = document.getElementById("acceso-status-indicator");
  const icon = document.getElementById("acceso-status-icon");
  const label = document.getElementById("acceso-status-label");
  const affiliateInfo = document.getElementById("acceso-affiliate-info");
  const actionZone = document.getElementById("acceso-action-zone");
  const alertaFoto = document.getElementById("acceso-alerta-foto");
  const quickHistory = document.getElementById("quick-history");

  // Mostrar el contenedor
  resultBox.classList.remove("hidden");
  quickHistory.style.display = "none";
  document.getElementById("photo-comparison").style.display = "none";

  if (!usuario) {
    // Afiliado no encontrado
    indicator.className = "access-status-indicator denegado";
    icon.textContent = "🚫";
    label.textContent = "NO ENCONTRADO";
    affiliateInfo.style.display = "none";
    actionZone.style.display = "none";
    alertaFoto.classList.add("hidden");
    mostrarToast(`No se encontró ningún afiliado con cédula ${cedulaNoEncontrada}.`, "error");
    return;
  }

  const estado = usuario.estado_membresia || "SIN MEMBRESÍA";
  const esPermitido = estado === "ACTIVO";
  const esSinMembresia = estado === "SIN MEMBRESÍA";

  // Indicator
  if (esPermitido) {
    indicator.className = "access-status-indicator permitido";
    icon.textContent = "✅";
    label.textContent = "ACTIVO — ACCESO PERMITIDO";
  } else if (esSinMembresia) {
    indicator.className = "access-status-indicator sin-membresia";
    icon.textContent = "🔒";
    label.textContent = "SIN MEMBRESÍA";
  } else {
    indicator.className = "access-status-indicator denegado";
    icon.textContent = "❌";
    label.textContent = "VENCIDO — ACCESO DENEGADO";
  }

  // Datos del afiliado (HU10)
  affiliateInfo.style.display = "flex";
  actionZone.style.display = esPermitido ? "flex" : "none";

  document.getElementById("acceso-nombre").textContent = usuario.nombre;
  document.getElementById("acceso-cedula-display").textContent = `CC: ${usuario.cedula}`;
  document.getElementById("acceso-plan").textContent = usuario.plan_actual || "Sin plan";
  document.getElementById("acceso-vigencia").textContent = formatearFecha(usuario.fecha_fin_membresia) || "N/A";
  document.getElementById("acceso-tel").textContent = usuario.telefono || "—";

  // Foto (HU10)
  const fotoEl = document.getElementById("acceso-foto-perfil");
  const compareFoto = document.getElementById("compare-perfil");

  if (usuario.foto_url) {
    fotoEl.src = usuario.foto_url;
    fotoEl.onerror = () => { fotoEl.src = "https://via.placeholder.com/90x90?text=Sin+foto"; };
    compareFoto.src = usuario.foto_url;
    alertaFoto.classList.add("hidden");
  } else {
    fotoEl.src = "https://via.placeholder.com/90x90?text=Sin+foto";
    compareFoto.src = "";
    alertaFoto.classList.remove("hidden"); // HU10: alerta sin foto
  }

  // Cargar historial rápido
  cargarHistorialRapido(usuario.id);
}

async function cargarHistorialRapido(idUsuario) {
  try {
    const res = await fetch(`${API_BASE}/asistencias/historial?termino=&fechaInicio=&fechaFin=`);
    // Filtramos client-side para mostrar solo los últimos 5 del usuario
    const all = await res.json();
    const del_usuario = all.filter(r => r.id_usuario === idUsuario).slice(0, 5);

    const quickHistory = document.getElementById("quick-history");
    const list = document.getElementById("quick-history-list");

    if (del_usuario.length > 0) {
      quickHistory.style.display = "block";
      list.innerHTML = del_usuario.map(r => {
        const dt = new Date(r.fecha_ingreso);
        const fechaStr = dt.toLocaleDateString("es-CO") + " " + dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
        return `<div class="quick-history-item">
          <span class="qh-date">${fechaStr}</span>
          <span class="qh-badge">${r.estado_ingreso}</span>
        </div>`;
      }).join("");
    }
  } catch (e) {
    console.warn("Error cargando historial rápido:", e.message);
  }
}

// HU11: Registrar ingreso con timestamp automático
async function registrarIngreso() {
  if (!accesoActual) return;

  try {
    const res = await fetch(`${API_BASE}/asistencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_usuario: accesoActual.id })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    mostrarToast(`✅ Ingreso registrado: ${accesoActual.nombre} — ${new Date().toLocaleTimeString("es-CO")}`);

    // Actualizar stats
    cargarEstadisticasAcceso();

    // Limpiar formulario para el siguiente cliente
    setTimeout(() => {
      document.getElementById("acceso-cedula-input").value = "";
      document.getElementById("acceso-resultado").classList.add("hidden");
      document.getElementById("photo-comparison").style.display = "none";
      document.getElementById("quick-history").style.display = "none";
      cerrarCamara();
      accesoActual = null;
      document.getElementById("acceso-cedula-input").focus();
    }, 2500);

  } catch (err) {
    mostrarToast(`Error al registrar ingreso: ${err.message}`, "error");
  }
}

// ==================== HU10: VERIFICACIÓN FACIAL POR CÁMARA ====================
let streamActivo = null;

async function abrirCamara() {
  const video = document.getElementById("camera-video");
  const placeholder = document.getElementById("camera-placeholder");
  const controls = document.getElementById("camera-controls");

  try {
    streamActivo = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
    });
    video.srcObject = streamActivo;
    video.classList.remove("hidden");
    placeholder.style.display = "none";
    controls.style.display = "flex";
    document.getElementById("photo-comparison").style.display = "none";
  } catch (err) {
    mostrarToast(`No se pudo acceder a la cámara: ${err.message}`, "error");
    console.error("Error cámara:", err);
  }
}

function capturarFoto() {
  const video = document.getElementById("camera-video");
  const canvas = document.getElementById("camera-canvas");
  const compareCaptura = document.getElementById("compare-captura");
  const comparison = document.getElementById("photo-comparison");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  compareCaptura.src = dataUrl;

  // Mostrar comparación lado a lado
  comparison.style.display = "flex";

  // Cerrar cámara después de capturar
  cerrarCamara();

  mostrarToast("📸 Captura realizada. Compare manualmente las fotos.");
}

function cerrarCamara() {
  const video = document.getElementById("camera-video");
  const placeholder = document.getElementById("camera-placeholder");
  const controls = document.getElementById("camera-controls");

  if (streamActivo) {
    streamActivo.getTracks().forEach(t => t.stop());
    streamActivo = null;
  }

  video.srcObject = null;
  video.classList.add("hidden");
  placeholder.style.display = "";
  controls.style.display = "none";
}

// ==================== HU12: HISTORIAL DE ASISTENCIAS ====================
async function buscarHistorial() {
  const termino = document.getElementById("hist-buscar").value.trim();
  const fechaInicio = document.getElementById("hist-fecha-inicio").value;
  const fechaFin = document.getElementById("hist-fecha-fin").value;

  const params = new URLSearchParams();
  if (termino) params.set("termino", termino);
  if (fechaInicio) params.set("fechaInicio", fechaInicio);
  if (fechaFin) params.set("fechaFin", fechaFin);

  try {
    const res = await fetch(`${API_BASE}/asistencias/historial?${params.toString()}`);
    if (!res.ok) throw new Error("Error al obtener historial");
    const rows = await res.json();
    renderizarHistorial(rows);
  } catch (err) {
    mostrarToast(`Error al buscar historial: ${err.message}`, "error");
  }
}

function renderizarHistorial(rows) {
  const tbody = document.getElementById("historial-tbody");
  const countEl = document.getElementById("historial-count");

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No se encontraron asistencias con los filtros aplicados.</td></tr>`;
    countEl.style.display = "none";
    return;
  }

  tbody.innerHTML = rows.map((r, i) => {
    const dt = new Date(r.fecha_ingreso);
    const fechaStr = dt.toLocaleDateString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit"
    });
    const horaStr = dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    return `
      <tr>
        <td style="color: var(--text-muted);">${i + 1}</td>
        <td>
          <div style="font-weight:600;">${fechaStr}</div>
          <div style="font-size:0.78rem; color: var(--text-muted);">${horaStr}</div>
        </td>
        <td style="font-weight:600;">${r.nombre}</td>
        <td style="font-family:monospace; color:#a5b4fc;">${r.cedula}</td>
        <td><span class="table-badge-permitido">${r.estado_ingreso}</span></td>
      </tr>
    `;
  }).join("");

  countEl.style.display = "block";
  countEl.textContent = `Se encontraron ${rows.length} registro(s).`;
}

function configurarFiltrosHistorial() {
  document.getElementById("btn-buscar-historial").addEventListener("click", buscarHistorial);
  document.getElementById("hist-buscar").addEventListener("keydown", (e) => {
    if (e.key === "Enter") buscarHistorial();
  });

  // Presets de fechas
  document.getElementById("btn-filtro-hoy").addEventListener("click", () => {
    const hoy = hoyISO();
    document.getElementById("hist-fecha-inicio").value = hoy;
    document.getElementById("hist-fecha-fin").value = hoy;
    buscarHistorial();
  });

  document.getElementById("btn-filtro-semana").addEventListener("click", () => {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    document.getElementById("hist-fecha-inicio").value = lunes.toISOString().split("T")[0];
    document.getElementById("hist-fecha-fin").value = hoy.toISOString().split("T")[0];
    buscarHistorial();
  });

  document.getElementById("btn-filtro-mes").addEventListener("click", () => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split("T")[0];
    document.getElementById("hist-fecha-inicio").value = inicio;
    document.getElementById("hist-fecha-fin").value = hoyISO();
    buscarHistorial();
  });

  document.getElementById("btn-filtro-mes-ant").addEventListener("click", () => {
    const hoy = new Date();
    const primerDiaMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDiaMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    document.getElementById("hist-fecha-inicio").value = primerDiaMesAnt.toISOString().split("T")[0];
    document.getElementById("hist-fecha-fin").value = ultimoDiaMesAnt.toISOString().split("T")[0];
    buscarHistorial();
  });

  // Exportar CSV
  document.getElementById("btn-exportar-historial").addEventListener("click", exportarCSV);
}

function exportarCSV() {
  const rows = document.querySelectorAll("#historial-tbody tr");
  if (rows.length === 0 || rows[0].querySelector(".table-empty")) {
    mostrarToast("No hay datos para exportar. Realice una búsqueda primero.", "error");
    return;
  }

  const encabezados = ["#", "Fecha", "Hora", "Afiliado", "Cédula", "Estado"];
  const lineas = [encabezados.join(",")];

  rows.forEach((tr, i) => {
    const celdas = tr.querySelectorAll("td");
    if (celdas.length < 5) return;
    const num = celdas[0].textContent.trim();
    const fecha = celdas[1].children[0]?.textContent.trim() || "";
    const hora = celdas[1].children[1]?.textContent.trim() || "";
    const nombre = `"${celdas[2].textContent.trim()}"`;
    const cedula = celdas[3].textContent.trim();
    const estado = celdas[4].textContent.trim();
    lineas.push([num, fecha, hora, nombre, cedula, estado].join(","));
  });

  const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `asistencias_${hoyISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  mostrarToast("📤 CSV exportado exitosamente.");
}
