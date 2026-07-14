const path = require('node:path');
const config = require('../config');
const { pool, query } = require('./postgres');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const GUILDS_DIR = path.join(DATA_DIR, 'guilds');
const TICKETS_DIR = path.join(DATA_DIR, 'tickets');
const TRANSCRIPTS_DIR = path.join(DATA_DIR, 'transcripts');

function getDefaultSystemData() {
  return {
    ownerId: null,
    ownerPasswordHash: null,
    ownerCreatedAt: null,
    ownerRecoveredAt: null
  };
}

function getDefaultGuildData(guildId) {
  return {
    guildId,

    panel: {
      title: config.defaults.panelTitle,
      description: config.defaults.panelDescription,
      imageUrl: '',
      bannerUrl: '',
      accentColor: config.defaults.accentColor,

      pix: {
        type: 'email',
        key: ''
      },

      admins: [],
      staffRoles: [],
      managerRoles: [],
      pingRoleId: null,

      buttons: [
        {
          id: 'suporte',
          label: 'Suporte',
          style: 2
        }
      ],

      selectMenus: [
        {
          id: 'atendimento',
          placeholder: 'Escolha o setor',
          options: [
            {
              value: 'financeiro',
              label: 'Financeiro',
              description: 'Dúvidas sobre cobrança e pagamento'
            },
            {
              value: 'suporte_tecnico',
              label: 'Suporte técnico',
              description: 'Problemas técnicos e atendimento geral'
            }
          ]
        }
      ]
    },

    logs: {
      channelId: null,
      transcriptChannelId: null
    },

    ticket: {
      categoryId: config.defaults.ticketCategoryId,
      lastPanelMessage: null,
      counter: 0
    },

    blacklist: []
  };
}

function mergeGuildData(guildId, data = {}) {
  const fallback = getDefaultGuildData(guildId);

  const merged = {
    ...fallback,
    ...data,

    panel: {
      ...fallback.panel,
      ...(data.panel || {}),

      pix: {
        ...fallback.panel.pix,
        ...(data.panel?.pix || {})
      }
    },

    logs: {
      ...fallback.logs,
      ...(data.logs || {})
    },

    ticket: {
      ...fallback.ticket,
      ...(data.ticket || {})
    }
  };

  if (!Array.isArray(merged.panel.buttons)) {
    merged.panel.buttons = [];
  }

  if (!Array.isArray(merged.panel.selectMenus)) {
    merged.panel.selectMenus = [];
  }

  if (!Array.isArray(merged.panel.admins)) {
    merged.panel.admins = [];
  }

  if (!Array.isArray(merged.panel.staffRoles)) {
    merged.panel.staffRoles = [];
  }

  if (!Array.isArray(merged.panel.managerRoles)) {
    merged.panel.managerRoles = [];
  }

  if (!Array.isArray(merged.blacklist)) {
    merged.blacklist = [];
  }

  if (
    !data.panel?.accentColor ||
    data.panel.accentColor === 0x5865F2
  ) {
    merged.panel.accentColor = config.defaults.accentColor;
  }

  return merged;
}

/*
 * Cria automaticamente as tabelas no Neon.
 * Você não precisa abrir o SQL Editor para criá-las manualmente.
 */
async function ensureBaseData() {
  await query(`
    CREATE TABLE IF NOT EXISTS system_data (
      id SMALLINT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      CONSTRAINT system_data_single_row
        CHECK (id = 1)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS guild_data (
      guild_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tickets (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      opened_by TEXT NOT NULL,
      source TEXT,
      extra_users JSONB NOT NULL DEFAULT '[]'::jsonb,
      claimed_by TEXT,
      closed_by TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ticket_number INTEGER NOT NULL
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS tickets_open_user_index
    ON tickets (guild_id, owner_id, status)
  `);

  await query(
    `
      INSERT INTO system_data (
        id,
        data
      )

      VALUES (
        1,
        $1::jsonb
      )

      ON CONFLICT (id) DO NOTHING
    `,
    [JSON.stringify(getDefaultSystemData())]
  );
}

async function getSystemData() {
  const result = await query(`
    SELECT data
    FROM system_data
    WHERE id = 1
  `);

  if (!result.rows[0]) {
    const fallback = getDefaultSystemData();
    await saveSystemData(fallback);
    return fallback;
  }

  return {
    ...getDefaultSystemData(),
    ...result.rows[0].data
  };
}

async function saveSystemData(data) {
  await query(
    `
      INSERT INTO system_data (
        id,
        data,
        updated_at
      )

      VALUES (
        1,
        $1::jsonb,
        NOW()
      )

      ON CONFLICT (id)
      DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `,
    [JSON.stringify(data)]
  );

  return data;
}

async function getGuildData(guildId) {
  const result = await query(
    `
      SELECT data
      FROM guild_data
      WHERE guild_id = $1
    `,
    [guildId]
  );

  const merged = mergeGuildData(
    guildId,
    result.rows[0]?.data || {}
  );

  await saveGuildData(guildId, merged);

  return merged;
}

