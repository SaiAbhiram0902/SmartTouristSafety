$URL = "http://localhost:8080/api/location/update"

# 2️⃣ Sudden large jump (simulate teleport)
$coordsJump = @(
    @{lat=17.386; lon=78.476; hr=85},
    @{lat=12.9716; lon=77.5946; hr=90}  # Bangalore
)

function Send-Data($coords) {
    foreach ($c in $coords) {
        $body = @{
            touristId = "iot-001"
            latitude  = $c.lat
            longitude = $c.lon
            activity  = "trekking"
            heartRate = $c.hr
        } | ConvertTo-Json

        Write-Host "`nPosting $($body)"
        Invoke-RestMethod -Uri $URL -Method Post -Body $body -ContentType "application/json"
        Start-Sleep -Seconds 2
    }
}

Write-Host "`n--- NORMAL MOVEMENT ---"
Send-Data $coordsNormal

Write-Host "`n--- SUDDEN JUMP ---"
Send-Data $coordsJump

Write-Host "`n--- INACTIVITY TEST (wait ~15 seconds) ---"
Send-Data $coordsStill
Start-Sleep -Seconds 2
Send-Data $coordsStill

Write-Host "`n--- HEART RATE ANOMALY ---"
Send-Data $coordsHeart

Write-Host "`n✅ Test sequence complete."
