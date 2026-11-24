const cargar = (clave, defecto) => {
    try {
        return JSON.parse(localStorage.getItem(clave)) ?? defecto;
    } catch {
        return defecto;
    }
};

let empleos = cargar("ce_empleos", [
    {
        id: 1,
        empresa: "Tecnología del Norte",
        puesto: "Desarrollador Web",
        categoria: "Tecnología",
        tipo: "Tiempo completo",
        ubicacion: "Monterrey, NL",
        salario: "$15,000 mensuales",
        descripcion: "Buscamos una persona con conocimientos de HTML, CSS y JavaScript para desarrollar aplicaciones web.",
        correo: "contacto@empresa.com",
        calificaciones: [5, 4, 5],
        fecha: Date.now(),
        webEmpresa: "",
        descripcionEmpresa: "Empresa dedicada a soluciones y servicios tecnológicos.",
        propietario: "demo@empresa.com"
    },
    {
        id: 2,
        empresa: "Comercial Express",
        puesto: "Auxiliar Administrativo",
        categoria: "Administración",
        tipo: "Medio tiempo",
        ubicacion: "García, NL",
        salario: "$10,000 mensuales",
        descripcion: "Apoyo en actividades administrativas, organización de documentos y atención a clientes.",
        correo: "rh@empresa.com",
        calificaciones: [4, 5],
        fecha: Date.now() - 1000,
        webEmpresa: "",
        descripcionEmpresa: "Empresa de servicios comerciales.",
        propietario: "demo2@empresa.com"
    },
    {
        id: 3,
        empresa: "Diseño Creativo",
        puesto: "Diseñador Gráfico",
        categoria: "Diseño",
        tipo: "Remoto",
        ubicacion: "México",
        salario: "$13,000 mensuales",
        descripcion: "Creación de contenido digital, diseños para redes sociales y materiales publicitarios.",
        correo: "empleos@diseno.com",
        calificaciones: [5],
        fecha: Date.now() - 2000,
        webEmpresa: "",
        descripcionEmpresa: "Estudio creativo especializado en comunicación visual.",
        propietario: "demo3@empresa.com"
    }
]);

let solicitudes = cargar("ce_solicitudes", []);
let favoritosPorCuenta = cargar("ce_favoritos", {});
if (Array.isArray(favoritosPorCuenta)) favoritosPorCuenta = {};
let favoritos = [];
let cuentas = cargar("ce_cuentas", []);
let sesion = cargar("ce_sesion", null);
let categoriaActual = "Todas";
let soloFavoritos = false;
let temporizadorNotificacion;
let modoAcceso = "login";

empleos.forEach(e => {
    if (!Array.isArray(e.calificaciones)) e.calificaciones = [];
});

function cargarFavoritos() {
    favoritos = sesion ? (favoritosPorCuenta[sesion.email] || []) : [];
}

function guardarDatos() {
    localStorage.setItem("ce_empleos", JSON.stringify(empleos));
    localStorage.setItem("ce_solicitudes", JSON.stringify(solicitudes));
    if (sesion) favoritosPorCuenta[sesion.email] = favoritos;
    localStorage.setItem("ce_favoritos", JSON.stringify(favoritosPorCuenta));
    localStorage.setItem("ce_cuentas", JSON.stringify(cuentas));
    localStorage.setItem("ce_sesion", JSON.stringify(sesion));
}

function notificar(mensaje) {
    const aviso = document.getElementById("notificacion");
    aviso.textContent = mensaje;
    aviso.style.display = "block";

    clearTimeout(temporizadorNotificacion);

    temporizadorNotificacion = setTimeout(() => {
        aviso.style.display = "none";
    }, 3200);
}

function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

