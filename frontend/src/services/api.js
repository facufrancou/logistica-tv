const API = "http://localhost:3000";

export const getClientes = () => fetch(API + "/clientes").then((r) => r.json());
export const getProductos = () =>
  fetch(API + "/productos").then((r) => r.json());
export const getPedidos = () => fetch(API + "/pedidos").then((r) => r.json());

export const crearPedido = async (pedido) => {
  try {
    const response = await fetch("http://localhost:3000/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedido),
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
    alert(
      "No se pudo conectar al servidor. Verificá que el backend esté corriendo."
    );
    return null;
  }
};
export const completarPedido = (id_pedido) => {
  return fetch(`${API}/pedidos/${id_pedido}/completar`, { method: "PATCH" });
};

export const eliminarPedido = (id_pedido) => {
  return fetch(`${API}/pedidos/${id_pedido}`, { method: "DELETE" });
};

export const actualizarPedido = (id, data) =>
  fetch(`http://localhost:3000/pedidos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => res.ok);

export const getPedidoPorId = async (id) => {
  const res = await fetch(`http://localhost:3000/pedidos/${id}`);
  if (!res.ok) throw new Error("Error al obtener el pedido");
  return await res.json();
};

// CLIENTES
export const crearCliente = async (cliente) => {
  try {
    const res = await fetch("http://localhost:3000/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
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
    const res = await fetch(`http://localhost:3000/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
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

// PRODUCTOS
export const crearProducto = async (producto) => {
  try {
    const res = await fetch("http://localhost:3000/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(producto),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al crear producto");
    }

    return await res.json();
  } catch (err) {
    alert("Error al crear producto: " + err.message);
    return null;
  }
};

export const actualizarProducto = async (id, producto) => {
  try {
    const res = await fetch(`http://localhost:3000/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(producto),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al actualizar producto");
    }

    return await res.json();
  } catch (err) {
    alert("Error al actualizar producto: " + err.message);
    return null;
  }
};

// Obtener productos habilitados de un cliente
export const getProductosHabilitados = async (id_cliente) => {
  const res = await fetch(
    `http://localhost:3000/clientes/${id_cliente}/productos-habilitados`
  );
  if (!res.ok) throw new Error("Error al obtener productos habilitados");
  return await res.json();
};

// Asignar productos habilitados (reemplaza los existentes)
export const setProductosHabilitados = async (id_cliente, productos) => {
  const res = await fetch(
    `http://localhost:3000/clientes/${id_cliente}/productos-habilitados`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productos }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al asignar productos habilitados");
  }

  return await res.json();
};

export const getPedidosProximos = (desde, hasta) =>
  fetch(
    `http://localhost:3000/pedidos/proximos?desde=${desde}&hasta=${hasta}`
  ).then((r) => (r.ok ? r.json() : []));

export const getPedidosPorFecha = (desde, hasta) =>
  fetch(`http://localhost:3000/pedidos?desde=${desde}&hasta=${hasta}`).then(
    (res) => (res.ok ? res.json() : [])
  );

export const getPedidosPorSemana = async () => {
  const res = await fetch("http://localhost:3000/pedidos/semanal");
  if (!res.ok) throw new Error("Error al obtener pedidos por semana");
  return await res.json();
};

export const getUltimoPedidoPorCliente = async (id_cliente) => {
  const res = await fetch(`http://localhost:3000/pedidos/ultimo/${id_cliente}`);
  if (!res.ok) throw new Error("Error al obtener último pedido del cliente");
  return await res.json();
};


// PROVEEDORES

export const getProveedores = async () => {
  const res = await fetch("http://localhost:3000/proveedores");
  if (!res.ok) throw new Error("Error al obtener proveedores");
  return await res.json();
};

export const crearProveedor = async (proveedor) => {
  try {
    const res = await fetch("http://localhost:3000/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proveedor),
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
    const res = await fetch(`http://localhost:3000/proveedores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proveedor),
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
    const res = await fetch(`http://localhost:3000/proveedores/${id}`, {
      method: "DELETE",
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
