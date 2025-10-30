import React, { useEffect, useState, useContext } from "react";
import {
  getVacunasNuevas,
  getPatologias,
  getPresentaciones,
  getViasAplicacion,
  getProveedores,
  eliminarVacuna,
} from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import FormularioVacuna from "../planesVacunales/FormularioVacuna";
import { FaList, FaPlus, FaCheck, FaTimes, FaEye, FaEdit, FaTrash, FaInbox } from 'react-icons/fa';

function VacunasList({ vacunas: vacunasProp, onRefresh }) {
  const { usuario } = useContext(AuthContext);
  const [vacunas, setVacunas] = useState([]);
  const [patologias, setPatologias] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [viasAplicacion, setViasAplicacion] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroPatologia, setFiltroPatologia] = useState("");
  const [filtroPresentacion, setFiltroPresentacion] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [vacunaSeleccionada, setVacunaSeleccionada] = useState(null);
  const [modo, setModo] = useState("crear");

  useEffect(() => {
    if (vacunasProp) {
      setVacunas(vacunasProp);
    } else {
      cargarVacunas();
    }
    cargarCatalogos();
  }, [vacunasProp]);

  const cargarVacunas = async () => {
    setLoading(true);
    try {
      const response = await getVacunasNuevas();
      setVacunas(response.data || response);
    } catch (error) {
      console.error("Error cargando vacunas:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [patData, presData, viasData, provData] = await Promise.all([
        getPatologias(),
        getPresentaciones(),
        getViasAplicacion(),
        getProveedores()
      ]);

      setPatologias(patData.data || patData);
      setPresentaciones(presData.data || presData);
      setViasAplicacion(viasData.data || viasData);
      setProveedores(provData.data || provData);
    } catch (error) {
      console.error("Error cargando catálogos:", error);
    }
  };

  const vacunasFiltradas = vacunas.filter((vacuna) => {
    const cumpleBusqueda = !busqueda || 
      vacuna.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      vacuna.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumplePatologia = !filtroPatologia || 
      vacuna.id_patologia?.toString() === filtroPatologia;
    
    const cumplePresentacion = !filtroPresentacion || 
      vacuna.id_presentacion?.toString() === filtroPresentacion;

    return cumpleBusqueda && cumplePatologia && cumplePresentacion;
  });

  const abrirModal = (vacuna = null, modoEdicion = "crear") => {
    setVacunaSeleccionada(vacuna);
    setModo(modoEdicion);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setVacunaSeleccionada(null);
    setModalOpen(false);
    setModo("crear");
  };

  const handleRefresh = () => {
    cargarVacunas();
    if (onRefresh) onRefresh();
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar esta vacuna?")) return;
    
    try {
      await eliminarVacuna(id);
      handleRefresh();
    } catch (error) {
      console.error("Error eliminando vacuna:", error);
    }
  };

  const getNombrePatologia = (id) => {
    const patologia = patologias.find(p => p.id_patologia === id);
    return patologia?.nombre || "—";
  };

  const getNombrePresentacion = (id) => {
    const presentacion = presentaciones.find(p => p.id_presentacion === id);
    return presentacion?.nombre || "—";
  };

  const getNombreProveedor = (id) => {
    const proveedor = proveedores.find(p => p.id_proveedor === id);
    return proveedor?.nombre || "—";
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{minHeight: "300px"}}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p className="text-muted">Cargando vacunas...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h3 className="mb-0"><FaList className="me-2 text-primary" />Administración de Vacunas</h3>
        <button
          className="btn btn-success"
          onClick={() => abrirModal()}
        >
          <FaPlus className="me-1" />Nueva Vacuna
        </button>
      </div>

      {/* Filtros */}
      <div className="row mb-3">
        <div className="col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-control"
            value={filtroPatologia}
            onChange={(e) => setFiltroPatologia(e.target.value)}
          >
            <option value="">Todas las patologías</option>
            {patologias.map(pat => (
              <option key={pat.id_patologia} value={pat.id_patologia}>
                {pat.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <select
            className="form-control"
            value={filtroPresentacion}
            onChange={(e) => setFiltroPresentacion(e.target.value)}
          >
            <option value="">Todas las presentaciones</option>
            {presentaciones.map(pres => (
              <option key={pres.id_presentacion} value={pres.id_presentacion}>
                {pres.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2 text-right">
          <small className="text-muted">
            {vacunasFiltradas.length} vacuna(s)
          </small>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="thead-light">
            <tr>
              <th className="text-dark">Código</th>
              <th className="text-dark">Nombre</th>
              <th className="text-dark">Patología</th>
              <th className="text-dark">Presentación</th>
              <th className="text-dark">Proveedor</th>
              <th className="text-dark">Estado</th>
              <th className="text-dark">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vacunasFiltradas.map((vacuna) => (
              <tr key={vacuna.id_vacuna}>
                <td>
                  <code>{vacuna.codigo}</code>
                </td>
                <td>
                  <strong>{vacuna.nombre}</strong>
                  {vacuna.descripcion && (
                    <div className="text-muted small">
                      {vacuna.descripcion.length > 50 
                        ? `${vacuna.descripcion.substring(0, 50)}...`
                        : vacuna.descripcion
                      }
                    </div>
                  )}
                </td>
                <td>
                  <span className="badge bg-info text-white">
                    {getNombrePatologia(vacuna.id_patologia)}
                  </span>
                </td>
                <td>
                  <span className="badge bg-light text-dark">
                    {getNombrePresentacion(vacuna.id_presentacion)}
                  </span>
                </td>
                <td>
                  {getNombreProveedor(vacuna.id_proveedor)}
                </td>
                <td>
                  <span className={`badge ${vacuna.activa ? 'bg-success' : 'bg-secondary'} text-white`}>
                    {vacuna.activa ? <FaCheck className="mr-1" /> : <FaTimes className="mr-1" />}
                    {vacuna.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div className="btn-group">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => abrirModal(vacuna, "ver")}
                      title="Ver detalles"
                    >
                      <FaEye />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => abrirModal(vacuna, "editar")}
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleEliminar(vacuna.id_vacuna)}
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vacunasFiltradas.length === 0 && (
        <div className="text-center text-muted py-4">
          <p><FaInbox className="mr-2" />No se encontraron vacunas</p>
          <button
            className="btn btn-primary"
            onClick={() => abrirModal()}
          >
            <FaPlus className="mr-1" />Crear primera vacuna
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <FormularioVacuna
          vacuna={vacunaSeleccionada}
          modo={modo}
          onClose={cerrarModal}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}

export default VacunasList;