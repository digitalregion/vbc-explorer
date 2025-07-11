#!/bin/bash

# Token Data Update Automation Script
# This script automates the process of updating token holder counts and maintaining data consistency

echo "🔄 Starting Token Data Update Process..."
echo "$(date): Beginning automated token data update"

# Set the working directory
SCRIPT_DIR="/home/aoi/explorer/tools"
cd "$SCRIPT_DIR"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1"
}

# Function to check if MongoDB is accessible
check_mongodb() {
    log_message "Checking MongoDB connection..."
    if mongosh explorerDB --eval "db.runCommand('ping')" >/dev/null 2>&1; then
        log_message "✅ MongoDB connection successful"
        return 0
    else
        log_message "❌ MongoDB connection failed"
        return 1
    fi
}

# Function to update token data
update_tokens() {
    log_message "Updating token holder counts and ages..."
    if node updateTokenData.js update-tokens; then
        log_message "✅ Token data updated successfully"
        return 0
    else
        log_message "❌ Token data update failed"
        return 1
    fi
}

# Function to backup current token data
backup_token_data() {
    log_message "Creating backup of token data..."
    local backup_file="token_backup_$(date +%Y%m%d_%H%M%S).json"
    
    if mongosh explorerDB --eval "printjson(db.tokens.find().toArray())" > "$backup_file" 2>/dev/null; then
        log_message "✅ Backup created: $backup_file"
        return 0
    else
        log_message "⚠️  Backup creation failed, but continuing..."
        return 1
    fi
}

# Function to verify token data integrity
verify_data() {
    log_message "Verifying token data integrity..."
    
    # Check OSATO token
    local osato_holders=$(mongosh explorerDB --quiet --eval "db.tokenholders.countDocuments({tokenAddress: {\$regex: /0xD26488eA7e2b4e8Ba8eB9E6d7C8bF2a3C5d4E6F8/i}})")
    local osato_db_holders=$(mongosh explorerDB --quiet --eval "db.tokens.findOne({symbol: 'OSATO'}).holders")
    
    # Check VBC token
    local wallet_count=$(mongosh explorerDB --quiet --eval "db.Account.countDocuments({})")
    local vbc_db_holders=$(mongosh explorerDB --quiet --eval "db.tokens.findOne({symbol: 'VBC'}).holders")
    
    log_message "OSATO: Actual holders: $osato_holders, DB holders: $osato_db_holders"
    log_message "VBC: Wallet count: $wallet_count, DB holders: $vbc_db_holders"
    
    if [ "$osato_holders" = "$osato_db_holders" ] && [ "$wallet_count" = "$vbc_db_holders" ]; then
        log_message "✅ Data integrity verified"
        return 0
    else
        log_message "⚠️  Data inconsistency detected, re-running update..."
        return 1
    fi
}

# Function to display current token status
show_status() {
    log_message "Current token status:"
    echo "=================================================="
    mongosh explorerDB --quiet --eval "
    db.tokens.find({}).forEach(function(token) {
        var ageInDays = Math.floor((Date.now() - new Date(token.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        print(token.symbol + ': ' + token.holders + ' holders, ' + token.supply + ' supply, ' + ageInDays + ' days old');
    });"
    echo "=================================================="
}

# Main execution
main() {
    log_message "🚀 Starting automated token data update"
    
    # Step 1: Check MongoDB connection
    if ! check_mongodb; then
        log_message "❌ Exiting due to MongoDB connection failure"
        exit 1
    fi
    
    # Step 2: Create backup
    backup_token_data
    
    # Step 3: Update token data
    if ! update_tokens; then
        log_message "❌ Exiting due to token update failure"
        exit 1
    fi
    
    # Step 4: Verify data integrity
    local retry_count=0
    local max_retries=3
    
    while [ $retry_count -lt $max_retries ]; do
        if verify_data; then
            break
        fi
        
        retry_count=$((retry_count + 1))
        log_message "Retry $retry_count/$max_retries: Re-running token update..."
        
        if ! update_tokens; then
            log_message "❌ Token update failed on retry $retry_count"
            if [ $retry_count -eq $max_retries ]; then
                log_message "❌ Maximum retries reached, exiting"
                exit 1
            fi
        fi
    done
    
    # Step 5: Show final status
    show_status
    
    log_message "✅ Token data update completed successfully"
    
    # Cleanup old backups (keep only last 10)
    log_message "🧹 Cleaning up old backups..."
    ls -t token_backup_*.json 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    log_message "🎉 Automated token data update process completed"
}

# Handle command line arguments
case "$1" in
    "update")
        main
        ;;
    "status")
        check_mongodb && show_status
        ;;
    "verify")
        check_mongodb && verify_data
        ;;
    "backup")
        check_mongodb && backup_token_data
        ;;
    *)
        echo "Usage: $0 {update|status|verify|backup}"
        echo "  update  - Run full automated update process"
        echo "  status  - Show current token status"
        echo "  verify  - Verify data integrity"
        echo "  backup  - Create backup of token data"
        exit 1
        ;;
esac
