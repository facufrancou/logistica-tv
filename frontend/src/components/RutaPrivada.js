import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function RutaPrivada({ children }) {
  const { usuario } = useContext(AuthContext);

  if (!usuario) return <Navigate to="/login" />;
  return children;
}

export default RutaPrivada;
