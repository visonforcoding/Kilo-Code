#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mysql from "mysql2/promise";

// 从环境变量获取数据库配置
const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || "3306");
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "wonfu_test";

// 创建 MySQL 连接池
const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false,
});

// 测试连接
async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error("MySQL connection failed:", error);
    return false;
  }
}

// 创建 MCP 服务器
const server = new McpServer({
  name: "mysql-server",
  version: "1.0.0",
});

// 工具: 执行只读查询
server.tool(
  "read_query",
  "Execute a read-only SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN)",
  {
    sql: z.string().describe("The SQL query to execute (read-only operations only)"),
  },
  async (args: any) => {
    try {
      const sql = args.sql;
      // 验证是否为只读操作
      const normalizedSql = sql.trim().toUpperCase();
      const readOnlyKeywords = ["SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN", "WITH"];
      const isReadOnly = readOnlyKeywords.some(keyword => normalizedSql.startsWith(keyword));
      
      if (!isReadOnly) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed. Use write_query for INSERT, UPDATE, DELETE, or DDL operations.",
            },
          ],
          isError: true,
        };
      }

      const [rows] = await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Query error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 执行写入操作
server.tool(
  "write_query",
  "Execute a write SQL query (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, etc.)",
  {
    sql: z.string().describe("The SQL query to execute (write operations)"),
  },
  async (args: any) => {
    try {
      const sql = args.sql;
      const [result] = await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Query error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 列出所有表
server.tool(
  "list_tables",
  "List all tables in the database",
  {},
  async () => {
    try {
      const [rows] = await pool.query("SHOW TABLES");
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing tables: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 描述表结构
server.tool(
  "describe_table",
  "Describe the structure of a table",
  {
    table: z.string().describe("The name of the table to describe"),
  },
  async (args: any) => {
    try {
      const table = args.table;
      const [rows] = await pool.query(`DESCRIBE ${mysql.escapeId(table)}`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error describing table: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 获取表的创建语句
server.tool(
  "show_create_table",
  "Show the CREATE TABLE statement for a table",
  {
    table: z.string().describe("The name of the table"),
  },
  async (args: any) => {
    try {
      const table = args.table;
      const [rows] = await pool.query(`SHOW CREATE TABLE ${mysql.escapeId(table)}`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error showing create table: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 获取数据库信息
server.tool(
  "database_info",
  "Get information about the current database",
  {},
  async () => {
    try {
      const [versionResult] = await pool.query("SELECT VERSION() as version");
      const [databaseResult] = await pool.query("SELECT DATABASE() as database");
      const [userResult] = await pool.query("SELECT USER() as user");
      
      const info = {
        version: (versionResult as any)[0].version,
        database: (databaseResult as any)[0].database,
        user: (userResult as any)[0].user,
        host: MYSQL_HOST,
        port: MYSQL_PORT,
      };
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting database info: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 列出所有数据库
server.tool(
  "list_databases",
  "List all databases accessible to the user",
  {},
  async () => {
    try {
      const [rows] = await pool.query("SHOW DATABASES");
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing databases: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 创建数据库
server.tool(
  "create_database",
  "Create a new database with UTF8 character set",
  {
    database: z.string().describe("The name of the database to create"),
    charset: z.string().optional().describe("Character set (default: utf8)"),
    collation: z.string().optional().describe("Collation (default: utf8_general_ci)"),
    ifNotExists: z.boolean().optional().describe("Use IF NOT EXISTS clause (default: true)"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      const charset = args.charset || "utf8";
      const collation = args.collation || "utf8_general_ci";
      const ifNotExists = args.ifNotExists !== undefined ? args.ifNotExists : true;
      
      let sql = `CREATE DATABASE `;
      if (ifNotExists) {
        sql += `IF NOT EXISTS `;
      }
      sql += `${mysql.escapeId(database)} CHARACTER SET ${charset} COLLATE ${collation}`;
      
      await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: `Database '${database}' created successfully with character set '${charset}' and collation '${collation}'.`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating database: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 创建表
server.tool(
  "create_table",
  "Create a new table with specified columns and options",
  {
    database: z.string().optional().describe("The database name (optional, uses current database if not specified)"),
    table: z.string().describe("The name of the table to create"),
    columns: z.string().describe("Column definitions (e.g., 'id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL')"),
    engine: z.string().optional().describe("Storage engine (default: InnoDB)"),
    charset: z.string().optional().describe("Character set (default: utf8)"),
    ifNotExists: z.boolean().optional().describe("Use IF NOT EXISTS clause (default: true)"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      const table = args.table;
      const columns = args.columns;
      const engine = args.engine || "InnoDB";
      const charset = args.charset || "utf8";
      const ifNotExists = args.ifNotExists !== undefined ? args.ifNotExists : true;
      
      let sql = `CREATE TABLE `;
      if (ifNotExists) {
        sql += `IF NOT EXISTS `;
      }
      
      if (database) {
        sql += `${mysql.escapeId(database)}.${mysql.escapeId(table)}`;
      } else {
        sql += `${mysql.escapeId(table)}`;
      }
      
      sql += ` (${columns}) ENGINE=${engine} DEFAULT CHARSET=${charset}`;
      
      await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: `Table '${table}' created successfully with engine '${engine}' and character set '${charset}'.`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating table: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 修改表结构
server.tool(
  "alter_table",
  "Alter table structure (ADD, MODIFY, CHANGE, DROP columns)",
  {
    database: z.string().optional().describe("The database name (optional, uses current database if not specified)"),
    table: z.string().describe("The name of the table to alter"),
    action: z.enum(["ADD", "MODIFY", "CHANGE", "DROP"]).describe("Action to perform: ADD, MODIFY, CHANGE, or DROP"),
    column: z.string().describe("Column definition or name (e.g., 'email VARCHAR(255)' for ADD/MODIFY, 'old_name new_name datatype' for CHANGE, or 'column_name' for DROP)"),
    position: z.string().optional().describe("Position clause (e.g., 'FIRST', 'AFTER other_column')"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      const table = args.table;
      const action = args.action;
      const column = args.column;
      const position = args.position;
      
      let sql = `ALTER TABLE `;
      if (database) {
        sql += `${mysql.escapeId(database)}.${mysql.escapeId(table)}`;
      } else {
        sql += `${mysql.escapeId(table)}`;
      }
      
      sql += ` ${action} COLUMN ${column}`;
      
      if (position) {
        sql += ` ${position}`;
      }
      
      await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: `Table '${table}' altered successfully. Action: ${action} COLUMN ${column}${position ? ' ' + position : ''}.`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error altering table: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 删除表
server.tool(
  "drop_table",
  "Drop a table from the database",
  {
    database: z.string().optional().describe("The database name (optional, uses current database if not specified)"),
    table: z.string().describe("The name of the table to drop"),
    ifExists: z.boolean().optional().describe("Use IF EXISTS clause (default: true)"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      const table = args.table;
      const ifExists = args.ifExists !== undefined ? args.ifExists : true;
      
      let sql = `DROP TABLE `;
      if (ifExists) {
        sql += `IF EXISTS `;
      }
      
      if (database) {
        sql += `${mysql.escapeId(database)}.${mysql.escapeId(table)}`;
      } else {
        sql += `${mysql.escapeId(table)}`;
      }
      
      await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: `Table '${table}' dropped successfully.`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error dropping table: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 工具: 删除数据库
server.tool(
  "drop_database",
  "Drop a database",
  {
    database: z.string().describe("The name of the database to drop"),
    ifExists: z.boolean().optional().describe("Use IF EXISTS clause (default: true)"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      const ifExists = args.ifExists !== undefined ? args.ifExists : true;
      
      let sql = `DROP DATABASE `;
      if (ifExists) {
        sql += `IF EXISTS `;
      }
      sql += `${mysql.escapeId(database)}`;
      
      await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: `Database '${database}' dropped successfully.`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error dropping database: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 启动服务器
async function main() {
  console.error(`Connecting to MySQL at ${MYSQL_HOST}:${MYSQL_PORT}...`);
  
  const connected = await testConnection();
  if (!connected) {
    console.error("Failed to connect to MySQL. Please check your configuration.");
    process.exit(1);
  }
  
  console.error(`Connected to MySQL database: ${MYSQL_DATABASE}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("MySQL MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});