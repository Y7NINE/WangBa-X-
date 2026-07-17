-- 网吧综合管理系统数据库初始化脚本

-- 区域表
CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price_per_hour DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 机器表
CREATE TABLE IF NOT EXISTS machines (
    id VARCHAR(20) PRIMARY KEY,
    area_id INT NOT NULL,
    position_x FLOAT,
    position_y FLOAT,
    ip_address VARCHAR(15),
    mac_address VARCHAR(17),
    status VARCHAR(20) DEFAULT 'offline',
    current_user_id INT,
    session_id INT,
    last_heartbeat TIMESTAMP,
    fault_type VARCHAR(50),
    fault_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id)
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    openid VARCHAR(100) UNIQUE,
    phone VARCHAR(15) UNIQUE,
    nickname VARCHAR(50) NOT NULL,
    avatar VARCHAR(255),
    balance DECIMAL(10,2) DEFAULT 0,
    bonus_balance DECIMAL(10,2) DEFAULT 0,
    credits INT DEFAULT 0,
    member_level VARCHAR(20) DEFAULT 'normal',
    total_spent INT DEFAULT 0,
    total_hours INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 员工表
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    phone VARCHAR(15),
    wechat_openid VARCHAR(100),
    is_on_duty BOOLEAN DEFAULT FALSE,
    current_area INT,
    max_tickets INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 故障类型表
CREATE TABLE IF NOT EXISTS fault_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL,
    default_priority VARCHAR(5) NOT NULL,
    timeout_minutes INT NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 故障工单表
CREATE TABLE IF NOT EXISTS fault_tickets (
    id VARCHAR(30) PRIMARY KEY,
    machine_id VARCHAR(20) NOT NULL,
    fault_type VARCHAR(50) NOT NULL,
    fault_category VARCHAR(20) NOT NULL,
    source VARCHAR(20) NOT NULL,
    priority VARCHAR(5) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reporter_id INT,
    reporter_type VARCHAR(10),
    description TEXT,
    player_action VARCHAR(20),
    handler_id INT,
    accepted_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution VARCHAR(50),
    resolution_note TEXT,
    new_machine_id VARCHAR(20),
    transferred_at TIMESTAMP,
    timeout_at TIMESTAMP,
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
);

-- 上机记录表
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    machine_id VARCHAR(20) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INT DEFAULT 0,
    amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    paused_at TIMESTAMP,
    paused_duration INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (machine_id) REFERENCES machines(id)
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    reference_id VARCHAR(100),
    description TEXT,
    operator_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 保洁任务表
CREATE TABLE IF NOT EXISTS cleaning_tasks (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    cleaner_id INT,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration INT,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
);

-- 交接班记录表
CREATE TABLE IF NOT EXISTS shift_handovers (
    id VARCHAR(30) PRIMARY KEY,
    outgoing_staff_id INT NOT NULL,
    incoming_staff_id INT NOT NULL,
    shift_type VARCHAR(10) NOT NULL,
    handover_time TIMESTAMP NOT NULL,
    expected_cash DECIMAL(10,2),
    actual_cash DECIMAL(10,2),
    cash_difference DECIMAL(10,2),
    cash_status VARCHAR(20) NOT NULL,
    inventory_status VARCHAR(20) NOT NULL,
    inventory_details JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    resolved_by INT,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 悬赏任务表
CREATE TABLE IF NOT EXISTS bounty_tasks (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    reward_type VARCHAR(20) NOT NULL,
    reward_amount INT NOT NULL,
    max_completions INT,
    conditions JSONB NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户任务进度表
CREATE TABLE IF NOT EXISTS user_task_progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    task_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress',
    progress INT DEFAULT 0,
    completed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES bounty_tasks(id),
    UNIQUE(user_id, task_id)
);

-- 积分记录表
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    reference_id VARCHAR(50),
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 徽章表
CREATE TABLE IF NOT EXISTS badges (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(20) NOT NULL,
    rarity VARCHAR(20) NOT NULL,
    border_color VARCHAR(20),
    animation VARCHAR(50),
    conditions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户徽章表
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id VARCHAR(50) NOT NULL,
    earned_at TIMESTAMP NOT NULL,
    is_displayed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (badge_id) REFERENCES badges(id),
    UNIQUE(user_id, badge_id)
);

-- 唤醒设置表
CREATE TABLE IF NOT EXISTS wake_up_configs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    machine_id VARCHAR(20) NOT NULL,
    wake_time TIME NOT NULL,
    headphone BOOLEAN DEFAULT TRUE,
    light_strip BOOLEAN DEFAULT TRUE,
    screen BOOLEAN DEFAULT TRUE,
    human_wake BOOLEAN DEFAULT FALSE,
    snooze_interval INT DEFAULT 5,
    max_snooze INT DEFAULT 2,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认数据

-- 默认区域
INSERT INTO areas (name, description, price_per_hour, sort_order) VALUES
('竞技区', '高端电竞设备，适合竞技玩家', 15.00, 1),
('休闲区', '舒适环境，适合休闲娱乐', 10.00, 2),
('包间', '独立空间，适合开黑', 20.00, 3);

-- 默认故障类型
INSERT INTO fault_types (id, name, category, default_priority, timeout_minutes, icon, description) VALUES
('mouse', '鼠标故障', 'peripheral', 'P2', 10, '🖱️', '鼠标不灵、双击、失灵等'),
('keyboard', '键盘故障', 'peripheral', 'P2', 10, '⌨️', '键盘失灵、按键卡住等'),
('headset', '耳机故障', 'peripheral', 'P2', 10, '🎧', '耳机没声音、杂音等'),
('monitor', '显示器故障', 'hardware', 'P1', 5, '🖥️', '显示器黑屏、闪烁、色差等'),
('network', '网络异常', 'network', 'P2', 10, '🌐', '网络卡顿、丢包、断线等'),
('slow', '机器卡顿', 'software', 'P3', 15, '💻', '运行缓慢、死机等'),
('overheat', '硬件过热', 'hardware', 'P1', 5, '🌡️', 'CPU/GPU温度过高'),
('bsod', '蓝屏', 'software', 'P1', 5, '💥', '系统蓝屏崩溃'),
('offline', '机器离线', 'hardware', 'P0', 2, '⚫', '机器断电或无响应'),
('other', '其他问题', 'other', 'P3', 15, '📝', '其他未列出的问题');

-- 默认管理员账号 (密码: admin123)
INSERT INTO staff (username, password, name, role) VALUES
('admin', '$2b$10$YourHashedPasswordHere', '系统管理员', 'admin');

-- 默认机器 (示例)
INSERT INTO machines (id, area_id, ip_address, status) VALUES
('A-01', 1, '192.168.1.101', 'offline'),
('A-02', 1, '192.168.1.102', 'offline'),
('A-03', 1, '192.168.1.103', 'offline'),
('A-04', 1, '192.168.1.104', 'offline'),
('A-05', 1, '192.168.1.105', 'offline'),
('B-01', 2, '192.168.1.201', 'offline'),
('B-02', 2, '192.168.1.202', 'offline'),
('B-03', 2, '192.168.1.203', 'offline'),
('B-04', 2, '192.168.1.204', 'offline'),
('B-05', 2, '192.168.1.205', 'offline');

-- 创建索引
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_machines_area ON machines(area_id);
CREATE INDEX idx_fault_tickets_status ON fault_tickets(status);
CREATE INDEX idx_fault_tickets_priority ON fault_tickets(priority);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_machine ON sessions(machine_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
