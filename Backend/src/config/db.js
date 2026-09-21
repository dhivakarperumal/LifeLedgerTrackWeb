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
    )`
  ];

  for (const statement of schemaStatements) {
    await pool.query(statement);
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

  return pool;
};

module.exports = pool;
module.exports.initializeDatabase = initializeDatabase;