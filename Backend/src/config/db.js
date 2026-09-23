require("dotenv").config();
const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
};

const createDatabaseIfMissing = async () => {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error("MySQL env variables are not configured.");
  }

  const baseConnection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await baseConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  } finally {
    await baseConnection.end();
  }
};

const pool = mysql.createPool(dbConfig);

const ensureColumn = async (tableName, columnName, columnDefinition) => {
  const [result] = await pool.query(
    `SELECT COUNT(*) AS columnCount
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    [tableName, columnName]
  );

  if (result[0].columnCount > 0) {
    return;
  }

  await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
};

const initializeDatabase = async () => {
  await createDatabaseIfMissing();

  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) UNIQUE,
      username VARCHAR(100) UNIQUE,
      name VARCHAR(100),
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(50),
      role VARCHAR(50) DEFAULT 'Customer',
      password VARCHAR(255),
      street_address TEXT,
      city VARCHAR(100),
      district VARCHAR(100),
      state VARCHAR(100),
      country VARCHAR(100) DEFAULT 'India',
      zip_code VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50),
      catId VARCHAR(50) UNIQUE,
      name VARCHAR(120),
      description TEXT,
      status VARCHAR(20) DEFAULT 'Active',
      catType VARCHAR(50) DEFAULT 'Expensive',
      subcategory JSON,
      images JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS income (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      remaining_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      category VARCHAR(100) NOT NULL,
      income_date DATE NOT NULL,
      payment_method VARCHAR(100),
      notes TEXT,
      recurring ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
      attachment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS transfers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      remaining_amount DECIMAL(12,2) DEFAULT NULL,
      source_income_id INT NULL,
      category VARCHAR(100) NOT NULL,
      transfer_from VARCHAR(100) NOT NULL,
      transfer_to VARCHAR(100) NOT NULL,
      transfer_date DATE NOT NULL,
      payment_method VARCHAR(100),
      notes TEXT,
      receipt VARCHAR(500) NULL,
      created_by VARCHAR(50) NULL,
      updated_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NULL,
      title VARCHAR(255) NOT NULL,
      expense_amount DECIMAL(12,2) NOT NULL,
      transfer_amount DECIMAL(12,2) DEFAULT NULL,
      transfer_id INT NULL,
      remaining_amount DECIMAL(12,2) DEFAULT NULL,
      category VARCHAR(100) NOT NULL,
      payment_method VARCHAR(100) DEFAULT 'Cash',
      expense_date DATE NOT NULL,
      expense_time TIME NULL,
      notes TEXT,
      recurring ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
      attachment TEXT,
      created_by VARCHAR(50) NULL,
      updated_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS memories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      category_id INT NULL,
      category_name VARCHAR(120) NULL,
      category_color VARCHAR(30) DEFAULT '#8B5CF6',
      memory_date DATE NOT NULL,
      location VARCHAR(255) NULL,
      mood VARCHAR(80) DEFAULT 'Happy',
      tags JSON NULL,
      status ENUM('published', 'draft') DEFAULT 'published',
      is_favorite BOOLEAN DEFAULT FALSE,
      media_url VARCHAR(500) NULL,
      media_gallery JSON NULL,
      media_type VARCHAR(50) DEFAULT 'image',
      voice_note TEXT NULL,
      created_by VARCHAR(50) NULL,
      updated_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_memory_user_date (user_id, memory_date),
      KEY idx_memory_category (category_id),
      CONSTRAINT fk_memory_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_memory_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS calendar_events (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      start_date DATE NOT NULL,
      start_time TIME NULL,
      end_date DATE NULL,
      end_time TIME NULL,
      all_day BOOLEAN DEFAULT FALSE,
      location VARCHAR(255) NULL,
      description TEXT NULL,
      priority VARCHAR(20) DEFAULT 'Medium',
      color VARCHAR(30) DEFAULT '#7C3AED',
      reminder VARCHAR(80) DEFAULT '15 minutes before',
      repeat_option VARCHAR(20) DEFAULT 'None',
      attachment VARCHAR(500) NULL,
      status VARCHAR(30) DEFAULT 'Upcoming',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS calendar_reminders (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      reminder_date DATE NOT NULL,
      reminder_time TIME NULL,
      priority VARCHAR(20) DEFAULT 'Medium',
      notes TEXT NULL,
      related_event VARCHAR(64) NULL,
      notification_enabled BOOLEAN DEFAULT TRUE,
      repeat_option VARCHAR(20) DEFAULT 'None',
      status VARCHAR(30) DEFAULT 'Pending',
      completed_at TIMESTAMP NULL,
      snoozed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS diary_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT NOT NULL,
      category_id INT NULL,
      category_name VARCHAR(120) NULL,
      mood VARCHAR(50) DEFAULT 'Normal',
      tags JSON NULL,
      location VARCHAR(255) NULL,
      entry_date DATE NOT NULL,
      entry_time TIME NULL,
      status ENUM('published', 'draft') DEFAULT 'published',
      is_favorite BOOLEAN DEFAULT FALSE,
      is_private BOOLEAN DEFAULT FALSE,
      is_locked BOOLEAN DEFAULT FALSE,
      image_path VARCHAR(500) NULL,
      video_path VARCHAR(500) NULL,
      audio_path VARCHAR(500) NULL,
      file_path VARCHAR(500) NULL,
      media_files JSON NULL,
      created_by VARCHAR(50) NULL,
      updated_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_diary_user_date (user_id, entry_date),
      KEY idx_diary_category (category_id),
      CONSTRAINT fk_diary_entry_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_diary_entry_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )`
  ];

  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  try {
    const [memoryTable] = await pool.query("SHOW CREATE TABLE memories");
    const createSql = memoryTable[0]?.["Create Table"] || "";

    if (createSql && createSql.includes("REFERENCES `memory_categories`")) {
      await pool.query("SET FOREIGN_KEY_CHECKS = 0");
      try {
        await pool.query("ALTER TABLE memories DROP FOREIGN KEY fk_memory_category");
      } catch (error) {
        // Ignore missing foreign key during migration.
      }

      try {
        await pool.query("ALTER TABLE memories DROP INDEX idx_memory_category");
      } catch (error) {
        // Ignore missing index during migration.
      }

      await pool.query("ALTER TABLE memories MODIFY COLUMN category_id INT NULL");
      await pool.query("ALTER TABLE memories ADD CONSTRAINT fk_memory_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL");
      await pool.query("ALTER TABLE memories ADD INDEX idx_memory_category (category_id)");
      await pool.query("SET FOREIGN_KEY_CHECKS = 1");
    }
  } catch (error) {
    // Ignore if the table does not exist yet.
  }

  const staleTables = [
    "reviews",
    "order_items",
    "order_addresses",
    "memory_albums",
    "memory_categories",
    "diary_categories",
    "diary_attachments"
  ];

  try {
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const tableName of staleTables) {
      await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
  } finally {
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  }

  await ensureColumn("memories", "media_gallery", "JSON NULL");
  await ensureColumn("memories", "media_type", "VARCHAR(50) DEFAULT 'image'");
  await ensureColumn("memories", "voice_note", "TEXT NULL");
  await ensureColumn("memories", "category_name", "VARCHAR(120) NULL");
  await ensureColumn("memories", "category_color", "VARCHAR(30) DEFAULT '#8B5CF6'");
  await ensureColumn("income", "user_id", "VARCHAR(50) NULL");
  await ensureColumn("income", "created_by", "VARCHAR(50) NULL");
  await ensureColumn("income", "updated_by", "VARCHAR(50) NULL");
  await ensureColumn("expenses", "user_id", "VARCHAR(50) NULL");
  await ensureColumn("expenses", "transfer_id", "INT NULL");
  await ensureColumn("expenses", "expense_time", "TIME NULL");
  await ensureColumn("expenses", "created_by", "VARCHAR(50) NULL");
  await ensureColumn("expenses", "updated_by", "VARCHAR(50) NULL");
  await ensureColumn("expenses", "updated_at", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  await ensureColumn("transfers", "user_id", "VARCHAR(50) NULL");
  await ensureColumn("transfers", "created_by", "VARCHAR(50) NULL");
  await ensureColumn("transfers", "updated_by", "VARCHAR(50) NULL");
  await ensureColumn("transfers", "updated_at", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  await ensureColumn("transfers", "remaining_amount", "DECIMAL(12,2) DEFAULT NULL");
  await ensureColumn("transfers", "receipt", "VARCHAR(500) NULL");

  await pool.query(
    "UPDATE income SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL"
  );
  await pool.query(
    "UPDATE income SET updated_by = user_id WHERE updated_by IS NULL AND user_id IS NOT NULL"
  );
  await pool.query(
    "UPDATE expenses SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL"
  );
  await pool.query(
    "UPDATE expenses SET updated_by = user_id WHERE updated_by IS NULL AND user_id IS NOT NULL"
  );
  await pool.query(
    "UPDATE expenses SET expense_time = TIME(created_at) WHERE expense_time IS NULL AND created_at IS NOT NULL"
  );
  await pool.query(
    "UPDATE transfers SET created_by = user_id WHERE created_by IS NULL AND user_id IS NOT NULL"
  );
  await pool.query(
    "UPDATE transfers SET updated_by = user_id WHERE updated_by IS NULL AND user_id IS NOT NULL"
  );

  const [incomeBalanceColumn] = await pool.query(
    `SELECT COUNT(*) AS columnCount
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'income'
       AND column_name = 'remaining_amount'`
  );

  if (incomeBalanceColumn[0].columnCount === 0) {
    await pool.query(
      "ALTER TABLE income ADD COLUMN remaining_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER amount"
    );
  }

  await pool.query(
    "UPDATE income SET remaining_amount = amount WHERE remaining_amount IS NULL OR remaining_amount = 0"
  );

  const [transferSourceColumn] = await pool.query(
    `SELECT COUNT(*) AS columnCount
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'transfers'
       AND column_name = 'source_income_id'`
  );

  if (transferSourceColumn[0].columnCount === 0) {
    await pool.query(
      "ALTER TABLE transfers ADD COLUMN source_income_id INT NULL AFTER amount"
    );
  }

  const [categoryStatusColumn] = await pool.query(
    `SELECT COUNT(*) AS columnCount
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'categories'
       AND column_name = 'status'`
  );

  if (categoryStatusColumn[0].columnCount === 0) {
    await pool.query(
      "ALTER TABLE categories ADD COLUMN status VARCHAR(20) DEFAULT 'Active' AFTER description"
    );
  }

  const [categoryTypeColumn] = await pool.query(
    `SELECT COUNT(*) AS columnCount
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'categories'
       AND column_name = 'catType'`
  );

  if (categoryTypeColumn[0].columnCount === 0) {
    await pool.query(
      "ALTER TABLE categories ADD COLUMN catType VARCHAR(50) DEFAULT 'Expensive' AFTER status"
    );
  }

  const [transferPaymentColumn] = await pool.query(
    `SELECT COUNT(*) AS columnCount
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'transfers'
       AND column_name = 'payment_method'`
  );

  if (transferPaymentColumn[0].columnCount === 0) {
    await pool.query(
      "ALTER TABLE transfers ADD COLUMN payment_method VARCHAR(100) AFTER transfer_date"
    );
  }

  try {
    const [diaryEntryTable] = await pool.query("SHOW CREATE TABLE diary_entries");
    const createSql = diaryEntryTable[0]?.['Create Table'] || "";
    if (createSql && createSql.includes("REFERENCES `diary_categories`")) {
      await pool.query("ALTER TABLE diary_entries DROP FOREIGN KEY fk_diary_entry_category");
      await pool.query("ALTER TABLE diary_entries DROP INDEX idx_diary_category");
      await pool.query("ALTER TABLE diary_entries DROP COLUMN category_id");
      await pool.query("ALTER TABLE diary_entries ADD COLUMN category_id INT NULL");
      await pool.query("ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_entry_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL");
      await pool.query("ALTER TABLE diary_entries ADD INDEX idx_diary_category (category_id)");
    }

    await ensureColumn("diary_entries", "category_name", "VARCHAR(120) NULL");
    await ensureColumn("diary_entries", "image_path", "VARCHAR(500) NULL");
    await ensureColumn("diary_entries", "video_path", "VARCHAR(500) NULL");
    await ensureColumn("diary_entries", "audio_path", "VARCHAR(500) NULL");
    await ensureColumn("diary_entries", "file_path", "VARCHAR(500) NULL");
    await ensureColumn("diary_entries", "media_files", "JSON NULL");
  } catch (error) {
    // Ignore if diary table does not exist yet; the initial CREATE TABLE handles it.
  }

  const auditTables = [
    { table: 'users', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'categories', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'income', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'transfers', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'expenses', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'memories', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] }
  ];

  for (const { table, columns } of auditTables) {
    for (const [columnName, columnDefinition] of columns) {
      await ensureColumn(table, columnName, columnDefinition);
    }
  }

  return pool;
};

module.exports = pool;
module.exports.initializeDatabase = initializeDatabase;