function normalizarTexto(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function urlSegura(url) {
    try {
        const u = new URL(url);

        return ["http:", "https:"].includes(u.protocol)
            ? u.href
            : "";
    } catch {
        return "";
    }
}

function cuentaActual() {
    return sesion
        ? cuentas.find(c => c.email === sesion.email && c.rol === sesion.rol)
        : null;
}

function esEmpresa() {
    return sesion?.rol === "empresa";
}

function esCandidato() {
    return sesion?.rol === "candidato";
}

function actualizarSesion() {
    const btn = document.getElementById("btnSesion");
    const estado = document.getElementById("estadoSesion");
    const etiqueta = document.querySelector(".hero .etiqueta");
    const cuenta = cuentaActual();

    if (sesion && !cuenta) {
        sesion = null;
        guardarDatos();
    }

    document.body.classList.toggle("sin-sesion", !cuenta);
    document.body.classList.toggle("rol-candidato", cuenta?.rol === "candidato");
    document.body.classList.toggle("rol-empresa", cuenta?.rol === "empresa");

    if (cuenta) {
        btn.textContent = "Cerrar sesión";
        btn.onclick = cerrarSesion;

        estado.hidden = false;
        estado.textContent = `${cuenta.nombre} · ${cuenta.rol === "empresa" ? "Empresa" : "Candidato"}`;

        etiqueta.textContent = cuenta.rol === "empresa"
            ? "ENCUENTRA EL TALENTO QUE NECESITAS"
            : "TU FUTURO COMIENZA AQUÍ";
    } else {
        btn.textContent = "Iniciar sesión";
        btn.onclick = abrirAcceso;

        estado.hidden = true;
    }
}

function obtenerCalificacion(empleo) {
    if (!empleo.calificaciones?.length) {
        return "Sin evaluar";
    }

    return (
        empleo.calificaciones.reduce((a, b) => a + b, 0) /
        empleo.calificaciones.length
    ).toFixed(1);
}

function actualizarEstadisticas() {
    document.getElementById("totalEmpleos").textContent = empleos.length;

    document.getElementById("totalEmpresas").textContent =
        new Set(empleos.map(e => e.empresa.toLowerCase())).size;

    document.getElementById("totalSolicitudes").textContent = solicitudes.length;
}

function mostrarEmpleos(lista = empleos) {
    const contenedor = document.getElementById("listaEmpleos");

    contenedor.innerHTML = "";

    if (!lista.length) {
        contenedor.innerHTML =
            '<div class="sin-resultados">No se encontraron ofertas de trabajo.</div>';

        actualizarEstadisticas();
        return;
    }

    lista.forEach(empleo => {
        const guardado = favoritos.includes(empleo.id);
        const web = urlSegura(empleo.webEmpresa);

        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta";

        tarjeta.innerHTML = `
            <h3>${escapar(empleo.puesto)}</h3>

            <p><strong>Empresa:</strong> ${escapar(empleo.empresa)}</p>

            <span class="categoria">
                ${escapar(empleo.categoria)}
            </span>

            <p>📍 ${escapar(empleo.ubicacion)}</p>
            <p>💼 ${escapar(empleo.tipo)}</p>
            <p>💰 ${escapar(empleo.salario || "Salario no indicado")}</p>

            <p class="evaluacion">
                ⭐ ${obtenerCalificacion(empleo)}
                (${empleo.calificaciones.length} evaluaciones)
            </p>

            ${web ? `
                <a class="enlace-empresa"
                   href="${escapar(web)}"
                   target="_blank"
                   rel="noopener noreferrer">
                   Visitar sitio oficial ↗
                </a>
            ` : ""}

            <div class="acciones">
                <button onclick="verDetalles(${empleo.id})">
                    Ver detalles
                </button>

                <button class="favorito solo-candidato ${guardado ? "guardado" : ""}"
                    onclick="alternarFavorito(${empleo.id})">
                    ${guardado ? "♥ Guardado" : "♡ Favorito"}
                </button>

                <button class="solo-candidato" onclick="abrirSolicitud(${empleo.id})">
                    Postularme
                </button>
            </div>
        `;

        contenedor.appendChild(tarjeta);
    });

    actualizarEstadisticas();
}

function buscarEmpleo() {
    soloFavoritos = false;
    aplicarFiltros();

    document.getElementById("tituloOfertas").textContent =
        "Resultados de búsqueda";

    document.getElementById("ofertas").scrollIntoView({
        behavior: "smooth"
    });
}

document.getElementById("buscar").addEventListener("input", () => {
    soloFavoritos = false;
    aplicarFiltros();

    document.getElementById("tituloOfertas").textContent =
        document.getElementById("buscar").value.trim()
            ? "Resultados de búsqueda"
            : "Empleos disponibles";
});

document.getElementById("buscar").addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        buscarEmpleo();
    }
});

function filtrarCategoria(categoria) {
    categoriaActual = categoria;
    soloFavoritos = false;

    document.getElementById("buscar").value = "";

    document.getElementById("tituloOfertas").textContent =
        categoria === "Todas" ? "Empleos disponibles" : categoria;

    document.querySelectorAll(".categorias button").forEach(b => {
        b.classList.toggle("activa", b.textContent.trim() === categoria);
    });

    aplicarFiltros();
}

function aplicarFiltros() {
    const texto = normalizarTexto(
        document.getElementById("buscar").value
    );

    let resultados = empleos.filter(e => {
        const info = normalizarTexto([
            e.puesto,
            e.empresa,
            e.categoria,
            e.ubicacion,
            e.descripcion,
            e.tipo,
            e.salario
        ].join(" "));

        return info.includes(texto) &&
            (categoriaActual === "Todas" || e.categoria === categoriaActual) &&
            (!soloFavoritos || favoritos.includes(e.id));
    });

    const orden = document.getElementById("ordenar").value;

    if (orden === "recientes") {
        resultados.sort((a, b) => b.fecha - a.fecha);
    }

    if (orden === "calificacion") {
        resultados.sort((a, b) =>
            Number(obtenerCalificacion(b)) -
            Number(obtenerCalificacion(a))
        );
    }

    if (orden === "empresa") {
        resultados.sort((a, b) =>
            a.empresa.localeCompare(b.empresa)
        );
    }

    mostrarEmpleos(resultados);
}

