#!/bin/bash

# VirBiCoin Explorer Data Sync Script
# This script manages the blockchain data synchronization tools

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS_DIR="$SCRIPT_DIR/tools"
LOG_DIR="$SCRIPT_DIR/logs"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to check if VirBiCoin node is running
check_node() {
    echo "Checking VirBiCoin node connection..."
    if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8329 > /dev/null; then
        echo "✓ VirBiCoin node is running"
        return 0
    else
        echo "✗ VirBiCoin node is not responding"
        return 1
    fi
}

# Function to start blockchain sync
start_sync() {
    echo "Starting blockchain synchronization..."
    if check_node; then
        cd "$SCRIPT_DIR"
        # Use TypeScript version if available, otherwise fallback to JavaScript
        if command -v npx >/dev/null 2>&1 && [ -f "$TOOLS_DIR/sync.ts" ]; then
            nohup npx ts-node --project tsconfig.tools.json "$TOOLS_DIR/sync.ts" > "$LOG_DIR/sync.log" 2>&1 &
        else
            nohup node "$TOOLS_DIR/sync.js" > "$LOG_DIR/sync.log" 2>&1 &
        fi
        echo $! > "$LOG_DIR/sync.pid"
        echo "✓ Blockchain sync started (PID: $(cat $LOG_DIR/sync.pid))"
    else
        echo "✗ Cannot start sync - VirBiCoin node not available"
        exit 1
    fi
}

# Function to start stats calculation
start_stats() {
    echo "Starting statistics calculation..."
    if check_node; then
        cd "$SCRIPT_DIR"
        # Use TypeScript version if available, otherwise fallback to JavaScript
        if command -v npx >/dev/null 2>&1 && [ -f "$TOOLS_DIR/stats.ts" ]; then
            nohup npx ts-node --project tsconfig.tools.json "$TOOLS_DIR/stats.ts" > "$LOG_DIR/stats.log" 2>&1 &
        else
            nohup node "$TOOLS_DIR/stats.js" > "$LOG_DIR/stats.log" 2>&1 &
        fi
        echo $! > "$LOG_DIR/stats.pid"
        echo "✓ Statistics calculation started (PID: $(cat $LOG_DIR/stats.pid))"
    else
        echo "✗ Cannot start stats - VirBiCoin node not available"
        exit 1
    fi
}

# Function to start richlist calculation
start_richlist() {
    echo "Starting richlist calculation..."
    if check_node; then
        cd "$SCRIPT_DIR"
        # Use TypeScript version if available, otherwise fallback to JavaScript
        if command -v npx >/dev/null 2>&1 && [ -f "$TOOLS_DIR/richlist.ts" ]; then
            nohup npx ts-node --project tsconfig.tools.json "$TOOLS_DIR/richlist.ts" > "$LOG_DIR/richlist.log" 2>&1 &
        else
            nohup node "$TOOLS_DIR/richlist.js" > "$LOG_DIR/richlist.log" 2>&1 &
        fi
        echo $! > "$LOG_DIR/richlist.pid"
        echo "✓ Richlist calculation started (PID: $(cat $LOG_DIR/richlist.pid))"
    else
        echo "✗ Cannot start richlist - VirBiCoin node not available"
        exit 1
    fi
}

# Function to start tokens scanning
start_tokens() {
    echo "Starting tokens scanning..."
    if check_node; then
        cd "$SCRIPT_DIR"
        # Use TypeScript version if available, otherwise fallback to JavaScript
        if command -v npx >/dev/null 2>&1 && [ -f "$TOOLS_DIR/tokens.ts" ]; then
            nohup npx ts-node --project tsconfig.tools.json "$TOOLS_DIR/tokens.ts" > "$LOG_DIR/tokens.log" 2>&1 &
        else
            nohup node "$TOOLS_DIR/tokens.js" > "$LOG_DIR/tokens.log" 2>&1 &
        fi
        echo $! > "$LOG_DIR/tokens.pid"
        echo "✓ Tokens scanning started (PID: $(cat $LOG_DIR/tokens.pid))"
    else
        echo "✗ Cannot start tokens scanning - VirBiCoin node not available"
        exit 1
    fi
}

# Function to stop a process
stop_process() {
    local name=$1
    local pidfile="$LOG_DIR/${name}.pid"
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if ps -p "$pid" > /dev/null; then
            kill "$pid"
            echo "✓ Stopped $name (PID: $pid)"
        else
            echo "! $name process not running"
        fi
        rm -f "$pidfile"
    else
        echo "! No PID file found for $name"
    fi
}

