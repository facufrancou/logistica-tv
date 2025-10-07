const API = "http://localhost:3001";

// Función reutilizable para fetch con sesión
const fetchConSesion = async (url, options = {}) => {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) throw new Error("No autorizado");
  return await res.json();
};

// Exportar funciones de la nueva API de Planes Vacunales
export * from './planesVacunalesApi';

// CLIENTES
export const getClientes = () => fetchConSesion(API + "/clientes");
export const crearCliente = async (cliente) => {
  try {
    const res = await fetch(API + "/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear el cliente");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear cliente: " + err.message);
    return null;
  }
};

export const actualizarCliente = async (id, cliente) => {
  try {
    const res = await fetch(`${API}/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar el cliente");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar cliente: " + err.message);
    return null;
  }
};

// Función específica para actualizar solo el estado (habilitado/deshabilitado) de un cliente
export const actualizarEstadoCliente = async (id, habilitado) => {
  try {
    const res = await fetch(`${API}/clientes/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habilitado }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar el estado del cliente");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar el estado del cliente: " + err.message);
    return null;
  }
};

// Función específica para actualizar solo el estado de bloqueo de un cliente
export const actualizarBloqueoCliente = async (id, bloqueado) => {
  try {
    const res = await fetch(`${API}/clientes/${id}/bloqueo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bloqueado }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar el estado de bloqueo del cliente");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar el estado de bloqueo del cliente: " + err.message);
    return null;
  }
};

export const getProductos = () => fetchConSesion(API + "/productos");
export const getPedidos = () => fetchConSesion(API + "/pedidos");

export const crearPedido = async (pedido) => {
  try {
    const response = await fetch(API + "/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedido),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Error al crear pedido:", error);
      alert(`Error: ${error.error || "No se pudo crear el pedido"}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("Error en la red o backend no disponible:", err);
    alert("No se pudo conectar al servidor. Verificá que el backend esté corriendo.");
    return null;
  }
};

export const completarPedido = (id_pedido) => {
  return fetch(`${API}/pedidos/${id_pedido}/completar`, {
    method: "PATCH",
    credentials: "include",
  });
};

export const eliminarPedido = (id_pedido) => {
  return fetch(`${API}/pedidos/${id_pedido}`, {
    method: "DELETE",
    credentials: "include",
  });
};

export const actualizarPedido = (id, data) =>
  fetch(`${API}/pedidos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  }).then((res) => res.ok);

export const getPedidoPorId = (id) =>
  fetchConSesion(`${API}/pedidos/${id}`);

export const getProductosHabilitados = (id_cliente) =>
  fetchConSesion(`${API}/clientes/${id_cliente}/productos-habilitados`);

export const setProductosHabilitados = async (id_cliente, productos) => {
  const res = await fetch(`${API}/clientes/${id_cliente}/productos-habilitados`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productos }),
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al asignar productos habilitados");
  }

  return await res.json();
};

export const getPedidosProximos = async (desde, hasta) => {
  const res = await fetch(`${API}/pedidos/proximos?desde=${desde}&hasta=${hasta}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error("❌ Error getPedidosProximos:", res.status, error);
    throw new Error(error.error || "No se pudieron obtener los pedidos próximos");
  }

  return await res.json();
};



export const getPedidosPorFecha = (desde, hasta) => {
  let url = `${API}/pedidos`;
  if (desde && hasta) {
    url += `?desde=${desde}&hasta=${hasta}`;
  }

  return fetch(url, {
    credentials: "include",
  }).then((res) => (res.ok ? res.json() : []));
};

export const getPedidosPorSemana = () => fetchConSesion(`${API}/pedidos/semanal`);
export const getUltimoPedidoPorCliente = (id_cliente) => fetchConSesion(`${API}/pedidos/ultimo/${id_cliente}`);

// PROVEEDORES
export const getProveedores = () => fetchConSesion(`${API}/proveedores`);

export const crearProveedor = async (proveedor) => {
  try {
    const res = await fetch(`${API}/proveedores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proveedor),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear el proveedor");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear proveedor: " + err.message);
    return null;
  }
};

export const actualizarProveedor = async (id, proveedor) => {
  try {
    const res = await fetch(`${API}/proveedores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proveedor),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar el proveedor");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar proveedor: " + err.message);
    return null;
  }
};

export const eliminarProveedor = async (id) => {
  try {
    const res = await fetch(`${API}/proveedores/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo eliminar el proveedor");
    }

    return await res.json();
  } catch (err) {
    alert("Error al eliminar proveedor: " + err.message);
    return null;
  }
};

export const crearProducto = async (producto) => {
  try {
    const res = await fetch(`${API}/productos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(producto),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear el producto");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear producto: " + err.message);
    return null;
  }
};