function ordenarEmpleos() {
    aplicarFiltros();
}

function alternarFavorito(id) {
    if (favoritos.includes(id)) {
        favoritos = favoritos.filter(f => f !== id);
    } else {
        favoritos.push(id);
    }

    guardarDatos();
    aplicarFiltros();
    mostrarPanel(false);

    notificar(
        favoritos.includes(id)
            ? "Oferta agregada a favoritos."
            : "Oferta eliminada de favoritos."
    );
}

function mostrarFavoritos() {
    if (!esCandidato()) return;

    soloFavoritos = true;
    categoriaActual = "Todas";

    document.getElementById("buscar").value = "";
    document.getElementById("tituloOfertas").textContent =
        "Mis empleos favoritos";

    aplicarFiltros();

    document.getElementById("ofertas").scrollIntoView({
        behavior: "smooth"
    });
}

function verDetalles(id) {
    const e = empleos.find(x => x.id === id);

    if (!e) return;

    const web = urlSegura(e.webEmpresa);

    document.getElementById("contenidoDetalles").innerHTML = `
        <h2>${escapar(e.puesto)}</h2>

        <p><strong>Empresa:</strong> ${escapar(e.empresa)}</p>

        ${e.descripcionEmpresa ? `
            <p><strong>Acerca de la empresa:</strong>
            ${escapar(e.descripcionEmpresa)}</p>
        ` : ""}

        ${web ? `
            <p>
                <a class="enlace-empresa"
                   href="${escapar(web)}"
                   target="_blank"
                   rel="noopener noreferrer">
                   Visitar página oficial de ${escapar(e.empresa)} ↗
                </a>
            </p>
        ` : ""}

        ${infoEmpresaExtra(e)}
        <p><strong>Categoría:</strong> ${escapar(e.categoria)}</p>
        <p><strong>Tipo:</strong> ${escapar(e.tipo)}</p>
        <p><strong>Ubicación:</strong> ${escapar(e.ubicacion)}</p>
        <p><strong>Salario:</strong> ${escapar(e.salario || "No indicado")}</p>

        <p><strong>Descripción:</strong></p>
        <p>${escapar(e.descripcion)}</p>

        <p><strong>Correo:</strong> ${escapar(e.correo)}</p>

        <p class="evaluacion">
            ⭐ ${obtenerCalificacion(e)} / 5
            (${e.calificaciones.length} evaluaciones)
        </p>

        <div class="solo-candidato">
        <hr style="margin:20px 0;border-color:#34435f">

        <h3>Evalúa esta oferta</h3>

        <div class="acciones">
            ${[1, 2, 3, 4, 5].map(n => `
                <button onclick="evaluarEmpleo(${id},${n})">
                    ${n} ★
                </button>
            `).join("")}
        </div>

        <button style="width:100%;margin-top:20px"
            onclick="cerrarModal('modalDetalles');abrirSolicitud(${id})">
            Enviar solicitud
        </button>
        </div>
    `;

    abrirModal("modalDetalles");
}

function evaluarEmpleo(id, numero) {
    const e = empleos.find(x => x.id === id);

    if (!e) return;

    e.calificaciones.push(numero);

    guardarDatos();
    verDetalles(id);
    aplicarFiltros();

    notificar("¡Gracias por evaluar esta oferta!");
}

function abrirModal(id) {
    document.getElementById(id).style.display = "flex";
}

function cerrarModal(id) {
    document.getElementById(id).style.display = "none";
}

function abrirAcceso() {
    document.getElementById("formAcceso").reset();
    elegirRol("candidato");
    cambiarModoAcceso("login");
    window.scrollTo({ top: 0, behavior: "instant" });
}

function elegirRol(rol) {
    document.getElementById("rolCuenta").value = rol;

    document.getElementById("rolBtnCandidato")
        .classList.toggle("seleccionado", rol === "candidato");

    document.getElementById("rolBtnEmpresa")
        .classList.toggle("seleccionado", rol === "empresa");

    document.getElementById("subtituloAcceso").textContent =
        rol === "empresa"
            ? "Accede para publicar vacantes y revisar candidatos."
            : "Accede para buscar empleo y postularte a vacantes.";

    actualizarCamposAcceso();
}

