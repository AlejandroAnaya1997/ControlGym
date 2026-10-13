const API_BASE = "http://localhost:3000";

let listaAfiliados = [];
let debounceTimer = null;

// Precios sugeridos por plan en COP
const PRECIOS_PLANES = {
  Mensual: 80000,
  Trimestral: 220000,
  Anual: 750000
};

// ==================== INICIALIZACIÓN ====================
document.addEventListener("DOMContentLoaded", () => {
  verificarEstadoServidor();
  cargarAfiliados();
  cargarEstadisticasPagos();
  configurarEventos();
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
async function cargarAfiliados(termino = "") {
  const contenedor = document.getElementById("contenedor-afiliados");
  try {
    const url = termino ? `${API_BASE}/usuarios?buscar=${encodeURIComponent(termino)}` : `${API_BASE}/usuarios`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error al obtener afiliados");
    listaAfiliados = await res.json();

    actualizarEstadisticas(listaAfiliados);
    renderizarAfiliados(listaAfiliados);
  } catch (error) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error de conexión</h3>
        <p>${error.message}</p>
      </div>
    `;
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
    const vencimiento = u.fecha_fin_membresia ? new Date(u.fecha_fin_membresia).toLocaleDateString("es-CO") : "N/A";

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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "No se pudo registrar el afiliado.");
    }

    cerrarModal("modal-registro");
    mostrarToast(`¡Afiliado ${nombre} registrado exitosamente!`);
    cargarAfiliados();

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

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al actualizar perfil.");

    cerrarModal("modal-edicion");
    mostrarToast(data.mensaje || "Perfil actualizado exitosamente.");
    cargarAfiliados();
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

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al asignar membresía.");

    cerrarModal("modal-plan");
    mostrarToast(data.mensaje || `Plan ${tipo_plan} activado correctamente.`);
    cargarAfiliados();

    // Abrir automáticamente el modal de cobro (HU08)
    setTimeout(() => {
      prepararCobro(id_usuario, data.id, tipo_plan);
    }, 400);

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
  document.getElementById("pago-monto").value = PRECIOS_PLANES[plan] || 80000;
  document.getElementById("pago-metodo").value = "Efectivo";

  abrirModal("modal-pago");
}

async function manejarCobroPago(e) {
  e.preventDefault();

  const id_usuario = parseInt(document.getElementById("pago-id-usuario").value);
  const id_membresia = document.getElementById("pago-id-membresia").value ? parseInt(document.getElementById("pago-id-membresia").value) : null;
  const monto = parseFloat(document.getElementById("pago-monto").value);
  const metodo_pago = document.getElementById("pago-metodo").value;

  try {
    const res = await fetch(`${API_BASE}/pagos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_usuario, id_membresia, monto, metodo_pago })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al procesar el pago.");

    cerrarModal("modal-pago");
    mostrarToast("¡Pago procesado con éxito! Generando comprobante digital...");
    cargarEstadisticasPagos();

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