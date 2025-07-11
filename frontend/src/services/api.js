const API = "https://api.tierravolga.com.ar";

// Función reutilizable para fetch con sesión
const fetchConSesion = async (url, options = {}) => {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (!res.ok) throw new Error("No autorizado");
  return await res.json();
};

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