export const actualizarProducto = async (id, producto) => {
  try {
    const res = await fetch(`${API}/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(producto),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar el producto");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar producto: " + err.message);
    return null;
  }
};

// Nuevas funciones para tipos de producto
export const getTiposProducto = () => fetchConSesion(API + "/productos/tipos");

export const getVacunas = () => fetchConSesion(API + "/productos/vacunas");

export const getProductosPorTipo = (tipo) => 
  fetchConSesion(`${API}/productos?tipo_producto=${tipo}`);

// ===== SISTEMA DE VACUNAS =====

// Vacunas
export const getVacunasNuevas = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return fetchConSesion(`${API}/vacunas${queryString ? `?${queryString}` : ''}`);
};

export const getVacunasDisponibles = () => fetchConSesion(`${API}/vacunas/disponibles`);

export const getVacunaById = (id) => fetchConSesion(`${API}/vacunas/${id}`);

export const crearVacuna = async (vacuna) => {
  try {
    const res = await fetch(`${API}/vacunas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vacuna),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear la vacuna");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear vacuna: " + err.message);
    return null;
  }
};

export const actualizarVacuna = async (id, vacuna) => {
  try {
    const res = await fetch(`${API}/vacunas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vacuna),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar la vacuna");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar vacuna: " + err.message);
    return null;
  }
};

export const eliminarVacuna = async (id) => {
  try {
    const res = await fetch(`${API}/vacunas/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo eliminar la vacuna");
    }

    return await res.json();
  } catch (err) {
    alert("Error al eliminar vacuna: " + err.message);
    return null;
  }
};

// Catálogos de Vacunas
export const getPatologias = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return fetchConSesion(`${API}/catalogos/patologias${queryString ? `?${queryString}` : ''}`);
};

export const getPresentaciones = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return fetchConSesion(`${API}/catalogos/presentaciones${queryString ? `?${queryString}` : ''}`);
};

export const getViasAplicacion = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return fetchConSesion(`${API}/catalogos/vias-aplicacion${queryString ? `?${queryString}` : ''}`);
};

export const crearPatologia = async (patologia) => {
  try {
    const res = await fetch(`${API}/catalogos/patologias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patologia),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear la patología");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear patología: " + err.message);
    return null;
  }
};

export const crearPresentacion = async (presentacion) => {
  try {
    const res = await fetch(`${API}/catalogos/presentaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presentacion),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear la presentación");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear presentación: " + err.message);
    return null;
  }
};

export const crearViaAplicacion = async (via) => {
  try {
    const res = await fetch(`${API}/catalogos/vias-aplicacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(via),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear la vía de aplicación");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear vía de aplicación: " + err.message);
    return null;
  }
};

export const actualizarPatologia = async (id, patologia) => {
  try {
    const res = await fetch(`${API}/catalogos/patologias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patologia),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar la patología");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar patología: " + err.message);
    return null;
  }
};

export const actualizarPresentacion = async (id, presentacion) => {
  try {
    const res = await fetch(`${API}/catalogos/presentaciones/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presentacion),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar la presentación");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar presentación: " + err.message);
    return null;
  }
};

export const actualizarViaAplicacion = async (id, via) => {
  try {
    const res = await fetch(`${API}/catalogos/vias-aplicacion/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(via),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar la vía de aplicación");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar vía de aplicación: " + err.message);
    return null;
  }
};

// Stock de Vacunas
export const getStockVacunas = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return fetchConSesion(`${API}/stock-vacunas${queryString ? `?${queryString}` : ''}`);
};

export const getAlertasStockVacunas = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return fetchConSesion(`${API}/stock-vacunas/alertas${queryString ? `?${queryString}` : ''}`);
};

export const getStockByVacuna = (idVacuna) => 
  fetchConSesion(`${API}/stock-vacunas/vacuna/${idVacuna}`);

export const getMovimientosStockVacuna = (idStock, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return fetchConSesion(`${API}/stock-vacunas/${idStock}/movimientos${queryString ? `?${queryString}` : ''}`);
};

export const crearStockVacuna = async (stock) => {
  try {
    const res = await fetch(`${API}/stock-vacunas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stock),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear el registro de stock");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear stock de vacuna: " + err.message);
    return null;
  }
};

export const actualizarStockVacuna = async (id, stock) => {
  try {
    const res = await fetch(`${API}/stock-vacunas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stock),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo actualizar el stock");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar stock: " + err.message);
    return null;
  }
};

// Movimientos de Stock
export const registrarIngresoStock = async (idStock, movimiento) => {
  try {
    const res = await fetch(`${API}/stock-vacunas/${idStock}/ingreso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movimiento),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo registrar el ingreso");
    }

    return await res.json();
  } catch (err) {
    throw new Error("Error al registrar ingreso: " + err.message);
  }
};

export const registrarEgresoStock = async (idStock, movimiento) => {
  try {
    const res = await fetch(`${API}/stock-vacunas/${idStock}/egreso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movimiento),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo registrar el egreso");
    }

    return await res.json();
  } catch (err) {
    throw new Error("Error al registrar egreso: " + err.message);
  }
};

export const crearMovimientoStock = async (movimiento) => {
  try {
    const res = await fetch(`${API}/stock-vacunas/movimiento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movimiento),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "No se pudo crear el movimiento");
    }

    return await res.json();
  } catch (err) {
    throw new Error("Error al crear movimiento: " + err.message);
  }
};

