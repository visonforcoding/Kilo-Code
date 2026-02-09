#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mysql from "mysql2/promise";

const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || "3306");
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "";

let currentDatabase: string | null = MYSQL_DATABASE || null;

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false,
});

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

const server = new McpServer({
  name: "mysql-instance",
  version: "1.0.0",
});

server.tool(
  "list_databases",
  "List all databases on the MySQL instance",
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
    } catch (error: any) {
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

server.tool(
  "use_database",
  "Switch to a specific database for subsequent queries",
  {
    database: z.string().describe("The name of the database to use"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      await pool.query(`USE ${mysql.escapeId(database)}`);
      currentDatabase = database;
      return {
        content: [
          {
            type: "text",
            text: `Switched to database: ${database}`,
          },
        ],
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error switching database: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_current_database",
  "Get the current database name",
  {},
  async () => {
    try {
      const [rows] = await pool.query("SELECT DATABASE() as database");
      const result = rows as any[];
      currentDatabase = result[0].database;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ currentDatabase: result[0].database }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting current database: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_tables",
  "List all tables in the current database",
  {
    database: z.string().optional().describe("Optional database name (uses current database if not specified)"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      let sql = "SHOW TABLES";
      if (database) {
        sql = `SHOW TABLES FROM ${mysql.escapeId(database)}`;
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
    } catch (error: any) {
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

server.tool(
  "describe_table",
  "Describe the structure of a table",
  {
    table: z.string().describe("The name of the table to describe"),
    database: z.string().optional().describe("Optional database name (uses current database if not specified)"),
  },
  async (args: any) => {
    try {
      const table = args.table;
      const database = args.database;
      let sql = `DESCRIBE ${mysql.escapeId(table)}`;
      if (database) {
        sql = `DESCRIBE ${mysql.escapeId(database)}.${mysql.escapeId(table)}`;
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
    } catch (error: any) {
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

server.tool(
  "show_create_table",
  "Show the CREATE TABLE statement for a table",
  {
    table: z.string().describe("The name of the table"),
    database: z.string().optional().describe("Optional database name (uses current database if not specified)"),
  },
  async (args: any) => {
    try {
      const table = args.table;
      const database = args.database;
      let sql = `SHOW CREATE TABLE ${mysql.escapeId(table)}`;
      if (database) {
        sql = `SHOW CREATE TABLE ${mysql.escapeId(database)}.${mysql.escapeId(table)}`;
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
    } catch (error: any) {
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

server.tool(
  "read_query",
  "Execute a read-only SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN)",
  {
    sql: z.string().describe("The SQL query to execute (read-only operations only)"),
    database: z.string().optional().describe("Optional database name (uses current database if not specified)"),
  },
  async (args: any) => {
    try {
      const sql = args.sql;
      const database = args.database;
      
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

      let querySql = sql;
      if (database) {
        await pool.query(`USE ${mysql.escapeId(database)}`);
      }
      
      const [rows] = await pool.query(querySql);
      
      if (database && currentDatabase) {
        await pool.query(`USE ${mysql.escapeId(currentDatabase)}`);
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error: any) {
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

server.tool(
  "write_query",
  "Execute a write SQL query (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, etc.)",
  {
    sql: z.string().describe("The SQL query to execute (write operations)"),
    database: z.string().optional().describe("Optional database name (uses current database if not specified)"),
  },
  async (args: any) => {
    try {
      const sql = args.sql;
      const database = args.database;
      
      if (database) {
        await pool.query(`USE ${mysql.escapeId(database)}`);
      }
      
      const [result] = await pool.query(sql);
      
      if (database && currentDatabase) {
        await pool.query(`USE ${mysql.escapeId(currentDatabase)}`);
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
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

server.tool(
  "create_database",
  "Create a new database",
  {
    database: z.string().describe("The name of the database to create"),
    charset: z.string().optional().describe("Character set (default: utf8mb4)"),
    collation: z.string().optional().describe("Collation (default: utf8mb4_unicode_ci)"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      const charset = args.charset || "utf8mb4";
      const collation = args.collation || "utf8mb4_unicode_ci";
      
      const sql = `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)} CHARACTER SET ${charset} COLLATE ${collation}`;
      await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: `Database '${database}' created successfully with character set '${charset}' and collation '${collation}'.`,
          },
        ],
      };
    } catch (error: any) {
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

server.tool(
  "drop_database",
  "Drop a database",
  {
    database: z.string().describe("The name of the database to drop"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      
      const sql = `DROP DATABASE IF EXISTS ${mysql.escapeId(database)}`;
      await pool.query(sql);
      
      if (currentDatabase === database) {
        currentDatabase = null;
      }
      
      return {
        content: [
          {
            type: "text",
            text: `Database '${database}' dropped successfully.`,
          },
        ],
      };
    } catch (error: any) {
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

server.tool(
  "create_table",
  "Create a new table with specified columns and options",
  {
    database: z.string().optional().describe("The database name (optional, uses current database if not specified)"),
    table: z.string().describe("The name of the table to create"),
    columns: z.string().describe("Column definitions (e.g., 'id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL')"),
    engine: z.string().optional().describe("Storage engine (default: InnoDB)"),
    charset: z.string().optional().describe("Character set (default: utf8mb4)"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      const table = args.table;
      const columns = args.columns;
      const engine = args.engine || "InnoDB";
      const charset = args.charset || "utf8mb4";
      
      let tableRef = mysql.escapeId(table);
      if (database) {
        tableRef = `${mysql.escapeId(database)}.${tableRef}`;
      }
      
      const sql = `CREATE TABLE IF NOT EXISTS ${tableRef} (${columns}) ENGINE=${engine} DEFAULT CHARSET=${charset}`;
      await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: `Table '${table}' created successfully with engine '${engine}' and character set '${charset}'.`,
          },
        ],
      };
    } catch (error: any) {
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

server.tool(
  "drop_table",
  "Drop a table",
  {
    database: z.string().optional().describe("The database name (optional, uses current database if not specified)"),
    table: z.string().describe("The name of the table to drop"),
  },
  async (args: any) => {
    try {
      const database = args.database;
      const table = args.table;
      
      let tableRef = mysql.escapeId(table);
      if (database) {
        tableRef = `${mysql.escapeId(database)}.${tableRef}`;
      }
      
      const sql = `DROP TABLE IF EXISTS ${tableRef}`;
      await pool.query(sql);
      
      return {
        content: [
          {
            type: "text",
            text: `Table '${table}' dropped successfully.`,
          },
        ],
      };
    } catch (error: any) {
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

server.tool(
  "instance_info",
  "Get comprehensive information about the MySQL instance",
  {},
  async () => {
    try {
      const [versionResult] = await pool.query("SELECT VERSION() as version");
      const [userResult] = await pool.query("SELECT USER() as user");
      const [databaseResult] = await pool.query("SELECT DATABASE() as database");
      const [connectionResult] = await pool.query("SHOW STATUS LIKE 'Threads_connected'");
      const [uptimeResult] = await pool.query("SHOW STATUS LIKE 'Uptime'");
      const [databasesResult] = await pool.query("SELECT COUNT(*) as count FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')");
      
      const versionRows = versionResult as any[];
      const userRows = userResult as any[];
      const databaseRows = databaseResult as any[];
      const connectionRows = connectionResult as any[];
      const uptimeRows = uptimeResult as any[];
      const databasesRows = databasesResult as any[];
      
      const info = {
        version: versionRows[0].version,
        user: userRows[0].user,
        currentDatabase: databaseRows[0].database,
        host: MYSQL_HOST,
        port: MYSQL_PORT,
        connections: connectionRows[0]?.Value || 0,
        uptime: uptimeRows[0]?.Value || 0,
        userDatabaseCount: databasesRows[0].count,
      };
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting instance info: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_users",
  "List all MySQL users",
  {},
  async () => {
    try {
      const [rows] = await pool.query("SELECT user, host FROM mysql.user");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing users: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "show_processlist",
  "Show currently running MySQL processes",
  {},
  async () => {
    try {
      const [rows] = await pool.query("SHOW PROCESSLIST");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error showing processlist: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  console.error(`Connecting to MySQL instance at ${MYSQL_HOST}:${MYSQL_PORT}...`);
  
  const connected = await testConnection();
  if (!connected) {
    console.error("Failed to connect to MySQL. Please check your configuration.");
    process.exit(1);
  }
  
  console.error(`Connected to MySQL instance${currentDatabase ? ` (current database: ${currentDatabase})` : ''}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("MySQL Instance MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});