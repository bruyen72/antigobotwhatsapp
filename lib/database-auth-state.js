// Auth state persistente usando PostgreSQL/Redis
import { createClient } from 'redis';
import pkg from 'pg';
const { Pool } = pkg;

let redisClient = null;
let pgPool = null;

// Inicializar conexões
export async function initializeDatabase() {
  try {
    // Redis para cache rápido
    if (process.env.REDIS_URL) {
      redisClient = createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
      console.log('✅ Redis conectado');
    } else {
      console.log('⚠️ Redis não configurado, usando apenas memória');
    }

    // PostgreSQL para persistência
    if (process.env.DATABASE_URL) {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Criar tabela se não existir
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
          session_id VARCHAR(255) PRIMARY KEY,
          creds JSONB,
          keys JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ PostgreSQL conectado e tabela criada');
    } else {
      console.log('⚠️ PostgreSQL não configurado, usando apenas memória local');
    }

    if (!redisClient && !pgPool) {
      console.log('📝 Modo desenvolvimento: usando auth state em memória');
    }

  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    console.log('🔄 Continuando sem banco de dados (modo fallback)');
  }
}

// Auth state personalizado usando banco
export function createDatabaseAuthState(sessionId) {
  let creds = null;
  let keys = {};

  return {
    state: {
      creds: new Proxy({}, {
        get: (target, prop) => {
          if (creds && creds[prop] !== undefined) {
            return creds[prop];
          }
          return target[prop];
        },
        set: (target, prop, value) => {
          if (!creds) creds = {};
          creds[prop] = value;
          target[prop] = value;
          return true;
        }
      }),
      keys: new Proxy({}, {
        get: (target, prop) => {
          return keys[prop] || target[prop];
        },
        set: (target, prop, value) => {
          keys[prop] = value;
          target[prop] = value;
          return true;
        }
      })
    },

    saveCreds: async () => {
      try {
        const sessionData = {
          session_id: sessionId,
          creds: creds,
          keys: keys,
          updated_at: new Date()
        };

        // Salvar no Redis para acesso rápido
        if (redisClient) {
          await redisClient.setex(
            `whatsapp:${sessionId}`,
            3600, // 1 hora
            JSON.stringify(sessionData)
          );
        }

        // Salvar no PostgreSQL para persistência
        if (pgPool) {
          await pgPool.query(`
            INSERT INTO whatsapp_sessions (session_id, creds, keys, updated_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (session_id)
            DO UPDATE SET
              creds = $2,
              keys = $3,
              updated_at = $4
          `, [sessionId, JSON.stringify(creds), JSON.stringify(keys), new Date()]);
        }

        console.log(`💾 Auth state salvo para sessão: ${sessionId}`);

      } catch (error) {
        console.error(`❌ Erro ao salvar auth state ${sessionId}:`, error);
      }
    },

    loadCreds: async () => {
      try {
        // Tentar carregar do Redis primeiro
        if (redisClient) {
          const cached = await redisClient.get(`whatsapp:${sessionId}`);
          if (cached) {
            const data = JSON.parse(cached);
            creds = data.creds;
            keys = data.keys;
            console.log(`📥 Auth state carregado do Redis: ${sessionId}`);
            return;
          }
        }

        // Carregar do PostgreSQL se não está no Redis
        if (pgPool) {
          const result = await pgPool.query(
            'SELECT creds, keys FROM whatsapp_sessions WHERE session_id = $1',
            [sessionId]
          );

          if (result.rows.length > 0) {
            const row = result.rows[0];
            creds = typeof row.creds === 'string' ? JSON.parse(row.creds) : row.creds;
            keys = typeof row.keys === 'string' ? JSON.parse(row.keys) : row.keys;
            console.log(`📥 Auth state carregado do PostgreSQL: ${sessionId}`);

            // Cachear no Redis para próximas consultas
            if (redisClient) {
              await redisClient.setex(
                `whatsapp:${sessionId}`,
                3600,
                JSON.stringify({ session_id: sessionId, creds, keys })
              );
            }
          }
        }

      } catch (error) {
        console.error(`❌ Erro ao carregar auth state ${sessionId}:`, error);
      }
    },

    clearCreds: async () => {
      try {
        // Limpar do Redis
        if (redisClient) {
          await redisClient.del(`whatsapp:${sessionId}`);
        }

        // Limpar do PostgreSQL
        if (pgPool) {
          await pgPool.query(
            'DELETE FROM whatsapp_sessions WHERE session_id = $1',
            [sessionId]
          );
        }

        creds = null;
        keys = {};
        console.log(`🗑️ Auth state limpo para sessão: ${sessionId}`);

      } catch (error) {
        console.error(`❌ Erro ao limpar auth state ${sessionId}:`, error);
      }
    }
  };
}

// Função para listar todas as sessões
export async function getAllSessionsFromDB() {
  if (!pgPool) return [];

  try {
    const result = await pgPool.query(`
      SELECT session_id, created_at, updated_at
      FROM whatsapp_sessions
      ORDER BY updated_at DESC
    `);

    return result.rows.map(row => ({
      id: row.session_id,
      createdAt: row.created_at,
      lastActivity: row.updated_at
    }));

  } catch (error) {
    console.error('❌ Erro ao listar sessões do DB:', error);
    return [];
  }
}

// Cleanup de sessões antigas
export async function cleanupOldSessions() {
  if (!pgPool) return;

  try {
    const result = await pgPool.query(`
      DELETE FROM whatsapp_sessions
      WHERE updated_at < NOW() - INTERVAL '7 days'
      RETURNING session_id
    `);

    if (result.rowCount > 0) {
      console.log(`🧹 Removidas ${result.rowCount} sessões antigas do banco`);
    }

    // Limpar do Redis também
    if (redisClient) {
      const deletedSessions = result.rows;
      for (const session of deletedSessions) {
        await redisClient.del(`whatsapp:${session.session_id}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro no cleanup de sessões:', error);
  }
}

// Graceful shutdown
export async function closeDatabaseConnections() {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('🔌 Redis desconectado');
    }

    if (pgPool) {
      await pgPool.end();
      console.log('🔌 PostgreSQL desconectado');
    }
  } catch (error) {
    console.error('❌ Erro ao fechar conexões:', error);
  }
}