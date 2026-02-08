# Mysql-server

一个基于 Model Context Protocol (MCP) 的 MySQL 数据库操作服务器。


**通用配置格式**:
```json
{
  "mcpServers": {
    "mysql-server": {
      "command": "node",
      "args": ["/absolute/path/to/MCP/mysql-server/src/index.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database"
      }
    }
  }
}
```

**配置说明**:
- `command`: 运行服务器的命令（`node`）
- `args`: 服务器脚本的绝对路径
- `env`: 数据库连接环境变量

### 常见客户端的配置文件位置

| 客户端 | 配置文件路径 |
|--------|-------------|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | `.cursor/mcp.json` (项目目录) |
| Cline | `cline_mcp_settings.json` (用户配置目录) |
| Continue | `.continue/mcpServers/mcp.json` (项目目录) |
| LM Studio | 应用内的 `mcp.json` 文件 |
| JetBrains AI Assistant | `.idea/mcp.json` (项目目录) |

### 配置步骤

1. 找到您使用的 MCP 客户端的配置文件位置
2. 编辑配置文件，添加上述 JSON 配置
3. 将 `/absolute/path/to/MCP/mysql-server/src/index.js` 替换为实际的脚本路径
4. 根据需要修改数据库连接参数
5. 保存配置文件并重启客户端

### 环境变量配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `MYSQL_HOST` | MySQL 主机地址 | `localhost` |
| `MYSQL_PORT` | MySQL 端口 | `3306` |
| `MYSQL_USER` | MySQL 用户名 | `root` |
| `MYSQL_PASSWORD` | MySQL 密码 | `""` |
| `MYSQL_DATABASE` | 数据库名称 | `wonfu_test` |

