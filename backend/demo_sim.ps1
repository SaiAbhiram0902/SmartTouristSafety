# TourSafe Demo Simulator - REVA University Campus, Bangalore
#
# Usage:
#   .\demo_sim.ps1                          normal run, 5s between pings
#   .\demo_sim.ps1 -Fast                    2s between pings
#   .\demo_sim.ps1 -SkipRegister            tourists already in DB, just run paths
#   .\demo_sim.ps1 -Reset                   remove all sim tourists and exit
#   .\demo_sim.ps1 -AdminUser x -AdminPass y custom credentials (default: admin / admin123)

param(
    [switch]$Fast,
    [switch]$Reset,
    [switch]$SkipRegister,
    [string]$AdminUser = "admin",
    [string]$AdminPass = "admin123"
)

$BASE          = "http://localhost:8080/api"
$PING_INTERVAL = if ($Fast) { 2 } else { 5 }
$SIM_IDS       = @("T-S01","T-S02","T-S03","T-S04","T-S05","T-S06","T-S07")

function Info ($msg) { Write-Host $msg -ForegroundColor Cyan }
function Ok   ($msg) { Write-Host $msg -ForegroundColor Green }
function Warn ($msg) { Write-Host $msg -ForegroundColor Yellow }
function Err  ($msg) { Write-Host $msg -ForegroundColor Red }
function Dim  ($msg) { Write-Host $msg -ForegroundColor DarkGray }

# JWT token - populated by Login, attached to every protected request
$script:AuthToken = $null

function Login {
    try {
        $body = @{ username = $AdminUser; password = $AdminPass } | ConvertTo-Json -Compress
        $resp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method Post `
                    -Body $body -ContentType "application/json" -ErrorAction Stop
        $script:AuthToken = $resp.token
        Ok "  Logged in as $AdminUser"
    } catch {
        Err "  Login failed: $($_.Exception.Message)"
        Err "  Check that your backend is running and credentials are correct."
        Err "  Default: admin / admin123  (override with -AdminUser and -AdminPass)"
        exit 1
    }
}

function AuthHeaders {
    if ($script:AuthToken) {
        return @{ Authorization = "Bearer $script:AuthToken" }
    }
    return @{}
}

function Post($path, $body) {
    try {
        $json    = $body | ConvertTo-Json -Compress
        $headers = AuthHeaders
        return Invoke-RestMethod -Uri "$BASE$path" -Method Post `
                   -Body $json -ContentType "application/json" `
                   -Headers $headers -ErrorAction Stop
    } catch {
        Err "  POST $path failed: $($_.Exception.Message)"
        return $null
    }
}

function Patch($path) {
    try {
        $headers = AuthHeaders
        return Invoke-RestMethod -Uri "$BASE$path" -Method Patch `
                   -Headers $headers -ErrorAction Stop
    } catch {
        Err "  PATCH $path failed: $($_.Exception.Message)"
        return $null
    }
}

