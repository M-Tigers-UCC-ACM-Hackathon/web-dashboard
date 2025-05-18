import { Pool, PoolConfig, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';

// --- Environment Variable Loading & Validation ---
const PG_HOST = process.env.PG_HOST;
const PG_PORT_STR = process.env.PG_PORT;
const PG_USER = process.env.PG_USER;
const PG_PASSWORD = process.env.PG_PASSWORD;
const PG_DATABASE = process.env.PG_DATABASE;
const PG_SSL_CA_PATH = process.env.PG_SSL_CA_PATH;
let caCertFromFileContent: string | undefined;

if (PG_SSL_CA_PATH) {
    try {
        const fullCaPath = path.resolve(process.cwd(), PG_SSL_CA_PATH);
        if (fs.existsSync(fullCaPath)) {
            caCertFromFileContent = fs.readFileSync(fullCaPath, 'utf-8');
            console.log("DB Module: Loaded CA certificate from file path:", PG_SSL_CA_PATH);
        } else {
            console.error(`DB Module: CA certificate file not found at path: ${fullCaPath}. Path was: ${PG_SSL_CA_PATH}`);
        }
    } catch (error) {
        console.error(`DB Module: Error reading CA certificate file from ${PG_SSL_CA_PATH}:`, error);
    }
}

const finalCaCertContent = caCertFromFileContent;

// Basic validation (can be more extensive)
if (!PG_HOST || !PG_PORT_STR || !PG_USER || !PG_DATABASE) {
    console.error("DB Module: Critical PostgreSQL environment variables are missing (HOST, PORT, USER, DATABASE). Database functionality will be impaired.");
}
if (process.env.NODE_ENV === 'production' && !finalCaCertContent) {
    console.error("CRITICAL DB Module: CA Certificate (PG_SSL_CA_CONTENT or from PG_SSL_CA_PATH) is NOT set in a production-like environment. Secure database connections may fail.");
}
// --- End Environment Variable Logic ---


// --- PostgreSQL Pool Configuration ---
const poolConfig: PoolConfig = {
    host: PG_HOST,
    port: parseInt(PG_PORT_STR || "5432"),
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
    ssl: finalCaCertContent
        ? { rejectUnauthorized: true, ca: finalCaCertContent }
        : (process.env.NODE_ENV === 'production' ? undefined : { rejectUnauthorized: false }),
    max: process.env.NODE_ENV === 'production' ? 20 : 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

if (process.env.NODE_ENV !== 'production' && !finalCaCertContent && poolConfig.ssl === undefined) {
    console.warn("DB Module (Dev): No CA certificate provided and SSL not explicitly set to rejectUnauthorized:false. Connections might fail if DB requires SSL, or be insecure.");
}


// --- Singleton Pattern for pg.Pool in Development ---
const GLOBAL_PG_POOL_KEY = Symbol.for('myapp.sharedPgPool');

interface GlobalWithPgPool {
    [GLOBAL_PG_POOL_KEY]?: Pool;
}

const customGlobal = globalThis as GlobalWithPgPool;

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
    // In production, always create a new pool
    pool = new Pool(poolConfig);
    console.log("DB Module: Created new pool for production.");
} else {
    // In development, use a global singleton
    if (!customGlobal[GLOBAL_PG_POOL_KEY]) {
        customGlobal[GLOBAL_PG_POOL_KEY] = new Pool(poolConfig);
        console.log("DB Module (Dev): Created new shared pool instance.");
    } else {
        console.log("DB Module (Dev): Reusing existing shared pool instance.");
    }
    pool = customGlobal[GLOBAL_PG_POOL_KEY]!;
}

// Optional: Listen for pool errors (good for logging)
pool.on('error', (err, client) => {
    console.error('DB Module: Unexpected error on idle client in pool', err);
    // You might want to add more sophisticated error handling or metrics here
});

// --- Export the Pool ---
// This is the single pool instance that all API routes will import and use.
export default pool;

// --- Optional: Helper function for querying (can add more features like transactions) ---
// This is a common pattern to centralize query execution and error handling
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<import('pg').QueryResult<T>> {
    if (!PG_HOST) { // Ensure config was loaded somewhat
        throw new Error("Database configuration is missing. Cannot execute query.");
    }
    const start = Date.now();
    try {
        const res = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        // console.log('DB Module: Executed query', { text, duration, rows: res.rowCount }); // Can be too verbose
        return res;
    } catch (error) {
        console.error('DB Module: Error executing query', { text, error });
        throw error; // Re-throw to be handled by the caller
    }
}

if (process.env.NODE_ENV !== 'production') {
    let shuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`DB Module (Dev): Received ${signal}. Attempting to close PostgreSQL pool...`);
        try {
            if (customGlobal[GLOBAL_PG_POOL_KEY]) {
                await customGlobal[GLOBAL_PG_POOL_KEY]!.end();
                console.log('DB Module (Dev): PostgreSQL pool closed successfully.');
                customGlobal[GLOBAL_PG_POOL_KEY] = undefined; // Clear global ref
            }
        } catch (err) {
            console.error('DB Module (Dev): Error closing PostgreSQL pool:', err);
        } finally {
            process.exit(0); // Exit after attempting to close
        }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}