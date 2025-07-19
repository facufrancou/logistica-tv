import React, { useState, useEffect } from 'react';
import './DataTable.css';
import { FaSort, FaSortUp, FaSortDown, FaSearch } from 'react-icons/fa';

/**
 * Componente de tabla de datos con funcionalidades de ordenamiento, búsqueda y paginación
 * @param {Array} columns - Configuración de columnas: [{key, label, sortable, render}]
 * @param {Array} data - Datos a mostrar en la tabla
 * @param {Object} options - Opciones adicionales (searchable, paginated, rowsPerPageOptions)
 */
const DataTable = ({ 
  columns = [], 
  data = [], 
  options = {
    searchable: true,
    paginated: true,
    rowsPerPageOptions: [10, 25, 50, 100]
  } 
}) => {
  const [sortedData, setSortedData] = useState(data);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(options.rowsPerPageOptions?.[0] || 10);
  const [filteredData, setFilteredData] = useState(data);
  
  // Actualiza los datos cuando cambian externamente
  useEffect(() => {
    setFilteredData(data);
    setSortedData(data);
  }, [data]);
  
  // Maneja el ordenamiento de datos
  const requestSort = (key) => {
    let direction = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      key = null;
      direction = null;
    }
    
    setSortConfig({ key, direction });
    
    if (key === null) {
      setSortedData([...filteredData]);
      return;
    }
    
    const sorted = [...filteredData].sort((a, b) => {
      const valueA = a[key];
      const valueB = b[key];
      
      if (valueA === valueB) return 0;
      
      // Manejar valores nulos/undefined
      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;
      
      // Determinar el tipo y ordenar apropiadamente
      const isNumeric = !isNaN(valueA) && !isNaN(valueB);
      const isDate = valueA instanceof Date && valueB instanceof Date;
      
      if (isNumeric) {
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      } else if (isDate) {
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      } else {
        // Ordenamiento alfabético para strings
        return direction === 'asc'
          ? valueA.toString().localeCompare(valueB.toString())
          : valueB.toString().localeCompare(valueA.toString());
      }
    });
    
    setSortedData(sorted);
  };
  
  // Filtrar datos según término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data);
      setSortedData(data);
      setCurrentPage(1);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    
    const filtered = data.filter(item => {
      // Buscar en todas las propiedades de la fila
      return Object.values(item).some(value => {
        if (value === null || value === undefined) return false;
        return value.toString().toLowerCase().includes(searchTermLower);
      });
    });
    
    setFilteredData(filtered);
    setSortedData(filtered);
    setCurrentPage(1);
  }, [searchTerm, data]);
  
  // Aplicar ordenamiento cuando cambia la configuración
  useEffect(() => {
    if (sortConfig.key) {
      requestSort(sortConfig.key);
    }
  }, [filteredData]);
  
  // Obtener datos paginados
  const getPaginatedData = () => {
    if (!options.paginated) return sortedData;
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  };
  
  // Renderizar icono de ordenamiento
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <FaSort className="sort-icon" />;
    }
    return sortConfig.direction === 'asc' ? <FaSortUp className="sort-icon" /> : <FaSortDown className="sort-icon" />;
  };
  
  // Cambiar de página
  const changePage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };
  
  // Calcular número total de páginas
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  
  // Renderizar números de página
  const renderPagination = () => {
    if (!options.paginated || totalPages <= 1) return null;
    
    const pages = [];
    const displayRange = 2; // Número de páginas para mostrar a cada lado
    let startPage = Math.max(1, currentPage - displayRange);
    let endPage = Math.min(totalPages, currentPage + displayRange);
    
    // Ajustar el rango si estamos cerca del inicio o final
    if (startPage <= 3) {
      endPage = Math.min(5, totalPages);
    }
    
    if (endPage >= totalPages - 2) {
      startPage = Math.max(1, totalPages - 4);
    }
    
    // Siempre incluir la primera página
    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => changePage(1)} className={1 === currentPage ? 'active' : ''}>
          1
        </button>
      );
      
      // Mostrar puntos suspensivos si hay páginas entre la primera y startPage
      if (startPage > 2) {
        pages.push(<span key="ellipsis-start" className="ellipsis">...</span>);
      }
    }
    
    // Páginas en el rango
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button key={i} onClick={() => changePage(i)} className={i === currentPage ? 'active' : ''}>
          {i}
        </button>
      );
    }
    
    // Siempre incluir la última página
    if (endPage < totalPages) {
      // Mostrar puntos suspensivos si hay páginas entre endPage y la última
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis-end" className="ellipsis">...</span>);
      }
      
      pages.push(
        <button
          key={totalPages}
          onClick={() => changePage(totalPages)}
          className={totalPages === currentPage ? 'active' : ''}
        >
          {totalPages}
        </button>
      );
    }
    
    return (
      <div className="pagination-container">
        <button 
          onClick={() => changePage(currentPage - 1)} 
          disabled={currentPage === 1}
          className="pagination-arrow"
        >
          &lt;
        </button>
        <div className="pagination-numbers">{pages}</div>
        <button
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-arrow"
        >
          &gt;
        </button>
      </div>
    );
  };
  
  return (
    <div className="datatable-container">
      {/* Barra de herramientas */}
      {(options.searchable || options.paginated) && (
        <div className="datatable-toolbar">
          {options.searchable && (
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  ×
                </button>
              )}
            </div>
          )}
          
          {options.paginated && (
            <div className="rows-per-page">
              <span>Filas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {options.rowsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      
      {/* Tabla */}
      <div className="datatable-responsive">
        <table className="datatable">
          <thead>
            <tr>
              {columns.map(column => (
                <th 
                  key={column.key} 
                  className={`${column.sortable !== false ? 'sortable' : ''} ${column.className || ''}`}
                  onClick={() => column.sortable !== false ? requestSort(column.key) : null}
                >
                  {column.label}
                  {column.sortable !== false && getSortIcon(column.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getPaginatedData().length > 0 ? (
              getPaginatedData().map((row, rowIndex) => (
                <tr key={row.id || rowIndex}>
                  {columns.map(column => (
                    <td key={`${rowIndex}-${column.key}`} className={column.className || ''}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="no-data">
                  No se encontraron resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginación */}
      {options.paginated && sortedData.length > 0 && (
        <div className="datatable-footer">
          <div className="pagination-info">
            Mostrando {sortedData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} a {
              Math.min(currentPage * rowsPerPage, sortedData.length)
            } de {sortedData.length} resultados
          </div>
          {renderPagination()}
        </div>
      )}
    </div>
  );
};

export default DataTable;
