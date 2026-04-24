const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'robot_choreographer',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function seed() {
  console.log('🌱 Seeding database...');

  // Drop tables
  await pool.query(`
    DROP TABLE IF EXISTS ai_results CASCADE;
    DROP TABLE IF EXISTS shifts CASCADE;
    DROP TABLE IF EXISTS maintenance CASCADE;
    DROP TABLE IF EXISTS collisions CASCADE;
    DROP TABLE IF EXISTS tasks CASCADE;
    DROP TABLE IF EXISTS operators CASCADE;
    DROP TABLE IF EXISTS zones CASCADE;
    DROP TABLE IF EXISTS robots CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  // Create tables
  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'operator',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE robots (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'idle',
      battery_level INTEGER DEFAULT 100,
      current_zone INTEGER,
      payload_capacity DECIMAL(10,2),
      speed DECIMAL(5,2),
      last_maintenance TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE zones (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      width DECIMAL(10,2),
      height DECIMAL(10,2),
      max_robots INTEGER DEFAULT 5,
      current_robots INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      priority INTEGER DEFAULT 1,
      status VARCHAR(50) DEFAULT 'pending',
      assigned_robot_id INTEGER REFERENCES robots(id) ON DELETE SET NULL,
      source_zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
      dest_zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
      payload_weight DECIMAL(10,2),
      deadline TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE collisions (
      id SERIAL PRIMARY KEY,
      robot1_id INTEGER REFERENCES robots(id) ON DELETE SET NULL,
      robot2_id INTEGER REFERENCES robots(id) ON DELETE SET NULL,
      zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
      severity VARCHAR(50) NOT NULL,
      description TEXT,
      resolved BOOLEAN DEFAULT false,
      resolution_notes TEXT,
      occurred_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE operators (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(100) NOT NULL,
      shift VARCHAR(50),
      certification_level VARCHAR(50),
      active BOOLEAN DEFAULT true,
      phone VARCHAR(50),
      hire_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE maintenance (
      id SERIAL PRIMARY KEY,
      robot_id INTEGER REFERENCES robots(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'scheduled',
      scheduled_date TIMESTAMP,
      completed_date TIMESTAMP,
      notes TEXT,
      cost DECIMAL(10,2),
      technician VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE shifts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
      zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
      robot_count INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE ai_results (
      id SERIAL PRIMARY KEY,
      feature VARCHAR(100) NOT NULL,
      input_summary TEXT,
      result TEXT,
      model_used VARCHAR(255),
      tokens_used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await pool.query(
    `INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)`,
    ['admin@robotchoreographer.com', hashedPassword, 'Admin User', 'admin']
  );
  console.log('✅ Users seeded');

  // Seed robots (15)
  const robots = [
    ['AGV-Alpha-01', 'AGV', 'active', 92, 1, 500, 2.5, '2024-12-15'],
    ['AGV-Alpha-02', 'AGV', 'active', 78, 3, 500, 2.5, '2024-12-20'],
    ['AGV-Beta-03', 'AGV', 'idle', 100, 10, 750, 2.0, '2025-01-05'],
    ['AMR-Scout-01', 'AMR', 'active', 65, 5, 300, 3.0, '2024-11-28'],
    ['AMR-Scout-02', 'AMR', 'active', 88, 7, 300, 3.0, '2025-01-10'],
    ['AMR-Hauler-03', 'AMR', 'charging', 23, 10, 450, 2.8, '2024-12-01'],
    ['Drone-Eye-01', 'Drone', 'active', 71, 2, 5, 5.0, '2025-01-15'],
    ['Drone-Eye-02', 'Drone', 'idle', 95, 8, 5, 5.0, '2024-12-28'],
    ['Forklift-Heavy-01', 'Forklift Bot', 'active', 84, 4, 2000, 1.5, '2024-11-15'],
    ['Forklift-Heavy-02', 'Forklift Bot', 'maintenance', 45, 11, 2000, 1.5, '2024-10-20'],
    ['Sorter-Fast-01', 'Sorting Bot', 'active', 90, 6, 50, 4.0, '2025-01-20'],
    ['Sorter-Fast-02', 'Sorting Bot', 'active', 82, 6, 50, 4.0, '2024-12-10'],
    ['Palletizer-01', 'Palletizer', 'active', 76, 4, 1500, 1.0, '2024-11-30'],
    ['Conveyor-Bot-01', 'Conveyor Bot', 'idle', 100, 9, 800, 1.8, '2025-01-25'],
    ['AGV-Gamma-04', 'AGV', 'offline', 12, 10, 500, 2.5, '2024-09-15'],
  ];
  for (const r of robots) {
    await pool.query(
      `INSERT INTO robots (name, type, status, battery_level, current_zone, payload_capacity, speed, last_maintenance) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]]
    );
  }
  console.log('✅ Robots seeded (15)');

  // Seed zones (15)
  const zones = [
    ['Receiving Dock A', 'Receiving', 30, 20, 6, 3, 'active', 'Main receiving area for inbound shipments'],
    ['Receiving Dock B', 'Receiving', 25, 15, 4, 1, 'active', 'Secondary receiving for oversized pallets'],
    ['Storage Aisle 1', 'Storage', 50, 8, 3, 2, 'active', 'High-density rack storage - general goods'],
    ['Storage Aisle 2', 'Storage', 50, 8, 3, 1, 'active', 'High-density rack storage - electronics'],
    ['Picking Zone Alpha', 'Picking', 40, 25, 8, 4, 'active', 'Primary order picking area'],
    ['Picking Zone Beta', 'Picking', 35, 20, 6, 2, 'active', 'Secondary picking for express orders'],
    ['Packing Station 1', 'Packing', 20, 15, 5, 3, 'active', 'Standard packaging operations'],
    ['Sorting Hub', 'Sorting', 30, 30, 10, 5, 'active', 'Central sorting for outbound orders'],
    ['Shipping Dock', 'Shipping', 35, 20, 6, 2, 'active', 'Outbound shipping and loading'],
    ['Charging Station A', 'Charging', 15, 10, 8, 4, 'active', 'Fast-charge bay for AGVs and AMRs'],
    ['Maintenance Bay', 'Maintenance', 20, 15, 4, 1, 'maintenance', 'Robot repair and maintenance facility'],
    ['Cold Storage', 'Storage', 25, 20, 3, 0, 'active', 'Temperature-controlled storage (-18°C)'],
    ['Hazmat Zone', 'Storage', 15, 10, 2, 1, 'restricted', 'Hazardous materials storage area'],
    ['QC Inspection', 'Inspection', 20, 15, 4, 2, 'active', 'Quality control and inspection area'],
    ['Buffer Zone', 'Buffer', 25, 25, 12, 3, 'active', 'Temporary staging area between operations'],
  ];
  for (const z of zones) {
    await pool.query(
      `INSERT INTO zones (name, type, width, height, max_robots, current_robots, status, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      z
    );
  }
  console.log('✅ Zones seeded (15)');

  // Seed tasks (15)
  const tasks = [
    ['Pick Order #4521', 'Pick', 5, 'in_progress', 1, 5, 7, 12.5, '2025-03-20 18:00'],
    ['Transport Pallet B-22', 'Transport', 3, 'pending', null, 1, 3, 450.0, '2025-03-20 20:00'],
    ['Sort Batch #891', 'Sort', 4, 'queued', 11, 8, 9, 25.0, '2025-03-20 16:00'],
    ['Pack Order #4518', 'Pack', 4, 'in_progress', 4, 5, 7, 8.3, '2025-03-20 17:30'],
    ['Recharge AMR-Hauler', 'Recharge', 2, 'in_progress', 6, 7, 10, 0, '2025-03-20 15:00'],
    ['Inspect Rack C-15', 'Inspect', 1, 'pending', null, 3, 14, 0, '2025-03-21 12:00'],
    ['Pick Order #4522', 'Pick', 5, 'pending', null, 6, 7, 22.0, '2025-03-20 19:00'],
    ['Transport Cold Goods', 'Transport', 5, 'queued', 9, 12, 9, 180.0, '2025-03-20 16:30'],
    ['Sort Returns Batch', 'Sort', 2, 'pending', null, 1, 8, 15.0, '2025-03-21 10:00'],
    ['Pack Fragile #4519', 'Pack', 5, 'in_progress', 5, 6, 7, 3.2, '2025-03-20 15:30'],
    ['Move Hazmat Container', 'Transport', 5, 'pending', null, 13, 11, 50.0, '2025-03-20 22:00'],
    ['Pick Express #4523', 'Pick', 5, 'queued', 2, 5, 7, 5.8, '2025-03-20 14:00'],
    ['Inventory Scan Zone 3', 'Inspect', 3, 'pending', null, 3, 3, 0, '2025-03-22 08:00'],
    ['Palletize Outbound', 'Pack', 4, 'queued', 13, 7, 9, 800.0, '2025-03-20 17:00'],
    ['Restock Picking Alpha', 'Transport', 3, 'pending', null, 3, 5, 320.0, '2025-03-20 23:00'],
  ];
  for (const t of tasks) {
    await pool.query(
      `INSERT INTO tasks (title, type, priority, status, assigned_robot_id, source_zone_id, dest_zone_id, payload_weight, deadline) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      t
    );
  }
  console.log('✅ Tasks seeded (15)');

  // Seed operators (15)
  const operators = [
    ['James Mitchell', 'j.mitchell@warehouse.com', 'Floor Supervisor', 'morning', 'Level 3', true, '555-0101', '2022-03-15'],
    ['Sarah Chen', 's.chen@warehouse.com', 'Robot Technician', 'morning', 'Level 4', true, '555-0102', '2021-06-20'],
    ['Mike Rodriguez', 'm.rodriguez@warehouse.com', 'Warehouse Operator', 'morning', 'Level 2', true, '555-0103', '2023-01-10'],
    ['Emily Watson', 'e.watson@warehouse.com', 'Safety Officer', 'morning', 'Level 3', true, '555-0104', '2022-08-05'],
    ['David Kim', 'd.kim@warehouse.com', 'Robot Technician', 'afternoon', 'Level 4', true, '555-0105', '2021-11-18'],
    ['Lisa Thompson', 'l.thompson@warehouse.com', 'Floor Supervisor', 'afternoon', 'Level 3', true, '555-0106', '2022-05-22'],
    ['Carlos Mendez', 'c.mendez@warehouse.com', 'Warehouse Operator', 'afternoon', 'Level 2', true, '555-0107', '2023-04-12'],
    ['Anna Kowalski', 'a.kowalski@warehouse.com', 'Systems Engineer', 'afternoon', 'Level 5', true, '555-0108', '2020-09-01'],
    ['Robert Johnson', 'r.johnson@warehouse.com', 'Warehouse Operator', 'night', 'Level 2', true, '555-0109', '2023-07-28'],
    ['Priya Patel', 'p.patel@warehouse.com', 'Robot Technician', 'night', 'Level 3', true, '555-0110', '2022-02-14'],
    ['Tom O\'Brien', 't.obrien@warehouse.com', 'Floor Supervisor', 'night', 'Level 3', true, '555-0111', '2021-12-03'],
    ['Yuki Tanaka', 'y.tanaka@warehouse.com', 'Data Analyst', 'morning', 'Level 4', true, '555-0112', '2022-10-09'],
    ['Marcus Brown', 'm.brown@warehouse.com', 'Warehouse Operator', 'morning', 'Level 1', false, '555-0113', '2024-01-15'],
    ['Sophie Martin', 's.martin@warehouse.com', 'Safety Officer', 'afternoon', 'Level 3', true, '555-0114', '2023-03-20'],
    ['Alex Nguyen', 'a.nguyen@warehouse.com', 'Systems Engineer', 'night', 'Level 5', true, '555-0115', '2020-06-15'],
  ];
  for (const o of operators) {
    await pool.query(
      `INSERT INTO operators (name, email, role, shift, certification_level, active, phone, hire_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      o
    );
  }
  console.log('✅ Operators seeded (15)');

  // Seed collisions (15)
  const collisions = [
    [1, 4, 5, 'minor', 'Glancing contact during parallel picking operation', true, 'Reduced speed limit in Zone 5 during peak hours', '2025-03-15 09:23:00'],
    [2, 5, 7, 'moderate', 'Near-miss at packing station entrance, emergency stop triggered', true, 'Added sensor waypoint at entrance', '2025-03-14 14:45:00'],
    [9, 13, 4, 'severe', 'Forklift bot collision with palletizer during turn', true, 'Implemented one-way traffic in Zone 4', '2025-03-12 11:30:00'],
    [11, 12, 6, 'minor', 'Sorting bots path overlap detected by proximity sensors', true, 'Updated sorting algorithm spacing', '2025-03-13 16:12:00'],
    [1, 6, 1, 'minor', 'AMR-Hauler entered AGV path at receiving dock', true, 'Added priority lanes for AGVs', '2025-03-10 08:55:00'],
    [7, 2, 2, 'moderate', 'Drone descended into AGV operating height', false, null, '2025-03-18 13:20:00'],
    [3, 14, 15, 'minor', 'Buffer zone congestion caused path conflict', true, 'Increased buffer zone capacity limit', '2025-03-11 10:40:00'],
    [4, 5, 5, 'minor', 'AMR scouts synchronized pickup conflict', true, 'Added task lock mechanism', '2025-03-09 15:33:00'],
    [9, 3, 3, 'severe', 'Forklift emergency stop to avoid stationary AGV', true, 'Added idle robot detection and rerouting', '2025-03-08 07:15:00'],
    [10, 6, 10, 'moderate', 'Forklift entered charging station while AMR charging', false, null, '2025-03-19 22:45:00'],
    [1, 2, 8, 'minor', 'AGVs converged at sorting hub entrance simultaneously', true, 'Implemented traffic light system', '2025-03-07 12:00:00'],
    [11, 4, 6, 'minor', 'Sorter and AMR path intersection in picking zone', true, 'Adjusted sorter route timing', '2025-03-06 09:18:00'],
    [7, 8, 14, 'minor', 'Drones altitude conflict during QC inspection', true, 'Established drone altitude zones', '2025-03-05 14:22:00'],
    [13, 9, 4, 'moderate', 'Palletizer backed into forklift during loading', false, null, '2025-03-20 06:30:00'],
    [2, 14, 9, 'minor', 'AGV and conveyor bot timing mismatch at shipping', true, 'Synced conveyor and AGV schedules', '2025-03-04 17:50:00'],
  ];
  for (const c of collisions) {
    await pool.query(
      `INSERT INTO collisions (robot1_id, robot2_id, zone_id, severity, description, resolved, resolution_notes, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      c
    );
  }
  console.log('✅ Collisions seeded (15)');

  // Seed maintenance (15)
  const maintenanceData = [
    [1, 'Battery Replacement', 'completed', '2024-12-15', '2024-12-15', 'Replaced lithium-ion battery pack', 850, 'Sarah Chen'],
    [2, 'Wheel Alignment', 'completed', '2024-12-20', '2024-12-20', 'Realigned all 4 drive wheels', 320, 'David Kim'],
    [3, 'Sensor Calibration', 'completed', '2025-01-05', '2025-01-05', 'Recalibrated LIDAR and proximity sensors', 450, 'Sarah Chen'],
    [4, 'Motor Overhaul', 'scheduled', '2025-03-25', null, 'Scheduled motor bearing replacement', 1200, 'Priya Patel'],
    [5, 'Software Update', 'completed', '2025-01-10', '2025-01-10', 'Updated navigation firmware v3.2.1', 150, 'Anna Kowalski'],
    [6, 'Battery Replacement', 'in_progress', '2025-03-20', null, 'Critical - battery below 25%', 850, 'David Kim'],
    [7, 'Propeller Check', 'completed', '2025-01-15', '2025-01-15', 'Inspected and balanced all rotors', 280, 'Priya Patel'],
    [8, 'Camera Replacement', 'scheduled', '2025-03-28', null, 'Front camera showing artifacts', 520, 'Sarah Chen'],
    [9, 'Hydraulic Service', 'completed', '2024-11-15', '2024-11-16', 'Full hydraulic system flush and refill', 1800, 'David Kim'],
    [10, 'Full Overhaul', 'in_progress', '2025-03-18', null, 'Complete rebuild - heavy use damage', 3500, 'Sarah Chen'],
    [11, 'Belt Tensioning', 'completed', '2025-01-20', '2025-01-20', 'Adjusted sorting belt tension and tracking', 200, 'Priya Patel'],
    [12, 'Sensor Calibration', 'scheduled', '2025-03-30', null, 'Quarterly sensor recalibration', 450, 'Anna Kowalski'],
    [13, 'Gripper Replacement', 'completed', '2024-11-30', '2024-12-01', 'Replaced worn gripper pads', 680, 'David Kim'],
    [14, 'Conveyor Belt Replace', 'scheduled', '2025-04-05', null, 'Belt showing wear at 80% life', 1100, 'Priya Patel'],
    [15, 'Emergency Diagnostic', 'completed', '2024-09-15', '2024-09-16', 'Diagnosed power system failure', 2200, 'Anna Kowalski'],
  ];
  for (const m of maintenanceData) {
    await pool.query(
      `INSERT INTO maintenance (robot_id, type, status, scheduled_date, completed_date, notes, cost, technician) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      m
    );
  }
  console.log('✅ Maintenance seeded (15)');

  // Seed shifts (15)
  const shifts = [
    ['Morning Alpha', '06:00', '14:00', 1, 5, 5, 'active', 'Primary picking operations'],
    ['Morning Bravo', '06:00', '14:00', 3, 1, 3, 'active', 'Receiving and unloading'],
    ['Morning Charlie', '07:00', '15:00', 4, 14, 2, 'active', 'Safety inspection rounds'],
    ['Afternoon Alpha', '14:00', '22:00', 5, 8, 6, 'active', 'Sorting and outbound processing'],
    ['Afternoon Bravo', '14:00', '22:00', 6, 7, 4, 'active', 'Packing operations'],
    ['Afternoon Charlie', '14:00', '22:00', 7, 9, 3, 'active', 'Shipping dock operations'],
    ['Night Alpha', '22:00', '06:00', 9, 3, 4, 'active', 'Overnight restocking'],
    ['Night Bravo', '22:00', '06:00', 10, 10, 2, 'active', 'Maintenance and charging'],
    ['Night Charlie', '22:00', '06:00', 11, 15, 3, 'active', 'Buffer zone management'],
    ['Weekend Morning', '06:00', '14:00', 12, 5, 4, 'scheduled', 'Weekend picking - reduced staff'],
    ['Weekend Afternoon', '14:00', '22:00', 14, 8, 3, 'scheduled', 'Weekend sorting operations'],
    ['Emergency Response', '00:00', '23:59', 8, 11, 2, 'standby', 'On-call for critical incidents'],
    ['Cold Storage Ops', '08:00', '16:00', 2, 12, 2, 'active', 'Temperature-controlled zone operations'],
    ['Hazmat Handling', '09:00', '17:00', 4, 13, 1, 'active', 'Hazardous materials shift'],
    ['QC Inspection', '07:00', '19:00', 12, 14, 3, 'active', 'Quality control shift'],
  ];
  for (const s of shifts) {
    await pool.query(
      `INSERT INTO shifts (name, start_time, end_time, operator_id, zone_id, robot_count, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      s
    );
  }
  console.log('✅ Shifts seeded (15)');

  console.log('\n🎉 Database seeded successfully!');
  console.log('📧 Login: admin@robotchoreographer.com / admin123\n');
  pool.end();
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  pool.end();
  process.exit(1);
});
