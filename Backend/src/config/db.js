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
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      description TEXT,
      category VARCHAR(120),
      subcategory VARCHAR(255),
      mrp DECIMAL(10,2),
      offer VARCHAR(50),
      offer_price DECIMAL(10,2),
      total_stock INT DEFAULT 0,
      rating DECIMAL(3,2),
      status VARCHAR(50),
      material VARCHAR(120),
      wash_care TEXT,
      saree_length VARCHAR(80),
      blouse_length VARCHAR(80),
      top_length VARCHAR(80),
      bottom_length VARCHAR(80),
      dupatta_length VARCHAR(80),
      gown_length VARCHAR(80),
      sleeve_type VARCHAR(80),
      neck_type VARCHAR(80),
      fit_type VARCHAR(80),
      work_type VARCHAR(120),
      zari_color VARCHAR(80),
      variants JSON,
      product_code VARCHAR(100),
      price DECIMAL(10,2),
      age VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50),
      image TEXT,
      mobile_image TEXT,
      title VARCHAR(255),
      subtitle VARCHAR(255),
      description TEXT,
      link VARCHAR(255),
      type VARCHAR(50) DEFAULT 'hero',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50),
      videoId VARCHAR(120),
      title VARCHAR(255),
      thumbnail TEXT,
      type VARCHAR(50) DEFAULT 'youtube',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS dealers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      contact VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      location VARCHAR(255),
      image TEXT,
      rating DECIMAL(3,2),
      orders INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT,
      user_id INT,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      rating INT,
      comment TEXT,
      review_image TEXT,
      status VARCHAR(50) DEFAULT 'Pending',
      admin_reply TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cart (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50),
      product_id INT,
      variant_color VARCHAR(100),
      variant_size VARCHAR(100),
      image TEXT,
      quantity INT DEFAULT 1,
      email VARCHAR(255),
      price DECIMAL(10,2),
      total_price DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS wishlist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50),
      product_id INT,
      variant_color VARCHAR(100),
      variant_size VARCHAR(100),
      image TEXT,
      email VARCHAR(255),
      price DECIMAL(10,2),
      total_price DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50),
      total_amount DECIMAL(10,2),
      subtotal DECIMAL(10,2),
      order_type VARCHAR(50),
      payment_method VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Order Placed',
      customer_name VARCHAR(255),
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS income (
      id INT AUTO_INCREMENT PRIMARY KEY,
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
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      source_income_id INT NULL,
      category VARCHAR(100) NOT NULL,
      transfer_from VARCHAR(100) NOT NULL,
      transfer_to VARCHAR(100) NOT NULL,
      transfer_date DATE NOT NULL,
      payment_method VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      user_id VARCHAR(50),
      email VARCHAR(255),
      product_id INT,
      quantity INT,
      price DECIMAL(10,2),
      variant_color VARCHAR(100),
      variant_size VARCHAR(100),
      image TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS order_addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      user_id VARCHAR(50),
      customer_name VARCHAR(255),
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      street_address TEXT,
      city VARCHAR(100),
      district VARCHAR(100),
      state VARCHAR(100),
      country VARCHAR(100),
      zip_code VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      expense_amount DECIMAL(12,2) NOT NULL,
      transfer_amount DECIMAL(12,2) DEFAULT NULL,
      remaining_amount DECIMAL(12,2) DEFAULT NULL,
      category VARCHAR(100) NOT NULL,
      payment_method VARCHAR(100) DEFAULT 'Cash',
      expense_date DATE NOT NULL,
      notes TEXT,
      recurring ENUM('Yes', 'No') NOT NULL DEFAULT 'No',
      attachment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS memory_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      color VARCHAR(30) DEFAULT '#8B5CF6',
      created_by VARCHAR(50) NULL,
      updated_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_memory_category_user_name (user_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS memory_albums (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      cover_image VARCHAR(500) NULL,
      created_by VARCHAR(50) NULL,
      updated_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_memory_album_user_name (user_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS memories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      category_id INT NULL,
      album_id INT NULL,
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
      KEY idx_memory_album (album_id),
      CONSTRAINT fk_memory_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_memory_category FOREIGN KEY (category_id) REFERENCES memory_categories(id) ON DELETE SET NULL,
      CONSTRAINT fk_memory_album FOREIGN KEY (album_id) REFERENCES memory_albums(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS diary_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      name VARCHAR(120) NOT NULL,
      created_by VARCHAR(50) NULL,
      updated_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_diary_category_user_name (user_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS diary_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT NOT NULL,
      category_id INT NULL,
      mood VARCHAR(50) DEFAULT 'Normal',
      tags JSON NULL,
      location VARCHAR(255) NULL,
      entry_date DATE NOT NULL,
      entry_time TIME NULL,
      status ENUM('published', 'draft') DEFAULT 'published',
      is_favorite BOOLEAN DEFAULT FALSE,
      is_private BOOLEAN DEFAULT FALSE,
      is_locked BOOLEAN DEFAULT FALSE,
      created_by VARCHAR(50) NULL,
      updated_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_diary_user_date (user_id, entry_date),
      KEY idx_diary_category (category_id),
      CONSTRAINT fk_diary_entry_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_diary_entry_category FOREIGN KEY (category_id) REFERENCES diary_categories(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS diary_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      diary_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_type VARCHAR(100) NULL,
      file_size BIGINT DEFAULT 0,
      created_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_diary_attachment_diary (diary_id),
      CONSTRAINT fk_diary_attachment_entry FOREIGN KEY (diary_id) REFERENCES diary_entries(id) ON DELETE CASCADE
    )`
  ];

  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

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
    { table: 'products', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'banners', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'videos', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'dealers', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'reviews', columns: [
      ['user_id', 'INT NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'cart', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'wishlist', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'orders', columns: [
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
    { table: 'order_items', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'order_addresses', columns: [
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
    { table: 'memory_categories', columns: [
      ['user_id', 'VARCHAR(50) NULL'],
      ['created_by', 'VARCHAR(50) NULL'],
      ['updated_by', 'VARCHAR(50) NULL'],
      ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ] },
    { table: 'memory_albums', columns: [
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