function Delete($path) {
    try {
        $headers = AuthHeaders
        Invoke-RestMethod -Uri "$BASE$path" -Method Delete `
            -Headers $headers -ErrorAction Stop | Out-Null
    } catch {}
}

# Authenticate before doing anything that requires a token
Login

if ($Reset) {
    Warn "Removing simulated tourists..."
    foreach ($id in $SIM_IDS) { Delete "/tourists/$id" }
    Ok "Done."
    exit
}

$NOW          = [System.DateTime]::Now
$OVERDUE_TIME = $NOW.AddMinutes(-25).ToString("yyyy-MM-ddTHH:mm:ss")

$TOURISTS = @(
    @{
        touristId        = "T-S01"
        name             = "Sai Abhiram"
        phone            = "9876500001"
        age              = 21
        isChild          = $false
        isElder          = $false
        isHandicapped    = $false
        parentId         = $null
        emergencyContact = "9876500099"
        emergencyName    = "Abhiram Sr."
        expectedReturnTime = $null
    },
    @{
        touristId        = "T-S02"
        name             = "Sreedhar"
        phone            = "9876500002"
        age              = 21
        isChild          = $false
        isElder          = $false
        isHandicapped    = $false
        parentId         = "T-S01"
        emergencyContact = "9876500099"
        emergencyName    = "Sreedhar Sr."
        expectedReturnTime = $null
    },
    @{
        touristId        = "T-S03"
        name             = "Thanish"
        phone            = "9876500003"
        age              = 21
        isChild          = $false
        isElder          = $false
        isHandicapped    = $false
        parentId         = $null
        emergencyContact = "9876500098"
        emergencyName    = "Thanish Sr."
        expectedReturnTime = $null
    },
    @{
        touristId        = "T-S04"
        name             = "Vijay Varma"
        phone            = "9876500004"
        age              = 67
        isChild          = $false
        isElder          = $true
        isHandicapped    = $false
        parentId         = $null
        emergencyContact = "9876500097"
        emergencyName    = "Varma Jr."
        expectedReturnTime = $OVERDUE_TIME
    },
    @{
        touristId        = "T-S05"
        name             = "Teja"
        phone            = "9876500005"
        age              = 24
        isChild          = $false
        isElder          = $false
        isHandicapped    = $false
        parentId         = $null
        emergencyContact = "9876500096"
        emergencyName    = "Teja Sr."
        expectedReturnTime = $null
    },
    @{
        touristId        = "T-S06"
        name             = "Raju"
        phone            = "9876500006"
        age              = 10
        isChild          = $true
        isElder          = $false
        isHandicapped    = $false
        parentId         = "T-S05"
        emergencyContact = "9876500005"
        emergencyName    = "Teja"
        expectedReturnTime = $null
    },
    @{
        touristId        = "T-S07"
        name             = "Rahul"
        phone            = "9876500007"
        age              = 12
        isChild          = $true
        isElder          = $false
        isHandicapped    = $false
        parentId         = "T-S05"
        emergencyContact = "9876500005"
        emergencyName    = "Teja"
        expectedReturnTime = $null
    }
)

# GPS paths - 15 steps each
# Restricted zone (C Block Boys Hostel): SW 13.11456,77.63582  NE 13.11489,77.63636

# T-S01: Sai Abhiram - Main gate toward academic block
$PATH_S01 = @(
    @(13.11450, 77.63400, 78, "WALK"),
    @(13.11468, 77.63418, 79, "WALK"),
    @(13.11485, 77.63432, 80, "WALK"),
    @(13.11502, 77.63445, 81, "WALK"),
    @(13.11520, 77.63458, 80, "WALK"),
    @(13.11538, 77.63468, 82, "WALK"),
    @(13.11555, 77.63475, 83, "WALK"),
    @(13.11570, 77.63482, 81, "WALK"),
    @(13.11590, 77.63498, 80, "WALK"),
    @(13.11610, 77.63510, 82, "WALK"),
    @(13.11630, 77.63520, 83, "WALK"),
    @(13.11645, 77.63535, 81, "WALK"),
    @(13.11655, 77.63548, 80, "WALK"),
    @(13.11660, 77.63558, 79, "WALK"),
    @(13.11665, 77.63560, 78, "STAND")
)

# T-S02: Sreedhar - With Sai Abhiram, slight offset
$PATH_S02 = @(
    @(13.11448, 77.63405, 76, "WALK"),
    @(13.11465, 77.63422, 77, "WALK"),
    @(13.11482, 77.63436, 78, "WALK"),
    @(13.11498, 77.63450, 77, "WALK"),
    @(13.11515, 77.63462, 76, "WALK"),
    @(13.11532, 77.63472, 78, "WALK"),
    @(13.11548, 77.63480, 79, "WALK"),
    @(13.11562, 77.63488, 77, "WALK"),
    @(13.11580, 77.63502, 76, "WALK"),
    @(13.11598, 77.63514, 78, "WALK"),
    @(13.11618, 77.63524, 79, "WALK"),
    @(13.11635, 77.63538, 77, "WALK"),
    @(13.11648, 77.63550, 76, "WALK"),
    @(13.11658, 77.63560, 75, "WALK"),
    @(13.11663, 77.63562, 74, "STAND")
)

# T-S03: Thanish - Approaches and enters C Block Boys Hostel restricted zone
# Steps 0-4: outside, approaching from south-west
# Step 5 onward: inside the zone (SW 13.11456,77.63582  NE 13.11489,77.63636)
$PATH_S03 = @(
    @(13.11430, 77.63545, 80, "WALK"),
    @(13.11438, 77.63555, 81, "WALK"),
    @(13.11444, 77.63565, 82, "WALK"),
    @(13.11449, 77.63574, 81, "WALK"),
    @(13.11453, 77.63580, 80, "WALK"),
    @(13.11460, 77.63590, 81, "WALK"),
    @(13.11465, 77.63600, 82, "WALK"),
    @(13.11470, 77.63612, 83, "WALK"),
    @(13.11475, 77.63622, 82, "WALK"),
    @(13.11472, 77.63614, 81, "WALK"),
    @(13.11466, 77.63603, 80, "WALK"),
    @(13.11459, 77.63591, 79, "WALK"),
    @(13.11451, 77.63577, 80, "WALK"),
    @(13.11444, 77.63563, 81, "WALK"),
    @(13.11437, 77.63550, 80, "WALK")
)

# T-S04: Vijay Varma - Elder, slow walk near library, already overdue
$PATH_S04 = @(
    @(13.11720, 77.63490, 72, "WALK"),
    @(13.11722, 77.63495, 73, "WALK"),
    @(13.11724, 77.63500, 74, "WALK"),
    @(13.11726, 77.63505, 73, "WALK"),
    @(13.11728, 77.63510, 74, "WALK"),
    @(13.11730, 77.63512, 75, "WALK"),
    @(13.11728, 77.63515, 74, "WALK"),
    @(13.11726, 77.63518, 73, "WALK"),
    @(13.11724, 77.63520, 72, "STAND"),
    @(13.11724, 77.63520, 71, "STAND"),
    @(13.11724, 77.63520, 71, "STAND"),
    @(13.11726, 77.63518, 72, "WALK"),
    @(13.11728, 77.63515, 73, "WALK"),
    @(13.11730, 77.63512, 74, "WALK"),
    @(13.11732, 77.63510, 73, "WALK")
)

# T-S05: Teja - Brothers group leader, sports ground
$PATH_S05 = @(
    @(13.11548, 77.63755, 76, "WALK"),
    @(13.11552, 77.63762, 77, "WALK"),
    @(13.11555, 77.63770, 78, "WALK"),
    @(13.11558, 77.63777, 79, "WALK"),
    @(13.11560, 77.63783, 80, "WALK"),
    @(13.11562, 77.63788, 81, "WALK"),
    @(13.11565, 77.63792, 80, "WALK"),
    @(13.11568, 77.63796, 79, "WALK"),
    @(13.11570, 77.63800, 78, "WALK"),
    @(13.11572, 77.63804, 77, "WALK"),
    @(13.11575, 77.63808, 78, "WALK"),
    @(13.11577, 77.63812, 79, "WALK"),
    @(13.11580, 77.63815, 78, "WALK"),
    @(13.11582, 77.63818, 77, "WALK"),
    @(13.11585, 77.63820, 76, "STAND")
)

# T-S06: Raju - Child, heart rate spikes at step 8
$PATH_S06 = @(
    @(13.11452, 77.63408, 88, "WALK"),
    @(13.11470, 77.63425, 90, "WALK"),
    @(13.11488, 77.63440, 92, "WALK"),
    @(13.11505, 77.63455, 91, "WALK"),
    @(13.11522, 77.63465, 93, "WALK"),
    @(13.11540, 77.63475, 95, "WALK"),
    @(13.11558, 77.63483, 98, "WALK"),
    @(13.11572, 77.63490, 102, "WALK"),
    @(13.11588, 77.63503, 118, "RUN"),
    @(13.11605, 77.63515, 124, "RUN"),
    @(13.11622, 77.63526, 119, "RUN"),
    @(13.11638, 77.63540, 105, "WALK"),
    @(13.11650, 77.63552, 96, "WALK"),
    @(13.11660, 77.63560, 92, "WALK"),
    @(13.11665, 77.63561, 89, "STAND")
)

# T-S07: Rahul - Child, falls at step 6, recovers
$PATH_S07 = @(
    @(13.11550, 77.63750, 82, "WALK"),
    @(13.11555, 77.63758, 84, "WALK"),
    @(13.11558, 77.63765, 85, "WALK"),
    @(13.11560, 77.63772, 87, "WALK"),
    @(13.11562, 77.63778, 89, "WALK"),
    @(13.11563, 77.63782, 95, "WALK"),
    @(13.11563, 77.63782, 96, "STAND"),
    @(13.11563, 77.63782, 94, "STAND"),
    @(13.11563, 77.63783, 88, "STAND"),
    @(13.11564, 77.63784, 85, "WALK"),
    @(13.11566, 77.63786, 83, "WALK"),
    @(13.11568, 77.63789, 82, "WALK"),
    @(13.11570, 77.63792, 81, "WALK"),
    @(13.11572, 77.63795, 80, "WALK"),
    @(13.11575, 77.63798, 79, "WALK")
)

$ALL_PATHS = @{
    "T-S01" = $PATH_S01
    "T-S02" = $PATH_S02
    "T-S03" = $PATH_S03
    "T-S04" = $PATH_S04
    "T-S05" = $PATH_S05
    "T-S06" = $PATH_S06
    "T-S07" = $PATH_S07
}

$SCRIPTED_ALERTS = @(
    @{
        touristId = "T-S07"
        step      = 6
        type      = "FALL"
        severity  = 90
        message   = "Fall detected - Rahul stationary after impact at sports ground"
        fired     = $false
    },
    @{
        touristId = "T-S03"
        step      = 5
        type      = "ZONE"
        severity  = 60
        message   = "Thanish entered restricted zone - C Block Boys Hostel"
        fired     = $false
    },
    @{
        touristId = "T-S06"
        step      = 8
        type      = "HIGH"
        severity  = 75
        message   = "Raju heart rate elevated to 118 bpm"
        fired     = $false
    }
)

if (-not $SkipRegister) {
    Info ""
    Info "==========================================="
    Info "  TourSafe Demo Simulator - REVA University"
    Info "==========================================="
    Info ""
    Info "Registering tourists..."
    Info ""

    foreach ($t in $TOURISTS) {
        $body = @{
            touristId        = $t.touristId
            name             = $t.name
            phone            = $t.phone
            age              = $t.age
            child            = $t.isChild
            elder            = $t.isElder
            handicapped      = $t.isHandicapped
            emergencyContact = $t.emergencyContact
            emergencyName    = $t.emergencyName
            active           = $true
        }
        if ($null -ne $t.parentId)           { $body.parentId           = $t.parentId }
        if ($null -ne $t.expectedReturnTime) { $body.expectedReturnTime = $t.expectedReturnTime }

        $result = Post "/tourists" $body
        if ($result) {
            $role = if ($null -eq $t.parentId) { "solo / leader" } else { "member of $($t.parentId)" }
            Ok "  [+] $($t.touristId)  $($t.name)  ($role)"
        } else {
            Warn "  [!] $($t.touristId) skipped - may already exist"
        }
    }

    Info ""
    Info "Alerts that will fire during the run:"
    Info "  Step 5  - Thanish (T-S03):     ZONE BREACH at C Block Boys Hostel"
    Info "  Step 6  - Rahul (T-S07):       FALL at sports ground"
    Info "  Step 8  - Raju (T-S06):        HIGH HEART RATE 118 bpm"
    Info "  Ongoing - Vijay Varma (T-S04): OVERDUE (25 min past expected return)"
    Info ""
    Info "Press ENTER to start..."
    Read-Host | Out-Null
}

$TOTAL_STEPS = 15
$step        = 0

Info "Running - $PING_INTERVAL second intervals - Ctrl+C to stop"
Info ""

while ($step -lt $TOTAL_STEPS) {
    Info "-- Step $($step + 1) / $TOTAL_STEPS --"

    foreach ($id in $SIM_IDS) {
        $point = $ALL_PATHS[$id][$step]

        $result = Post "/location/update" @{
            touristId = $id
            latitude  = $point[0]
            longitude = $point[1]
            heartRate = $point[2]
            activity  = $point[3]
        }

        if ($result -and $result.alerts -and $result.alerts.Count -gt 0) {
            foreach ($a in $result.alerts) {
                Warn "  [ALERT] $id  $($a.type): $($a.message)"
            }
        }

        Dim "  $id  $($point[0]), $($point[1])  hr=$($point[2])  $($point[3])"
    }

    foreach ($alert in $SCRIPTED_ALERTS) {
        if (-not $alert.fired -and $step -eq $alert.step) {
            $result = Post "/alerts" @{
                touristId = $alert.touristId
                type      = $alert.type
                severity  = $alert.severity
                message   = $alert.message
            }
            if ($result) { Warn "  [ALERT] $($alert.touristId)  $($alert.type): $($alert.message)" }
            $alert.fired = $true
        }
    }

    $step++
    if ($step -lt $TOTAL_STEPS) { Start-Sleep -Seconds $PING_INTERVAL }
}

Info ""
Ok "==========================================="
Ok "  Simulation complete."
Ok ""
Ok "  Run again:   .\demo_sim.ps1 -SkipRegister"
Ok "  Clean up:    .\demo_sim.ps1 -Reset"
Ok "==========================================="
