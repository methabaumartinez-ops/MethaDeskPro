/**
 * Script para generar el GOOGLE_REFRESH_TOKEN
 * Uso: node scripts/generate-google-token.js CLIENT_ID CLIENT_SECRET
 *
 * IMPORTANTE: En Google Cloud Console, asegúrate de tener añadido
 * http://localhost:3000 como "URI de redirección autorizado".
 */

const https = require('https');
const http = require('http');
const readline = require('readline');

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const REDIRECT_URI = 'http://localhost:3000';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('\n❌ Uso: node scripts/generate-google-token.js CLIENT_ID CLIENT_SECRET\n');
    process.exit(1);
}

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
].join(' ');

const authUrl =
    `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&access_type=offline` +
    `&prompt=consent`;

console.log('\n📋 PASO 1: Abre esta URL en el navegador:\n');
console.log(authUrl);
console.log('\n');
console.log('📋 PASO 2: Autoriza con tu cuenta Google de Google Drive.');
console.log('📋 PASO 3: Serás redirigido a localhost:3000. La página puede mostrar error.');
console.log('           Copia el valor del parámetro "code" de la URL del navegador.\n');
console.log('           Ejemplo de URL: http://localhost:3000/?code=4/0AX4XfWi...&scope=...');
console.log('           → Copia solo el valor de "code" hasta &scope\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('🔑 Pega el código aquí: ', (code) => {
    rl.close();
    code = code.trim();

    // Remove any accidental full URL paste
    if (code.includes('code=')) {
        const match = code.match(/code=([^&]+)/);
        if (match) code = match[1];
    }

    const postData = new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
    }).toString();

    const options = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
        },
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.refresh_token) {
                    console.log('\n✅ ¡Token generado con éxito!\n');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('Añade estas variables en Coolify → Variables de entorno:');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                    console.log(`GOOGLE_REFRESH_TOKEN=${json.refresh_token}`);
                    console.log(`GOOGLE_ROOT_FOLDER_ID=1JchF4KBGvfYisXngPLSZKH4AG4Jogwzy`);
                    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                } else {
                    console.error('\n❌ Error:', JSON.stringify(json, null, 2));
                    if (json.error === 'redirect_uri_mismatch') {
                        console.error('\n💡 Solución: Ve a Google Cloud Console → Clientes OAuth → MethaDesk');
                        console.error('   Añade "http://localhost:3000" en "URI de redirección autorizados"\n');
                    }
                }
            } catch (e) {
                console.error('❌ Error al parsear:', data);
            }
        });
    });

    req.on('error', (e) => console.error('❌ Error de red:', e.message));
    req.write(postData);
    req.end();
});