# Function to check status
status() {
    echo "=== VirBiCoin Explorer Data Services Status ==="
    
    # Check node
    check_node
    echo ""
    
    # Check each service
    for service in sync stats richlist tokens; do
        pidfile="$LOG_DIR/${service}.pid"
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            if ps -p "$pid" > /dev/null; then
                echo "✓ $service is running (PID: $pid)"
            else
                echo "✗ $service is not running (stale PID file)"
                rm -f "$pidfile"
            fi
        else
            echo "✗ $service is not running"
        fi
    done
}

# Function to show logs
logs() {
    local service=$1
    local logfile="$LOG_DIR/${service}.log"
    
    if [ -f "$logfile" ]; then
        echo "=== Last 50 lines of $service log ==="
        tail -n 50 "$logfile"
    else
        echo "✗ No log file found for $service"
    fi
}

# Main script logic
case "$1" in
    start)
        case "$2" in
            sync)
                start_sync
                ;;
            stats)
                start_stats
                ;;
            richlist)
                start_richlist
                ;;
            tokens)
                start_tokens
                ;;
            all)
                start_sync
                sleep 2
                start_stats
                sleep 2
                start_richlist
                sleep 2
                start_tokens
                ;;
            *)
                echo "Usage: $0 start {sync|stats|richlist|tokens|all}"
                exit 1
                ;;
        esac
        ;;
    stop)
        case "$2" in
            sync|stats|richlist|tokens)
                stop_process "$2"
                ;;
            all)
                stop_process "sync"
                stop_process "stats"
                stop_process "richlist"
                stop_process "tokens"
                ;;
            *)
                echo "Usage: $0 stop {sync|stats|richlist|tokens|all}"
                exit 1
                ;;
        esac
        ;;
    restart)
        case "$2" in
            sync|stats|richlist|tokens)
                stop_process "$2"
                sleep 2
                start_$2
                ;;
            all)
                stop_process "sync"
                stop_process "stats"
                stop_process "richlist"
                stop_process "tokens"
                sleep 2
                start_sync
                sleep 2
                start_stats
                sleep 2
                start_richlist
                sleep 2
                start_tokens
                ;;
            *)
                echo "Usage: $0 restart {sync|stats|richlist|tokens|all}"
                exit 1
                ;;
        esac
        ;;
    status)
        status
        ;;
    logs)
        if [ -z "$2" ]; then
            echo "Usage: $0 logs {sync|stats|richlist|tokens}"
            exit 1
        fi
        logs "$2"
        ;;
    initial-sync)
        echo "Starting initial blockchain synchronization..."
        if check_node; then
            cd "$SCRIPT_DIR"
            # Use TypeScript version if available, otherwise fallback to JavaScript
            if command -v npx >/dev/null 2>&1 && [ -f "$TOOLS_DIR/sync.ts" ]; then
                SYNCALL=true npx ts-node --project tsconfig.tools.json "$TOOLS_DIR/sync.ts"
            else
                SYNCALL=true node "$TOOLS_DIR/sync.js"
            fi
        else
            echo "✗ Cannot start initial sync - VirBiCoin node not available"
            exit 1
        fi
        ;;
    rescan-stats)
        echo "Rescanning statistics..."
        if check_node; then
            cd "$SCRIPT_DIR"
            # Use TypeScript version if available, otherwise fallback to JavaScript
            if command -v npx >/dev/null 2>&1 && [ -f "$TOOLS_DIR/stats.ts" ]; then
                RESCAN=100:10000 npx ts-node --project tsconfig.tools.json "$TOOLS_DIR/stats.ts"
            else
                RESCAN=100:10000 node "$TOOLS_DIR/stats.js"
            fi
        else
            echo "✗ Cannot rescan stats - VirBiCoin node not available"
            exit 1
        fi
        ;;
    *)
        echo "VirBiCoin Explorer Data Management Script"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|initial-sync|rescan-stats}"
        echo ""
        echo "Commands:"
        echo "  start {sync|stats|richlist|tokens|all}    - Start data services"
        echo "  stop {sync|stats|richlist|tokens|all}     - Stop data services"
        echo "  restart {sync|stats|richlist|tokens|all}  - Restart data services"
        echo "  status                              - Show service status"
        echo "  logs {sync|stats|richlist|tokens}         - Show service logs"
        echo "  initial-sync                       - Run full blockchain sync"
        echo "  rescan-stats                       - Recalculate statistics"
        echo ""
        echo "Examples:"
        echo "  $0 start all                       - Start all services"
        echo "  $0 stop sync                       - Stop blockchain sync"
        echo "  $0 logs stats                      - View statistics logs"
        echo "  $0 initial-sync                    - Sync entire blockchain"
        exit 1
        ;;
esac
