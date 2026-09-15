async function verificarEstadoServidor() {
    try {
        const respuesta = await fetch("http://localhost:3000/health");
        const datos = await respuesta.json();
        
        const contenedor = document.getElementById("estado-servidor");
        if (contenedor) {
            contenedor.textContent = `Respuesta Servidor: ${datos.mensaje}`;
        }
    } catch (error) {
        console.error("Error al conectar con el servidor ControlGym:", error);
    }
}

verificarEstadoServidor();