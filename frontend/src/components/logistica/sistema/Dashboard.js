import React, { useState, useEffect } from 'react';
import Card, { CardGroup, CardStat } from './common/Card';
import DataTable from './common/DataTable';
import { FaShoppingCart, FaUsers, FaBox, FaMoneyBillWave, FaTruck } from 'react-icons/fa';
import { useNotification } from '../context/NotificationContext';
import { getPedidos, getClientes, getProductos } from '../services/api';
import './Dashboard.css';

/**
 * Dashboard principal del sistema con estadísticas y datos recientes
 */
const Dashboard = () => {
  const [stats, setStats] = useState({
    pedidosPendientes: 0,
    pedidosCompletados: 0,
    clientesActivos: 0,
    productosActivos: 0,
    ingresosRecientes: 0
  });
  const [pedidosRecientes, setPedidosRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { showError } = useNotification();
  
  // Cargar datos del dashboard
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [pedidosData, clientesData, productosData] = await Promise.all([
          getPedidos(),
          getClientes(),
          getProductos()
        ]);
        
        // Calcular estadísticas
        const pendientes = pedidosData.filter(p => p.estado === 'Pendiente').length;
        const completados = pedidosData.filter(p => p.estado === 'Entregado').length;
        
        // Calcular ingresos recientes (últimos 30 días)
        const hoy = new Date();
        const hace30Dias = new Date();
        hace30Dias.setDate(hoy.getDate() - 30);
        
        const pedidosRecientes = pedidosData
          .filter(p => new Date(p.fecha) >= hace30Dias)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        const ingresos = pedidosRecientes
          .filter(p => p.estado === 'Entregado')
          .reduce((sum, pedido) => sum + (pedido.total || 0), 0);
        
        // Actualizar stats
        setStats({
          pedidosPendientes: pendientes,
          pedidosCompletados: completados,
          clientesActivos: clientesData.length,
          productosActivos: productosData.length,
          ingresosRecientes: ingresos
        });
        
        // Mostrar pedidos recientes
        setPedidosRecientes(pedidosRecientes.slice(0, 5));
        
      } catch (error) {
        console.error("Error al cargar datos del dashboard", error);
        showError("Error al cargar", "No se pudieron obtener los datos del dashboard");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [showError]);
  
  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };
  
  // Formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR').format(date);
  };
  
  // Columnas para la tabla de pedidos recientes
  const pedidosColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'fecha', label: 'Fecha', sortable: true, render: (row) => formatDate(row.fecha) },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { 
      key: 'estado', 
      label: 'Estado', 
      sortable: true,
      render: (row) => (
        <span className={`badge badge-${getEstadoBadgeClass(row.estado)}`}>
          {row.estado}
        </span>
      )
    },
    { key: 'total', label: 'Total', sortable: true, render: (row) => formatCurrency(row.total) }
  ];
  
  // Determinar clase para el badge de estado
  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'Entregado': return 'success';
      case 'Pendiente': return 'warning';
      case 'Cancelado': return 'danger';
      default: return 'info';
    }
  };
  
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Panel de Control</h1>
      
      {/* Tarjetas de estadísticas */}
      <CardGroup>
        <Card hoverable>
          <CardStat
            label="Pedidos Pendientes"
            value={stats.pedidosPendientes}
            icon={<FaShoppingCart />}
          />
        </Card>
        
        <Card hoverable>
          <CardStat
            label="Pedidos Completados"
            value={stats.pedidosCompletados}
            icon={<FaTruck />}
            trend="up"
            trendLabel="Este mes"
          />
        </Card>
        
        <Card hoverable>
          <CardStat
            label="Clientes Activos"
            value={stats.clientesActivos}
            icon={<FaUsers />}
          />
        </Card>
        
        <Card hoverable>
          <CardStat
            label="Productos Disponibles"
            value={stats.productosActivos}
            icon={<FaBox />}
          />
        </Card>
      </CardGroup>
      
      <div className="dashboard-row">
        <div className="dashboard-col-wide">
          <Card 
            title="Pedidos Recientes"
            actions={<button className="btn btn-sm btn-outline">Ver todos</button>}
          >
            {loading ? (
              <div className="loading-indicator">Cargando datos...</div>
            ) : (
              <DataTable 
                columns={pedidosColumns}
                data={pedidosRecientes}
                options={{ 
                  searchable: true,
                  paginated: false
                }}
              />
            )}
          </Card>
        </div>
        
        <div className="dashboard-col-narrow">
          <Card 
            title="Ingresos Recientes"
            className="card-primary"
          >
            <div className="ingresos-card">
              <div className="ingresos-icon">
                <FaMoneyBillWave />
              </div>
              <div className="ingresos-amount">
                {formatCurrency(stats.ingresosRecientes)}
              </div>
              <div className="ingresos-label">
                Últimos 30 días
              </div>
            </div>
          </Card>
          
          <Card title="Acciones Rápidas">
            <div className="acciones-rapidas">
              <button className="btn btn-primary btn-block mb-2">
                <FaShoppingCart className="btn-icon" /> Nuevo Pedido
              </button>
              <button className="btn btn-outline btn-block mb-2">
                <FaUsers className="btn-icon" /> Nuevo Cliente
              </button>
              <button className="btn btn-outline btn-block">
                <FaBox className="btn-icon" /> Nuevo Producto
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
