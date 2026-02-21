#!/usr/bin/env python3
"""Minimal MCP server over stdio for testing tool access mechanics. Zero dependencies."""

import json
import sys


def send(msg):
    out = json.dumps(msg)
    sys.stdout.write(f"Content-Length: {len(out)}\r\n\r\n{out}")
    sys.stdout.flush()


def read():
    # Read Content-Length header
    header = ""
    while True:
        ch = sys.stdin.read(1)
        if ch == "":
            return None
        header += ch
        if header.endswith("\r\n\r\n"):
            break
    length = int(header.split("Content-Length: ")[1].split("\r\n")[0])
    body = sys.stdin.read(length)
    return json.loads(body)


TOOLS = [
    {
        "name": "ping",
        "description": "Returns pong. Use this to test MCP connectivity.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "Optional message to echo back"
                }
            }
        }
    },
    {
        "name": "add-numbers",
        "description": "Adds two numbers together. A simple test tool.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "a": {"type": "number", "description": "First number"},
                "b": {"type": "number", "description": "Second number"}
            },
            "required": ["a", "b"]
        }
    }
]


def handle(req):
    method = req.get("method")
    params = req.get("params", {})
    rid = req.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": rid,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "test-mcp", "version": "1.0.0"}
            }
        }

    if method == "notifications/initialized":
        return None  # notification, no response

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": rid,
            "result": {"tools": TOOLS}
        }

    if method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})

        if tool_name == "ping":
            msg = args.get("message", "pong")
            text = f"pong: {msg}" if msg != "pong" else "pong"
            return {
                "jsonrpc": "2.0",
                "id": rid,
                "result": {
                    "content": [{"type": "text", "text": text}]
                }
            }

        if tool_name == "add-numbers":
            a = args.get("a", 0)
            b = args.get("b", 0)
            return {
                "jsonrpc": "2.0",
                "id": rid,
                "result": {
                    "content": [{"type": "text", "text": f"{a} + {b} = {a + b}"}]
                }
            }

        return {
            "jsonrpc": "2.0",
            "id": rid,
            "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
        }

    # Unknown method
    return {
        "jsonrpc": "2.0",
        "id": rid,
        "error": {"code": -32601, "message": f"Unknown method: {method}"}
    }


def main():
    while True:
        req = read()
        if req is None:
            break
        resp = handle(req)
        if resp is not None:
            send(resp)


if __name__ == "__main__":
    main()
