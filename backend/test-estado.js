const http = require('http');

function testCambiarEstado() {
  const postData = JSON.stringify({
    estado: 'aceptada',
    observaciones: 'Test de aceptación'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/cotizaciones/11/estado',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('Probando endpoint cambiar estado...');
  console.log('Options:', options);
  console.log('PostData:', postData);

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response body:', data);
      if (res.statusCode !== 200) {
        console.error('Error response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Error en la petición: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testCambiarEstado();