async function saveGuildData(guildId, data) {
  const normalized = mergeGuildData(guildId, data);

  await query(
    `
      INSERT INTO guild_data (
        guild_id,
        data,
        updated_at
      )

      VALUES (
        $1,
        $2::jsonb,
        NOW()
      )

      ON CONFLICT (guild_id)
      DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `,
    [
      guildId,
      JSON.stringify(normalized)
    ]
  );

  return normalized;
}

function rowToTicket(row) {
  if (!row) {
    return null;
  }

  return {
    channelId: row.channel_id,
    guildId: row.guild_id,
    ownerId: row.owner_id,
    openedBy: row.opened_by,
    source: row.source,
    extraUsers: row.extra_users || [],
    claimedBy: row.claimed_by,
    closedBy: row.closed_by,
    status: row.status,

    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,

    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,

    ticketNumber: row.ticket_number
  };
}

async function createTicketRecord(data) {
  const result = await query(
    `
      INSERT INTO tickets (
        channel_id,
        guild_id,
        owner_id,
        opened_by,
        source,
        extra_users,
        claimed_by,
        closed_by,
        status,
        ticket_number
      )

      VALUES (
        $1,
        $2,
        $3,
        $3,
        $4,
        '[]'::jsonb,
        NULL,
        NULL,
        'open',
        $5
      )

      RETURNING *
    `,
    [
      data.channelId,
      data.guildId,
      data.ownerId,
      data.source,
      data.ticketNumber
    ]
  );

  return rowToTicket(result.rows[0]);
}

async function getTicketByChannelId(channelId) {
  const result = await query(
    `
      SELECT *
      FROM tickets
      WHERE channel_id = $1
    `,
    [channelId]
  );

  return rowToTicket(result.rows[0]);
}

async function updateTicket(channelId, patch) {
  const ticket = await getTicketByChannelId(channelId);

  if (!ticket) {
    return null;
  }

  const next = {
    ...ticket,
    ...patch
  };

  const result = await query(
    `
      UPDATE tickets

      SET
        guild_id = $2,
        owner_id = $3,
        opened_by = $4,
        source = $5,
        extra_users = $6::jsonb,
        claimed_by = $7,
        closed_by = $8,
        status = $9,
        ticket_number = $10,
        updated_at = NOW()

      WHERE channel_id = $1

      RETURNING *
    `,
    [
      channelId,
      next.guildId,
      next.ownerId,
      next.openedBy,
      next.source,
      JSON.stringify(next.extraUsers || []),
      next.claimedBy,
      next.closedBy,
      next.status,
      next.ticketNumber
    ]
  );

  return rowToTicket(result.rows[0]);
}

async function addExtraUserToTicket(channelId, userId) {
  const ticket = await getTicketByChannelId(channelId);

  if (!ticket) {
    return null;
  }

  if (!ticket.extraUsers.includes(userId)) {
    ticket.extraUsers.push(userId);

    await query(
      `
        UPDATE tickets

        SET
          extra_users = $2::jsonb,
          updated_at = NOW()

        WHERE channel_id = $1
      `,
      [
        channelId,
        JSON.stringify(ticket.extraUsers)
      ]
    );
  }

  return getTicketByChannelId(channelId);
}

async function findOpenTicketByUser(guildId, userId) {
  const result = await query(
    `
      SELECT *
      FROM tickets

      WHERE guild_id = $1
        AND owner_id = $2
        AND status = 'open'

      ORDER BY created_at DESC
      LIMIT 1
    `,
    [
      guildId,
      userId
    ]
  );

  return rowToTicket(result.rows[0]);
}

async function addUserToBlacklist(guildId, userId) {
  const guildData = await getGuildData(guildId);

  if (!guildData.blacklist.includes(userId)) {
    guildData.blacklist.push(userId);
    await saveGuildData(guildId, guildData);
  }

  return guildData;
}

async function incrementTicketCounter(guildId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        SELECT data
        FROM guild_data
        WHERE guild_id = $1
        FOR UPDATE
      `,
      [guildId]
    );

    const guildData = mergeGuildData(
      guildId,
      result.rows[0]?.data || {}
    );

    guildData.ticket.counter += 1;

    await client.query(
      `
        INSERT INTO guild_data (
          guild_id,
          data,
          updated_at
        )

        VALUES (
          $1,
          $2::jsonb,
          NOW()
        )

        ON CONFLICT (guild_id)
        DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = NOW()
      `,
      [
        guildId,
        JSON.stringify(guildData)
      ]
    );

    await client.query('COMMIT');

    return guildData.ticket.counter;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function setLastPanelMessage(guildId, data) {
  const guildData = await getGuildData(guildId);

  guildData.ticket.lastPanelMessage = data;

  await saveGuildData(guildId, guildData);

  return guildData.ticket.lastPanelMessage;
}

module.exports = {
  ROOT,
  DATA_DIR,
  GUILDS_DIR,
  TICKETS_DIR,
  TRANSCRIPTS_DIR,

  ensureBaseData,
  getSystemData,
  saveSystemData,
  getGuildData,
  saveGuildData,
  createTicketRecord,
  getTicketByChannelId,
  updateTicket,
  addExtraUserToTicket,
  findOpenTicketByUser,
  addUserToBlacklist,
  incrementTicketCounter,
  setLastPanelMessage
};
