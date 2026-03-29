# fix-rds-connection.ps1
# Fixes "RDS: FAIL - Connection terminated due to connection timeout"
# The timeout means your RDS Security Group is blocking port 5432 from your IP.

Write-Host "`n=== RDS Connection Timeout Fixer ===" -ForegroundColor Cyan

# Step 1: Get current public IP
Write-Host "`n[1] Getting your current public IP..." -ForegroundColor Yellow
try {
    $ip = (Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5).ip
    Write-Host "    Your IP: $ip" -ForegroundColor Green
} catch {
    $ip = "UNKNOWN"
    Write-Host "    Could not detect IP — check manually at https://whatismyip.com" -ForegroundColor Red
}

# Step 2: Test TCP connectivity on port 5432
Write-Host "`n[2] Testing TCP connection to RDS on port 5432..." -ForegroundColor Yellow
$rdsHost = "dermasense-db.cpacw8wwgbkg.ap-south-1.rds.amazonaws.com"
$tcpTest = Test-NetConnection -ComputerName $rdsHost -Port 5432 -WarningAction SilentlyContinue
if ($tcpTest.TcpTestSucceeded) {
    Write-Host "    TCP OK — port 5432 is reachable!" -ForegroundColor Green
    Write-Host "    The connection timeout may be a credential or SSL issue." -ForegroundColor Yellow
} else {
    Write-Host "    TCP FAILED — port 5432 is BLOCKED!" -ForegroundColor Red
    Write-Host "    Root cause: RDS Security Group does not allow your IP ($ip) on port 5432." -ForegroundColor Red
}

# Step 3: Print fix instructions
Write-Host "`n=== HOW TO FIX IN AWS CONSOLE ===" -ForegroundColor Cyan
Write-Host @"

1. Open: https://console.aws.amazon.com/rds/
   - Region: ap-south-1 (Mumbai)

2. Click: Databases → dermasense-db → Connectivity & security tab

3. Under 'VPC security groups', click the security group link
   (e.g. 'dermasense-db-sg' or 'default')

4. Click: Inbound rules → Edit inbound rules → Add rule

5. Set:
   - Type:      PostgreSQL
   - Protocol:  TCP
   - Port:      5432
   - Source:    My IP  (AWS auto-fills: $ip/32)

6. Click: Save rules

7. Wait 30 seconds, then run:
   node scripts/quick-test.js

"@ -ForegroundColor White

Write-Host "=== ALTERNATIVE: Allow all IPs (dev only — NOT for production) ===" -ForegroundColor DarkYellow
Write-Host @"
   - Source: Anywhere-IPv4  (0.0.0.0/0)
   WARNING: Only use this temporarily for local development testing!
"@ -ForegroundColor DarkYellow