function cambiarModoAcceso(modo) {
    modoAcceso = modo;

    const registro = modo === "registro";

    document.getElementById("tituloAcceso").textContent =
        registro ? "Crear una cuenta" : "Bienvenido a WorksLink";

    document.getElementById("btnEnviarAcceso").textContent =
        registro ? "Crear cuenta" : "Iniciar sesión";

    document.getElementById("camposRegistro").hidden = !registro;

    document.getElementById("modoLogin").classList.toggle(
        "seleccionado", !registro
    );

    document.getElementById("modoRegistro").classList.toggle(
        "seleccionado", registro
    );

    actualizarCamposAcceso();
}

function actualizarCamposAcceso() {
    const rol = document.getElementById("rolCuenta").value;
    const registro = modoAcceso === "registro";

    document.getElementById("camposRegistro").hidden = !registro;

    document.getElementById("camposEmpresa").hidden =
        !(registro && rol === "empresa");

    document.getElementById("nombreCuenta").required = registro;

    document.getElementById("descripcionEmpresa").required =
        registro && rol === "empresa";

    document.getElementById("webEmpresa").required = false;
}

document.getElementById("rolCuenta").addEventListener(
    "change",
    actualizarCamposAcceso
);

document.getElementById("formAcceso").addEventListener("submit", function(event) {
    event.preventDefault();

    const rol = document.getElementById("rolCuenta").value;
    const email = document.getElementById("correoCuenta").value.trim().toLowerCase();
    const password = document.getElementById("contrasenaCuenta").value;

    if (modoAcceso === "registro") {
        if (cuentas.some(c => c.email === email)) {
            notificar("Ya existe una cuenta con ese correo.");
            return;
        }

        const cuenta = {
            id: Date.now(),
            rol,
            email,
            password,
            nombre: document.getElementById("nombreCuenta").value.trim(),
            descripcion: rol === "empresa"
                ? document.getElementById("descripcionEmpresa").value.trim()
                : "",
            web: rol === "empresa"
                ? urlSegura(document.getElementById("webEmpresa").value.trim())
                : ""
        };

        cuentas.push(cuenta);

        sesion = {
            email: cuenta.email,
            rol: cuenta.rol
        };

        notificar("Cuenta creada correctamente. ¡Bienvenido!");
    } else {
        const cuenta = cuentas.find(c =>
            c.email === email &&
            c.password === password &&
            c.rol === rol
        );

        if (!cuenta) {
            notificar("Correo, contraseña o tipo de cuenta incorrectos.");
            return;
        }

        sesion = {
            email: cuenta.email,
            rol: cuenta.rol
        };

        notificar("Sesión iniciada correctamente.");
    }

    cargarFavoritos();
    guardarDatos();
    this.reset();
    actualizarSesion();
    filtrarCategoria("Todas");
    mostrarPanel(false);
    actualizarEstadisticas();
    window.scrollTo({ top: 0, behavior: "instant" });
});

function cerrarSesion() {
    sesion = null;
    cargarFavoritos();

    guardarDatos();
    actualizarSesion();
    filtrarCategoria("Todas");
    mostrarPanel(false);
    abrirAcceso();

    notificar("Has cerrado sesión.");
}

function mostrarFormulario() {
    if (!esEmpresa()) {
        notificar("Solo las cuentas de empresa pueden publicar vacantes.");
        return;
    }

    const cuenta = cuentaActual();

    document.getElementById("formEmpleo").reset();
    document.getElementById("idEditar").value = "";
    document.getElementById("empresa").value = cuenta.nombre;

    document.getElementById("tituloFormulario").textContent =
        "Publicar empleo";

    abrirModal("modalPublicar");
}

document.getElementById("formEmpleo").addEventListener("submit", function(event) {
    event.preventDefault();

    if (!esEmpresa()) {
        notificar("Solo las cuentas de empresa pueden publicar vacantes.");
        return;
    }

    const cuenta = cuentaActual();
    const id = document.getElementById("idEditar").value;

    const datos = {
        empresa: cuenta.nombre,
        puesto: document.getElementById("puesto").value.trim(),
        categoria: document.getElementById("categoria").value,
        tipo: document.getElementById("tipo").value,
        ubicacion: document.getElementById("ubicacion").value.trim(),
        salario: document.getElementById("salario").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        webEmpresa: cuenta.web,
        descripcionEmpresa: cuenta.descripcion,
        propietario: cuenta.email
    };

    if (id) {
        const index = empleos.findIndex(e =>
            e.id === Number(id) &&
            e.propietario === sesion.email
        );

        if (index < 0) {
            notificar("No puedes editar una publicación de otra empresa.");
            return;
        }

        empleos[index] = {
            ...empleos[index],
            ...datos
        };

        notificar("Publicación actualizada correctamente.");
    } else {
        empleos.push({
            id: Date.now(),
            ...datos,
            calificaciones: [],
            fecha: Date.now()
        });

        notificar("¡Oferta publicada correctamente!");
    }

    guardarDatos();
    this.reset();
    cerrarModal("modalPublicar");
    aplicarFiltros();
    mostrarPanel(false);
});

