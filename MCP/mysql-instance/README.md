# MySQL Instance MCP Server

一个基于 Model Context Protocol (MCP) 的 MySQL 实例管理服务器，可以管理整个 MySQL 实例，而不仅仅是单个数据库。

## 特性

- 管理整个 MySQL 实例，无需预先指定数据库
- 动态切换数据库
- 跨数据库查询
- 实例级别的信息查询
- 用户和进程管理

## 配置

**通用配置格式**:
```json
{
  "mcpServers": {
    "mysql-instance": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/MCP/mysql-instance/src/index.ts"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password"
      }
    }
  }
}
```

**配置说明**:
- `command`: 运行服务器的命令（`node`）
- `args`: 服务器脚本的绝对路径
- `env`: 数据库连接环境变量（注意：不需要指定 MYSQL_DATABASE）

### 环境变量配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `MYSQL_HOST` | MySQL 主机地址 | `localhost` |
| `MYSQL_PORT` | MySQL 端口 | `3306` |
| `MYSQL_USER` | MySQL 用户名 | `root` |
| `MYSQL_PASSWORD` | MySQL 密码 | `""` |
| `MYSQL_DATABASE` | 默认数据库（可选） | 无 |

## 可用工具

### 数据库管理
- `list_databases`: 列出所有数据库
- `use_database`: 切换到指定数据库
- `get_current_database`: 获取当前数据库名称
- `create_database`: 创建新数据库
- `drop_database`: 删除数据库

### 表管理
- `list_tables`: 列出当前数据库的所有表
- `describe_table`: 描述表结构
- `show_create_table`: 显示表的创建语句
- `create_table`: 创建新表
- `drop_table`: 删除表

### 查询操作
- `read_query`: 执行只读查询（SELECT, SHOW, DESCRIBE, EXPLAIN）
- `write_query`: 执行写入操作（INSERT, UPDATE, DELETE, DDL）

### 实例管理
- `instance_info`: 获取 MySQL 实例信息
- `list_users`: 列出所有 MySQL 用户
- `show_processlist`: 显示当前运行的 MySQL 进程

## 安装

```bash
cd /Users/vison.cao/Documents/Kilo-Code/MCP/mysql-instance
npm install
```

## 使用示例

1. **列出所有数据库**
   ```
   Call tool: list_databases
   ```

2. **切换到特定数据库**
   ```
   Call tool: use_database with database="your_database"
   ```

3. **列出当前数据库的表**
   ```
   Call tool: list_tables
   ```

4. **执行查询**
   ```
   Call tool: read_query with sql="SELECT * FROM users LIMIT 10"
   ```

5. **跨数据库查询**
   ```
   Call tool: read_query with database="other_db" and sql="SELECT * FROM products"
   ```

6. **获取实例信息**
   ```
   Call tool: instance_info
   ```

## 与 mysql-server 的区别

| 特性 | mysql-server | mysql-instance |
|------|--------------|----------------|
| 数据库范围 | 单个数据库 | 整个实例 |
| 数据库切换 | 不支持 | 支持 |
| 跨数据库查询 | 不支持 | 支持 |
| 实例管理 | 基础 | 全面 |
| 用户管理 | 不支持 | 支持 |
| 进程管理 | 不支持 | 支持 |