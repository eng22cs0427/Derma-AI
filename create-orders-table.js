const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number VARCHAR(100) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        items JSONB NOT NULL DEFAULT '[]',
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        tax DECIMAL(12,2) NOT NULL DEFAULT 0,
        shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'Credit Card',
        payment_status VARCHAR(50) DEFAULT 'Paid',
        order_status VARCHAR(50) DEFAULT 'Confirmed',
        delivery_address JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    `);
    console.log('Orders table created successfully!');
  } catch (error) {
    console.error('Error creating orders table:', error);
  } finally {
    await pool.end();
  }
}

createTable();