function editarEmpleo(id) {
    const e = empleos.find(x =>
        x.id === id &&
        x.propietario === sesion?.email
    );

    if (!e || !esEmpresa()) return;

    document.getElementById("idEditar").value = e.id;

    [
        "empresa",
        "puesto",
        "categoria",
        "tipo",
        "ubicacion",
        "salario",
        "descripcion",
        "correo"
    ].forEach(k => {
        document.getElementById(k).value = e[k] || "";
    });

    document.getElementById("tituloFormulario").textContent =
        "Editar publicación";

    abrirModal("modalPublicar");
}

function eliminarEmpleo(id) {
    if (!esEmpresa()) return;

    const e = empleos.find(x =>
        x.id === id &&
        x.propietario === sesion.email
    );

    if (!e) {
        notificar("No puedes eliminar una publicación de otra empresa.");
        return;
    }

    if (!confirm("¿Estás seguro de eliminar esta publicación?")) {
        return;
    }

    empleos = empleos.filter(x => x.id !== id);
    favoritos = favoritos.filter(x => x !== id);
    solicitudes = solicitudes.filter(s => s.idEmpleo !== id);

    guardarDatos();
    mostrarPanel(false);
    aplicarFiltros();

    notificar("Publicación eliminada.");
}

function abrirSolicitud(id) {
    const e = empleos.find(x => x.id === id);

    if (!e) return;

    if (!esCandidato()) {
        notificar("Solo las cuentas de candidato pueden postularse.");
        return;
    }

    const cuenta = cuentaActual();

    document.getElementById("formSolicitud").reset();
    document.getElementById("empleoSolicitado").value = id;
    document.getElementById("nombreCandidato").value = cuenta.nombre;
    document.getElementById("correoCandidato").value = cuenta.email;
    document.getElementById("telefonoCandidato").value = cuenta.telefono || "";

    document.getElementById("nombreVacante").textContent =
        `Vacante: ${e.puesto} | Empresa: ${e.empresa}`;

    abrirModal("modalSolicitud");
}

document.getElementById("formSolicitud").addEventListener("submit", function(event) {
    event.preventDefault();

    if (!esCandidato()) {
        notificar("Necesitas una cuenta de candidato para enviar solicitudes.");
        return;
    }

    solicitudes.push({
        id: Date.now(),
        idEmpleo: Number(document.getElementById("empleoSolicitado").value),
        nombre: document.getElementById("nombreCandidato").value.trim(),
        correo: cuentaActual().email,
        telefono: document.getElementById("telefonoCandidato").value.trim(),
        mensaje: document.getElementById("mensajeCandidato").value.trim(),
        estado: "Pendiente",
        fecha: new Date().toLocaleDateString("es-MX")
    });

    guardarDatos();

    this.reset();
    cerrarModal("modalSolicitud");
    actualizarEstadisticas();
    mostrarPanel(false);

    notificar("¡Tu solicitud fue registrada correctamente!");
});

function chipEstado(estado) {
    const clases = {
        "Pendiente": "pendiente",
        "En revisión": "revision",
        "Aceptada": "aceptada",
        "Rechazada": "rechazada"
    };

    return `<span class="chip-estado ${clases[estado] || "pendiente"}">${escapar(estado)}</span>`;
}

function fijarTexto(id, valor) {
    document.getElementById(id).textContent = valor;
}

function mostrarPanel(desplazar = true) {
    const cuenta = cuentaActual();
    const panelCandidato = document.getElementById("panelCandidato");
    const panelEmpresa = document.getElementById("panelEmpresa");

    panelCandidato.hidden = !(cuenta && cuenta.rol === "candidato");
    panelEmpresa.hidden = !(cuenta && cuenta.rol === "empresa");

    if (!cuenta) return;

    if (cuenta.rol === "empresa") {
        renderPanelEmpresa(cuenta);
    } else {
        renderPanelCandidato(cuenta);
    }

    if (desplazar) {
        (cuenta.rol === "empresa" ? panelEmpresa : panelCandidato)
            .scrollIntoView({ behavior: "smooth" });
    }
}

/* ---------- Panel del candidato ---------- */
function renderPanelCandidato(cuenta) {
    const mias = solicitudes
        .filter(s => s.correo === cuenta.email)
        .sort((a, b) => b.id - a.id);

    const guardados = empleos.filter(e => favoritos.includes(e.id));
    const pctPerfil = porcentajePerfil(cuenta, camposPerfil.comunes.concat(camposPerfil.candidato));

    fijarTexto("cPostulaciones", mias.length);
    fijarTexto("cRevision", mias.filter(s => s.estado === "En revisión").length);
    fijarTexto("cAceptadas", mias.filter(s => s.estado === "Aceptada").length);
    fijarTexto("cFavoritos", guardados.length);

    fijarTexto(
        "textoPanelCandidato",
        `Hola, ${cuenta.nombre}. Da seguimiento a tus postulaciones y a las vacantes que guardaste.`
    );

    document.getElementById("perfilCandidato").innerHTML = `
        <div class="perfil-empresa">
            <div class="perfil-cabecera">
                <div>
                    <h3>${escapar(cuenta.nombre)}</h3>
                    <p>${escapar(cuenta.titulo || "Agrega tu profesión o puesto deseado")}</p>
                </div>
                <button type="button" onclick="abrirPerfil()">Editar perfil</button>
            </div>
            <div class="barra-perfil"><span style="width:${pctPerfil}%"></span></div>
            <p class="nota-perfil">Perfil completo al ${pctPerfil}%. Las empresas verán estos datos cuando te postules.</p>
            ${datoPerfil("Correo", cuenta.email)}
            ${datoPerfil("Teléfono", cuenta.telefono)}
            ${datoPerfil("Ubicación", cuenta.ubicacion)}
            ${datoPerfil("Disponibilidad", cuenta.disponibilidad)}
            ${datoPerfil("Pretensión salarial", cuenta.pretension)}
            ${datoPerfil("Sobre mí", cuenta.resumen)}
            ${datoPerfil("Experiencia", cuenta.experiencia)}
            ${datoPerfil("Educación", cuenta.educacion)}
            ${chipsHabilidades(cuenta.habilidades)}
            ${enlacePerfil(cuenta.web, "Portafolio / LinkedIn")}
        </div>
    `;

    const listaPost = document.getElementById("listaPostulaciones");

    listaPost.innerHTML = mias.length
        ? ""
        : '<p class="vacio-panel">Aún no has enviado solicitudes. Explora las vacantes y postúlate a la que más te interese.</p>';

    mias.forEach(s => {
        const e = empleos.find(x => x.id === s.idEmpleo);

        const fila = document.createElement("div");
        fila.className = "fila-admin";

        fila.innerHTML = `
            <div>
                <strong>${escapar(e?.puesto || "Vacante no disponible")}</strong>
                ${chipEstado(s.estado)}
                <p>${escapar(e?.empresa || "")}${e ? " · " + escapar(e.ubicacion) : ""}</p>
                <p>Enviada el ${escapar(s.fecha)}</p>
            </div>

            <div class="acciones">
                ${e ? `
                    <button class="btn-estado" onclick="verDetalles(${e.id})">
                        Ver vacante
                    </button>
                ` : ""}
                <button class="btn-eliminar" onclick="retirarSolicitud(${s.id})">
                    Retirar
                </button>
            </div>
        `;

        listaPost.appendChild(fila);
    });

    const listaGuard = document.getElementById("listaGuardados");

    listaGuard.innerHTML = guardados.length
        ? ""
        : '<p class="vacio-panel">No tienes empleos guardados. Usa el botón ♡ Favorito en cualquier vacante.</p>';

    guardados.forEach(e => {
        const fila = document.createElement("div");
        fila.className = "fila-admin";

        fila.innerHTML = `
            <div>
                <strong>${escapar(e.puesto)}</strong>
                <p>${escapar(e.empresa)} · ${escapar(e.ubicacion)} · ${escapar(e.tipo)}</p>
            </div>

            <div class="acciones">
                <button class="btn-estado" onclick="abrirSolicitud(${e.id})">Postularme</button>
                <button class="btn-neutro" onclick="verDetalles(${e.id})">Detalles</button>
                <button class="btn-eliminar" onclick="alternarFavorito(${e.id})">Quitar</button>
            </div>
        `;

        listaGuard.appendChild(fila);
    });
}

function retirarSolicitud(id) {
    if (!esCandidato()) return;

    const s = solicitudes.find(x => x.id === id && x.correo === sesion.email);

    if (!s) return;

    if (!confirm("¿Quieres retirar esta postulación?")) return;

    solicitudes = solicitudes.filter(x => x.id !== id);

    guardarDatos();
    actualizarEstadisticas();
    mostrarPanel(false);

    notificar("Postulación retirada.");
}

/* ---------- Panel de la empresa ---------- */
function renderPanelEmpresa(cuenta) {
    const propias = empleos
        .filter(e => e.propietario === cuenta.email)
        .sort((a, b) => b.fecha - a.fecha);

    const ids = propias.map(e => e.id);
    const pctPerfil = porcentajePerfil(cuenta, camposPerfil.comunes.concat(camposPerfil.empresa));

    const recibidas = solicitudes
        .filter(s => ids.includes(s.idEmpleo))
        .sort((a, b) => b.id - a.id);

    fijarTexto("eVacantes", propias.length);
    fijarTexto("eSolicitudes", recibidas.length);
    fijarTexto("ePendientes", recibidas.filter(s => s.estado === "Pendiente").length);
    fijarTexto("eAceptadas", recibidas.filter(s => s.estado === "Aceptada").length);

    fijarTexto(
        "textoPanelEmpresa",
        `${cuenta.nombre}: administra tus vacantes y revisa a los candidatos interesados.`
    );

    document.getElementById("perfilEmpresaPanel").innerHTML = `
        <div class="perfil-empresa">
            <div class="perfil-cabecera">
                <div>
                    <h3>${escapar(cuenta.nombre)}</h3>
                    <p>${escapar([cuenta.sector, cuenta.ubicacion].filter(Boolean).join(" · ") || "Agrega el sector y la ubicación de tu empresa")}</p>
                </div>
                <button type="button" onclick="abrirPerfil()">Editar perfil</button>
            </div>
            <div class="barra-perfil"><span style="width:${pctPerfil}%"></span></div>
            <p class="nota-perfil">Perfil completo al ${pctPerfil}%. Los candidatos verán estos datos en tus vacantes.</p>
            <p>${escapar(cuenta.descripcion || "Sin descripción registrada.")}</p>
            ${datoPerfil("Tamaño", cuenta.tamano)}
            ${datoPerfil("Fundada en", cuenta.fundacion)}
            ${datoPerfil("Teléfono", cuenta.telefono)}
            ${datoPerfil("Correo de contacto", cuenta.correoContacto)}
            ${datoPerfil("Beneficios", cuenta.beneficios)}
            ${enlacePerfil(cuenta.web, "Visitar página oficial") || "<p>No has agregado una página oficial.</p>"}
        </div>
    `;

    const lista = document.getElementById("listaVacantes");

    lista.innerHTML = propias.length
        ? ""
        : '<p class="vacio-panel">Aún no has publicado vacantes. Usa el botón “+ Publicar empleo” para crear la primera.</p>';

    propias.forEach(e => {
        const total = solicitudes.filter(s => s.idEmpleo === e.id).length;

        const fila = document.createElement("div");
        fila.className = "fila-admin";

        fila.innerHTML = `
            <div>
                <strong>${escapar(e.puesto)}</strong>
                <p>${escapar(e.categoria)} · ${escapar(e.tipo)} · ${escapar(e.ubicacion)}</p>
                <p>${total} solicitud${total === 1 ? "" : "es"} · ⭐ ${obtenerCalificacion(e)}</p>
            </div>

            <div class="acciones">
                <button class="btn-editar" onclick="editarEmpleo(${e.id})">Editar</button>
                <button class="btn-eliminar" onclick="eliminarEmpleo(${e.id})">Eliminar</button>
            </div>
        `;

        lista.appendChild(fila);
    });

    const listaSol = document.getElementById("listaSolicitudesEmpresa");

    listaSol.innerHTML = recibidas.length
        ? ""
        : '<p class="vacio-panel">Aún no hay solicitudes para tus vacantes.</p>';

    recibidas.forEach(s => agregarSolicitudAlPanel(s, listaSol));
}

function agregarSolicitudAlPanel(s, contenedor) {
    const e = empleos.find(x => x.id === s.idEmpleo);

    const fila = document.createElement("div");
    fila.className = "fila-admin";

    fila.innerHTML = `
        <div>
            <strong>${escapar(s.nombre)}</strong> ${chipEstado(s.estado)}
            <p>Vacante: ${escapar(e?.puesto || "No disponible")}</p>
            <p>Correo: ${escapar(s.correo)}</p>
            <p>Teléfono: ${escapar(s.telefono)}</p>
            <p>Mensaje: ${escapar(s.mensaje)}</p>
            <p>Fecha: ${escapar(s.fecha)}</p>
            ${perfilCandidatoParaEmpresa(s.correo)}
        </div>

        <div class="acciones">
            <button class="btn-editar" onclick="establecerEstado(${s.id}, 'En revisión')">En revisión</button>
            <button class="btn-estado" onclick="establecerEstado(${s.id}, 'Aceptada')">Aceptar</button>
            <button class="btn-eliminar" onclick="establecerEstado(${s.id}, 'Rechazada')">Rechazar</button>
        </div>
    `;

    contenedor.appendChild(fila);
}

function establecerEstado(id, estado) {
    if (!esEmpresa()) return;

    if (!["Pendiente", "En revisión", "Aceptada", "Rechazada"].includes(estado)) return;

    const s = solicitudes.find(x => x.id === id);

    if (!s) return;

    const e = empleos.find(x => x.id === s.idEmpleo);

    if (!e || e.propietario !== sesion.email) return;

    s.estado = estado;

    guardarDatos();
    mostrarPanel(false);

    notificar("Estado actualizado: " + estado);
}

const camposPerfil = {
    comunes: ["telefono", "ubicacion"],
    candidato: ["titulo", "resumen", "habilidades", "experiencia", "educacion", "disponibilidad", "pretension", "web"],
    empresa: ["descripcion", "sector", "tamano", "fundacion", "correoContacto", "beneficios", "web"]
};

function datoPerfil(etiqueta, valor) {
    return valor ? `<p><strong>${etiqueta}:</strong> ${escapar(valor)}</p>` : "";
}

function chipsHabilidades(texto) {
    const lista = String(texto || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 20);

    return lista.length
        ? `<div class="chips-habilidades">${lista.map(h => `<span>${escapar(h)}</span>`).join("")}</div>`
        : "";
}

function enlacePerfil(url, texto) {
    const u = urlSegura(url);

    return u
        ? `<a class="enlace-empresa" href="${escapar(u)}" target="_blank" rel="noopener noreferrer">${texto} ↗</a>`
        : "";
}

function porcentajePerfil(cuenta, campos) {
    return Math.round(campos.filter(c => cuenta[c]).length / campos.length * 100);
}

function infoEmpresaExtra(e) {
    const c = cuentas.find(x => x.email === e.propietario && x.rol === "empresa");

    if (!c) return "";

    return [
        datoPerfil("Sector", c.sector),
        datoPerfil("Tamaño", c.tamano),
        datoPerfil("Ubicación de la empresa", c.ubicacion),
        datoPerfil("Beneficios", c.beneficios)
    ].join("");
}

function perfilCandidatoParaEmpresa(correo) {
    const c = cuentas.find(x => x.email === correo && x.rol === "candidato");

    if (!c) return "";

    const cuerpo = [
        datoPerfil("Profesión", c.titulo),
        datoPerfil("Ubicación", c.ubicacion),
        datoPerfil("Disponibilidad", c.disponibilidad),
        datoPerfil("Pretensión salarial", c.pretension),
        datoPerfil("Sobre mí", c.resumen),
        datoPerfil("Experiencia", c.experiencia),
        datoPerfil("Educación", c.educacion)
    ].join("") + chipsHabilidades(c.habilidades) + enlacePerfil(c.web, "Portafolio / LinkedIn");

    return `
        <details class="detalle-perfil">
            <summary>Ver perfil del candidato</summary>
            ${cuerpo || "<p>Este candidato aún no completó su perfil.</p>"}
        </details>
    `;
}

function abrirPerfil() {
    const cuenta = cuentaActual();

    if (!cuenta) return;

    const emp = cuenta.rol === "empresa";

    document.getElementById("camposPerfilCandidato").hidden = emp;
    document.getElementById("camposPerfilEmpresa").hidden = !emp;
    document.getElementById("pf_descripcion").required = emp;

    document.getElementById("tituloPerfil").textContent =
        emp ? "Perfil de la empresa" : "Mi perfil profesional";

    document.getElementById("pf_nombre").value = cuenta.nombre || "";

    camposPerfil.comunes.concat(emp ? camposPerfil.empresa : camposPerfil.candidato)
        .forEach(campo => {
            const el = document.getElementById(campo === "web" && emp ? "pf_webEmpresa" : "pf_" + campo);
            el.value = cuenta[campo] || "";
        });

    abrirModal("modalPerfil");
}

document.getElementById("formPerfil").addEventListener("submit", function(event) {
    event.preventDefault();

    const cuenta = cuentaActual();

    if (!cuenta) return;

    const emp = cuenta.rol === "empresa";

    cuenta.nombre = document.getElementById("pf_nombre").value.trim();

    camposPerfil.comunes.concat(emp ? camposPerfil.empresa : camposPerfil.candidato)
        .forEach(campo => {
            const el = document.getElementById(campo === "web" && emp ? "pf_webEmpresa" : "pf_" + campo);
            cuenta[campo] = el.value.trim();
        });

    cuenta.web = urlSegura(cuenta.web);

    if (emp) {
        empleos.forEach(e => {
            if (e.propietario === cuenta.email) {
                e.empresa = cuenta.nombre;
                e.webEmpresa = cuenta.web;
                e.descripcionEmpresa = cuenta.descripcion;
            }
        });
    }

    guardarDatos();
    cerrarModal("modalPerfil");
    actualizarSesion();
    mostrarPanel(false);
    aplicarFiltros();

    notificar("Perfil actualizado correctamente.");
});

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal").forEach(m => {
            m.style.display = "none";
        });
    }
});

cargarFavoritos();
elegirRol("candidato");
cambiarModoAcceso("login");
actualizarSesion();
mostrarEmpleos();
mostrarPanel(false);
actualizarEstadisticas();